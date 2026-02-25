@echo off
echo Starting DealScope AI...
echo.

:: Start backend
echo [1/2] Starting FastAPI backend on http://localhost:8000
start "DealScope Backend" cmd /k "cd /d "%~dp0backend" && python main.py"

:: Wait a moment for backend to initialize
timeout /t 2 /nobreak >nul

:: Start frontend
echo [2/2] Starting React frontend on http://localhost:5173
start "DealScope Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo DealScope AI is starting up.
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:5173
echo   API Docs: http://localhost:8000/docs
echo.
