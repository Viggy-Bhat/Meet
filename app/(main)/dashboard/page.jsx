// app/(main)/dashboard/page.jsx
import DashboardView from "./_components/dashboard-view"; 

// This works here because there is no "use client" at the top
export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return <DashboardView />;
}