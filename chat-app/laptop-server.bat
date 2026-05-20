@echo off
REM NEXUS CHAT - Laptop Server Setup
REM Runs Backend + Cloudflare Tunnel for production access

cd /d "%~dp0"

echo.
echo =====================================
echo  NEXUS CHAT - LAPTOP SERVER LAUNCHER
echo =====================================
echo.
echo What would you like to do?
echo.
echo 1. Run Backend Server (localhost:3000)
echo 2. Run Backend + Tunnel (expose to internet)
echo 3. Run Tunnel Only (backend already running)
echo 4. Exit
echo.

set /p choice="Enter your choice (1-4): "

if "%choice%"=="1" goto backend_only
if "%choice%"=="2" goto backend_and_tunnel
if "%choice%"=="3" goto tunnel_only
if "%choice%"=="4" goto exit
goto invalid

:backend_only
echo.
echo Starting Backend Server on http://localhost:3000...
echo.
cd server
npm install
node index.js
goto end

:backend_and_tunnel
echo.
echo Starting Backend Server and Tunnel...
echo Opening new terminals...
echo.

REM Check if cloudflared exists
if not exist "cloudflare\cloudflared.exe" (
    echo Downloading cloudflared...
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile 'cloudflare\cloudflared.exe'"
)

REM Start backend in new window
start "Nexus Backend" cmd /k cd server ^& npm install ^& node index.js

REM Wait for backend to start
timeout /t 3 /nobreak

REM Start tunnel in new window
start "Cloudflare Tunnel" cmd /k cloudflare\cloudflared.exe tunnel --url http://localhost:3000

echo.
echo Both servers started in new windows!
echo Backend: http://localhost:3000
echo.
pause
goto end

:tunnel_only
echo.
echo Starting Cloudflare Tunnel for http://localhost:3000...
echo.

REM Check if cloudflared exists
if not exist "cloudflare\cloudflared.exe" (
    echo Downloading cloudflared...
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile 'cloudflare\cloudflared.exe'"
)

cloudflare\cloudflared.exe tunnel --url http://localhost:3000
goto end

:invalid
echo Invalid choice. Please try again.
goto start

:end
pause
exit /b

:exit
exit /b
