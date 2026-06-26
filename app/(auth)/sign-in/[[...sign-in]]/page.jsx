"use client";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export default function SignInPage() {
  return (
    <div className="flex flex-col items-center gap-6 pt-10">
      <h1 className="font-serif text-3xl font-bold">Sign in to Meet</h1>
      <p className="text-muted-foreground text-center max-w-sm">
        Sign in with your Google account to manage events and schedule meetings.
      </p>
      <Button
        onClick={() =>
          authClient.signIn.social({
            provider: "google",
            callbackURL: "/dashboard",
          })
        }
        className="rounded-full"
      >
        Continue with Google
      </Button>
    </div>
  );
}
