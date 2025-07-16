# GameDAO v3 End-to-End Integration Guide

> **Complete guide for setting up and running the full GameDAO v3 protocol suite with membership integration**

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start](#quick-start)
4. [Detailed Setup](#detailed-setup)
5. [Testing Integration](#testing-integration)
6. [Deployment Guide](#deployment-guide)
7. [Troubleshooting](#troubleshooting)
8. [Advanced Configuration](#advanced-configuration)

## Overview

This guide covers the complete setup and integration of the GameDAO v3 protocol suite, including:

- **Smart Contracts**: Membership-integrated contracts with governance settings
- **Subgraph**: Event indexing with membership architecture
- **Frontend**: React application with membership hooks
- **Development Tools**: Makefile automation and testing utilities

## Prerequisites

### Required Software
- **Node.js 18+**: JavaScript runtime
- **npm/pnpm**: Package manager (pnpm recommended)
- **Docker**: For Graph node infrastructure
- **Git**: Version control
- **MetaMask**: Browser wallet for testing

### System Requirements
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 10GB free space
- **Network**: Stable internet connection
- **OS**: macOS, Linux, or Windows with WSL

## Quick Start

### 1. Clone and Install
```bash
git clone https://github.com/gamedaoco/gamedao-protocol.git
cd gamedao-protocol
pnpm install
```

### 2. Start Development Environment
```bash
# Start complete development environment
make dev-full
```

This command will:
- Start local Hardhat node
- Deploy all contracts with membership integration
- Start Graph node infrastructure
- Deploy subgraph with membership schema
- Start frontend development server

### 3. Access Services
- **Frontend**: http://localhost:3000
- **Subgraph**: http://localhost:8000/subgraphs/name/gamedao/protocol
- **Graph Node**: http://localhost:8020
- **Hardhat Node**: http://localhost:8545

## Detailed Setup

### Phase 1: Smart Contract Deployment

#### 1.1 Start Local Blockchain
```bash
# Start Hardhat node
make dev

# Or manually:
cd packages/contracts-solidity
npm run node
```

#### 1.2 Deploy Contracts with Membership Integration
```bash
# Deploy all contracts with membership architecture
make deploy-membership

# Or manually:
cd packages/contracts-solidity
npm run deploy:membership-localhost
```

#### 1.3 Verify Deployment
```bash
# Check contract sizes
make measure-contracts

# Check deployment addresses
cat packages/contracts-solidity/deployment-addresses.json
```

### Phase 2: Subgraph Setup

#### 2.1 Start Graph Node Infrastructure
```bash
# Start Docker services
make graph-node

# Check status
make graph-status
```

#### 2.2 Deploy Subgraph
```bash
# Build and deploy subgraph
make graph-deploy

# Or manually:
cd packages/subgraph
npm run codegen
npm run build
npm run create-local
npm run deploy-local
```

#### 2.3 Verify Subgraph
```bash
# Check GraphQL playground
open http://localhost:8000/subgraphs/name/gamedao/protocol

# Test query
curl -X POST \
  http://localhost:8000/subgraphs/name/gamedao/protocol \
  -H 'Content-Type: application/json' \
  -d '{"query": "{ globalStats { id totalOrganizations totalMembers } }"}'
```

### Phase 3: Frontend Setup

#### 3.1 Configure Environment
```bash
# Copy environment template
cp packages/frontend/.env.example packages/frontend/.env.local

# Update with contract addresses
# (addresses are auto-populated from deployment)
```

#### 3.2 Start Frontend
```bash
# Start development server
make dev-frontend

# Or manually:
cd packages/frontend
npm run dev
```

#### 3.3 Configure Wallet
1. Install MetaMask browser extension
2. Add localhost network:
   - Network Name: Localhost 8545
   - RPC URL: http://localhost:8545
   - Chain ID: 31337
   - Currency Symbol: ETH

3. Import test account:
   - Use private key from Hardhat console
   - Default test account has ETH and GAME tokens

## Testing Integration

### 1. Contract Testing
```bash
# Run all contract tests
make test-contracts

# Run membership integration tests
make test-membership

# Run with coverage
make test-coverage
```

### 2. Subgraph Testing
```bash
# Test subgraph mappings
cd packages/subgraph
npm run test

# Check indexing status
curl http://localhost:8020/graphql \
  -H 'Content-Type: application/json' \
  -d '{"query": "{ indexingStatuses { subgraph health } }"}'
```

### 3. Frontend Testing
```bash
# Run frontend tests (when available)
cd packages/frontend
npm run test

# Type checking
npm run type-check

# Linting
npm run lint
```

### 4. End-to-End Testing
```bash
# Generate test data
make scaffold

# Test complete flow:
# 1. Create organization
# 2. Add members
# 3. Create proposal
# 4. Vote on proposal
# 5. Execute proposal
```

## Deployment Guide

### Development Deployment
```bash
# Reset and deploy everything
make dev-reset

# Deploy with fresh data
make scaffold
```

### Testnet Deployment
```bash
# Deploy to Sepolia testnet
make deploy-membership NETWORK=sepolia

# Verify contracts
make verify NETWORK=sepolia
```

### Production Deployment
```bash
# Deploy to mainnet (requires confirmation)
make deploy-membership NETWORK=mainnet

# Verify contracts
make verify NETWORK=mainnet
```

## Troubleshooting

### Common Issues

#### 1. Contract Deployment Failures
```bash
# Check node is running
curl -X POST http://localhost:8545 \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Reset and redeploy
make dev-reset
```

#### 2. Subgraph Sync Issues
```bash
# Check Graph node logs
docker logs gamedao-graph-node

# Restart Graph services
make graph-stop
make graph-node
make graph-deploy
```

#### 3. Frontend Connection Issues
```bash
# Check contract addresses
make status

# Verify environment variables
cat packages/frontend/.env.local

# Check wallet network
# Ensure MetaMask is on localhost:8545
```

#### 4. Port Conflicts
```bash
# Check port usage
lsof -i :3000  # Frontend
lsof -i :8545  # Hardhat
lsof -i :8000  # Graph
lsof -i :8020  # Graph node

# Kill processes if needed
kill -9 <PID>
```

### Error Messages and Solutions

#### "Contract size exceeds limit"
- **Solution**: Use membership-integrated contracts
- **Command**: `make deploy-membership`

#### "Subgraph deployment failed"
- **Solution**: Ensure Graph node is running
- **Commands**:
  ```bash
  make graph-stop
  make graph-node
  make graph-deploy
  ```

#### "Frontend can't connect to contracts"
- **Solution**: Check contract addresses and network
- **Commands**:
  ```bash
  make status
  # Check MetaMask network settings
  ```

## Advanced Configuration

### Custom Network Configuration
```bash
# Add custom network to hardhat.config.ts
networks: {
  customNetwork: {
    url: "https://rpc.custom.network",
    accounts: [process.env.PRIVATE_KEY]
  }
}

# Deploy to custom network
make deploy-membership NETWORK=customNetwork
```

### Subgraph Configuration
```yaml
# Update subgraph.yaml for custom network
dataSources:
  - kind: ethereum
    name: GameDAORegistry
    network: customNetwork  # Change network
    source:
      address: "0x..."      # Update addresses
      startBlock: 12345     # Set start block
```

### Frontend Configuration
```typescript
// Add custom chain to wagmi config
import { defineChain } from 'viem'

const customChain = defineChain({
  id: 12345,
  name: 'Custom Network',
  network: 'custom',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.custom.network'],
    },
  },
})
```

### Performance Optimization
```bash
# Optimize contract compilation
export HARDHAT_COMPILE_CACHE=true

# Use faster node for development
npm install --global @ethereumjs/client
ethereumjs --rpc --rpcport 8545 --rpcaddr 0.0.0.0
```

## Monitoring and Maintenance

### Health Checks
```bash
# Check all services
make status

# Monitor Graph node
make graph-status

# Check contract addresses
make docs
```

### Log Monitoring
```bash
# Hardhat node logs
tail -f packages/contracts-solidity/hardhat.log

# Graph node logs
docker logs -f gamedao-graph-node

# Frontend logs
# Check browser console
```

### Performance Monitoring
```bash
# Contract gas usage
make test-gas

# Subgraph sync status
curl http://localhost:8020/graphql \
  -H 'Content-Type: application/json' \
  -d '{"query": "{ indexingStatuses { chains { chainHeadBlock { number } latestBlock { number } } } }"}'
```

## Development Workflow

### Daily Development
```bash
# Start development environment
make dev-full

# Make changes to contracts
# ... edit contracts ...

# Redeploy and test
make dev-reset
make scaffold
```

### Testing Workflow
```bash
# Run all tests
make test

# Test specific functionality
make test-membership

# Generate coverage report
make test-coverage
```

### Deployment Workflow
```bash
# Test locally
make dev-reset
make scaffold

# Deploy to testnet
make deploy-membership NETWORK=sepolia

# Verify and test
make verify NETWORK=sepolia

# Deploy to mainnet
make deploy-membership NETWORK=mainnet
```

## Best Practices

### Development
- **Use make commands** for consistent operations
- **Test thoroughly** before deployment
- **Monitor contract sizes** to stay under limits
- **Keep documentation updated** with changes

### Security
- **Never commit private keys** to version control
- **Use environment variables** for sensitive data
- **Test on testnets** before mainnet deployment
- **Verify contracts** on block explorers

### Performance
- **Use batch operations** where possible
- **Monitor gas usage** in tests
- **Optimize subgraph queries** for efficiency
- **Cache frequently accessed data** in frontend

## Conclusion

The GameDAO v3 end-to-end integration provides a complete, production-ready protocol suite with:

- **Unified membership architecture** across all components
- **Automated deployment and testing** via Makefile
- **Comprehensive monitoring** and debugging tools
- **Scalable foundation** for future enhancements

Follow this guide to set up a complete GameDAO v3 development environment and deploy the full protocol suite with confidence.

---

*Last updated: July 2025*
*Version: 3.0.0*
*Status: Production Ready*
