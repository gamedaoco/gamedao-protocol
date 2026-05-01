## Execution status & test plan (2026-05-01)

Companion to `118-privy-paymaster-integration.md` (architectural plan)
and `119-did-game-method.md` (DID spec). This document tracks **what is
actually in the tree right now** and the next-step plan for migrating
write paths to the smart account, the test harness, and the soulbound
profile credential.

### What's shipped

#### Track A — Privy + wagmi bridge
- `<PrivyProvider>` + `@privy-io/wagmi` `<WagmiProvider>` wired in
  `packages/frontend/src/providers/web3Provider.tsx`.
- Login methods: email, Google, Apple, Discord. Embedded wallet
  provisioned for users without one.
- Workspace-root `.env.local` bridge in `next.config.mjs` so the BFF,
  scripts and frontend share one env file.
- Disconnect terminates **both** Privy and wagmi sessions (legacy
  injected wallets stayed stuck on Privy-only logout — see
  `wallet-balance-dropdown.tsx` comment).
- Hydration mismatch fixed by dropping `ssr: true` from the wagmi
  config — Privy's connector attaches client-only, so the wagmi
  `<Hydrate>` step had no source-of-truth to hydrate against.
- ModeToggle gated behind a mounted flag — `next-themes` resolves
  `localStorage` only client-side, so theme-dependent attributes
  (`title`) used to mismatch on every load.

#### Track B Phase 1 — Kernel smart accounts
- `<SmartWalletsProvider>` from `@privy-io/react-auth/smart-wallets`
  wraps the app. Smart-account *type* (Kernel) and per-network
  bundler/paymaster URLs (Pimlico) are configured in the Privy
  dashboard, not in code.
- `permissionless@^0.2.47` installed (peer dep of the smart-wallets
  export).
- Smart account is **provisioned** on first sign-in but writes still
  flow through the EOA. Phase 2 is the routing layer.

#### Track B Phase 2 (hybrid) — `useSmartTx`
- New hook in `packages/frontend/src/hooks/useSmartTx.ts`.
  Wraps `useSmartWallets().client.sendTransaction(...)` with a
  wagmi-shaped `writeContract({ address, abi, functionName, args })`
  helper plus a raw `sendTransaction({ to, data, value })`. Call sites
  opt in explicitly.
- Why hybrid not full auto-routing: the connector swap
  (`useEmbeddedSmartAccountConnector`) requires installing the ZeroDev
  SDK and writing a Kernel `getSmartAccountFromSigner` adapter. Real
  work, real risk surface — tracked separately as task #66 — and we'd
  rather migrate critical write paths explicitly so each one can be
  verified.

#### Other quality / UX work in this sprint
- Console flooding removed: ModulesProvider context (one shared poll
  instead of four 5 s polls), QueryClient global `refetchInterval`
  dropped, 128 dev-debug `console.log` calls scrubbed.
- `useIPFSBatch` infinite-loop fix — unstable `hashes` / `options`
  references baked into a `useCallback` dep array were causing a
  Maximum update depth error.
- Generative banners on `EntityCard` via a deterministic CSS gradient
  seeded by entity id (network-free, replaces a flaky external
  service). DiceBear used for missing avatars.
