## GameDAO Frontend — Vercel Launch Plan

**Created:** 2025-09-25
**Goal:** Launch the Next.js frontend on Vercel with fully working Web3 integrations (contracts, subgraph, RPC, IPFS, wallets).

### Scope and environments
- **Staging**: Local Hardhat (chainId 31337) or Soneium Minato Testnet (chainId 1946)
- **Production**: Soneium Mainnet (chainId 1868)

### Artifact matrix (what, where, who)
- **Smart contracts** (Registry, Control, Flow, Signal, Sense, Identity, Membership, Staking, tokens)
  - Where: Local/Minato (staging), Soneium Mainnet (prod)
  - Source of truth for addresses: `@gamedao/evm` (packages/shared)
  - Owner: Protocol team
- **Subgraph** (The Graph Studio)
  - Where: One subgraph per env (staging, prod)
  - Depends on: Deployed contract addresses from `@gamedao/evm`
  - Owner: Indexing team
- **Frontend** (Next.js on Vercel)
  - Where: Vercel project (preview/staging/prod)
  - Depends on: RPC endpoints, subgraph URL, WalletConnect ID, IPFS token, `@gamedao/evm`
  - Owner: Web team
- **RPC providers** (Infura/Alchemy)
  - Where: Vercel env vars per env
  - Owner: Ops
- **WalletConnect** Project ID
  - Where: Vercel env vars
  - Owner: Ops
- **IPFS** (Pinata or Web3.Storage)
  - Where: Vercel env vars
  - Owner: Ops

### Phase 0 — Preconditions
- Enforce single address source: frontend and subgraph must read addresses from `@gamedao/evm` (packages/shared).
- Confirm Node >= 20 locally and in Vercel (vercel.json uses nodejs20.x).
- Choose IPFS provider and provision credentials.
- Fix any subgraph address drift by running `update-addresses` before deploys.

### Phase 1 — Staging (Local or Soneium Minato)
1) Contracts
   - Local (recommended for dev): `make deploy-local` (spins up local node, deploys, syncs addresses)
   - Minato (public staging): `make deploy NETWORK=soneium-testnet` (once Hardhat network is configured)
   - Update shared: `cd packages/shared && npm run build`
2) Subgraph
   - Local Graph Node: `make graph-full` (Docker Graph Node + deploy local subgraph)
   - Minato via Studio or hosted: `cd packages/subgraph && npm run update-addresses && npm run codegen && npm run build && graph deploy --studio <minato-slug>`
3) Vercel (staging/preview)
   - If using Local: not suitable for Vercel (endpoints aren’t public). Use Minato for Vercel staging.
   - If using Minato: set env vars (see below) and `make deploy-vercel-staging`
4) QA checklist
   - Wallet connect/disconnect
   - Organization creation (IPFS uploads + token approvals)
   - Reads via subgraph (org list, proposals, campaigns)
   - Cross-browser and mobile smoke tests

### Phase 2 — Production (Soneium Mainnet)
1) Contracts
   - Deploy: `make deploy NETWORK=soneium` (once Hardhat network is configured)
   - Verify: `make verify NETWORK=soneium`
   - Update shared: `cd packages/shared && npm run build`
2) Subgraph (production slug)
   - `cd packages/subgraph && npm run update-addresses && npm run codegen && npm run build`
   - Deploy to Studio with production slug
3) Vercel (production)
   - Swap env to Soneium mainnet
   - Deploy: `make deploy-vercel-prod`
4) Smoke tests
   - Read-only pages render, subgraph data present, IPFS assets load, no 4xx/5xx

### Phase 3 — Post-launch
- Monitoring: Vercel Analytics, The Graph Studio health, RPC quotas
- Error tracking: Sentry (optional)
- Runbook: rollback, hotfix, redeploy procedures
- Routine: After any contract upgrade → rebuild `@gamedao/evm` → update subgraph → redeploy frontend

### Vercel environment variables
- Network and RPC
  - Staging (choose one):
    - Local dev only: `NEXT_PUBLIC_DEFAULT_CHAIN_ID=31337`, `LOCAL_RPC_URL=http://localhost:8545`
    - Minato: `NEXT_PUBLIC_DEFAULT_CHAIN_ID=1946`, `SONEIUM_MINATO_URL=https://rpc.minato.soneium.org` (example)
  - Production:
    - `NEXT_PUBLIC_DEFAULT_CHAIN_ID=1868`, `SONEIUM_MAINNET_URL=https://rpc.soneium.org` (example)
- Subgraph URLs
  - Local: `NEXT_PUBLIC_SUBGRAPH_URL_LOCAL=http://localhost:8000/subgraphs/name/gamedao/protocol`
  - Minato (Studio or hosted): `NEXT_PUBLIC_SUBGRAPH_URL_MINATO=https://api.studio.thegraph.com/query/<minato-subgraph>/v1`
  - Soneium mainnet: `NEXT_PUBLIC_SUBGRAPH_URL_SONEIUM=https://api.studio.thegraph.com/query/<soneium-subgraph>/v1`
- Wallet
  - `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=<id>`
- IPFS (choose one)
  - `NEXT_PUBLIC_PINATA_JWT=<jwt>`
  - or `NEXT_PUBLIC_WEB3_STORAGE_TOKEN=<token>`
- Addresses
  - Prefer importing from `@gamedao/evm` by chainId; avoid duplicating NEXT_PUBLIC_* address variables. If needed, define `NEXT_PUBLIC_*_ADDRESS_<ENV>` for overrides.
- Build/runtime
  - `NODE_ENV=production`
  - `NEXT_TELEMETRY_DISABLED=1`

### Build and deployment commands (Makefile)
- Contracts
  - Staging (local): `make deploy-local`
  - Staging (Minato): `make deploy NETWORK=soneium-testnet && make verify NETWORK=soneium-testnet`
  - Production (Soneium): `make deploy NETWORK=soneium && make verify NETWORK=soneium`
- Subgraph
  - Local: `make graph-full`
  - Hosted (Minato/Soneium): `cd packages/subgraph && npm run update-addresses && npm run codegen && npm run build && graph deploy --studio <slug>`
- Vercel
  - Pre-check: `make deploy-vercel-check`
  - Staging (Minato): `make deploy-vercel-staging`
  - Production (Soneium): `make deploy-vercel-prod`

### Rollback plan
- Vercel: rollback to previous deployment in dashboard
- Subgraph: redeploy previous version label in Studio
- Contracts: if upgradeable, revert implementation; otherwise point frontend to prior addresses via `@gamedao/evm` version pin and redeploy frontend
- Feature flags: disable new write paths if needed

### Risks and mitigations
- Address drift → Single source via `@gamedao/evm` + CI validation
- Subgraph schema mismatch → Versioned subgraph per env; freeze schema pre‑prod
- RPC rate limits → Dedicated keys, fallback RPCs, quota alerts
- IPFS availability → Gateway fallback or dual provider
- Wallet UX issues → Multi-wallet testing; enforce chain gating in UI

### References
- Soneium relaunch docs: `docs/soneium-relaunch/`
- Existing broader guide: `docs/development/250728-vercel-deployment-plan.md`
- Project config: `vercel.json` (Node 20 runtime)


