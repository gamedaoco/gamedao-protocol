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
use frame_support::{pallet_prelude::*, transactional};
use frame_system::pallet_prelude::*;
use sp_std::convert::TryInto;
use sp_runtime::traits::{AtLeast32BitUnsigned, Hash};
use gamedao_traits::ControlTrait;
#[cfg(feature = "runtime-benchmarks")]
use gamedao_traits::ControlBenchmarkingTrait;
use orml_traits::{MultiCurrency, MultiReservableCurrency};
use rmrk_traits::{primitives::PartId, Collection, Nft, ResourceInfoMin, AccountIdOrCollectionNftTuple};

pub mod types;
pub use types::*;

mod mock;
mod tests;
mod benchmarking;

pub mod weights;
pub use weights::WeightInfo;

pub type String<T> = BoundedVec<u8, <T as Config>::StringLimit>;
pub type Symbol<T> = BoundedVec<u8, <T as Config>::SymbolLimit>;
pub type Resource<T> = BoundedVec<
	ResourceInfoMin<
		BoundedVec<u8, <T as Config>::StringLimit>,
		BoundedVec<PartId, <T as Config>::PartsLimit>,
	>,
	<T as Config>::MaxResourcesOnMint,
>;

pub trait BattlepassHelper<CollectionId, ItemId> {
	fn collection(i: u32) -> CollectionId;
	fn item(i: u32) -> ItemId;
}

pub struct BpHelper;

impl<CollectionId: From<u32>, ItemId: From<u32>> BattlepassHelper<CollectionId, ItemId> for BpHelper {
	fn collection(i: u32) -> CollectionId {
		i.into()
	}
	fn item(i: u32) -> ItemId {
		i.into()
	}
}

#[frame_support::pallet]
pub mod pallet {
	use super::*;
	
	#[pallet::pallet]
	#[pallet::generate_store(pub(super) trait Store)]
	pub struct Pallet<T>(_);

	#[pallet::config]
	pub trait Config: frame_system::Config + pallet_rmrk_core::Config {
		type RuntimeEvent: From<Event<Self>>
			+ IsType<<Self as frame_system::Config>::RuntimeEvent>
			+ Into<<Self as frame_system::Config>::RuntimeEvent>;

		/// The units in which we record balances.
		type Balance: Member
			+ Parameter
			+ AtLeast32BitUnsigned
			+ Default
			+ Copy
			+ MaybeSerializeDeserialize
			+ MaxEncodedLen
			+ TypeInfo;

		/// The currency ID type
		type CurrencyId: Member
			+ Parameter
			+ Copy
			+ MaybeSerializeDeserialize
			+ MaxEncodedLen
			+ TypeInfo;

		/// Multi-currency support for asset management.
		type Currency: MultiCurrency<Self::AccountId, CurrencyId = Self::CurrencyId, Balance = Self::Balance>
			+ MultiReservableCurrency<Self::AccountId>;

		type Control: ControlTrait<Self::AccountId, Self::Hash>;

		#[cfg(feature = "runtime-benchmarks")]
		type ControlBenchmarkHelper: ControlBenchmarkingTrait<Self::AccountId, Self::Hash>;

		type Rmrk: Collection<String<Self>, Symbol<Self>, Self::AccountId, Self::CollectionId>
			+ Nft<Self::AccountId, String<Self>, Resource<Self>, Self::CollectionId, Self::ItemId>;

		type BattlepassHelper: BattlepassHelper<Self::CollectionId, Self::ItemId>;

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

		/// The CurrencyId which is used as a native token.
		#[pallet::constant]
		type NativeTokenId: Get<Self::CurrencyId>;

		/// The CurrencyId which is used as a protokol token.
		#[pallet::constant]
		type ProtocolTokenId: Get<Self::CurrencyId>;

		/// Weight information for extrinsics in this module.
		type WeightInfo: WeightInfo;
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

		/// BattlePass updated
		BattlepassUpdated {
			battlepass_id: T::Hash,
			name: Option<String<T>>,
			cid: Option<String<T>>,
			price: Option<u16>
		},
		
