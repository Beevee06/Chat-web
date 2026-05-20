@echo off
REM Expose Nexus Chat Backend to Internet via Cloudflare Tunnel

cd /d "%~dp0"

echo.
echo ================================
echo  CLOUDFLARE TUNNEL - BACKEND
echo ================================
echo.
echo This will expose your laptop backend to the internet.
echo.

REM Check if cloudflared exists
if not exist "cloudflare\cloudflared.exe" (
    echo Downloading cloudflared...
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile 'cloudflare\cloudflared.exe'"
)

REM Start tunnel
echo Starting Cloudflare Tunnel for http://localhost:3000...
echo.
cloudflare\cloudflared.exe tunnel --url http://localhost:3000

REM Keep window open if it closes
pause
