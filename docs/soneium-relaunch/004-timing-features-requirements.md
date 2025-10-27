# Timing, Features, and Requirements — Soneium Relaunch (Q4 2025)

This outline captures the minimum viable scope, target timing, and requirements across product and market dimensions. All items are subject to validation before external publication.

## Timing (tentative)

- Code Freeze (MVP scope): mid–late Oct 2025 [Validate]
- Testnet Soak + Subgraph finalization: 2–3 weeks [Validate]
- Mainnet Launch Window: Q4 2025 (target Nov) [Validate]
- Pilot Cohort Kickoff: within 2 weeks of mainnet deploy [Validate]

## Features (MVP scope)

1) Organizations (Control)
- Org creation via Factory, unique ID, treasury deployment
- Access models (Open/Voting/Invite) and fee model handling
- Membership add/remove with settings enforcement (member limit, fees, stake)

2) Governance (Signal)
- Proposal creation, voting (For/Against/Abstain), quorum/thresholds
- Settings proposals: voting parameters, membership config, staking requirements
- Execution delay, on-chain history, events

3) Funding (Flow)
- Campaigns with ERC-20 contributions (prioritize USDC, native ETH optional)
- Milestone definition and disbursement hooks (MVP manual approval; oracle later)
- Subgraph indexing for campaign metrics and treasury flows

4) Identity & Reputation (Sense)
- Member reputation baseline; weighting for governance where configured
- Hooks for future battlepass integration (post-MVP)

5) Staking
- GAME staking for org creation/proposal deposits where required by settings
- Basic interfaces for stake checks; UX polish post-MVP

Frontend
- Org creation, membership flows, proposals create/vote, campaigns create/contribute
- Basic org/campaign detail pages; address-sync with shared package
- Minimal analytics views via subgraph

## Market & Operational Requirements

- Liquidity Plan on Soneium
  - Bridge/issuance mechanics for GAME [Validate]
  - Initial liquidity pools and counterparties [Validate]
  - Incentive budgets (if any) and runway [Validate]

- Pilot Cohort
  - 3–5 candidate teams with milestones and governance charters [Validate]
  - Legal review of crowdfunding structures in target jurisdictions [Validate]
  - Risk disclosure and contributor education artifacts [Validate]

- Ecosystem & Partnerships
  - Indexing, wallets, infra providers validated on Soneium [Validate]
  - Potential co-marketing with ecosystem partners [Validate]
  - Compliance and security review windows booked [Validate]

## Known Gaps / Post-MVP

- Automated milestone oracles and dispute resolution
- Battlepass progression and cross-platform verification
- Advanced analytics dashboards and cohort reporting
- Account abstraction flows (gasless, session keys)

## References

- Governance Settings: `docs/GOVERNANCE_SETTINGS.md`
- Makefile workflows: `Makefile` targets for deploy and docker dev
- Shared addresses: `packages/shared/src/addresses.ts` (source of truth)
- Subgraph schemas/handlers: `packages/subgraph/`