		/// BattlePass claimed
		BattlepassClaimed {
			by_who: T::AccountId,
			for_who: T::AccountId,
			org_id: T::Hash,
			battlepass_id: T::Hash,
			nft_id: T::ItemId
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

		/// Reward updated
		RewardUpdated {
			reward_id: T::Hash,
			name: Option<String<T>>,
			cid: Option<String<T>>,
			transferable: Option<bool>
		},

		/// Reward claimed by user
		RewardClaimed {
			reward_id: T::Hash,
			claimer: T::AccountId,
			collection_id: T::CollectionId,
			nft_id: T::ItemId
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
		},

		BotAdded {
			battlepass_id: T::Hash,
			bot: T::AccountId
		}
	}

	#[pallet::error]
	pub enum Error<T> {
		AuthorizationError,
		CollectionUnknown,
		BattlepassExists,
		BattlepassClaimed,
		BattlepassNotClaimed,
		BattlepassUnknown,
		BattlepassStateUnknown,
		BattlepassStateWrong,
		BattlepassInfoUnknown,
		BattlepassNftUnknown,
		BattlepassNftInvalid,
		LevelNotReached,
		LevelUnknown,
		NoAvailableCollectionId,
		NoAvailableNftId,
		NoChangesProvided,
		NotOwnNft,
		OrgPrimeUnknown,
		OrgUnknownOrInactive,
		RewardClaimed,
		RewardInactive,
		RewardUnknown,
		RewardStateUnknown,
	  }

	/// Battlepass by its id.
	///
	/// Battlepasses: map Hash => Battlepass
	#[pallet::storage]
	#[pallet::getter(fn get_battlepass)]
	pub(super) type Battlepasses<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, Battlepass<T::Hash, T::AccountId, String<T>, T::CollectionId>, OptionQuery>;

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
	pub type BattlepassInfoByOrg<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, BattlepassInfo<T::Hash, T::AccountId>, OptionQuery>;

	/// Claimed Battlepass-NFT by user and battlepass.
	///
	/// ClaimedBattlepasses: map (Hash, AccountId) => ItemId
	#[pallet::storage]
	#[pallet::getter(fn get_claimed_battlepass)]
	pub(super) type ClaimedBattlepasses<T: Config> = StorageDoubleMap<_,
		Blake2_128Concat, T::Hash,
		Blake2_128Concat, T::AccountId,
		T::ItemId,
		OptionQuery
	>;

	/// Total earned Points for users per each Battlepass.
	///
	/// Points: map (Hash, AccountId) => u32
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
	pub(super) type Rewards<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, Reward<T::Hash, String<T>, T::CollectionId>, OptionQuery>;

	/// Reward state by its id.
	///
	/// RewardStates: map Hash => RewardState
	#[pallet::storage]
	#[pallet::getter(fn get_reward_state)]
	pub(super) type RewardStates<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, RewardState, OptionQuery>;

	/// Claimed Reward-NFT by user.
	///
	/// ClaimedRewards: map (Hash, AccountId) => ItemId
	#[pallet::storage]
	#[pallet::getter(fn get_claimed_rewards)]
	pub(super) type ClaimedRewards<T: Config> = StorageDoubleMap<_,
		Blake2_128Concat, T::Hash,
		Blake2_128Concat, T::AccountId,
		T::ItemId,
		OptionQuery
	>;

	/// Achievement levels mapping for Battlepass
	///
	/// Levels: map (Hash, u8) => u32
	#[pallet::storage]
	#[pallet::getter(fn get_level)]
	pub(super) type Levels<T: Config> = StorageDoubleMap<_,
		Blake2_128Concat, T::Hash,
		Blake2_128Concat, u8,
		u32,
		OptionQuery
	>;

	/// A counter for created collections
	///
	/// CollectionIndex: u32
	#[pallet::storage]
	#[pallet::getter(fn get_collection_index)]
	pub type CollectionIndex<T: Config> = StorageValue<_, u32, ValueQuery>;

