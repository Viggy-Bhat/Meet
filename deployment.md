# Deployment Guide

This guide covers deploying the full Meet stack:

- **Frontend**: Next.js app on Vercel
- **Backend**: Python Whisper service on a VPS (or Docker host)
- **Database**: PostgreSQL via Neon
- **File Uploads**: UploadThing (cloud)
- **AI Summaries**: OpenRouter (cloud)

## Architecture

```
User → Vercel (Next.js) ────┬── Neon (PostgreSQL)
                             ├── UploadThing (file storage)
                             ├── OpenRouter (AI summaries)
                             └── VPS ─── Docker ─── Whisper (faster-whisper)
```

The Whisper backend runs **locally on a VPS** — no cloud transcription dependency.

---

## 1. Database — Neon

1. Sign up at [neon.tech](https://neon.tech)
2. Create a project and copy the connection string
3. Set `DATABASE_URL` in your frontend env vars

---

## 2. File Uploads — UploadThing

1. Sign up at [uploadthing.com](https://uploadthing.com)
2. Create an app and copy the API token
3. Set `UPLOADTHING_TOKEN` in your frontend env vars

---

## 3. AI Summaries — OpenRouter

1. Sign up at [openrouter.ai](https://openrouter.ai)
2. Create an API key
3. Set `OPENAI_API_KEY` and `OPENAI_BASE_URL` in your frontend env vars

---

## 4. Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create an OAuth 2.0 Client ID (Web application)
3. Add redirect URI: `https://your-domain.com/api/auth/callback/google`
4. Copy the Client ID and Secret
5. Enable the Google Calendar API

---

## 5. Frontend — Vercel

### Prerequisites

- Push your repo to GitHub/GitLab
- Ensure `proxy.js` is at the root (Next.js 16 middleware convention)

### Deploy

1. Import your repo in [vercel.com](https://vercel.com)
2. Set framework preset: **Next.js**
3. Add these environment variables:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Your Neon connection string |
| `UPLOADTHING_TOKEN` | Your UploadThing token |
| `OPENAI_API_KEY` | Your OpenRouter API key |
| `OPENAI_BASE_URL` | `https://openrouter.ai/api/v1` |
| `BETTER_AUTH_SECRET` | `openssl rand -hex 32` output |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | `https://your-domain.com` |
| `NEXT_PUBLIC_APP_URL` | `https://your-domain.com` |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |
| `WHISPER_SERVER_URL` | `https://whisper.your-domain.com` |
| `BACKEND_API_KEY` | Shared key (same on backend) |
| `PRISMA_GENERATE_DATAPROXY` | optional |

4. Deploy — Vercel will run `postinstall` (which generates Prisma client) and `next build`
5. Run migrations: `npx prisma migrate deploy`

---

## 6. Backend Whisper Service — VPS

### Requirements

| Mode | vCPU | RAM | Disk |
|---|---|---|---|
| CPU (default) | 2 | 4 GB | 20 GB SSD |
| GPU (optional) | 4 | 8 GB + NVIDIA GPU | 50 GB SSD |

### Docker Setup

```bash
# SSH into your VPS
git clone <repo> /opt/meet
cd /opt/meet/backend

cp .env.example .env
# Edit .env:
#   BACKEND_API_KEY=<shared-key-matching-frontend>
#   CORS_ORIGINS=https://your-domain.com
#   ALLOWED_URL_DOMAINS=utfs.io,ufs.sh,uploadthing.com

docker compose up -d --build
```

### nginx + TLS

See [backend/DEPLOYMENT.md](backend/DEPLOYMENT.md) for detailed nginx configuration, Certbot setup, and firewall rules.

Quick summary:

```bash
# Install nginx + certbot
sudo apt install nginx certbot python3-certbot-nginx

# Copy nginx config
sudo cp backend/nginx/whisper.conf /etc/nginx/sites-available/whisper
# Edit domain name, then:
sudo ln -s /etc/nginx/sites-available/whisper /etc/nginx/sites-enabled/

# Get TLS certificate
sudo certbot --nginx -d whisper.your-domain.com
```

### Verify

```bash
curl https://whisper.your-domain.com/health
# Expected: {"status":"ok","model":"base","device":"cpu","compute_type":"int8",...}
```

---

## 7. Post-Deployment Verification

1. Visit `https://your-domain.com` — landing page loads
2. Sign in with Google — redirects to `/dashboard`
3. Create an event — appears in events list
4. Open a private window, visit `https://your-domain.com/your-username` — public profile shows
5. Book a meeting — Google Calendar event + Meet link created
6. Upload a recording to a past meeting — transcription + summary generates

---

## Maintenance

### Frontend

- Vercel auto-deploys on push to `main`
- Run `npx prisma migrate deploy` after schema changes

### Backend

```bash
cd /opt/meet/backend
docker compose logs -f whisper   # View logs
docker compose restart            # Restart
git pull && docker compose up -d --build  # Update
```

### Database Backups

Neon handles automated backups. For manual backup:

```bash
pg_dump "$DATABASE_URL" > meet-backup-$(date +%Y%m%d).sql
```

---

## Rollback

### Frontend

Use Vercel's instant rollback to a previous deployment.

### Backend

```bash
cd /opt/meet/backend
git checkout <previous-tag>
docker compose up -d --build
```

### Database

Use Neon's point-in-time recovery or restore from a `pg_dump`.
