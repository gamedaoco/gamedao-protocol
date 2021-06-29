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

//! CONTROL
//!
//! This pallet invokes the initial control body for various functions.

#![cfg_attr(not(feature = "std"), no_std)]

// TODO: harden checks on completion
#![allow(clippy::unused_unit)]
#![allow(dead_code)]
#![allow(unused_imports)]
#![allow(unused_variables)]

// TODO:
// mod default_weight;
// mod mock;
// mod tests;

pub use module::*;

pub mod module {

	use frame_support::{
		decl_error, decl_event, decl_module, decl_storage,
		ensure,
		dispatch::DispatchResult,
		traits::{ Get, Currency, EnsureOrigin, Randomness, ReservableCurrency, ExistenceRequirement },
	};
	use frame_system::{ self as system, ensure_root, ensure_signed };
	use codec::{ Encode, Decode };
	use sp_runtime::{
		traits::{ Hash },
		ModuleId
	};
	use sp_std::prelude::*;
	use pallet_balances::{ self as balances };
	use primitives:: {
		Balance,
		// BodyType,
		// BodyState
	};

	// #[derive(Encode, Decode, PartialEq, Eq)]
	// #[cfg_attr(feature = "std", derive(Debug))]
	// pub enum BodyType {
	// 	INDIVIDUAL = 0, // individual address
	// 	COMPANY = 1,    // ...with a legal body
	// 	DAO = 2,        // ...governed by a dao
	// }

	// #[derive(Encode, Decode, PartialEq, Eq)]
	// #[cfg_attr(feature = "std", derive(Debug))]
	// pub enum BodyState {
	// 	INACTIVE = 0,
	// 	ACTIVE = 1,
	// 	LOCKED = 2,
	// }

	//
	//
	//

	pub const MODULE_ID: ModuleId = ModuleId(*b"controla");
	pub const MODULE_VERSION: &str = "1.0";

	//
	//
	//

	pub trait Config: system::Config + balances::Config {

		// supervision
		type ForceOrigin: EnsureOrigin<Self::Origin>;

		// base currency
		type Currency: ReservableCurrency<Self::AccountId>;
		type CreationFee: Get<Self::Balance>;

		// bounds
		type MaxBodiesPerAccount: Get<usize>;
		type MaxMembersPerBody: Get<usize>;
		type MaxCreationsPerBlock: Get<usize>;

		//
		type Event: From<Event<Self>> + Into<<Self as system::Config>::Event>;
		type Randomness: Randomness<Self::Hash>;

	}

	//
	//
	//

	/// Body
	#[derive(Encode, Decode, Default, PartialEq, Eq)]
	#[cfg_attr(feature = "std", derive(Debug))]
	pub struct Body<Hash, AccountId, BlockNumber> {
		id: Hash,                // general hash
		index: u128,             // nonce
		creator: AccountId,      // creator
		controller: AccountId,   // current controller
		treasury: AccountId,     // treasury
		name: Vec<u8>,           // body name
		cid: Vec<u8>,            // cid -> ipfs
		body: u8,                // individual | legal body | dao
		state: u8,               // inactive | active | locked
		currency: Vec<u8>,       // control assets to empower actors
		created: BlockNumber,
		mutated: BlockNumber,
	}

	// /// Body Actors
	// #[derive(Encode, Decode, Default, PartialEq, Eq)]
	// #[cfg_attr(feature = "std", derive(Debug))]
	// pub struct BodyActors<Hash,AccountId> {
	// 	id: Hash,
	// 	members: Vec<AccountId>, // members

	// }

	//
	//	storage should be optimized to offload these maps to a graph / where more efficient
	//

