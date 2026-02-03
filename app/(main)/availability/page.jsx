import React from "react";
import AvailabilityForm from "@/app/(main)/availability/components/availability-form";
import { getUserAvailability } from "@/actions/availability";
import { defaultAvailability } from "./data";

export const dynamic = 'force-dynamic';

export default async function AvailabilityPage() {
  const availability = await getUserAvailability();

  return <AvailabilityForm initialData={availability || defaultAvailability} />;
}