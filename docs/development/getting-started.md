---
migrated_from: logs/002-monorepo-setup.md
category: Development
original_date: 2024-01-XX
migrated_date: 2024-12-21
status: Updated Getting Started Guide
---

# Getting Started with GameDAO Protocol

> **Complete setup guide for developers working with GameDAO Protocol**

## Quick Start

Get up and running with GameDAO Protocol in 5 minutes:

```bash
# Clone the repository
git clone https://github.com/gamedaoco/gamedao-protocol.git
cd gamedao-protocol

# Install dependencies
pnpm install

# Start local blockchain
make dev

# Deploy contracts (in new terminal)
make deploy

# Start frontend (in new terminal)
make dev-frontend
```

Visit `http://localhost:3002` to access the GameDAO frontend.

## Prerequisites

### Required Software
- **Node.js 18+**: JavaScript runtime
- **pnpm**: Fast, disk space efficient package manager
- **Git**: Version control system

### Recommended Software
- **VS Code**: IDE with excellent TypeScript support
- **MetaMask**: Browser wallet for testing
- **Hardhat Extension**: VS Code extension for Solidity

### Installation
```bash
# Install Node.js (using nvm)
nvm install 18
nvm use 18

# Install pnpm
npm install -g pnpm

# Verify installations
node --version
pnpm --version
git --version
```

## Repository Structure

GameDAO Protocol uses a monorepo structure powered by pnpm workspaces and Turborepo:

```
gamedao-protocol/
├── packages/
│   ├── contracts-solidity/          # Solidity smart contracts
│   │   ├── contracts/
│   │   │   ├── core/               # Core registry and base contracts
│   │   │   ├── modules/            # Individual modules
│   │   │   │   ├── Control/        # DAO management
│   │   │   │   ├── Flow/           # Crowdfunding
│   │   │   │   ├── Signal/         # Governance
│   │   │   │   ├── Sense/          # Identity/Reputation
│   │   │   │   └── Battlepass/     # Engagement (planned)
│   │   │   ├── interfaces/         # Contract interfaces
│   │   │   ├── libraries/          # Utility libraries
│   │   │   └── test/              # Test contracts
│   │   ├── test/                   # Test files
│   │   ├── scripts/                # Deployment scripts
│   │   ├── hardhat.config.ts       # Hardhat configuration
│   │   └── package.json
│   │
│   ├── pallets/                    # Original Substrate pallets (preserved)
│   │   ├── control/
│   │   ├── flow/
│   │   ├── signal/
│   │   ├── sense/
│   │   └── battlepass/
│   │
│   ├── frontend/                   # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/               # App router
│   │   │   ├── components/        # React components
│   │   │   │   ├── ui/           # shadcn components
│   │   │   │   ├── modules/      # Module-specific components
│   │   │   │   └── layout/       # Layout components
│   │   │   ├── lib/              # Utilities and configurations
│   │   │   ├── hooks/            # Custom React hooks
│   │   │   ├── services/         # API services
│   │   │   └── types/            # TypeScript types
│   │   ├── public/
│   │   ├── package.json
│   │   └── next.config.js
│   │
│   ├── subgraph/                   # The Graph indexing
│   │   ├── src/
│   │   ├── schema.graphql
│   │   ├── subgraph.yaml
│   │   └── package.json
│   │
│   └── shared/                     # Shared utilities (planned)
│       ├── types/                  # Shared TypeScript types
│       ├── constants/              # Shared constants
│       ├── utils/                  # Utility functions
│       └── package.json
│
├── docs/                          # Documentation
│   ├── development/               # Developer documentation
│   ├── protocol/                  # Protocol specifications
│   ├── product/                   # Product requirements
│   └── gips/                      # Improvement proposals
│
├── logs/                          # Historical logs (legacy)
├── package.json                   # Root package.json
├── pnpm-workspace.yaml           # pnpm workspace config
├── turbo.json                    # Turborepo config
├── Makefile                      # Build automation
└── README.md
```

## Technology Stack

### Smart Contract Development
- **Hardhat**: Ethereum development environment
- **TypeScript**: Type-safe development
- **OpenZeppelin**: Security-audited contract library
- **Solidity 0.8.20+**: Latest Solidity features

### Frontend Development
- **Next.js 14**: React framework with App Router
- **shadcn/ui**: Modern UI component library
- **Tailwind CSS**: Utility-first CSS framework
- **Wagmi + Viem**: Ethereum integration
- **Apollo Client**: GraphQL data fetching

### Development Tools
- **pnpm**: Package manager with workspace support
- **Turborepo**: High-performance build system
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **TypeScript**: Type safety across the stack

## Development Workflow

### 1. Environment Setup

```bash
# Clone and install
git clone https://github.com/gamedaoco/gamedao-protocol.git
cd gamedao-protocol
pnpm install
```

### 2. Smart Contract Development

```bash
# Navigate to contracts
cd packages/contracts-solidity

# Install dependencies
pnpm install

# Compile contracts
pnpm run build

# Run tests
pnpm run test

# Start local node
pnpm run node

# Deploy contracts (in new terminal)
pnpm run deploy:localhost
```

### 3. Frontend Development

