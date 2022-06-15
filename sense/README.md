# Sense Module

Achievements and account based metrics

## Overview

Extending user identity with additional features based on onchain activity.


### Terminology

* **Sense entity:** Extension of user identity with additional parameters, like reputation, trust and experience.

### Goals

Sense is designed to make the following possible:

* Provision of users social identifiers strengthening the Trust (T) level of an identity.
* Continuous contribution of activity into users experience levels (XP).
* Social feedback of other ecosystem participants, contributing to the reputation (REP) of an identity.

These all together, T, XP, REP and the opaque identity provide increased trust and protection of the user base, enabling barrier free interaction, in case of GameDAO for coordination and fundraising.

## Interface

### Dispatchable Functions

* `create_entity` - Create sense entity, attached to the user account.
* `mod_xp` - Update entity experience value, root only.
* `mod_rep` - Update entity reputation value, root only.
* `mod_trust` - Update entity trust value, root only.

## Usage

The following example shows how to use the Sense module in your runtime by exposing public functions to:

* Use related module (control) to create an onchain organization.
* Use related module (flow) to create an onchain campaign.
* Set specific criterias for the users to match to be able to join organizations.
* Set specific criterias for the users to match to be able to contribute to the campaigns.


## Related Modules

* [`Control`](../control)
* [`Flow`](../flow)
