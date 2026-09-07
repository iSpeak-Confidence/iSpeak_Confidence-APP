@echo off
setlocal
title iSpeak Confidence V18.8.73
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install Node.js and try again.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing required packages...
  call npm install
  if errorlevel 1 (
    echo Installation failed.
    pause
    exit /b 1
  )
)

echo Starting iSpeak Confidence V18.8.73...
start "" http://localhost:3000
node server.js
pause
endlocal
