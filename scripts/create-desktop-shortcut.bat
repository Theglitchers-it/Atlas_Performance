@echo off
chcp 65001 >nul
REM Create a desktop shortcut to start the server

title Atlas Performance - Creazione Collegamento

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║                                                            ║
echo ║        🏋️ ATLAS PERFORMANCE - DESKTOP SHORTCUT 🏋️          ║
echo ║                                                            ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo 🔄 Creazione collegamento sul desktop...
echo.

set SCRIPT_DIR=%~dp0..
set SHORTCUT_PATH=%USERPROFILE%\Desktop\🚀 Atlas Performance.lnk

REM Create a VBS script to create the shortcut
echo Set oWS = WScript.CreateObject("WScript.Shell") > CreateShortcut.vbs
echo sLinkFile = "%SHORTCUT_PATH%" >> CreateShortcut.vbs
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> CreateShortcut.vbs
echo oLink.TargetPath = "%SCRIPT_DIR%\🚀 AVVIA SERVER.bat" >> CreateShortcut.vbs
echo oLink.WorkingDirectory = "%SCRIPT_DIR%" >> CreateShortcut.vbs
echo oLink.Description = "Avvia Atlas Performance Server - Clicca per avviare" >> CreateShortcut.vbs
echo oLink.IconLocation = "C:\Windows\System32\shell32.dll,137" >> CreateShortcut.vbs
echo oLink.Save >> CreateShortcut.vbs

REM Execute the VBS script
cscript CreateShortcut.vbs //nologo

REM Clean up
del CreateShortcut.vbs

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║  ✅ COLLEGAMENTO CREATO CON SUCCESSO!                     ║
echo ║                                                            ║
echo ║  📍 Guarda sul desktop:                                   ║
echo ║     "🚀 Atlas Performance"                                ║
echo ║                                                            ║
echo ║  💡 Clicca due volte sul collegamento per avviare         ║
echo ║     il server automaticamente!                            ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
pause
