#!/usr/bin/env bash
set -e

echo ""
echo "  ╔══════════════════════════════════════════════════╗"
echo "  ║          NEXURAL RESEARCH INSTALLER              ║"
echo "  ║   Institutional-Grade Strategy Analysis Engine   ║"
echo "  ╚══════════════════════════════════════════════════╝"
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Check Python
echo "[1/5] Checking Python..."
if ! command -v python3 &>/dev/null; then
    echo "  ERROR: Python 3.11+ is required."
    echo "  Install: brew install python  (macOS) or apt install python3 (Linux)"
    exit 1
fi
python3 --version
echo ""

# Check Node.js
echo "[2/5] Checking Node.js..."
if ! command -v node &>/dev/null; then
    echo "  WARNING: Node.js not found. Frontend build will be skipped."
else
    node --version
fi
echo ""

# Python venv
echo "[3/5] Setting up Python environment..."
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
fi
source .venv/bin/activate
pip install --quiet --upgrade pip
pip install --quiet -e ".[dev]"
echo "  Python environment ready."
echo ""

# Build frontend
echo "[4/5] Building frontend..."
if [ -f "frontend/package.json" ]; then
    cd frontend
    if [ ! -d "node_modules" ]; then
        npm install --silent 2>/dev/null
    fi
    npx vite build 2>/dev/null
    cd ..
    echo "  Frontend built."
fi
echo ""

# Create desktop launcher
echo "[5/5] Creating launcher..."
cat > "$SCRIPT_DIR/nexural-research" << 'LAUNCHER'
#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"
source .venv/bin/activate
python -c "from nexural_research.api.app import launch; launch()"
LAUNCHER
chmod +x "$SCRIPT_DIR/nexural-research"

# macOS: create .app bundle
if [[ "$OSTYPE" == "darwin"* ]]; then
    APP_DIR="$HOME/Applications/Nexural Research.app/Contents/MacOS"
    mkdir -p "$APP_DIR"
    cp "$SCRIPT_DIR/nexural-research" "$APP_DIR/Nexural Research"
    echo "  macOS app created in ~/Applications/"
fi

# Linux: create .desktop file
if [[ "$OSTYPE" == "linux"* ]]; then
    DESKTOP_FILE="$HOME/.local/share/applications/nexural-research.desktop"
    mkdir -p "$(dirname "$DESKTOP_FILE")"
    cat > "$DESKTOP_FILE" << EOF
[Desktop Entry]
Name=Nexural Research
Comment=Institutional-Grade Strategy Analysis Engine
Exec=$SCRIPT_DIR/nexural-research
Type=Application
Categories=Finance;Science;
Terminal=false
EOF
    echo "  Linux desktop entry created."
fi

echo ""
echo "  ╔══════════════════════════════════════════════════╗"
echo "  ║          INSTALLATION COMPLETE!                  ║"
echo "  ║                                                  ║"
echo "  ║   Launch:  ./nexural-research                    ║"
echo "  ╚══════════════════════════════════════════════════╝"
echo ""
