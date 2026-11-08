@echo off
title PulseGuard AI - FastAPI Backend Server
echo Starting PulseGuard AI Backend Server on port 5000...
cd /d "%~dp0backend"
python main.py
if errorlevel 1 (
    echo.
    echo Backend failed to start. Press any key to exit.
    pause
)

