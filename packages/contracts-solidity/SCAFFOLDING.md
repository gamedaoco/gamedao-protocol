# GameDAO Test Data Scaffolding

This scaffolding system generates realistic, interconnected test data for GameDAO protocol development and frontend testing.

## Overview

The scaffolding system creates:
- **Users**: Mock gaming professionals with roles and profiles
- **DAOs**: Gaming-focused organizations with realistic member distributions
- **Campaigns**: Crowdfunding campaigns linked to DAOs with contributions
- **Proposals**: Governance proposals with voting activity

All data is interconnected - DAO members exist as users, campaigns belong to DAOs, proposals are created by DAO members, etc.

## Quick Start

### 1. Deploy Contracts
```bash
cd packages/contracts-solidity
npm run deploy:localhost
```

### 2. Generate Test Data
```bash
# Generate all test data and copy to frontend
npm run scaffold:full

# Or run steps separately:
npm run scaffold        # Generate data
npm run scaffold:copy   # Copy to frontend
```

### 3. Use in Frontend
The scaffold data is automatically available in your frontend at `/scaffold-data.json` and through the scaffold utilities.

## Configuration

Edit `scripts/scaffold.ts` to customize:

```typescript
const CONFIG = {
  users: 12,        // Number of mock users
  daos: 5,          // Number of DAOs
  campaigns: 8,     // Number of campaigns
  proposals: 6,     // Number of proposals
}
```

## Generated Data Structure

### Users (12 gaming professionals)
```json
{
  "address": "0x...",
  "name": "Alice Chen",
  "role": "Game Developer",
  "avatar": "👩‍💻"
}
```

### DAOs (5 gaming organizations)
```json
{
  "id": "0x...",
  "name": "Indie Game Collective",
  "description": "Independent game developers...",
  "members": ["0x...", "0x..."],
  "treasury": "0x...",
  "creator": "0x..."
}
```

### Campaigns (8 crowdfunding campaigns)
```json
{
  "id": "0x...",
  "title": "Fantasy RPG: Chronicles of Etheria",
  "daoId": "0x...",
  "daoName": "Indie Game Collective",
  "target": "25",
  "creator": "0x..."
}
```

### Proposals (6 governance proposals)
```json
{
  "id": "0x...",
  "title": "Increase Marketing Budget",
  "daoId": "0x...",
  "daoName": "Indie Game Collective",
  "proposer": "0x..."
}
```

## Data Relationships

- **Users ↔ DAOs**: Users are members of multiple DAOs
- **DAOs ↔ Campaigns**: Each campaign belongs to a DAO, created by members
- **DAOs ↔ Proposals**: Proposals are created by DAO members
- **Campaigns**: Include realistic contributions from various users
- **Proposals**: Include voting activity from DAO members

## Frontend Integration

### Loading Scaffold Data
```typescript
import { getScaffoldData, getUserProfile } from '@/lib/scaffold-data'

// Get all scaffold data
const data = getScaffoldData()

// Get user profile by address
const profile = getUserProfile(userAddress)
```

### Helper Functions
```typescript
// Get user's DAOs
const userDAOs = getUserDAOs(userAddress)

// Get user's campaigns
const userCampaigns = getUserCampaigns(userAddress)

// Get DAO members
const members = getDAOMembers(daoId)

// Get DAO campaigns
const campaigns = getDAOCampaigns(daoId)
```

## Development Workflow

### 1. Start Local Node
```bash
npm run node
```

### 2. Deploy & Scaffold (in new terminal)
```bash
npm run deploy:localhost
npm run scaffold:full
```

### 3. Develop Frontend
The frontend now has realistic test data with proper relationships between users, DAOs, campaigns, and proposals.

### 4. Reset Data
```bash
# Generate fresh data
npm run scaffold:full

# Or clear frontend data
import { clearScaffoldData } from '@/lib/scaffold-data'
clearScaffoldData()
```

## Mock Data Themes

### Gaming Professionals
- Game Developers, Artists, Audio Designers
- Esports Organizers, Streamers, Producers
- Blockchain Developers, Marketing Specialists

### DAO Types
- Indie Game Collective
- Esports Alliance
- NFT Gaming Hub
- VR Game Studios
- Mobile Gaming Guild

### Campaign Examples
- Fantasy RPG: Chronicles of Etheria
- Cyberpunk Racing League
- VR Mystic Realms
- Retro Arcade Revival

### Proposal Types
- Marketing Budget Allocation
- Developer Role Creation
- Partnership Proposals
- Community Event Funding

## Troubleshooting

### No scaffold data generated
- Ensure local node is running: `npm run node`
- Check REGISTRY_ADDRESS is set after deployment
- Verify contracts deployed successfully

### Frontend not loading data
- Run `npm run scaffold:copy` to copy data
- Check `packages/frontend/public/scaffold-data.json` exists
- Clear browser cache/localStorage

### Contract interaction errors
- Ensure you're using accounts from the local node
- Check contract addresses in scaffold output
- Verify sufficient ETH balance in accounts

## Output Files

- `packages/contracts-solidity/scaffold-output.json` - Raw scaffold data
- `packages/frontend/public/scaffold-data.json` - Frontend-accessible data
- Console logs during scaffolding show creation progress

This scaffolding system provides a comprehensive foundation for frontend development with realistic, interconnected test data that mirrors real-world GameDAO usage patterns.
