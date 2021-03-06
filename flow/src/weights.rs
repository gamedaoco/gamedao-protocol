// This file is part of Substrate.

// Copyright (C) 2021 Parity Technologies (UK) Ltd.
// SPDX-License-Identifier: Apache-2.0

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

//! Autogenerated weights for gamedao_flow
//!
//! THIS FILE WAS AUTO-GENERATED USING THE SUBSTRATE BENCHMARK CLI VERSION 4.0.0-dev
//! DATE: 2022-07-11, STEPS: `20`, REPEAT: 10, LOW RANGE: `[]`, HIGH RANGE: `[]`
//! EXECUTION: None, WASM-EXECUTION: Compiled, CHAIN: None, DB CACHE: 1024

// Executed Command:
// ./target/release/subzero
// benchmark
// pallet
// --pallet=gamedao_flow
// --extrinsic=*
// --steps=20
// --repeat=10
// --output=gamedao-protocol/flow/src/weights.rs
// --template=./.maintain/frame-weight-template.hbs

#![cfg_attr(rustfmt, rustfmt_skip)]
#![allow(unused_parens)]
#![allow(unused_imports)]

use frame_support::{traits::Get, weights::{Weight, constants::RocksDbWeight}};
use sp_std::marker::PhantomData;

/// Weight functions needed for gamedao_flow.
pub trait WeightInfo {
	fn create_campaign(b: u32, ) -> Weight;
	fn update_state(b: u32, ) -> Weight;
	fn contribute() -> Weight;
	fn on_initialize(c: u32, ) -> Weight;
}

/// Weights for gamedao_flow using the Substrate node and recommended hardware.
pub struct SubstrateWeight<T>(PhantomData<T>);
impl<T: frame_system::Config> WeightInfo for SubstrateWeight<T> {
	// Storage: Control OrgController (r:1 w:0)
	// Storage: Control OrgTreasury (r:1 w:0)
	// Storage: Tokens Accounts (r:1 w:1)
	// Storage: Flow Nonce (r:1 w:1)
	// Storage: Flow CampaignsByBlock (r:1 w:1)
	// Storage: Flow CampaignsByOrg (r:1 w:1)
	// Storage: Timestamp Now (r:1 w:0)
	// Storage: Flow CampaignsCount (r:1 w:1)
	// Storage: Flow CampaignsOwnedCount (r:1 w:1)
	// Storage: Flow CampaignState (r:1 w:1)
	// Storage: Flow CampaignsByState (r:2 w:1)
	// Storage: Flow CampaignAdmin (r:0 w:1)
	// Storage: Flow CampaignsOwnedIndex (r:0 w:1)
	// Storage: Flow CampaignOwner (r:0 w:1)
	// Storage: Flow CampaignsOwnedArray (r:0 w:1)
	// Storage: Flow CampaignsArray (r:0 w:1)
	// Storage: Flow Campaigns (r:0 w:1)
	// Storage: Flow CampaignOrg (r:0 w:1)
	// Storage: Flow CampaignsIndex (r:0 w:1)
	fn create_campaign(b: u32, ) -> Weight {
		(91_472_000 as Weight)
			// Standard Error: 10_000
			.saturating_add((682_000 as Weight).saturating_mul(b as Weight))
			.saturating_add(T::DbWeight::get().reads(12 as Weight))
			.saturating_add(T::DbWeight::get().writes(16 as Weight))
	}
	// Storage: Flow CampaignOwner (r:1 w:0)
	// Storage: Flow CampaignAdmin (r:1 w:0)
	// Storage: Flow Campaigns (r:1 w:0)
	// Storage: Flow CampaignOrg (r:1 w:0)
	// Storage: Flow CampaignsByOrg (r:1 w:0)
	// Storage: Flow CampaignState (r:1 w:1)
	// Storage: Flow CampaignsByState (r:2 w:2)
	fn update_state(b: u32, ) -> Weight {
		(54_719_000 as Weight)
			// Standard Error: 10_000
			.saturating_add((543_000 as Weight).saturating_mul(b as Weight))
			.saturating_add(T::DbWeight::get().reads(8 as Weight))
			.saturating_add(T::DbWeight::get().writes(2 as Weight))
	}
	// Storage: Tokens Accounts (r:1 w:1)
	// Storage: Flow CampaignOwner (r:1 w:0)
	// Storage: Flow Campaigns (r:1 w:0)
	// Storage: Flow CampaignState (r:1 w:0)
	// Storage: Flow CampaignContribution (r:1 w:1)
	// Storage: Flow CampaignsContributedCount (r:1 w:1)
	// Storage: Flow CampaignContributorsCount (r:1 w:1)
	// Storage: Flow CampaignContributors (r:1 w:1)
	// Storage: Flow CampaignsContributed (r:1 w:1)
	// Storage: Flow CampaignBalance (r:1 w:1)
	// Storage: Flow CampaignsContributedIndex (r:0 w:1)
	// Storage: Flow CampaignsContributedArray (r:0 w:1)
	fn contribute() -> Weight {
		(70_007_000 as Weight)
			.saturating_add(T::DbWeight::get().reads(10 as Weight))
			.saturating_add(T::DbWeight::get().writes(9 as Weight))
	}
	// Storage: Flow CampaignsByState (r:4 w:2)
	// Storage: Flow Campaigns (r:1 w:0)
	// Storage: Flow CampaignBalance (r:1 w:1)
	// Storage: Control OrgTreasury (r:1 w:0)
	// Storage: Flow CampaignContributors (r:1 w:0)
	// Storage: Flow CampaignOwner (r:1 w:0)
	// Storage: Flow ContributorsFinalized (r:1 w:1)
	// Storage: Flow CampaignContribution (r:1 w:0)
	// Storage: Tokens Accounts (r:3 w:3)
	// Storage: System Account (r:1 w:1)
	// Storage: Flow CampaignState (r:1 w:1)
	fn on_initialize(c: u32, ) -> Weight {
		(96_440_000 as Weight)
			// Standard Error: 106_000
			.saturating_add((14_849_000 as Weight).saturating_mul(c as Weight))
			.saturating_add(T::DbWeight::get().reads(14 as Weight))
			.saturating_add(T::DbWeight::get().reads((2 as Weight).saturating_mul(c as Weight)))
			.saturating_add(T::DbWeight::get().writes(9 as Weight))
			.saturating_add(T::DbWeight::get().writes((1 as Weight).saturating_mul(c as Weight)))
	}
}

