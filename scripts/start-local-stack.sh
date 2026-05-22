#!/usr/bin/env bash
set -euo pipefail

API_PORT="${API_PORT:-8000}"
MCP_PORT="${MCP_PORT:-8765}"
FRONTEND_PORT="${FRONTEND_PORT:-3010}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RESEARCH_ROOT="$REPO_ROOT/platforms/python/research/nexural-research"
FRONTEND_ROOT="$RESEARCH_ROOT/frontend"

if [[ "${SKIP_INSTALL:-false}" != "true" ]]; then
  cd "$RESEARCH_ROOT"
  SETUPTOOLS_USE_DISTUTILS=stdlib python3.11 -m pip install -e ".[dev,mcp]"
  cd "$FRONTEND_ROOT"
  npm ci
fi

cd "$RESEARCH_ROOT"
SETUPTOOLS_USE_DISTUTILS=stdlib python3.11 -m nexural_research.cli serve --host 127.0.0.1 --port "$API_PORT" &
API_PID=$!

SETUPTOOLS_USE_DISTUTILS=stdlib python3.11 -m nexural_research.cli mcp --transport streamable-http --host 127.0.0.1 --port "$MCP_PORT" &
MCP_PID=$!

cd "$FRONTEND_ROOT"
npm run dev -- --host 127.0.0.1 --port "$FRONTEND_PORT" &
FRONTEND_PID=$!

echo "Nexural local stack started:"
echo "  API:      http://127.0.0.1:$API_PORT"
echo "  MCP HTTP: http://127.0.0.1:$MCP_PORT/mcp"
echo "  UI:       http://127.0.0.1:$FRONTEND_PORT"
echo "Press Ctrl+C to stop."

trap 'kill "$API_PID" "$MCP_PID" "$FRONTEND_PID" 2>/dev/null || true' INT TERM EXIT
wait