	/// A counter for created NFTs
	///
	/// NftIndex: u32
	#[pallet::storage]
	#[pallet::getter(fn get_nft_index)]
	pub type NftIndex<T: Config> = StorageValue<_, u32, ValueQuery>;

	#[pallet::call]
	impl<T: Config> Pallet<T> {

		/// Creates a Battlepass.
		/// Also creates a new collection to store claimed Battlepass NFTs.
		/// May be called only by Organization owner.
		/// 
		/// Parameters:
		/// - `org_id`: ID of the Organization for which to create a Battlepass.
		/// - `name`: Battlepass name.
		/// - `cid`: IPFS content identifier.
		/// - `price`: Price for the Battlepass subscription.
		#[pallet::call_index(0)]
		#[pallet::weight(<T as pallet::Config>::WeightInfo::create_battlepass())]
		#[transactional]
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
			let (battlepass_count, maybe_active, _) = Self::get_battlepass_info(&org_id);
			// check if there is no active battlepass for the Org
			ensure!(maybe_active.is_none(), Error::<T>::BattlepassExists);
			let new_season = battlepass_count + 1;

			// Create a collection to store Battlepass NFTs
			let collection_id = Self::create_collection(creator.clone(), None)?;
			let battlepass_id = Self::do_create_battlepass(creator, org_id, name, cid, collection_id, price, new_season)?;

			Self::deposit_event(Event::BattlepassCreated { org_id, battlepass_id, season: new_season });

			Ok(())
		}

		/// Updates Battlepass.
		/// May be called only by Organization owner.
		/// 
		/// Parameters:
		/// - `battlepass_id`: ID of the Battlepass to update.
		/// - `name`: Battlepass name.
		/// - `cid`: IPFS content identifier.
		/// - `price`: Price for the Battlepass subscription.
		#[pallet::call_index(1)]
		#[pallet::weight(<T as pallet::Config>::WeightInfo::update_battlepass())]
		pub fn update_battlepass(
			origin: OriginFor<T>,
			battlepass_id: T::Hash,
			name: Option<String<T>>,
			cid: Option<String<T>>,
			price: Option<u16>,
		) -> DispatchResult {
			let creator = ensure_signed(origin)?;
			// check if Battlepass exists
			let mut battlepass = Self::get_battlepass(battlepass_id).ok_or(Error::<T>::BattlepassUnknown)?;
			// check if there is something to update
			ensure!(
				name.is_some() && name.clone().unwrap() != battlepass.name || 
				cid.is_some() && cid.clone().unwrap() != battlepass.cid || 
				price.is_some() && price.clone().unwrap() != battlepass.price, 
				Error::<T>::NoChangesProvided
			);
			// check if Battlepass state is not ENDED
			ensure!(!Self::check_battlepass_state(battlepass_id, BattlepassState::ENDED)?, Error::<T>::BattlepassStateWrong);
			// check if Org is active
			ensure!(T::Control::is_org_active(&battlepass.org_id), Error::<T>::OrgUnknownOrInactive);
			// check permissions (prime)
			ensure!(Self::is_prime(&battlepass.org_id, creator.clone())?, Error::<T>::AuthorizationError);

			battlepass.name = name.clone().unwrap();
			battlepass.cid = cid.clone().unwrap();
			battlepass.price = price.clone().unwrap();

			Battlepasses::<T>::insert(battlepass_id, battlepass);

			Self::deposit_event(Event::BattlepassUpdated { battlepass_id, name, cid, price });

			Ok(())
		}

