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

use frame_support::{dispatch::DispatchError, storage::bounded_vec::BoundedVec};
use sp_std::vec::Vec;


pub trait ControlTrait<AccountId, Hash> {

	fn org_controller_account(org_id: &Hash) -> AccountId;
	fn org_treasury_account(org_id: &Hash) -> AccountId;
	fn is_org_active(org_id: &Hash) -> bool;
	fn is_org_member_active(org_id: &Hash, accont_id: &AccountId) -> bool;
}

pub trait ControlBenchmarkingTrait<AccountId, Hash> {

	/// Helper method to create organization.
	/// ** Should be used for benchmarking only!!! **
	#[cfg(feature = "runtime-benchmarks")]
	fn create_org(caller: AccountId) -> Result<Hash, DispatchError>;

	/// Helper method to add accounts to organisation.
	/// It is assumed those accounts have enough of currency to pay org joining fee.
	/// ** Should be used for benchmarking only!!! **
	#[cfg(feature = "runtime-benchmarks")]
	fn fill_org_with_members(org_id: &Hash, members: &BoundedVec<AccountId, Limit>) -> Result<(), DispatchError>;
}

pub trait FlowTrait<AccountId, Balance, Hash> {

	fn campaign_balance(campaign_id: &Hash) -> Balance;
	fn is_campaign_succeeded(campaign_id: &Hash) -> bool;
	fn campaign_contributors_count(campaign_id: &Hash) -> u64;
	fn campaign_org(campaign_id: &Hash) -> Hash;
	fn campaign_owner(campaign_id: &Hash) -> Option<AccountId>;
}

/// ** Should be used for benchmarking only!!! **
pub trait FlowBenchmarkingTrait<AccountId, BlockNumber, Hash> {

	/// Helper method to create campaign
	/// ** Should be used for benchmarking only!!! **
	#[cfg(feature = "runtime-benchmarks")]
	fn create_campaign(caller: &AccountId, org_id: &Hash) -> Result<Hash, &'static str>;

	/// Helper method to fill campaign with contributions
	/// It is assumed those accounts have enought currency to contribute
	/// ** Should be used for benchmarking only!!! **
	#[cfg(feature = "runtime-benchmarks")]
	fn create_contributions(campaign_id: &Hash, contributors: &BoundedVec<AccountId, Limit>) -> Result<(), DispatchError>;

	/// Trigger campaigns finalization by setting block number to specified value and calling appropriate hooks
	/// ** Should be used for benchmarking only!!! **
	#[cfg(feature = "runtime-benchmarks")]
	fn finalize_campaigns_by_block(block_number: BlockNumber);
}
