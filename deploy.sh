#!/bin/bash

# Mobile Application Security Framework Deployment Script

# Colors for terminal output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Mobile Application Security Framework Setup ===${NC}"
echo -e "This script will set up the Mobile Application Security Framework."

# Check for prerequisites
echo -e "\n${YELLOW}Checking prerequisites...${NC}"

# Check for Python
if command -v python3 &>/dev/null; then
    PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
    echo -e "${GREEN}✓ Python detected: ${PYTHON_VERSION}${NC}"
else
    echo -e "${RED}✗ Python 3 not found! Please install Python 3.8 or higher.${NC}"
    exit 1
fi

# Check for Node.js
if command -v node &>/dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓ Node.js detected: ${NODE_VERSION}${NC}"
else
    echo -e "${RED}✗ Node.js not found! Please install Node.js 14 or higher.${NC}"
    exit 1
fi

# Check for npm
if command -v npm &>/dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✓ npm detected: ${NPM_VERSION}${NC}"
else
    echo -e "${RED}✗ npm not found! Please install npm.${NC}"
    exit 1
fi

# Check for ADB
if command -v adb &>/dev/null; then
    ADB_VERSION=$(adb version | head -1)
    echo -e "${GREEN}✓ ADB detected: ${ADB_VERSION}${NC}"
else
    echo -e "${RED}✗ ADB not found! Please install Android Debug Bridge tools.${NC}"
    exit 1
fi

# Set up Python virtual environment
echo -e "\n${YELLOW}Setting up Python virtual environment...${NC}"
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install Python dependencies
echo -e "\n${YELLOW}Installing Python dependencies...${NC}"
pip install -r requirements.txt

# Copy sample scripts to the frontend
echo -e "\n${YELLOW}Copying sample scripts...${NC}"
python copy_samples.py

# Build React frontend
echo -e "\n${YELLOW}Building React frontend...${NC}"
cd frontend
npm install
npm run build
cd ..

# Create necessary directories
mkdir -p logs
mkdir -p uploads

echo -e "\n${GREEN}=== Setup Complete ===${NC}"
echo -e "To start the server, run: ${YELLOW}source venv/bin/activate && python server.py${NC}"
echo -e "The web interface will be available at: ${BLUE}http://localhost:5000${NC}" 