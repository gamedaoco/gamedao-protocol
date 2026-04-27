# Packages/Shared Integration - Single Source of Truth

## Overview

The `packages/shared` package serves as the **single source of truth** for all contract ABIs, types, and addresses across the GameDAO Protocol ecosystem. This ensures consistency and eliminates duplication across packages.

## Architecture

```
packages/shared/
├── src/
│   ├── abis.ts          # Contract ABIs (exported from contracts)
│   ├── addresses.ts     # Deployment addresses by network
│   ├── types.ts         # TypeScript interfaces and types
│   └── constants.ts     # Protocol constants
├── dist/               # Compiled outputs
└── package.json       # @gamedao/evm package
```

## Package Dependencies

### ✅ Frontend (`packages/frontend`)
- **Uses**: `@gamedao/evm` for ABIs, addresses, types
- **Benefit**: Type-safe contract interactions

### ✅ Subgraph (`packages/subgraph`)
- **Uses**: `@gamedao/evm` for ABIs and addresses
- **Automation**: ABIs automatically copied before build
- **Scripts**: `copy-abis.js` and `update-addresses.js`

### ✅ Contracts (`packages/contracts-solidity`)
- **Exports**: ABIs to shared package after compilation
- **Updates**: Addresses in shared package after deployment

## Workflow

### 1. Contract Development
```bash
# In contracts-solidity/
npm run compile          # Compile contracts
npm run deploy:localhost # Deploy and update addresses
# → ABIs and addresses automatically exported to shared
```

### 2. Subgraph Development
```bash
# In subgraph/
npm run build           # Automatically copies ABIs and addresses
npm run deploy-local    # Deploy to local Graph node
```

### 3. Frontend Development
```bash
# In frontend/
npm run dev             # Uses shared ABIs and addresses
# → Type-safe contract interactions
```

## Benefits

### ✅ **Single Source of Truth**
- All ABIs maintained in one place
- Addresses managed centrally
- Types shared across packages

### ✅ **Automatic Synchronization**
- Subgraph ABIs updated automatically
- No manual copying required
- Consistent across all packages

### ✅ **Type Safety**
- Shared TypeScript types
- Contract interfaces consistent
- Compile-time error detection

### ✅ **Developer Experience**
- Clear package boundaries
- Simplified maintenance
- Reduced duplication

## Implementation Details

### Subgraph ABI Management

**Before (Manual)**:
```bash
# Manual copying required
cp contracts/artifacts/Control.json subgraph/abis/
cp contracts/artifacts/Flow.json subgraph/abis/
# ... for every contract
```

**After (Automatic)**:
```bash
# Automatic sync from shared package
npm run build  # Runs prebuild → copy-abis → update-addresses
```

### Scripts

#### `copy-abis.js`
```javascript
// Copies ABIs from @gamedao/evm to subgraph/abis/
const { CONTROL_ABI, FLOW_ABI } = require('@gamedao/evm/dist/abis');
// → Converts to Graph-compatible format
```

#### `update-addresses.js`
```javascript
// Updates contract addresses in subgraph.yaml
const { LOCAL_ADDRESSES } = require('@gamedao/evm/dist/addresses');
// → Replaces addresses in subgraph configuration
```

## Adding New Contracts

### 1. Add to Shared Package
```typescript
// packages/shared/src/abis.ts
export const NEW_CONTRACT_ABI = [...];

// packages/shared/src/addresses.ts
export const LOCAL_ADDRESSES = {
  // ... existing
  NEW_CONTRACT: "0x..."
};
```

### 2. Update Subgraph
```javascript
// packages/subgraph/scripts/copy-abis.js
const abiMap = {
  // ... existing
  'NewContract.json': NEW_CONTRACT_ABI
};
```

### 3. Update Frontend
```typescript
// Automatically available
import { NEW_CONTRACT_ABI } from '@gamedao/evm';
```

## File Structure

```
packages/
├── shared/                 # 📦 Single source of truth
│   ├── src/abis.ts        # Contract ABIs
│   ├── src/addresses.ts   # Contract addresses
│   └── src/types.ts       # Shared types
├── subgraph/              # 📊 Indexing
│   ├── scripts/
│   │   ├── copy-abis.js   # 🔄 Auto-sync ABIs
│   │   └── update-addresses.js # 🔄 Auto-sync addresses
│   └── abis/              # Generated from shared
├── frontend/              # 🌐 Web interface
│   └── uses @gamedao/evm  # Direct dependency
└── contracts-solidity/    # 📋 Smart contracts
    └── exports to shared  # After deployment
```

## Development Commands

```bash
# Subgraph development
cd packages/subgraph
npm run copy-abis          # Manual ABI sync
npm run update-addresses   # Manual address sync
npm run build             # Automatic sync + build

# Frontend development
cd packages/frontend
npm run dev               # Uses shared package directly

# Full development reset
make docker-deploy-all    # Reset Docker stack, deploy contracts, enable modules,
                          # grant admin, fund default account, scaffold dev data
```

## Status

### ✅ **Implemented**
- Subgraph ABI synchronization
- Address management
- Type sharing
- Documentation

### ✅ **Working**
- `make docker-deploy-all` one-shot bootstrap
- Automatic builds
- Development workflow

### 🔄 **Benefits Achieved**
- Single source of truth established
- Automatic synchronization working
- Developer experience improved
- Maintenance simplified

This implementation ensures that `packages/shared` is the definitive source for all contract-related data, eliminating duplication and ensuring consistency across the entire GameDAO Protocol ecosystem.
