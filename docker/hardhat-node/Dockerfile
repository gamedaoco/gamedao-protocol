# Minimal Hardhat node container.
# Inspired by https://github.com/11notes/docker-hardhat — the chain is
# independent of the workspace, so we don't mount source or run pnpm install.
# The deploy script runs from the host and submits txs via JSON-RPC at :8545.

FROM node:22-slim

# curl is needed for the healthcheck below.
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /hardhat

# Install hardhat globally (no workspace, no native build deps required).
RUN npm install --no-audit --no-fund --silent hardhat@2.26.3

# Minimal config — chainId 31337 with auto-mining and the standard test accounts
# (Hardhat's default mnemonic, same as packages/contracts-solidity/hardhat.config.ts).
RUN printf 'module.exports={networks:{hardhat:{chainId:31337,mining:{auto:true}}}};\n' > hardhat.config.js

EXPOSE 8545

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8545 -X POST -H "Content-Type: application/json" \
        --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' || exit 1

# `node` user comes baked into node:22-slim with uid/gid 1000.
USER node

CMD ["npx", "hardhat", "node", "--hostname", "0.0.0.0"]
