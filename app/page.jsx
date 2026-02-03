
// app/page.jsx
import LandingPage from "./_components/landing-page";

// This tells Vercel: "Don't snapshot this page. Wait for the real user."
export const dynamic = "force-dynamic";

export default function Home() {
  return <LandingPage />;
}