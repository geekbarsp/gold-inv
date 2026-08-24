@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 22 or newer is not installed or is not available in PATH.
  echo Install it from https://nodejs.org and run this launcher again.
  pause
  exit /b 1
)
if not exist ".env.local" (
  echo.
  echo Missing .env.local
  echo Run SETUP-WINDOWS.cmd first.
  echo.
  pause
  exit /b 1
)
set HOSTNAME=0.0.0.0
set PORT=3000
echo Starting Narciso Geronimo Jewelry Inventory...
echo Desktop: http://localhost:3000
echo Mobile camera: use an HTTPS deployment or trusted HTTPS reverse proxy.
echo Plain LAN HTTP is not secure enough for camera access or production sessions.
echo.
node server.js
pause
