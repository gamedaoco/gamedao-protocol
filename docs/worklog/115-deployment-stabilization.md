## Deployment stabilization and module gating (2025-10-26)

### Goals
- Ensure docker-local deployment and subgraph seeding run without errors.
- Enable error-free DAO and proposal creation, with image upload/view.
- Reflect enabled modules in the UI; add admin controls to toggle modules.
- Align contracts, subgraph, shared addresses, and frontend assumptions.

### Tasks
- Fix shared addresses generator to parse deployment-addresses.json and include FACTORY/GAME/USDC.
- Makefile: keep shared rebuild and subgraph address update in deploy-local flow.
- Subgraph: default Module.enabled=false on registration; only true on ModuleEnabled.
- Frontend: gate navigation by module enabled state from subgraph/registry.
- Add /admin/modules page to toggle modules via Registry for whitelisted callers.
- Improve IPFS dev UX (mock image fallback) for local uploads.
- Verify end-to-end: docker reset → deploy-local → frontend → send-tokens → create DAO → create/vote proposal.

### Notes
- Factory::setRegistry points to Control per current implementation; naming is confusing but functionally correct.
- MIN_STAKE_AMOUNT is 10,000 GAME; frontend defaults preserved.

### Status
- In progress: shared addresses generator fix to stabilize address sync across packages.


