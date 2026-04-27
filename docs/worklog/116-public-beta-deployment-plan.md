## Public Beta Deployment Plan — Polygon (Amoy → Mainnet) (2026-04-27)

### Context

Builds on `115-deployment-stabilization.md`. Scope expands beyond local stabilization
to cover the path to a public beta on Polygon, the contract registry's
enable/disable correctness gap, broken/stale deploy scripts, and a single source
of truth for cross-package configuration (addresses, ABIs, chain metadata).

Target environments:
- **localhost**: Hardhat (chainId 31337) — default for dev. Frontier remains opt-in (`--network frontier`).
- **testnet**: **Polygon Amoy** (chainId 80002) — public beta target.
- **mainnet**: **Polygon PoS** (chainId 137) — production.
- Sepolia, mainnet (L1), Arbitrum scaffolding in `hardhat.config.ts` is removed
  to prevent drift; can be re-added later if a chain is actually targeted.

### Goals
- Default local dev to Hardhat; keep Frontier as an explicit opt-in path.
- Make the Registry's enable/disable mechanism functional (today it is cosmetic).
- One canonical config source — `@gamedao/evm` package — providing addresses,
  ABIs, startBlocks, and chain metadata to every consumer (frontend, subgraph,
  contracts scripts).
- One deploy command per network: `make deploy NETWORK=amoy|polygon|localhost|frontier`,
  idempotent and end-to-end (compile → deploy → enable → verify → manifest →
  subgraph → sanity probe).
- Remove broken/stale deploy scripts and dangling `package.json` script entries.

### Phases

#### Phase 1 — Localhost defaults flip to Hardhat
- Invert `dockerMode` ternary in `packages/contracts-solidity/hardhat.config.ts`
  (lines 46–47, 87) so non-Docker `localhost` resolves to chainId 31337 + Hardhat
  default keys. `frontier` stays as the named opt-in network.
- `Makefile`:
  - `deploy-local` calls `pnpm run deploy:localhost` (Hardhat).
  - `deploy-local-frontier` keeps `pnpm run deploy:frontier` (already exists post-pull).
  - `docker-deploy-all` continues to use `deploy-local`; with the flip it runs
    against the Hardhat container — no further change needed.
- `env.template`: confirm `NEXT_PUBLIC_DEFAULT_CHAIN_ID=31337` and add a comment
  noting Frontier path requires `--network frontier`.

**Done when:** fresh clone → `make docker-dev` + `make deploy-local` reaches a
working Hardhat deployment with no env tweaks; `make deploy-local-frontier`
still works for users running a Frontier node.

#### Phase 2 — Config source of truth (`@gamedao/evm` package)
Skip a runtime config service. Promote the existing shared package to *the*
canonical config layer.

- New layout under `packages/shared/src/`:
  - `deployments/<network>.json` per network — addresses, startBlocks, deployer,
    timestamp, gas used, txHashes. Schema-validated.
  - `chains/<network>.json` per network — chainId, name, rpcDefault, explorer
    URL, native currency, supported tokens.
  - `abis/` (already exists) — ABI bundles per contract.
- New `getConfig(chainId)` helper exported from `@gamedao/evm` that returns
  `{ chain, addresses, abis, startBlocks, tokens }`. Frontend, subgraph build
  scripts, and Hardhat scripts import from there.
- Remove address env vars from `env.template` — keep only secrets (private
  keys, API keys, WalletConnect project ID, Pinata keys).
- Atomic write of `deployments/<network>.json` from the deploy script (Phase 5).
  No more cross-network overwrites of `deployment-addresses.json`.

**Done when:** frontend reads zero `NEXT_PUBLIC_*_ADDRESS_*` env vars; subgraph
`update-addresses` script reads from `@gamedao/evm`; `getConfig(31337)` and
`getConfig(80002)` both resolve at build time.

