"use client";

import { Loader2, Mic, FileText, AlertCircle, XCircle } from "lucide-react";

const STATUS_META = {
  UPLOADED: {
    title: "Starting processing...",
    active: "Preparing audio file",
    pending: "Transcribing audio",
  },
  PROCESSING: {
    title: "Preparing your recording...",
    active: "Preparing audio file",
    pending: "Transcribing audio",
  },
  TRANSCRIBING: {
    title: "Transcribing with local AI...",
    active: "Transcribing audio with Whisper",
    pending: "Generating AI summary",
  },
  TRANSCRIBED: {
    title: "Transcription complete...",
    active: "Transcription done",
    pending: "Generating AI summary",
  },
  SUMMARIZING: {
    title: "Generating AI summary...",
    active: "Generating AI summary",
    pending: "Finalizing results",
  },
  COMPLETED: {
    title: "All done!",
    active: "Transcription complete",
    pending: "Summary ready",
  },
  FAILED: {
    title: "Processing failed",
    active: "Something went wrong",
    pending: "Please try again",
  },
};

export default function ProcessingState({ status = "PROCESSING", errorMessage = null }) {
  const meta = STATUS_META[status] || STATUS_META.PROCESSING;

  if (status === "FAILED") {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-4">
        <div className="relative h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
          <XCircle className="h-6 w-6 text-destructive" />
        </div>
        <p className="font-serif text-lg font-medium">{meta.title}</p>
        {errorMessage && (
          <div className="flex items-start gap-2 text-sm text-destructive max-w-xs text-center">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-10 gap-4">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-accent/20 animate-ping" />
        <div className="relative h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      </div>
      <p className="font-serif text-lg font-medium">{meta.title}</p>
      <div className="flex flex-col gap-2 w-full max-w-xs">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Mic className="h-4 w-4 animate-pulse text-accent" />
          <span>{meta.active}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground/60">
          <FileText className="h-4 w-4" />
          <span>{meta.pending}</span>
        </div>
      </div>
    </div>
  );
}
