# AGENTS.md — Meet

Meeting scheduling app (Next.js 16 App Router, React 19, better-auth, Prisma + PostgreSQL, Google Calendar/Meet, local Whisper transcription).

## Stack & tooling

- **JavaScript only** — no TypeScript. `jsconfig.json` maps `@/*` to `./*`.
- **React Compiler enabled** in `next.config.mjs` (`reactCompiler: true`).
- **Tailwind CSS v4** via `@tailwindcss/postcss` (no `tailwind.config.js`).
- **Shadcn UI** (new-york style, RSC mode). Icons: `lucide-react`.
- **Fonts**: Fraunces (serif, headings) + DM Sans (sans, body) via `next/font/google`.
- **Color scheme**: deep indigo primary (`--primary`), warm terracotta accent (`--accent`), cream backgrounds. Sidebar uses a dark indigo (`--sidebar`).
- **Zod v4** for validation.
- **UploadThing** for file uploads (`lib/uploadthing.js`, `lib/uploadthing-client.js`). Max file size: **500MB**.
- **OpenAI** (via OpenRouter — GPT-4o-mini for summarization) for AI meeting summaries (`lib/ai/summarize.js`).
- **Local Whisper** (faster-whisper via CTranslate2 on Python FastAPI) for transcription (`backend/`). No cloud dependency.
- **better-auth** for authentication (Google OAuth only; email/password disabled).
- **No tests anywhere** in the repo.

## Commands

```bash
npm run dev       # next dev (port 3005)
npm run build     # next build
npm run lint      # eslint (core-web-vitals only)
npm run start     # next start (production)
npm run whisper-server  # starts Python backend (port 8010)
```

`prisma generate` runs automatically via `postinstall`. If you edit `prisma/schema.prisma`, run `npx prisma generate` manually.

## Database

- **PostgreSQL** via Neon. Connection string in `DATABASE_URL`.
- PrismaClient is cached on `globalThis.prisma` in dev to survive hot reloads (`lib/prisma.js`).
- `/lib/generated/prisma` is gitignored — regenerated on deploy via `postinstall`.

## Auth & middleware

