# Development Startup Script for Identity Drift Detection (Decoy / DDA)
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Identity Drift Detection - Pre-Execution Security Gateway" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Detect Python executable
$pythonExe = if (Test-Path ".\backend_venv\Scripts\python.exe") {
    ".\backend_venv\Scripts\python.exe"
} elseif (Test-Path ".\.venv\Scripts\python.exe") {
    ".\.venv\Scripts\python.exe"
} elseif (Test-Path ".\venv\Scripts\python.exe") {
    ".\venv\Scripts\python.exe"
} else {
    "python"
}

# 1. Start Backend in a background process
Write-Host "`n[1/2] Starting FastAPI Backend on http://127.0.0.1:8000 using $pythonExe..." -ForegroundColor Green
$backendProc = Start-Process -FilePath $pythonExe -ArgumentList "-m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload" -PassThru -NoNewWindow

# 2. Start Frontend
Write-Host "`n[2/2] Starting React + Vite Operations Dashboard on http://localhost:5173..." -ForegroundColor Green
Set-Location frontend
npm run dev
