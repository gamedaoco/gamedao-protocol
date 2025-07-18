# GameDAO Protocol Subgraph

This subgraph indexes the GameDAO Protocol contracts and provides a GraphQL API for querying protocol data.

## Architecture

The subgraph uses `packages/shared` as the single source of truth for:
- **ABIs**: Contract ABIs are automatically copied from `@gamedao/evm`
- **Types**: Contract types and interfaces
- **Addresses**: Contract deployment addresses

## Development

### Prerequisites

- Node.js 18+
- Docker (for local Graph node)
- GameDAO Protocol contracts deployed

### Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **ABIs are automatically copied** from `packages/shared` before build:
   ```bash
   npm run copy-abis  # Manual copy if needed
   ```

3. **Generate types**:
   ```bash
   npm run codegen
   ```

4. **Build subgraph**:
   ```bash
   npm run build
   ```

### Local Development

1. **Start local Graph node** (run from project root):
   ```bash
   make graph-start
   ```

2. **Deploy subgraph**:
   ```bash
   npm run create-local
   npm run deploy-local
   ```

## ABI Management

ABIs are **automatically synced** from `packages/shared`:

- **Source**: `packages/shared/src/abis.ts`
- **Destination**: `packages/subgraph/abis/`
- **Automation**: `prebuild` script runs `copy-abis` before each build

### Benefits

- ✅ **Single source of truth**: All ABIs maintained in one place
- ✅ **Automatic sync**: No manual copying required
- ✅ **Type safety**: Shared types across frontend and subgraph
- ✅ **Consistency**: Contract addresses shared across packages

## Schema

The subgraph indexes:

- **Organizations**: DAOs and organizational structures
- **Campaigns**: Fundraising and flow campaigns
- **Proposals**: Governance proposals and votes
- **Memberships**: Organization membership data
- **Profiles**: User identity and reputation
- **Staking**: Token staking and rewards
- **Transactions**: All contract interactions

## Queries

Access the GraphQL playground at:
- **Local**: http://localhost:8020/subgraphs/name/gamedao/protocol
- **Testnet**: [Coming Soon]

## Status

Current indexing status:
- ✅ Registry Module
- ✅ Control Module
- ✅ Flow Module
- ✅ Signal Module
- ✅ Identity Module
- ✅ Membership Module
- ✅ Staking Module
- ⚠️ Sense Module (disabled - schema updates needed)

## Contributing

When adding new contracts:

1. Add ABI to `packages/shared/src/abis.ts`
2. Add mapping to `packages/subgraph/scripts/copy-abis.js`
3. Update subgraph.yaml with new data source
4. Create mapping file in `src/`
5. Update schema.graphql if needed
