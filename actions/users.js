"use server";

import { db } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { usernameSchema } from "@/lib/validators";

const RESERVED_USERNAMES = [
  "api",
  "admin",
  "dashboard",
  "events",
  "meetings",
  "availability",
  "sign-in",
  "sign-up",
  "signin",
  "signup",
  "_next",
  "favicon",
  "assets",
  "static",
];

export async function updateUsername(username) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) throw new Error("Unauthorized");

  const validated = usernameSchema.parse({ username });
  username = validated.username;

  if (RESERVED_USERNAMES.includes(username.toLowerCase())) {
    throw new Error("This username is reserved and cannot be used");
  }

  const existingUser = await db.user.findUnique({
    where: { username },
  });

  if (existingUser && existingUser.id !== session.user.id) {
    throw new Error("Username is already taken");
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { username },
  });

  return { success: true };
}

export async function getUserByUsername(username) {
  const user = await db.user.findUnique({
    where: { username },
    select: {
      id: true,
      name: true,
      imageUrl: true,
      events: {
        where: {
          isPrivate: false,
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          title: true,
          description: true,
          duration: true,
          isPrivate: true,
          _count: {
            select: { bookings: true },
          },
        },
      },
    },
  });

  return user;
}
