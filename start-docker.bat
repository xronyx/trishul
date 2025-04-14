@echo off
echo ===== Starting Mobile Application Security Framework Docker Container =====

:: Check if Docker is installed
docker --version > nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Error: Docker is not installed. Please install Docker Desktop for Windows first.
    exit /b 1
)

:: Check if Docker Compose is installed (comes with Docker Desktop for Windows)
docker-compose --version > nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Error: Docker Compose is not available. Please make sure Docker Desktop for Windows is properly installed.
    exit /b 1
)

:: Check if ADB is installed on the host
adb --version > nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Warning: ADB is not installed on the host. It's recommended to have ADB installed for initial device setup.
    echo The container will still have ADB, but having it on the host can help with troubleshooting.
) else (
    echo Restarting ADB server on host...
    adb kill-server
    adb start-server
    echo Checking for connected devices:
    adb devices
)

:: Create necessary directories
if not exist logs mkdir logs
if not exist uploads mkdir uploads

:: Copy Windows-specific docker-compose file if it doesn't exist already
if not exist docker-compose.override.yml (
    echo Using Windows-specific Docker Compose configuration
    copy docker-compose.windows.yml docker-compose.override.yml
)

:: Build and start the container
echo Building and starting Docker container...
docker-compose up --build -d

echo ===== Container started =====
echo The web interface will be available at: http://localhost:5000
echo To view logs: docker-compose logs -f
echo To stop: docker-compose down

pause 