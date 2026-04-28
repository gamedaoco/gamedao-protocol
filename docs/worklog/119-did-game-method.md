## DID Method Spec: `did:game` (2026-04-28)

A self-sovereign identifier method for creators on the GameDAO
platform. Anchors on-chain Identity profiles, links optionally to
recovery providers like Privy, and survives the disappearance of any
single platform component.

Companion to `118-privy-paymaster-integration.md`. Free of registration
collisions in the W3C DID Methods Registry as of 2026-04-28
(verified — no `game`, `gaming`, `games`, or `gamedao` method names
present).

### Why a custom method

Three options were considered:

1. **`did:pkh:eip155:<chainId>:<address>`** — already standardised,
   universal-resolver support. Downside: zero brand context, the
   identifier is a bare account address with no GameDAO semantics.
2. **`did:gamedao:…`** — brand-locked. Ages poorly if the project
   rebrands.
3. **`did:game:…`** — vertical-locked rather than brand-locked. Short,
   memorable, free in the registry. **Chosen.**

### Method syntax

```
did:game:<network>:<account-address>

network         := "polygon" | "amoy" | "localhost"
                   (chain name from chains.ts — keeps the DID human-
                    readable instead of using chainId numerics)
account-address := the 0x-prefixed lowercase Ethereum address of the
                   account that controls the identity. For new users
                   this is an ERC-4337 smart account; for legacy EOA
                   users it is the EOA address.
```

#### Examples

```
did:game:polygon:0xabcdef0123456789abcdef0123456789abcdef01    (production)
did:game:amoy:0xfedcba9876543210fedcba9876543210fedcba98       (testnet)
did:game:localhost:0xf0fe780c76ce610fc8df330971b99ba6f4429001  (dev)
```

`localhost` DIDs are not externally resolvable — they exist only for
local development. Production resolvers MUST refuse to resolve
`did:game:localhost:*` to avoid leaking dev fixtures.

### DID Document

Returned by the resolver. Minimal example:

```json
{
  "@context": [
    "https://www.w3.org/ns/did/v1",
    "https://w3id.org/security/suites/secp256k1-2019/v1"
  ],
  "id": "did:game:polygon:0xabcdef...",
  "controller": "did:game:polygon:0xabcdef...",
  "verificationMethod": [{
    "id": "did:game:polygon:0xabcdef...#owner",
    "type": "EcdsaSecp256k1RecoveryMethod2020",
    "controller": "did:game:polygon:0xabcdef...",
    "blockchainAccountId": "eip155:137:0xabcdef..."
  }],
  "authentication": ["did:game:polygon:0xabcdef...#owner"],
  "service": [
    {
      "id": "did:game:polygon:0xabcdef...#profile",
      "type": "GameDAOProfile",
      "serviceEndpoint": "ipfs://QmXyz.../profile.json"
    },
    {
      "id": "did:game:polygon:0xabcdef...#subgraph",
      "type": "GameDAOSubgraph",
      "serviceEndpoint": "https://api.thegraph.com/subgraphs/name/gamedao/protocol"
    }
  ],
  "alsoKnownAs": [
    "did:privy:c1xn8a7d9...",
    "did:pkh:eip155:137:0xabcdef..."
  ]
}
```

#### Field rules

- `verificationMethod` MUST contain at least one
  `EcdsaSecp256k1RecoveryMethod2020` referencing the controlling
  account's `blockchainAccountId`. For ERC-4337 smart accounts, this
  is the smart account address; for EOA users, it is the EOA.
- `service` SHOULD include a `GameDAOProfile` entry pointing at the
  IPFS-stored profile metadata that the on-chain Identity contract's
  `metadataURI` resolves to.
- `alsoKnownAs` MAY include any of:
  - `did:privy:<id>` — when the user's account is reachable via Privy
  - `did:pkh:eip155:<chainId>:<addr>` — for did:pkh interoperability
  - `https://gamedao.co/u/<handle>` — claimed handle on the platform
  - ENS name (`did:web:<name>.eth`) — claimed via VC
- The DID Document is **not stored on-chain in full**. The Identity
  contract stores a `metadataURI` (IPFS) and an EOA-derived address;
  the resolver assembles the document from those primitives plus the
  DID Document fragment at the metadata URI.

### Resolution

Three layers, each progressively richer:

#### Layer 1 — on-chain canonical (always authoritative)

Reads from the `Identity` contract on the target network:
- `getProfileByOwner(address, bytes8)` — profile id for the account
- `metadataURI(profileId)` — IPFS pointer to the DID Document fragment

The on-chain Identity contract is the source of truth. If it says no
profile exists, the DID does not resolve.

#### Layer 2 — subgraph (fast lookup)

Queries the GameDAO subgraph by account address for the same data the
on-chain calls would return. Used by frontends and resolvers that need
sub-second response. Subgraph data is eventually consistent with
on-chain state; resolvers MUST fall back to Layer 1 if the subgraph
disagrees with a known on-chain block height.

#### Layer 3 — HTTPS resolver (Universal Resolver compatibility)

```
GET https://gamedao.co/.well-known/did/{percent-encoded DID}
```

Returns the resolved DID Document with `Content-Type: application/did+ld+json`.
Implements the W3C DID Resolution spec so that the DIF Universal
Resolver can register `did:game` and route lookups here.

