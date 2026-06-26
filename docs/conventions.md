# Conventions & Gotchas

## Language & Build

- **JavaScript only** — no TypeScript. `@/*` maps to `./*` via `jsconfig.json`.
- **React Compiler enabled** in `next.config.mjs`.
- **Tailwind CSS v4** via `@tailwindcss/postcss` — no `tailwind.config.js`.
- **Zod v4** for validation (not v3).

## Server / Client Split

- **Server Components** (`async` functions, no `"use client"`) call server actions directly.
- **Client Components** use the `useFetch` hook from `hooks/use-fetch.js` to wrap server actions with loading/error state.
- All `(main)` pages use `export const dynamic = "force-dynamic"` — they are never statically rendered.

## Auth & Middleware

- `proxy.js` (Next.js 16 convention, not `middleware.js`) protects routes.
- `checkUser()` in `lib/checkUser.js` is called from the Header server component on every page — it auto-creates/returns the DB user from the better-auth session.
- All server actions enforce auth via `auth.api.getSession()` from `@/lib/auth`.

## Component Patterns

- **Create Event flow**: "Create Event" button navigates to `/events?create=true` → `CreateEventDrawer` reads the search param and opens a vaul drawer with `EventForm`.
- **`useFetch`** in `hooks/use-fetch.js` memoizes `fn` with `useCallback` — server actions are passed as stable references so the effect dependency is safe.
- **`supressHydrationWarning`** — intentional typo in root layout.

## Gotchas

- `.env` is committed — contains live database URL and API keys. Do not push this repo publicly.
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env` are **placeholder values** — you must set these from Google Cloud Console before the app can accept logins.
- Events have `isPrivate` (default `true`) — only non-private events appear on `/[username]` public profile pages.
- **Hobby plan (60s timeout)**: `triggerProcessing` returns immediately via `after()`. The actual work runs after the response is sent. Client polling catches completion.
- UploadThing URL paths do not include file extensions (e.g., `ufs.sh/f/abc123`). The backend's `generate_unique_name()` falls back to `.mp3` for temp filenames.
- Backend defaults are safe CPU-only: `WHISPER_DEVICE=cpu`, `WHISPER_COMPUTE_TYPE=int8`. CUDA is optional.
- Backend download has 3 retries with 2s delay. Logs progress every 50MB.
- Retry limit — `retryCount` maxes at 3. After that, `triggerProcessing` throws.
- Transcript persistence — backend saves transcript JSON to `backend/transcripts/` as a recovery mechanism even if DB write fails.

## Actions Reference

| File | Functions | Purpose |
|---|---|---|
| `events.js` | `createEvent`, `getUserEvents`, `deleteEvent`, `getEventDetails` | CRUD for event types |
| `bookings.js` | `createBooking` | Create booking + Google Calendar event + Meet link |
| `availability.js` | `getUserAvailability`, `updateAvailability`, `getEventAvailability` | Weekly availability + slot generation |
| `users.js` | `updateUsername`, `getUserByUsername` | Username management, public profile |
| `meetings.js` | `getUserMeetings`, `cancelMeeting` | List/cancel meetings (deletes Google Calendar event) |
| `dashboard.js` | `getLatestUpdates` | Next 3 upcoming meetings |
| `ai-summary.js` | `createRecording`, `triggerProcessing`, `processRecording`, `getRecording` | Recording lifecycle + AI orchestration |
| `generate-pdf.js` | `getMeetingPdfData` | Fetches booking + recording data for PDF generation |

## Key Files

| File | Role |
|---|---|
| `lib/auth.js` | Better Auth configuration (Google OAuth, Prisma adapter) |
| `proxy.js` | Better Auth middleware — protects `/dashboard`, `/events`, `/meetings`, `/availability` |
| `lib/prisma.js` | PrismaClient singleton cached on `globalThis` for hot reload survival |
| `lib/checkUser.js` | Auto-creates DB user from Better Auth session on every page load |
| `lib/ai/whisper.js` | Forwards UploadThing URLs to local Whisper backend (`/transcribe-from-url`) |
| `lib/ai/summarize.js` | GPT-4o-mini summarization with Zod v4 validation + retry |
| `lib/uploadthing.js` | UploadThing server router (500MB audio/video) |
| `lib/uploadthing-client.js` | `useUploadThing` hook for client-side uploads |
| `actions/ai-summary.js` | `createRecording`, `triggerProcessing` (after()), `getRecording` |
| `components/meeting/upload-recording.jsx` | File picker + upload + trigger processing + polling |
| `components/meeting/ai-summary-card.jsx` | Summary display with PDF download icon |
| `components/meeting/transcript-viewer.jsx` | Expandable transcript viewer |
| `components/meeting/processing-state.jsx` | Animated processing indicator per status |
| `components/meeting/meeting-recordings.jsx` | Per-meeting recording state machine |
| `components/meeting/meeting-pdf-document.jsx` | @react-pdf Document component |
| `app/api/meetings/[meetingId]/pdf/route.js` | PDF generation endpoint |
| `hooks/use-fetch.js` | Wraps server actions: `{ data, loading, error, fn }` |
