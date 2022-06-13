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

//! Autogenerated weights for gamedao_control
//!
//! THIS FILE WAS AUTO-GENERATED USING THE SUBSTRATE BENCHMARK CLI VERSION 4.0.0-dev
//! DATE: 2022-06-13, STEPS: `20`, REPEAT: 10, LOW RANGE: `[]`, HIGH RANGE: `[]`
//! EXECUTION: None, WASM-EXECUTION: Compiled, CHAIN: None, DB CACHE: 128

// Executed Command:
// ./target/release/subzero
// benchmark
// --pallet=gamedao_control
// --extrinsic=*
// --steps=20
// --repeat=10
// --output=gamedao-protocol/control/src/weights.rs
// --template=./.maintain/frame-weight-template.hbs

#![cfg_attr(rustfmt, rustfmt_skip)]
#![allow(unused_parens)]
#![allow(unused_imports)]

use frame_support::{traits::Get, weights::{Weight, constants::RocksDbWeight}};
use sp_std::marker::PhantomData;

/// Weight functions needed for gamedao_control.
pub trait WeightInfo {
	fn create_org() -> Weight;
	fn disable_org() -> Weight;
	fn enable_org() -> Weight;
	fn add_member(r: u32, ) -> Weight;
	fn remove_member(r: u32, ) -> Weight;
	fn check_membership() -> Weight;
}

/// Weights for gamedao_control using the Substrate node and recommended hardware.
pub struct SubstrateWeight<T>(PhantomData<T>);
impl<T: frame_system::Config> WeightInfo for SubstrateWeight<T> {
	// Storage: Tokens Accounts (r:2 w:2)
	// Storage: Control Nonce (r:1 w:1)
	// Storage: System Account (r:1 w:1)
	// Storage: Control Orgs (r:1 w:1)
	// Storage: Control OrgsControlled (r:1 w:1)
	// Storage: Control OrgsControlledCount (r:1 w:1)
	// Storage: Control OrgsCreated (r:1 w:1)
	// Storage: Control OrgMembers (r:1 w:1)
	// Storage: Control Memberships (r:1 w:1)
	// Storage: Control OrgState (r:0 w:1)
	// Storage: Control OrgMemberCount (r:0 w:1)
	// Storage: Control OrgTreasury (r:0 w:1)
	// Storage: Control OrgByNonce (r:0 w:1)
	// Storage: Control OrgAccess (r:0 w:1)
	// Storage: Control OrgController (r:0 w:1)
	// Storage: Control OrgConfiguration (r:0 w:1)
	// Storage: Control OrgMemberState (r:0 w:1)
	// Storage: Control OrgCreator (r:0 w:1)
	fn create_org() -> Weight {
		(84_592_000 as Weight)
			.saturating_add(T::DbWeight::get().reads(10 as Weight))
			.saturating_add(T::DbWeight::get().writes(19 as Weight))
	}
	// Storage: Control OrgState (r:0 w:1)
	fn disable_org() -> Weight {
		(16_721_000 as Weight)
			.saturating_add(T::DbWeight::get().writes(1 as Weight))
	}
	// Storage: Control OrgState (r:0 w:1)
	fn enable_org() -> Weight {
		(16_126_000 as Weight)
			.saturating_add(T::DbWeight::get().writes(1 as Weight))
	}
	// Storage: Control Orgs (r:1 w:0)
	// Storage: Control OrgMembers (r:1 w:1)
	// Storage: Control OrgConfiguration (r:1 w:0)
	// Storage: Tokens Accounts (r:1 w:0)
	// Storage: Control Memberships (r:1 w:1)
	// Storage: Control OrgMemberCount (r:0 w:1)
	// Storage: Control OrgMemberState (r:0 w:1)
	fn add_member(r: u32, ) -> Weight {
		(63_771_000 as Weight)
			// Standard Error: 4_000
			.saturating_add((208_000 as Weight).saturating_mul(r as Weight))
			.saturating_add(T::DbWeight::get().reads(5 as Weight))
			.saturating_add(T::DbWeight::get().writes(4 as Weight))
	}
	// Storage: Control Orgs (r:1 w:0)
	// Storage: Control OrgMembers (r:1 w:1)
	// Storage: Control Memberships (r:1 w:1)
	// Storage: Control OrgConfiguration (r:1 w:0)
	// Storage: Control OrgMemberCount (r:0 w:1)
	// Storage: Control OrgMemberState (r:0 w:1)
	fn remove_member(r: u32, ) -> Weight {
		(71_829_000 as Weight)
			// Standard Error: 5_000
			.saturating_add((196_000 as Weight).saturating_mul(r as Weight))
			.saturating_add(T::DbWeight::get().reads(4 as Weight))
			.saturating_add(T::DbWeight::get().writes(4 as Weight))
	}
	// Storage: Control OrgMembers (r:1 w:0)
	fn check_membership() -> Weight {
		(17_996_000 as Weight)
			.saturating_add(T::DbWeight::get().reads(1 as Weight))
	}
}

