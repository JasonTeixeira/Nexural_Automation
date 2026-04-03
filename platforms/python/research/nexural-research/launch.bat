@echo off
title Nexural Research
color 0B

cd /d "%~dp0"

:: Try the short-path venv first (created by install.bat), then local .venv
set VENV=C:\nex_env\.venv
if not exist "%VENV%\Scripts\python.exe" set VENV=C:\nexural_env\.venv
if not exist "%VENV%\Scripts\python.exe" set VENV=%~dp0.venv
if not exist "%VENV%\Scripts\python.exe" (
    echo.
    echo  ERROR: Python environment not found.
    echo  Run install.bat first.
    echo.
    pause
    exit /b 1
)

echo.
echo  Starting Nexural Research...
echo.

"%VENV%\Scripts\python.exe" -c "from nexural_research.api.app import launch; launch()"
