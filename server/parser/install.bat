@echo off
REM ResumeParser Quick Install Script

echo ============================================
echo ResumeParser Install Script
echo ============================================
echo.

cd /d "%~dp0"

python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Please install Python 3.9+ first.
    pause
    exit /b 1
)

echo [OK] Python found

echo.
echo 1. Installing basic dependencies...
pip install flask flask-cors PyPDF2 python-docx --quiet

echo.
echo 2. Installing ResumeParser dependencies...
cd resume_parser
pip install -r requirements.txt --quiet
cd ..

echo [OK] Dependencies installed

echo.
echo 3. Downloading AI models (~2GB, 5-15 minutes)...
echo    Press Ctrl+C to skip if slow, download later manually
echo.

python download_models.py

echo.
echo ============================================
echo Installation complete!
echo ============================================
echo.
echo To start service:
echo   python ResumeParserAPI.py
echo.
echo To test:
echo   curl http://localhost:5001/api/health
echo.
pause
