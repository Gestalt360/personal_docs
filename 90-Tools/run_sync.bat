@echo off
REM Quick-start: run the Google Keep sync on Windows
REM This opens a new Kimi conversation that executes the sync script

cd /d "C:\Users\SiphoH\source\personal_docs"

REM Check if .env exists
if not exist "99-Meta\.env" (
    echo [ERROR] No credentials found. Create 99-Meta\.env first.
    echo.
    echo 1. Copy 99-Meta\.env.example to 99-Meta\.env
    echo 2. Fill in your KEEP_APP_PASSWORD from Google App Passwords
    echo.
    pause
    exit /b 1
)

echo [INFO] Running Keep sync via Kimi Python runtime...

REM Run the Python script via python if available, else delegate to Kimi
python "90-Tools\sync_keep.py" 2>nul
if %ERRORLEVEL% neq 0 (
    echo [INFO] Python not available in shell. Use Kimi Work to run 90-Tools/sync_keep.py
)

pause
