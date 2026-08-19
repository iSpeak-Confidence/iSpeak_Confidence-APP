@echo off
cd /d "%~dp0"
start "" http://localhost:3000
echo iSpeak Confidence V18.8.31: http://localhost:3000
node server.js
pause
