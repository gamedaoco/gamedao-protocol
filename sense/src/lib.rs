//
//           _______________________________ ________
//           \____    /\_   _____/\______   \\_____  \
//             /     /  |    __)_  |       _/ /   |   \
//            /     /_  |        \ |    |   \/    |    \
//           /_______ \/_______  / |____|_  /\_______  /
//                   \/        \/         \/         \/
//           Z  E  R  O  .  I  O     N  E  T  W  O  R  K
//           © C O P Y R I O T   2 0 7 5 @ Z E R O . I O

// This file is part of ZERO Network.
// Copyright (C) 2010-2020 ZERO Labs.
// SPDX-License-Identifier: Apache-2.0

//! SENSE
//!
//! This pallet aggregates datapoints to reflect user experience and behaviour.
#![cfg_attr(not(feature = "std"), no_std)]
#[warn(unused_imports)]
use frame_support::{dispatch::DispatchResult, pallet_prelude::*, traits::Get};
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
	use frame_support::pallet_prelude::*;
	use frame_system::pallet_prelude::*;

	#[pallet::config]
	pub trait Config: frame_system::Config {
		type Event: From<Event<Self>>
			+ IsType<<Self as frame_system::Config>::Event>
			+ Into<<Self as frame_system::Config>::Event>;
		type ForceOrigin: EnsureOrigin<Self::Origin>;
		type WeightInfo: WeightInfo;
	}

	#[pallet::pallet]
	#[pallet::generate_store(pub(super) trait Store)]
	pub struct Pallet<T>(_);

	#[pallet::storage]
	#[pallet::getter(fn entity)]
	pub(super) type SenseEntity<T: Config> = StorageMap<
		_,
		Blake2_128Concat,
		T::AccountId,
		Entity<T::AccountId, T::BlockNumber>,
		ValueQuery,
	>;

	#[pallet::storage]
	#[pallet::getter(fn xp)]
	pub(super) type SenseXP<T: Config> =
		StorageMap<_, Blake2_128Concat, T::AccountId, EntityProperty<T::BlockNumber>, ValueQuery>;

	#[pallet::storage]
	#[pallet::getter(fn rep)]
	pub(super) type SenseREP<T: Config> =
		StorageMap<_, Blake2_128Concat, T::AccountId, EntityProperty<T::BlockNumber>, ValueQuery>;

	#[pallet::storage]
	#[pallet::getter(fn trust)]
	pub(super) type SenseTrust<T: Config> =
		StorageMap<_, Blake2_128Concat, T::AccountId, EntityProperty<T::BlockNumber>, ValueQuery>;

	#[pallet::storage]
	#[pallet::getter(fn nonce)]
	pub type Nonce<T: Config> = StorageValue<_, u128, ValueQuery>;

	#[pallet::event]
	#[pallet::generate_deposit(pub(super) fn deposit_event)]
	pub enum Event<T: Config> {
		EntityInit(T::AccountId, T::BlockNumber),
		EntityMutateXP(T::AccountId, T::BlockNumber),
		EntityMutateREP(T::AccountId, T::BlockNumber),
		EntityMutateTrust(T::AccountId, T::BlockNumber),
	}

	// Errors inform users that something went wrong.
	#[pallet::error]
	pub enum Error<T> {
		/// Entity Exists
		EntityExists,
		/// Entity Unknown
		EntityUnknown,
		/// Guru Meditation
		GuruMeditation,
		/// Param Limit Exceed
		ParamLimitExceed,
		/// Invalid Param
		InvalidParam,
	}

	#[pallet::call]
	impl<T: Config> Pallet<T> {
		#[pallet::weight(<T as Config>::WeightInfo::create_entity())]
		pub fn create_entity(
			origin: OriginFor<T>,
			account: T::AccountId,
			cid: Vec<u8>,
		) -> DispatchResult {
			ensure_root(origin)?;
			ensure!(cid.len() > 0, Error::<T>::InvalidParam);
			ensure!(cid.len() <= MAX_STRING_FIELD_LENGTH, Error::<T>::ParamLimitExceed);
			ensure!(!<SenseEntity<T>>::contains_key(&account), Error::<T>::EntityExists);

			let current_block = <frame_system::Pallet<T>>::block_number();
			let index = <Nonce<T>>::get();

			let entity = Entity::new(account.clone(), current_block, index, cid.clone());
			let xp = EntityProperty { value: 0, mutated: current_block.clone() };
			let rep = EntityProperty { value: 0, mutated: current_block.clone() };
			let trust = EntityProperty { value: 0, mutated: current_block.clone() };

			<SenseXP<T>>::insert(account.clone(), xp);
			<SenseREP<T>>::insert(account.clone(), rep);
			<SenseTrust<T>>::insert(account.clone(), trust);
			<SenseEntity<T>>::insert(account.clone(), entity);
			// TODO: safe increment, checked_add
			<Nonce<T>>::mutate(|n| *n += 1);

			Self::deposit_event(Event::EntityInit(account, current_block));
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

		#[pallet::weight(<T as Config>::WeightInfo::mod_xp())]
		pub fn mod_xp(origin: OriginFor<T>, account: T::AccountId, value: u8) -> DispatchResult {
			ensure_root(origin)?;
			ensure!(<SenseEntity<T>>::contains_key(&account), Error::<T>::EntityUnknown);

			let now = <frame_system::Pallet<T>>::block_number();
			let v = u64::from(value);
			let current = Self::xp(&account);

			let updated = EntityProperty {
				value: current.value.checked_add(v).ok_or(Error::<T>::GuruMeditation)?,
				mutated: now.clone(),
			};

			<SenseXP<T>>::insert(account.clone(), updated);

			Self::deposit_event(Event::EntityMutateXP(account, now));
			Ok(())
		}

		#[pallet::weight(<T as Config>::WeightInfo::mod_rep())]
		pub fn mod_rep(origin: OriginFor<T>, account: T::AccountId, value: u8) -> DispatchResult {
			ensure_root(origin)?;
			ensure!(<SenseEntity<T>>::contains_key(&account), Error::<T>::EntityUnknown);

			let now = <frame_system::Pallet<T>>::block_number();
			let v = u64::from(value);
			let current = Self::rep(&account);

			let updated = EntityProperty {
				value: current.value.checked_add(v).ok_or(Error::<T>::GuruMeditation)?,
				mutated: now.clone(),
			};

			<SenseREP<T>>::insert(account.clone(), updated);

			Self::deposit_event(Event::EntityMutateREP(account, now));
			Ok(())
		}

		#[pallet::weight(<T as Config>::WeightInfo::mod_trust())]
		pub fn mod_trust(origin: OriginFor<T>, account: T::AccountId, value: u8) -> DispatchResult {
			ensure_root(origin)?;
			ensure!(<SenseEntity<T>>::contains_key(&account), Error::<T>::EntityUnknown);

			let now = <frame_system::Pallet<T>>::block_number();
			let v = u64::from(value);
			let current = Self::trust(&account);

			let updated = EntityProperty {
				value: current.value.checked_add(v).ok_or(Error::<T>::GuruMeditation)?,
				mutated: now,
			};

			<SenseTrust<T>>::insert(account.clone(), updated);

			Self::deposit_event(Event::EntityMutateTrust(account, now));
			Ok(())
		}

		// TODO:
		// generic mod for all properties
	}
}
