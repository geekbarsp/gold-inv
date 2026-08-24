@echo off
setlocal
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0SETUP-WINDOWS.ps1"
if errorlevel 1 (
  echo.
  echo Setup did not complete.
  pause
  exit /b 1
)
echo.
echo Setup complete. You can now run START-WINDOWS.cmd.
pause

