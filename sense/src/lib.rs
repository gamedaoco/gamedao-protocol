//      _______  ________  ________  ________   ______   _______   _______
//    ╱╱       ╲╱        ╲╱        ╲╱        ╲_╱      ╲╲╱       ╲╲╱       ╲╲
//   ╱╱      __╱         ╱         ╱         ╱        ╱╱        ╱╱        ╱╱
//  ╱       ╱ ╱         ╱         ╱        _╱         ╱         ╱         ╱
//  ╲________╱╲___╱____╱╲__╱__╱__╱╲________╱╲________╱╲___╱____╱╲________╱
//
// This file is part of GameDAO Protocol.
// Copyright (C) 2018-2022 GameDAO AG.
// SPDX-License-Identifier: Apache-2.0

//! SENSE
//! This pallet aggregates datapoints to reflect user experience and behaviour.
//! Sense Properties: Experience, Reputation and Trust.
#![cfg_attr(not(feature = "std"), no_std)]
#[warn(unused_imports)]
use frame_support::{dispatch::DispatchResult, pallet_prelude::*};
use frame_system::pallet_prelude::*;
use scale_info::TypeInfo;
use sp_std::vec::Vec;

pub use weights::WeightInfo;

#[cfg(feature = "runtime-benchmarks")]
mod benchmarking;
mod mock;
mod tests;
pub mod weights;

pub use pallet::*;

pub const MAX_STRING_FIELD_LENGTH: usize = 256;

#[derive(Encode, Decode, Default, PartialEq, Eq, TypeInfo)]
#[cfg_attr(feature = "std", derive(Debug))]
pub struct Entity<AccountId, BlockNumber> {
	account: AccountId,
	index: u128,
	cid: Vec<u8>,
	created: BlockNumber,
	mutated: BlockNumber,
}

#[derive(Encode, Decode, Default, PartialEq, Eq, TypeInfo)]
#[cfg_attr(feature = "std", derive(Debug))]
pub struct EntityProperty<BlockNumber> {
	value: u64,
	mutated: BlockNumber,
}

impl<AccountId, BlockNumber> Entity<AccountId, BlockNumber> {
	pub fn new(
		account: AccountId,
		block_number: BlockNumber,
		index: u128,
		cid: Vec<u8>,
	) -> Entity<AccountId, BlockNumber>
	where
		BlockNumber: Clone,
	{
		Entity { account, index, cid, created: block_number.clone(), mutated: block_number }
	}
}

impl<BlockNumber> EntityProperty<BlockNumber> {
	pub fn new(value: u64, block_number: BlockNumber) -> EntityProperty<BlockNumber> {
		EntityProperty { value, mutated: block_number }
	}
}

#[frame_support::pallet]
pub mod pallet {
	use super::*;

	#[pallet::config]
	pub trait Config: frame_system::Config {
		type Event: From<Event<Self>>
			+ IsType<<Self as frame_system::Config>::Event>
			+ Into<<Self as frame_system::Config>::Event>;
		type WeightInfo: WeightInfo;
	}

	#[pallet::pallet]
	#[pallet::generate_store(pub(super) trait Store)]
	pub struct Pallet<T>(_);

	/// Sense Entity of the account.
	/// 
	/// SenseEntity: map AccountId => Entity
	#[pallet::storage]
	#[pallet::getter(fn entity)]
	pub(super) type SenseEntity<T: Config> = StorageMap<_, Blake2_128Concat, T::AccountId,
		Entity<T::AccountId, T::BlockNumber>, ValueQuery>;

	/// Experience property of the account.
	/// 
	/// SenseEntity: map AccountId => EntityProperty
	#[pallet::storage]
	#[pallet::getter(fn xp)]
	pub(super) type SenseXP<T: Config> =
		StorageMap<_, Blake2_128Concat, T::AccountId, EntityProperty<T::BlockNumber>, ValueQuery>;

	/// Reputation property of the account.
	/// 
	/// SenseEntity: map AccountId => EntityProperty
	#[pallet::storage]
	#[pallet::getter(fn rep)]
	pub(super) type SenseREP<T: Config> =
		StorageMap<_, Blake2_128Concat, T::AccountId, EntityProperty<T::BlockNumber>, ValueQuery>;

	/// Trust property of the account.
	/// 
	/// SenseEntity: map AccountId => EntityProperty
	#[pallet::storage]
	#[pallet::getter(fn trust)]
	pub(super) type SenseTrust<T: Config> =
		StorageMap<_, Blake2_128Concat, T::AccountId, EntityProperty<T::BlockNumber>, ValueQuery>;

	/// Nonce. Increase per each entity creation.
	/// 
	/// Nonce: u128
	#[pallet::storage]
	#[pallet::getter(fn nonce)]
	pub type Nonce<T: Config> = StorageValue<_, u128, ValueQuery>;

	#[pallet::event]
	#[pallet::generate_deposit(pub(super) fn deposit_event)]
	pub enum Event<T: Config> {
		/// New Sense Entity was created.
		EntityInit(T::AccountId, T::BlockNumber),
		/// Experience property was updated.
		EntityMutateXP(T::AccountId, T::BlockNumber),
		/// Reputation property was updated.
		EntityMutateREP(T::AccountId, T::BlockNumber),
		/// Trust property was updated.
		EntityMutateTrust(T::AccountId, T::BlockNumber),
	}

