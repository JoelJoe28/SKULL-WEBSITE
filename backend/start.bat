@echo off
cd /d "%~dp0"

echo SKULL Backend
echo.
echo Installing dependencies if needed...
call npm install

echo.
echo Starting backend on http://localhost:5000
echo Current MongoDB URI: %MONGODB_URI%
echo If MONGODB_URI is empty, the backend will use mongodb://127.0.0.1:27017
echo.
echo Press Ctrl+C to stop the server.
echo.

call npm start
