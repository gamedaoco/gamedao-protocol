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
use gamedao_traits::ControlTrait;
use rmrk_traits::{primitives::{PartId, NftId}, Collection, Nft, ResourceInfoMin};

pub mod types;
pub use types::*;

pub type String<T> = BoundedVec<u8, <T as Config>::StringLimit>;
pub type Symbol<T> = BoundedVec<u8, <T as Config>::SymbolLimit>;
pub type Resource<T> = BoundedVec<
	ResourceInfoMin<
		BoundedVec<u8, <T as Config>::StringLimit>,
		BoundedVec<PartId, <T as Config>::PartsLimit>,
	>,
	<T as Config>::MaxResourcesOnMint,
>;

#[frame_support::pallet]
pub mod pallet {
	use super::*;
	
	#[pallet::pallet]
	#[pallet::generate_store(pub(super) trait Store)]
	pub struct Pallet<T>(_);

	#[pallet::config]
	pub trait Config: frame_system::Config + pallet_rmrk_core::Config {
		type Event: From<Event<Self>>
			+ IsType<<Self as frame_system::Config>::Event>
			+ Into<<Self as frame_system::Config>::Event>;

		type Control: ControlTrait<Self::AccountId, Self::Hash>;

		type Rmrk: Collection<String<Self>, Symbol<Self>, Self::AccountId>
			+ Nft<Self::AccountId, String<Self>, Resource<Self>>;

		/// The maximum length of a name, cid or metadata strings stored on-chain.
		#[pallet::constant]
		type StringLimit: Get<u32>;

		/// The maximum length of a Collection symbol.
		#[pallet::constant]
		type SymbolLimit: Get<u32>;

		/// The maximum number of parts each resource may have
		#[pallet::constant]
		type PartsLimit: Get<u32>;

		type MaxResourcesOnMint: Get<u32>;
	}

	#[pallet::event]
	#[pallet::generate_deposit(pub(super) fn deposit_event)]
	pub enum Event<T: Config> {
		/// New BattlePass created
		BattlepassCreated {
			org_id: T::Hash,
			battlepass_id: T::Hash,
			season: u32
		},
		
		/// BattlePass claimed
		BattlepassClaimed {
			by_who: T::AccountId,
			for_who: T::AccountId,
			org_id: T::Hash,
			battlepass_id: T::Hash,
			nft_id: NftId
		},

		/// BattlePass activated
		BattlepassActivated {
			by_who: T::AccountId,
			org_id: T::Hash,
			battlepass_id: T::Hash
		},

		/// BattlePass ended
		BattlepassEnded {
			by_who: T::AccountId,
			org_id: T::Hash,
			battlepass_id: T::Hash
		},
	}

	#[pallet::error]
	pub enum Error<T> {
		AuthorizationError,
		OrgPrimeUnknown,
		OrgUnknownOrInactive,
		BattlepassExists,
		BattlepassClaimed,
		BattlepassInactive,
		BattlepassUnknown,
		BattlepassStateUnknown,
		BattlepassStateWrong,
		BattlepassInfoUnknown,
		NotMember,
		CollectionUnknown,
	  }

	/// Battlepass by its id.
	///
	/// Battlepasses: map Hash => Battlepass
	#[pallet::storage]
	#[pallet::getter(fn get_battlepass)]
	pub(super) type Battlepasses<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, Battlepass<T::Hash, T::AccountId, String<T>>, OptionQuery>;

	/// Battlepass state.
	///
	/// BattlepassStates: map Hash => BattlepassState
	#[pallet::storage]
	#[pallet::getter(fn get_battlepass_state)]
	pub type BattlepassStates<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, BattlepassState, OptionQuery>;

	/// Battlepass info by organization.
	///
	/// BattlepassInfoByOrg: map Hash => BattlepassInfo
	#[pallet::storage]
	// #[pallet::getter(fn get_battlepass_info)]
	pub type BattlepassInfoByOrg<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, BattlepassInfo<T::Hash>, OptionQuery>;