	#[pallet::error]
	pub enum Error<T> {
		/// Entity exists.
		EntityExists,
		/// Entity unknown.
		EntityUnknown,
		/// Guru Meditation.
		GuruMeditation,
		/// Param limit exceed.
		ParamLimitExceed,
		/// Invalid param.
		InvalidParam,
		/// Overflow adding a value to the entity property
		EntityPropertyOverflow,
	}

	#[pallet::call]
	impl<T: Config> Pallet<T> {

		/// Create a Sense Entity for the account.
		/// 
		/// Parameters:
		/// - `account_id`: account id.
		/// - `cid`: IPFS content identifier.
		///
		/// Emits `EntityInit` event when successful.
		///
		/// Weight: `O(1)`
		#[pallet::weight(<T as Config>::WeightInfo::create_entity())]
		pub fn create_entity(
			origin: OriginFor<T>,
			account_id: T::AccountId,
			cid: Vec<u8>,
		) -> DispatchResult {
			ensure_root(origin)?;
			ensure!(cid.len() > 0, Error::<T>::InvalidParam);
			ensure!(cid.len() <= MAX_STRING_FIELD_LENGTH, Error::<T>::ParamLimitExceed);
			ensure!(!<SenseEntity<T>>::contains_key(&account_id), Error::<T>::EntityExists);

			let current_block = <frame_system::Pallet<T>>::block_number();
			let index = <Nonce<T>>::get();

			let entity = Entity::new(account_id.clone(), current_block, index, cid.clone());
			let xp = EntityProperty { value: 0, mutated: current_block.clone() };
			let rep = EntityProperty { value: 0, mutated: current_block.clone() };
			let trust = EntityProperty { value: 0, mutated: current_block.clone() };

			<SenseXP<T>>::insert(account_id.clone(), xp);
			<SenseREP<T>>::insert(account_id.clone(), rep);
			<SenseTrust<T>>::insert(account_id.clone(), trust);
			<SenseEntity<T>>::insert(account_id.clone(), entity);
			// TODO: safe increment, checked_add
			<Nonce<T>>::mutate(|n| *n += 1);

			Self::deposit_event(Event::EntityInit(account_id, current_block));
			Ok(())
		}

		// TODO:
		// mutation of values should be restricted
		// certain roles are allowed to mutate values
		// xp:    realm
		// rep:   social
		// trust: id
		// all:   governance
		//        sudo ( until its removal )

		/// Modifies an Experience property of the account.
		/// 
		/// Parameters:
		/// - `account_id`: account id.
		/// - `cid`: IPFS content identifier.
		///
		/// Emits `EntityMutateXP` event when successful.
		///
		/// Weight: `O(1)`
		#[pallet::weight(<T as Config>::WeightInfo::mod_xp())]
		pub fn mod_xp(origin: OriginFor<T>, account_id: T::AccountId, value: u8) -> DispatchResult {
			ensure_root(origin)?;
			ensure!(<SenseEntity<T>>::contains_key(&account_id), Error::<T>::EntityUnknown);

			let now = <frame_system::Pallet<T>>::block_number();
			let v = u64::from(value);
			let current = Self::xp(&account_id);

			let updated = EntityProperty {
				value: current.value.checked_add(v).ok_or(Error::<T>::EntityPropertyOverflow)?,
				mutated: now.clone(),
			};

			<SenseXP<T>>::insert(account_id.clone(), updated);

			Self::deposit_event(Event::EntityMutateXP(account_id, now));
			Ok(())
		}

		/// Modifies a Reputation property of the account.
		/// 
		/// Parameters:
		/// - `account_id`: account id.
		/// - `cid`: IPFS content identifier.
		///
		/// Emits `EntityMutateREP` event when successful.
		///
		/// Weight: `O(1)`
		#[pallet::weight(<T as Config>::WeightInfo::mod_rep())]
		pub fn mod_rep(origin: OriginFor<T>, account_id: T::AccountId, value: u8) -> DispatchResult {
			ensure_root(origin)?;
			ensure!(<SenseEntity<T>>::contains_key(&account_id), Error::<T>::EntityUnknown);

			let now = <frame_system::Pallet<T>>::block_number();
			let v = u64::from(value);
			let current = Self::rep(&account_id);

			let updated = EntityProperty {
				value: current.value.checked_add(v).ok_or(Error::<T>::EntityPropertyOverflow)?,
				mutated: now.clone(),
			};

			<SenseREP<T>>::insert(account_id.clone(), updated);

			Self::deposit_event(Event::EntityMutateREP(account_id, now));
			Ok(())
		}

		/// Modifies a Trust property of the account.
		/// 
		/// Parameters:
		/// - `account_id`: account id.
		/// - `cid`: IPFS content identifier.
		///
		/// Emits `EntityMutateTrust` event when successful.
		///
		/// Weight: `O(1)`
		#[pallet::weight(<T as Config>::WeightInfo::mod_trust())]
		pub fn mod_trust(origin: OriginFor<T>, account_id: T::AccountId, value: u8) -> DispatchResult {
			ensure_root(origin)?;
			ensure!(<SenseEntity<T>>::contains_key(&account_id), Error::<T>::EntityUnknown);

			let now = <frame_system::Pallet<T>>::block_number();
			let v = u64::from(value);
			let current = Self::trust(&account_id);

			let updated = EntityProperty {
				value: current.value.checked_add(v).ok_or(Error::<T>::EntityPropertyOverflow)?,
				mutated: now,
			};

			<SenseTrust<T>>::insert(account_id.clone(), updated);

			Self::deposit_event(Event::EntityMutateTrust(account_id, now));
			Ok(())
		}

		// TODO: generic mod for all properties
	}
}
