# @gamedao/evm

GameDAO Protocol EVM contract ABIs and TypeScript types for seamless integration with GameDAO smart contracts.

## Overview

This package provides:
- **Contract ABIs**: Auto-generated from compiled Solidity contracts
- **TypeScript Types**: Strongly typed interfaces for all contract interactions
- **Contract Addresses**: Network-specific contract addresses
- **Constants**: Common constants used across the GameDAO ecosystem

## Installation

```bash
npm install @gamedao/evm
# or
yarn add @gamedao/evm
# or
pnpm add @gamedao/evm
```

## Usage

### Importing ABIs

```typescript
import {
  REGISTRY_ABI,
  CONTROL_ABI,
  MEMBERSHIP_ABI,
  FLOW_ABI,
  SIGNAL_ABI,
  SENSE_ABI,
  IDENTITY_ABI,
  STAKING_ABI,
  TREASURY_ABI
} from '@gamedao/evm';

// Or import all ABIs at once
import { ABIS } from '@gamedao/evm';
```

### Getting Contract Addresses

```typescript
import { getContractAddress, getAddressesForNetwork } from '@gamedao/evm';

// Get a specific contract address
const registryAddress = getContractAddress('REGISTRY', 1); // Mainnet

// Get all addresses for a network
const addresses = getAddressesForNetwork(31337); // Localhost
```

### Using Types

```typescript
import type {
  OrganizationInfo,
  MemberInfo,
  CampaignInfo,
  ProposalInfo
} from '@gamedao/evm';

// Type-safe contract interactions
const organization: OrganizationInfo = await contract.read.getOrganization([orgId]);
```

### Using with Viem

```typescript
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { REGISTRY_ABI, getContractAddress } from '@gamedao/evm';

const client = createPublicClient({
  chain: mainnet,
  transport: http()
});

const registryAddress = getContractAddress('REGISTRY', mainnet.id);

const organizationCount = await client.readContract({
  address: registryAddress,
  abi: REGISTRY_ABI,
  functionName: 'getOrganizationCount'
});
```

### Using with Wagmi

```typescript
import { useReadContract } from 'wagmi';
import { CONTROL_ABI, getContractAddress } from '@gamedao/evm';

function useOrganization(orgId: string) {
  return useReadContract({
    address: getContractAddress('CONTROL', 1),
    abi: CONTROL_ABI,
    functionName: 'getOrganization',
    args: [orgId]
  });
}
```

## Available Contracts

### Core Contracts
- **Registry**: Central registry for all GameDAO modules and organizations
- **Treasury**: Multi-token treasury management
- **Module**: Base contract for all GameDAO modules

### Module Contracts
- **Control**: Organization creation and management
- **Membership**: Comprehensive membership management
- **Flow**: Crowdfunding and campaign management
- **Signal**: Voting and governance system
- **Sense**: Reputation and achievement system
- **Identity**: User identity and profile management
- **Staking**: Token staking and rewards

## Network Support

### Supported Networks
- **Mainnet** (Chain ID: 1)
- **Sepolia Testnet** (Chain ID: 11155111)
- **Localhost** (Chain ID: 31337)

### Network Configuration

```typescript
import { NETWORK_CONFIG } from '@gamedao/evm';

// Access network configuration
const mainnetConfig = NETWORK_CONFIG[1];
console.log(mainnetConfig.name); // 'mainnet'
console.log(mainnetConfig.addresses.REGISTRY); // Registry address on mainnet
```

## Constants

```typescript
import {
  ORGANIZATION_TYPES,
  MEMBER_ROLES,
  VOTING_TYPES,
  TIME_CONSTANTS,
  DEFAULT_CONFIG,
  GAS_LIMITS
} from '@gamedao/evm';

// Use predefined constants
const daoType = ORGANIZATION_TYPES.DAO;
const votingPeriod = TIME_CONSTANTS.WEEK;
const gasLimit = GAS_LIMITS.CREATE_ORGANIZATION;
```

## Types Reference

### Organization Types
- `OrganizationInfo`: Complete organization information
- `OrganizationConfig`: Organization configuration settings
- `OrganizationState`: Organization state enumeration

### Membership Types
- `MemberInfo`: Member information and status
- `MemberState`: Member state enumeration
- `MembershipTier`: Membership tier levels

### Campaign Types (Flow)
- `CampaignInfo`: Campaign details and status
- `CampaignState`: Campaign state enumeration

### Proposal Types (Signal)
- `ProposalInfo`: Proposal details and voting results
- `ProposalState`: Proposal state enumeration

### Other Types
- `AchievementInfo`: Achievement details (Sense)
- `StakingPoolInfo`: Staking pool information
- `ProfileInfo`: User profile information (Identity)
- `TreasuryInfo`: Treasury configuration

## Auto-Generation

This package is automatically updated when contracts are compiled:

1. **ABIs** are extracted from Hardhat compilation artifacts
2. **Contract addresses** are updated from deployment scripts
3. **Types** are maintained to match contract interfaces

To update the package after contract changes:

```bash
cd packages/contracts-solidity
npm run build  # Compiles contracts and updates shared package
```

## Development

### Building the Package

```bash
npm run build
```

### Watching for Changes

```bash
npm run dev
```

### Cleaning Build Artifacts

```bash
npm run clean
```

## Contributing

When adding new contracts:

1. Add the contract to the `CONTRACT_MAPPING` in `update-shared-package.js`
2. Update the `NetworkAddresses` interface in `addresses.ts`
3. Add corresponding types to `types.ts`
4. Update this README with the new contract information

## License

This package is part of the GameDAO Protocol and follows the same license terms.

## Links

- [GameDAO Protocol](https://github.com/gamedaoco/gamedao-protocol)
- [Documentation](https://docs.gamedao.co)
- [Website](https://gamedao.co)
