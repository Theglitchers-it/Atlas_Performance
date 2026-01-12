@echo off
title Atlas Performance - Server

echo.
echo ============================================================
echo.
echo           ATLAS PERFORMANCE - SERVER STARTUP
echo.
echo ============================================================
echo.
echo Avvio del server in corso...
echo.

:: Vai alla directory dello script
cd /d "%~dp0"

:: Controlla se esiste l'ambiente virtuale
if not exist "venv\Scripts\python.exe" (
    echo [ERRORE] Ambiente virtuale non trovato!
    echo.
    echo Devi prima installare le dipendenze:
    echo    1. Apri un terminale
    echo    2. Esegui: python -m venv venv
    echo    3. Esegui: venv\Scripts\activate
    echo    4. Esegui: pip install -r requirements.txt
    echo.
    pause
    exit /b 1
)

:: Attiva l'ambiente virtuale
echo [OK] Attivazione ambiente virtuale...
call venv\Scripts\activate.bat

:: Verifica se il database esiste
if not exist "instance\atlas.db" (
    echo.
    echo [INFO] Database non trovato! Inizializzazione in corso...
    echo.
    python -c "from app import create_app, db; app = create_app(); app.app_context().push(); db.create_all(); print('[OK] Database creato con successo!')"
    echo.
)

:: Avvia il server
echo.
echo ============================================================
echo  SERVER AVVIATO CON SUCCESSO!
echo.
echo  URL: http://localhost:5000
echo.
echo  Credenziali Demo:
echo    Super Admin: admin@atlasperformance.com / admin123
echo    Trainer: trainer@demo.com / demo123
echo    Atleta: athlete@demo.com / demo123
echo.
echo  Per fermare il server: premi CTRL+C
echo ============================================================
echo.
echo.

:: Avvia il server
python run.py

:: Se il server si interrompe
echo.
echo [INFO] Server arrestato.
echo.
pause
