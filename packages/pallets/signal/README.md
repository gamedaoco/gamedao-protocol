# Signal Module

The module provides simple interfaces to create proposals and vote on them.

## Overview

The module contains governance and voting mechanisms.

Governance:

* General proposal
* Withdrawal proposal
* Membership proposal

Voting majority types:

* Relative Majority
* Absolute Majority (TBD)
* Simple Majority (TBD)

Voting power:

* Democratic voting one account one vote
* Token weighted voting (TBD)
* Quadratic voting (TBD)
* Conviction voting (TBD)

Quorum ratios are required to have a transparent way of settling a proposal.

* Proposal types might have preset mechanisms and ratios.
* Custom proposals can have individual voting mechanisms and ratios.

### Terminology

* **Relative Majority:** The option with the most single votes wins.
* **Absolute Majority:** The option with more than 50% of possible votes wins.
* **Simple Majority:** The option with more than 50% of all the submitted votes to win.
* **Quorum:** The minimum number of members required to consider the voting legitimate.

### Goals

Signal is designed to make the following possible:

* Allow account or an external origin to create a submission to the chain that represents an action that a proposer suggests that the system adopt.
* Allow account or an external origin to allocate funds from the pot to a beneficiary.

## Interface

### Dispatchable Functions

* `general_proposal` - Create a general proposal.
* `membership_proposal` - Create a membership proposal.
* `withdraw_proposal` - Create a withdrawal proposal.
* `simple_vote` - Voting.

## Roadmap

- 1. [ ] create generic proposal for a dao
- 2. [ ] create proposal to allow withdrawal (unreserve) as creator of a successful campaign
- 3. [ ] approve withdrawals (unreserve) as contributor of a successfully campaign
- 4. [ ] get my created proposals
- 5. [ ] get all proposals for a dao
- 6. [ ] request membership
- 7. [ ] request kick / ban


## Related Modules

* [`Flow`](../flow)
* [`Control`](../control)
