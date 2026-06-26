# Stage 1: Build Python dependencies
FROM python:3.11-slim AS builder

WORKDIR /build
COPY requirements.txt .

RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir --prefix=/install -r requirements.txt


# Stage 2: Runtime
FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd -r whisper && useradd -r -g whisper -u 1000 -m whisper

COPY --from=builder /install /usr/local

WORKDIR /app
COPY app/ ./app/

RUN mkdir -p /app/transcripts /tmp/uploads \
    && chown -R whisper:whisper /app /tmp/uploads

USER whisper

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    SERVER_HOST=0.0.0.0 \
    SERVER_PORT=8010 \
    TRANSCRIPTS_DIR=/app/transcripts \
    TEMP_DIR=/tmp/uploads \
    LOG_FORMAT=json

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import httpx, os; p = os.getenv('PORT', '8010'); httpx.get(f'http://localhost:{p}/health').raise_for_status()" || exit 1

EXPOSE 8010

CMD python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8010}
