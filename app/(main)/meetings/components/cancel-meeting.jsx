"use client";

import { Button } from "@/components/ui/button";
import { cancelMeeting } from "@/actions/meetings";
import { useRouter } from "next/navigation";
import useFetch from "@/hooks/use-fetch";
import { XCircle } from "lucide-react";

export default function CancelMeetingButton({ meetingId }) {
  const router = useRouter();

  const { loading, error, fn: fnCancelMeeting } = useFetch(cancelMeeting);

  const handleCancel = async () => {
    if (window.confirm("Are you sure you want to cancel this meeting?")) {
      await fnCancelMeeting(meetingId);
      router.refresh();
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={handleCancel}
        disabled={loading}
        className="rounded-full text-destructive hover:text-destructive"
      >
        {loading ? "Canceling..." : "Cancel Meeting"}
        {!loading && <XCircle className="ml-1.5 h-3.5 w-3.5" />}
      </Button>
      {error && <span className="text-red-500 text-xs">{error.message}</span>}
    </div>
  );
}
