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
pub mod types;
pub use types::*;

mod mock;
mod tests;
#[cfg(feature = "runtime-benchmarks")]
mod benchmarking;
pub mod weights;

pub use pallet::*;
use frame_support::{pallet_prelude::*, storage::bounded_vec::BoundedVec};
use frame_system::pallet_prelude::*;
use sp_std::convert::TryInto;
pub use weights::WeightInfo;

#[frame_support::pallet]
pub mod pallet {
	use super::*;

	#[pallet::config]
	pub trait Config: frame_system::Config {
		type RuntimeEvent: From<Event<Self>>
			+ IsType<<Self as frame_system::Config>::RuntimeEvent>
			+ Into<<Self as frame_system::Config>::RuntimeEvent>;
		type WeightInfo: WeightInfo;

		/// The maximum length of a name or symbol stored on-chain.
		#[pallet::constant]
		type StringLimit: Get<u32>;
	}

	#[pallet::pallet]
	#[pallet::generate_store(pub(super) trait Store)]
	pub struct Pallet<T>(_);

	/// Sense Entity of the account.
	///
	/// Entities: map AccountId => Entity
	#[pallet::storage]
	#[pallet::getter(fn get_entity)]
	pub(super) type Entities<T: Config> = StorageMap<_,
		Blake2_128Concat,
		T::AccountId,
		Entity<T::AccountId, T::BlockNumber, BoundedVec<u8, T::StringLimit>>,
		OptionQuery
	>;

	/// EntityCount. Increase per each entity creation.
	///
	/// EntityCount: u128
	#[pallet::storage]
	#[pallet::getter(fn get_entity_count)]
	pub type EntityCount<T: Config> = StorageValue<_, u128, ValueQuery>;

	/// All properties of the account.
	///
	/// Properties: map (PropertyType, AccountId) => EntityProperty
	#[pallet::storage]
	#[pallet::getter(fn get_property)]
	pub(super) type Properties<T: Config> = StorageDoubleMap<_,
		Blake2_128Concat, PropertyType,
		Blake2_128Concat, T::AccountId,
		EntityProperty<T::BlockNumber>,
		OptionQuery
	>;

	#[pallet::event]
	#[pallet::generate_deposit(pub(super) fn deposit_event)]
	pub enum Event<T: Config> {
		/// New Sense Entity was created.
		EntityCreated{
			account_id: T::AccountId,
			block_number: T::BlockNumber
		},
		/// Property was updated.
		PropertyUpdated{
			property_type: PropertyType,
			account_id: T::AccountId,
			block_number: T::BlockNumber
		},
	}

	#[pallet::error]
	pub enum Error<T> {
		/// Entity exists.
		EntityExists,
		/// Entity unknown.
		EntityUnknown,
		/// Invalid param.
		InvalidParam,
		/// Overflow adding a value to the entity property
		EntityPropertyOverflow,
		/// No EntityProperty found for account.
		EntityPropertyUnknown,
		/// Overflow adding a value to the entity count
		EntityCountOverflow,
	}

	#[pallet::call]
	impl<T: Config> Pallet<T> {

		/// Create a Sense Entity for the account.
		///
		/// Parameters:
		/// - `account_id`: account id.
		/// - `cid`: IPFS content identifier.
		///
		/// Emits `EntityCreated` event when successful.
		///
		/// Weight: `O(1)`
		#[pallet::call_index(0)]
		#[pallet::weight(<T as Config>::WeightInfo::create_entity())]
		pub fn create_entity(
			origin: OriginFor<T>,
			account_id: T::AccountId,
			cid: BoundedVec<u8, T::StringLimit>,
		) -> DispatchResult {
			ensure_root(origin)?;
			ensure!(cid.len() > 0, Error::<T>::InvalidParam);
			ensure!(!Entities::<T>::contains_key(account_id.clone()), Error::<T>::EntityExists);

			let current_block = <frame_system::Pallet<T>>::block_number();
			let index = Self::get_entity_count();

			let count = index.checked_add(1).ok_or(Error::<T>::EntityCountOverflow)?;
			let entity = Entity::new(account_id.clone(), current_block, index, cid);
			let experience = EntityProperty::new(0, current_block);
			let reputation = EntityProperty::new(0, current_block);
			let trust = EntityProperty::new(0, current_block);

			Self::save_entity(account_id.clone(), entity, count, experience, reputation, trust);

			Self::deposit_event(Event::EntityCreated{
				account_id,
				block_number: current_block
			});
			Ok(())
		}

		/// Modifies a property of the account.
		///
		/// Parameters:
		/// - `account_id`: account id.
		/// - `property_type`: property type (Experience, Reputation, Trust).
		/// - `value`: value to be incremented to property.
		///
		/// Emits `PropertyUpdated` event when successful.
		///
		/// Weight: `O(1)`
		#[pallet::call_index(1)]
		#[pallet::weight(<T as Config>::WeightInfo::update_property())]
		pub fn update_property(
			origin: OriginFor<T>,
			account_id: T::AccountId,
			property_type: PropertyType,
			value: u8
		) -> DispatchResult {
			ensure_root(origin)?;
			ensure!(Entities::<T>::contains_key(account_id.clone()), Error::<T>::EntityUnknown);

			let current_block = <frame_system::Pallet<T>>::block_number();
			let v = u64::from(value);
			let current = Self::get_property(property_type.clone(), account_id.clone()).ok_or(Error::<T>::EntityPropertyUnknown)?;
			let updated = EntityProperty::new(
				current.get_value().checked_add(v).ok_or(Error::<T>::EntityPropertyOverflow)?,
				current_block
			);

			Self::save_property(property_type.clone(), account_id.clone(), updated);

			Self::deposit_event(Event::PropertyUpdated{
				property_type,
				account_id,
				block_number: current_block
			});
			Ok(())
		}
	}

	impl<T: Config> Pallet<T> {
		fn save_entity(
			account_id: T::AccountId,
			entity: Entity<T::AccountId, T::BlockNumber, BoundedVec<u8, T::StringLimit>>,
			count: u128,
			experience: EntityProperty<T::BlockNumber>,
			reputation: EntityProperty<T::BlockNumber>,
			trust: EntityProperty<T::BlockNumber>
		) {
			Entities::<T>::insert(account_id.clone(), entity);
			EntityCount::<T>::put(count);
			Properties::<T>::insert(PropertyType::Experience, account_id.clone(), experience);
			Properties::<T>::insert(PropertyType::Reputation, account_id.clone(), reputation);
			Properties::<T>::insert(PropertyType::Trust, account_id, trust);
		}

		fn save_property(property_type: PropertyType, account_id: T::AccountId, value: EntityProperty<T::BlockNumber>) {
			Properties::<T>::insert(property_type, account_id, value);
		}
	}
}
