@echo off
REM Quick start script for Whisper Transcription API

echo ============================================================
echo   Whisper Transcription API Server
echo ============================================================
echo.

REM Check if FFmpeg is available
where ffmpeg >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Warning: FFmpeg not found in PATH
    echo Please install FFmpeg or set FFMPEG_BINARY environment variable
    echo.
)

REM Start the API server
echo Starting API server on http://localhost:8000
echo.
echo Interactive API docs: http://localhost:8000/docs
echo.
echo Press Ctrl+C to stop the server
echo ============================================================
echo.

python demo_api.py --host 0.0.0.0 --port 8000

pause

