@echo off
setlocal
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>nul
echo iSpeak Confidence V18.8.12: http://localhost:3000
node server.js
pause
