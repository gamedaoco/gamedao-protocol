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
- No abandonment of EOA wallet support. Power users who arrive with
  MetaMask/Rabbit/Frame keep their direct-tx flow. Privy is *added*,
  not *replacing*.
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

| Allowed (no custody) | Forbidden |
| --- | --- |
| Verify Privy JWT for read-only auth-gated APIs | Hold or sign with user keys |
| Proxy paymaster API calls (hides API key) | Initiate a UserOp on the user's behalf |
| Allowlist policy: "is this contract+selector sponsored for this user?" | Override the allowlist for any user |
| Bundler proxy with rate-limits | Replace user-signed UserOp with another |
| Cache subgraph + IPFS reads | Mutate on-chain state |
| Issue Verifiable Credentials about a user (with the user's signature on the request) | Issue VCs unilaterally |

If we ever need to break this line, it's an architecture deviation
that needs explicit design review.

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

- Add `@privy-io/react-auth` to `packages/frontend`.
- Wrap app with `PrivyProvider` (login methods: email, Google, Apple,
  Discord; embedded wallet enabled with `noPromptOnSignature` for
  sponsored ops).
- Expose Privy's wallet via wagmi adapter so existing hooks
  (`useAccount`, `useReadContract`, `useWriteContract`) keep working.
- Replace WalletConnection component to surface Privy's modal.
- Drop unused wagmi connectors (RainbowKit etc.) once Privy is the
  default. Keep `injected` so MetaMask power-users still work.
- Acceptance: a fresh user lands, signs in with email, sees an
  embedded wallet address, can call a read-only contract method.

#### Stage 2 — ERC-4337 smart account via Privy AA

- Configure Privy with `embeddedWallets: { ethereum: { useSmartWallets: true } }`.
- Choose a smart account implementation. Privy supports Kernel, Safe
  Smart, and Biconomy. Kernel v3 is the lowest-overhead option.
- Verify the smart account address on Polygon Amoy: should be a 4337
  account deployed lazily on first tx.
- Update Membership/Identity tracking: profiles should key by smart
  account address (which is what `msg.sender` resolves to inside
  contract calls). Existing EOA-bound profiles need a migration path
  (see Risk register).
- Acceptance: a Privy user can call `Identity.createProfile` from the
  embedded wallet, the profile is stored under their smart account
  address, the subgraph indexes it.

#### Stage 3 — Hosted paymaster + allowlist

- Sign up with Pimlico (free tier is enough for beta).
- Configure paymaster sponsorship policy via Pimlico dashboard:
  allowlist by `(contract, selector)` pairs from the table above.
- Server-side policy layer:
  - New endpoint `POST /api/paymaster/sponsor` that takes a UserOp
    candidate, validates contract+selector against our local
    allowlist, validates per-user/per-day caps via Redis, forwards to
    Pimlico, returns sponsorship signature.
  - Frontend's UserOp builder calls `/api/paymaster/sponsor` instead
    of Pimlico directly.
- Acceptance: a user calls `Signal.castVote` from the frontend with no
  gas in their wallet, the vote lands on chain, no gas prompt
  appeared, server logs show the sponsorship was approved against the
  allowlist.

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
| AA smart account migration for existing EOA users | Stage 2 ships only for new users initially. Existing scaffold users on EOA continue with EOA. Migration tool added in a follow-up. |
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
| **C. Stage 3 paymaster + server policy** | new server package (suggest `packages/relay/`), Pimlico API key config, server-side allowlist + caps | `general-purpose` (server bootstrap, Redis) | Pimlico API key (stagingvs prod), Redis URL, server hosting target (Vercel? Railway?) |
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

### Open questions

- Smart account implementation: Kernel v3 vs Safe Smart vs Biconomy.
  Kernel is lightest, Safe Smart has the best ecosystem of plugins,
  Biconomy is paymaster-coupled. Default to **Kernel v3** unless we
  need a specific Safe-only feature.
- Server hosting: Vercel functions (already used for frontend) or a
  long-running container (Railway / Fly)? Vercel works for
  policy-check; long-running needed if we ever batch UserOps.
- Treasury slice for paymaster funding: 5% of staking rewards is a
  guess. Real number depends on early sponsored-op volume.
- EOA migration UI: opt-in "upgrade to smart account" flow vs forced
  migration on next session. Lean **opt-in** to respect existing user
  setups.

### Status

- 2026-04-28: plan drafted following user pivot from EIP-712/ERC-2771
  to Privy + paymaster. Self-sovereignty model anchored on
  frontend-resident keys with server limited to policy + relay.
- Next: review of stage-1 scope + smart-account choice, then spawn
  Track A.
