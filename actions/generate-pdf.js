"use server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { headers } from "next/headers";

export async function getMeetingPdfData(meetingId) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  const booking = await db.booking.findUnique({
    where: { id: meetingId },
    include: {
      event: {
        include: { user: { select: { name: true, email: true } } },
      },
      recordings: {
        include: { transcript: true, summary: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!booking || booking.userId !== session.user.id) {
    throw new Error("Meeting not found");
  }

  return booking;
}
