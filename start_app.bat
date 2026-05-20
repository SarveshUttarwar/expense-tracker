@echo off
echo Starting Expense Tracker Application...

echo Starting Backend (FastAPI)...
start cmd /k "cd /d "%~dp0backend" && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

echo Starting Frontend (React/Vite)...
start cmd /k "cd /d "%~dp0frontend\expense-manager" && npm run dev"

echo App started in separate windows!