		/// Claims the Battlepass-NFT for user who joined the Battlepass.
		/// This NFT may be used as a proof of a Battlepass membership.
		/// May be called by Organization owner or by a specially dedicated for this purpose account (Bot).
		/// 
		/// Parameters:
		/// - `battlepass_id`: ID of the Battlepass for which to claim NFT.
		/// - `for_who`: Account for which to claim NFT.
		#[pallet::call_index(2)]
		#[pallet::weight(<T as pallet::Config>::WeightInfo::claim_battlepass())]
		#[transactional]
		pub fn claim_battlepass(
			origin: OriginFor<T>,
			battlepass_id: T::Hash,
			for_who: T::AccountId,
		) -> DispatchResult {
			let by_who = ensure_signed(origin)?;
			// check if Battlepass exists
			let battlepass = Self::get_battlepass(battlepass_id).ok_or(Error::<T>::BattlepassUnknown)?;
			// check if Battlepass in ACTIVE state
			ensure!(Self::check_battlepass_state(battlepass_id, BattlepassState::ACTIVE)?, Error::<T>::BattlepassStateWrong);
			// check if Org is active
			ensure!(T::Control::is_org_active(&battlepass.org_id), Error::<T>::OrgUnknownOrInactive);
			// check permissions (prime, bot)
			ensure!(Self::is_prime_or_bot(&battlepass.org_id, by_who.clone())?, Error::<T>::AuthorizationError);
			// check if Battlepass already claimed
			ensure!(!ClaimedBattlepasses::<T>::contains_key(battlepass_id, for_who.clone()), Error::<T>::BattlepassClaimed);

			let nft_id = Self::do_claim_battlepass(by_who.clone(), for_who.clone(), battlepass_id, battlepass.collection_id)?;

			Self::deposit_event(Event::BattlepassClaimed { by_who, for_who, org_id: battlepass.org_id, battlepass_id, nft_id });

			Ok(())
		}

		/// Activates the Battlepass.
		/// Can activate only Battlepass in DRAFT state.
		/// May be called only by Organization owner.
		/// 
		/// Parameters:
		/// - `battlepass_id`: ID of the Battlepass to activate.
		#[pallet::call_index(3)]
		#[pallet::weight(<T as pallet::Config>::WeightInfo::activate_battlepass())]
		#[transactional]
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

		/// Concludes the Battlepass.
		/// Can conclude only Battlepass in ACTIVE state.
		/// After calling this extrinsic Battlepass state can not be changed any more.
		/// May be called only by Organization owner.
		/// 
		/// Parameters:
		/// - `battlepass_id`: ID of the Battlepass to conclude.
		#[pallet::call_index(4)]
		#[pallet::weight(<T as pallet::Config>::WeightInfo::conclude_battlepass())]
		#[transactional]
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

		/// Sets Battlepass Points for user.
		/// So far no information about users' achievements is stored on chain. A separate trusted service (Bot)
		/// should collect such info, process it, validate it and call this extrinsic if user's Points have been updated. 
		/// May be called only by Organization owner or by a specially dedicated for this purpose account (Bot).
		/// 
		/// Parameters:
		/// - `battlepass_id`: ID of the Battlepass.
		/// - `account`: User's account for which to set Points.
		/// - `amount`: Amount of Points to set.
		#[pallet::call_index(5)]
		#[pallet::weight(<T as pallet::Config>::WeightInfo::set_points())]
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
			// check if user has access to Battlepass
			ensure!(ClaimedBattlepasses::<T>::contains_key(battlepass_id, account.clone()), Error::<T>::BattlepassNotClaimed);

			Points::<T>::insert(battlepass_id, &account, amount);

			Self::deposit_event(Event::PointsUpdated { by_who: sender, for_who: account, battlepass_id, amount });

			Ok(())
		}

