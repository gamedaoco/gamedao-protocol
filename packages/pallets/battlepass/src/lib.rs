//      _______  ________  ________  ________   ______   _______   _______
//    ╱╱       ╲╱        ╲╱        ╲╱        ╲_╱      ╲╲╱       ╲╲╱       ╲╲
//   ╱╱      __╱         ╱         ╱         ╱        ╱╱        ╱╱        ╱╱
//  ╱       ╱ ╱         ╱         ╱        _╱         ╱         ╱         ╱
//  ╲________╱╲___╱____╱╲__╱__╱__╱╲________╱╲________╱╲___╱____╱╲________╱
//
// This file is part of GameDAO Protocol.
// Copyright (C) 2018-2022 GameDAO AG.
// SPDX-License-Identifier: AGPL-3.0-or-later

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

		/// Points updated for user
		PointsUpdated {
			by_who: T::AccountId,
			for_who: T::AccountId,
			battlepass_id: T::Hash,
			amount: u32
		},

		/// New Reward created
		RewardCreated {
			reward_id: T::Hash,
			battlepass_id: T::Hash,
			level: u8
		},

		/// Reward claimed by user
		RewardClaimed {
			reward_id: T::Hash,
			claimer: T::AccountId,
			collection_id: u32,
			nft_id: NftId
		},

		/// Reward state updated
		RewardStateUpdated {
			reward_id: T::Hash,
			state: RewardState
		},

		/// Achievement level added for Battlepass
		LevelAdded {
			battlepass_id: T::Hash,
			level: u8,
			points: u32
		},

		/// Achievement level removed from Battlepass
		LevelRemoved {
			battlepass_id: T::Hash,
			level: u8
		}
	}

	#[pallet::error]
	pub enum Error<T> {
		AuthorizationError,
		CollectionUnknown,
		BattlepassExists,
		BattlepassClaimed,
		BattlepassInactive,
		BattlepassNotClaimed,
		BattlepassUnknown,
		BattlepassStateUnknown,
		BattlepassStateWrong,
		BattlepassInfoUnknown,
		NftUnknown,
		NftInvalid,
		NotMember,
		NotEnoughPoints,
		OrgPrimeUnknown,
		OrgUnknownOrInactive,
		RewardInactive,
		RewardUnknown,
		RewardStateUnknown,
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

	/// Total earned Points for users per each Battlepass.
	///
	/// Points: map (Hash, AccountId) => NftId
	#[pallet::storage]
	#[pallet::getter(fn get_points)]
	pub(super) type Points<T: Config> = StorageDoubleMap<_,
		Blake2_128Concat, T::Hash,
		Blake2_128Concat, T::AccountId,
		u32,
		ValueQuery
	>;

	/// Reward by its id.
	///
	/// Rewards: map Hash => Reward
	#[pallet::storage]
	#[pallet::getter(fn get_reward)]
	pub(super) type Rewards<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, Reward<T::Hash, String<T>>, OptionQuery>;

	/// Reward state by its id.
	///
	/// RewardStates: map Hash => RewardState
	#[pallet::storage]
	#[pallet::getter(fn get_reward_state)]
	pub(super) type RewardStates<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, RewardState, OptionQuery>;

	/// Claimed Reward-NFT by user.
	///
	/// ClaimedRewards: map (AccountId, Hash) => NftId
	#[pallet::storage]
	#[pallet::getter(fn get_claimed_rewards)]
	pub(super) type ClaimedRewards<T: Config> = StorageDoubleMap<_,
		Blake2_128Concat, T::AccountId,
		Blake2_128Concat, T::Hash,
		NftId,
		OptionQuery
	>;

	/// Achievement levels mapping for Battlepass
	///
	/// Levels: map (Hash, u8) => u32
	#[pallet::storage]
	#[pallet::getter(fn get_levels)]
	pub(super) type Levels<T: Config> = StorageDoubleMap<_,
		Blake2_128Concat, T::Hash,
		Blake2_128Concat, u8,
		u32,
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
			// check permissions (prime)
			ensure!(Self::is_prime(&org_id, creator.clone())?, Error::<T>::AuthorizationError);
			let (battlepass_count, maybe_active) = Self::get_battlepass_info(org_id);
			// check if there is no active battlepass for the Org
			ensure!(maybe_active.is_none(), Error::<T>::BattlepassExists);
			let new_season = battlepass_count + 1;

			// Create a collection to store Battlepass NFTs
			let collection_id = Self::create_collection(creator.clone(), None)?;
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
			// check permissions (prime, bot, self - temp)
			// TODO: remove self when bot is ready
			ensure!(by_who == for_who || Self::is_prime_or_bot(&battlepass.org_id, by_who.clone())?, Error::<T>::AuthorizationError);
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
			// check permissions (prime)
			ensure!(Self::is_prime(&battlepass.org_id, sender.clone())?, Error::<T>::AuthorizationError);

			Self::change_battlepass_state(battlepass.org_id, battlepass_id, BattlepassState::ACTIVE)?;

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
			// check permissions (prime)
			ensure!(Self::is_prime(&battlepass.org_id, sender.clone())?, Error::<T>::AuthorizationError);

			Self::change_battlepass_state(battlepass.org_id, battlepass_id, BattlepassState::ENDED)?;

			Self::deposit_event(Event::BattlepassEnded { by_who: sender, org_id: battlepass.org_id, battlepass_id });

			Ok(())
		}

		#[pallet::weight(0)]
		pub fn set_points(
			origin: OriginFor<T>,
			battlepass_id: T::Hash,
			account: T::AccountId,
			amount: u32
		) -> DispatchResult {
			let sender = ensure_signed(origin)?;
			// check if Battlepass exists
			let battlepass = Self::get_battlepass(battlepass_id).ok_or(Error::<T>::BattlepassUnknown)?;
			// check if Battlepass in ACTIVE state
			ensure!(Self::check_battlepass_state(battlepass_id, BattlepassState::ACTIVE)?, Error::<T>::BattlepassStateWrong);
			// check if Org is active
			ensure!(T::Control::is_org_active(&battlepass.org_id), Error::<T>::OrgUnknownOrInactive);
			// check permissions (prime, bot)
			ensure!(Self::is_prime_or_bot(&battlepass.org_id, sender.clone())?, Error::<T>::AuthorizationError);
			// check if user is a member of organization
			ensure!(T::Control::is_org_member_active(&battlepass.org_id, &account), Error::<T>::NotMember);

			Points::<T>::insert(battlepass_id, &account, amount);

			Self::deposit_event(Event::PointsUpdated { by_who: sender, for_who: account, battlepass_id, amount });

			Ok(())
		}

		#[pallet::weight(0)]
		pub fn create_reward(
			origin: OriginFor<T>,
			battlepass_id: T::Hash,
			name: String<T>,
			cid: String<T>,
			max: Option<u32>,
			level: u8,
			transferable: bool,
		) -> DispatchResult {
			let creator = ensure_signed(origin)?;
			// check if Battlepass exists
			let battlepass = Self::get_battlepass(battlepass_id).ok_or(Error::<T>::BattlepassUnknown)?;
			// check if Battlepass in ACTIVE state
			ensure!(Self::check_battlepass_state(battlepass_id, BattlepassState::ACTIVE)?, Error::<T>::BattlepassStateWrong);
			// check if Org is active
			ensure!(T::Control::is_org_active(&battlepass.org_id), Error::<T>::OrgUnknownOrInactive);
			// check permissions (prime)
			ensure!(Self::is_prime(&battlepass.org_id, creator.clone())?, Error::<T>::AuthorizationError);

			let collection_id = Self::create_collection(creator.clone(), max)?;
			let reward_id = Self::do_create_reward(battlepass_id, name, cid, level, transferable, collection_id)?;

			Self::deposit_event(Event::RewardCreated { reward_id, battlepass_id, level });

			Ok(())
		}

		#[pallet::weight(0)]
		pub fn disable_reward(
			origin: OriginFor<T>,
			reward_id: T::Hash
		) -> DispatchResult {
			let creator = ensure_signed(origin)?;
			// check if Reward exists
			let reward = Self::get_reward(reward_id).ok_or(Error::<T>::RewardUnknown)?;
			// check if Reward is active
			ensure!(Self::check_reward_state(reward_id, RewardState::ACTIVE)?, Error::<T>::RewardInactive);
			// check if Battlepass exists
			let battlepass = Self::get_battlepass(reward.battlepass_id).ok_or(Error::<T>::BattlepassUnknown)?;
			// check permissions (prime)
			ensure!(Self::is_prime(&battlepass.org_id, creator.clone())?, Error::<T>::AuthorizationError);

			let state = RewardState::INACTIVE;

			RewardStates::<T>::insert(reward_id, state.clone());

			Self::deposit_event(Event::RewardStateUpdated {reward_id, state} );

			Ok(())
		}

		#[pallet::weight(0)]
		pub fn claim_reward(
			origin: OriginFor<T>,
			reward_id: T::Hash,
		) -> DispatchResult {
			let claimer = ensure_signed(origin)?;
			// check if Reward exists
			let reward = Self::get_reward(reward_id).ok_or(Error::<T>::RewardUnknown)?;
			// check if Reward is active
			ensure!(Self::check_reward_state(reward_id, RewardState::ACTIVE)?, Error::<T>::RewardInactive);
			// check if Battlepass exists
			let battlepass = Self::get_battlepass(&reward.battlepass_id).ok_or(Error::<T>::BattlepassUnknown)?;
			// check if Battlepass in ACTIVE state
			ensure!(Self::check_battlepass_state(reward.battlepass_id, BattlepassState::ACTIVE)?, Error::<T>::BattlepassStateWrong);
			// check if Org is active
			ensure!(T::Control::is_org_active(&battlepass.org_id), Error::<T>::OrgUnknownOrInactive);
			// check if user is a member of organization
			ensure!(T::Control::is_org_member_active(&battlepass.org_id, &claimer), Error::<T>::NotMember);
			// check if user owns Battlepass NFT
			let nft_id = Self::get_claimed_battlepass(reward.battlepass_id, &claimer).ok_or(Error::<T>::BattlepassNotClaimed)?;
			// check if NFT exists
			let bp_nft = <pallet_rmrk_core::Pallet<T>>::nfts(&reward.collection_id, nft_id).ok_or(Error::<T>::NftUnknown)?;
			// validate NFT
			let metadata: String<T> = BoundedVec::truncate_from(reward.battlepass_id.encode());
			ensure!(metadata == bp_nft.metadata, Error::<T>::NftInvalid);
			// check if user has enough Points
			ensure!(Self::is_enough_points(&reward.battlepass_id, &claimer, reward.level), Error::<T>::NotEnoughPoints);

			Self::do_claim_reward(claimer.clone(), reward_id, nft_id, reward.collection_id, reward.transferable)?;

			Self::deposit_event(Event::RewardClaimed {reward_id, claimer, collection_id: reward.collection_id, nft_id} );

			Ok(())
		}

		#[pallet::weight(0)]
		pub fn add_level(
			origin: OriginFor<T>,
			battlepass_id: T::Hash,
			level: u8,
			points: u32
		) -> DispatchResult {
			let sender = ensure_signed(origin)?;
			// check if Battlepass exists
			let battlepass = Self::get_battlepass(battlepass_id).ok_or(Error::<T>::BattlepassUnknown)?;
			// check if Battlepass is not ended
			ensure!(!Self::check_battlepass_state(battlepass_id, BattlepassState::ENDED)?, Error::<T>::BattlepassStateWrong);
			// check if Org is active
			ensure!(T::Control::is_org_active(&battlepass.org_id), Error::<T>::OrgUnknownOrInactive);
			// check permissions (prime)
			ensure!(Self::is_prime(&battlepass.org_id, sender.clone())?, Error::<T>::AuthorizationError);

			Levels::<T>::insert(battlepass_id, level, points);

			Self::deposit_event(Event::LevelAdded { battlepass_id, level, points } );

			Ok(())
		}

		#[pallet::weight(0)]
		pub fn remove_level(
			origin: OriginFor<T>,
			battlepass_id: T::Hash,
			level: u8
		) -> DispatchResult {
			let sender = ensure_signed(origin)?;
			// check if Battlepass exists
			let battlepass = Self::get_battlepass(battlepass_id).ok_or(Error::<T>::BattlepassUnknown)?;
			// check if Battlepass is not ended
			ensure!(!Self::check_battlepass_state(battlepass_id, BattlepassState::ENDED)?, Error::<T>::BattlepassStateWrong);
			// check if Org is active
			ensure!(T::Control::is_org_active(&battlepass.org_id), Error::<T>::OrgUnknownOrInactive);
			// check permissions (prime)
			ensure!(Self::is_prime(&battlepass.org_id, sender.clone())?, Error::<T>::AuthorizationError);

			Levels::<T>::remove(battlepass_id, level);

			Self::deposit_event(Event::LevelRemoved { battlepass_id, level } );

			Ok(())
		}
	}
}

