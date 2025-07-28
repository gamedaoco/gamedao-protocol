FROM node:20-slim

# Install system dependencies needed for building native modules
RUN apt-get update && apt-get install -y \
    git \
    python3 \
    make \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Create a non-root user for security
RUN groupadd -r hardhat && useradd -r -g hardhat hardhat

# Install pnpm globally and gosu for user switching
RUN npm install -g pnpm && \
    apt-get update && \
    apt-get install -y gosu && \
    rm -rf /var/lib/apt/lists/*

# Copy only the contracts package for a lighter build
COPY packages/contracts-solidity/package*.json ./packages/contracts-solidity/
COPY packages/shared/package*.json ./packages/shared/

# Copy workspace configuration
COPY package*.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy the actual source code (only what we need)
COPY packages/contracts-solidity ./packages/contracts-solidity
COPY packages/shared ./packages/shared

# Install dependencies with optimizations for Docker
# - Include devDependencies since hardhat is needed for runtime
# - Use --ignore-scripts to skip husky and other build scripts
# - Use --frozen-lockfile for reproducible builds
RUN pnpm install --frozen-lockfile --ignore-scripts && \
    pnpm store prune && \
    # Clean up unnecessary files to reduce image size
    rm -rf /root/.cache /tmp/* /var/tmp/* /root/.npm

# Set working directory to contracts
WORKDIR /app/packages/contracts-solidity

# Create data directories and set up proper permissions
RUN mkdir -p /app/data /app/contracts-output /app/logs && \
    mkdir -p /home/hardhat/.local/share/pnpm && \
    mkdir -p /home/hardhat/.cache && \
    chown -R hardhat:hardhat /app /home/hardhat

# Copy entrypoint script
COPY ../../docker/hardhat-node/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Expose Hardhat JSON-RPC port
EXPOSE 8545

# Health check to ensure the node is responsive
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8545 -X POST -H "Content-Type: application/json" \
        --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' || exit 1

# Set entrypoint and default command
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["pnpm", "run", "node"]
