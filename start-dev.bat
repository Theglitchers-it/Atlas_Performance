@echo off
echo ========================================
echo   Atlas Performance - Development Mode
echo ========================================
echo.
echo Starting Vite Dev Server and Flask...
echo.
echo [1/2] Starting Vite Dev Server (HMR)...
start "Vite Dev Server" cmd /k "npm run dev"
timeout /t 3 /nobreak >nul

echo [2/2] Starting Flask Application...
start "Flask Server" cmd /k "venv\Scripts\python.exe run.py"
timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo   Servers Started!
echo ========================================
echo.
echo Flask:     http://localhost:5000
echo Vite HMR:  http://localhost:5173
echo.
echo Press any key to stop all servers...
pause >nul

echo.
echo Stopping servers...
taskkill /FI "WindowTitle eq Vite Dev Server*" /T /F >nul 2>&1
taskkill /FI "WindowTitle eq Flask Server*" /T /F >nul 2>&1
echo Done!
