@echo off
echo ===== Mobile Application Security Framework Setup =====
echo This script will set up the Mobile Application Security Framework.
echo.

echo Checking prerequisites...
echo.

:: Check for Python
python --version 2>NUL
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python not found! Please install Python 3.8 or higher.
    exit /b 1
) else (
    echo [OK] Python detected
)

:: Check for Node.js
node --version 2>NUL
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js not found! Please install Node.js 14 or higher.
    exit /b 1
) else (
    echo [OK] Node.js detected
)

:: Check for npm
npm --version 2>NUL
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm not found! Please install npm.
    exit /b 1
) else (
    echo [OK] npm detected
)

:: Check for ADB
adb version 2>NUL
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] ADB not found! Please install Android Debug Bridge tools.
    exit /b 1
) else (
    echo [OK] ADB detected
)

echo.
echo Setting up Python virtual environment...
python -m venv venv

:: Activate virtual environment
call venv\Scripts\activate.bat

:: Install Python dependencies
echo.
echo Installing Python dependencies...
pip install -r requirements.txt

:: Copy sample scripts to the frontend
echo.
echo Copying sample scripts...
python copy_samples.py

:: Build React frontend
echo.
echo Building React frontend...
cd frontend
npm install
npm run build
cd ..

:: Create necessary directories
mkdir logs 2>NUL
mkdir uploads 2>NUL

echo.
echo ===== Setup Complete =====
echo To start the server, run: venv\Scripts\activate.bat ^&^& python server.py
echo The web interface will be available at: http://localhost:5000
echo. 