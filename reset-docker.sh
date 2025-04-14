#!/bin/bash

echo "===== Mobile Application Security Framework Docker Reset ====="
echo "This script will stop and remove the MASF container and rebuild it from scratch."
echo "This is useful if you are experiencing problems with the container."
echo

# Ask for confirmation
read -p "Do you want to continue? [y/N] " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Operation cancelled."
    exit 1
fi

echo "Stopping all running containers..."
docker-compose down

echo "Removing MASF container (if it exists)..."
docker rm -f masf 2>/dev/null || true

echo "Removing MASF image..."
docker rmi -f rmob_masf 2>/dev/null || true
docker rmi -f masf 2>/dev/null || true

echo "Cleaning Docker build cache..."
docker builder prune -f

echo "Creating necessary directories..."
mkdir -p logs uploads

echo "Rebuilding the container from scratch..."
docker-compose build --no-cache

echo "Starting the container..."
docker-compose up -d

echo "===== Reset Complete ====="
echo "The container has been rebuilt and started."
echo "The web interface should be available at: http://localhost:5000"
echo
echo "To view logs: docker-compose logs -f"
echo "To check for issues: ./debug-docker.sh" 