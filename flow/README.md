# Flow Module

Fundraising core to collect funds and move them to a DAO treasury upon success

## Overview

Simple Crowdfunding module, supporting multiple campaigns, which are all settled with the platform currency.

Campaigns have their own lifetimes and amount to raise, specified by campaign creators (organization controllers).

Users as investors may contribute to active campaigns.


### Terminology

* **Campaign:** Represents crowdfunding goal, which is described by such parameters, as duration (life time), state and amount to be raised.
* **Campaign state:** Current state of the campaign, which may allow or deny contributions into the campaign by the investors.
* **Contribution:** Support of the campaign by investor, sending his own funds into the treasury behind the campaign.

### Goals

Flow is designed to make the following possible:

* Allow organizations to participate in crowdfunding process and raise funds.
* Allow users to participate in crowdfunding process and contribute funds to the campaigns.
* Manage campaigns finalization and settlement.

## Interface

### Dispatchable Functions

* `create_campaign` - Create an on chain campaign by organization controller, allowing to specify its lifetime and amount to be raised.
* `contribute` - Contribute to the campaign as an investor. This will lock some of your funds and transfer them to treasury of campaign succeeds.


### Public Functions

* `campaign_balance` - Get balance of the `campaign_id` campaign.
* `campaign_contributors_count` - Get number of contributors to the campaign `campaign_id`.
* `campaign_owner` - Get owner of the campaign `campaign_id`.
* `is_campaign_succeeded` - Did campaign finished successfully or not.

## Usage

The following example shows how to use the Flow module in your runtime by exposing public functions to:

* Create an onchain campaign from existing organization.
* Let users contribute into the campaign.
* If campaign succeeds and required funds amount will be reached, campaign is finized and all contributed funds will be tranfered to the org treasury.
* If campaig fails, all contributed funds returned back to the users.
* Use related module (signal) to manage treasury with contributed funds.


## Related Modules

* [`Control`](../control)
* [`Signal`](../signal)
