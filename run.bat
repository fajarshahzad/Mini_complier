@echo off
title Pascal Mini Compiler Launcher
color 0a

echo ===================================================
echo             PASCAL MINI COMPILER LAUNCHER
echo ===================================================
echo.

:: 1. Check prerequisites
echo Checking environment prerequisites...
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python was not found in your PATH!
    echo Please install Python and ensure it is added to your environment variables.
    pause
    exit /b 1
)

where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js/npm was not found in your PATH!
    echo Please install Node.js and ensure it is added to your environment variables.
    pause
    exit /b 1
)

:: 2. Setup Backend Virtual Environment
echo [1/3] Checking Backend virtual environment...
if not exist "backend\venv" (
    echo Backend virtual environment not found! Creating one...
    python -m venv backend\venv
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to create virtual environment!
        pause
        exit /b 1
    )
    echo Activating virtual environment and installing backend dependencies...
    call backend\venv\Scripts\activate
    python -m pip install --upgrade pip
    pip install -r backend\requirements.txt
) else (
    echo Backend virtual environment detected.
    echo Ensuring backend dependencies are installed/up-to-date...
    call backend\venv\Scripts\activate
    pip install -r backend\requirements.txt
)
echo.

:: 3. Setup Frontend dependencies
echo [2/3] Checking Frontend dependencies...
if not exist "frontend\node_modules" (
    echo Frontend node_modules not found! Installing dependencies...
    cd frontend
    call npm install
    cd ..
) else (
    echo Frontend dependencies detected.
)
echo.

:: 4. Launch FastAPI Backend Server
echo [3/3] Starting FastAPI Backend on http://127.0.0.1:8000...
start "Pascal Compiler - FastAPI Backend" cmd /k "cd /d backend && call venv\Scripts\activate && python -m uvicorn app:app --host 127.0.0.1 --port 8000"
echo.

:: 5. Launch React Frontend Server
echo Starting Frontend React Server...
start "Pascal Compiler - React Frontend" cmd /k "cd frontend && npm run dev"
echo.

echo ===================================================
echo  Both servers have been launched in separate windows!
echo  - Backend runs on http://127.0.0.1:8000
echo  - Frontend runs on http://localhost:5173
echo ===================================================
echo.
pause
