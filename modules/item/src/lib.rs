#![allow(warnings)]
//! This pallet exposes capabilities for managing unique items,
//! also known as non-fungible tokens (NFTs).
//!
//! - [`pallet_items::Config`](./trait.Config.html)
//! - [`Calls`](./enum.Call.html)
//! - [`Errors`](./enum.Error.html)
//! - [`Events`](./enum.RawEvent.html)
//!
//! ## Overview
//!
//! Items that share a common metadata structure may be created and distributed
//! by an item admin. Item owners may burn items or transfer their
//! ownership. Configuration parameters are used to limit the total number of a
//! type of item that may exist as well as the number that any one account may
//! own. Items are uniquely identified by the hash of the info that defines
//! them, as calculated by the runtime system's hashing algorithm.
//!
//! This pallet implements the [`Items`](./nft/trait.Items.html)
//! trait in a way that is optimized for items that are expected to be traded
//! frequently.
//!
//! ### Dispatchable Functions
//!
//! * [`mint`](./enum.Call.html#variant.mint) - Use the provided item info
//!   to create a new item for the specified user. May only be called by
//!   the item admin.
//!
//! * [`burn`](./enum.Call.html#variant.burn) - Destroy a item. May only be
//!   called by item owner.
//!
//! * [`transfer`](./enum.Call.html#variant.transfer) - Transfer ownership of
//!   a item to another account. May only be called by current item
//!   owner.

#![cfg_attr(not(feature = "std"), no_std)]

use codec::FullCodec;
use frame_support::{
	decl_error, decl_event, decl_module, decl_storage, dispatch, ensure,
	traits::{EnsureOrigin, Get},
	Hashable,
};
use frame_system::ensure_signed;
use sp_runtime::traits::{Hash, Member};
use sp_std::{cmp::Eq, fmt::Debug, vec::Vec};

pub mod nft;
pub use crate::nft::Items;

#[cfg(test)]
mod mock;

#[cfg(test)]
mod tests;

pub trait Config<I=DefaultInstance>: frame_system::Config {

	/// The dispatch origin that is able to mint new instances of this type of item.
	type ItemAdmin: EnsureOrigin<Self::Origin>;

	/// The data type that is used to describe this type of item.
	type ItemInfo: Hashable + Member + Debug + Default + FullCodec + Ord;

	/// The maximum number of this type of item that may exist (minted - burned).
	type ItemLimit: Get<u128>;

	/// The maximum number of this type of item that any single account may own.
	type UserItemLimit: Get<u64>;

	type Event: From<Event<Self, I>> + Into<<Self as frame_system::Config>::Event>;

}

/// The runtime system's hashing algorithm is used to uniquely identify items.
pub type ItemId<T> = <T as frame_system::Config>::Hash;

/// Associates a item with its ID.
pub type Item<T, I> = (ItemId<T>, <T as Config<I>>::ItemInfo);

decl_storage! {
	trait Store for Module<T: Config<I>, I: Instance=DefaultInstance> as Item {
		/// The total number of this type of item that exists (minted - burned).
		Total get(fn total): u128 = 0;
		/// The total number of this type of item that has been burned (may overflow).
		Burned get(fn burned): u128 = 0;
		/// The total number of this type of item owned by an account.
		TotalForAccount get(fn total_for_account): map hasher(blake2_128_concat) T::AccountId => u64 = 0;
		/// A mapping from an account to a list of all of the items of this type that are owned by it.
		ItemsForAccount get(fn items_for_account): map hasher(blake2_128_concat) T::AccountId => Vec<Item<T, I>>;
		/// A mapping from a item ID to the account that owns it.
		AccountForItem get(fn account_for_item): map hasher(identity) ItemId<T> => T::AccountId;
	}

	add_extra_genesis {
		config(balances): Vec<(T::AccountId, Vec<T::ItemInfo>)>;
		build(|config: &GenesisConfig<T, I>| {
			for (who, items) in config.balances.iter() {
				for item in items {
					match <Module::<T, I> as Items::<T::AccountId>>::mint(who, item.clone()) {
						Ok(_) => {}
						Err(err) => { panic!(err) },
					}
				}
			}
		});
	}
}

