@echo off
cd /d "%~dp0"
title iSpeak Confidence V18.8.15
if not exist node_modules\pg (
  echo Installing required packages...
  call npm install
)
echo.
echo iSpeak Confidence V18.8.15: http://localhost:3000
echo Email verification fix: INCLUDED
echo Course progression fix: INCLUDED
node server.js
pause
