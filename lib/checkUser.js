"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { headers } from "next/headers";

export const checkUser = async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  return await db.user.findUnique({ where: { id: session.user.id } });
};
