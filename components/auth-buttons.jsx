"use client";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import UserMenu from "@/components/user-menu";

export default function AuthButtons() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) return null;

  if (session) {
    return <UserMenu />;
  }

  return (
    <Button
      onClick={() =>
        authClient.signIn.social({
          provider: "google",
          callbackURL: "/dashboard",
        })
      }
      className="rounded-full"
    >
      Login
    </Button>
  );
}
