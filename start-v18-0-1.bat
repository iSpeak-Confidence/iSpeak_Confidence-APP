@echo off
setlocal
cd /d "%~dp0"
echo.
echo ==========================================
echo   iSpeak Confidence V18.0.1
echo   International Learning Core
echo ==========================================
echo.
if not exist node_modules (
  echo Installing dependencies for first run...
  call npm install
  if errorlevel 1 pause & exit /b 1
)
echo Running V18 QA checks...
node qa-v18.js
if errorlevel 1 (echo QA checks failed. & pause & exit /b 1)
echo Starting iSpeak Confidence...
node server.js
pause