### Operations

#### Create

Implicit. A `did:game:<network>:<address>` exists once the user calls
`Identity.createProfile(organizationId, metadataURI)` on the target
network. No separate "register the DID" step — the on-chain profile
write *is* the registration.

The metadataURI MUST point at an IPFS object containing at minimum:

```json
{
  "@context": "https://w3id.org/did-resolution/v1",
  "didDocument": { /* the DID Document fragment */ }
}
```

The resolver merges this fragment with the address-derived
`verificationMethod` to produce the final document.

#### Update

User calls `Identity.updateProfile(profileId, newMetadataURI)`. The
DID identifier does not change; only the document at the URI does.

`alsoKnownAs` rotation — e.g., user swaps Privy account or claims a
new ENS — is purely a metadata update via the same path.

#### Deactivate

User calls `Identity.abdicateProfile(profileId)`. The Identity
contract sets a flag; resolvers MUST then return a DID Document with
`"deactivated": true` and an empty `verificationMethod` array. The
DID identifier remains visible (so old references don't 404) but is
no longer authenticatable.

### Linkage to `did:privy:`

When a user authenticates via Privy and creates a profile, the
frontend writes a metadata fragment that includes:

```json
"alsoKnownAs": ["did:privy:<privy-did-here>"]
```

This is the only on-chain hint that recovery flows go through Privy.
It is not load-bearing — the GameDAO identity works without it. If
Privy disappears tomorrow, the user can:

1. Recover their wallet via Privy's published recovery flow (still
   works for some time after a vendor exit).
2. Or, if recovery is impossible, retire the old `did:game:<old>` and
   create a new profile under a new account. Past memberships and
   credits are tied to the old DID; they can be ported via VCs signed
   by the old address before retirement.

### Verifiable Credentials for profile claims

Profile claims (display name, role tags, social handles) are stored as
W3C Verifiable Credentials inside the IPFS-hosted profile metadata,
signed by the user's account. The Identity contract anchors only the
metadata pointer, not the claims themselves.

Pattern:

```json
{
  "didDocument": { /* ... */ },
  "credentials": [
    {
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        "https://gamedao.co/credentials/v1"
      ],
      "type": ["VerifiableCredential", "DisplayName"],
      "issuer": "did:game:polygon:0xabcdef...",
      "credentialSubject": {
        "id": "did:game:polygon:0xabcdef...",
        "displayName": "Indie Game Collective"
      },
      "issuanceDate": "2026-04-28T00:00:00Z",
      "proof": {
        "type": "EcdsaSecp256k1Signature2019",
        "created": "2026-04-28T00:00:00Z",
        "proofPurpose": "assertionMethod",
        "verificationMethod": "did:game:polygon:0xabcdef...#owner",
        "jws": "..."
      }
    }
  ]
}
```

Self-issued by default. Third-party-issued credentials (e.g.,
"verified by Discord", "signed up on Polygon Beta day 1") are added
by the issuing party signing a VC and the user including it in their
metadata fragment.

### Migration cases

Project is pre-live as of 2026-04-28 — there are no production users
to migrate from EOA to smart account. Real users are smart-account
from day one.

| Scenario | DID outcome |
| --- | --- |
| User changes Privy login (e.g. swaps email) | DID unchanged; `alsoKnownAs` updated to new `did:privy:<new>` |
| Smart account is deployed on a different chain | Different DID per chain — `did:game:amoy:0x…` vs `did:game:polygon:0x…`. The user can include cross-chain `alsoKnownAs` to link them |
| User abandons the platform | DID stays resolvable as `deactivated: true`. Past memberships and credits remain visible historically |
| Hardhat dev fixtures (scaffold-generated EOAs) | Resolve as `did:game:localhost:<eoaAddress>`. Dev-only — production resolvers refuse `did:game:localhost:*` |

### Registration with W3C

Once the spec stabilizes (post-Stage-3 of 118), open a PR against
`w3c/did-extensions-methods` registering `did:game` with:
- Method name: `game`
- Specification URL: link to this doc on GitHub or a Spec page
- Contact: `protocol@gamedao.co` (placeholder — pick a real address)
- Status: `provisional`

Registration is courtesy, not authority. The method works whether or
not it is in the registry; registration prevents future collisions.

### Open questions

- Network in the DID — using human-readable names (`polygon`, `amoy`)
  vs CAIP-2 chain ids (`eip155:137`). Human-readable matches the
  brand; CAIP-2 is more interoperable. Tentative: human-readable for
  the canonical DID, CAIP-2 in the `did:pkh` `alsoKnownAs` entry for
  resolver compatibility.
- Resolver hosting — `gamedao.co/.well-known/did/…` is convenient but
  centralizes the resolution path. A community-run alternative
  (`did.game.co` mirrors hosted by partners) would harden against
  vendor-style failure of the primary domain.
- VC issuer trust model — out of scope for this spec, but the platform
  needs to choose: anyone-can-issue (web-of-trust) vs gatekept
  issuers (curated authorities).

### Status

- 2026-04-28: spec drafted following decision in 118 to use Privy +
  paymaster, with `did:game` as the protocol-level identifier.
- Next: implement Layer 3 resolver as part of Track E in 118's
  multi-agent exec breakdown.
