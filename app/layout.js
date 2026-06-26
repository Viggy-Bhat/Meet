import { Fraunces, DM_Sans } from "next/font/google";
import "./globals.css";
import Header from "@/components/header";
import CreateEventDrawer from "@/components/create-event";

export const metadata = {
  title: "Meet",
  description: "Meeting Scheduling app",
};

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${fraunces.variable} ${dmSans.variable} font-sans`}
        suppressHydrationWarning={true}
      >
        <Header />
        <main className="min-h-screen">{children}</main>
        <footer className="border-t py-10">
          <div className="container mx-auto py-4 text-center text-muted-foreground text-sm">
            <p>&copy; 2024 Meet. All rights reserved</p>
          </div>
        </footer>
        <CreateEventDrawer />
      </body>
    </html>
  );
}
