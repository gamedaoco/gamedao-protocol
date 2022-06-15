# Control Module

DAO core to create organizations with their segregated treasury and maintain members

## Overview

Control is a wrapper for organizationsal bodies in the chain.

Organizations consist of members as individual users/accounts.

Every organization has attached treasury, which is managed collectively by its members with help of related modules.


### Terminology

* **Organizations controller:** Admin of the organization.
* **Organizations access model:** How users may apply to the organization.
	* `Open` - any user may join;
	* `Voting` - user may join only if organization members allow it by voting;
	* `Controller` - user may be invited by org controller.
* **Organizations treasury:** Account, where all organization funds are stored for further management.
Interaction with the treasury happens only with collective decisions, approved by organization members.
* **Organizations fee:** amount of protocol tokens to be locked/transfered from the user, once he joins the organization.

### Goals

Control is designed to make the following possible:

* Allow users to create organizations with specified options.
* Provide organizations with individual treasury account.
* Allow users to become a members of organizations.

## Interface

### Dispatchable Functions

* `create_org` - Create an on chain organizations. Created entity is used in other functions.
* `add_member` - Add member to organization.
* `remove_member` - Remove member from orgaization.
* `disable_org` - Disable organization, root only.
* `enable_org` - Enable organization, root only.

### Public Functions

* `org_controller_account` - Get controller of the organization with `org_id`.
* `org_treasury_account` - Get treasury of the organization with `org_id`.
* `is_org_active` - Find out if organization with `org_id` is active or not.
* `is_org_member_active` - Find out if organization with `org_id` has an active member with `account_id`.

## Usage

The following example shows how to use the Control module in your runtime by exposing public functions to:

* Create an onchain organizations.
* Add some members to the organization.
* Use related module (flow) to raise funds via governance.
* Use related module (signal) to manage raised funds via proposals.


## Related Modules

* [`Flow`](../flow)
* [`Signal`](../signal)
