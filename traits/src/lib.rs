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
use frame_support::codec::{Decode, Encode};
use scale_info::TypeInfo;
use sp_std::fmt::Debug;


pub trait ControlTrait<AccountId, Hash> {

    type ControlMemberState;
    type ControlState;

    // TODO: body rename to org
    // TODO: add methods with enum checks
    fn body_controller(org: &Hash) -> AccountId;
    fn body_treasury(org: &Hash) -> AccountId;
    fn body_member_state(hash: &Hash, account_id: &AccountId) -> Self::ControlMemberState;
    fn body_state(hash: &Hash) -> Self::ControlState;
}

pub trait FlowTrait<Hash, Balance> {

    type FlowState;

    fn campaign_balance(hash: &Hash) -> Balance;
    fn campaign_state(hash: &Hash) -> Self::FlowState;
    fn campaign_contributors_count(hash: &Hash) -> u64;
    fn campaign_org(hash: &Hash) -> Hash;
}