	decl_storage! {
		trait Store for Module<T: Config> as Control {

			/// Body
			Bodies get(fn body_by_hash): map hasher(blake2_128_concat) T::Hash => Body<T::Hash, T::AccountId, T::BlockNumber>;

			/// Get a Body for specific Nonce
			BodyByNonce get(fn body_by_nonce): map hasher(blake2_128_concat) u128 => T::Hash;

			/// Get Created Bodies for an AccountId
			CreatedBodies get(fn get_bodies_created): map hasher(blake2_128_concat) T::AccountId => Vec<T::Hash>;
			/// Get Owned Bodies for an AccountId
			OwnedBodies get(fn get_bodies_owned): map hasher(blake2_128_concat) T::AccountId => Vec<T::Hash>;

			/// Current Balance from Treasury
			BodyBalance get(fn body_balance): map hasher(blake2_128_concat) T::Hash => T::Balance;
			/// Body State
			BodyState get(fn body_state): map hasher(blake2_128_concat) T::Hash => u8;

			/// Members of a body
			BodyMembers get(fn body_members): map hasher(blake2_128_concat) T::Hash => Vec<T::AccountId>;
			/// Member count
			BodyMemberCount get(fn body_member_count): map hasher(blake2_128_concat) T::Hash => u64;

			/// Creator of a body
			BodyCreator get(fn body_creator): map hasher(blake2_128_concat) T::Hash => T::AccountId;
			/// Admin Controller of a body
			BodyController get(fn body_controller): map hasher(blake2_128_concat) T::Hash => T::AccountId;
			/// Treasury of a body
			BodyTreasury get(fn body_treasury): map hasher(blake2_128_concat) T::Hash => T::AccountId;

			/// Accessmodel of a body
			/// 0 open, 1 invite by members, 2 invite by controller
			BodyAccess get(fn body_access): map hasher(blake2_128_concat) T::Hash => u8;
			/// Feemodel of a body
			/// 0 tx only, 1 reserve, 2 transfer
			BodyConfig get(fn body_config): map hasher(blake2_128_concat) T::Hash => u8;

			/// the goode olde nonce
			Nonce: u128;

		}
	}

	//
	//
	//

	decl_module! {
		pub struct Module<T: Config> for enum Call where origin: T::Origin {

			fn deposit_event() = default;
			type Error = Error<T>;

			// Create Body
			#[weight = 10_000]
			fn create(
				origin,
				creator: T::AccountId,      // creator
				controller: T::AccountId,   // current controller
				treasury: T::AccountId,     // treasury
				name: Vec<u8>,              // body name
				cid: Vec<u8>,               // cid -> ipfs

				body: u8,                   // individual | legal body | dao
				access: u8,                 // anybody can join | only member can add | only controller can add
				model: u8,                   // only TX by OS | fees are reserved | fees are moved to treasury
				fee: T::Balance,
				currency: Vec<u8>,          // control assets to empower actors
			) -> DispatchResult {

				let creation_fee = T::CreationFee::get();

				// creator can pay fees?
				ensure!( <balances::Module<T>>::free_balance(creator.clone()) >= creation_fee, Error::<T>::BalanceTooLow );

				let now   = <system::Module<T>>::block_number();
				let index = Nonce::get();
				let state = 1;

				let phrase = name.clone();
				let hash = T::Randomness::random(&phrase);

				// create body
				let data  = Body {
					id:       hash.clone(),
					index:    index.clone(),

					creator:  creator.clone(),
					controller:    controller.clone(),
					treasury: treasury.clone(),

					name:     name.clone(),

					cid:      cid,
					body:     body.clone(),
					state:    state.clone(),
					currency: currency.clone(),

					created:  now.clone(),
					mutated:  now.clone(),
				};

				<Bodies<T>>::insert( hash.clone(), data );
				<BodyByNonce<T>>::insert( index.clone(), hash.clone() );
				<BodyState<T>>::insert( hash.clone(), state );

				<BodyCreator<T>>::insert( hash.clone(), creator.clone() );
				<BodyController<T>>::insert( hash.clone(), controller.clone() );
				<BodyTreasury<T>>::insert( hash.clone(), treasury.clone() );

				// access + fees
				<BodyAccess<T>>::insert( hash.clone(), access );
				<BodyFees<T>>::insert( hash.clone(), (model, fee) );

				// initiate member registry
				Self::add( hash.clone(), creator.clone() );
				Self::add( hash.clone(), controller.clone() );
				Self::add( hash.clone(), treasury.clone() );

				// nonce
				Nonce::mutate(|n| *n += 1);

				// dispatch event
				Self::deposit_event(
					RawEvent::BodyCreated(creator, hash, now)
				);
				Ok(())

			}

			// Add Member to Body
			#[weight = 5_000]
			fn add_member(
				origin,
				hash: T::Hash,
				account: T::AccountId,
			) {

				let sender = ensure_signed(origin)?;
				Self::add( hash.clone(), account.clone());

			}

			// Remove Member from Body
			// #[weight = 10_000]
			// fn remove_member(
			// 	origin,
			// 	hash: T::Hash,
			// 	account: T::AccountId,
			// ) {
				// TODO:
				// when fees==1 unreserve fees
			// 	let sender = ensure_signed(origin)?;
			// 	Self::remove( hash.clone(), account.clone());

			// }

			// Update State of Body
			// #[weight = 5_000]
			// fn update_state(
			// 	origin,
			// 	hash: T::Hash,
			// 	state: u8
			// ) {

			// 	let sender = ensure_root(origin)?;
			// 	Self::set_state(hash.clone(), state.clone());

			// }

		}
	}