- **better-auth** (not Clerk). Config in `lib/auth.js`, client in `lib/auth-client.js`.
- Auth route handler at `app/api/auth/[...all]/route.js` via `toNextJsHandler`.
- The auth middleware lives in **`proxy.js`** (Next.js 16 convention, not `middleware.js`).
- Protected routes: `/dashboard`, `/events`, `/meetings`, `/availability` (and sub-routes).
- Public routes: `/` (landing), `/sign-in`, `/sign-up`, `/[username]`, `/[username]/[eventId]`.
- `checkUser()` in `lib/checkUser.js` is called from the Header server component on every page — it auto-creates/returns the DB user from the better-auth session.
- All server actions enforce auth via `auth.api.getSession()` from `@/lib/auth`.
- Google OAuth scope includes `https://www.googleapis.com/auth/calendar` for Calendar/Meet integration.
- **Google OAuth credentials must be set** in `.env` (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`). Without these, login is broken.

## Architecture

```
proxy.js                  # better-auth middleware (protects /dashboard, /events, /meetings, /availability)
app/
  layout.js               # Root: Header + footer + CreateEventDrawer (NO ClerkProvider)
  page.jsx                # Landing page (force-dynamic)
  _components/landing-page.jsx  # "use client"
  (auth)/                 # Route group: sign-in, sign-up
  (main)/                 # Route group: authenticated app shell (sidebar + bottom tabs)
    dashboard/            # force-dynamic
    events/               # force-dynamic
    meetings/             # force-dynamic (tabs: upcoming / past)
    availability/         # force-dynamic
  [username]/             # Public profile + event listing
  [username]/[eventId]/   # Public booking page (event details + slot picker)
  lib/validators.js       # Zod schemas (event, booking, availability, username)
actions/                  # "use server" — all DB+mutation logic
  events.js, bookings.js, availability.js, users.js, dashboard.js, meetings.js, ai-summary.js, generate-pdf.js
```

All `(main)` pages use `export const dynamic = "force-dynamic"` — they are never statically rendered.

## AI Summaries (`components/meeting/`, `actions/ai-summary.js`, `lib/ai/`, `backend/`)

### Pipeline

1. **Upload**: Client uploads to UploadThing (500MB max, MP3/WAV/MP4/M4A). Returns URL.
2. **Create**: `createRecording()` stores metadata in DB. Status: `UPLOADED`.
3. **Trigger**: `triggerProcessing()` uses `after()` from `next/server` to kick off background work non-blocking.
4. **Transcribe**:
   - Status → `PROCESSING` → `TRANSCRIBING`
   - `lib/ai/whisper.js` POSTs the UploadThing URL to the Python backend (`/transcribe-from-url`)
   - Backend **streams the download directly** from UploadThing URL to disk (no proxy through Next.js)
   - Backend runs **faster-whisper** (local, offline) on CPU mode by default
   - Backend **persists transcript JSON** to `backend/transcripts/` as a recovery mechanism
   - Returns `{ text, language, duration, segments }`
5. **Summarize**:
   - Status → `TRANSCRIBED` → `SUMMARIZING`
   - `lib/ai/summarize.js` sends transcript to **GPT-4o-mini via OpenRouter**
   - Zod v4 validation (`summaryResponseSchema`) — retries once on validation failure
   - Status → `COMPLETED`
6. **Client polls** `getRecording()` every 2s to track status changes.

### Status Flow

```
UPLOADED → PROCESSING → TRANSCRIBING → TRANSCRIBED → SUMMARIZING → COMPLETED
                              ↓
                           FAILED
```

**Critical rule:** If transcription succeeds but summary fails, status stays at `TRANSCRIBED` and the transcript remains accessible. The summary error is stored in `errorMessage`.

### Recording Model Fields

- `status` (RecordingStatus enum) — current pipeline stage
- `errorMessage` (String?) — human-readable error for FAILED or summary-failure states
- `retryCount` (Int, default 0) — increments on each retry attempt; max 3 enforced
- `duration` (Int?) — recording duration in seconds (populated by backend)

### Retry Behavior

- `triggerProcessing()` increments `retryCount` before launching `after()`
- If `retryCount >= 3`, it throws "Maximum retry attempts reached"
- Backend download has its own retry loop: 3 attempts, 2s delay, with progress logging every 50MB

### Past Meetings UI

Past meetings show an "Upload Recording" button in `/meetings` (past tab). Upload goes through UploadThing. Processing is triggered automatically. The client polls every 2s.

If processing fails, the frontend shows the `errorMessage` and a **Retry Processing** button.

## Local Whisper Backend (`backend/`)

- **Python FastAPI** server running faster-whisper (CTranslate2)
- **Default config** is safe CPU-only: `WHISPER_DEVICE=cpu`, `WHISPER_COMPUTE_TYPE=int8`
- **CUDA is optional** — set `WHISPER_DEVICE=cuda` and `WHISPER_COMPUTE_TYPE=float16` to enable. Auto-fallback to CPU if CUDA fails.
- **FFmpeg** is bundled in `backend/tools/ffmpeg/bin/` and auto-detected. Auto-download on Windows if missing.
- **Transcript persistence**: backend saves transcript JSON to `backend/transcripts/` for recovery even if the DB transaction fails.
- **Download retry**: 3 attempts with 2s delay. Progress logged every 50MB.
- **File validation**: enforced on temp filename (which always has a valid extension, because `generate_unique_name()` falls back to `.mp3` when the URL path lacks one, e.g. UploadThing URLs like `ufs.sh/f/abc123`)

Start the backend:
```bash
npm run whisper-server   # from project root
# or
cd backend && venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8010
```

## Google Calendar / Meet integration

- Bookings use the event **creator's** Google OAuth token (fetched from the `Account` table via better-auth/social login).
- Creating a booking: inserts a Google Calendar event with `conferenceData` → returns `hangoutLink` (Google Meet URL).
- Cancelling a meeting: deletes the Google Calendar event first, then the DB record.
- Timezone is hardcoded to `Asia/Kolkata` in `actions/bookings.js`.
- If the creator hasn't connected Google Calendar, the booking still succeeds but with `needsReconnect: true` and no Meet link.

## PDF Export

- Endpoint: `GET /api/meetings/{bookingId}/pdf`
- Uses `@react-pdf/renderer` (`components/meeting/meeting-pdf-document.jsx`)
- Includes event title, date/time, participants, AI summary, key points, action items, follow-ups, and full transcript
- Download icon appears in `AiSummaryCard` header when `bookingId` is passed

## Key patterns

- **Client/server split**: Server Components (`async` functions, no `"use client"`) call server actions directly. Client Components use the `useFetch` hook from `hooks/use-fetch.js` to wrap server actions with loading/error state.
- **Create Event flow**: "Create Event" button in header navigates to `/events?create=true` → `CreateEventDrawer` reads the search param and opens a vaul drawer with `EventForm`.
- **Availability**: stored as `DayAvailability` enums (SUNDAY–SATURDAY) with start/end `DateTime` objects. `timeGap` controls minimum gap between bookings.
- **Slot generation** (`actions/availability.js:190`): walks a day in `duration`-minute increments, skipping slots that overlap existing bookings.

## Gotchas

- The `.env` is committed — contains live database URL and API keys. Do not push this repo publicly.
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env` are **placeholder values** — you must set these from Google Cloud Console before the app can accept logins.
- `supressHydrationWarning={true}` is set on `<body>` (typo: `supress`).
- The `(auth)` route group has a simple centered layout; sign-up redirects to sign-in.
- Events have `isPrivate` (default `true`) — only non-private events appear on `/[username]` public profile pages.
- `useFetch` in `hooks/use-fetch.js` now memoizes `fn` with `useCallback` — server actions are passed as stable references so the effect dependency is safe.
- **Hobby plan (60s timeout)**: `triggerProcessing` returns immediately via `after()`. The actual work runs after the response is sent. Client polling catches completion. Long recordings may take minutes on CPU mode — this is expected and by design.
- UploadThing and OpenRouter both require env vars (`UPLOADTHING_TOKEN`, `OPENAI_API_KEY`, `OPENAI_BASE_URL`) — set in `.env`.
- **UploadThing URL paths do not include file extensions** (e.g., `ufs.sh/f/abc123`). The backend's `generate_unique_name()` falls back to `.mp3` for temp filenames so validation always passes.
- **Backend temporary files** are cleaned up in `finally` blocks even on failure. Backend transcript JSONs in `backend/transcripts/` persist indefinitely as a recovery mechanism.
