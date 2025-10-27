# General Article Briefing — GameDAO Relaunch on Soneium (Q4 2025)

Purpose: Provide a fact-based overview of the relaunch, contextualize why Soneium, and outline what ships at MVP. Use this as the outline for the first public post.

## Working Title
- GameDAO on Soneium: Coordinating and Funding Games with On‑Chain Governance

## Audience
- Builders and game teams targeting Soneium
- Early contributors and partners (infra, liquidity, analytics)

## Objectives (Measured)
- Explain why Soneium is the chosen venue (fees, EVM/L2 fit, gaming focus) [Validate: latest network stats]
- State clearly what ships Day 1 vs. post-launch
- Present the plan to fund 3–5 Soneium-native games with milestone-based releases
- Invite applications and partners with a clear call to action

## Key Points
1) Why Soneium
   - Ethereum L2; low fees suitable for governance and micro-transactions
   - Ecosystem momentum toward gaming/media [Validate: partners, usage metrics]
   - Developer familiarity (EVM), compatibility with tooling

2) What Ships (MVP)
   - Organizations (Control): factory, IDs, treasuries, membership rules
   - Governance (Signal): proposals, quorum/thresholds, settings governance
   - Funding (Flow): ERC‑20 contributions, milestone structure, subgraph visibility
   - Identity (Sense): baseline reputation, future battlepass integration
   - Staking: GAME staking checks where settings require it

3) How Funding Works
   - Campaigns created by organizations, contributors fund in ERC‑20 (USDC priority)
   - Milestones defined; disbursements governed and transparent [Validate: manual vs. oracle]
   - Subgraph-backed reporting for contributors and teams

4) Pilot Cohort
   - 3–5 teams, clear milestones and governance charters
   - Selection criteria (team, plan, community, scope) [Validate]
   - Expected cadence: proposal → funding → delivery → review

5) Liquidity & Token
   - GAME on Soneium: bridge/issuance path and initial liquidity [Validate]
   - ASTR dApp Staking → GAME: Users can stake ASTR in Astar dApp staking (selecting GameDAO) to receive GAME emissions, then bridge or access GAME for Soneium usage [Validate: program status Q4 2025, emission schedule, bridging route]
   - Direct Purchase: Users can directly buy GAME where available (DEX/CEX) and bridge to Soneium if needed [Validate: venues, pairs, official bridge]
   - Budgeting and incentives (if any) [Validate]

6) Timeline
   - MVP freeze → testnet soak → mainnet window (target Nov) [Validate]
   - Public applications for pilot cohort around launch

7) Calls to Action
   - For game teams: application link (TBD)
   - For partners: infra/liquidity/analytics contact
   - For contributors: follow channel(s) for launch updates

## Sources & References
- Governance settings: `docs/GOVERNANCE_SETTINGS.md`
- Feature set: `docs/soneium-relaunch/005-feature-set.md`
- Roadmap overview: `docs/soneium-relaunch/003-roadmap.md`
- Makefile workflows: `Makefile` (deploy-local, docker dev)
- Addresses: `packages/shared/src/addresses.ts` as source of truth

## Style Notes
- Factual, no hype; mark unverified items with “Validate”
- Prefer concrete mechanisms over adjectives
- Link to canonical docs; keep article concise and scannable

