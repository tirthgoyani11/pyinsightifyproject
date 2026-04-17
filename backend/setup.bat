@echo off
REM Backend setup script for Windows

echo ========================================
echo Insightify Backend Setup
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://python.org
    pause
    exit /b 1
)

echo [1/6] Creating virtual environment...
python -m venv venv
if errorlevel 1 (
    echo ERROR: Failed to create virtual environment
    pause
    exit /b 1
)

echo.
echo [2/6] Activating virtual environment...
call venv\Scripts\activate.bat

echo.
echo [3/6] Installing dependencies...
pip install -r requirements.txt
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo [4/6] Installing Gemini AI package...
pip install google-generativeai

echo.
echo [5/6] Initializing database...
flask init-db
if errorlevel 1 (
    echo ERROR: Failed to initialize database
    pause
    exit /b 1
)

echo.
echo [6/6] Seeding database with sample data...
flask seed-db

echo.
echo ========================================
echo Setup completed successfully!
echo ========================================
echo.
echo To start the server:
echo 1. Activate virtual environment: venv\Scripts\activate
echo 2. Run server: python run.py
echo.
echo Server will run on http://localhost:5000
echo.
pause