**Tradeoff:** every contract redeploy ships a frontend redeploy too (versioned
package bump). Acceptable for beta; revisit if hot-swap of addresses without
a frontend cut becomes a real need.

#### Phase 3 — Registry enable/disable correctness
The Registry's `enableModule`/`disableModule` flips a flag but has no
functional effect today: no module checks `isModuleEnabled` before delegating;
no module overrides `_onModuleEnabled`/`_onModuleDisabled`; localhost deploy
never calls `enableModule` after `registerModule`.

Fixes:
- `scripts/deploy.ts`: after the `registerModule` loop, iterate the 6
  modules (Identity, Membership, Control, Flow, Signal, Sense) and call
  `registry.enableModule(moduleId)` for each. Mirrors `deploy-core-testnet.ts:109-113`.
- `scripts/manageModules.ts:5` and `Makefile` help (lines 551, 562): drop
  `FACTORY` from `MODULE_NAMES`. Factory is wired via `control.setFactory()`,
  not via Registry.
- `contracts/core/Module.sol`: add `whenEnabled()` modifier reverting when
  `_registry.isModuleEnabled(MODULE_ID) == false`. Subclasses expose their
  own id via a `_thisModuleId()` virtual hook. Decorate the external
  state-changing entry points on Control / Flow / Signal / Sense / Membership
  / Identity. Read paths stay open.
- Each module overrides `_onModuleDisabled` to `_pause()` and
  `_onModuleEnabled` to `_unpause()` (belt-and-suspenders with `whenEnabled`,
  also makes `emergencyDisableAllModules` actually halt the modules).
- Subgraph: keep current behaviour (Module entity defaults `enabled=false` on
  registration, set to `true` on `ModuleEnabled` — already done in 115).

**Risk:** existing tests that hit module entry points without going through the
Registry's enable path will start reverting. Sweep `test/Control.test.ts`,
`Flow.test.ts`, `Signal.test.ts`, `Sense.test.ts`, `Membership.test.ts`,
`Identity.test.ts` and ensure each test fixture enables modules in `before`.

**Done when:** `make module-disable MODULE=FLOW` causes Flow's external txs
to revert; `module-enable` restores them; reads continue to work in both
states; `pnpm test` is green.

#### Phase 4 — Cleanup of stale/broken deploy paths
- Delete `scripts/deploy-testnet.ts` — uses an old 2-arg `registerModule(id, addr)`,
  calls non-existent `registry.initialize()`, treats `treasury` as a module.
- Repoint `pnpm run deploy:testnet` in `packages/contracts-solidity/package.json`
  to the new unified deploy script (Phase 5). Until Phase 5 lands, point at
  `deploy-core-testnet.ts` (which uses the current API).
- Remove dead `package.json` script entries: `deploy:membership-localhost`,
  `deploy:membership-testnet`, `deploy:membership-mainnet` — target file
  `deploy-with-membership-integration.ts` does not exist.
- Sweep `scripts/` for one-shot debug/test scripts that were committed during
  development (`test-membership-*.ts`, `test-proposal-*.ts`, `fix-org-creation.ts`,
  `simple-org-fix.ts`, etc.) and either delete or move under `scripts/legacy/`
  with a README. Decide per-script — keep anything still useful for support.

**Done when:** `pnpm run deploy:testnet` and `deploy:mainnet` resolve to the
new unified script; `package.json` has no orphan script entries.

#### Phase 5 — Unified deploy automation
Single entry point: `make deploy NETWORK=<localhost|frontier|amoy|polygon>`.
Implemented as `scripts/deploy.ts` (rewritten to be network-aware) +
`Makefile` wrapper.

Pipeline (idempotent — re-running detects already-deployed contracts and skips):
1. **Compile** — `hardhat compile` + size check (fail >24KB).
2. **Deploy** — deploy in dependency order; write addresses, txHashes, gas,
   block numbers into a memory record.
