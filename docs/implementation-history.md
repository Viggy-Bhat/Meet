# Implementation History

## Phase 1 — Core Scheduling

Built the meeting scheduling app with Next.js 15, Prisma, PostgreSQL, Google Calendar integration, and weekly availability management.

## Phase 2 — Frontend Redesign

Replaced the generic blue-gradient aesthetic with a refined warm palette:
- **Primary**: Deep indigo
- **Accent**: Warm terracotta
- **Background**: Warm cream
- **Fonts**: Fraunces (serif, headings) + DM Sans (sans, body)

All Shadcn UI components rethemed via CSS custom properties. 18 component files updated.

**Build fix**: Next.js detected a stray `package-lock.json` at `C:\Users\Asus\package-lock.json`, incorrectly setting the workspace root. Fixed by setting `turbopack.root: process.cwd()` in `next.config.mjs`. Port changed from 3000 to 3005.

## Phase 3 — AI Meeting Summaries (v1)

Added upload → transcription → summary pipeline:
- UploadThing for file storage (100MB limit at the time)
- Initially attempted OpenAI Whisper via OpenRouter, discovered `/audio/transcriptions` is unsupported
- Switched to `google/gemini-2.5-flash` via OpenRouter chat completions with base64-encoded audio
- GPT-4o-mini for summarization with Zod validation
- `processRecording` ran synchronously; client polled as 60s fallback

**Critical bug**: `useFetch` hook swallowed server action responses — `fn()` set state but returned `undefined`. `await fnCreateRecording(...)` always resolved to `undefined`, so processing never triggered. Recordings were created (status `UPLOADED`) but stuck forever.

**Fix**: Added `return response` and `throw error` to `useFetch.fn`. Backward-compatible.

## Phase 4 — Stability & Reliability Rewrite

Complete architecture overhaul to prioritize system stability and large-file reliability:

- **Replaced cloud transcription** with local **faster-whisper** (CTranslate2) backend
- **Background processing** via `after()` from `next/server` — non-blocking, returns immediately
- **Stream downloads** directly from UploadThing URL to disk — no proxy through Next.js
- **Status flow expanded**: `UPLOADED → PROCESSING → TRANSCRIBING → TRANSCRIBED → SUMMARIZING → COMPLETED`
- **Granular error handling**: `errorMessage` field on Recording model, differentiated error types
- **Retry support**: `retryCount` field, max 3 retries, server-side download retries (3 attempts, 2s delay)
- **Transcript persistence**: backend saves JSON to `backend/transcripts/` for recovery
- **Upload limit raised**: 100MB → 500MB
- **Frontend validation**: client-side file type/size checks, actionable error messages
- **PDF export**: added `@react-pdf/renderer` integration for meeting reports

**CUDA safety**: Defaults to CPU (`device=cpu, compute_type=int8`). Auto-fallback if CUDA load fails. GPU is optional, never mandatory.

## Phase 5 — Codebase Cleanup

- Removed dead `@google/genai` dependency (leftover from Gemini experiment)
- Removed `clerkUserId` from User model and `password` from Account model (Better Auth migration)
- Removed unused `processRecording()` and `getRecordingsByBooking()` functions
- Consolidated `app/lib/validators.js` into `lib/validators.js`
- Reorganized documentation: created `docs/` folder with dedicated files
- Added root `deployment.md` for full-stack deployment guide
