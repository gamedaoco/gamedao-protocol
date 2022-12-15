//      _______  ________  ________  ________   ______   _______   _______
//    ╱╱       ╲╱        ╲╱        ╲╱        ╲_╱      ╲╲╱       ╲╲╱       ╲╲
//   ╱╱      __╱         ╱         ╱         ╱        ╱╱        ╱╱        ╱╱
//  ╱       ╱ ╱         ╱         ╱        _╱         ╱         ╱         ╱
//  ╲________╱╲___╱____╱╲__╱__╱__╱╲________╱╲________╱╲___╱____╱╲________╱
//
// This file is part of GameDAO Protocol.
// Copyright (C) 2018-2022 GameDAO AG.
// SPDX-License-Identifier: Apache-2.0

//! BATTLEPASS
//! This pallet provides functionality to create, manage and participate in battlepasses.
#![cfg_attr(not(feature = "std"), no_std)]

pub use pallet::*;
use frame_support::pallet_prelude::*;
use frame_system::pallet_prelude::*;
use sp_std::convert::TryInto;
use sp_runtime::traits::Hash;

pub mod types;
pub use types::*;

type String<T> = BoundedVec<u8, <T as pallet::Config>::StringLimit>;

#[frame_support::pallet]
pub mod pallet {
	use super::*;
  
	#[pallet::pallet]
	#[pallet::generate_store(pub(super) trait Store)]
	pub struct Pallet<T>(_);

	#[pallet::config]
	pub trait Config: frame_system::Config {
		type Event: From<Event<Self>>
			+ IsType<<Self as frame_system::Config>::Event>
			+ Into<<Self as frame_system::Config>::Event>;

		/// The maximum length of a name or cid stored on-chain.
		#[pallet::constant]
		type StringLimit: Get<u32>;
	}

	#[pallet::event]
	#[pallet::generate_deposit(pub(super) fn deposit_event)]
	pub enum Event<T: Config> {
		/// New BattlePass created
		BattlepassCreated {
			// org_id: T::Hash,
			org_id: T::Hash,
			battlepass_id: T::Hash,
			block_number: T::BlockNumber
		},
		
		/// BattlePass claimed
		BattlepassClaimed {
			claimer: T::AccountId,
			org_id: T::Hash,
			battlepass_id: T::Hash,
			nft_id: T::Hash,
			block_number: T::BlockNumber
		},
	}

	#[pallet::error]
	pub enum Error<T> {
		AuthorizationError,
		MissingParameter,
		InvalidParameter,
		OrganizationUnknown,
		OrgHasActiveBattlepass,
		BattlepassExists,
		BattlepassClaimed,
		BattlepassUnknown,
		NotMember,
	  }

	/// Battlepass by its id.
	///
	/// Battlepasses: map Hash => Battlepass
	#[pallet::storage]
	#[pallet::getter(fn get_battlepass)]
	pub(super) type Battlepasses<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, Battlepass<T::Hash, T::AccountId, T::BlockNumber, String<T>>, OptionQuery>;

	/// Number of battlepasses per organization.
	///
	/// BattlepassCount: map Hash => u32
	#[pallet::storage]
	#[pallet::getter(fn get_battlepass_count)]
	pub type BattlepassCount<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, u32, ValueQuery>;

	/// Current active battlepass in organization.
	///
	/// ActiveBattlepassByOrg: map Hash => Hash
	#[pallet::storage]
	#[pallet::getter(fn get_active_battlepass)]
	pub type ActiveBattlepassByOrg<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, T::Hash, OptionQuery>;

	/// Claimed Battlepass by user.
	///
	/// ClaimedBattlepass: map (AccountId, Hash) => Hash
	#[pallet::storage]
	#[pallet::getter(fn get_claimed_battlepass)]
	pub(super) type ClaimedBattlepass<T: Config> = StorageDoubleMap<_,
		Blake2_128Concat, T::AccountId,
		Blake2_128Concat, T::Hash,
		T::Hash,
		OptionQuery
	>;

	#[pallet::call]
	impl<T: Config> Pallet<T> {
		#[pallet::weight(0)]
		pub fn create_battlepass(
			origin: OriginFor<T>,
			org_id: T::Hash,
			name: String<T>,
			cid: String<T>,
			price: u16,
		) -> DispatchResult {
			let creator = ensure_signed(origin)?;

			// check if origin is Org Prime or Root

			// check if Org exists

			// check if active battlepass does not exist for the Org


			
			// Create Battlepass
			let now = <frame_system::Pallet<T>>::block_number();
			let battlepass: Battlepass<T::Hash, T::AccountId, T::BlockNumber, String<T>> = types::Battlepass {
				creator, 
				org_id,
				name,
				cid,
				state: types::BattlepassState::Active,
				season: Self::get_battlepass_count(org_id),
				price,
				created: now.clone(), mutated: now
			};
			let battlepass_id = <T as frame_system::Config>::Hashing::hash_of(&battlepass);

			Battlepasses::<T>::insert(&battlepass_id, battlepass);

			Self::deposit_event(Event::BattlepassCreated { org_id, battlepass_id, block_number: now });

			Ok(())
		}

		#[pallet::weight(0)]
		pub fn claim_battlepass(
			origin: OriginFor<T>,
			org_id: T::Hash,
		) -> DispatchResult {
			let claimer = ensure_signed(origin)?;
			let battlepass_id = Self::get_active_battlepass(org_id).ok_or(Error::<T>::BattlepassUnknown)?;
			let now = <frame_system::Pallet<T>>::block_number();

			// check if user is a member of organization

			// check if Org exists

			// check if Org has active battlepass

			// check if Battlepass already claimed

			
			

			// Create NFT
			let nft_id = <T as frame_system::Config>::Hashing::hash_of(&claimer);

			
			ClaimedBattlepass::<T>::insert(&claimer, battlepass_id, nft_id);

			Self::deposit_event(Event::BattlepassClaimed { claimer, org_id, battlepass_id, nft_id, block_number: now });

			Ok(())
		}

	}
}