// For backwards compatibility and tests
impl WeightInfo for () {
	// Storage: Tokens Accounts (r:2 w:2)
	// Storage: Control Nonce (r:1 w:1)
	// Storage: System Account (r:1 w:1)
	// Storage: Control Orgs (r:1 w:1)
	// Storage: Control OrgsControlled (r:1 w:1)
	// Storage: Control OrgsControlledCount (r:1 w:1)
	// Storage: Control OrgsCreated (r:1 w:1)
	// Storage: Control OrgMembers (r:1 w:1)
	// Storage: Control Memberships (r:1 w:1)
	// Storage: Control OrgState (r:0 w:1)
	// Storage: Control OrgMemberCount (r:0 w:1)
	// Storage: Control OrgTreasury (r:0 w:1)
	// Storage: Control OrgByNonce (r:0 w:1)
	// Storage: Control OrgAccess (r:0 w:1)
	// Storage: Control OrgController (r:0 w:1)
	// Storage: Control OrgConfiguration (r:0 w:1)
	// Storage: Control OrgMemberState (r:0 w:1)
	// Storage: Control OrgCreator (r:0 w:1)
	fn create_org() -> Weight {
		(84_592_000 as Weight)
			.saturating_add(RocksDbWeight::get().reads(10 as Weight))
			.saturating_add(RocksDbWeight::get().writes(19 as Weight))
	}
	// Storage: Control OrgState (r:0 w:1)
	fn disable_org() -> Weight {
		(16_721_000 as Weight)
			.saturating_add(RocksDbWeight::get().writes(1 as Weight))
	}
	// Storage: Control OrgState (r:0 w:1)
	fn enable_org() -> Weight {
		(16_126_000 as Weight)
			.saturating_add(RocksDbWeight::get().writes(1 as Weight))
	}
	// Storage: Control Orgs (r:1 w:0)
	// Storage: Control OrgMembers (r:1 w:1)
	// Storage: Control OrgConfiguration (r:1 w:0)
	// Storage: Tokens Accounts (r:1 w:0)
	// Storage: Control Memberships (r:1 w:1)
	// Storage: Control OrgMemberCount (r:0 w:1)
	// Storage: Control OrgMemberState (r:0 w:1)
	fn add_member(r: u32, ) -> Weight {
		(63_771_000 as Weight)
			// Standard Error: 4_000
			.saturating_add((208_000 as Weight).saturating_mul(r as Weight))
			.saturating_add(RocksDbWeight::get().reads(5 as Weight))
			.saturating_add(RocksDbWeight::get().writes(4 as Weight))
	}
	// Storage: Control Orgs (r:1 w:0)
	// Storage: Control OrgMembers (r:1 w:1)
	// Storage: Control Memberships (r:1 w:1)
	// Storage: Control OrgConfiguration (r:1 w:0)
	// Storage: Control OrgMemberCount (r:0 w:1)
	// Storage: Control OrgMemberState (r:0 w:1)
	fn remove_member(r: u32, ) -> Weight {
		(71_829_000 as Weight)
			// Standard Error: 5_000
			.saturating_add((196_000 as Weight).saturating_mul(r as Weight))
			.saturating_add(RocksDbWeight::get().reads(4 as Weight))
			.saturating_add(RocksDbWeight::get().writes(4 as Weight))
	}
	// Storage: Control OrgMembers (r:1 w:0)
	fn check_membership() -> Weight {
		(17_996_000 as Weight)
			.saturating_add(RocksDbWeight::get().reads(1 as Weight))
	}
}
