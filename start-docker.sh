#!/bin/bash

echo "===== Starting Mobile Application Security Framework Docker Container ====="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "Error: Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if ADB is installed on the host
if ! command -v adb &> /dev/null; then
    echo "Warning: ADB is not installed on the host. It's recommended to have ADB installed for initial device setup."
    echo "The container will still have ADB, but having it on the host can help with troubleshooting."
fi

# Restart ADB server on host to ensure clean state
if command -v adb &> /dev/null; then
    echo "Restarting ADB server on host..."
    adb kill-server
    adb start-server
    echo "Checking for connected devices:"
    adb devices
fi

# Create necessary directories
mkdir -p logs uploads

# Build and start the container
echo "Building and starting Docker container..."
docker-compose up --build -d

echo "===== Container started ====="
echo "The web interface will be available at: http://localhost:5000"
echo "To view logs: docker-compose logs -f"
echo "To stop: docker-compose down" 