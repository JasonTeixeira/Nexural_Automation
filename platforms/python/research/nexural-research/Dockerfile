# --- Stage 1: Build frontend ---
FROM node:22-alpine@sha256:968df39aedcea65eeb078fb336ed7191baf48f972b4479711397108be0966920 AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# --- Stage 2: Python backend + serve static frontend ---
FROM python:3.11-slim@sha256:db3ff2e1800a8581e2c48a27c3995339d47bdf046da21c7627accd3d51053a93 AS production
WORKDIR /app

# Python package metadata and source
COPY README.md pyproject.toml requirements.txt ./
COPY src/ ./src/
RUN test -f src/nexural_research/academy/content/curriculum.yaml
RUN pip install --no-cache-dir --upgrade pip setuptools wheel jaraco.context
RUN pip install --no-cache-dir .
RUN python -c "from nexural_research.academy.catalog import CurriculumCatalog, default_academy_root; catalog = CurriculumCatalog.load(default_academy_root()); assert catalog.lessons and catalog.capstones"

# Copy built frontend
COPY --from=frontend-build /app/frontend/dist ./static/

# Data directories
RUN groupadd --system nexural \
    && useradd --system --gid nexural --home-dir /app --shell /usr/sbin/nologin nexural \
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
