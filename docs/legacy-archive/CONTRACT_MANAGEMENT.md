# GameDAO Protocol - Contract Management

This document explains how to manage contract addresses and environment configuration for the GameDAO Protocol.

## Overview

The GameDAO Protocol uses environment variables to manage contract addresses across different networks. This approach makes it easy to update addresses after deployments without modifying code.

## Environment Configuration

### Setup

1. **Create Environment File**
   ```bash
   make setup-env
   ```
   This copies `env.template` to `.env.local` with current contract addresses.

2. **Manual Setup**
   ```bash
   cp env.template .env.local
   ```

### Environment Variables Structure

The environment variables follow this naming pattern:
```
NEXT_PUBLIC_{CONTRACT}_ADDRESS_{NETWORK}
```

**Supported Networks:**
- `LOCAL` - Hardhat Local Network (Chain ID: 31337)
- `SEPOLIA` - Sepolia Testnet (Chain ID: 11155111)
- `MAINNET` - Ethereum Mainnet (Chain ID: 1)
- `POLYGON` - Polygon (Chain ID: 137)
- `ARBITRUM` - Arbitrum One (Chain ID: 42161)

**Contract Types:**
- `REGISTRY` - Registry contract
- `CONTROL` - Control module contract
- `FLOW` - Flow module contract
- `SIGNAL` - Signal module contract
- `SENSE` - Sense module contract

### Example Configuration

```bash
# Local Development
NEXT_PUBLIC_REGISTRY_ADDRESS_LOCAL=0xc351628EB244ec633d5f21fBD6621e1a683B1181
NEXT_PUBLIC_CONTROL_ADDRESS_LOCAL=0xFD471836031dc5108809D173A067e8486B9047A3
NEXT_PUBLIC_FLOW_ADDRESS_LOCAL=0xcbEAF3BDe82155F56486Fb5a1072cb8baAf547cc
NEXT_PUBLIC_SIGNAL_ADDRESS_LOCAL=0x1429859428C0aBc9C2C47C8Ee9FBaf82cFA0F20f
NEXT_PUBLIC_SENSE_ADDRESS_LOCAL=0xB0D4afd8879eD9F52b28595d31B441D079B2Ca07

# Sepolia Testnet
NEXT_PUBLIC_REGISTRY_ADDRESS_SEPOLIA=0x...
NEXT_PUBLIC_CONTROL_ADDRESS_SEPOLIA=0x...
# ... etc
```

## Contract Address Management

### Automatic Updates (Recommended)

After deploying contracts, update addresses automatically:

```bash
# Update local addresses from deployment artifacts
make update-addresses

# Or use the script directly
node scripts/update-contract-addresses.js --network local
```

This will:
1. Read deployment artifacts from `packages/contracts-solidity/deployments/localhost/`
2. Extract contract addresses
3. Update your `.env.local` file
4. Create a backup of your previous `.env.local` file

### Manual Updates

If deployment artifacts aren't available, enter addresses manually:

```bash
# Manual entry for local network
make update-addresses-manual

# Manual entry for Sepolia
make update-addresses-sepolia

# Or use the script directly
node scripts/update-contract-addresses.js --network sepolia --manual
```

### Script Usage

The `update-contract-addresses.js` script provides flexible contract management:

```bash
# Show help
node scripts/update-contract-addresses.js --help

# Update specific network
node scripts/update-contract-addresses.js --network <network>

# Manual entry mode
node scripts/update-contract-addresses.js --network <network> --manual
```

**Available Networks:**
- `local` - Hardhat Local (31337)
- `sepolia` - Sepolia Testnet (11155111)
- `mainnet` - Ethereum Mainnet (1)
- `polygon` - Polygon (137)
- `arbitrum` - Arbitrum One (42161)

## How It Works

### Frontend Integration

The frontend automatically loads contract addresses based on the connected network:

```typescript
import { getContractAddresses } from '@/lib/contracts'

// Get addresses for current network
const addresses = getContractAddresses(chainId)

// The function prioritizes:
// 1. Environment variables
// 2. Fallback hardcoded addresses
// 3. Default (zero) addresses
```

### Address Resolution Priority

1. **Environment Variables** (Highest Priority)
   - `NEXT_PUBLIC_*_ADDRESS_LOCAL` for local development
   - `NEXT_PUBLIC_*_ADDRESS_SEPOLIA` for Sepolia testnet
   - etc.

2. **Fallback Hardcoded Addresses**
   - Used when environment variables are not set
   - Defined in `packages/frontend/src/lib/contracts.ts`

3. **Default Zero Addresses** (Lowest Priority)
   - `0x0000000000000000000000000000000000000000`
   - Used when no valid addresses are found

### Validation

The system validates that all required contracts have valid addresses:

```typescript
import { validateContractAddresses, logContractConfiguration } from '@/lib/contracts'

// Check if addresses are valid
const isValid = validateContractAddresses(addresses)

// Log current configuration for debugging
logContractConfiguration(chainId)
```

## Development Workflow

### 1. Initial Setup

```bash
# Install dependencies
make install

# Setup environment
make setup-env

# Start local node
cd packages/contracts-solidity && npm run node
```

### 2. Deploy Contracts

```bash
# Deploy to local network
cd packages/contracts-solidity && npm run deploy:localhost

# Generate test data
make dev-scaffold
```

### 3. Update Frontend Configuration

```bash
# Update contract addresses
make update-addresses

# Restart frontend
cd packages/frontend && npm run dev
```

### 4. Verify Configuration

Check the browser console for contract configuration logs:
```
🔧 Contract Configuration for Chain 31337:
   Valid: ✅
   REGISTRY: 0xc351628EB244ec633d5f21fBD6621e1a683B1181
   CONTROL:  0xFD471836031dc5108809D173A067e8486B9047A3
   ...
```

## Troubleshooting

### Invalid Contract Addresses

If you see "❌ No valid contract addresses found":

1. Check your `.env.local` file has the correct addresses
2. Ensure addresses are properly formatted (42 characters, starting with 0x)
3. Verify the network chain ID matches your wallet
4. Run `make update-addresses` to refresh from deployment artifacts

### Environment Variables Not Loading

1. Restart your development server after updating `.env.local`
2. Ensure variables start with `NEXT_PUBLIC_` for frontend access
3. Check that `.env.local` is in the project root directory
4. Verify `.env.local` is not in `.gitignore` (it should be ignored)

### Deployment Artifacts Missing

If automatic updates fail:
1. Ensure contracts are deployed: `cd packages/contracts-solidity && npm run deploy:localhost`
2. Check deployment artifacts exist: `ls packages/contracts-solidity/deployments/localhost/`
3. Use manual mode: `make update-addresses-manual`

## Security Notes

- **Never commit private keys** to version control
- The `.env.local` file is gitignored for security
- Use `env.template` for sharing configuration structure
- Environment variables are only accessible in the frontend if they start with `NEXT_PUBLIC_`

## Advanced Usage

### Custom Networks

To add support for a new network:

1. Update `NETWORKS` in `scripts/update-contract-addresses.js`
2. Add environment variables to `env.template`
3. Update the `getContractAddressesFromEnv` function in `packages/frontend/src/lib/contracts.ts`

### Deployment Integration

For CI/CD pipelines, you can programmatically update addresses:

```javascript
const { main } = require('./scripts/update-contract-addresses.js')

// Update addresses after deployment
await main(['--network', 'sepolia', '--manual'])
```

## Best Practices

1. **Always backup** your `.env.local` file before updates (script does this automatically)
2. **Test locally** before deploying to testnets or mainnet
3. **Verify addresses** in the browser console after updates
4. **Use the template** (`env.template`) to share configuration structure
5. **Document custom networks** if you add support for additional chains
6. **Regular updates** - keep addresses synchronized with latest deployments
