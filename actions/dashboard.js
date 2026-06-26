"use server";

import { db } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function getLatestUpdates() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) throw new Error("User not found");

  const now = new Date();

  const upcomingMeetings = await db.booking.findMany({
    where: {
      userId: user.id,
      startTime: { gte: now },
    },
    include: {
      event: {
        select: {
          title: true,
        },
      },
    },
    orderBy: {
      startTime: "asc",
    },
    take: 3,
  });

  if (upcomingMeetings.length >= 3) {
    return upcomingMeetings;
  }

  const recentPast = await db.booking.findMany({
    where: {
      userId: user.id,
      startTime: { lt: now },
    },
    include: {
      event: {
        select: {
          title: true,
        },
      },
    },
    orderBy: {
      startTime: "desc",
    },
    take: 3 - upcomingMeetings.length,
  });

  return [...upcomingMeetings, ...recentPast];
}
