@echo off
cd /d "%~dp0"
title iSpeak Confidence V18.8.59
echo Starting iSpeak Confidence V18.8.59...
start "iSpeak Server" cmd /k "node server.js"
timeout /t 2 /nobreak >nul
start "" http://localhost:3000
exit
