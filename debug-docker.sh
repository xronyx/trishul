#!/bin/bash

echo "===== Mobile Application Security Framework Docker Debugging ====="

# Check Docker daemon status
echo "Checking Docker daemon status..."
if ! docker info &>/dev/null; then
    echo "ERROR: Docker daemon is not running or you don't have permission to use it."
    echo "Solutions:"
    echo "  - Make sure Docker is running"
    echo "  - On Linux, add your user to the docker group: sudo usermod -aG docker $USER"
    echo "  - On Windows, make sure Docker Desktop is running"
    exit 1
fi
echo "Docker daemon is running."

# Check if container exists and its status
echo -e "\nChecking MASF container status..."
CONTAINER_EXISTS=$(docker ps -a --filter "name=masf" --format "{{.Names}}")
if [ -z "$CONTAINER_EXISTS" ]; then
    echo "Container 'masf' does not exist. Run start-docker.sh to create it."
else
    CONTAINER_RUNNING=$(docker ps --filter "name=masf" --format "{{.Names}}")
    if [ -z "$CONTAINER_RUNNING" ]; then
        echo "Container 'masf' exists but is not running."
        echo "To start it: docker start masf"
        echo "Last container logs:"
        docker logs --tail 20 masf
    else
        echo "Container 'masf' is running."
        echo "Container ports:"
        docker port masf
        echo -e "\nContainer logs:"
        docker logs --tail 20 masf
    fi
fi

# Check time sync - common issue
echo -e "\nChecking host system time..."
echo "Host system time: $(date)"
echo "Container time: $(docker exec masf date 2>/dev/null || echo "Cannot get container time - container not running")"

# Check ADB devices
echo -e "\nChecking ADB devices..."
if command -v adb &>/dev/null; then
    echo "Host ADB devices:"
    adb devices -l
    
    if [ ! -z "$CONTAINER_RUNNING" ]; then
        echo "Container ADB devices:"
        docker exec masf adb devices -l 2>/dev/null || echo "Cannot run ADB in container"
    fi
else
    echo "ADB not installed on host system"
fi

# Check network
echo -e "\nChecking network connectivity to web interface..."
if command -v curl &>/dev/null; then
    curl -I http://localhost:5000 -m 5 || echo "Cannot connect to http://localhost:5000"
elif command -v wget &>/dev/null; then
    wget --spider http://localhost:5000 || echo "Cannot connect to http://localhost:5000"
else
    echo "Cannot check web connectivity - neither curl nor wget is installed"
fi

echo -e "\n===== Debugging complete ====="
echo "If you're still having issues, try:"
echo "1. Stopping the container: docker-compose down"
echo "2. Rebuilding without cache: docker-compose build --no-cache"
echo "3. Starting again: docker-compose up -d"
echo "4. Checking logs: docker-compose logs -f" 