# Atlas Performance - Start Server Script (PowerShell)
# Right-click and select "Run with PowerShell"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Atlas Performance - Starting Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if virtual environment exists
if (-not (Test-Path "venv")) {
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    python -m venv venv
    Write-Host ""
}

# Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Yellow
& "venv\Scripts\Activate.ps1"
Write-Host ""

# Install/Update dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
pip install -r requirements.txt
Write-Host ""

# Set environment variables
$env:FLASK_ENV = "development"
$env:FLASK_APP = "run.py"

# Check if database needs initialization
Write-Host "Checking database..." -ForegroundColor Yellow
Write-Host ""

# Start the server
Write-Host "========================================" -ForegroundColor Green
Write-Host "   Server starting at http://localhost:5000" -ForegroundColor Green
Write-Host "   Demo Trainer: trainer@demo.com / demo123" -ForegroundColor Green
Write-Host "   Press Ctrl+C to stop the server" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

try {
    python run.py
} catch {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "   ERROR: Server failed to start" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host $_.Exception.Message -ForegroundColor Red
    Read-Host -Prompt "Press Enter to exit"
}
