# Meet

AI-powered meeting scheduling app. Create events, share your booking link, and let others schedule time with you. Google Meet links are generated automatically. After meetings, upload recordings and get AI-generated transcripts and summaries — all running locally.

## Features

- **Event types** — Custom durations, descriptions, and privacy settings
- **Weekly availability** — Define working hours with configurable time gaps between bookings
- **Public booking pages** — Share your profile at `/{username}` for anyone to book
- **Google Calendar & Meet** — Auto-syncs events and generates Meet links via Google OAuth
- **AI meeting summaries** — Upload recordings, get transcripts + structured summaries (GPT-4o-mini)
- **Local transcription** — Runs on your machine via faster-whisper (no cloud dependency)
- **PDF export** — Download meeting summaries with full transcripts
- **Background processing** — Long transcriptions run after the response is sent; client polls for completion

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16 (App Router), React 19, Tailwind CSS v4, Shadcn UI |
| **Auth** | better-auth (Google OAuth only) |
| **Database** | PostgreSQL via Prisma ORM (Neon recommended) |
| **File Uploads** | UploadThing (500MB max for audio/video) |
| **Transcription** | Python FastAPI + faster-whisper (runs locally) |
| **Summarization** | GPT-4o-mini via OpenRouter |
| **PDF Export** | @react-pdf/renderer |

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 18+ | |
| Python | 3.10+ | Only needed for the Whisper backend |
| PostgreSQL | Any | Neon (serverless) recommended — free tier works |
| FFmpeg | Any | Auto-bundled for Windows; install via `apt`/`brew` on Linux/Mac |

You also need API keys from:
- **Google Cloud Console** — OAuth 2.0 Client ID (for Google login + Calendar API)
- **UploadThing** — File upload token
- **OpenRouter** — API key for GPT-4o-mini summarization

## Quick Start

### 1. Clone & install

```bash
git clone https://github.com/your-username/meet.git
cd meet
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` with your values. At minimum you need:

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` | Your PostgreSQL connection string (Neon dashboard) |
| `GOOGLE_CLIENT_ID` | Google Cloud Console → APIs & Services → Credentials |
| `GOOGLE_CLIENT_SECRET` | Same as above |
| `BETTER_AUTH_SECRET` | Run `openssl rand -base64 32` |
| `UPLOADTHING_TOKEN` | UploadThing dashboard |
| `OPENAI_API_KEY` | OpenRouter dashboard |
| `BACKEND_API_KEY` | Run `openssl rand -hex 32` |

### 3. Set up the database

```bash
npx prisma db push
```

### 4. Start the Whisper backend

In a **separate terminal**:

```bash
# First time: create Python virtual environment
cd backend
python -m venv venv

# Activate it
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# Windows (Git Bash):
source venv/Scripts/activate
# macOS / Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the server
python -m uvicorn app.main:app --host 0.0.0.0 --port 8010

# Or from the project root:
npm run whisper-server
```

### 5. Start the frontend

```bash
# From the project root
npm run dev
```

Open **http://localhost:3005** in your browser.

### 6. Verify the backend

```bash
curl http://localhost:8010/health
```

Expected response:
```json
{ "status": "ok", "model": "base", "device": "cpu", ... }
```

## Project Structure

```
meet/
├── actions/              # Server actions — all DB mutation logic
├── app/                  # Next.js App Router pages
│   ├── (auth)/           # Sign-in / sign-up
│   ├── (main)/           # Dashboard, events, meetings, availability
│   ├── [username]/       # Public profile + booking pages
│   └── api/              # API routes (auth, UploadThing, PDF)
├── backend/              # Python Whisper transcription server
│   ├── app/              # FastAPI app
│   └── nginx/            # Production Nginx config
├── components/           # React components
│   ├── meeting/          # AI summary pipeline UI
│   └── ui/               # Shadcn UI primitives
├── hooks/                # Custom React hooks
├── lib/                  # Core libraries
│   ├── ai/               # Whisper client + OpenRouter summarizer
│   └── generated/        # Prisma client (auto-generated, gitignored)
├── prisma/               # Schema + migrations
└── public/               # Static assets (images, icons)
```

## Available Commands

| Command | Description |
|---|---|
| `npm run dev` | Start Next.js dev server on port 3005 |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run whisper-server` | Start Python Whisper backend (port 8010) |

## How AI Summaries Work

1. **Upload** — After a meeting, upload the recording (MP3/WAV/MP4/M4A, up to 500MB) via UploadThing
2. **Transcribe** — The backend downloads the file and runs **faster-whisper** locally (no data leaves your server)
3. **Summarize** — The transcript is sent to **GPT-4o-mini** via OpenRouter, which returns:
   - Summary (2-4 sentence overview)
   - Key points
   - Action items
   - Follow-up topics
4. **View & export** — The results appear in the meeting UI. Download as PDF with full transcript.

All processing state is visible in the UI. If transcription fails, a retry button appears.

## Deployment

### Frontend (Vercel)

```bash
npx vercel --prod
```

Set all `.env` variables in the Vercel dashboard.

### Backend (VPS)

See [backend/DEPLOYMENT.md](backend/DEPLOYMENT.md) for Docker + Nginx deployment with TLS.

## Documentation

- [Backend README](backend/README.md) — Whisper server setup and API reference
- [Backend Deployment](backend/DEPLOYMENT.md) — Production deployment with Docker + Nginx
- [Backend Security](backend/SECURITY.md) — Security architecture and threat model
- [Architecture](docs/architecture.md) — Auth flow, booking flow, AI pipeline
- [Code Conventions](docs/conventions.md) — Patterns, gotchas, and key files
- [Troubleshooting](docs/troubleshooting.md) — Common issues

## License

MIT
