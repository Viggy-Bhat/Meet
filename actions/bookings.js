"use server";

import { db } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { google } from "googleapis";
import { headers } from "next/headers";
import { z } from "zod";
import { bookingSchema } from "@/lib/validators";

export async function createBooking(bookingData) {
  try {
    const validated = bookingSchema.parse(bookingData);
    const event = await db.event.findUnique({
      where: { id: validated.eventId },
      include: { user: true },
    });

    if (!event) {
      throw new Error("Event not found");
    }

    const persistBooking = async ({ meetLink = null, googleEventId = null, needsReconnect = false } = {}) => {
      const booking = await db.booking.create({
        data: {
          eventId: event.id,
          userId: event.userId,
          name: validated.name,
          email: validated.email,
          startTime: validated.startTime,
          endTime: validated.endTime,
          additionalInfo: validated.additionalInfo,
          meetLink,
          googleEventId,
        },
      });

      return { success: true, booking, meetLink, needsReconnect };
    };

    const tokenResult = await auth.api
      .getAccessToken({
        body: { providerId: "google", userId: event.user.id },
        headers: await headers(),
      })
      .catch(() => null);

    if (!tokenResult?.accessToken) {
      return await persistBooking({ needsReconnect: true });
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: tokenResult.accessToken });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    try {
      const meetResponse = await calendar.events.insert({
        calendarId: "primary",
        conferenceDataVersion: 1,
        requestBody: {
          summary: `${validated.name} - ${event.title}`,
          description: validated.additionalInfo,
          start: {
            dateTime: new Date(validated.startTime).toISOString(),
            timeZone: "Asia/Kolkata",
          },
          end: {
            dateTime: new Date(validated.endTime).toISOString(),
            timeZone: "Asia/Kolkata",
          },
          attendees: [{ email: validated.email }, { email: event.user.email }],
          conferenceData: {
            createRequest: { requestId: `${event.id}-${Date.now()}` },
          },
        },
      });

      return await persistBooking({
        meetLink: meetResponse.data.hangoutLink || null,
        googleEventId: meetResponse.data.id || null,
      });
    } catch (error) {
      console.warn("Google Calendar insert failed, saving booking without Meet link:", error);
      return await persistBooking({ needsReconnect: true });
    }
  } catch (error) {
    console.error("Error creating booking:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid booking data. Please check your inputs." };
    }
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
