import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/header";
import { ClerkProvider } from "@clerk/nextjs";
import CreateEventDrawer from "@/components/create-event";

export const metadata = {
  title: "Meet",
  description: "Meeting Scheduling app",
};

const inter=Inter({ subsets: ['latin'] });

export default function RootLayout({ children }) {
  return (
       <ClerkProvider>
    <html lang="en">
      <body
        className={`${inter.className}`} 
        suppressHydrationWarning={true}
      >
         <Header />
        <main className="min-h-screen bg-gradient-to-r from-blue-50 to-white">
        {children}
        </main>
       
       <footer className="bg-blue-100 py-10">
        <div className="container mx-auto py-4 text-center text-gray-600">
          <p>
            &copy; 2024 Meet. All rights reserved. Made with ❤️ by Vignesh
          </p>
        </div>
       </footer>
        <CreateEventDrawer />
      </body>
    </html>
    </ClerkProvider>
  );
}
