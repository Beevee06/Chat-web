@echo off
REM Start Nexus Chat Backend Server on Laptop
REM This script will run the Node.js backend server

cd /d "%~dp0"

echo.
echo ================================
echo  NEXUS CHAT - BACKEND SERVER
echo ================================
echo.
echo Starting Backend on port 3000...
echo.

REM Navigate to server directory and start
cd server
npm install

REM Start the server
node index.js

REM Keep window open if it closes
pause
