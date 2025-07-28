#!/bin/bash
set -e

echo "🚀 GameDAO Hardhat Node Container Starting..."

# Ensure data directories exist with proper permissions
mkdir -p /app/data /app/contracts-output /app/logs
mkdir -p /home/hardhat/.local/share/pnpm
mkdir -p /home/hardhat/.cache

# Set proper ownership for mounted volumes
chown -R hardhat:hardhat /app/data /app/contracts-output /app/logs 2>/dev/null || true
chown -R hardhat:hardhat /home/hardhat 2>/dev/null || true

# Change to hardhat user and start the node
echo "🎯 Starting Hardhat node as user 'hardhat'..."
echo "📍 Working directory: $(pwd)"
echo "📍 User: $(whoami)"

# Set HOME environment variable for gosu
export HOME=/home/hardhat
exec gosu hardhat "$@"
