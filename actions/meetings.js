"use server";

import { db } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { google } from "googleapis";

async function getSessionUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
  });
  if (!user) throw new Error("User not found");

  return user;
}

export async function getUserMeetings(type = "upcoming") {
  const user = await getSessionUser();

  const now = new Date();

  const meetings = await db.booking.findMany({
    where: {
      userId: user.id,
      startTime: type === "upcoming" ? { gte: now } : { lt: now },
    },
    include: {
      event: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
      recordings: {
        include: {
          transcript: true,
          summary: true,
        },
      },
    },
    orderBy: {
      startTime: type === "upcoming" ? "asc" : "desc",
    },
  });

  return meetings;
}

export async function cancelMeeting(meetingId) {
  const user = await getSessionUser();

  const meeting = await db.booking.findUnique({
    where: { id: meetingId },
    include: { event: true, user: true },
  });

  if (!meeting || meeting.userId !== user.id) {
    throw new Error("Meeting not found or unauthorized");
  }

  const tokenResult = await auth.api.getAccessToken({
    body: { providerId: "google", userId: meeting.user.id },
    headers: await headers(),
  }).catch(() => null);

  if (tokenResult?.accessToken) {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: tokenResult.accessToken });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    try {
      await calendar.events.delete({
        calendarId: "primary",
        eventId: meeting.googleEventId,
      });
    } catch (error) {
      console.error("Failed to delete event from Google Calendar:", error);
    }
  }

  await db.booking.delete({
    where: { id: meetingId },
  });

  return { success: true };
}