		/// Creates a Reward Type for the Battlepass.
		/// Also creates a new collection to store claimed Reward NFTs.
		/// May be called only by Organization owner or by a specially dedicated for this purpose account (Bot).
		/// 
		/// Parameters:
		/// - `battlepass_id`: ID of the Battlepass to create a Reward for.
		/// - `name`: Name of the Reward.
		/// - `cid`: IPFS content identifier.
		/// - `max`: Maximum number of claimed rewards this Reward Type may have. Unlimited if empty.
		/// - `level`: Minimum Level user must reach to be able to claim this Reward Type.
		/// - `transferable`: Specifies whether claimed Reward NFTs could be transferred (sold) to another account.
		#[pallet::call_index(6)]
		#[pallet::weight(<T as pallet::Config>::WeightInfo::create_reward())]
		#[transactional]
		pub fn create_reward(
			origin: OriginFor<T>,
			battlepass_id: T::Hash,
			name: String<T>,
			cid: String<T>,
			max: Option<u32>,
			level: u8,
			transferable: bool,
		) -> DispatchResult {
			let caller = ensure_signed(origin)?;
			// check if Battlepass exists
			let battlepass = Self::get_battlepass(battlepass_id).ok_or(Error::<T>::BattlepassUnknown)?;
			// check if Battlepass is not ended
			ensure!(!Self::check_battlepass_state(battlepass_id, BattlepassState::ENDED)?, Error::<T>::BattlepassStateWrong);
			// check if Org is active
			ensure!(T::Control::is_org_active(&battlepass.org_id), Error::<T>::OrgUnknownOrInactive);
			// check permissions (prime, bot)
			ensure!(Self::is_prime_or_bot(&battlepass.org_id, caller)?, Error::<T>::AuthorizationError);
			
			let prime = T::Control::org_prime_account(&battlepass.org_id).ok_or(Error::<T>::OrgPrimeUnknown)?;
			let collection_id = Self::create_collection(prime, max)?;
			let reward_id = Self::do_create_reward(battlepass_id, name, cid, level, transferable, collection_id)?;

			Self::deposit_event(Event::RewardCreated { reward_id, battlepass_id, level });

			Ok(())
		}

		/// Updates Reward type.
		/// May be called only by Organization owner or by a specially dedicated for this purpose account (Bot).
		/// 
		/// Parameters:
		/// - `reward_id`: ID of the Reward Type to be updated.
		/// - `name`: Name of the Reward.
		/// - `cid`: IPFS content identifier.
		/// - `transferable`: Specifies whether claimed Reward NFTs could be transferred (sold) to another account.
		#[pallet::call_index(7)]
		#[pallet::weight(<T as pallet::Config>::WeightInfo::update_reward())]
		pub fn update_reward(
			origin: OriginFor<T>,
			reward_id: T::Hash,
			name: Option<String<T>>,
			cid: Option<String<T>>,
			transferable: Option<bool>,
		) -> DispatchResult {
			let caller = ensure_signed(origin)?;
			// check if Reward exists
			let mut reward = Self::get_reward(reward_id).ok_or(Error::<T>::RewardUnknown)?;
			// check if there is something to update
			ensure!(
				name.is_some() && name.clone().unwrap() != reward.name || 
				cid.is_some() && cid.clone().unwrap() != reward.cid || 
				transferable.is_some() && transferable.clone().unwrap() != reward.transferable, 
				Error::<T>::NoChangesProvided
			);
			// check if Reward is active
			ensure!(Self::check_reward_state(reward_id, RewardState::ACTIVE)?, Error::<T>::RewardInactive);
			// check if Battlepass exists
			let battlepass = Self::get_battlepass(reward.battlepass_id).ok_or(Error::<T>::BattlepassUnknown)?;
			// check if Battlepass is not ended
			ensure!(!Self::check_battlepass_state(reward.battlepass_id, BattlepassState::ENDED)?, Error::<T>::BattlepassStateWrong);
			// check if Org is active
			ensure!(T::Control::is_org_active(&battlepass.org_id), Error::<T>::OrgUnknownOrInactive);
			// check permissions (prime, bot)
			ensure!(Self::is_prime_or_bot(&battlepass.org_id, caller)?, Error::<T>::AuthorizationError);
			
			reward.name = name.clone().unwrap();
			reward.cid = cid.clone().unwrap();
			reward.transferable = transferable.clone().unwrap();

			Rewards::<T>::insert(reward_id, reward);

			Self::deposit_event(Event::RewardUpdated { reward_id, name, cid, transferable });

			Ok(())
		}

