@echo off
REM Script to run Atlas Performance tests on Windows

echo ================================
echo Atlas Performance - Test Runner
echo ================================
echo.

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Check if pytest is installed
python -c "import pytest" 2>nul
if errorlevel 1 (
    echo pytest not found! Installing test dependencies...
    pip install -r requirements.txt
)

echo.
echo Running tests...
echo.

REM Run tests with coverage
pytest --cov=app --cov-report=html --cov-report=term-missing -v

echo.
echo ================================
echo Tests complete!
echo ================================
echo.
echo Coverage report generated in: htmlcov\index.html
echo.
echo To view coverage report, open: htmlcov\index.html
echo.

pause