```bash
# Navigate to frontend
cd packages/frontend

# Install dependencies
pnpm install

# Start development server
pnpm run dev

# Open http://localhost:3000
```

### 4. Subgraph Development

```bash
# Navigate to subgraph
cd packages/subgraph

# Install dependencies
pnpm install

# Generate types
pnpm run codegen

# Build subgraph
pnpm run build

# Deploy locally (requires graph node)
pnpm run deploy:local
```

## Common Commands

The repository includes a comprehensive Makefile for common operations:

### Core Development
```bash
make dev              # Start local blockchain
make deploy          # Deploy contracts
make dev-frontend    # Start frontend development server
make test            # Run all tests
make build           # Build all packages
```

### Smart Contracts
```bash
make deploy-local    # Deploy to local network
make deploy-testnet  # Deploy to Sepolia testnet
make verify          # Verify contracts on Etherscan
make scaffold        # Generate test data
```

### Utilities
```bash
make status          # Show implementation status
make docs            # View documentation
make clean           # Clean all build artifacts
make update          # Update dependencies
```

## Environment Configuration

### 1. Environment Variables

Create `.env.local` in the frontend package:

```bash
# Blockchain Configuration
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_RPC_URL=http://localhost:8545
NEXT_PUBLIC_SUBGRAPH_URL=http://localhost:8000/subgraphs/name/gamedao

# Contract Addresses (auto-populated after deployment)
NEXT_PUBLIC_REGISTRY_ADDRESS_LOCAL=0x...
NEXT_PUBLIC_CONTROL_ADDRESS_LOCAL=0x...
NEXT_PUBLIC_FLOW_ADDRESS_LOCAL=0x...
NEXT_PUBLIC_SIGNAL_ADDRESS_LOCAL=0x...
NEXT_PUBLIC_SENSE_ADDRESS_LOCAL=0x...
```

### 2. Wallet Setup

Configure MetaMask for local development:
- **Network Name**: Localhost 8545
- **RPC URL**: http://localhost:8545
- **Chain ID**: 31337
- **Currency Symbol**: ETH

Import test accounts using private keys from Hardhat console.

## Testing

### Unit Tests
```bash
# Smart contract tests
cd packages/contracts-solidity
pnpm test

# Frontend tests (when available)
cd packages/frontend
pnpm test
```

### Integration Tests
```bash
# End-to-end contract testing
make test

# Full system testing with scaffolding
make scaffold
make dev-frontend
```

### Test Coverage
```bash
# Contract test coverage
cd packages/contracts-solidity
pnpm run test:coverage

# Generate gas reports
pnpm run test:gas
```

## Common Issues & Solutions

### Port Conflicts
If you encounter port conflicts:
```bash
# Check port usage
lsof -i :3000
lsof -i :8545

# Kill processes if needed
kill -9 <PID>
```

### Dependency Issues
```bash
# Clear node modules and reinstall
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install

# Clear all package node_modules
pnpm run clean
pnpm install
```

### Smart Contract Issues
```bash
# Clear Hardhat cache
cd packages/contracts-solidity
rm -rf cache artifacts

# Recompile contracts
pnpm run build
```

## Development Best Practices

### Code Quality
- **TypeScript**: Use strict mode for type safety
- **Linting**: Fix ESLint warnings before committing
- **Testing**: Write tests for new features
- **Documentation**: Document complex functions

### Git Workflow
- **Commits**: Use conventional commit messages
- **Branches**: Create feature branches for development
- **Pull Requests**: Use PR templates and require reviews
- **Testing**: Ensure all tests pass before merging

### Security
- **Access Control**: Use OpenZeppelin patterns
- **Input Validation**: Validate all user inputs
- **Reentrancy**: Protect against reentrancy attacks
- **Testing**: Include security test cases

## Next Steps

### For Smart Contract Developers
1. Explore the [Architecture Documentation](./architecture/)
2. Review [API Reference](./api/) for contract interfaces
3. Study existing modules in `packages/contracts-solidity/contracts/modules/`
4. Run the test suite to understand expected behavior

### For Frontend Developers
1. Examine the component structure in `packages/frontend/src/components/`
2. Understand the hook system in `packages/frontend/src/hooks/`
3. Review the integration patterns with smart contracts
4. Start the development server and explore the UI

### For Full Stack Developers
1. Deploy contracts locally and generate test data
2. Connect the frontend to your local contracts
3. Explore the subgraph for data indexing
4. Contribute to the documentation and examples

## Getting Help

### Documentation
- **Development**: [Development Documentation](../README.md)
- **Protocol**: [Protocol Documentation](../../protocol/README.md)
- **API Reference**: [API Documentation](../api/README.md)

### Community
- **Discord**: [GameDAO Community](https://discord.gg/gamedao)
- **GitHub**: [Repository Issues](https://github.com/gamedaoco/gamedao-protocol/issues)
- **Forum**: [Community Discussions](https://forum.gamedao.co)

### Support
- **Bug Reports**: Create GitHub issues with detailed reproduction steps
- **Feature Requests**: Use the GIP (GameDAO Improvement Proposal) process
- **Questions**: Ask in Discord #development channel

---

**Last Updated**: December 2024
**Version**: 1.0.0
**Maintainer**: GameDAO Development Team
