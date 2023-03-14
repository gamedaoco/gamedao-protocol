
//! Autogenerated weights for gamedao_battlepass
//!
//! THIS FILE WAS AUTO-GENERATED USING THE SUBSTRATE BENCHMARK CLI VERSION 4.0.0-dev
//! DATE: 2023-03-14, STEPS: `20`, REPEAT: `10`, LOW RANGE: `[]`, HIGH RANGE: `[]`
//! WORST CASE MAP SIZE: `1000000`
//! EXECUTION: Some(Wasm), WASM-EXECUTION: Compiled, CHAIN: None, DB CACHE: 1024

// Executed Command:
// ./target/release/subzero-dev
// benchmark
// pallet
// --execution=wasm
// --pallet=gamedao_battlepass
// --extrinsic=*
// --steps=20
// --repeat=10
// --output=modules/gamedao-protocol/battlepass/src/weights.rs
// --template=./.maintain/frame-weight-template.hbs

#![cfg_attr(rustfmt, rustfmt_skip)]
#![allow(unused_parens)]
#![allow(unused_imports)]

use frame_support::{traits::Get, weights::{Weight, constants::RocksDbWeight}};
use sp_std::marker::PhantomData;

/// Weight functions needed for gamedao_battlepass.
pub trait WeightInfo {
	fn create_battlepass() -> Weight;
	fn update_battlepass() -> Weight;
	fn claim_battlepass() -> Weight;
	fn activate_battlepass() -> Weight;
	fn conclude_battlepass() -> Weight;
	fn set_points() -> Weight;
	fn create_reward() -> Weight;
	fn update_reward() -> Weight;
	fn disable_reward() -> Weight;
	fn claim_reward() -> Weight;
	fn add_level() -> Weight;
	fn remove_level() -> Weight;
	fn add_bot() -> Weight;
}