		/// Disables the Reward Type.
		/// After calling this extrinsic Reward Type state can not be changed any more.
		/// May be called only by Organization owner or by a specially dedicated for this purpose account (Bot).
		/// 
		/// Parameters:
		/// - `reward_id`: ID of the Reward Type to be disabled.
		#[pallet::call_index(8)]
		#[pallet::weight(<T as pallet::Config>::WeightInfo::disable_reward())]
		pub fn disable_reward(
			origin: OriginFor<T>,
			reward_id: T::Hash
		) -> DispatchResult {
			let caller = ensure_signed(origin)?;
			// check if Reward exists
			let reward = Self::get_reward(reward_id).ok_or(Error::<T>::RewardUnknown)?;
			// check if Reward is active
			ensure!(Self::check_reward_state(reward_id, RewardState::ACTIVE)?, Error::<T>::RewardInactive);
			// check if Battlepass exists
			let battlepass = Self::get_battlepass(reward.battlepass_id).ok_or(Error::<T>::BattlepassUnknown)?;
			// check permissions (prime, bot)
			ensure!(Self::is_prime_or_bot(&battlepass.org_id, caller)?, Error::<T>::AuthorizationError);
			
			let state = RewardState::INACTIVE;

			RewardStates::<T>::insert(reward_id, state.clone());

			Self::deposit_event(Event::RewardStateUpdated {reward_id, state} );

			Ok(())
		}

		/// Claims a reward for user.
		/// Mints a Reward NFT which may be used as a proof of a Reward posession.
		/// User must be eligible for the Reward Type to be able to claim it. Eligibility criteria are:
		/// - must be an Organization member.
		/// - must be a Battlepass member (posess a valid Battlepass NFT).
		/// - required achievement Level must be reached.
		/// May be called by user or by Organization owner or by a specially dedicated for this purpose account (Bot).
		/// 
		/// Parameters:
		/// - `reward_id`: ID of the Reward Type to claim.
		#[pallet::call_index(9)]
		#[pallet::weight(<T as pallet::Config>::WeightInfo::claim_reward())]
		#[transactional]
		pub fn claim_reward(
			origin: OriginFor<T>,
			reward_id: T::Hash,
			for_who: T::AccountId,
		) -> DispatchResult {
			let by_who = ensure_signed(origin)?;
			// check if Reward exists
			let reward = Self::get_reward(reward_id).ok_or(Error::<T>::RewardUnknown)?;
			// check if Reward is active
			ensure!(Self::check_reward_state(reward_id, RewardState::ACTIVE)?, Error::<T>::RewardInactive);
			// check if Reward has not been claimed yet
			ensure!(!ClaimedRewards::<T>::contains_key(&reward_id, &for_who), Error::<T>::RewardClaimed);
			// check if Battlepass exists
			let battlepass = Self::get_battlepass(&reward.battlepass_id).ok_or(Error::<T>::BattlepassUnknown)?;
			// check if Battlepass in ACTIVE state
			ensure!(Self::check_battlepass_state(reward.battlepass_id, BattlepassState::ACTIVE)?, Error::<T>::BattlepassStateWrong);
			// check if Org is active
			ensure!(T::Control::is_org_active(&battlepass.org_id), Error::<T>::OrgUnknownOrInactive);
			// check permissions (self, prime or bot)
			ensure!(by_who == for_who || Self::is_prime_or_bot(&battlepass.org_id, by_who.clone())?, Error::<T>::AuthorizationError);
			// check if user claimed Battlepass NFT
			let bp_nft_id = Self::get_claimed_battlepass(reward.battlepass_id, &for_who).ok_or(Error::<T>::BattlepassNotClaimed)?;
			// check if Battlepass NFT exists
			let bp_nft = pallet_rmrk_core::Pallet::<T>::nfts(&battlepass.collection_id, bp_nft_id).ok_or(Error::<T>::BattlepassNftUnknown)?;
			// validate Battlepass NFT ownership			
			ensure!(AccountIdOrCollectionNftTuple::AccountId(for_who.clone()) == bp_nft.owner, Error::<T>::NotOwnNft);
			// validate Battlepass NFT metadata
			let metadata: String<T> = BoundedVec::truncate_from(reward.battlepass_id.encode());
			ensure!(metadata == bp_nft.metadata, Error::<T>::BattlepassNftInvalid);
			// check if user has reached the required Level
			ensure!(Self::is_level_reached(&reward.battlepass_id, &for_who, reward.level), Error::<T>::LevelNotReached);

			let nft_id = Self::do_claim_reward(for_who.clone(), reward_id, reward.collection_id, reward.transferable)?;

			Self::deposit_event(Event::RewardClaimed {reward_id, claimer: for_who, collection_id: reward.collection_id, nft_id} );

			Ok(())
		}

