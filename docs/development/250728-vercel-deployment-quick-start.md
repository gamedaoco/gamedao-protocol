# GameDAO Vercel Deployment - Quick Start Guide

**Date:** July 28, 2025
**Prerequisites:** Smart contracts deployed, subgraph running
**Estimated Time:** 30-60 minutes

## 🚀 Quick Deployment Steps

### 1. Pre-Deployment Checklist
```bash
# Run automated checklist
node scripts/vercel-deployment-checklist.js

# OR use Makefile
make deploy-vercel-check
```

### 2. Environment Variables Setup

**Required Vercel Environment Variables:**
```bash
# Network Configuration
NEXT_PUBLIC_DEFAULT_CHAIN_ID=11155111  # Sepolia testnet
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# RPC URLs
SEPOLIA_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
MAINNET_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID

# Contract Addresses (get from packages/shared/src/addresses.ts)
NEXT_PUBLIC_REGISTRY_ADDRESS_SEPOLIA=0x...
NEXT_PUBLIC_CONTROL_ADDRESS_SEPOLIA=0x...
# ... add all contract addresses

# Subgraph URL
NEXT_PUBLIC_SUBGRAPH_URL_SEPOLIA=https://api.studio.thegraph.com/query/your-subgraph/v1

# IPFS Service (choose one)
NEXT_PUBLIC_PINATA_JWT=your_pinata_jwt
# OR
NEXT_PUBLIC_WEB3_STORAGE_TOKEN=your_web3_storage_token
```

### 3. Deploy to Vercel

**Option A: Using Makefile**
```bash
# For staging/preview
make deploy-vercel-staging

# For production
make deploy-vercel-prod
```

**Option B: Using Vercel CLI**
```bash
# Install Vercel CLI if not installed
npm i -g vercel

# Deploy to staging
vercel

# Deploy to production
vercel --prod
```

**Option C: GitHub Integration**
1. Connect repo to Vercel dashboard
2. Set environment variables
3. Trigger deployment

### 4. Post-Deployment Testing

Test these features on deployed site:
- [ ] Website loads correctly
- [ ] Wallet connection works
- [ ] Contract data loads
- [ ] Organization creation/viewing
- [ ] Proposals functionality
- [ ] Staking features

## 🔧 Configuration Files

The following files are automatically created:
- ✅ `vercel.json` - Vercel configuration
- ✅ `scripts/vercel-deployment-checklist.js` - Pre-deployment validation
- ✅ Updated `packages/frontend/package.json` - Build scripts

## 🚨 Common Issues & Solutions

### Build Fails
- **Issue:** `@gamedao/evm` package not found
- **Solution:** Ensure `packages/shared` is built first
```bash
cd packages/shared && npm run build
```

### Contract Addresses Not Loading
- **Issue:** Frontend shows "Contract not deployed" errors
- **Solution:** Verify addresses in `packages/shared/src/addresses.ts`

### Wallet Connection Issues
- **Issue:** Wallets won't connect
- **Solution:** Check `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is set

### Subgraph Data Not Loading
- **Issue:** GraphQL queries fail
- **Solution:** Verify subgraph URL and deployment status

## 📞 Getting Help

- **Build Issues:** Check `packages/frontend/package.json` scripts
- **Environment Variables:** Refer to `env.template`
- **Contract Issues:** Check `packages/shared/src/addresses.ts`
- **Vercel Issues:** Check build logs in Vercel dashboard

---

**⚡ TL;DR:**
1. Run `make deploy-vercel-check`
2. Set environment variables in Vercel
3. Run `make deploy-vercel-staging`
4. Test deployment
5. Run `make deploy-vercel-prod` for production
