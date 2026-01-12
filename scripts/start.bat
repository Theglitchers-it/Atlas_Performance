@echo off
REM Atlas Performance - Start Server Script
REM Double-click this file to start the development server

title Atlas Performance - Development Server

echo ========================================
echo    Atlas Performance - Starting Server
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python from https://www.python.org/
    echo.
    pause
    exit /b 1
)

REM Check if virtual environment exists
if not exist "venv\" (
    echo Creating virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo ERROR: Failed to create virtual environment
        pause
        exit /b 1
    )
    echo Virtual environment created successfully!
    echo.
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat
if errorlevel 1 (
    echo ERROR: Failed to activate virtual environment
    pause
    exit /b 1
)
echo.

REM Upgrade pip silently
echo Checking pip...
python -m pip install --upgrade pip --quiet
echo.

REM Install/Update dependencies
echo Installing dependencies...
pip install -r requirements.txt --quiet
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)
echo Dependencies installed successfully!
echo.

REM Create .env file if it doesn't exist
if not exist ".env" (
    echo Creating .env file from template...
    copy .env.example .env >nul
    echo .env file created! You may need to configure it later.
    echo.
)

REM Set Flask environment
set FLASK_ENV=development
set FLASK_APP=run.py

REM Check and initialize database if needed
echo Checking database...
python check_db.py >nul 2>&1
if errorlevel 1 (
    echo Database needs initialization...
    echo Creating database tables...

    REM Create instance directory if needed
    if not exist "instance\" mkdir instance

    flask init-db
    if errorlevel 1 (
        echo ERROR: Failed to create database tables
        echo Try running reset-database.bat
        pause
        exit /b 1
    )
    echo.
    echo Seeding database with demo data...
    flask seed-db
    if errorlevel 1 (
        echo WARNING: Failed to seed database
        echo You can try again later with: flask seed-db
    )
    echo.
) else (
    echo Database is ready!
    echo.
)

REM Start the server
echo ========================================
echo  SERVER READY!
echo ========================================
echo  URL: http://localhost:5000
echo.
echo  LOGIN CREDENTIALS:
echo  - Super Admin: admin@atlasperformance.com / admin123
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
    echo    Check the error message above
    echo ========================================
    echo.
    pause
)