// For backwards compatibility and tests
impl WeightInfo for () {
	// Storage: Control OrgController (r:1 w:0)
	// Storage: Control OrgTreasury (r:1 w:0)
	// Storage: Tokens Accounts (r:1 w:1)
	// Storage: Flow Nonce (r:1 w:1)
	// Storage: Flow CampaignsByBlock (r:1 w:1)
	// Storage: Flow CampaignsByOrg (r:1 w:1)
	// Storage: Timestamp Now (r:1 w:0)
	// Storage: Flow CampaignsCount (r:1 w:1)
	// Storage: Flow CampaignsOwnedCount (r:1 w:1)
	// Storage: Flow CampaignState (r:1 w:1)
	// Storage: Flow CampaignsByState (r:2 w:1)
	// Storage: Flow CampaignAdmin (r:0 w:1)
	// Storage: Flow CampaignsOwnedIndex (r:0 w:1)
	// Storage: Flow CampaignOwner (r:0 w:1)
	// Storage: Flow CampaignsOwnedArray (r:0 w:1)
	// Storage: Flow CampaignsArray (r:0 w:1)
	// Storage: Flow Campaigns (r:0 w:1)
	// Storage: Flow CampaignOrg (r:0 w:1)
	// Storage: Flow CampaignsIndex (r:0 w:1)
	fn create_campaign(b: u32, ) -> Weight {
		(91_472_000 as Weight)
			// Standard Error: 10_000
			.saturating_add((682_000 as Weight).saturating_mul(b as Weight))
			.saturating_add(RocksDbWeight::get().reads(12 as Weight))
			.saturating_add(RocksDbWeight::get().writes(16 as Weight))
	}
	// Storage: Flow CampaignOwner (r:1 w:0)
	// Storage: Flow CampaignAdmin (r:1 w:0)
	// Storage: Flow Campaigns (r:1 w:0)
	// Storage: Flow CampaignOrg (r:1 w:0)
	// Storage: Flow CampaignsByOrg (r:1 w:0)
	// Storage: Flow CampaignState (r:1 w:1)
	// Storage: Flow CampaignsByState (r:2 w:2)
	fn update_state(b: u32, ) -> Weight {
		(54_719_000 as Weight)
			// Standard Error: 10_000
			.saturating_add((543_000 as Weight).saturating_mul(b as Weight))
			.saturating_add(RocksDbWeight::get().reads(8 as Weight))
			.saturating_add(RocksDbWeight::get().writes(2 as Weight))
	}
	// Storage: Tokens Accounts (r:1 w:1)
	// Storage: Flow CampaignOwner (r:1 w:0)
	// Storage: Flow Campaigns (r:1 w:0)
	// Storage: Flow CampaignState (r:1 w:0)
	// Storage: Flow CampaignContribution (r:1 w:1)
	// Storage: Flow CampaignsContributedCount (r:1 w:1)
	// Storage: Flow CampaignContributorsCount (r:1 w:1)
	// Storage: Flow CampaignContributors (r:1 w:1)
	// Storage: Flow CampaignsContributed (r:1 w:1)
	// Storage: Flow CampaignBalance (r:1 w:1)
	// Storage: Flow CampaignsContributedIndex (r:0 w:1)
	// Storage: Flow CampaignsContributedArray (r:0 w:1)
	fn contribute() -> Weight {
		(70_007_000 as Weight)
			.saturating_add(RocksDbWeight::get().reads(10 as Weight))
			.saturating_add(RocksDbWeight::get().writes(9 as Weight))
	}
	// Storage: Flow CampaignsByState (r:4 w:2)
	// Storage: Flow Campaigns (r:1 w:0)
	// Storage: Flow CampaignBalance (r:1 w:1)
	// Storage: Control OrgTreasury (r:1 w:0)
	// Storage: Flow CampaignContributors (r:1 w:0)
	// Storage: Flow CampaignOwner (r:1 w:0)
	// Storage: Flow ContributorsFinalized (r:1 w:1)
	// Storage: Flow CampaignContribution (r:1 w:0)
	// Storage: Tokens Accounts (r:3 w:3)
	// Storage: System Account (r:1 w:1)
	// Storage: Flow CampaignState (r:1 w:1)
	fn on_initialize(c: u32, ) -> Weight {
		(96_440_000 as Weight)
			// Standard Error: 106_000
			.saturating_add((14_849_000 as Weight).saturating_mul(c as Weight))
			.saturating_add(RocksDbWeight::get().reads(14 as Weight))
			.saturating_add(RocksDbWeight::get().reads((2 as Weight).saturating_mul(c as Weight)))
			.saturating_add(RocksDbWeight::get().writes(9 as Weight))
			.saturating_add(RocksDbWeight::get().writes((1 as Weight).saturating_mul(c as Weight)))
	}
}
