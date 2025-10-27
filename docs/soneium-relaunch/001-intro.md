# GameDAO v3: Relaunching on Soneium in Q4 2025 — Introduction

This document outlines the rationale, goals, and initial scope for relaunching GameDAO v3 on Soneium in Q4 2025. It is deliberately factual and concise. Items marked “Validate” require confirmation before publication.

## Why Soneium, why now

- Strategic fit: Ethereum L2 with low fees and EVM compatibility suitable for game-centric coordination and micro-transactions. [Validate: positioning narrative, audience]
- Ecosystem alignment: Growing focus on gaming/media use cases. [Validate: latest ecosystem stats, key partners]
- Distribution and liquidity: L2 throughput reduces cost-of-capital for community funding and on-chain governance. [Validate: fee metrics, bridging/user flows]

## What we are launching (initial scope)

Core protocol modules targeting a pragmatic MVP on Soneium:

1) Organizations and Treasury (Control)
- Create organizations with unique IDs, treasury addresses, and configurable access models
- Membership management with fee/stake requirements
- Registry + Factory pattern for predictable deployments

2) Crowdfunding (Flow)
- Campaign primitives for funding games with milestone-based disbursements
- ERC-20 contributions; subgraph indexing for analytics and transparency
- Treasury integration for controlled outflows

3) Governance (Signal)
- Proposal creation, voting, quorum/threshold checks
- Settings governance for org parameters (voting delays/period, fee models, member limits)
- Execution delays and on-chain history of changes

4) Identity & Reputation (Sense)
- Member reputation to weight participation and progression (Battlepass later)
- Plan for cross-platform verification hooks (Discord/Twitch/etc.)

5) Staking
- GAME token staking primitives supporting org creation and proposals where required
- Organization stake and membership stake enforcement via settings

References:
- Governance Settings design: see `docs/GOVERNANCE_SETTINGS.md`
- Contract interfaces and factories: `packages/contracts-solidity/` (e.g., `Factory.sol`, `IControl.sol`)
- Subgraph entities and handlers: `packages/subgraph/`
- Frontend hooks and flows: `packages/frontend/`

## Launch goals (impact, not vanity)

- Fund 3–5 Soneium-native game projects via protocol-governed treasuries
- Establish on-chain governance for participating orgs with active voting
- Demonstrate milestone-based disbursements and transparent treasury reporting
- Prove repeatable contributor flows: contribution → governance → deliverables

Success indicators (to be finalized):
- Funded projects count and on-time milestone completion rate
- Governance participation (proposal creation rate, voter participation)
- Contribution conversion and retention across campaigns

## Go-to-market outline (high level)

Phase 1 — Technical readiness (internal, Q3→early Q4)
- Finalize MVP contracts and subgraph on Soneium testnet/mainnet
- Ship initial frontend flows for org creation, membership, proposals, campaigns
- Integrate address sync across shared pkg/subgraph/frontend

Phase 2 — Pilot cohort (Q4 window)
- Select 3–5 projects with defined milestones and DAO structures
- Seed initial liquidity via partners/treasury where applicable
- Run end-to-end cycle from launch → proposal → funding → milestone reporting

Phase 3 — Public expansion
- Publish case studies and playbooks
- Open applications for additional teams
- Add battlepass-style participation and richer reputation mechanics

## Assumptions to validate before external publication

- Soneium positioning, partner integrations, and network statistics (latest public references)
- GAME token supply/liquidity approach on Soneium (bridging/issuance mechanics)
- Final MVP feature gate (what is Day 1 vs. post-launch)
- Initial cohort candidates and milestone structures
- Compliance considerations for crowdfunding flows in target jurisdictions

## Editorial notes

- Tone: factual, direct, no hype. Avoid unverified claims and speculative numbers.
- Audience: builders, partners, early contributors on Soneium.
- Link out to canonical docs where implementation details live; keep this page an entry point.