/// Weights for gamedao_battlepass using the Substrate node and recommended hardware.
pub struct SubstrateWeight<T>(PhantomData<T>);
impl<T: frame_system::Config> WeightInfo for SubstrateWeight<T> {
	/// Storage: Control OrgStates (r:1 w:0)
	/// Proof: Control OrgStates (max_values: None, max_size: Some(49), added: 2524, mode: MaxEncodedLen)
	/// Storage: Control Orgs (r:1 w:0)
	/// Proof: Control Orgs (max_values: None, max_size: Some(290), added: 2765, mode: MaxEncodedLen)
	/// Storage: Battlepass BattlepassInfoByOrg (r:1 w:1)
	/// Proof: Battlepass BattlepassInfoByOrg (max_values: None, max_size: Some(118), added: 2593, mode: MaxEncodedLen)
	/// Storage: Battlepass CollectionIndex (r:1 w:1)
	/// Proof: Battlepass CollectionIndex (max_values: Some(1), max_size: Some(4), added: 499, mode: MaxEncodedLen)
	/// Storage: Uniques Class (r:1 w:1)
	/// Proof: Uniques Class (max_values: None, max_size: Some(178), added: 2653, mode: MaxEncodedLen)
	/// Storage: Uniques ClassMetadataOf (r:1 w:1)
	/// Proof: Uniques ClassMetadataOf (max_values: None, max_size: Some(167), added: 2642, mode: MaxEncodedLen)
	/// Storage: Uniques ClassAccount (r:0 w:1)
	/// Proof: Uniques ClassAccount (max_values: None, max_size: Some(68), added: 2543, mode: MaxEncodedLen)
	/// Storage: Battlepass BattlepassStates (r:0 w:1)
	/// Proof: Battlepass BattlepassStates (max_values: None, max_size: Some(49), added: 2524, mode: MaxEncodedLen)
	/// Storage: Battlepass Battlepasses (r:0 w:1)
	/// Proof: Battlepass Battlepasses (max_values: None, max_size: Some(382), added: 2857, mode: MaxEncodedLen)
	fn create_battlepass() -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `597`
		//  Estimated: `13676`
		// Minimum execution time: 87_000 nanoseconds.
		Weight::from_parts(88_000_000, 13676)
			.saturating_add(T::DbWeight::get().reads(6_u64))
			.saturating_add(T::DbWeight::get().writes(7_u64))
	}
	/// Storage: Battlepass Battlepasses (r:1 w:1)
	/// Proof: Battlepass Battlepasses (max_values: None, max_size: Some(382), added: 2857, mode: MaxEncodedLen)
	/// Storage: Battlepass BattlepassStates (r:1 w:0)
	/// Proof: Battlepass BattlepassStates (max_values: None, max_size: Some(49), added: 2524, mode: MaxEncodedLen)
	/// Storage: Control OrgStates (r:1 w:0)
	/// Proof: Control OrgStates (max_values: None, max_size: Some(49), added: 2524, mode: MaxEncodedLen)
	/// Storage: Control Orgs (r:1 w:0)
	/// Proof: Control Orgs (max_values: None, max_size: Some(290), added: 2765, mode: MaxEncodedLen)
	/// Storage: Battlepass BattlepassInfoByOrg (r:1 w:0)
	/// Proof: Battlepass BattlepassInfoByOrg (max_values: None, max_size: Some(118), added: 2593, mode: MaxEncodedLen)
	fn update_battlepass() -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `945`
		//  Estimated: `13263`
		// Minimum execution time: 33_000 nanoseconds.
		Weight::from_parts(34_000_000, 13263)
			.saturating_add(T::DbWeight::get().reads(5_u64))
			.saturating_add(T::DbWeight::get().writes(1_u64))
	}
	/// Storage: Battlepass Battlepasses (r:1 w:0)
	/// Proof: Battlepass Battlepasses (max_values: None, max_size: Some(382), added: 2857, mode: MaxEncodedLen)
	/// Storage: Battlepass BattlepassStates (r:1 w:0)
	/// Proof: Battlepass BattlepassStates (max_values: None, max_size: Some(49), added: 2524, mode: MaxEncodedLen)
	/// Storage: Control OrgStates (r:1 w:0)
	/// Proof: Control OrgStates (max_values: None, max_size: Some(49), added: 2524, mode: MaxEncodedLen)
	/// Storage: Control Orgs (r:1 w:0)
	/// Proof: Control Orgs (max_values: None, max_size: Some(290), added: 2765, mode: MaxEncodedLen)
	/// Storage: Battlepass BattlepassInfoByOrg (r:1 w:0)
	/// Proof: Battlepass BattlepassInfoByOrg (max_values: None, max_size: Some(118), added: 2593, mode: MaxEncodedLen)
	/// Storage: Uniques Account (r:1 w:1)
	/// Proof: Uniques Account (max_values: None, max_size: Some(88), added: 2563, mode: MaxEncodedLen)
	/// Storage: Battlepass NftIndex (r:1 w:1)
	/// Proof: Battlepass NftIndex (max_values: Some(1), max_size: Some(4), added: 499, mode: MaxEncodedLen)
	/// Storage: Uniques Asset (r:1 w:1)
	/// Proof: Uniques Asset (max_values: None, max_size: Some(122), added: 2597, mode: MaxEncodedLen)
	/// Storage: Uniques Class (r:1 w:1)
	/// Proof: Uniques Class (max_values: None, max_size: Some(178), added: 2653, mode: MaxEncodedLen)
	/// Storage: Uniques CollectionMaxSupply (r:1 w:0)
	/// Proof: Uniques CollectionMaxSupply (max_values: None, max_size: Some(24), added: 2499, mode: MaxEncodedLen)
	/// Storage: Uniques InstanceMetadataOf (r:1 w:1)
	/// Proof: Uniques InstanceMetadataOf (max_values: None, max_size: Some(187), added: 2662, mode: MaxEncodedLen)
	fn claim_battlepass() -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `1359`
		//  Estimated: `26736`
		// Minimum execution time: 97_000 nanoseconds.
		Weight::from_parts(98_000_000, 26736)
			.saturating_add(T::DbWeight::get().reads(11_u64))
			.saturating_add(T::DbWeight::get().writes(5_u64))
	}
	/// Storage: Battlepass Battlepasses (r:1 w:0)
	/// Proof: Battlepass Battlepasses (max_values: None, max_size: Some(382), added: 2857, mode: MaxEncodedLen)
	/// Storage: Battlepass BattlepassStates (r:1 w:1)
	/// Proof: Battlepass BattlepassStates (max_values: None, max_size: Some(49), added: 2524, mode: MaxEncodedLen)
	/// Storage: Control OrgStates (r:1 w:0)
	/// Proof: Control OrgStates (max_values: None, max_size: Some(49), added: 2524, mode: MaxEncodedLen)
	/// Storage: Control Orgs (r:1 w:0)
	/// Proof: Control Orgs (max_values: None, max_size: Some(290), added: 2765, mode: MaxEncodedLen)
	/// Storage: Battlepass BattlepassInfoByOrg (r:1 w:1)
	/// Proof: Battlepass BattlepassInfoByOrg (max_values: None, max_size: Some(118), added: 2593, mode: MaxEncodedLen)
	fn activate_battlepass() -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `880`
		//  Estimated: `13263`
		// Minimum execution time: 36_000 nanoseconds.
		Weight::from_parts(37_000_000, 13263)
			.saturating_add(T::DbWeight::get().reads(5_u64))
			.saturating_add(T::DbWeight::get().writes(2_u64))
	}
	/// Storage: Battlepass Battlepasses (r:1 w:0)
	/// Proof: Battlepass Battlepasses (max_values: None, max_size: Some(382), added: 2857, mode: MaxEncodedLen)
	/// Storage: Battlepass BattlepassStates (r:1 w:1)
	/// Proof: Battlepass BattlepassStates (max_values: None, max_size: Some(49), added: 2524, mode: MaxEncodedLen)
	/// Storage: Control Orgs (r:1 w:0)
	/// Proof: Control Orgs (max_values: None, max_size: Some(290), added: 2765, mode: MaxEncodedLen)
	/// Storage: Battlepass BattlepassInfoByOrg (r:1 w:1)
	/// Proof: Battlepass BattlepassInfoByOrg (max_values: None, max_size: Some(118), added: 2593, mode: MaxEncodedLen)
	fn conclude_battlepass() -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `907`
		//  Estimated: `10739`
		// Minimum execution time: 30_000 nanoseconds.
		Weight::from_parts(32_000_000, 10739)
			.saturating_add(T::DbWeight::get().reads(4_u64))
			.saturating_add(T::DbWeight::get().writes(2_u64))
	}
	/// Storage: Battlepass Battlepasses (r:1 w:0)
	/// Proof: Battlepass Battlepasses (max_values: None, max_size: Some(382), added: 2857, mode: MaxEncodedLen)
	/// Storage: Battlepass BattlepassStates (r:1 w:0)
	/// Proof: Battlepass BattlepassStates (max_values: None, max_size: Some(49), added: 2524, mode: MaxEncodedLen)
	/// Storage: Control OrgStates (r:1 w:0)
	/// Proof: Control OrgStates (max_values: None, max_size: Some(49), added: 2524, mode: MaxEncodedLen)
	/// Storage: Control Orgs (r:1 w:0)
	/// Proof: Control Orgs (max_values: None, max_size: Some(290), added: 2765, mode: MaxEncodedLen)
	/// Storage: Battlepass BattlepassInfoByOrg (r:1 w:0)
	/// Proof: Battlepass BattlepassInfoByOrg (max_values: None, max_size: Some(118), added: 2593, mode: MaxEncodedLen)
	/// Storage: Uniques Account (r:2 w:0)
	/// Proof: Uniques Account (max_values: None, max_size: Some(88), added: 2563, mode: MaxEncodedLen)
	/// Storage: Battlepass Points (r:0 w:1)
	/// Proof: Battlepass Points (max_values: None, max_size: Some(100), added: 2575, mode: MaxEncodedLen)
	fn set_points() -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `1417`
		//  Estimated: `18389`
		// Minimum execution time: 41_000 nanoseconds.
		Weight::from_parts(43_000_000, 18389)
			.saturating_add(T::DbWeight::get().reads(7_u64))
			.saturating_add(T::DbWeight::get().writes(1_u64))
	}
	/// Storage: Battlepass Battlepasses (r:1 w:0)
	/// Proof: Battlepass Battlepasses (max_values: None, max_size: Some(382), added: 2857, mode: MaxEncodedLen)
	/// Storage: Battlepass BattlepassStates (r:1 w:0)
	/// Proof: Battlepass BattlepassStates (max_values: None, max_size: Some(49), added: 2524, mode: MaxEncodedLen)
	/// Storage: Control OrgStates (r:1 w:0)
	/// Proof: Control OrgStates (max_values: None, max_size: Some(49), added: 2524, mode: MaxEncodedLen)
	/// Storage: Control Orgs (r:1 w:0)
	/// Proof: Control Orgs (max_values: None, max_size: Some(290), added: 2765, mode: MaxEncodedLen)
	/// Storage: Battlepass BattlepassInfoByOrg (r:1 w:0)
	/// Proof: Battlepass BattlepassInfoByOrg (max_values: None, max_size: Some(118), added: 2593, mode: MaxEncodedLen)
	/// Storage: Battlepass CollectionIndex (r:1 w:1)
	/// Proof: Battlepass CollectionIndex (max_values: Some(1), max_size: Some(4), added: 499, mode: MaxEncodedLen)
	/// Storage: Uniques Class (r:1 w:1)
	/// Proof: Uniques Class (max_values: None, max_size: Some(178), added: 2653, mode: MaxEncodedLen)
	/// Storage: Uniques ClassMetadataOf (r:1 w:1)
	/// Proof: Uniques ClassMetadataOf (max_values: None, max_size: Some(167), added: 2642, mode: MaxEncodedLen)
	/// Storage: Uniques CollectionMaxSupply (r:1 w:1)
	/// Proof: Uniques CollectionMaxSupply (max_values: None, max_size: Some(24), added: 2499, mode: MaxEncodedLen)
	/// Storage: Uniques ClassAccount (r:0 w:1)
	/// Proof: Uniques ClassAccount (max_values: None, max_size: Some(68), added: 2543, mode: MaxEncodedLen)
	/// Storage: Battlepass Rewards (r:0 w:1)
	/// Proof: Battlepass Rewards (max_values: None, max_size: Some(346), added: 2821, mode: MaxEncodedLen)
	/// Storage: Battlepass RewardStates (r:0 w:1)
	/// Proof: Battlepass RewardStates (max_values: None, max_size: Some(49), added: 2524, mode: MaxEncodedLen)
	fn create_reward() -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `1226`
		//  Estimated: `21556`
		// Minimum execution time: 110_000 nanoseconds.
		Weight::from_parts(112_000_000, 21556)
			.saturating_add(T::DbWeight::get().reads(9_u64))
			.saturating_add(T::DbWeight::get().writes(7_u64))
	}
	/// Storage: Battlepass Rewards (r:1 w:1)
	/// Proof: Battlepass Rewards (max_values: None, max_size: Some(346), added: 2821, mode: MaxEncodedLen)
	/// Storage: Battlepass RewardStates (r:1 w:0)
	/// Proof: Battlepass RewardStates (max_values: None, max_size: Some(49), added: 2524, mode: MaxEncodedLen)
	/// Storage: Battlepass Battlepasses (r:1 w:0)
	/// Proof: Battlepass Battlepasses (max_values: None, max_size: Some(382), added: 2857, mode: MaxEncodedLen)
	/// Storage: Battlepass BattlepassStates (r:1 w:0)
	/// Proof: Battlepass BattlepassStates (max_values: None, max_size: Some(49), added: 2524, mode: MaxEncodedLen)
	/// Storage: Control OrgStates (r:1 w:0)
	/// Proof: Control OrgStates (max_values: None, max_size: Some(49), added: 2524, mode: MaxEncodedLen)
	/// Storage: Control Orgs (r:1 w:0)
	/// Proof: Control Orgs (max_values: None, max_size: Some(290), added: 2765, mode: MaxEncodedLen)
	/// Storage: Battlepass BattlepassInfoByOrg (r:1 w:0)
	/// Proof: Battlepass BattlepassInfoByOrg (max_values: None, max_size: Some(118), added: 2593, mode: MaxEncodedLen)
	fn update_reward() -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `1169`
		//  Estimated: `18608`
		// Minimum execution time: 41_000 nanoseconds.
		Weight::from_parts(42_000_000, 18608)
			.saturating_add(T::DbWeight::get().reads(7_u64))
			.saturating_add(T::DbWeight::get().writes(1_u64))
	}
	/// Storage: Battlepass Rewards (r:1 w:0)
	/// Proof: Battlepass Rewards (max_values: None, max_size: Some(346), added: 2821, mode: MaxEncodedLen)
	/// Storage: Battlepass RewardStates (r:1 w:1)
	/// Proof: Battlepass RewardStates (max_values: None, max_size: Some(49), added: 2524, mode: MaxEncodedLen)
	/// Storage: Battlepass Battlepasses (r:1 w:0)
	/// Proof: Battlepass Battlepasses (max_values: None, max_size: Some(382), added: 2857, mode: MaxEncodedLen)
	/// Storage: Control Orgs (r:1 w:0)
	/// Proof: Control Orgs (max_values: None, max_size: Some(290), added: 2765, mode: MaxEncodedLen)
	/// Storage: Battlepass BattlepassInfoByOrg (r:1 w:0)
	/// Proof: Battlepass BattlepassInfoByOrg (max_values: None, max_size: Some(118), added: 2593, mode: MaxEncodedLen)
	fn disable_reward() -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `1094`
		//  Estimated: `13560`
		// Minimum execution time: 33_000 nanoseconds.
		Weight::from_parts(36_000_000, 13560)
			.saturating_add(T::DbWeight::get().reads(5_u64))
			.saturating_add(T::DbWeight::get().writes(1_u64))
	}
	/// Storage: Battlepass Rewards (r:1 w:0)
	/// Proof: Battlepass Rewards (max_values: None, max_size: Some(346), added: 2821, mode: MaxEncodedLen)
	/// Storage: Battlepass RewardStates (r:1 w:0)
	/// Proof: Battlepass RewardStates (max_values: None, max_size: Some(49), added: 2524, mode: MaxEncodedLen)
	/// Storage: Battlepass ClaimedRewards (r:1 w:1)
	/// Proof: Battlepass ClaimedRewards (max_values: None, max_size: Some(100), added: 2575, mode: MaxEncodedLen)
	/// Storage: Battlepass Battlepasses (r:1 w:0)
	/// Proof: Battlepass Battlepasses (max_values: None, max_size: Some(382), added: 2857, mode: MaxEncodedLen)
	/// Storage: Battlepass BattlepassStates (r:1 w:0)
	/// Proof: Battlepass BattlepassStates (max_values: None, max_size: Some(49), added: 2524, mode: MaxEncodedLen)
	/// Storage: Control OrgStates (r:1 w:0)
	/// Proof: Control OrgStates (max_values: None, max_size: Some(49), added: 2524, mode: MaxEncodedLen)
	/// Storage: Control Orgs (r:1 w:0)
	/// Proof: Control Orgs (max_values: None, max_size: Some(290), added: 2765, mode: MaxEncodedLen)
	/// Storage: Battlepass BattlepassInfoByOrg (r:1 w:0)
	/// Proof: Battlepass BattlepassInfoByOrg (max_values: None, max_size: Some(118), added: 2593, mode: MaxEncodedLen)
	/// Storage: Uniques Account (r:2 w:1)
	/// Proof: Uniques Account (max_values: None, max_size: Some(88), added: 2563, mode: MaxEncodedLen)
	/// Storage: Battlepass Points (r:1 w:0)
	/// Proof: Battlepass Points (max_values: None, max_size: Some(100), added: 2575, mode: MaxEncodedLen)
	/// Storage: Battlepass Levels (r:2 w:0)
	/// Proof: Battlepass Levels (max_values: None, max_size: Some(69), added: 2544, mode: MaxEncodedLen)
	/// Storage: Battlepass NftIndex (r:1 w:1)
	/// Proof: Battlepass NftIndex (max_values: Some(1), max_size: Some(4), added: 499, mode: MaxEncodedLen)
	/// Storage: Uniques Asset (r:1 w:1)
	/// Proof: Uniques Asset (max_values: None, max_size: Some(122), added: 2597, mode: MaxEncodedLen)
	/// Storage: Uniques Class (r:1 w:1)
	/// Proof: Uniques Class (max_values: None, max_size: Some(178), added: 2653, mode: MaxEncodedLen)
	/// Storage: Uniques CollectionMaxSupply (r:1 w:0)
	/// Proof: Uniques CollectionMaxSupply (max_values: None, max_size: Some(24), added: 2499, mode: MaxEncodedLen)
	/// Storage: Uniques InstanceMetadataOf (r:1 w:1)
	/// Proof: Uniques InstanceMetadataOf (max_values: None, max_size: Some(187), added: 2662, mode: MaxEncodedLen)
	fn claim_reward() -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `2203`
		//  Estimated: `44882`
		// Minimum execution time: 134_000 nanoseconds.
		Weight::from_parts(135_000_000, 44882)
			.saturating_add(T::DbWeight::get().reads(18_u64))
			.saturating_add(T::DbWeight::get().writes(6_u64))
	}
	/// Storage: Battlepass Battlepasses (r:1 w:0)
	/// Proof: Battlepass Battlepasses (max_values: None, max_size: Some(382), added: 2857, mode: MaxEncodedLen)
	/// Storage: Battlepass BattlepassStates (r:1 w:0)
	/// Proof: Battlepass BattlepassStates (max_values: None, max_size: Some(49), added: 2524, mode: MaxEncodedLen)
	/// Storage: Control OrgStates (r:1 w:0)
	/// Proof: Control OrgStates (max_values: None, max_size: Some(49), added: 2524, mode: MaxEncodedLen)
	/// Storage: Control Orgs (r:1 w:0)
	/// Proof: Control Orgs (max_values: None, max_size: Some(290), added: 2765, mode: MaxEncodedLen)
	/// Storage: Battlepass BattlepassInfoByOrg (r:1 w:0)
	/// Proof: Battlepass BattlepassInfoByOrg (max_values: None, max_size: Some(118), added: 2593, mode: MaxEncodedLen)
	/// Storage: Battlepass Levels (r:0 w:1)
	/// Proof: Battlepass Levels (max_values: None, max_size: Some(69), added: 2544, mode: MaxEncodedLen)
	fn add_level() -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `945`
		//  Estimated: `13263`
		// Minimum execution time: 31_000 nanoseconds.
		Weight::from_parts(32_000_000, 13263)
			.saturating_add(T::DbWeight::get().reads(5_u64))
			.saturating_add(T::DbWeight::get().writes(1_u64))
	}
	/// Storage: Battlepass Battlepasses (r:1 w:0)
	/// Proof: Battlepass Battlepasses (max_values: None, max_size: Some(382), added: 2857, mode: MaxEncodedLen)
	/// Storage: Battlepass BattlepassStates (r:1 w:0)
	/// Proof: Battlepass BattlepassStates (max_values: None, max_size: Some(49), added: 2524, mode: MaxEncodedLen)
	/// Storage: Control OrgStates (r:1 w:0)
	/// Proof: Control OrgStates (max_values: None, max_size: Some(49), added: 2524, mode: MaxEncodedLen)
	/// Storage: Control Orgs (r:1 w:0)
	/// Proof: Control Orgs (max_values: None, max_size: Some(290), added: 2765, mode: MaxEncodedLen)
	/// Storage: Battlepass BattlepassInfoByOrg (r:1 w:0)
	/// Proof: Battlepass BattlepassInfoByOrg (max_values: None, max_size: Some(118), added: 2593, mode: MaxEncodedLen)
	/// Storage: Battlepass Levels (r:1 w:1)
	/// Proof: Battlepass Levels (max_values: None, max_size: Some(69), added: 2544, mode: MaxEncodedLen)
	fn remove_level() -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `1038`
		//  Estimated: `15807`
		// Minimum execution time: 37_000 nanoseconds.
		Weight::from_parts(38_000_000, 15807)
			.saturating_add(T::DbWeight::get().reads(6_u64))
			.saturating_add(T::DbWeight::get().writes(1_u64))
	}
	/// Storage: Battlepass Battlepasses (r:1 w:0)
	/// Proof: Battlepass Battlepasses (max_values: None, max_size: Some(382), added: 2857, mode: MaxEncodedLen)
	/// Storage: Battlepass BattlepassStates (r:1 w:0)
	/// Proof: Battlepass BattlepassStates (max_values: None, max_size: Some(49), added: 2524, mode: MaxEncodedLen)
	/// Storage: Control OrgStates (r:1 w:0)
	/// Proof: Control OrgStates (max_values: None, max_size: Some(49), added: 2524, mode: MaxEncodedLen)
	/// Storage: Control Orgs (r:1 w:0)
	/// Proof: Control Orgs (max_values: None, max_size: Some(290), added: 2765, mode: MaxEncodedLen)
	/// Storage: Battlepass BattlepassInfoByOrg (r:1 w:1)
	/// Proof: Battlepass BattlepassInfoByOrg (max_values: None, max_size: Some(118), added: 2593, mode: MaxEncodedLen)
	fn add_bot() -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `880`
		//  Estimated: `13263`
		// Minimum execution time: 30_000 nanoseconds.
		Weight::from_parts(33_000_000, 13263)
			.saturating_add(T::DbWeight::get().reads(5_u64))
			.saturating_add(T::DbWeight::get().writes(1_u64))
	}
}