impl<T: Config> Pallet<T> {

	fn is_prime(org_id: &T::Hash, who: T::AccountId) -> Result<bool, DispatchError> {
		let prime = T::Control::org_prime_account(org_id).ok_or(Error::<T>::OrgPrimeUnknown)?;
		Ok(who == prime)
	}

	fn is_prime_or_bot(org_id: &T::Hash, who: T::AccountId) -> Result<bool, DispatchError> {
		// TODO: implement check
		let is_bot = false;
		Ok(Self::is_prime(org_id, who)? || is_bot)
	}

	fn is_enough_points(battlepass_id: &T::Hash, account: &T::AccountId, level: u8) -> bool {
		let user_points = Self::get_points(battlepass_id, account);
		let levels = Levels::<T>::iter_prefix(battlepass_id)
			.filter(
				|(lvl, pnt)| level == *lvl && user_points >= *pnt
			);

		levels.count() == 1
	}

	fn create_collection(owner: T::AccountId, max: Option<u32>) -> Result<u32, DispatchError> {
		let metadata = BoundedVec::truncate_from(b"meta".to_vec());		// TODO: what should be here?
		let symbol = BoundedVec::truncate_from(b"symbol".to_vec());		// TODO: what should be here?
		let collection_id = T::Rmrk::collection_create(owner, metadata, max, symbol)?;

		Ok(collection_id)
	}

