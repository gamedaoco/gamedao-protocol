# Article Series Roadmap — GameDAO x Soneium (Q4 2025)

This roadmap enumerates a fact-first series. Each piece should link to canonical references in `docs/` and relevant source where appropriate. Avoid promotional claims; use concrete implementation details and open questions.

1) Introduction: Why Soneium, what ships at launch
- Scope, goals, constraints, validation list
- References: `docs/GOVERNANCE_SETTINGS.md`, contract interfaces, subgraph schema

2) Control: Organizations, Treasury, Membership
- Factory/Registry, org IDs, treasuries, access/fee models
- Membership and staking requirements; sync with settings
- References: `Factory.sol`, `IControl.sol`, subgraph handlers (`handleOrganizationCreated`)

3) Signal: Governance and Settings
- Proposal lifecycle, quorum/thresholds, execution delays
- Settings governance (voting params, member limits, stake requirements)
- References: `docs/GOVERNANCE_SETTINGS.md`, Signal interfaces

4) Flow: Funding Games with Milestones
- Campaign creation, funding, milestone-based disbursements
- Treasury integration and reporting; subgraph analytics
- References: subgraph schema/entities, frontend flows

5) Sense & Participation: Reputation today, Battlepass next
- Current reputation hooks and weighting (MVP)
- Planned battlepass progression, cross-platform verification
- References: `docs/protocol/modules/sense/README.md`, roadmap notes

6) Staking and Incentives
- GAME staking for org creation/proposals where configured
- Liquidity strategy on Soneium (Validate: bridge/issuance mechanics)
- References: contracts, staking docs

7) Pilot Cohort: How we select and structure funding
- Selection criteria, milestone design, reporting cadence
- Governance expectations and escalation paths
- References: application form (TBD), compliance notes

8) Technical Deployment Guide (For Builders)
- Networks, addresses via `@gamedao/evm` shared package
- Subgraph endpoints, frontend integration patterns
- References: Makefile workflows (`deploy-local`, docker dev), shared addresses

9) Case Studies (Post-Launch)
- End-to-end narratives with measurable outcomes
- What worked, what didn’t, concrete adjustments

10) Open Questions & RFPs
- Areas seeking contributions (analytics, milestone oracles, identity bridges)
- Bounties and collaboration tracks

Editorial Calendar (tentative)
- Weeks 1–3: 1–4
- Weeks 4–6: 5–7
- Weeks 7–9: 8–10

Dependencies / Validation Needed
- Soneium ecosystem stats and partner integrations (current)
- Liquidity plan and token mechanics on Soneium
- Final MVP gating (what’s GA vs. post-launch)
- Pilot cohort short-list and contacts

