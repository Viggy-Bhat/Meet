import { PenBox } from "lucide-react";
import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "./ui/button";
import AuthButtons from "@/components/auth-buttons";
import { checkUser } from "@/lib/checkUser";

const Header = async () => {
  await checkUser();

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/60">
      <div className="mx-auto py-3 px-4 lg:px-8 flex justify-between items-center">
        <Link href="/" className="flex items-center">
          <Image
            src="/logo2.png"
            alt="logo"
            width={110}
            height={90}
            className="h-12 w-auto"
          />
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/events?create=true">
            <Button variant="outline" className="rounded-full">
              <PenBox size={16} className="mr-2" />
              Create Event
            </Button>
          </Link>
          <AuthButtons />
        </div>
      </div>
    </nav>
  );
};

export default Header;
