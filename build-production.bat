@echo off
echo ========================================
echo   Atlas Performance - Production Build
echo ========================================
echo.

echo [1/3] Installing Node dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: npm install failed!
    pause
    exit /b 1
)

echo.
echo [2/3] Building production assets...
call npm run build
if errorlevel 1 (
    echo ERROR: Build failed!
    pause
    exit /b 1
)

echo.
echo [3/3] Verifying build output...
if not exist "dist\manifest.json" (
    echo ERROR: Build manifest not found!
    pause
    exit /b 1
)

echo.
echo ========================================
echo   BUILD SUCCESSFUL!
echo ========================================
echo.
echo Production assets generated in: dist\
echo.
dir dist /s
echo.
echo Ready for deployment!
echo.
pause