	/// Claimed Battlepass-NFT by user and battlepass.
	///
	/// ClaimedBattlepasses: map (Hash, AccountId) => NftId
	#[pallet::storage]
	#[pallet::getter(fn get_claimed_battlepass)]
	pub(super) type ClaimedBattlepasses<T: Config> = StorageDoubleMap<_,
		Blake2_128Concat, T::Hash,
		Blake2_128Concat, T::AccountId,
		NftId,
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
			// check if Org is active
			ensure!(T::Control::is_org_active(&org_id), Error::<T>::OrgUnknownOrInactive);
			// check if origin is an Org Prime
			let prime = T::Control::org_prime_account(&org_id).ok_or(Error::<T>::OrgPrimeUnknown)?;
			ensure!(creator == prime, Error::<T>::AuthorizationError);  												// TODO: Add Bot account
			let (battlepass_count, maybe_active) = Self::get_battlepass_info(org_id);
			// check if there is no active battlepass for the Org
			ensure!(maybe_active.is_none(), Error::<T>::BattlepassExists);
			let new_season = battlepass_count + 1;

			// Create a collection to store Battlepass NFTs
			let collection_id = Self::create_collection(creator.clone())?;
			let battlepass_id = Self::do_create_battlepass(creator, org_id, name, cid, collection_id, price, new_season)?;

			Self::deposit_event(Event::BattlepassCreated { org_id, battlepass_id, season: new_season });

			Ok(())
		}

		#[pallet::weight(0)]
		pub fn claim_battlepass(
			origin: OriginFor<T>,
			battlepass_id: T::Hash,
			for_who: T::AccountId,
		) -> DispatchResult {
			let by_who = ensure_signed(origin)?;
			// check if Battlepass exists
			let battlepass = Self::get_battlepass(battlepass_id).ok_or(Error::<T>::BattlepassUnknown)?;
			// check if Battlepass in ACTIVE state
			ensure!(Self::check_battlepass_state(battlepass_id, BattlepassState::ACTIVE)?, Error::<T>::BattlepassInactive);
			// check if Org is active
			ensure!(T::Control::is_org_active(&battlepass.org_id), Error::<T>::OrgUnknownOrInactive);
			// check if origin is an Org Prime
			let prime = T::Control::org_prime_account(&battlepass.org_id).ok_or(Error::<T>::OrgPrimeUnknown)?;
			ensure!(by_who == prime, Error::<T>::AuthorizationError);  // TODO: Add Root temporarily

			// check if user is a member of organization
			ensure!(T::Control::is_org_member_active(&battlepass.org_id, &for_who), Error::<T>::NotMember);
			// check if Battlepass already claimed
			ensure!(!ClaimedBattlepasses::<T>::contains_key(battlepass_id, for_who.clone()), Error::<T>::BattlepassClaimed);

			let collection = <pallet_rmrk_core::Pallet<T>>::collections(battlepass.collection_id).ok_or(Error::<T>::CollectionUnknown)?;	
			let new_nft_id = collection.nfts_count;

			Self::do_claim_battlepass(by_who.clone(), for_who.clone(), battlepass_id, new_nft_id, battlepass.collection_id)?;

			Self::deposit_event(Event::BattlepassClaimed { by_who, for_who, org_id: battlepass.org_id, battlepass_id, nft_id: new_nft_id });

			Ok(())
		}

		#[pallet::weight(0)]
		pub fn activate_battlepass(
			origin: OriginFor<T>,
			battlepass_id: T::Hash,
		) -> DispatchResult {
			let sender = ensure_signed(origin)?;
			// check if Battlepass exists
			let battlepass = Self::get_battlepass(battlepass_id).ok_or(Error::<T>::BattlepassUnknown)?;
			// check if Battlepass in DRAFT state
			ensure!(Self::check_battlepass_state(battlepass_id, BattlepassState::DRAFT)?, Error::<T>::BattlepassStateWrong);
			// check if Org is active
			ensure!(T::Control::is_org_active(&battlepass.org_id), Error::<T>::OrgUnknownOrInactive);
			// check if origin is an Org Prime
			let prime = T::Control::org_prime_account(&battlepass.org_id).ok_or(Error::<T>::OrgPrimeUnknown)?;
			ensure!(sender == prime, Error::<T>::AuthorizationError);  // TODO: Add Root temporarily

			Self::change_battlepass_state(battlepass.org_id, battlepass_id, types::BattlepassState::ACTIVE)?;

			Self::deposit_event(Event::BattlepassActivated { by_who: sender, org_id: battlepass.org_id, battlepass_id });

			Ok(())
		}

		#[pallet::weight(0)]
		pub fn conclude_battlepass(
			origin: OriginFor<T>,
			battlepass_id: T::Hash,
		) -> DispatchResult {
			let sender = ensure_signed(origin)?;
			// check if Battlepass exists
			let battlepass = Self::get_battlepass(battlepass_id).ok_or(Error::<T>::BattlepassUnknown)?;
			// check if Battlepass in ACTIVE state
			ensure!(Self::check_battlepass_state(battlepass_id, BattlepassState::ACTIVE)?, Error::<T>::BattlepassStateWrong);
			// check if Org is active - no need to conclude battlepass
			// check if origin is an Org Prime
			let prime = T::Control::org_prime_account(&battlepass.org_id).ok_or(Error::<T>::OrgPrimeUnknown)?;
			ensure!(sender == prime, Error::<T>::AuthorizationError);  // TODO: Add Bot account

			Self::change_battlepass_state(battlepass.org_id, battlepass_id, types::BattlepassState::ENDED)?;

			Self::deposit_event(Event::BattlepassEnded { by_who: sender, org_id: battlepass.org_id, battlepass_id });

			Ok(())
		}
	}
}