		/// Adds a new achievement Level.
		/// May be called only by Organization owner or by a specially dedicated for this purpose account (Bot).
		/// 
		/// Parameters:
		/// - `battlepass_id`: ID of the Battlepass to add a Level for.
		/// - `level`: Achievement Level.
		/// - `points`: Amount of Points needed to reach the Level.
		#[pallet::call_index(10)]
		#[pallet::weight(<T as pallet::Config>::WeightInfo::add_level())]
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
			// check permissions (prime, bot)
			ensure!(Self::is_prime_or_bot(&battlepass.org_id, sender.clone())?, Error::<T>::AuthorizationError);

			Levels::<T>::insert(battlepass_id, level, points);

			Self::deposit_event(Event::LevelAdded { battlepass_id, level, points } );

			Ok(())
		}

		/// Removes achievement Level.
		/// May be called only by Organization owner or by a specially dedicated for this purpose account (Bot).
		/// 
		/// Parameters:
		/// - `battlepass_id`: ID of the Battlepass to remove a Level for.
		/// - `level`: Achievement Level.
		#[pallet::call_index(11)]
		#[pallet::weight(<T as pallet::Config>::WeightInfo::remove_level())]
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
			// check permissions (prime, bot)
			ensure!(Self::is_prime_or_bot(&battlepass.org_id, sender.clone())?, Error::<T>::AuthorizationError);
			// check if Level exists
			ensure!(Levels::<T>::contains_key(battlepass_id, level), Error::<T>::LevelUnknown);

			Levels::<T>::remove(battlepass_id, level);

			Self::deposit_event(Event::LevelRemoved { battlepass_id, level } );

			Ok(())
		}

		/// Adds for a Battlepass a special trusted account (Bot) which will have a permission to update users' Points.
		/// May be called only by Organization owner.
		/// 
		/// Parameters:
		/// - `battlepass_id`: ID of the Battlepass to add a Bot for.
		/// - `bot`: Trusted Account ID.
		#[pallet::call_index(12)]
		#[pallet::weight(<T as pallet::Config>::WeightInfo::add_bot())]
		pub fn add_bot(
			origin: OriginFor<T>,
			battlepass_id: T::Hash,
			bot: T::AccountId
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

			BattlepassInfoByOrg::<T>::try_mutate(battlepass.org_id, |info| -> Result<(), DispatchError> {
				if let Some(inf) = info {
					inf.bot = Some(bot.clone());
					Ok(())
				} else {
					return Err(Error::<T>::BattlepassInfoUnknown)?;
				}
			})?;

			Self::deposit_event(Event::BotAdded { battlepass_id, bot } );

			Ok(())
		}
	}
}

impl<T: Config> Pallet<T> {

	fn is_prime(org_id: &T::Hash, who: T::AccountId) -> Result<bool, DispatchError> {
		let prime = T::Control::org_prime_account(org_id).ok_or(Error::<T>::OrgPrimeUnknown)?;
		Ok(who == prime)
	}

	fn is_bot(org_id: &T::Hash, who: T::AccountId) -> Result<bool, DispatchError> {
		let (_, _, bot) = Self::get_battlepass_info(org_id);
		Ok(Some(who) == bot)
	}

