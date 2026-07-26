# --- Stage 1: Build frontend ---
FROM node:22-alpine@sha256:968df39aedcea65eeb078fb336ed7191baf48f972b4479711397108be0966920 AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# --- Stage 2: Python backend + serve static frontend ---
FROM python:3.11-alpine@sha256:25976e9d34a0fab1f278cae931f34c8303d97bf0c0d7f85b6b4dcf641d7702a4 AS production
WORKDIR /app

# Python package metadata and source
COPY README.md pyproject.toml requirements.txt container-constraints.txt ./
COPY src/ ./src/
RUN test -f src/nexural_research/academy/content/curriculum.yaml
RUN apk add --no-cache libgomp openblas \
    && apk add --no-cache --virtual .build-deps build-base gfortran openblas-dev \
    && pip install --no-cache-dir --upgrade pip setuptools wheel jaraco.context \
    && pip install --no-cache-dir --constraint container-constraints.txt . \
    && apk del .build-deps
RUN python -c "from nexural_research.academy.catalog import CurriculumCatalog, default_academy_root; catalog = CurriculumCatalog.load(default_academy_root()); assert catalog.lessons and catalog.capstones"

# Copy built frontend
COPY --from=frontend-build /app/frontend/dist ./static/

# Data directories
RUN addgroup -S nexural \
    && adduser -S -G nexural -h /app -s /sbin/nologin nexural \
    && mkdir -p data/exports data/processed reports experiments \
    && chown -R nexural:nexural data reports experiments

USER nexural

# Keep runtime path resolution anchored to /app for static assets and writable state.
ENV PYTHONPATH=/app/src

# Expose API port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')"

# Run the server
CMD ["python", "-m", "uvicorn", "nexural_research.api.app:app", "--host", "0.0.0.0", "--port", "8000"]
