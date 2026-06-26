const WHISPER_SERVER_URL =
  process.env.WHISPER_SERVER_URL || "http://localhost:8010";

const BACKEND_API_KEY = process.env.BACKEND_API_KEY || "";

/**
 * Send the UploadThing file URL to the Whisper backend.
 * The backend downloads and transcribes the file directly,
 * avoiding a double transfer through the Next.js server.
 */
export async function transcribeRecording(fileUrl, options = {}) {
  const body = {
    file_url: fileUrl,
    language: options.language || null,
    task: options.task || "transcribe",
  };

  const headers = {
    "Content-Type": "application/json",
  };
  if (BACKEND_API_KEY) {
    headers["X-API-Key"] = BACKEND_API_KEY;
  }

  const endpoint = `${WHISPER_SERVER_URL}/transcribe-from-url`;

  let lastError = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        body: JSON.stringify(body),
        headers,
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error(
          `Whisper server error (${res.status}): ${errorBody.detail || res.statusText}`
        );
      }

      const result = await res.json();

      if (!result.text || result.text.trim().length === 0) {
        throw new Error("No speech detected in the recording");
      }

      return {
        text: result.text,
        language: result.language || "unknown",
        duration: result.duration || 0,
        segments: result.segments || [],
      };
    } catch (error) {
      lastError = error;

      /* Make connection failures explicit so callers can show a helpful UI message */
      if (error.cause?.code === "ECONNREFUSED" || error.message?.includes("fetch failed")) {
        lastError = new Error(
          "Local AI server is not running. Start it with: npm run whisper-server"
        );
      }

      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }

  throw lastError;
}
