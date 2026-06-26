# Meet

AI-powered meeting scheduling app. Create events, share your booking link, and let others schedule time with you. Google Meet links are generated automatically. After meetings, upload recordings and get AI-generated transcripts and summaries — all running locally.

## Features

- **Event types** with custom durations and privacy settings
- **Weekly availability** management with time gaps
- **Public booking profiles** at `/{username}`
- **Google Calendar & Meet integration** via Google OAuth
- **AI meeting summaries** — upload recordings, get transcripts and structured summaries
- **Local transcription** using faster-whisper (no cloud dependency)
- **PDF export** of meeting summaries and transcripts
- **Background processing** with status polling and retry support

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 App Router, React 19, Tailwind CSS v4, Shadcn UI |
| Auth | Better Auth (Google OAuth only) |
| Database | PostgreSQL (Neon) via Prisma ORM |
| File Uploads | UploadThing (500MB audio/video) |
| Transcription | Python FastAPI + faster-whisper (CTranslate2) |
| Summarization | GPT-4o-mini via OpenRouter |
| PDF Export | @react-pdf/renderer |

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.10+ (for Whisper backend)
- PostgreSQL database (Neon recommended)
- FFmpeg (bundled in `backend/tools/ffmpeg/`)

### 1. Clone & Install

```bash
git clone <repo>
cd meet
npm install
```

### 2. Environment Variables

```bash
cp .env.example .env
# Edit .env with your values (see .env.example for all variables)
```

### 3. Database

```bash
npx prisma db push
```

### 4. Start the Whisper Backend

```bash
npm run whisper-server
```

### 5. Start the Frontend

```bash
npm run dev   # http://localhost:3005
```

## Project Structure

```
meet/
├── actions/              # Server actions (use server)
├── app/                  # Next.js App Router
│   ├── (auth)/           # Route group: sign-in, sign-up
│   ├── (main)/           # Route group: dashboard, events, meetings, availability
│   ├── [username]/       # Public profile + booking pages
│   └── api/              # API routes (auth, uploadthing, pdf)
├── backend/              # Python Whisper server (see backend/README.md)
├── components/           # React components
│   ├── meeting/          # AI Summary pipeline components
│   └── ui/               # Shadcn UI primitives
├── docs/                 # Supplemental documentation
├── hooks/                # React hooks (use-fetch)
├── lib/                  # Core libraries
│   ├── ai/               # Whisper client + summarizer
│   └── generated/        # Prisma client (gitignored)
├── prisma/               # Schema + migrations
│   └── migrations/       # DB migration history
└── public/               # Static assets
```

## Environment Variables

See `.env.example` for the full list. Key variables:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `UPLOADTHING_TOKEN` | Yes | UploadThing API token |
| `OPENAI_API_KEY` | Yes | OpenRouter API key |
| `OPENAI_BASE_URL` | Yes | `https://openrouter.ai/api/v1` |
| `BETTER_AUTH_SECRET` | Yes | Random secret for session signing |
| `GOOGLE_CLIENT_ID` | Yes | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Yes | From Google Cloud Console |
| `BACKEND_API_KEY` | No | API key for Whisper backend auth |

## Documentation

- **[Architecture](docs/architecture.md)** — Auth flow, booking flow, AI pipeline, DB schema
- **[Conventions](docs/conventions.md)** — Code patterns, gotchas, key files reference
- **[Troubleshooting](docs/troubleshooting.md)** — Common issues and fixes
- **[Implementation History](docs/implementation-history.md)** — Phase-by-phase development log
- **[Backend README](backend/README.md)** — Python Whisper server docs
- **[Backend Deployment](backend/DEPLOYMENT.md)** — Whisper server deployment guide (Docker, nginx)
- **[Backend Security](backend/SECURITY.md)** — Security architecture and threat model
- **[Full-Stack Deployment](deployment.md)** — Deploy frontend + backend to production

## Deployment

See [deployment.md](deployment.md) for full-stack deployment to Vercel + VPS.

## Commands

```bash
npm run dev            # next dev (port 3005)
npm run build          # next build
npm run start          # next start (production)
npm run lint           # eslint
npm run whisper-server # starts Python backend
```

## License

MIT
