"use client";

import { Button } from "@/components/ui/button";
import { Mic } from "lucide-react";
import { useState } from "react";
import UploadRecording from "./upload-recording";
import AiSummaryCard from "./ai-summary-card";
import TranscriptViewer from "./transcript-viewer";
import ProcessingState from "./processing-state";

export default function MeetingRecordings({ meeting }) {
  const [showUpload, setShowUpload] = useState(false);

  const recordings = meeting.recordings || [];
  const latest = recordings[0];

  if (!latest) {
    if (showUpload) {
      return (
        <div className="mt-4">
          <UploadRecording bookingId={meeting.id} />
        </div>
      );
    }

    return (
      <div className="mt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowUpload(true)}
          className="w-full rounded-full"
        >
          <Mic className="mr-2 h-3.5 w-3.5" />
          Upload Recording
        </Button>
      </div>
    );
  }

  const busyStatuses = ["UPLOADED", "PROCESSING", "TRANSCRIBING", "SUMMARIZING"];

  if (busyStatuses.includes(latest.status)) {
    return (
      <div className="mt-4">
        <ProcessingState status={latest.status} />
      </div>
    );
  }

  if (latest.status === "TRANSCRIBED") {
    return (
      <div className="mt-4 space-y-3">
        {latest.summary ? (
          <AiSummaryCard summary={latest.summary} bookingId={meeting.id} />
        ) : (
          <p className="text-sm text-muted-foreground text-center py-2">
            Transcript ready. AI summary could not be generated.
          </p>
        )}
        {latest.transcript && (
          <TranscriptViewer transcript={latest.transcript.transcript} />
        )}
      </div>
    );
  }

  if (latest.status === "COMPLETED" && latest.summary) {
    return (
      <div className="mt-4 space-y-3">
        <AiSummaryCard summary={latest.summary} bookingId={meeting.id} />
        {latest.transcript && (
          <TranscriptViewer transcript={latest.transcript.transcript} />
        )}
      </div>
    );
  }

  if (latest.status === "FAILED") {
    if (showUpload) {
      return (
        <div className="mt-4">
          <UploadRecording bookingId={meeting.id} />
        </div>
      );
    }

    return (
      <div className="mt-4 space-y-3">
        <ProcessingState status="FAILED" errorMessage={latest.errorMessage} />
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowUpload(true)}
          className="w-full rounded-full"
        >
          <Mic className="mr-2 h-3.5 w-3.5" />
          Upload New Recording
        </Button>
      </div>
    );
  }

  return null;
}
