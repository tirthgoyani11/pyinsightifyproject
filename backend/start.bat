@echo off
REM Start the Flask development server

echo Starting Insightify Backend Server...
echo.

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Run the Flask app
python run.py
