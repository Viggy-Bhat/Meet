import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/prisma";

export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),
  emailAndPassword: { enabled: false },
  trustedOrigins: [
    process.env.NEXT_PUBLIC_APP_URL,
    ...(process.env.NODE_ENV === "development"
      ? ["http://localhost:3005"]
      : []),
  ].filter(Boolean),
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      scope: ["email", "profile", "https://www.googleapis.com/auth/calendar"],
      accessType: "offline",
      prompt: "select_account consent",
    },
  },
  plugins: [nextCookies()],
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    freshAge: 0,
  },
  user: {
    fields: {
      image: "imageUrl",
    },
    additionalFields: {
      username: {
        type: "string",
        required: false,
        input: false,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const base = (user.name || "user").replace(/\s+/g, "-").toLowerCase();
          const suffix = Math.random().toString(36).slice(-4);
          return {
            data: {
              ...user,
              username: `${base}-${suffix}`,
            },
          };
        },
      },
    },
  },
});
