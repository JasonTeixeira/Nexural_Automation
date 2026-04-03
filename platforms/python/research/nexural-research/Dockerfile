# --- Stage 1: Build frontend ---
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# --- Stage 2: Python backend + serve static frontend ---
FROM python:3.11-slim AS production
WORKDIR /app

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Python dependencies
COPY pyproject.toml requirements.txt ./
RUN pip install --no-cache-dir -e . 2>/dev/null || pip install --no-cache-dir .

# Copy source
COPY src/ ./src/

# Copy built frontend
COPY --from=frontend-build /app/frontend/dist ./static/

# Data directories
RUN mkdir -p data/exports data/processed reports experiments

# Expose API port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')"

# Run the server
CMD ["python", "-m", "uvicorn", "nexural_research.api.app:app", "--host", "0.0.0.0", "--port", "8000"]
