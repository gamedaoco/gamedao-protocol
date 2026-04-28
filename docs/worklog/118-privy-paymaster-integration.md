## Plan: Privy + paymaster integration (2026-04-28)

Supersedes the EIP-712 (Phase A) and ERC-2771 (Phase B) work in
`117-signing-vs-onchain-ops.md`. Anchors a separate identity primitive
specified in `119-did-game-method.md`.

### Goals

- Onboard users with no MetaMask install, no chainId mishaps, no
  custodial mental model. Email or social login → working wallet inside
  the app, ready to ship.
- Eliminate user gas cost for governance ops (vote, join/leave, profile
  create, name claim within budget). Sponsored via paymaster.
- Keep value-moving ops (`Flow.contribute`, `Treasury.withdraw`,
  `Staking.stake`) user-paid — gas there is dwarfed by the value
  transfer; paymaster sponsorship adds cost without improving UX.
- Self-sovereignty: signing keys live in the user's browser/device or
  Privy's TEE under the user's session. No platform custody. The
  protocol can be unplugged from Privy and the user's identity
  (`did:game:…`, on-chain profile, collective memberships) survives.

### Non-goals

- No GameDAO-operated bundler or paymaster contract for the public
  beta. Use a hosted vendor (Pimlico is the lowest-friction; Alchemy is
  the alternative). Self-host post-beta if volume justifies it.
- No EOA migration story. Project is **pre-live** as of 2026-04-28
  (no production users) — we set the canonical flow now and don't
  carry forward an EOA-first compatibility path. MetaMask / injected
  wallets remain *optional* for power users but are not the default.
- No EIP-712 batched settlement, no ERC-2771 forwarder, no custom
  meta-tx contract surface. Those paths are explicitly superseded.

### Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  Browser (frontend, self-sovereign keys)                         │
│                                                                  │
│  ┌────────────────────┐   ┌────────────────────────────────┐     │
│  │ Privy SDK          │   │ wagmi / viem (existing)        │     │
│  │  - email/social    │   │  - reads via RPC               │     │
│  │  - embedded wallet │   │  - sends via Privy AA helper   │     │
│  │  - AA smart acct   │   └────────────────────────────────┘     │
│  └─────────┬──────────┘                                          │
│            │ signs UserOps client-side                           │
└────────────┼─────────────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────────────┐
│  Server (policy + relay, NEVER custody)                          │
│                                                                  │
│  - Verify Privy JWT for protected APIs (RSVP, notifications)     │
│  - Paymaster proxy: validates contract+selector against allow-   │
│    list and per-user/per-day caps before forwarding to vendor    │
│  - Bundler proxy: hides infra credentials, rate-limits           │
│  - Subgraph + IPFS read proxy: caching, sane error envelopes     │
│                                                                  │
│  Server holds NO user keys. Cannot move user funds. Cannot       │
│  initiate a tx — only relay user-signed UserOps.                 │
└──────────────────────────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────────────┐
│  Hosted vendor (Pimlico)                                         │
│  - Bundler: aggregates UserOps, posts to EntryPoint contract     │
│  - Paymaster: signs sponsorship for allowlisted ops              │
└──────────────────────────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────────────┐
│  Polygon (Amoy / mainnet)                                        │
│  - EntryPoint v0.7 (canonical)                                   │
│  - Smart accounts (Privy / Kernel / SafeSmart)                   │
│  - GameDAO contracts unchanged: Registry, Membership, Signal,    │
│    Identity, Flow, etc.                                          │
└──────────────────────────────────────────────────────────────────┘
```

### Server responsibilities (the line drawn at custody)

The project has an existing BFF — Stage 3 lives there, not in
Vercel functions. The BFF uses `@privy-io/node` (the supported
server-side SDK; `@privy-io/server-auth` is deprecated).

| Allowed (no custody) | Forbidden |
| --- | --- |
| Verify Privy JWT for read-only auth-gated APIs | Hold or sign with user keys |
| Proxy paymaster API calls (hides API key) | Initiate a UserOp on the user's behalf |
| Forward UserOps to bundler with rate-limits | Replace user-signed UserOp with another |
| Cache subgraph + IPFS reads | Mutate on-chain state |
| Manage Privy policies (create / update / attach) on behalf of admins | Override an active policy for a specific user without an admin action |
| Issue Verifiable Credentials about a user (with the user's signature on the request) | Issue VCs unilaterally |

If we ever need to break this line, it's an architecture deviation
that needs explicit design review.

### Policy enforcement: lean on Privy's native engine

Privy's policy primitives (`Rule`, `Condition`, `Aggregation`) handle
exactly the constraints we need:

- **Contract+selector allowlist** → `Condition` matching RPC method
  + `to` address + `data` selector
- **Per-user/per-day caps** → `Aggregation` tracks transaction count
  per wallet over a rolling window
- **Spend caps** for value-moving ops → `Aggregation` over `value`
  field

Policies are evaluated in Privy's secure enclaves at request time. We
attach the policy at wallet creation via `policy_ids`, so every
sponsored UserOp passes through the policy engine before reaching the
bundler.

The BFF's job becomes **policy management + paymaster proxy + JWT
verification** rather than custom rate-limiting logic. Concretely:

- BFF endpoint to **create / update policies** via Privy's API (admin
  only, gated by JWT verification).
- BFF endpoint to **proxy paymaster calls**, hiding the Pimlico API
  key from the client, optionally adding additional throttles for
  abuse-detection cases that Privy's per-wallet caps don't catch.
- BFF endpoint to **return sponsorship metadata** to the frontend
  (e.g., "this op will be free, this op needs gas") so the UI can
  show accurate flow state before the user signs.

Tradeoff: Privy's policy engine is vendor-coupled. If we ever swap
Privy out, policies need to be re-implemented elsewhere. For the
beta this is fine — Privy is the foundation. If we hit "should we
self-host" later, the BFF wraps Privy's policy API behind an
abstraction we already control.

### Sponsored-op allowlist (initial)

Per the goal "free for governance, user-paid for value":

| Contract | Selector | Sponsored | Cap |
| --- | --- | --- | --- |
| `Membership.joinOrganization(bytes8)` | `0x...` | yes | 10/user/day |
| `Membership.leaveOrganization(bytes8)` | `0x...` | yes | 10/user/day |
| `Signal.castVote(bytes32,uint8,string)` | `0x...` | yes | 50/user/day |
| `Signal.castVoteWithConviction(bytes32,uint8,uint256,string)` | `0x...` | yes | 50/user/day |
| `Identity.createProfile(bytes8,string)` | `0x...` | yes | 5/user/day |
| `Sense.updateReputation(bytes8,uint8,int256,bytes32)` | `0x...` | yes (admin only) | 1000/admin/day |
| `Flow.contribute(...)` | — | **no** | n/a (user pays) |
| `Treasury.*` | — | **no** | n/a |
| `Staking.stake / unstake` | — | **no** | n/a |
| `Identity.claimName(...)` | — | **no** (consumes GAME) | n/a |
| `Control.createOrganization(...)` | — | **no** (consumes GAME stake) | n/a |
| `Signal.createProposal(...)` | — | maybe (low frequency, evaluate) | TBD |

Per-day caps are enforced by the **server policy layer**, not by the
paymaster vendor. This keeps caps adjustable without re-deploying or
re-signing paymaster policy.

### Stages

#### Stage 1 — Privy SDK on the frontend

Reference: `.claude/skills/privy/SKILL.md` is in-tree — agents
running this stage should consult it for hook names, gotchas,
verification checklist.

- Add `@privy-io/react-auth` to `packages/frontend`.
- Wrap app with `PrivyProvider` (login methods: email, Google, Apple,
  Discord; embedded wallet enabled with `noPromptOnSignature` for
  sponsored ops).
- Wait for `usePrivy().ready` before consuming auth/wallet state
  (common gotcha called out in the skill).
- Add the production + dev origins to Dashboard → Settings → Domains
  to avoid `invalid_origin` errors.
- Expose Privy's wallet via wagmi adapter so existing hooks
  (`useAccount`, `useReadContract`, `useWriteContract`) keep working.
- Replace WalletConnection component to surface Privy's modal.
- Remove unused wagmi connectors (RainbowKit, injected, etc.). Privy
  is the only path. Project is pre-live, no power-user EOA flow to
  preserve.
- Acceptance: a fresh user lands, signs in with email, sees an
  embedded wallet address, can call a read-only contract method.

#### Stage 2 — ERC-4337 smart account via Privy AA

- Configure Privy with `embeddedWallets: { ethereum: { useSmartWallets: true } }`.
- **Smart account: Kernel v3.** Locked decision (2026-04-28).
  Lightest overhead, plugin-less default fits the simple paymaster
  flow.
- Verify the smart account address on Polygon Amoy: should be a 4337
  account deployed lazily on first tx.
- Membership / Identity / Sense profiles key by `msg.sender` already,
  which becomes the Kernel smart account address on every Privy-routed
  call. No contract changes required, no migration shim — the project
  is pre-live so smart-account `msg.sender` is the canonical identity
  from day one.
- Scaffold continues to use Hardhat default EOAs (private-key based)
  for fixtures; that's a dev-only path and does not need to mirror
  the prod Privy flow.
- Acceptance: a Privy user can call `Identity.createProfile` from the
  embedded wallet, the profile is stored under their smart account
  address, the subgraph indexes it.

#### Stage 3 — Hosted paymaster + Privy policy + BFF proxy

Lives in the existing BFF, not Vercel functions.

- BFF adds `@privy-io/node` (note: `@privy-io/server-auth` is
  deprecated, do not use).
- Define one Privy `Policy` per environment with rules built from
  `Condition`s for the contract+selector allowlist + `Aggregation`s
  for the per-user/per-day caps. Attach to wallets at creation via
  `policy_ids` so the policy engine guards every UserOp from these
  wallets.
- BFF endpoints:
  - `POST /paymaster/sponsor` — proxies Pimlico's sponsor call,
    hides the API key from the client. Returns sponsorship signature
    for the UserOp. The BFF does NOT re-implement caps — Privy's
    policy engine has already gated the UserOp by the time it
    reaches the bundler.
  - `POST /paymaster/policy` — admin-only (JWT-verified), creates or
    updates the active Policy via Privy's API.
  - `GET /paymaster/sponsorable` — returns whether a contract+
    selector pair is currently sponsorable (lets the UI mark "free"
    vs "user pays" in the action confirmation).
- Sign up with Pimlico (free tier is enough for beta). Stage 3 keeps
  Pimlico vendor-coupled but only via the BFF; swapping to Alchemy
  or self-hosted is a one-file change.
- Acceptance: a Privy-authed user calls `Signal.castVote` from the
  frontend with zero balance in their wallet, the vote lands on
  chain, no gas prompt, BFF logs show the policy approved + Pimlico
  sponsored.

#### Stage 4 — Treasury accounting + dashboard

- Paymaster wallet topped up from a configured slice of protocol fees
  (initial: 5% of staking rewards, configurable via Registry-managed
  parameter).
- New admin page surfaces:
  - Paymaster wallet balance
  - Sponsored ops in last 24h / 7d / 30d
  - Top sponsored selectors
  - Per-user cap utilization (anonymized buckets)
  - Burn rate vs treasury inflow
- Alert threshold: paymaster balance < 14 days of projected burn →
  Slack/email notification.
- Acceptance: dashboard exists, alerting works in a staging test
  scenario, top-up flow works end-to-end.

### `did:game` integration

Spec lives in `119-did-game-method.md`. The integration touchpoints:

- A user's `did:game:<network>:<smartAccountAddress>` resolves to
  their on-chain Identity profile.
- `alsoKnownAs` in the DID Document includes `did:privy:<id>` when the
  user is signed in via Privy. Lets a Privy account swap rotate the
  Privy DID without changing `did:game:`.
- Profile claims (band/studio name, role tags, social links) are issued
  as W3C Verifiable Credentials, signed by the user's smart account.

### Risk register

| Risk | Mitigation |
| --- | --- |
| Pimlico outage stops governance ops | Frontend falls back to user-paid path automatically (still works, just costs gas). Document the failover. |
| Paymaster wallet drains from unexpected volume | Per-user caps + global daily ceiling enforced server-side. Alert at 14-day burn runway. Hard cap on sponsorship pauses if violated. |
| Privy outage blocks new logins | Existing users with cached sessions keep working. New-user onboarding falls back to wallet-injected (MetaMask) path. Communicate via status banner. |
| ~~AA smart account migration for existing EOA users~~ | ~~Project is pre-live; no migration needed.~~ Removed 2026-04-28. |
| Allowlist griefing (user spam-votes to drain paymaster) | Per-user/per-day caps. Wallet identity tied to Privy auth (email/social) so cost-of-Sybil is non-zero. Cap exceedance returns 429 to client. |
| Paymaster vendor lock-in | Allowlist + caps are server-side, not vendor-side. Switch to Alchemy or self-hosted paymaster requires only changing the upstream call. |
| Server compromise lets attacker abuse paymaster | Server can't sign UserOps without user's smart account signature. Worst case: attacker can approve sponsorship for ops the user already signed — same outcome as those txs happening anyway. |
| Self-sovereignty messaging undermined by AA + Privy + paymaster | Make the architecture diagram public. Document that key custody is user-side. Default UI shows the smart account address; Privy email is a recovery method, not custody. |

### Multi-agent exec breakdown

Stages can be parallelized once Stage 1 lands (Stage 1 produces the
Privy SDK integration foundation everything else builds on). After
Stage 1, three independent tracks:

| Track | Files / surface | Suggested agent | Inputs needed |
| --- | --- | --- | --- |
| **A. Stage 1 foundation** | `packages/frontend/{providers,hooks,components/wallet}/*`, `package.json` | `general-purpose` (heavy frontend wiring) | Privy app id, login methods config |
| **B. Stage 2 smart account** | `packages/frontend/hooks/useGameDAO.ts`, contract scripts in `packages/contracts-solidity/scripts/` for migration probes, subgraph mapping if address shape changes | `Plan` then `general-purpose` | Choice of Kernel vs Safe Smart vs Biconomy; Pimlico EntryPoint address per network |
| **C. Stage 3 paymaster + Privy policy + BFF proxy** | existing BFF (extend, don't fork), Pimlico API key config, Privy Policy attached at wallet-creation, BFF endpoints | `general-purpose` (BFF extension; uses `@privy-io/node`) | Pimlico API key (staging + prod), Privy app id (admin), BFF base URL |
| **D. Stage 4 dashboard + alerting** | `packages/frontend/src/app/admin/paymaster/`, alerting integration (Slack webhook? email?) | `general-purpose` | Slack webhook URL, alerting target |
| **E. `did:game` method spec + resolver** | `packages/frontend/src/app/.well-known/did/[id]/route.ts`, on-chain Identity DID Document support, VC tooling | independent `general-purpose` track, runs parallel to A–D | none — pure frontend + spec doc |

Recommended sequence:
1. **Track A** lands first — single agent, blocks everything else.
2. After A: spawn **B**, **C**, **E** in parallel as separate agents.
3. **D** depends on **C** (need the policy layer to instrument).
4. Each track lands its own commit; we review and integrate before the
   next batch.

Estimated complexity:
- A: medium (Privy SDK has good docs; mostly wiring + provider tree).
- B: medium-high (smart account choice + EOA migration thinking).
- C: high (new server package, policy logic, Redis caps, Pimlico
  integration).
- D: low-medium (dashboard UI + alert webhook).
- E: medium (DID method implementation; spec already exists by then).

### Decisions locked (2026-04-28)

- Smart account: **Kernel v3**.
- Server: **existing BFF**, not Vercel functions. BFF uses
  `@privy-io/node`.
- Privy app id: provided by user out-of-band; agents assume two ids
  (dev + prod) injected via env.
- Policy enforcement: **Privy's native engine** for caps + allowlist,
  not custom Redis logic.

### Open questions

- Treasury slice for paymaster funding: 5% of staking rewards is a
  guess. Real number depends on early sponsored-op volume.
- BFF tech stack — assumed Node/TypeScript with HTTP framework. If
  it's not, the `@privy-io/node` SDK choice may need to change. Track
  C agent must inspect the BFF tree before assuming.
- Drop the wagmi `injected` connector entirely, or keep it as
  power-user opt-in? Pre-live, the case for keeping it is weak
  (every user starts with Privy). Lean: **drop** for v1; re-add only
  if there's an actual user request.

### Status

- 2026-04-28: plan drafted following user pivot from EIP-712/ERC-2771
  to Privy + paymaster. Self-sovereignty model anchored on
  frontend-resident keys with server limited to policy + relay.
- Next: review of stage-1 scope + smart-account choice, then spawn
  Track A.