impl<T: Config> Pallet<T> {
	fn create_collection(owner: T::AccountId) -> Result<u32, DispatchError> {
		let metadata = BoundedVec::truncate_from(b"meta".to_vec());		// TODO: what should be here?
		let symbol = BoundedVec::truncate_from(b"symbol".to_vec());		// TODO: what should be here?
		let collection_id = T::Rmrk::collection_create(owner, metadata, None, symbol)?;

		Ok(collection_id)
	}

	fn check_battlepass_state(battlepass_id: T::Hash, state: types::BattlepassState) -> Result<bool, DispatchError> {
		let current_state = Self::get_battlepass_state(battlepass_id).ok_or(Error::<T>::BattlepassStateUnknown)?;
		
		Ok(current_state == state)
	}

	fn get_battlepass_info(org_id: T::Hash) -> (u32, Option<T::Hash>) {
		if let Some(bp_info) = BattlepassInfoByOrg::<T>::get(&org_id) {
			return (bp_info.count, bp_info.active);
		} else {
			return (0, None);
		}
	}
	
	fn do_create_battlepass(creator: T::AccountId, org_id: T::Hash, name: String<T>, cid: String<T>, collection_id: u32, price: u16, new_season:u32) -> Result<T::Hash, DispatchError> {
		let battlepass: Battlepass<T::Hash, T::AccountId, String<T>> = types::Battlepass {
			creator, 
			org_id,
			name,
			cid,
			season: new_season,
			collection_id,
			price
		};
		let battlepass_id = <T as frame_system::Config>::Hashing::hash_of(&battlepass);

		Battlepasses::<T>::insert(&battlepass_id, battlepass);
		BattlepassStates::<T>::insert(&battlepass_id, types::BattlepassState::DRAFT);
		BattlepassInfoByOrg::<T>::insert(org_id, BattlepassInfo{count: new_season, active: Some(battlepass_id)});

		Ok(battlepass_id)
	}

	fn do_claim_battlepass(by_who: T::AccountId, for_who: T::AccountId, battlepass_id: T::Hash, nft_id: u32, collection_id: u32) -> DispatchResult {

		// Create Battlepass NFT
		// let metadata = battlepass_id.to_string().into_bytes();
		let metadata = b"meta".to_vec();
		let (_, nft_id) = T::Rmrk::nft_mint(
			by_who.clone(),									// sender
			for_who.clone(),										// owner
			nft_id,														// nft_id
			collection_id,												// collection_id
			None,									// royalty_recipient
			None,										// royalty_amount
			BoundedVec::truncate_from(metadata),				// metadata 			TODO: what should be here?
			false,										// transferable
			None												// resources
		)?;

		ClaimedBattlepasses::<T>::insert(battlepass_id, &for_who, nft_id);

		Ok(())
	}

	fn change_battlepass_state(org_id: T::Hash, battlepass_id: T::Hash, state: types::BattlepassState) -> DispatchResult {
		let active_battlepass = if state == types::BattlepassState::ACTIVE { Some(battlepass_id) } else { None };

		BattlepassStates::<T>::insert(&battlepass_id, state); 
		BattlepassInfoByOrg::<T>::try_mutate(org_id, |info| -> Result<(), DispatchError> {
			if let Some(inf) = info {
				inf.active = active_battlepass;
				Ok(())
			} else {
				return Err(Error::<T>::BattlepassInfoUnknown)?;
			}
		})?;

		Ok(())
	}
}