// For backwards compatibility and tests
impl WeightInfo for () {
	/// Storage: Control OrgStates (r:1 w:0)
	/// Proof: Control OrgStates (max_values: None, max_size: Some(49), added: 2524, mode: MaxEncodedLen)
	/// Storage: Control Orgs (r:1 w:0)
	/// Proof: Control Orgs (max_values: None, max_size: Some(290), added: 2765, mode: MaxEncodedLen)
	/// Storage: Battlepass BattlepassInfoByOrg (r:1 w:1)
	/// Proof: Battlepass BattlepassInfoByOrg (max_values: None, max_size: Some(118), added: 2593, mode: MaxEncodedLen)
	/// Storage: Battlepass CollectionIndex (r:1 w:1)
	/// Proof: Battlepass CollectionIndex (max_values: Some(1), max_size: Some(4), added: 499, mode: MaxEncodedLen)
	/// Storage: Uniques Class (r:1 w:1)
	/// Proof: Uniques Class (max_values: None, max_size: Some(178), added: 2653, mode: MaxEncodedLen)
	/// Storage: Uniques ClassMetadataOf (r:1 w:1)
	/// Proof: Uniques ClassMetadataOf (max_values: None, max_size: Some(167), added: 2642, mode: MaxEncodedLen)
	/// Storage: Uniques ClassAccount (r:0 w:1)
	/// Proof: Uniques ClassAccount (max_values: None, max_size: Some(68), added: 2543, mode: MaxEncodedLen)
	/// Storage: Battlepass BattlepassStates (r:0 w:1)
	/// Proof: Battlepass BattlepassStates (max_values: None, max_size: Some(49), added: 2524, mode: MaxEncodedLen)
	/// Storage: Battlepass Battlepasses (r:0 w:1)
	/// Proof: Battlepass Battlepasses (max_values: None, max_size: Some(382), added: 2857, mode: MaxEncodedLen)
	fn create_battlepass() -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `597`
		//  Estimated: `13676`
		// Minimum execution time: 87_000 nanoseconds.
		Weight::from_parts(88_000_000, 13676)
			.saturating_add(RocksDbWeight::get().reads(6_u64))
			.saturating_add(RocksDbWeight::get().writes(7_u64))
	}
	/// Storage: Battlepass Battlepasses (r:1 w:1)
	/// Proof: Battlepass Battlepasses (max_values: None, max_size: Some(382), added: 2857, mode: MaxEncodedLen)
	/// Storage: Battlepass BattlepassStates (r:1 w:0)
	/// Proof: Battlepass BattlepassStates (max_values: None, max_size: Some(49), added: 2524, mode: MaxEncodedLen)
	/// Storage: Control OrgStates (r:1 w:0)
	/// Proof: Control OrgStates (max_values: None, max_size: Some(49), added: 2524, mode: MaxEncodedLen)
	/// Storage: Control Orgs (r:1 w:0)
	/// Proof: Control Orgs (max_values: None, max_size: Some(290), added: 2765, mode: MaxEncodedLen)
	/// Storage: Battlepass BattlepassInfoByOrg (r:1 w:0)
	/// Proof: Battlepass BattlepassInfoByOrg (max_values: None, max_size: Some(118), added: 2593, mode: MaxEncodedLen)
	fn update_battlepass() -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `945`
		//  Estimated: `13263`
		// Minimum execution time: 33_000 nanoseconds.
		Weight::from_parts(34_000_000, 13263)
			.saturating_add(RocksDbWeight::get().reads(5_u64))
			.saturating_add(RocksDbWeight::get().writes(1_u64))
	}
	/// Storage: Battlepass Battlepasses (r:1 w:0)
	/// Proof: Battlepass Battlepasses (max_values: None, max_size: Some(382), added: 2857, mode: MaxEncodedLen)
	/// Storage: Battlepass BattlepassStates (r:1 w:0)
	/// Proof: Battlepass BattlepassStates (max_values: None, max_size: Some(49), added: 2524, mode: MaxEncodedLen)
	/// Storage: Control OrgStates (r:1 w:0)
	/// Proof: Control OrgStates (max_values: None, max_size: Some(49), added: 2524, mode: MaxEncodedLen)
	/// Storage: Control Orgs (r:1 w:0)
	/// Proof: Control Orgs (max_values: None, max_size: Some(290), added: 2765, mode: MaxEncodedLen)
	/// Storage: Battlepass BattlepassInfoByOrg (r:1 w:0)
	/// Proof: Battlepass BattlepassInfoByOrg (max_values: None, max_size: Some(118), added: 2593, mode: MaxEncodedLen)
	/// Storage: Uniques Account (r:1 w:1)
	/// Proof: Uniques Account (max_values: None, max_size: Some(88), added: 2563, mode: MaxEncodedLen)
	/// Storage: Battlepass NftIndex (r:1 w:1)
	/// Proof: Battlepass NftIndex (max_values: Some(1), max_size: Some(4), added: 499, mode: MaxEncodedLen)
	/// Storage: Uniques Asset (r:1 w:1)
	/// Proof: Uniques Asset (max_values: None, max_size: Some(122), added: 2597, mode: MaxEncodedLen)
	/// Storage: Uniques Class (r:1 w:1)
	/// Proof: Uniques Class (max_values: None, max_size: Some(178), added: 2653, mode: MaxEncodedLen)
	/// Storage: Uniques CollectionMaxSupply (r:1 w:0)
	/// Proof: Uniques CollectionMaxSupply (max_values: None, max_size: Some(24), added: 2499, mode: MaxEncodedLen)
	/// Storage: Uniques InstanceMetadataOf (r:1 w:1)
	/// Proof: Uniques InstanceMetadataOf (max_values: None, max_size: Some(187), added: 2662, mode: MaxEncodedLen)
	fn claim_battlepass() -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `1359`
		//  Estimated: `26736`
		// Minimum execution time: 97_000 nanoseconds.
		Weight::from_parts(98_000_000, 26736)
			.saturating_add(RocksDbWeight::get().reads(11_u64))
			.saturating_add(RocksDbWeight::get().writes(5_u64))
	}
	/// Storage: Battlepass Battlepasses (r:1 w:0)
	/// Proof: Battlepass Battlepasses (max_values: None, max_size: Some(382), added: 2857, mode: MaxEncodedLen)
	/// Storage: Battlepass BattlepassStates (r:1 w:1)
	/// Proof: Battlepass BattlepassStates (max_values: None, max_size: Some(49), added: 2524, mode: MaxEncodedLen)
	/// Storage: Control OrgStates (r:1 w:0)
	/// Proof: Control OrgStates (max_values: None, max_size: Some(49), added: 2524, mode: MaxEncodedLen)
	/// Storage: Control Orgs (r:1 w:0)
	/// Proof: Control Orgs (max_values: None, max_size: Some(290), added: 2765, mode: MaxEncodedLen)
	/// Storage: Battlepass BattlepassInfoByOrg (r:1 w:1)
	/// Proof: Battlepass BattlepassInfoByOrg (max_values: None, max_size: Some(118), added: 2593, mode: MaxEncodedLen)
	fn activate_battlepass() -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `880`
		//  Estimated: `13263`
		// Minimum execution time: 36_000 nanoseconds.
		Weight::from_parts(37_000_000, 13263)
			.saturating_add(RocksDbWeight::get().reads(5_u64))
			.saturating_add(RocksDbWeight::get().writes(2_u64))
	}
	/// Storage: Battlepass Battlepasses (r:1 w:0)
	/// Proof: Battlepass Battlepasses (max_values: None, max_size: Some(382), added: 2857, mode: MaxEncodedLen)
	/// Storage: Battlepass BattlepassStates (r:1 w:1)
	/// Proof: Battlepass BattlepassStates (max_values: None, max_size: Some(49), added: 2524, mode: MaxEncodedLen)
	/// Storage: Control Orgs (r:1 w:0)
	/// Proof: Control Orgs (max_values: None, max_size: Some(290), added: 2765, mode: MaxEncodedLen)
	/// Storage: Battlepass BattlepassInfoByOrg (r:1 w:1)
	/// Proof: Battlepass BattlepassInfoByOrg (max_values: None, max_size: Some(118), added: 2593, mode: MaxEncodedLen)
	fn conclude_battlepass() -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `907`
		//  Estimated: `10739`
		// Minimum execution time: 30_000 nanoseconds.
		Weight::from_parts(32_000_000, 10739)
			.saturating_add(RocksDbWeight::get().reads(4_u64))
			.saturating_add(RocksDbWeight::get().writes(2_u64))
	}
	/// Storage: Battlepass Battlepasses (r:1 w:0)
	/// Proof: Battlepass Battlepasses (max_values: None, max_size: Some(382), added: 2857, mode: MaxEncodedLen)
	/// Storage: Battlepass BattlepassStates (r:1 w:0)
	/// Proof: Battlepass BattlepassStates (max_values: None, max_size: Some(49), added: 2524, mode: MaxEncodedLen)
	/// Storage: Control OrgStates (r:1 w:0)
	/// Proof: Control OrgStates (max_values: None, max_size: Some(49), added: 2524, mode: MaxEncodedLen)
	/// Storage: Control Orgs (r:1 w:0)
	/// Proof: Control Orgs (max_values: None, max_size: Some(290), added: 2765, mode: MaxEncodedLen)
	/// Storage: Battlepass BattlepassInfoByOrg (r:1 w:0)
	/// Proof: Battlepass BattlepassInfoByOrg (max_values: None, max_size: Some(118), added: 2593, mode: MaxEncodedLen)
	/// Storage: Uniques Account (r:2 w:0)
	/// Proof: Uniques Account (max_values: None, max_size: Some(88), added: 2563, mode: MaxEncodedLen)
	/// Storage: Battlepass Points (r:0 w:1)
	/// Proof: Battlepass Points (max_values: None, max_size: Some(100), added: 2575, mode: MaxEncodedLen)
	fn set_points() -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `1417`
		//  Estimated: `18389`
		// Minimum execution time: 41_000 nanoseconds.
		Weight::from_parts(43_000_000, 18389)
			.saturating_add(RocksDbWeight::get().reads(7_u64))
			.saturating_add(RocksDbWeight::get().writes(1_u64))
	}
	/// Storage: Battlepass Battlepasses (r:1 w:0)
	/// Proof: Battlepass Battlepasses (max_values: None, max_size: Some(382), added: 2857, mode: MaxEncodedLen)
	/// Storage: Battlepass BattlepassStates (r:1 w:0)
	/// Proof: Battlepass BattlepassStates (max_values: None, max_size: Some(49), added: 2524, mode: MaxEncodedLen)
	/// Storage: Control OrgStates (r:1 w:0)
	/// Proof: Control OrgStates (max_values: None, max_size: Some(49), added: 2524, mode: MaxEncodedLen)
	/// Storage: Control Orgs (r:1 w:0)
	/// Proof: Control Orgs (max_values: None, max_size: Some(290), added: 2765, mode: MaxEncodedLen)
	/// Storage: Battlepass BattlepassInfoByOrg (r:1 w:0)
	/// Proof: Battlepass BattlepassInfoByOrg (max_values: None, max_size: Some(118), added: 2593, mode: MaxEncodedLen)
	/// Storage: Battlepass CollectionIndex (r:1 w:1)
	/// Proof: Battlepass CollectionIndex (max_values: Some(1), max_size: Some(4), added: 499, mode: MaxEncodedLen)
	/// Storage: Uniques Class (r:1 w:1)
	/// Proof: Uniques Class (max_values: None, max_size: Some(178), added: 2653, mode: MaxEncodedLen)
	/// Storage: Uniques ClassMetadataOf (r:1 w:1)
	/// Proof: Uniques ClassMetadataOf (max_values: None, max_size: Some(167), added: 2642, mode: MaxEncodedLen)
	/// Storage: Uniques CollectionMaxSupply (r:1 w:1)
	/// Proof: Uniques CollectionMaxSupply (max_values: None, max_size: Some(24), added: 2499, mode: MaxEncodedLen)
	/// Storage: Uniques ClassAccount (r:0 w:1)
	/// Proof: Uniques ClassAccount (max_values: None, max_size: Some(68), added: 2543, mode: MaxEncodedLen)
	/// Storage: Battlepass Rewards (r:0 w:1)
	/// Proof: Battlepass Rewards (max_values: None, max_size: Some(346), added: 2821, mode: MaxEncodedLen)
	/// Storage: Battlepass RewardStates (r:0 w:1)
	/// Proof: Battlepass RewardStates (max_values: None, max_size: Some(49), added: 2524, mode: MaxEncodedLen)
	fn create_reward() -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `1226`
		//  Estimated: `21556`
		// Minimum execution time: 110_000 nanoseconds.
		Weight::from_parts(112_000_000, 21556)
			.saturating_add(RocksDbWeight::get().reads(9_u64))
			.saturating_add(RocksDbWeight::get().writes(7_u64))
	}
	/// Storage: Battlepass Rewards (r:1 w:1)
	/// Proof: Battlepass Rewards (max_values: None, max_size: Some(346), added: 2821, mode: MaxEncodedLen)
	/// Storage: Battlepass RewardStates (r:1 w:0)
	/// Proof: Battlepass RewardStates (max_values: None, max_size: Some(49), added: 2524, mode: MaxEncodedLen)
	/// Storage: Battlepass Battlepasses (r:1 w:0)
	/// Proof: Battlepass Battlepasses (max_values: None, max_size: Some(382), added: 2857, mode: MaxEncodedLen)
	/// Storage: Battlepass BattlepassStates (r:1 w:0)
	/// Proof: Battlepass BattlepassStates (max_values: None, max_size: Some(49), added: 2524, mode: MaxEncodedLen)
	/// Storage: Control OrgStates (r:1 w:0)
	/// Proof: Control OrgStates (max_values: None, max_size: Some(49), added: 2524, mode: MaxEncodedLen)
	/// Storage: Control Orgs (r:1 w:0)
	/// Proof: Control Orgs (max_values: None, max_size: Some(290), added: 2765, mode: MaxEncodedLen)
	/// Storage: Battlepass BattlepassInfoByOrg (r:1 w:0)
	/// Proof: Battlepass BattlepassInfoByOrg (max_values: None, max_size: Some(118), added: 2593, mode: MaxEncodedLen)
	fn update_reward() -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `1169`
		//  Estimated: `18608`
		// Minimum execution time: 41_000 nanoseconds.
		Weight::from_parts(42_000_000, 18608)
			.saturating_add(RocksDbWeight::get().reads(7_u64))
			.saturating_add(RocksDbWeight::get().writes(1_u64))
	}
	/// Storage: Battlepass Rewards (r:1 w:0)
	/// Proof: Battlepass Rewards (max_values: None, max_size: Some(346), added: 2821, mode: MaxEncodedLen)
	/// Storage: Battlepass RewardStates (r:1 w:1)
	/// Proof: Battlepass RewardStates (max_values: None, max_size: Some(49), added: 2524, mode: MaxEncodedLen)
	/// Storage: Battlepass Battlepasses (r:1 w:0)
	/// Proof: Battlepass Battlepasses (max_values: None, max_size: Some(382), added: 2857, mode: MaxEncodedLen)
	/// Storage: Control Orgs (r:1 w:0)
	/// Proof: Control Orgs (max_values: None, max_size: Some(290), added: 2765, mode: MaxEncodedLen)
	/// Storage: Battlepass BattlepassInfoByOrg (r:1 w:0)
	/// Proof: Battlepass BattlepassInfoByOrg (max_values: None, max_size: Some(118), added: 2593, mode: MaxEncodedLen)
	fn disable_reward() -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `1094`
		//  Estimated: `13560`
		// Minimum execution time: 33_000 nanoseconds.
		Weight::from_parts(36_000_000, 13560)
			.saturating_add(RocksDbWeight::get().reads(5_u64))
			.saturating_add(RocksDbWeight::get().writes(1_u64))
	}
	/// Storage: Battlepass Rewards (r:1 w:0)
	/// Proof: Battlepass Rewards (max_values: None, max_size: Some(346), added: 2821, mode: MaxEncodedLen)
	/// Storage: Battlepass RewardStates (r:1 w:0)
	/// Proof: Battlepass RewardStates (max_values: None, max_size: Some(49), added: 2524, mode: MaxEncodedLen)
	/// Storage: Battlepass ClaimedRewards (r:1 w:1)
	/// Proof: Battlepass ClaimedRewards (max_values: None, max_size: Some(100), added: 2575, mode: MaxEncodedLen)
	/// Storage: Battlepass Battlepasses (r:1 w:0)
	/// Proof: Battlepass Battlepasses (max_values: None, max_size: Some(382), added: 2857, mode: MaxEncodedLen)
	/// Storage: Battlepass BattlepassStates (r:1 w:0)
	/// Proof: Battlepass BattlepassStates (max_values: None, max_size: Some(49), added: 2524, mode: MaxEncodedLen)
	/// Storage: Control OrgStates (r:1 w:0)
	/// Proof: Control OrgStates (max_values: None, max_size: Some(49), added: 2524, mode: MaxEncodedLen)
	/// Storage: Control Orgs (r:1 w:0)
	/// Proof: Control Orgs (max_values: None, max_size: Some(290), added: 2765, mode: MaxEncodedLen)
	/// Storage: Battlepass BattlepassInfoByOrg (r:1 w:0)
	/// Proof: Battlepass BattlepassInfoByOrg (max_values: None, max_size: Some(118), added: 2593, mode: MaxEncodedLen)
	/// Storage: Uniques Account (r:2 w:1)
	/// Proof: Uniques Account (max_values: None, max_size: Some(88), added: 2563, mode: MaxEncodedLen)
	/// Storage: Battlepass Points (r:1 w:0)
	/// Proof: Battlepass Points (max_values: None, max_size: Some(100), added: 2575, mode: MaxEncodedLen)
	/// Storage: Battlepass Levels (r:2 w:0)
	/// Proof: Battlepass Levels (max_values: None, max_size: Some(69), added: 2544, mode: MaxEncodedLen)
	/// Storage: Battlepass NftIndex (r:1 w:1)
	/// Proof: Battlepass NftIndex (max_values: Some(1), max_size: Some(4), added: 499, mode: MaxEncodedLen)
	/// Storage: Uniques Asset (r:1 w:1)
	/// Proof: Uniques Asset (max_values: None, max_size: Some(122), added: 2597, mode: MaxEncodedLen)
	/// Storage: Uniques Class (r:1 w:1)
	/// Proof: Uniques Class (max_values: None, max_size: Some(178), added: 2653, mode: MaxEncodedLen)
	/// Storage: Uniques CollectionMaxSupply (r:1 w:0)
	/// Proof: Uniques CollectionMaxSupply (max_values: None, max_size: Some(24), added: 2499, mode: MaxEncodedLen)
	/// Storage: Uniques InstanceMetadataOf (r:1 w:1)
	/// Proof: Uniques InstanceMetadataOf (max_values: None, max_size: Some(187), added: 2662, mode: MaxEncodedLen)
	fn claim_reward() -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `2203`
		//  Estimated: `44882`
		// Minimum execution time: 134_000 nanoseconds.
		Weight::from_parts(135_000_000, 44882)
			.saturating_add(RocksDbWeight::get().reads(18_u64))
			.saturating_add(RocksDbWeight::get().writes(6_u64))
	}
	/// Storage: Battlepass Battlepasses (r:1 w:0)
	/// Proof: Battlepass Battlepasses (max_values: None, max_size: Some(382), added: 2857, mode: MaxEncodedLen)
	/// Storage: Battlepass BattlepassStates (r:1 w:0)
	/// Proof: Battlepass BattlepassStates (max_values: None, max_size: Some(49), added: 2524, mode: MaxEncodedLen)
	/// Storage: Control OrgStates (r:1 w:0)
	/// Proof: Control OrgStates (max_values: None, max_size: Some(49), added: 2524, mode: MaxEncodedLen)
	/// Storage: Control Orgs (r:1 w:0)
	/// Proof: Control Orgs (max_values: None, max_size: Some(290), added: 2765, mode: MaxEncodedLen)
	/// Storage: Battlepass BattlepassInfoByOrg (r:1 w:0)
	/// Proof: Battlepass BattlepassInfoByOrg (max_values: None, max_size: Some(118), added: 2593, mode: MaxEncodedLen)
	/// Storage: Battlepass Levels (r:0 w:1)
	/// Proof: Battlepass Levels (max_values: None, max_size: Some(69), added: 2544, mode: MaxEncodedLen)
	fn add_level() -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `945`
		//  Estimated: `13263`
		// Minimum execution time: 31_000 nanoseconds.
		Weight::from_parts(32_000_000, 13263)
			.saturating_add(RocksDbWeight::get().reads(5_u64))
			.saturating_add(RocksDbWeight::get().writes(1_u64))
	}
	/// Storage: Battlepass Battlepasses (r:1 w:0)
	/// Proof: Battlepass Battlepasses (max_values: None, max_size: Some(382), added: 2857, mode: MaxEncodedLen)
	/// Storage: Battlepass BattlepassStates (r:1 w:0)
	/// Proof: Battlepass BattlepassStates (max_values: None, max_size: Some(49), added: 2524, mode: MaxEncodedLen)
	/// Storage: Control OrgStates (r:1 w:0)
	/// Proof: Control OrgStates (max_values: None, max_size: Some(49), added: 2524, mode: MaxEncodedLen)
	/// Storage: Control Orgs (r:1 w:0)
	/// Proof: Control Orgs (max_values: None, max_size: Some(290), added: 2765, mode: MaxEncodedLen)
	/// Storage: Battlepass BattlepassInfoByOrg (r:1 w:0)
	/// Proof: Battlepass BattlepassInfoByOrg (max_values: None, max_size: Some(118), added: 2593, mode: MaxEncodedLen)
	/// Storage: Battlepass Levels (r:1 w:1)
	/// Proof: Battlepass Levels (max_values: None, max_size: Some(69), added: 2544, mode: MaxEncodedLen)
	fn remove_level() -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `1038`
		//  Estimated: `15807`
		// Minimum execution time: 37_000 nanoseconds.
		Weight::from_parts(38_000_000, 15807)
			.saturating_add(RocksDbWeight::get().reads(6_u64))
			.saturating_add(RocksDbWeight::get().writes(1_u64))
	}
	/// Storage: Battlepass Battlepasses (r:1 w:0)
	/// Proof: Battlepass Battlepasses (max_values: None, max_size: Some(382), added: 2857, mode: MaxEncodedLen)
	/// Storage: Battlepass BattlepassStates (r:1 w:0)
	/// Proof: Battlepass BattlepassStates (max_values: None, max_size: Some(49), added: 2524, mode: MaxEncodedLen)
	/// Storage: Control OrgStates (r:1 w:0)
	/// Proof: Control OrgStates (max_values: None, max_size: Some(49), added: 2524, mode: MaxEncodedLen)
	/// Storage: Control Orgs (r:1 w:0)
	/// Proof: Control Orgs (max_values: None, max_size: Some(290), added: 2765, mode: MaxEncodedLen)
	/// Storage: Battlepass BattlepassInfoByOrg (r:1 w:1)
	/// Proof: Battlepass BattlepassInfoByOrg (max_values: None, max_size: Some(118), added: 2593, mode: MaxEncodedLen)
	fn add_bot() -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `880`
		//  Estimated: `13263`
		// Minimum execution time: 30_000 nanoseconds.
		Weight::from_parts(33_000_000, 13263)
			.saturating_add(RocksDbWeight::get().reads(5_u64))
			.saturating_add(RocksDbWeight::get().writes(1_u64))
	}
}