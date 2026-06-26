"use server";

import { db } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eventSchema } from "@/lib/validators";

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

export async function createEvent(data) {
  const user = await getSessionUser();

  const validatedData = eventSchema.parse(data);

  const event = await db.event.create({
    data: {
      ...validatedData,
      userId: user.id,
    },
  });

  return event;
}

export async function getUserEvents() {
  const user = await getSessionUser();

  const events = await db.event.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { bookings: true },
      },
    },
  });

  return { events, username: user.username };
}

export async function deleteEvent(eventId) {
  const user = await getSessionUser();

  const event = await db.event.findUnique({
    where: { id: eventId },
  });

  if (!event || event.userId !== user.id) {
    throw new Error("Event not found or unauthorized");
  }

  await db.event.delete({
    where: { id: eventId },
  });

  return { success: true };
}

export async function getEventDetails(username, eventId) {
  const event = await db.event.findFirst({
    where: {
      id: eventId,
      isPrivate: false,
      user: {
        username: username,
      },
    },
    include: {
      user: {
        select: {
          name: true,
          imageUrl: true,
        },
      },
    },
  });

  return event;
}
