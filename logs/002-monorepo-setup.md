# GameDAO Protocol Monorepo Setup

**Date:** 2024-01-XX
**Phase:** Repository Restructuring
**Status:** In Progress

## Proposed Monorepo Structure

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
│   │   │   │   └── Battlepass/     # Engagement
│   │   │   ├── interfaces/         # Contract interfaces
│   │   │   ├── libraries/          # Utility libraries
│   │   │   └── test/              # Test contracts
│   │   ├── test/                   # Test files
│   │   ├── scripts/                # Deployment scripts
│   │   ├── hardhat.config.ts       # Hardhat configuration
│   │   └── package.json
│   │
│   ├── contracts-ink/              # Original ink! contracts (preserved)
│   │   ├── control/
│   │   ├── flow/
│   │   ├── signal/
│   │   ├── sense/
│   │   └── battlepass/
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
│   └── shared/                     # Shared utilities
│       ├── types/                  # Shared TypeScript types
│       ├── constants/              # Shared constants
│       ├── utils/                  # Utility functions
│       └── package.json
│
├── apps/                           # Applications
│   └── demo/                      # Demo application
│       ├── src/
│       ├── package.json
│       └── README.md
│
├── tools/                         # Build tools and scripts
│   ├── scripts/                   # Deployment and utility scripts
│   └── configs/                   # Shared configurations
│
├── docs/                          # Documentation
│   ├── architecture/              # Architecture docs
│   ├── api/                      # API documentation
│   ├── guides/                   # User guides
│   └── examples/                 # Code examples
│
├── package.json                   # Root package.json
├── pnpm-workspace.yaml           # pnpm workspace config
├── turbo.json                    # Turborepo config
├── .gitignore
└── README.md
```

## Technology Stack

### Package Management
- **pnpm**: Fast, disk space efficient package manager
- **Turborepo**: High-performance build system for monorepos

### Smart Contract Development
- **Hardhat**: Ethereum development environment
- **TypeScript**: Type-safe development
- **OpenZeppelin**: Security-audited contract library
- **Foundry**: Advanced testing framework

### Frontend Development
- **Next.js 14**: React framework with App Router
- **shadcn/ui**: Modern UI component library
- **Tailwind CSS**: Utility-first CSS framework
- **TanStack Query**: Data fetching and caching
- **Wagmi + Viem**: Ethereum integration

### Development Tools
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Husky**: Git hooks
- **Commitizen**: Conventional commits
- **Changesets**: Version management

## Setup Steps

1. Initialize monorepo structure
2. Configure package management
3. Set up smart contract development
4. Initialize frontend application
5. Configure development tools
6. Set up CI/CD pipeline

## Benefits of This Structure

1. **Modularity**: Each package is independently testable and deployable
2. **Code Sharing**: Shared types and utilities across packages
3. **Development Efficiency**: Turborepo for fast builds
4. **Type Safety**: TypeScript across the entire stack
5. **Scalability**: Easy to add new modules or applications
6. **Maintainability**: Clear separation of concerns

## Next Actions

1. Create the directory structure
2. Initialize package.json files
3. Configure workspace settings
4. Set up development environment
5. Create initial contracts
