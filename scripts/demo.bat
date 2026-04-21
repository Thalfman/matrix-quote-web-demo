@echo off
REM Matrix Quote Web - demo launcher.
REM Double-click or run from cmd to boot the app with synthetic demo data.
REM Ctrl+C to stop; close window when done.

setlocal
cd /d "%~dp0.."

echo [demo] resetting .demo DATA_DIR...
if exist .demo rmdir /s /q .demo

set ENABLE_DEMO=1
set DATA_DIR=%cd%\.demo
set PYTHONPATH=%cd%

echo [demo] starting uvicorn on :8000 - browser opens when ready, Ctrl+C to stop.
start "" /b cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:8000"
python -m uvicorn backend.app.main:app --port 8000

endlocal
