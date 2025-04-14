@echo off
echo ===== Mobile Application Security Framework Docker Reset =====
echo This script will stop and remove the MASF container and rebuild it from scratch.
echo This is useful if you are experiencing problems with the container.
echo.

:: Ask for confirmation
set /p CONFIRM="Do you want to continue? [y/N] "
if /i "%CONFIRM%" NEQ "y" (
    echo Operation cancelled.
    goto :EOF
)

echo Stopping all running containers...
docker-compose down

echo Removing MASF container (if it exists)...
docker rm -f masf 2>nul || echo Container not found, continuing...

echo Removing MASF image...
docker rmi -f rmob_masf 2>nul || echo Image not found, continuing...
docker rmi -f masf 2>nul || echo Image not found, continuing...

echo Cleaning Docker build cache...
docker builder prune -f

echo Creating necessary directories...
if not exist logs mkdir logs
if not exist uploads mkdir uploads

:: Copy Windows-specific docker-compose file if it doesn't exist already
if not exist docker-compose.override.yml (
    echo Using Windows-specific Docker Compose configuration
    copy docker-compose.windows.yml docker-compose.override.yml
)

echo Rebuilding the container from scratch...
docker-compose build --no-cache

echo Starting the container...
docker-compose up -d

echo ===== Reset Complete =====
echo The container has been rebuilt and started.
echo The web interface should be available at: http://localhost:5000
echo.
echo To view logs: docker-compose logs -f
echo To check for issues: debug-docker.bat

pause 