@echo off
REM Atlas Performance - Quick Start (no dependency installation)
REM Use this after the first setup to start the server faster

title Atlas Performance - Development Server

echo ========================================
echo    Atlas Performance - Quick Start
echo ========================================
echo.

REM Activate virtual environment
call venv\Scripts\activate.bat 2>nul
if errorlevel 1 (
    echo ERROR: Virtual environment not found.
    echo Please run start.bat first to set up the project.
    pause
    exit /b 1
)

REM Set Flask environment
set FLASK_ENV=development
set FLASK_APP=run.py

REM Start the server
echo ========================================
echo  SERVER STARTING...
echo ========================================
echo  URL: http://localhost:5000
echo.
echo  LOGIN CREDENTIALS:
echo  - Trainer: trainer@demo.com / demo123
echo  - Athlete: athlete@demo.com / demo123
echo.
echo  Press Ctrl+C to stop the server
echo ========================================
echo.

python run.py

REM Keep window open if there's an error
if errorlevel 1 (
    echo.
    echo ========================================
    echo    ERROR: Server failed to start
    echo    Run start.bat to reinstall dependencies
    echo ========================================
    echo.
    pause
)
