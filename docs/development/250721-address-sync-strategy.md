# Contract Address Synchronization Strategy

## Problem Statement
Contract addresses become out of sync across frontend, subgraph, shared packages, and deployment artifacts, causing integration failures that require multiple manual fixes.

## Solution Architecture

### 1. Single Source of Truth
- **Primary Source**: `packages/contracts-solidity/deployment-addresses.json`
- **Generated during deployment**: Always reflects actual deployed contracts
- **Format**: Standardized JSON with network identification

### 2. Automated Propagation Chain
```
Deployment → deployment-addresses.json → shared package → frontend/subgraph
```

### 3. Implementation Strategy

#### A. Enhanced Deployment Script
```typescript
// packages/contracts-solidity/scripts/deploy.ts
- Always update deployment-addresses.json
- Trigger downstream updates automatically
- Validate addresses after deployment
```

#### B. Shared Package Auto-Sync
```javascript
// packages/shared/scripts/updateAddresses.js
- Read from deployment-addresses.json
- Update addresses.ts and abis automatically
- Validate all addresses are non-zero
```

#### C. Subgraph Auto-Update
```javascript
// packages/subgraph/scripts/update-addresses.js
- Read from shared package (not deployment directly)
- Update subgraph.yaml with correct addresses
- Regenerate types automatically
```

#### D. Makefile Integration
```makefile
# Root Makefile
deploy-local: contracts-deploy shared-update subgraph-update
contracts-deploy:
	cd packages/contracts-solidity && npm run deploy:localhost
shared-update:
	cd packages/shared && npm run build
subgraph-update:
	cd packages/subgraph && npm run update-addresses && npm run deploy-local
```

#### E. Validation Layer
- Pre-deployment: Check all components use same addresses
- Post-deployment: Verify addresses propagated correctly
- CI/CD: Automated address consistency checks

### 4. Developer Workflow
1. `make deploy-local` → Everything updates automatically
2. Single command deployment with full propagation
3. No manual address copying ever needed

### 5. Monitoring & Alerts
- Address mismatch detection
- Failed propagation warnings
- Integration test failures trigger address validation

## Implementation Priority
1. ✅ Fix immediate subgraph address sync
2. 🔄 Enhance deployment script with auto-propagation
3. 🔄 Update Makefile with unified commands
4. 🔄 Add validation layer
5. 🔄 CI/CD integration
