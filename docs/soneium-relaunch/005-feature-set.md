# GameDAO v3 Feature Set (MVP for Soneium Q4 2025)

Scope reflects what we target for Soneium mainnet MVP. Items are grouped by module; references point to canonical docs and source. Use this as the single source for public-facing feature statements.

## Control — Organizations, Treasury, Membership
- Create organizations via factory with 8-char IDs and dedicated treasury
- Access models: Open, Voting, Invite; fee models and member limits
- Membership management (add/remove) with settings validation
- References: `packages/contracts-solidity/contracts/modules/Control/Factory.sol`, `docs/development/modules/control.md`, subgraph `handleOrganizationCreated`

## Signal — Governance and Settings
- Proposals: create, vote (For/Against/Abstain), quorum/threshold checks
- Settings governance: voting parameters, membership config, staking reqs
- Execution delay, on-chain history and events
- References: `docs/GOVERNANCE_SETTINGS.md`, Signal interfaces (contracts)

## Flow — Funding and Treasury Flows
- Campaigns for ERC-20 contributions (USDC priority); ETH optional
- Milestone definitions; MVP manual approvals, oracle automation post-MVP
- Subgraph indexing for campaign metrics and treasury movements
- References: subgraph schemas/handlers, frontend hooks

## Sense — Identity and Reputation
- Baseline member reputation and optional weighting in governance
- Hooks for future battlepass progression and cross-platform verification
- References: `docs/protocol/modules/sense/README.md`

## Staking — Governance and Access Primitives
- GAME staking checks for org creation and proposal deposits (when enabled by settings)
- Organization and member stake parameters governed via settings
- References: staking contracts (repo), governance settings doc

## Frontend — Essential User Flows
- Org: create, view, join/leave where allowed; basic settings visibility
- Governance: create proposal, vote, view proposal status/history
- Funding: create campaign, contribute, view milestones and disbursements
- Shared address sync via `packages/shared/src/addresses.ts`; subgraph-powered lists and details

## Non-Goals for MVP (Post-Launch)
- Automated milestone oracles and disputes
- Battlepass progression and cross-platform social verification
- Advanced analytics dashboards and cohort reporting
- Full account abstraction UX (gasless tx, session keys)

## Notes
- All public addresses must be sourced from `@gamedao/evm` shared package.
- Keep language factual; avoid speculative metrics unless verified.