	fn check_battlepass_state(battlepass_id: T::Hash, state: BattlepassState) -> Result<bool, DispatchError> {
		let current_state = Self::get_battlepass_state(battlepass_id).ok_or(Error::<T>::BattlepassStateUnknown)?;

		Ok(current_state == state)
	}

	fn check_reward_state(reward_id: T::Hash, state: RewardState) -> Result<bool, DispatchError> {
		let current_state = Self::get_reward_state(reward_id).ok_or(Error::<T>::RewardStateUnknown)?;

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
		let battlepass: Battlepass<T::Hash, T::AccountId, String<T>> = Battlepass {
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
		BattlepassStates::<T>::insert(&battlepass_id, BattlepassState::DRAFT);
		BattlepassInfoByOrg::<T>::insert(org_id, BattlepassInfo{count: new_season, active: Some(battlepass_id)});

		Ok(battlepass_id)
	}

	fn do_claim_battlepass(by_who: T::AccountId, for_who: T::AccountId, battlepass_id: T::Hash, nft_id: u32, collection_id: u32) -> DispatchResult {

		// Create Battlepass NFT
		let metadata = battlepass_id.encode();
		let (_, nft_id) = T::Rmrk::nft_mint(
			by_who.clone(),										// sender
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

	fn change_battlepass_state(org_id: T::Hash, battlepass_id: T::Hash, state: BattlepassState) -> DispatchResult {
		let active_battlepass = if state == BattlepassState::ACTIVE { Some(battlepass_id) } else { None };

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

	fn do_create_reward(battlepass_id: T::Hash, name: String<T>, cid: String<T>, level: u8, transferable: bool, collection_id: u32) -> Result<T::Hash, DispatchError> {
		let reward = Reward{
			battlepass_id,
			name,
			cid,
			level,
			transferable,
			collection_id
		};
		let reward_id = <T as frame_system::Config>::Hashing::hash_of(&reward);

		Rewards::<T>::insert(reward_id, reward);
		RewardStates::<T>::insert(reward_id, RewardState::ACTIVE);

		Ok(reward_id)
	}

	fn do_claim_reward(claimer: T::AccountId, reward_id: T::Hash, nft_id: u32, collection_id: u32, transferable: bool) -> DispatchResult {
		// Create Battlepass NFT
		let metadata = reward_id.encode();
		let (_, nft_id) = T::Rmrk::nft_mint(
			claimer.clone(),									// sender
			claimer.clone(),										// owner
			nft_id,														// nft_id
			collection_id,												// collection_id
			None,									// royalty_recipient
			None,										// royalty_amount
			BoundedVec::truncate_from(metadata),				// metadata 			TODO: what should be here?
			transferable,												// transferable
			None												// resources
		)?;

		ClaimedRewards::<T>::insert(&claimer, &reward_id, nft_id);

		Ok(())
	}
}
