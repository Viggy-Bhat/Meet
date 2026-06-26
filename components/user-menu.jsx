"use client";

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChartNoAxesGantt, LogOut } from "lucide-react";
import Link from "next/link";

export default function UserMenu() {
  const { data: session } = authClient.useSession();
  const router = useRouter();

  if (!session) return null;

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <div className="relative group">
      <button className="flex items-center gap-2">
        <Avatar className="w-10 h-10">
          <AvatarImage src={session.user.imageUrl} />
          <AvatarFallback>
            {session.user.name?.charAt(0)?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </button>
      <div className="absolute right-0 mt-2 w-48 bg-popover border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
        <Link
          href="/events"
          className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted rounded-t-lg"
        >
          <ChartNoAxesGantt size={15} />
          My Events
        </Link>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted rounded-b-lg w-full text-left"
        >
          <LogOut size={15} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
