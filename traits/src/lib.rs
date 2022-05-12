//      _______  ________  ________  ________   ______   _______   _______
//    ╱╱       ╲╱        ╲╱        ╲╱        ╲_╱      ╲╲╱       ╲╲╱       ╲╲
//   ╱╱      __╱         ╱         ╱         ╱        ╱╱        ╱╱        ╱╱
//  ╱       ╱ ╱         ╱         ╱        _╱         ╱         ╱         ╱
//  ╲________╱╲___╱____╱╲__╱__╱__╱╲________╱╲________╱╲___╱____╱╲________╱
//
// This file is part of GameDAO Protocol.
// Copyright (C) 2018-2022 GameDAO AG.
// SPDX-License-Identifier: Apache-2.0

//! TRAITS
//! TODO: description (toml as well)

#![cfg_attr(not(feature = "std"), no_std)]

pub trait ControlTrait<AccountId, Hash> {

    fn org_controller_account(org_id: &Hash) -> AccountId;
    fn org_treasury_account(org_id: &Hash) -> AccountId;
    fn is_org_active(org_id: &Hash) -> bool;
    fn is_org_member_active(org_id: &Hash, accont_id: &AccountId) -> bool;
}

pub trait FlowTrait<AccountId, Balance, Hash> {

    fn campaign_balance(campaign_id: &Hash) -> Balance;
    fn is_campaign_succeeded(campaign_id: &Hash) -> bool;
    fn campaign_contributors_count(campaign_id: &Hash) -> u64;
    fn campaign_org(campaign_id: &Hash) -> Hash;
    fn campaign_owner(campaign_id: &Hash) -> Option<AccountId>;
}
