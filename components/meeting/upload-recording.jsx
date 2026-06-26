"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileAudio, AlertCircle, RotateCcw } from "lucide-react";
import { createRecording, triggerProcessing, getRecording } from "@/actions/ai-summary";
import useFetch from "@/hooks/use-fetch";
import { useUploadThing } from "@/lib/uploadthing-client";
import ProcessingState from "./processing-state";
import AiSummaryCard from "./ai-summary-card";
import TranscriptViewer from "./transcript-viewer";

const MAX_FILE_SIZE_MB = 500;
const ALLOWED_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/mp4",
  "audio/x-m4a",
  "video/mp4",
];
const ALLOWED_EXTS = [".mp3", ".wav", ".mp4", ".m4a"];

function validateFile(file) {
  if (!file) return "No file selected";

  const sizeMb = file.size / (1024 * 1024);
  if (sizeMb > MAX_FILE_SIZE_MB) {
    return `File too large (${sizeMb.toFixed(1)}MB). Max is ${MAX_FILE_SIZE_MB}MB.`;
  }

  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  if (!ALLOWED_EXTS.includes(ext) && !ALLOWED_TYPES.includes(file.type)) {
    return "Unsupported format. Please upload MP3, WAV, MP4, or M4A.";
  }

  return null;
}

export default function UploadRecording({ bookingId }) {
  const [file, setFile] = useState(null);
  const [recordingId, setRecordingId] = useState(null);
  const [processingRecording, setProcessingRecording] = useState(null);
  const [pollingActive, setPollingActive] = useState(false);
  const [validationError, setValidationError] = useState(null);

  const { startUpload, isUploading } = useUploadThing("recordingUploader", {
    onClientUploadComplete: async (res) => {
      try {
        const fileUrl = res[0].ufsUrl;

        const recording = await fnCreateRecording({
          fileUrl,
          bookingId: bookingId || undefined,
        });

        if (recording) {
          setRecordingId(recording.id);
          // Fire background processing and start polling immediately
          await fnTriggerProcessing(recording.id);
          startPolling(recording.id);
        }
      } catch (error) {
        console.error("Recording creation or processing trigger failed:", error);
      }
    },
    onUploadError: (error) => {
      console.error("Upload error:", error);
      alert("Upload failed: " + error.message);
    },
  });

  const { loading: saving, error: createError, fn: fnCreateRecording } =
    useFetch(createRecording);
  const { fn: fnTriggerProcessing } = useFetch(triggerProcessing);

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      const err = validateFile(selected);
      setValidationError(err);
      setFile(selected);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    const err = validateFile(file);
    if (err) {
      setValidationError(err);
      return;
    }
    setValidationError(null);
    await startUpload([file]);
  };

  const handleRetry = async () => {
    if (!recordingId) return;
    setProcessingRecording(null);
    setPollingActive(true);
    await fnTriggerProcessing(recordingId);
    startPolling(recordingId);
  };

  const startPolling = (rid) => {
    setPollingActive(true);

    const poll = setInterval(async () => {
      try {
        const status = await getRecording(rid);
        const doneStates = ["COMPLETED", "FAILED", "TRANSCRIBED"];
        if (doneStates.includes(status.status)) {
          clearInterval(poll);
          setPollingActive(false);
          setProcessingRecording(status);
        }
      } catch {
        clearInterval(poll);
        setPollingActive(false);
      }
    }, 2000);
  };

  /* ---------- COMPLETED ---------- */
  if (processingRecording && processingRecording.status === "COMPLETED") {
    return (
      <div className="space-y-4">
        <AiSummaryCard summary={processingRecording.summary} bookingId={bookingId} />
        {processingRecording.transcript && (
          <TranscriptViewer transcript={processingRecording.transcript.transcript} />
        )}
      </div>
    );
  }

  /* ---------- TRANSCRIBED (summary failed or still pending) ---------- */
  if (processingRecording && processingRecording.status === "TRANSCRIBED") {
    return (
      <div className="space-y-4">
        {processingRecording.summary ? (
          <AiSummaryCard summary={processingRecording.summary} bookingId={bookingId} />
        ) : (
          <p className="text-sm text-muted-foreground text-center">
            Transcript ready. AI summary could not be generated.
          </p>
        )}
        {processingRecording.transcript && (
          <TranscriptViewer transcript={processingRecording.transcript.transcript} />
        )}
      </div>
    );
  }

  /* ---------- FAILED ---------- */
  if (processingRecording && processingRecording.status === "FAILED") {
    return (
      <div className="space-y-4">
        <ProcessingState status="FAILED" errorMessage={processingRecording.errorMessage} />
        <Button
          onClick={handleRetry}
          variant="outline"
          className="w-full rounded-full"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Retry Processing
        </Button>
      </div>
    );
  }

  /* ---------- LOADING ---------- */
  if (recordingId && (saving || pollingActive)) {
    return (
      <ProcessingState
        status={processingRecording?.status || "PROCESSING"}
      />
    );
  }

  /* ---------- UPLOAD FORM ---------- */
  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="font-serif text-lg">Upload Recording</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-accent/40 transition-colors">
          <input
            type="file"
            accept="audio/mpeg,audio/wav,audio/mp4,video/mp4"
            onChange={handleFileChange}
            className="hidden"
            id="recording-upload"
          />
          <label
            htmlFor="recording-upload"
            className="cursor-pointer flex flex-col items-center gap-3"
          >
            {file ? (
              <>
                <FileAudio className="h-10 w-10 text-accent" />
                <span className="text-sm font-medium">{file.name}</span>
                <span className="text-xs text-muted-foreground">
                  {(file.size / (1024 * 1024)).toFixed(1)} MB
                </span>
              </>
            ) : (
              <>
                <Upload className="h-10 w-10 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Click to select a recording
                </span>
                <span className="text-xs text-muted-foreground">
                  MP3, WAV, MP4, M4A up to {MAX_FILE_SIZE_MB}MB
                </span>
              </>
            )}
          </label>
        </div>
        <Button
          onClick={handleUpload}
          disabled={!file || isUploading || !!validationError}
          className="w-full rounded-full"
        >
          {isUploading ? "Uploading..." : "Upload & Process"}
        </Button>
        {validationError && (
          <div className="flex items-center gap-2 text-sm text-destructive text-center justify-center">
            <AlertCircle className="h-4 w-4" />
            <span>{validationError}</span>
          </div>
        )}
        {createError && (
          <p className="text-sm text-destructive text-center mt-2">
            {createError.message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
