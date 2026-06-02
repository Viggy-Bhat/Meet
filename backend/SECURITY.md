# Security Documentation — Meet Whisper Server

## Security Architecture

The Whisper backend implements defense-in-depth with multiple security layers:

### 1. Authentication (Fail-Closed)

- API key authentication via `X-API-Key` header required on all endpoints
- Server refuses to start if `BACKEND_API_KEY` is not configured
- No localhost bypass in production (`REQUIRE_AUTH_ON_LOCALHOST=true`)

### 2. SSRF Protection

All URLs submitted to `/transcribe-from-url` are validated before download:

- **DNS resolution**: Hostname is resolved to IP addresses (A + AAAA records)
- **IP blocklisting**: Blocks private, loopback, link-local, multicast, and reserved IP ranges
- **IPv6 bypass prevention**: Blocks IPv4-mapped IPv6, Teredo, and 6to4 addresses
- **Domain allowlisting**: Optional `ALLOWED_URL_DOMAINS` restricts downloads to trusted domains
- **No redirect following**: `follow_redirects=False` prevents redirect-based bypass
- **Size limits**: Content-Length pre-check + streaming byte counter (aborts if > 520MB)
- **Retry with cleanup**: 3 retry attempts, partial downloads cleaned up

### 3. Rate Limiting

- Transcription endpoints (`/transcribe`, `/transcribe-from-url`): 5 requests per minute
- Upload endpoint (`/upload`): 10 requests per minute
- Global default: 100 requests per minute
- Configurable via `RATE_LIMIT_TRANSCRIBE` and `RATE_LIMIT_UPLOAD` env vars

### 4. CORS

- Restrictive CORS policy: configured via `CORS_ORIGINS` env var
- Production: only the Next.js frontend domain
- Development: `http://localhost:3005`
- Credentialed requests supported

### 5. File Validation

- Extension allowlist: only audio/video formats
- Maximum upload size: 500MB (configurable)
- Downloaded files validated before transcription
- Temporary files cleaned up after processing (even on failure)

### 6. Container Security

- Runs as non-root user (`whisper`, UID 1000)
- Read-only filesystem where possible
- Resource limits (CPU, memory)
- Docker health checks
- Transcripts persisted in volumes (not container filesystem)
- Temporary uploads in tmpfs (auto-cleaned, fast I/O)

### 7. Transport Security

- Nginx reverse proxy with TLS 1.2+ only
- HSTS with `includeSubDomains`
- Security headers: X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- No Nginx version disclosure
- OCSP stapling

## Threat Model

| Threat | Mitigation |
|--------|------------|
| Unauthorized access | Fail-closed API key auth |
| SSRF to internal services | DNS resolution + IP blocklisting + no redirects |
| Denial of Service | Rate limiting, resource limits, size limits |
| Data exfiltration | Domain allowlisting, no redirect following |
| Cross-origin attacks | Restrictive CORS, security headers |
| Supply chain attacks | Pinned Docker base images, pip hash verification |
| Container escape | Non-root user, resource limits, minimal attack surface |
| Credential theft | API keys only in env vars, never committed |

## Environment Variables Reference

| Variable | Default | Purpose |
|----------|---------|---------|
| `BACKEND_API_KEY` | *(required)* | API key for authentication |
| `REQUIRE_AUTH_ON_LOCALHOST` | `false` | Always require auth, even for localhost |
| `CORS_ORIGINS` | `http://localhost:3005` | Allowed CORS origins (comma-separated) |
| `ALLOWED_URL_DOMAINS` | *(none)* | Allowed download domains (comma-separated) |
| `MAX_DOWNLOAD_SIZE_MB` | `520` | Max file size for URL downloads |
| `RATE_LIMIT_TRANSCRIBE` | `5/minute` | Rate limit for transcription endpoints |
| `RATE_LIMIT_UPLOAD` | `10/minute` | Rate limit for upload endpoint |