	fn is_prime_or_bot(org_id: &T::Hash, who: T::AccountId) -> Result<bool, DispatchError> {
		Ok(Self::is_prime(org_id, who.clone())? || Self::is_bot(org_id, who)?)
	}

	fn is_level_reached(battlepass_id: &T::Hash, account: &T::AccountId, level: u8) -> bool {
		let user_points = Self::get_points(battlepass_id, account);
		let levels = Levels::<T>::iter_prefix(battlepass_id)
			.filter(
				|(lvl, pnt)| level == *lvl && user_points >= *pnt
			);

		levels.count() == 1
	}

	fn bump_collection_index() -> Result<u32, DispatchError> {
		CollectionIndex::<T>::try_mutate(|n| -> Result<u32, DispatchError> {
			let id = *n;
			ensure!(id != u32::max_value(), Error::<T>::NoAvailableCollectionId);
			*n += 1;
			Ok(id)
		})
	}

	fn bump_nft_index() -> Result<u32, DispatchError> {
		NftIndex::<T>::try_mutate(|n| -> Result<u32, DispatchError> {
			let id = *n;
			ensure!(id != u32::max_value(), Error::<T>::NoAvailableNftId);
			*n += 1;
			Ok(id)
		})
	}

	fn create_collection(owner: T::AccountId, max: Option<u32>) -> Result<T::CollectionId, DispatchError> {
		let metadata = BoundedVec::truncate_from(b"meta".to_vec());		// TODO: what should be here?
		let symbol = BoundedVec::truncate_from(b"symbol".to_vec());		// TODO: what should be here?
		let collection_index = Self::bump_collection_index()?;
		let collection_id = T::BattlepassHelper::collection(collection_index);

		T::Rmrk::collection_create(owner, collection_id, metadata, max, symbol)?;

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

	fn get_battlepass_info(org_id: &T::Hash) -> (u32, Option<T::Hash>, Option<T::AccountId>) {
		if let Some(bp_info) = BattlepassInfoByOrg::<T>::get(org_id) {
			return (bp_info.count, bp_info.active, bp_info.bot);
		} else {
			return (0, None, None);
		}
	}
	
	fn do_create_battlepass(creator: T::AccountId, org_id: T::Hash, name: String<T>, cid: String<T>, collection_id: T::CollectionId, price: u16, new_season:u32) -> Result<T::Hash, DispatchError> {
		let battlepass: Battlepass<T::Hash, T::AccountId, String<T>, T::CollectionId> = Battlepass {
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
		BattlepassInfoByOrg::<T>::insert(org_id, BattlepassInfo{count: new_season, active: None, bot: None});

		Ok(battlepass_id)
	}

	fn do_claim_battlepass(by_who: T::AccountId, for_who: T::AccountId, battlepass_id: T::Hash, collection_id: T::CollectionId) -> Result<T::ItemId, DispatchError> {
		let nft_index = Self::bump_nft_index()?;
		let nft_id: T::ItemId = T::BattlepassHelper::item(nft_index);

		// Create Battlepass NFT
		let metadata = battlepass_id.encode();
		let _ = T::Rmrk::nft_mint(
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

		Ok(nft_id)
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

	fn do_create_reward(battlepass_id: T::Hash, name: String<T>, cid: String<T>, level: u8, transferable: bool, collection_id: T::CollectionId) -> Result<T::Hash, DispatchError> {
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

	fn do_claim_reward(claimer: T::AccountId, reward_id: T::Hash, collection_id: T::CollectionId, transferable: bool) -> Result<T::ItemId, DispatchError> {
		let nft_index = Self::bump_nft_index()?;
		let nft_id = T::BattlepassHelper::item(nft_index);

		// Create Battlepass NFT
		let metadata = reward_id.encode();
		let _ = T::Rmrk::nft_mint(
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

		ClaimedRewards::<T>::insert(&reward_id, &claimer, nft_id);

		Ok(nft_id)
	}
}