decl_event!(
	pub enum Event<T, I=DefaultInstance>
	where
		ItemId = <T as frame_system::Config>::Hash,
		AccountId = <T as frame_system::Config>::AccountId,
	{
		/// The item has been burned.
		Burned(ItemId),
		/// The item has been minted and distributed to the account.
		Minted(ItemId, AccountId),
		/// Ownership of the item has been transferred to the account.
		Transferred(ItemId, AccountId),
	}
);

decl_error! {
	pub enum Error for Module<T: Config<I>, I: Instance> {
		// Thrown when there is an attempt to mint a duplicate item.
		ItemExists,
		// Thrown when there is an attempt to burn or transfer a nonexistent item.
		NonexistentItem,
		// Thrown when someone who is not the owner of a item attempts to transfer or burn it.
		NotItemOwner,
		// Thrown when the item admin attempts to mint a item and the maximum number of this
		// type of item already exists.
		TooManyItems,
		// Thrown when an attempt is made to mint or transfer a item to an account that already
		// owns the maximum number of this type of item.
		TooManyItemsForAccount,
	}
}

decl_module! {
	pub struct Module<T: Config<I>, I: Instance=DefaultInstance> for enum Call where origin: T::Origin {
		type Error = Error<T, I>;
		fn deposit_event() = default;

		/// Create a new item from the provided item info and identify the specified
		/// account as its owner. The ID of the new item will be equal to the hash of the info
		/// that defines it, as calculated by the runtime system's hashing algorithm.
		///
		/// The dispatch origin for this call must be the item admin.
		///
		/// This function will throw an error if it is called with item info that describes
		/// an existing (duplicate) item, if the maximum number of this type of item already
		/// exists or if the specified owner already owns the maximum number of this type of
		/// item.
		///
		/// - `owner_account`: Receiver of the item.
		/// - `item_info`: The information that defines the item.
		#[weight = 10_000]
		pub fn mint(origin, owner_account: T::AccountId, item_info: T::ItemInfo) -> dispatch::DispatchResult {
			T::ItemAdmin::ensure_origin(origin)?;

			let item_id = <Self as UniqueItems<_>>::mint(&owner_account, item_info)?;
			Self::deposit_event(RawEvent::Minted(item_id, owner_account.clone()));
			Ok(())
		}

		/// Destroy the specified item.
		///
		/// The dispatch origin for this call must be the item owner.
		///
		/// - `item_id`: The hash (calculated by the runtime system's hashing algorithm)
		///   of the info that defines the item to destroy.
		#[weight = 10_000]
		pub fn burn(origin, item_id: ItemId<T>) -> dispatch::DispatchResult {
			let who = ensure_signed(origin)?;
			ensure!(who == Self::account_for_item(&item_id), Error::<T, I>::NotItemOwner);

			<Self as Items<_>>::burn(&item_id)?;
			Self::deposit_event(RawEvent::Burned(item_id.clone()));
			Ok(())
		}

		/// Transfer a item to a new owner.
		///
		/// The dispatch origin for this call must be the item owner.
		///
		/// This function will throw an error if the new owner already owns the maximum
		/// number of this type of item.
		///
		/// - `dest_account`: Receiver of the item.
		/// - `item_id`: The hash (calculated by the runtime system's hashing algorithm)
		///   of the info that defines the item to destroy.
		#[weight = 10_000]
		pub fn transfer(origin, dest_account: T::AccountId, item_id: ItemId<T>) -> dispatch::DispatchResult {
			let who = ensure_signed(origin)?;
			ensure!(who == Self::account_for_item(&item_id), Error::<T, I>::NotItemOwner);

			<Self as Items<_>>::transfer(&dest_account, &item_id)?;
			Self::deposit_event(RawEvent::Transferred(item_id.clone(), dest_account.clone()));
			Ok(())
		}
	}
}

