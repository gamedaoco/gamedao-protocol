//! # Items Interface
//!
//! This trait describes an abstraction over a set of unique items, also known as non-fungible
//! tokens (NFTs).
//!
//! ## Overview
//!
//! Unique items have an owner, identified by an account ID, and are defined by a common set of
//! attributes (the item info type). An item ID type distinguishes unique items from one another.
//! Items may be created (minted), destroyed (burned) or transferred.
//!
//! This abstraction is implemented by [pallet_commodities::Module](../struct.Module.html).

use frame_support::{
    dispatch::{result::Result, DispatchError, DispatchResult},
    traits::Get,
};
use sp_std::vec::Vec;

/// An interface over a set of unique items.
/// Items with equivalent attributes (as defined by the ItemInfo type) **must** have an equal ID
/// and items with different IDs **must not** have equivalent attributes.
pub trait Items<AccountId> {
    /// The type used to identify unique items.
    type ItemId;
    /// The attributes that distinguish unique items.
    type ItemInfo;
    /// The maximum number of this type of item that may exist (minted - burned).
    type ItemLimit: Get<u128>;
    /// The maximum number of this type of item that any single account may own.
    type UserItemLimit: Get<u64>;

    /// The total number of this type of item that exists (minted - burned).
    fn total() -> u128;
    /// The total number of this type of item that has been burned (may overflow).
    fn burned() -> u128;
    /// The total number of this type of item owned by an account.
    fn total_for_account(account: &AccountId) -> u64;
    /// The set of unique items owned by an account.
    fn items_for_account(account: &AccountId) -> Vec<(Self::ItemId, Self::ItemInfo)>;
    /// The ID of the account that owns an item.
    fn owner_of(item_id: &Self::ItemId) -> AccountId;

    /// Use the provided item info to create a new unique item for the specified user.
    /// This method **must** return an error in the following cases:
    /// - The item, as identified by the item info, already exists.
    /// - The specified owner account has already reached the user item limit.
    /// - The total item limit has already been reached.
    fn mint(
        owner_account: &AccountId,
        item_info: Self::ItemInfo,
    ) -> Result<Self::ItemId, DispatchError>;
    /// Destroy an item.
    /// This method **must** return an error in the following case:
    /// - The item with the specified ID does not exist.
    fn burn(item_id: &Self::ItemId) -> DispatchResult;
    /// Transfer ownership of an item to another account.
    /// This method **must** return an error in the following cases:
    /// - The item with the specified ID does not exist.
    /// - The destination account has already reached the user item limit.
    fn transfer(dest_account: &AccountId, item_id: &Self::ItemId) -> DispatchResult;
}
