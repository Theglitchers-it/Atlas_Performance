@echo off
REM Atlas Performance - Reset Database Script
REM WARNING: This will delete all data and recreate the database

title Atlas Performance - Database Reset

echo ========================================
echo    WARNING: DATABASE RESET
echo ========================================
echo.
echo This will DELETE all existing data and
echo recreate the database from scratch.
echo.
set /p confirm="Are you sure? (type YES to confirm): "

if not "%confirm%"=="YES" (
    echo.
    echo Database reset cancelled.
    pause
    exit /b 0
)

echo.
echo ========================================
echo    Resetting Database...
echo ========================================
echo.

REM Activate virtual environment
call venv\Scripts\activate.bat 2>nul
if errorlevel 1 (
    echo ERROR: Virtual environment not found.
    echo Please run start.bat first.
    pause
    exit /b 1
)

REM Set Flask environment
set FLASK_ENV=development
set FLASK_APP=run.py

REM Delete existing database
if exist "instance\atlas_performance.db" (
    echo Deleting old database...
    del /F "instance\atlas_performance.db"
    echo.
)

REM Delete migrations if they exist
if exist "migrations\" (
    echo Cleaning migrations...
    rmdir /S /Q "migrations"
    echo.
)

REM Create instance directory if it doesn't exist
if not exist "instance\" (
    mkdir instance
)

REM Initialize database
echo Creating database tables...
flask init-db
if errorlevel 1 (
    echo ERROR: Failed to create database
    pause
    exit /b 1
)
echo.

REM Seed database
echo Seeding database with demo data...
flask seed-db
if errorlevel 1 (
    echo ERROR: Failed to seed database
    pause
    exit /b 1
)
echo.

echo ========================================
echo  DATABASE RESET COMPLETE!
echo ========================================
echo.
echo  Demo credentials:
echo  - Super Admin: admin@atlasperformance.com / admin123
echo  - Trainer: trainer@demo.com / demo123
echo  - Athlete: athlete@demo.com / demo123
echo.
pause
