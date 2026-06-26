# Architecture

## Authentication Flow

```
User visits site
  → proxy.js (Better Auth middleware) checks protected routes
  → Root layout renders Header
    → Header calls checkUser()
      → auth.api.getSession() from Better Auth
      → DB lookup by session user id
      → User auto-created on first OAuth sign-in via databaseHooks
```

Better Auth (not Clerk) with Google OAuth only. Email/password disabled. Google OAuth scope includes `https://www.googleapis.com/auth/calendar` for Calendar/Meet integration.

## Event Creation

```
"Create Event" button → /events?create=true
  → CreateEventDrawer reads search param
  → Vaul drawer opens
  → EventForm (title, description, duration, privacy)
  → Zod validation via eventSchema
  → createEvent() server action
    → Auth check → DB insert
  → Drawer closes, URL param removed
```

## Booking Flow

```
Visitor at /[username]/[eventId]
  → Server fetches event + 30-day availability
  → EventDetails + BookingForm rendered
  → Select date (DayPicker) → Select time slot → Fill name/email
  → createBooking() server action
    → Get event creator's Google OAuth token (Better Auth Account table)
    → Create Google Calendar event + Meet conference
    → Store Booking in DB with meetLink + googleEventId
  → Success screen with Meet link
```

Timezone is hardcoded to `Asia/Kolkata` in `actions/bookings.js`.

## AI Summary Pipeline

```
User uploads recording (MP3, WAV, MP4, M4A, max 500MB)
  → UploadThing CDN stores file, returns URL
  → createRecording() → DB: status = UPLOADED
  → triggerProcessing() → kicks off after() background work
    → Status: PROCESSING
    → Next.js calls local Whisper backend (lib/ai/whisper.js)
      → POST /transcribe-from-url with UploadThing URL
      → Backend streams download directly to disk (no proxy through Next.js)
      → Backend validates file + runs faster-whisper transcription
      → Backend persists transcript JSON to disk
      → Returns { text, language, duration, segments }
    → Status: TRANSCRIBING → TRANSCRIBED
    → Next.js generates summary via OpenRouter (GPT-4o-mini)
      → Zod v4 validation (summaryResponseSchema)
      → Retries once on validation failure
    → Status: SUMMARIZING → COMPLETED
  → Client polls getRecording() every 2s for status updates
  → Display: AiSummaryCard + TranscriptViewer + PDF download button
```

### Status Flow

```
UPLOADED → PROCESSING → TRANSCRIBING → TRANSCRIBED → SUMMARIZING → COMPLETED
                              ↓
                           FAILED (if transcription fails)
```

**Important:** If transcription succeeds but summary fails, status stays at `TRANSCRIBED` and the transcript is still accessible. The error is stored in `errorMessage` on the `Recording` model.

## PDF Export

```
User clicks download icon on AiSummaryCard
  → GET /api/meetings/{bookingId}/pdf
  → getMeetingPdfData() fetches booking + latest recording
  → MeetingPdfDocument renders with @react-pdf/renderer
  → Returns application/pdf with Content-Disposition attachment
```

## Slot Generation

```
getEventAvailability(eventId):
  → Get user's availability + existing bookings
  → Walk 30 days from today
  → For each day:
    → Get DayAvailability for that weekday
    → Walk in event.duration increments
    → Skip overlapping booked slots
    → If today: start from now + timeGap
  → Return [{ date, slots }]
```

## AI Summary Polling

```
Client uploads file
  → onClientUploadComplete fires
  → fnCreateRecording({ fileUrl, bookingId })
  → setRecordingId(recording.id)
  → fnTriggerProcessing(recording.id)
  → startPolling(recording.id):
    → Every 2s: getRecording(rid)
    → If status ∈ {COMPLETED, FAILED, TRANSCRIBED}:
      → stop polling, setProcessingRecording(status)
  → Render based on status:
    COMPLETED → AiSummaryCard + TranscriptViewer
    TRANSCRIBED → TranscriptViewer (+ summary if available)
    FAILED → ProcessingState with errorMessage + Retry button
```

## Database Schema

### Models

| Model | Key Fields | Relations |
|---|---|---|
| `User` | id (uuid), email (unique), name?, username (unique), imageUrl?, emailVerified | hasMany Event, hasMany Booking, hasOne Availability, hasMany Account |
| `Event` | id (uuid), title, description?, duration, isPrivate (default true), userId | belongsTo User, hasMany Booking |
| `Booking` | id (uuid), name, email, startTime, endTime, meetLink?, googleEventId?, additionalInfo? | belongsTo Event (cascade), belongsTo User, hasMany Recording |
| `Availability` | id (uuid), userId (unique), timeGap | belongsTo User, hasMany DayAvailability |
| `DayAvailability` | id (uuid), day (DayOfWeek), startTime, endTime | belongsTo Availability (cascade) |
| `Recording` | id (cuid), userId, bookingId?, fileUrl, status (RecordingStatus), duration?, errorMessage?, retryCount (default 0) | belongsTo Booking (set null), hasOne MeetingTranscript, hasOne MeetingSummary |
| `MeetingTranscript` | id (cuid), transcript, language?, segments (Json?) | belongsTo Recording (cascade) |
| `MeetingSummary` | id (cuid), summary, actionItems (Json), keyPoints (Json), followUps (Json?) | belongsTo Recording (cascade) |
| `Account` | id (cuid), userId, accountId, providerId, accessToken?, refreshToken?, idToken?, scope? | belongsTo User (cascade) |
| `Session` | id (cuid), userId, token (unique), expiresAt, ipAddress?, userAgent? | belongsTo User (cascade) |

### Enums

- **DayOfWeek**: `SUNDAY` | `MONDAY` | `TUESDAY` | `WEDNESDAY` | `THURSDAY` | `FRIDAY` | `SATURDAY`
- **RecordingStatus**: `UPLOADED` | `PROCESSING` | `TRANSCRIBING` | `TRANSCRIBED` | `SUMMARIZING` | `COMPLETED` | `FAILED`