3. **Wire** — `control.setFactory()`, `factory.setRegistry()`, role grants
   (`ORGANIZATION_MANAGER_ROLE` to Factory in Staking + Membership), token
   wiring (Membership/Identity GAME token).
4. **Register + Enable modules** — `registerModule` then `enableModule` for
   all 6 modules (Phase 3).
5. **Verify** — Polygonscan/Etherscan verify (skip on localhost/frontier).
   Requires `POLYGONSCAN_API_KEY`.
6. **Persist** — atomic write of `packages/shared/src/deployments/<network>.json`
   with full deployment record. Bump `@gamedao/evm` version (date+sha).
7. **Subgraph** — update `subgraph.yaml` addresses + startBlocks for the
   target network from the manifest. On `localhost`/`frontier` deploy locally;
   on `amoy`/`polygon` deploy to The Graph Studio (requires `GRAPH_DEPLOY_KEY`).
8. **Sanity probe** — read `moduleId()` and `isModuleEnabled` for each module
   via the freshly written manifest. Fail loud if mismatched.

`hardhat.config.ts` networks (post-cleanup):
- `hardhat`, `localhost`, `frontier` (dev).
- `amoy` (chainId 80002) — `POLYGON_AMOY_URL` env, default to public RPC.
- `polygon` (chainId 137) — `POLYGON_URL` env.
- Remove `sepolia`, `mainnet` (L1), `arbitrum` from `hardhat.config.ts` and
  `package.json` deploy scripts. Re-add when actually targeting them.

`env.template` updates (Phase 5 + Phase 2 combined):
- Add `POLYGON_AMOY_URL`, `POLYGON_URL`, `POLYGONSCAN_API_KEY`, `GRAPH_DEPLOY_KEY`.
- Remove all `NEXT_PUBLIC_*_ADDRESS_*` and `NEXT_PUBLIC_*_BLOCK_*` env vars
  (now sourced from `@gamedao/evm`).
- Document Amoy faucet links in a comment.

**Done when:** `make deploy NETWORK=amoy` runs end-to-end on a fresh checkout
with only secrets in `.env`; addresses and ABIs land in `@gamedao/evm`;
subgraph deploys to Studio; sanity probe passes; Polygonscan shows verified
contracts.

#### Phase 6 — Public beta gates
Items that block opening beta to external users; tracked here, executed after
Phases 1–5 land.

- Live Amoy deploy — record manifest + subgraph IDs in `@gamedao/evm`.
- Frontend Vercel env: real `WALLETCONNECT_PROJECT_ID`, Pinata keys,
  Polygon Amoy + Polygon RPC URLs.
- Subgraph deployed to The Graph Studio for Amoy and Polygon.
- Audit gate (per `README.md` security section — currently "pending").
- CI: add a job that runs `make deploy NETWORK=localhost` end-to-end on PR
  to catch regressions in the deploy pipeline.
- Status page / docs: short user-facing "what's live where" summary linked
  from the project README.

### Acceptance criteria (overall)
- Single `make deploy NETWORK=<name>` works for localhost, frontier, amoy,
  polygon with no manual follow-up steps.
- Module enable/disable has real functional effect (verified by reverting
  external txs when disabled).
- Frontend reads zero contract addresses or ABIs from env vars — all via
  `@gamedao/evm`.
- No dead/broken deploy scripts in `packages/contracts-solidity/scripts` or
  `package.json`.
- All tests green (`pnpm test`).

### Notes
- `Factory.setRegistry()` actually receives the Control address — naming is
  confusing but functional (per 115). Worth a follow-up rename later, not in
  this plan.
- Contract sizes: Flow at 22.7KB is the closest to the 24KB ceiling — keep an
  eye on this if Phase 3 adds modifier overhead. Re-measure after Phase 3.
- Branch hygiene: 23 stale remote branches under `origin/`. Out of scope
  here; flag for a separate cleanup.

### Status
- 2026-04-27: Plan drafted. Phase 1 ready to start.