- Profiles list view + filter shipped — replaces the static top-5
  leaderboard. Backed by a trimmed `GET_PROFILES` query that matches
  the actual subgraph schema (the old query asked for ghost fields
  like `username`, `avatar`, `reputation` and was silently empty under
  Apollo's `errorPolicy: 'ignore'`).
- Imprint = GameDAO Association c/o Zero Reality AG, Baarerstrasse 79,
  6300 Zug, Switzerland.
- TopBar slimmed to Collectives / Campaigns / Profiles. Full nav
  surface mirrored in the footer.

### Test plan (two phases)

#### Phase 1 — contracts + API integration

Goal: every protocol write path has a test that exercises it
end-to-end **without** the browser. Catches regressions in solidity,
ABI codegen, subgraph indexing, and the API/BFF contract.

Stack:
- **Hardhat** for contract-level tests (already present under
  `packages/contracts-solidity/test/`).
- **Vitest** at the workspace level for API-side tests against a
  spawned Hardhat node + spawned subgraph + spawned IPFS (Kubo) via
  the existing docker compose stack.
- Reuse `make docker-deploy-all` as the harness bootstrap so the test
  environment is the dev environment.

Coverage matrix (one test file per flow):

| Flow | Contracts touched |
| --- | --- |
| `signin.test` | (none — just provisioning) |
| `profile.test` | `Identity`, `Sense`, `ProfileSBT` (post-Stream 3) |
| `collective.test` | `Factory`, `Membership`, `Treasury` |
| `campaign.test` | `Flow` (each campaign type) |
| `contribute.test` | `Flow.contribute` |
| `governance.test` | `Signal` (createProposal + vote yes/no/abstain + queue + execute) |
| `staking.test` | `Staking` |

#### Phase 2 — Playwright (browser end-to-end)

Goal: prove the **user-facing** flow works, including Privy login,
modal interactions, and the smart-account sponsorship path.

Stack:
- **Playwright** + **Privy test app** + email-link automation
  (Mailosaur or Privy's preview-build email API — to be decided).
- One spec per flow, mirroring Phase 1's matrix, plus a `signin.spec`
  / `signout.spec`.

CI: budget decision deferred. Current default: local-Hardhat on every
PR, Amoy nightly so paymaster usage doesn't burn budget per PR.

### Stream 1 — migrate write paths to `useSmartTx`

Order (each is one commit, tested locally then on Amoy):

1. **vote** (`useProposals`) — smallest blast radius, fastest
   sponsorship verification. **Starting here.**
2. **createOrganization** (`useOrganizationCreation`)
3. **joinOrganization / leaveOrganization** (`Membership`)
4. **contribute** (`useCampaigns`) — value-bearing tx, validates
   paymaster handles non-zero `value`.
5. **createCampaign** (`useCampaigns`)
6. **createProposal** (`useProposalCreation`)
7. **createProfile** (`useUserRegistration`) — depends on Stream 3
   for the SBT mint.

For each: keep the EOA path as a fallback when `smartTx.ready` is
`false`, so the call site doesn't break before sign-in completes.

### Stream 2 — test harness (parallel to Stream 1)

Each Stream 1 migration ships with a Phase 1 test that asserts the
write path lands and the subgraph indexes the resulting events.
Playwright specs land in a follow-up batch once two or three flows are
migrated.

### Stream 3 — Profile soulbound certificate

Decision: **separate `ProfileSBT.sol`** from `Identity.sol`. Identity
stays the source of truth for the Sense profile + name registry; the
SBT is a non-transferable membership/identity credential that *binds*
the EOA / smart account to a `did:game` DID and the Privy DID.

Spec:
- ERC-5192 minimal soulbound (one boolean: `locked(uint256) → true`).
- Mint at profile creation (atomic in `Sense.createProfile`).
- `tokenId` derived from profile id (1:1).
- Token URI points to IPFS JSON: `{ profileId, privyDid, didGame, createdAt }`.
- `_beforeTokenTransfer` reverts on any transfer (mint and burn only).
- New `Locked(uint256 tokenId)` event per ERC-5192, emitted at mint.

Subgraph: new `ProfileSBT` entity. Frontend: small "Verified profile"
badge in the wallet dropdown when the SBT is detected on the active
account.

Bonus: same primitive can mint per-DAO membership SBTs in a follow-up,
so each collective gets cheap, on-chain credentials without bespoke
contracts.

### Decisions taken in this sprint (2026-05-01)

- Test stack: Phase 1 = Hardhat + Vitest (contracts + API). Phase 2 =
  Playwright (browser). Contracts/API first, browser later.
- SBT contract: separate from `Identity`. Tracked in Stream 3.
- First write-path migration: `vote`.
- CI matrix budget: defer (local-Hardhat per PR, Amoy nightly until we
  see real-world cost data).

### Open questions

- Email-link automation library for Phase 2 — Mailosaur vs Privy's
  preview-build email API. Resolved when Stream 2 Phase 2 starts.
- Should the SBT be revocable by the protocol (in case of abuse)? Or
  strictly user-only burn? Lean: **user-only burn + protocol revoke
  via a separate `Revocation` registry**, not by burning the SBT. Keeps
  the credential immutable while letting governance flag bad actors.
- Per-DAO membership SBTs — separate contract per DAO, or one shared
  contract with `tokenId == orgId * 2^96 + memberIndex`? Defer to the
  follow-up that introduces them.

### Status

- 2026-05-01: plan written. Stream 1.1 (vote migration) starts now.
