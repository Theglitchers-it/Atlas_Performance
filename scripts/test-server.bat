@echo off
REM Test if the server can start without errors

title Atlas Performance - Server Test

echo ========================================
echo    Testing Server Configuration
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

echo Testing Python syntax...
python -m compileall app -q
if errorlevel 1 (
    echo ERROR: Python syntax errors found
    pause
    exit /b 1
)
echo ✅ Python syntax OK

echo.
echo Testing imports...
python check_imports.py
if errorlevel 1 (
    echo ERROR: Import errors found
    pause
    exit /b 1
)

echo.
echo Testing database...
python check_db.py
if errorlevel 1 (
    echo WARNING: Database needs initialization
    echo Run reset-database.bat to initialize
)

echo.
echo ========================================
echo  ALL TESTS PASSED!
echo  The server should start without issues
echo ========================================
echo.
pause
