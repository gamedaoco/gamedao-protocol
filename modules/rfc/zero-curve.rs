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

use frame_support::{
	dispatch::{result::Result, DispatchError, DispatchResult},
	traits::Get,
};
use sp_std::vec::Vec;

pub trait CurveToken {

// A curve token is based on Assets pallet and provides
// a token which implements basic buy and sell functionality.
// buy and sell operations result in mint and burn of the token.
// trades are settled against the treasury accounts,
// which work together as a tradable currency pair.


// boot of the system

// a is the input currency
// b is the output currency issued by the module
// b is limited to tv
// buy pressure is limited to bp over time dt
// sell pressure is limited to sp over time dt 

// 							module		user
// token balance a (input): 		0			0
// token balance b (output): 		0			0

// - the price function has a start position, e.g. 1/1,
//   which results in a price of 1 unit a for 1 unit b

// - when user sends amount in of currency a to module
//   module returns amount out in currency b based on exchange a b xab
//   to the sender: out = in * xab
// - based on the amount of token, the offset of price function moves along
//   the volume axis. the price for another one token could be:
//   with a linear price growth of 1/1, 2x unit a for 1x unit b.
//   with a progressive function e.g. 4x unit a for 1x unit b.
//   with a degressive function e.g. 0.9x unit a for 1x unit b.

// how do you calculate the volume price based on price function,
// when you e.g. buy 10 token?

	type Treasury;

	// determine current buy price
	// reserve reference currency
	// mint a token into an account

	type CurrencyId: Get<u64>;
	type ReferenceCurrency: Get<u64>;
	type BuyLimit: Get<u64>;
	type SellLimit: Get<u64>;

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

//
//
//

	type RealmId;
	type ClassId;
	// type ClassName: Get<Vec<u8>>;

	/// create a realm for an org
	/// taking the next free index
	fn create_realm(
		org: Self::RealmId
	) -> Result<Self::RealmId, DispatchError>;

	/// create a class in a realm
	fn create_class(
		realm: Self::RealmId,
		name: Vec<u8>
	) -> Result<Self::ClassId, DispatchError>;

//
//
//


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
