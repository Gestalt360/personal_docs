@echo off
REM Windows batch wrapper for Google Keep sync via gws CLI
REM Requires: gws.exe authenticated with OAuth (Google Workspace accounts only)
REM For personal Gmail, use sync_keep.py instead.

set REPO_ROOT=C:\Users\SiphoH\source\personal_docs
set GWS_BIN=%REPO_ROOT%\.tools\gws.exe
set KEEP_DIR=%REPO_ROOT%\30-Resources\30-01-Keep-Notes

echo [INFO] Starting gws keep sync...

REM Check gws auth
"%GWS_BIN%" auth status >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] gws not authenticated. Run: gws auth login
    exit /b 1
)

REM Fetch all notes (paginated, output as JSON)
"%GWS_BIN%" keep notes list --params '{"pageSize": 100}' --format json > "%REPO_ROOT%\99-Meta\keep_raw.json"

echo [INFO] Raw data saved to 99-Meta\keep_raw.json
REM Note: Full gws → Markdown conversion requires a Python/JS parser on top of this JSON.
REM For a complete solution, use sync_keep.py which handles personal Gmail accounts.

pause
