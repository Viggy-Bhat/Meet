"use server";

import { db } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { after } from "next/server";
import { transcribeRecording } from "@/lib/ai/whisper";
import { generateSummary } from "@/lib/ai/summarize";
import { uploadRecordingSchema } from "@/lib/validators";

async function getSessionUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
  });
  if (!user) throw new Error("User not found");

  return user;
}

export async function createRecording(data) {
  const user = await getSessionUser();

  const validated = uploadRecordingSchema.parse(data);

  if (validated.bookingId) {
    const booking = await db.booking.findUnique({
      where: { id: validated.bookingId },
      select: { userId: true },
    });
    if (!booking || booking.userId !== user.id) {
      throw new Error("Booking not found");
    }

    const existingRecording = await db.recording.findFirst({
      where: { bookingId: validated.bookingId, userId: user.id },
    });
    if (existingRecording && existingRecording.status === "FAILED") {
      await db.recording.delete({ where: { id: existingRecording.id } });
    }
  }

  const recording = await db.recording.create({
    data: {
      userId: user.id,
      bookingId: validated.bookingId || null,
      fileUrl: validated.fileUrl,
      status: "UPLOADED",
    },
  });

  return recording;
}

/* ------------------------------------------------------------------ */
/*  Internal background processor — runs inside after()                  */
/* ------------------------------------------------------------------ */
async function _runProcessing(recordingId, userId) {
  const startTime = Date.now();

  try {
    const recording = await db.recording.findUnique({
      where: { id: recordingId },
      include: { transcript: true, summary: true },
    });

    if (!recording || recording.userId !== userId) {
      console.error(`[Recording ${recordingId}] Unauthorized or not found`);
      return;
    }

    if (recording.status === "COMPLETED") {
      console.log(`[Recording ${recordingId}] Already completed`);
      return;
    }

    /* ---------- PROCESSING ---------- */
    await db.recording.update({
      where: { id: recordingId },
      data: { status: "PROCESSING", errorMessage: null },
    });
    console.log(`[Recording ${recordingId}] Status: PROCESSING`);

    /* ---------- TRANSCRIBING ---------- */
    await db.recording.update({
      where: { id: recordingId },
      data: { status: "TRANSCRIBING" },
    });
    console.log(`[Recording ${recordingId}] Status: TRANSCRIBING`);

    let transcriptText = recording.transcript?.transcript || null;
    let transcriptResult = null;

    if (!transcriptText) {
      let lastError = null;
      let result = null;

      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          result = await transcribeRecording(recording.fileUrl);
          break;
        } catch (error) {
          lastError = error;
          console.error(
            `[Recording ${recordingId}] Transcription attempt ${attempt + 1} failed:`,
            error.message
          );
          if (attempt === 0) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        }
      }

      if (!result) {
        throw new Error(`Transcription failed: ${lastError?.message}`);
      }

      transcriptText = result.text;
      transcriptResult = result;

      await db.meetingTranscript.create({
        data: {
          recordingId,
          transcript: transcriptText,
          language: result.language || null,
          segments: result.segments?.length > 0 ? result.segments : null,
        },
      });

      console.log(
        `[Recording ${recordingId}] Transcription complete. ` +
          `Lang: ${result.language}, Segments: ${result.segments?.length || 0}, ` +
          `Duration: ${result.duration}s`
      );
    }

    /* ---------- TRANSCRIBED ---------- */
    await db.recording.update({
      where: { id: recordingId },
      data: { status: "TRANSCRIBED" },
    });
    console.log(`[Recording ${recordingId}] Status: TRANSCRIBED`);

    /* ---------- SUMMARIZING ---------- */
    await db.recording.update({
      where: { id: recordingId },
      data: { status: "SUMMARIZING" },
    });
    console.log(`[Recording ${recordingId}] Status: SUMMARIZING`);

    try {
      const summaryData = await generateSummary(transcriptText);

      if (recording.summary) {
        await db.meetingSummary.update({
          where: { id: recording.summary.id },
          data: {
            summary: summaryData.summary,
            actionItems: summaryData.actionItems,
            keyPoints: summaryData.keyPoints,
            followUps: summaryData.followUps || null,
          },
        });
      } else {
        await db.meetingSummary.create({
          data: {
            recordingId,
            summary: summaryData.summary,
            actionItems: summaryData.actionItems,
            keyPoints: summaryData.keyPoints,
            followUps: summaryData.followUps || null,
          },
        });
      }

      /* ---------- COMPLETED ---------- */
      await db.recording.update({
        where: { id: recordingId },
        data: { status: "COMPLETED", errorMessage: null },
      });

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[Recording ${recordingId}] Status: COMPLETED (${elapsed}s)`);
    } catch (summaryError) {
      console.error(
        `[Recording ${recordingId}] Summary generation failed:`,
        summaryError.message
      );
      /* Stay at TRANSCRIBED so the user can still view the transcript */
      await db.recording.update({
        where: { id: recordingId },
        data: { status: "TRANSCRIBED", errorMessage: `Summary failed: ${summaryError.message}` },
      });
      console.log(`[Recording ${recordingId}] Status: TRANSCRIBED (summary failed)`);
    }
  } catch (error) {
    console.error(`[Recording ${recordingId}] Processing failed:`, error.message);

    let errorMessage = error.message || "Unknown processing error";

    // Differentiate error types for actionable frontend messages
    if (errorMessage.includes("Local AI server is not running")) {
      errorMessage = "Local AI server is not running. Start it with: npm run whisper-server";
    } else if (errorMessage.includes("No speech detected")) {
      errorMessage = "No speech detected in the recording. Please check the audio quality.";
    } else if (errorMessage.includes("Failed to download file")) {
      errorMessage = "Failed to download recording from storage. Please retry.";
    } else if (errorMessage.includes("Unsupported file type")) {
      errorMessage = "Unsupported file format. Please upload MP3, WAV, MP4, or M4A.";
    } else if (errorMessage.includes("File too large")) {
      errorMessage = "File too large. Maximum supported size is 500MB.";
    } else if (errorMessage.includes("Whisper server error")) {
      errorMessage = "Transcription engine error. Please retry or check server logs.";
    }

    await db.recording.update({
      where: { id: recordingId },
      data: { status: "FAILED", errorMessage },
    });
    console.log(`[Recording ${recordingId}] Status: FAILED — ${errorMessage}`);
  }
}

/* ------------------------------------------------------------------ */
/*  New lightweight trigger — returns immediately, schedules work    */
/* ------------------------------------------------------------------ */
export async function triggerProcessing(recordingId) {
  const user = await getSessionUser();

  const recording = await db.recording.findUnique({
    where: { id: recordingId },
  });

  if (!recording || recording.userId !== user.id) {
    throw new Error("Recording not found or unauthorized");
  }

  if (recording.status === "COMPLETED") {
    return { success: true, recordingId, alreadyComplete: true };
  }

  if (recording.retryCount >= 3) {
    throw new Error("Maximum retry attempts reached for this recording");
  }

  /* Increment retry count so we don't loop forever on persistent failures */
  await db.recording.update({
    where: { id: recordingId },
    data: { retryCount: { increment: 1 }, status: "PROCESSING", errorMessage: null },
  });

  /* Kick off background work after the response is sent */
  after(() => _runProcessing(recordingId, user.id));

  console.log(`[Recording ${recordingId}] Background processing triggered (retryCount: ${recording.retryCount + 1})`);

  return { success: true, recordingId };
}

export async function getRecording(recordingId) {
  const user = await getSessionUser();

  const recording = await db.recording.findUnique({
    where: { id: recordingId },
    include: { transcript: true, summary: true },
  });

  if (!recording || recording.userId !== user.id) {
    throw new Error("Recording not found or unauthorized");
  }

  return recording;
}


