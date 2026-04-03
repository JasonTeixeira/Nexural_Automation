@echo off
title Nexural Research — Installer
color 0B

echo.
echo  ╔══════════════════════════════════════════════════╗
echo  ║          NEXURAL RESEARCH INSTALLER              ║
echo  ║   Institutional-Grade Strategy Analysis Engine   ║
echo  ╚══════════════════════════════════════════════════╝
echo.

:: Check Python
echo [1/5] Checking Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo  ERROR: Python 3.11+ is required but not found.
    echo  Download from: https://www.python.org/downloads/
    echo  Make sure to check "Add Python to PATH" during install.
    pause
    exit /b 1
)
python --version
echo.

:: Check Node.js (for frontend build)
echo [2/5] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo  WARNING: Node.js not found. Frontend build will be skipped.
    echo  The pre-built frontend will be used if available.
    echo  Download Node.js from: https://nodejs.org/
) else (
    node --version
)
echo.

:: Create venv in a SHORT path to avoid Windows long-path issues
echo [3/5] Setting up Python environment...
set VENV_DIR=C:\nexural_env

if not exist "%VENV_DIR%\.venv" (
    echo  Creating virtual environment at %VENV_DIR%...
    python -m venv "%VENV_DIR%\.venv"
)
call "%VENV_DIR%\.venv\Scripts\activate.bat"

pip install --quiet --upgrade pip
echo  Installing dependencies (this may take a minute)...
pip install --quiet --no-cache-dir numpy pandas scipy scikit-learn statsmodels
pip install --quiet --no-cache-dir fastapi "uvicorn[standard]" python-multipart httpx
pip install --quiet --no-cache-dir plotly duckdb pyarrow pydantic pyyaml rich
pip install --quiet --no-deps -e "%~dp0."
echo  Python environment ready.
echo  Installed to: %VENV_DIR%
echo.

:: Build frontend
echo [4/5] Building frontend...
if exist "frontend\package.json" (
    cd frontend
    if exist "node_modules" (
        echo  Dependencies already installed, building...
    ) else (
        echo  Installing frontend dependencies...
        call npm install --silent 2>nul
    )
    call npx vite build 2>nul
    cd ..
    echo  Frontend built.
) else (
    echo  Frontend source not found, skipping build.
)
echo.

:: Create desktop shortcut
echo [5/5] Creating desktop shortcut...
set SCRIPT_DIR=%~dp0
set SHORTCUT_PATH=%USERPROFILE%\Desktop\Nexural Research.lnk

:: Create a VBS script to make the shortcut
echo Set oWS = WScript.CreateObject("WScript.Shell") > "%TEMP%\create_shortcut.vbs"
echo sLinkFile = "%SHORTCUT_PATH%" >> "%TEMP%\create_shortcut.vbs"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%TEMP%\create_shortcut.vbs"
echo oLink.TargetPath = "%SCRIPT_DIR%launch.bat" >> "%TEMP%\create_shortcut.vbs"
echo oLink.WorkingDirectory = "%SCRIPT_DIR%." >> "%TEMP%\create_shortcut.vbs"
echo oLink.Description = "Nexural Research - Strategy Analysis Engine" >> "%TEMP%\create_shortcut.vbs"
echo oLink.WindowStyle = 7 >> "%TEMP%\create_shortcut.vbs"
echo oLink.Save >> "%TEMP%\create_shortcut.vbs"
cscript //nologo "%TEMP%\create_shortcut.vbs"
del "%TEMP%\create_shortcut.vbs"
echo  Desktop shortcut created.

echo.
echo  ╔══════════════════════════════════════════════════╗
echo  ║          INSTALLATION COMPLETE!                  ║
echo  ║                                                  ║
echo  ║   Launch:  Double-click "Nexural Research"       ║
echo  ║            on your Desktop                       ║
echo  ║                                                  ║
echo  ║   Or run:  launch.bat                            ║
echo  ╚══════════════════════════════════════════════════╝
echo.
pause
