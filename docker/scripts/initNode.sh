#!/bin/bash

# GameDAO Hardhat Node Initialization Script
# This script initializes the Hardhat node container with proper configuration

set -e

echo "🚀 Initializing GameDAO Hardhat Node..."

# Ensure data directories exist with proper permissions
mkdir -p /app/data /app/contracts-output /app/logs

# Check if this is a fresh start or restart
if [ ! -f /app/data/.initialized ]; then
    echo "📋 First-time initialization detected"

    # Create initialization marker
    touch /app/data/.initialized
    echo "$(date): Hardhat node initialized" > /app/logs/init.log
else
    echo "📋 Restarting existing node with preserved state"
    echo "$(date): Hardhat node restarted" >> /app/logs/init.log
fi

# Display configuration information
echo "📍 Node Configuration:"
echo "  - RPC URL: http://0.0.0.0:8545"
echo "  - Chain ID: 31337"
echo "  - Data Directory: /app/data"
echo "  - Contracts Output: /app/contracts-output"
echo "  - Logs Directory: /app/logs"

# Start the Hardhat node
echo "🎯 Starting Hardhat node..."
exec npm run node -- --hostname 0.0.0.0 --verbose
