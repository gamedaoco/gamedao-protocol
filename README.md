# GameDAO Protocol

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%203.0-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![CI](https://github.com/gamedaoco/gamedao-protocol/actions/workflows/ci.yml/badge.svg)](https://github.com/gamedaoco/gamedao-protocol/actions/workflows/ci.yml)
[![Solidity Tests](https://github.com/gamedaoco/gamedao-protocol/actions/workflows/solidity-tests.yml/badge.svg)](https://github.com/gamedaoco/gamedao-protocol/actions/workflows/solidity-tests.yml)
[![Frontend Tests](https://github.com/gamedaoco/gamedao-protocol/actions/workflows/frontend-tests.yml/badge.svg)](https://github.com/gamedaoco/gamedao-protocol/actions/workflows/frontend-tests.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2+-black.svg)](https://nextjs.org/)
[![Hardhat](https://img.shields.io/badge/Hardhat-2.19+-yellow.svg)](https://hardhat.org/)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.20+-blue.svg)](https://soliditylang.org/)

> **Decentralized Autonomous Organizations for Gaming Communities**

GameDAO Protocol is a comprehensive Web3 platform that enables gaming communities to create, manage, and participate in decentralized autonomous organizations (DAOs). Built on Ethereum with Substrate pallets for enhanced functionality, GameDAO provides the tools necessary for transparent governance, fundraising, reputation systems, and community engagement.

## 🏗️ Architecture

GameDAO Protocol consists of four main modules working together:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     CONTROL     │    │      FLOW       │    │     SIGNAL      │    │      SENSE      │
│                 │    │                 │    │                 │    │                 │
│ Organization    │    │ Campaign        │    │ Proposal        │    │ Profile         │
│ Management      │    │ Fundraising     │    │ Governance      │    │ Reputation      │
│ Member Access   │    │ Treasury        │    │ Voting          │    │ Achievements    │
│ Role System     │    │ Rewards         │    │ Consensus       │    │ Social Graph    │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │                       │
         └───────────────────────┼───────────────────────┼───────────────────────┘
                                 │                       │
                    ┌─────────────────────────────────────────────────────┐
                    │              GAMEDAO REGISTRY                       │
                    │         Central coordination and state              │
                    └─────────────────────────────────────────────────────┘
```

### Core Modules

- **🎮 CONTROL**: Organization creation, membership management, and access control
- **💰 FLOW**: Fundraising campaigns, treasury management, and reward distribution
- **🗳️ SIGNAL**: Governance proposals, voting mechanisms, and consensus building
- **👤 SENSE**: User profiles, reputation tracking, and achievement systems

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm/pnpm
- Git
- Ethereum wallet (MetaMask recommended)

### Installation

```bash
# Clone the repository
git clone https://github.com/gamedaoco/gamedao-protocol.git
cd gamedao-protocol

# Install dependencies
pnpm install

# Start local blockchain
cd packages/contracts-solidity
pnpm run node

# Deploy contracts (in new terminal)
pnpm run deploy:localhost

# Start frontend development server (in new terminal)
cd packages/frontend
pnpm run dev
```

Visit `http://localhost:3000` to access the GameDAO frontend.

## 🚀 CI/CD Status

Our continuous integration pipeline ensures code quality and reliability:

### Solidity Contracts
- **Tests**: Comprehensive test suite with coverage reporting
- **Security**: Automated security analysis with Slither and Mythril
- **Gas Optimization**: Gas usage reporting and optimization checks
- **Contract Size**: Validation that contracts stay under 24KB limit
- **Deployment**: Automated deployment testing on local networks

### Quality Gates
- ✅ All tests must pass
- ✅ Coverage threshold maintained
- ✅ Security vulnerabilities addressed
- ✅ Contract size limits enforced
- ✅ Compilation warnings resolved

The pipeline runs on every push and pull request to ensure consistent quality.

## 📁 Project Structure

```
gamedao-protocol/
├── packages/
│   ├── contracts-solidity/     # Ethereum smart contracts
│   │   ├── contracts/
│   │   │   ├── core/          # Registry and base contracts
│   │   │   ├── modules/       # CONTROL, FLOW, SIGNAL, SENSE
│   │   │   ├── interfaces/    # Contract interfaces
│   │   │   └── staking/       # Staking mechanisms
│   │   ├── test/              # Contract tests
│   │   └── scripts/           # Deployment scripts
│   ├── frontend/              # Next.js web application
│   │   ├── src/
│   │   │   ├── app/           # App router pages
│   │   │   ├── components/    # Reusable UI components
│   │   │   ├── hooks/         # Custom React hooks
│   │   │   └── lib/           # Utilities and configurations
│   │   └── public/            # Static assets
│   ├── pallets/               # Substrate runtime modules
│   │   ├── control/           # Organization management
│   │   ├── flow/              # Campaign and treasury
│   │   ├── signal/            # Governance and voting
│   │   ├── sense/             # Reputation and profiles
│   │   └── traits/            # Shared traits and types
│   └── subgraph/              # The Graph protocol indexing
│       ├── src/               # Subgraph mappings
│       └── schema.graphql     # GraphQL schema
└── docs/                      # Documentation
```

## 🛠️ Development

### Smart Contracts

The smart contracts are built with Hardhat and OpenZeppelin:

```bash
cd packages/contracts-solidity

# Compile contracts
pnpm run build

# Run tests
pnpm run test

# Deploy to local network
pnpm run deploy:localhost

# Verify contracts
pnpm run verify
```

### Frontend Development

The frontend is built with Next.js 14, TypeScript, and Tailwind CSS:

```bash
cd packages/frontend

# Start development server
pnpm run dev

# Build for production
pnpm run build

# Run type checking
pnpm run type-check

# Run linting
pnpm run lint
```

### Substrate Pallets

The Substrate pallets provide enhanced functionality:

```bash
cd packages/pallets

# Build pallets
cargo build --release

# Run tests
cargo test

# Check code
cargo check
```

## 🔧 Configuration

### Environment Variables

Create `.env.local` in the frontend package:

```env
# Blockchain Configuration
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_RPC_URL=http://localhost:8545
NEXT_PUBLIC_SUBGRAPH_URL=http://localhost:8000/subgraphs/name/gamedao

# IPFS Configuration (optional)
NEXT_PUBLIC_PINATA_API_KEY=your_pinata_key
NEXT_PUBLIC_PINATA_SECRET_KEY=your_pinata_secret

# Application Settings
NEXT_PUBLIC_APP_NAME=GameDAO Protocol
NEXT_PUBLIC_APP_DESCRIPTION=Decentralized Gaming Communities
```

### Contract Addresses

After deployment, contract addresses are automatically saved to `deployment-addresses.json` and used by the frontend.

## 🎯 Usage

### Creating an Organization

1. Connect your wallet
2. Navigate to "Organizations" → "Create"
3. Fill in organization details
4. Set governance parameters
5. Deploy your DAO

### Running a Campaign

1. Join or create an organization
2. Navigate to "Campaigns" → "Create"
3. Set funding goals and timeline
4. Define reward structure
5. Launch campaign

### Governance Participation

1. Join an organization
2. View active proposals in "Governance"
3. Vote on proposals that interest you
4. Create new proposals if you have permissions
5. Track voting results and implementation

### Building Reputation

1. Create your profile in "Profiles"
2. Participate in organizations and campaigns
3. Vote on governance proposals
4. Complete achievements
5. Build your reputation score

## 🧪 Testing

### Smart Contract Tests

```bash
cd packages/contracts-solidity
pnpm run test

# Run specific test file
pnpm run test test/Control.test.ts

# Run with coverage
pnpm run test:coverage

# Run gas analysis
pnpm run test:gas
```

### Frontend Tests

```bash
cd packages/frontend

# Run unit tests (when implemented)
pnpm run test

# Run E2E tests (when implemented)
pnpm run test:e2e
```

## 🚀 Deployment

### Smart Contracts

Deploy to various networks:

```bash
# Sepolia testnet
pnpm run deploy:testnet

# Ethereum mainnet
pnpm run deploy:mainnet

# Verify contracts
pnpm run verify --network sepolia
```

### Frontend

Deploy to Vercel:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd packages/frontend
vercel --prod
```

### Subgraph

Deploy to The Graph:

```bash
cd packages/subgraph

# Build subgraph
pnpm run build

# Deploy to hosted service
pnpm run deploy
```

## 🔐 Security

### Smart Contract Security

- All contracts inherit from OpenZeppelin's secure base contracts
- Access control implemented via role-based permissions
- Reentrancy protection on all state-changing functions
- Comprehensive test coverage for security scenarios

### Frontend Security

- Environment variables for sensitive configuration
- Wallet connection security best practices
- Input validation and sanitization
- HTTPS enforcement in production

### Audit Status

- ⏳ **Smart Contracts**: Security audit pending
- ✅ **Dependencies**: Regular automated security scans
- ✅ **Code Quality**: ESLint and TypeScript strict mode

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Commit your changes: `git commit -m 'Add amazing feature'`
5. Push to the branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

### Code Standards

- TypeScript for type safety
- ESLint for code quality
- Prettier for code formatting
- Conventional commits for clear history

## 📚 Documentation

- [Architecture Guide](docs/architecture/)
- [API Documentation](docs/api/)
- [User Guides](docs/guides/)
- [Contract Management](docs/CONTRACT_MANAGEMENT.md)

## 🔗 Links

- **Website**: [gamedao.co](https://gamedao.co)
- **Documentation**: [docs.gamedao.co](https://docs.gamedao.co)
- **Discord**: [discord.gg/gamedao](https://discord.gg/gamedao)
- **Twitter**: [@gamedaoco](https://twitter.com/gamedaoco)
- **GitHub**: [github.com/gamedaoco](https://github.com/gamedaoco)

## 📄 License

This project is licensed under the GNU Affero General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

The AGPL-3.0 license ensures that:
- The source code remains open and available
- Any modifications must be shared back to the community
- Network use (like web applications) requires source disclosure
- Commercial use is permitted under the copyleft terms

## 🙏 Acknowledgments

- OpenZeppelin for secure smart contract primitives
- Substrate for blockchain runtime framework
- The Graph for decentralized indexing
- Next.js and Vercel for frontend infrastructure
- The broader Web3 and gaming communities

---

**Built with ❤️ by the GameDAO community**
