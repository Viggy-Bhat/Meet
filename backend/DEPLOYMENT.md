# Deployment Guide — Meet Whisper Server

> ⚠️ **Before you deploy**, complete Phase 0 below. Rotating secrets after deployment is painful.

---

## Phase 0: Pre-Deployment Security Checklist

Complete these steps **before** deploying to production:

### 0.1 — Rotate All Secrets

Generate **separate** production secrets. Do not reuse your local `.env` values:

```bash
# Generate production-only secrets
BACKEND_API_KEY=$(openssl rand -hex 32)
echo "BACKEND_API_KEY=$BACKEND_API_KEY"

BETTER_AUTH_SECRET=$(openssl rand -base64 32)
echo "BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET"
```

Set these in your production environment (VPS `.env` / Docker env / Vercel env vars), never in the repo.

### 0.2 — Create a Production Database

Provision a separate Neon (or equivalent) PostgreSQL database — do not share the dev database.

### 0.3 — Set Up Production OAuth Credentials

Create new Google OAuth credentials in [Google Cloud Console](https://console.cloud.google.com) with your production domain as the authorized origin/redirect URI.

### 0.4 — Set Production UploadThing Token

Generate a new UploadThing token for your production domain in the [UploadThing dashboard](https://uploadthing.com).

### 0.5 — Verify Backend Auth Configuration

Ensure these env vars are set on the production server:

| Variable | Value |
|----------|-------|
| `BACKEND_API_KEY` | Production key (from 0.1) |
| `REQUIRE_AUTH_ON_LOCALHOST` | `true` |
| `CORS_ORIGINS` | `https://your-frontend-domain.com` |
| `ALLOWED_URL_DOMAINS` | `utfs.io,ufs.sh,uploadthing.com` |

### 0.6 — Enable Production-Grade Rate Limiting

In production with multiple containers, switch from in-memory to Redis-backed rate limiting:

```bash
# Add to docker-compose.yml as a service:
#   redis:
#     image: redis:7-alpine
#     restart: unless-stopped

# Set on the whisper service:
RATE_LIMIT_STORAGE=redis://redis:6379/0
```

### 0.7 — Audit CSP for Production

The frontend CSP in `next.config.mjs` sends violations to `/api/csp-report` when configured. Verify all `connect-src` and `frame-src` domains match your production services.

---

## Prerequisites

### VPS Requirements

| Mode | vCPU | RAM | Disk | OS |
|------|------|-----|------|-----|
| CPU (default) | 2 | 4 GB | 20 GB SSD | Ubuntu 22.04+ |
| GPU (optional) | 4 | 8 GB | 50 GB SSD | Ubuntu 22.04+ + NVIDIA GPU |

### Domain

- A domain name pointing to your VPS IP (e.g., `whisper.your-domain.com`)

### Software

- Docker & Docker Compose
- Nginx (for reverse proxy)
- Certbot (for TLS)

---

## Step 1: Install Docker & Docker Compose

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker
docker --version
docker compose version
```

## Step 2: Install NGINX & Certbot

```bash
sudo apt-get update
sudo apt-get install -y nginx certbot python3-certbot-nginx
```

## Step 3: Clone & Configure

```bash
git clone https://github.com/your-username/meet.git /opt/meet
cd /opt/meet/backend

cp .env.example .env
nano .env
```

Set the following in `.env`:

```bash
BACKEND_API_KEY=<generate-with: openssl rand -hex 32>
CORS_ORIGINS=https://your-frontend-domain.com
REQUIRE_AUTH_ON_LOCALHOST=true
WHISPER_MODEL=base
```

## Step 4: Start the Container

**CPU Mode (default):**
```bash
docker compose up -d --build
```

**GPU Mode (requires NVIDIA Container Toolkit):**
```bash
# Install NVIDIA Container Toolkit first:
# https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html

docker compose -f docker-compose.gpu.yml up -d --build
```

## Step 5: Verify Container

```bash
# Check status
docker compose ps

# View logs
docker compose logs -f whisper

# Health check
curl http://localhost:8010/health
```

Expected response:
```json
{
  "status": "ok",
  "model": "base",
  "device": "cpu",
  "compute_type": "int8",
  "ffmpeg_available": true,
  "uptime_seconds": 12.3
}
```

## Step 6: Configure NGINX

```bash
# Copy configuration
sudo cp nginx/whisper.conf /etc/nginx/sites-available/whisper

# Edit configuration — replace "whisper.your-domain.com" with your domain
sudo nano /etc/nginx/sites-available/whisper

# Enable site
sudo ln -s /etc/nginx/sites-available/whisper /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload
sudo systemctl reload nginx
```

## Step 7: Obtain TLS Certificate

```bash
sudo certbot --nginx -d whisper.your-domain.com
sudo certbot renew --dry-run
```

## Step 8: Configure Firewall & Brute-Force Protection

### 8a — UFW

```bash
sudo ufw enable
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw status
```

**Do NOT open port 8010** — NGINX proxies to it locally.

### 8b — Fail2ban (Brute-Force Protection)

Install and configure fail2ban to block IPs that repeatedly hit auth-protected endpoints with invalid keys:

```bash
sudo apt-get install -y fail2ban

# Create a jail for the Whisper API
sudo tee /etc/fail2ban/jail.d/whisper-backend.conf << 'EOF'
[whisper-backend]
enabled = true
port = http,https
filter = whisper-backend
logpath = /var/log/nginx/whisper_access.log
maxretry = 10
findtime = 300
bantime = 3600
EOF

# Create the filter
sudo tee /etc/fail2ban/filter.d/whisper-backend.conf << 'EOF'
[Definition]
failregex = ^<HOST> .* "POST /transcribe" (401|429)
            ^<HOST> .* "POST /transcribe-from-url" (401|429)
            ^<HOST> .* "POST /upload" (401|429)
ignoreregex =
EOF

sudo systemctl restart fail2ban
sudo fail2ban-client status whisper-backend
```

## Step 9: Update Frontend

On Vercel, set these environment variables:

```
WHISPER_SERVER_URL=https://whisper.your-domain.com
BACKEND_API_KEY=<same-key-from-step-3>
```

## Step 10: Test End-to-End

```bash
# Test from your local machine
curl -X POST https://whisper.your-domain.com/transcribe-from-url \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"file_url": "https://example.com/test.mp3"}'
```

---

## Maintenance

### View Logs

```bash
docker compose logs -f whisper
```

### Restart Container

```bash
docker compose restart
```

### Update Container

```bash
git pull
docker compose build --no-cache
docker compose up -d
```

### Backup Transcripts

```bash
docker run --rm \
  -v meet-whisper_whisper-transcripts:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/transcripts-$(date +%Y%m%d).tar.gz /data
```

### Restore Transcripts

```bash
docker run --rm \
  -v meet-whisper_whisper-transcripts:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/transcripts-YYYYMMDD.tar.gz -C /
```

### Clean Up

```bash
# Remove unused Docker resources
docker system prune -f

# Remove old container images
docker image prune -a -f
```

---

## Monitoring

### Health Check

```bash
curl https://whisper.your-domain.com/health
```

### System Resource Monitoring

```bash
docker stats meet-whisper
```

### Log Aggregation

Use `docker compose logs` with `--since` and `--until` flags:

```bash
docker compose logs --since 1h whisper
docker compose logs --tail 100 whisper
```

---

## Troubleshooting

### Container won't start

```bash
# Check logs
docker compose logs whisper

# Check if port is in use
sudo lsof -i :8010

# Verify .env exists and BACKEND_API_KEY is set
cat .env | grep BACKEND_API_KEY
```

### Health check fails

```bash
# Check Whisper model download status
docker compose logs whisper | grep "Loading"

# Verify FFmpeg is available
docker exec meet-whisper ffmpeg -version

# Check disk space
docker exec meet-whisper df -h /app/transcripts
```

### Transcription fails

```bash
# Check SSRF protection logs
docker compose logs whisper | grep "Blocked"

# Verify ALLOWED_URL_DOMAINS is correct
docker exec meet-whisper env | grep ALLOWED_URL_DOMAINS

# Test manual transcription
curl -X POST http://localhost:8010/transcribe-from-url \
  -H "X-API-Key: your-key" \
  -H "Content-Type: application/json" \
  -d '{"file_url": "https://ufs.sh/f/abc123"}'
```

### Rate limited (429 errors)

```bash
# Check current rate limits
docker exec meet-whisper env | grep RATE_LIMIT

# Increase limits in .env and restart
# RATE_LIMIT_TRANSCRIBE=10/minute
docker compose restart
```

---

## Rollback Plan

### Revert to Manual Python Setup

If Docker fails, fall back to direct Python execution:

```bash
cd /opt/meet/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8010
```

NGINX configuration does not need changes — it proxies to the same port.

### Revert to Previous Docker Image

```bash
# List available images
docker images meet-whisper

# Tag previous version as current
docker tag meet-whisper:<old-tag> meet-whisper:latest

# Restart with previous image
docker compose up -d
```
