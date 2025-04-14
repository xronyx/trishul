@echo off
echo ===== Mobile Application Security Framework Docker Debugging =====

:: Check Docker daemon status
echo Checking Docker daemon status...
docker info >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Docker daemon is not running or you don't have permission to use it.
    echo Solutions:
    echo   - Make sure Docker Desktop is running
    echo   - Check that you've started Docker Desktop with administrator privileges
    goto :EOF
)
echo Docker daemon is running.

:: Check if container exists and its status
echo.
echo Checking MASF container status...
docker ps -a --filter "name=masf" --format "{{.Names}}" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Container 'masf' does not exist. Run start-docker.bat to create it.
) else (
    docker ps --filter "name=masf" --format "{{.Names}}" >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo Container 'masf' exists but is not running.
        echo To start it: docker start masf
        echo Last container logs:
        docker logs --tail 20 masf
    ) else (
        echo Container 'masf' is running.
        echo Container ports:
        docker port masf
        echo.
        echo Container logs:
        docker logs --tail 20 masf
    )
)

:: Check time sync - common issue
echo.
echo Checking host system time...
echo Host system time: %DATE% %TIME%
docker exec masf date >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Container time: 
    docker exec masf date
) else (
    echo Cannot get container time - container not running
)

:: Check ADB devices
echo.
echo Checking ADB devices...
adb --version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Host ADB devices:
    adb devices -l
    
    docker ps --filter "name=masf" --format "{{.Names}}" >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo Container ADB devices:
        docker exec masf adb devices -l 2>nul || echo Cannot run ADB in container
    )
) else (
    echo ADB not installed on host system
)

:: Check network
echo.
echo Checking network connectivity to web interface...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:5000' -Method Head -TimeoutSec 5; Write-Host 'Successfully connected to web interface' } catch { Write-Host 'Cannot connect to http://localhost:5000' }"

echo.
echo ===== Debugging complete =====
echo If you're still having issues, try:
echo 1. Stopping the container: docker-compose down
echo 2. Rebuilding without cache: docker-compose build --no-cache
echo 3. Starting again: docker-compose up -d
echo 4. Checking logs: docker-compose logs -f

pause 