	impl<T: Config> Module<T> {

		// fn set_state(
		// 	hash: T::Hash,
		// 	state: u8
		// ) -> DispatchResult {

		// 	<BodyState<T>>::insert( hash.clone(), state.clone() );

		// 	let now = <system::Module<T>>::block_number();
		// 	Self::deposit_event( RawEvent::BodyUpdated(hash, state, now ) );
		// 	Ok(())

		// }

		fn add(
			hash: T::Hash,
			account: T::AccountId,
		) -> DispatchResult {

			// existence
			ensure!( <Bodies<T>>::contains_key(&hash), Error::<T>::BodyUnknown );

			// TODO: access model

			let config = Self::body_config(hash);
			let model = config[0]
			let fee = config[1]

			if config.model != 0 {

				// can pay fees
				ensure!( <balances::Module<T>>::free_balance(account.clone()) >= config.fee, Error::<T>::BalanceTooLow );

				if config.model == 1 {
					// when fees==1 reserve fees until exit
					<balances::Module<T>>::reserve(&account, config.fee)?;
				} else {
					// when fees==2 send fee to treasury
					let treasury = BodyTreasury::<T>::get(hash);
					let _transfer = <balances::Module<T> as Currency<_>>::transfer(
						&account,
						&treasury,
						config.fee,
						ExistenceRequirement::AllowDeath
					);
				}

			}

			let mut members = BodyMembers::<T>::get(hash);
			let max_members = T::MaxMembersPerBody::get();
			ensure!(members.len() < max_members, Error::<T>::MembershipLimitReached);

			match members.binary_search(&account) {

				// If the search succeeds, the caller is already a member, so just return
				Ok(_) => Err(Error::<T>::MemberExists.into()),
				// If the search fails, the caller is not a member and
				// we learned the index where they should be inserted
				Err(index) => {

					members.insert(index, account.clone());
					// which is more efficient?
					// BodyMembers::<T>::mutate( &hash, |members| members.push(account.clone()) );
					BodyMembers::<T>::insert( &hash, members );

					let now = <system::Module<T>>::block_number();
					Self::deposit_event(
						RawEvent::AddMember(hash, account, now)
					);
					Ok(())
				}

			}

		}

		// fn remove(
		// 	hash: T::Hash,
		// 	account: T::AccountId,
		// ) -> DispatchResult {

		// 	// existence
		// 	ensure!( <Bodies<T>>::contains_key(&hash), Error::<T>::BodyUnknown );


		// 	let mut members = BodyMembers::<T>::get(hash);

		// 	match members.binary_search(&account) {

		// 		Ok(index) => {
		// 			members.remove(index);
		// 			BodyMembers::<T>::insert(&hash,members);
		// 			let now = <system::Module<T>>::block_number();
		// 			Self::deposit_event(
		// 				RawEvent::RemoveMember(hash,account,now)
		// 			);
		// 			Ok(())
		// 		},

		// 		Err(_) => Err(Error::<T>::MemberUnknown.into()),

		// 	}

		// }

		// transfer control of a body
		// fn transfer(
		// 	hash: T::Hash,
		// 	account: T::AccountId
		// ) {

		// }

	}

	//
	//
	//

	decl_event! {
		pub enum Event<T> where
			<T as system::Config>::AccountId,
			<T as system::Config>::BlockNumber,
			<T as system::Config>::Hash,
		{
			BodyCreated( AccountId, Hash, BlockNumber),
			BodyUpdated( AccountId, Hash, BlockNumber),
			BodyDestroyed( AccountId, Hash, BlockNumber),
			BodyTransferred( AccountId, Hash, BlockNumber),
			AddMember( Hash, AccountId, BlockNumber),
			RemoveMember( Hash, AccountId, BlockNumber),
		}
	}

	//
	//
	//

	decl_error! {
		pub enum Error for Module<T: Config> {
			/// Body Exists
			BodyExists,
			/// Body Unknown
			BodyUnknown,
			/// Body Inactive
			BodyInactive,
			/// Guru Meditation
			GuruMeditation,
			/// Insufficient Balance to create Body
			BalanceTooLow,
			/// Member Add Overflow
			MemberAddOverflow,
			/// Membership Limit Reached
			MembershipLimitReached,
			/// Member Exists
			MemberExists,
			/// Member Unknonw
			MemberUnknown,
		}
	}

}
