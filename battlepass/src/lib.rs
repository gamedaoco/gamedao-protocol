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
use rmrk_traits::{primitives::PartId, Collection, Nft, ResourceInfoMin};

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
			claimer: T::AccountId,
			org_id: T::Hash,
			battlepass_id: T::Hash
		},

		/// BattlePass closed
		BattlepassClosed {
			closed_by: T::AccountId,
			org_id: T::Hash,
			battlepass_id: T::Hash
		},
	}

	#[pallet::error]
	pub enum Error<T> {
		AuthorizationError,
		OrgPrimeUnknown,
		OrgUnknown,
		BattlepassExists,
		BattlepassClaimed,
		BattlepassUnknown,
		NotMember,
		CollectionUnknown,
	  }

	/// Battlepass by its id.
	///
	/// Battlepasses: map Hash => Battlepass
	#[pallet::storage]
	#[pallet::getter(fn get_battlepass)]
	pub(super) type Battlepasses<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, Battlepass<T::Hash, T::AccountId, T::BlockNumber, String<T>>, OptionQuery>;

	/// Battlepass state.
	///
	/// BattlepassStates: map Hash => BattlepassState
	#[pallet::storage]
	#[pallet::getter(fn get_battlepass_state)]
	pub type BattlepassStates<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, BattlepassState, OptionQuery>;

	/// Total number of battlepasses per organization.
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

	/// Claimed Battlepass-NFT by user account.
	///
	/// ClaimedBattlepass: map (AccountId, Hash) => BattlepassNft
	#[pallet::storage]
	#[pallet::getter(fn get_claimed_battlepass)]
	pub(super) type ClaimedBattlepass<T: Config> = StorageDoubleMap<_,
		Blake2_128Concat, T::AccountId,
		Blake2_128Concat, T::Hash,
		BattlepassNft,
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
			// check if Org exists
			ensure!(T::Control::is_org_active(&org_id), Error::<T>::OrgUnknown);
			// check if origin is an Org Prime
			let prime = T::Control::org_prime_account(&org_id).ok_or(Error::<T>::OrgPrimeUnknown)?;
			ensure!(creator == prime, Error::<T>::AuthorizationError);  												// TODO: Add Root temporaryly
			// check is there is no active battlepass for the Org
			ensure!(!ActiveBattlepassByOrg::<T>::contains_key(&org_id), Error::<T>::BattlepassExists);
			let new_season = Self::get_battlepass_count(org_id) + 1;
			let now = <frame_system::Pallet<T>>::block_number();

			// Create collection 
			let metadata = BoundedVec::truncate_from(b"meta".to_vec());		// TODO: what should be here?
			let symbol = BoundedVec::truncate_from(b"symbol".to_vec());		// TODO: what should be here?
			let collection_id = T::Rmrk::collection_create(creator.clone(), metadata, None, symbol)?;

			// Create Battlepass
			let battlepass: Battlepass<T::Hash, T::AccountId, T::BlockNumber, String<T>> = types::Battlepass {
				creator, 
				org_id,
				name,
				cid,
				season: new_season,
				collection_id,
				price,
				created: now.clone(), mutated: now
			};
			let battlepass_id = <T as frame_system::Config>::Hashing::hash_of(&battlepass);

			Battlepasses::<T>::insert(&battlepass_id, battlepass);
			BattlepassStates::<T>::insert(&battlepass_id, types::BattlepassState::Active); 								// TODO: change to Draft
			ActiveBattlepassByOrg::<T>::insert(org_id, battlepass_id);
			BattlepassCount::<T>::insert(org_id, new_season);

			Self::deposit_event(Event::BattlepassCreated { org_id, battlepass_id, season: new_season });

			Ok(())
		}

		#[pallet::weight(0)]
		pub fn claim_battlepass(
			origin: OriginFor<T>,
			org_id: T::Hash,
		) -> DispatchResult {
			let claimer = ensure_signed(origin)?;
			// check if Org exists
			ensure!(T::Control::is_org_active(&org_id), Error::<T>::OrgUnknown);
			// check if user is a member of organization
			ensure!(T::Control::is_org_member_active(&org_id, &claimer), Error::<T>::NotMember);
			// check if Org has active battlepass
			let battlepass_id = Self::get_active_battlepass(org_id).ok_or(Error::<T>::BattlepassUnknown)?;
			// check if Battlepass already claimed
			ensure!(!ClaimedBattlepass::<T>::contains_key(claimer.clone(), battlepass_id), Error::<T>::BattlepassClaimed);

			let battlepass = Self::get_battlepass(battlepass_id).ok_or(Error::<T>::BattlepassUnknown)?;
			let collection = <pallet_rmrk_core::Pallet<T>>::collections(battlepass.collection_id).ok_or(Error::<T>::CollectionUnknown)?;

			// Create NFT
			let (collection_id, nft_id) = T::Rmrk::nft_mint(
				claimer.clone(), 									// sender
				claimer.clone(), 									// owner
				collection.nfts_count, 								// nft_id
				battlepass.collection_id, 							// collection_id
				None, 												// royalty_recipient
				None, 												// royalty_amount
				BoundedVec::truncate_from(b"NFT meta".to_vec()), 	// metadata 			TODO: what should be here?
				false, 												// transferable
				None												// resources
			)?;

			ClaimedBattlepass::<T>::insert(&claimer, battlepass_id, BattlepassNft{collection_id, nft_id});

			Self::deposit_event(Event::BattlepassClaimed { claimer, org_id, battlepass_id });

			Ok(())
		}

		#[pallet::weight(0)]
		pub fn close_battlepass(
			origin: OriginFor<T>,
			org_id: T::Hash,
		) -> DispatchResult {
			let sender = ensure_signed(origin)?;
			// check if Org exists
			ensure!(T::Control::is_org_active(&org_id), Error::<T>::OrgUnknown);
			// check if origin is an Org Prime
			let prime = T::Control::org_prime_account(&org_id).ok_or(Error::<T>::OrgPrimeUnknown)?;
			ensure!(sender == prime, Error::<T>::AuthorizationError);  // TODO: Add Root temporaryly
			// check if Org has active battlepass
			let battlepass_id = Self::get_active_battlepass(org_id).ok_or(Error::<T>::BattlepassUnknown)?;

			BattlepassStates::<T>::insert(&battlepass_id, types::BattlepassState::Closed); 
			ActiveBattlepassByOrg::<T>::remove(org_id);

			Self::deposit_event(Event::BattlepassClosed { closed_by: sender, org_id, battlepass_id });

			Ok(())
		}

	}
}