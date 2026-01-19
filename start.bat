@echo off
REM Resume Parser System - One-Click Start

echo ============================================
echo Resume Parser System - Startup
echo ============================================
echo.

set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"

echo [1/4] Check Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Please install Python 3.9+
    echo   Download: https://www.python.org/downloads/
    pause
    exit /b 1
)
echo [OK] Python found

echo.
echo [2/4] Check Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Please install Node.js 18+
    echo   Download: https://nodejs.org/
    pause
    exit /b 1
)
echo [OK] Node.js found

echo.
echo [3/4] Start ResumeParser Service (Port 5001)...
cd server\parser
start "ResumeParser" cmd /c "python ResumeParserAPI.py"
timeout /t 3 /nobreak >nul
echo [OK] ResumeParser started

echo.
echo [4/4] Start Backend Server (Port 3000)...
cd ..\..
start "Backend Server" cmd /c "node server/index.js"
timeout /t 2 /nobreak >nul
echo [OK] Backend server started

echo.
echo ============================================
echo All services started!
echo ============================================
echo.
echo Services:
echo   - ResumeParser: http://localhost:5001
echo   - Backend API:  http://localhost:3000
echo   - Frontend:     http://localhost:5173
echo.
echo To start frontend:
echo   npm run dev
echo.
echo Press any key to open browser...
pause >nul

start http://localhost:5173

echo.
echo Done!
