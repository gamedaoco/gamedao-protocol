## Plan: signing-based operations vs fee-inducing contract calls (2026-04-28)

### Context

Today every member-facing interaction (joining an org, voting on a proposal,
contributing to a campaign, claiming a name) is an L1 transaction the user
pays gas for. On Polygon Amoy/mainnet this is cheap but not free; on any L1
fallback it's prohibitive. More importantly the UX is: open MetaMask, sign,
wait for confirmation — for actions that have *no economic side-effect*, like
voting yes/no.

We want to migrate as many of these as possible to **off-chain signatures
with on-chain settlement only when economically necessary**. Three concrete
patterns to evaluate:

1. **EIP-712 typed signatures, server-aggregated, on-chain settlement.**
   Voting collects signed `Vote` structs off-chain; at proposal close, a
   permissionless `settleProposal(proposalId, votes[])` call submits the
   batch and the contract verifies each signature, tallies, and emits one
   event per accepted vote. Only the settler pays gas (and we can pay it
   from the protocol treasury or let any participant settle).
2. **Meta-transactions / ERC-2771 forwarders.** A trusted forwarder
   relays signed user calls; contracts get `_msgSender()` from the
   forwarder. Membership.join, Identity.claimName, Sense profile creation
   become signed-and-relayed. We pay relayer gas; users sign once.
3. **ERC-4337 account abstraction (paymaster).** Gasless via paymaster +
   bundler. Heaviest infra, most flexibility, lets us sponsor specific
   operations from the protocol treasury.

### Goals

- Eliminate user gas cost for purely-governance actions: voting, signaling
  conviction, joining open orgs, claiming a name within an org.
- Keep direct on-chain calls for value-moving ops: contributing to a
  campaign, treasury withdrawals, staking, name claims that consume
  protocol fees.
- Preserve full auditability — every accepted off-chain signal must
  end up emitted on-chain via the settlement tx.

### Per-module triage

| Op                               | Today              | Target                          |
| -------------------------------- | ------------------ | ------------------------------- |
| Signal: castVote                 | tx                 | EIP-712 sig → batched settle    |
| Signal: castVoteWithConviction   | tx                 | EIP-712 sig → batched settle    |
| Signal: createProposal           | tx                 | tx (low frequency)              |
| Membership: joinOrganization     | tx                 | meta-tx (relayed) for Open      |
| Membership: leaveOrganization    | tx                 | meta-tx (relayed)               |
| Membership: addMember (manager)  | tx                 | tx                              |
| Identity: claimName              | tx                 | tx (consumes GAME tokens)       |
| Identity: createProfile          | tx                 | meta-tx (relayed)               |
| Sense: ReputationUpdated         | already off-chain emit | unchanged                  |
| Flow: contribute                 | tx (transfers ETH/USDC) | tx                         |
| Flow: createCampaign             | tx                 | tx                              |
| Staking: stake / unstake         | tx                 | tx                              |
| Control: createOrganization      | tx                 | tx                              |

The clear wins are vote tallies and joins. Profile + ID claims are next
tier (relayer pays gas, users sign).

### Phased implementation

#### Phase A — Voting via EIP-712 + permissionless settle

1. Define an `EIP712Vote` typed struct: `{ proposalId, choice, voter, nonce, deadline }`.
2. Add `Signal.castVoteBySig(EIP712Vote, sig)` that recovers the signer,
   checks nonce + deadline, and records the vote on-chain. Equivalent to
   the existing `castVote` but with the signer as caller.
3. Add `Signal.batchCastVoteBySig(votes[], sigs[])` so a relayer (or any
   participant at proposal close) can submit many at once.
4. Frontend: replace the wagmi `writeContract({ functionName: 'castVote' })`
   call with a `signTypedData` and `POST` to a relayer endpoint. UI
   shows the vote as "submitted" optimistically; the subgraph picks it
   up after settlement.
5. Relayer: small Node service that receives signed votes, validates
   signature off-chain, queues, and submits the batch when the proposal
   voting window closes (or a threshold of votes is reached).

This is the highest-impact change with the smallest contract surface.

#### Phase B — Meta-transactions for membership + profiles

1. Deploy a minimal trusted forwarder (OZ MinimalForwarder works for v4).
2. Make Membership and Identity inherit `ERC2771Context`, override
   `_msgSender()` and `_msgData()` to read from the forwarder.
3. Frontend: route `joinOrganization`, `leaveOrganization`,
   `createProfile` through `signMetaTransaction` → relayer → forwarder.
4. Relayer pays gas; protocol treasury funds the relayer wallet.

#### Phase C — Account abstraction (optional, evaluate after A+B)

ERC-4337 with a custom paymaster sponsoring specific ops. Significant
infra (bundler dependency, account upgrade flow), defer until A+B
demonstrate user appetite.

### Open questions

- Replay protection: per-user nonce vs proposal-scoped nonce. Per-user
  is simpler; proposal-scoped is more granular and easier to reason
  about for vote uniqueness.
- Settlement permission: anyone can settle vs a designated relayer.
  Anyone-can-settle is more decentralized; designated relayer is
  cheaper to coordinate during beta.
- Signature aggregation (BLS) vs naive ECDSA list. ECDSA is fine
  short-term; BLS is a Phase D conversation.
- Treasury funding for the relayer wallet — flat allowance vs
  per-action accounting.

### Risk

- **Replay attacks**: any signature scheme needs nonce + deadline +
  domain separator. Mistakes here are fund-loss class on the relayed
  ops (less so for voting, which only changes governance state).
- **Censorship**: a single relayer can drop signed votes. Phase A's
  permissionless settle path mitigates this — anyone can submit the
  batch.
- **Subgraph indexing**: events still fire on settlement, so subgraph
  schema doesn't change. Time-of-vote vs time-of-settle becomes
  important for displays.

### Status

- 2026-04-28: plan drafted following user request after observing the
  current voting path triggers a real fee-paying tx (compounded by a
  zero-address call when the user's wallet is on a chainId without a
  Signal deployment — see the fix in this same session).
- Next: Phase A scoping (contract function signatures + relayer
  protocol) when the public beta blockers settle.