impl<T: Config<I>, I: Instance> Items<T::AccountId> for Module<T, I> {
	type ItemId = ItemId<T>;
	type ItemInfo = T::ItemInfo;
	type ItemLimit = T::ItemLimit;
	type UserItemLimit = T::UserItemLimit;

	fn total() -> u128 {
		Self::total()
	}

	fn burned() -> u128 {
		Self::burned()
	}

	fn total_for_account(account: &T::AccountId) -> u64 {
		Self::total_for_account(account)
	}

	fn items_for_account(account: &T::AccountId) -> Vec<Item<T, I>> {
		Self::items_for_account(account)
	}

	fn owner_of(item_id: &ItemId<T>) -> T::AccountId {
		Self::account_for_item(item_id)
	}

	fn mint(
		owner_account: &T::AccountId,
		item_info: <T as Config<I>>::ItemInfo,
	) -> dispatch::result::Result<ItemId<T>, dispatch::DispatchError> {
		let item_id = T::Hashing::hash_of(&item_info);

		ensure!(
			!AccountForItem::<T, I>::contains_key(&item_id),
			Error::<T, I>::ItemExists
		);

		ensure!(
			Self::total_for_account(owner_account) < T::UserItemLimit::get(),
			Error::<T, I>::TooManyItemsForAccount
		);

		ensure!(
			Self::total() < T::ItemLimit::get(),
			Error::<T, I>::TooManyItems
		);

		let new_item = (item_id, item_info);

		Total::<I>::mutate(|total| *total += 1);
		TotalForAccount::<T, I>::mutate(owner_account, |total| *total += 1);
		ItemsForAccount::<T, I>::mutate(owner_account, |items| {
			match items.binary_search(&new_item) {
				Ok(_pos) => {} // should never happen
				Err(pos) => items.insert(pos, new_item),
			}
		});
		AccountForItem::<T, I>::insert(item_id, &owner_account);

		Ok(item_id)
	}

	fn burn(item_id: &ItemId<T>) -> dispatch::DispatchResult {
		let owner = Self::owner_of(item_id);
		ensure!(
			owner != T::AccountId::default(),
			Error::<T, I>::NonexistentItem
		);

		let burn_item = (*item_id, <T as Config<I>>::ItemInfo::default());

		Total::<I>::mutate(|total| *total -= 1);
		Burned::<I>::mutate(|total| *total += 1);
		TotalForAccount::<T, I>::mutate(&owner, |total| *total -= 1);
		ItemsForAccount::<T, I>::mutate(owner, |items| {
			let pos = items
				.binary_search(&burn_item)
				.expect("We already checked that we have the correct owner; qed");
			items.remove(pos);
		});
		AccountForItem::<T, I>::remove(&item_id);

		Ok(())
	}

	fn transfer(
		dest_account: &T::AccountId,
		item_id: &ItemId<T>,
	) -> dispatch::DispatchResult {
		let owner = Self::owner_of(&item_id);
		ensure!(
			owner != T::AccountId::default(),
			Error::<T, I>::NonexistentItem
		);

		ensure!(
			Self::total_for_account(dest_account) < T::UserItemLimit::get(),
			Error::<T, I>::TooManyItemsForAccount
		);

		let xfer_item = (*item_id, <T as Config<I>>::ItemInfo::default());

		TotalForAccount::<T, I>::mutate(&owner, |total| *total -= 1);
		TotalForAccount::<T, I>::mutate(dest_account, |total| *total += 1);
		let item = ItemsForAccount::<T, I>::mutate(owner, |items| {
			let pos = items
				.binary_search(&xfer_item)
				.expect("We already checked that we have the correct owner; qed");
			items.remove(pos)
		});
		ItemsForAccount::<T, I>::mutate(dest_account, |items| {
			match items.binary_search(&item) {
				Ok(_pos) => {} // should never happen
				Err(pos) => items.insert(pos, item),
			}
		});
		AccountForItem::<T, I>::insert(&item_id, &dest_account);

		Ok(())
	}
}
