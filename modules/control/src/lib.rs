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

		// treasury, fees
		// connect to individual gamedao treasury
		// to separate fee collection from net
		// type Treasury: Get<Self::AccountId>;
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
		name: Vec<u8>,           // body name
		cid: Vec<u8>,            // cid -> ipfs
		body: u8,                // individual | legal body | dao
		created: BlockNumber,
		mutated: BlockNumber,
	}

	/// Body Config
	// TODO: refactor to bits
	#[derive(Encode, Decode, Default, PartialEq, Eq)]
	#[cfg_attr(feature = "std", derive(Debug))]
	pub struct BConfig<Balance> {
		fee_model: u8,     // only TX by OS | fees are reserved | fees are moved to treasury
		fee: Balance,      // plain fee amount
		gov_asset: u8,     // gov
		pay_asset: u8,     // pay
		access: u8,        // 0 open, 1 invite by members, 2 invite by controller
		member_limit: u64, // max members allowed
	}


	//
	//	storage should be optimized to offload these maps to a graph / where more efficient
	//

	decl_storage! {
		trait Store for Module<T: Config> as Control1 {

			// general

			/// Body by hash
			Bodies get(fn body_by_hash): map hasher(blake2_128_concat) T::Hash => Body<T::Hash, T::AccountId, T::BlockNumber>;
			/// Body by Nonce
			BodyByNonce get(fn body_by_nonce): map hasher(blake2_128_concat) u128 => T::Hash;
			/// Body State
			/// 0 inactive 1 active 2 system lock 3 supervisor lock
			BodyState get(fn body_state): map hasher(blake2_128_concat) T::Hash => u8;
			/// Config -> struct
			BodyConfig get(fn body_config): map hasher(blake2_128_concat) T::Hash => BConfig<T::Balance>;

			// significant accounts

			/// Creator of a body
			BodyCreator get(fn body_creator): map hasher(blake2_128_concat) T::Hash => T::AccountId;
			/// Admin Controller of a body
			BodyController get(fn body_controller): map hasher(blake2_128_concat) T::Hash => T::AccountId;
			/// Treasury of a body
			BodyTreasury get(fn body_treasury): map hasher(blake2_128_concat) T::Hash => T::AccountId;
			/// All bodies created by account
			CreatedBodies get(fn by_creator): map hasher(blake2_128_concat) T::AccountId => Vec<T::Hash>;
			/// All bodies controlled by account
			ControlledBodies get(fn by_controller): map hasher(blake2_128_concat) T::AccountId => Vec<T::Hash>;

			/// Membership by AccountId
			Memberships get(fn memberships): map hasher(blake2_128_concat) T::AccountId => Vec<T::Hash>;

			/// Accessmodel of a body
			/// 0 open, 1 invite by members, 2 invite by controller
			BodyAccess get(fn body_access): map hasher(blake2_128_concat) T::Hash => u8;
			/// Get all members of a body
			BodyMembers get(fn body_members): map hasher(blake2_128_concat) T::Hash => Vec<T::AccountId>;
			/// Get the member count
			BodyMemberCount get(fn body_member_count): map hasher(blake2_128_concat) T::Hash => u64;
			/// Get the member state 0 inactive | 1 active | 2 pending | 3 kicked | 4 banned | 5 exited
			BodyMemberState get(fn body_member_state): map hasher(blake2_128_concat) (T::Hash, T::AccountId) => u8;

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

			// Enable Body
			#[weight = 5_000]
			fn enable(
				origin,
				hash: T::Hash,
			) -> DispatchResult {
				ensure_root(origin)?;
				<BodyState<T>>::insert( hash.clone(), 1 );
				let now = <system::Module<T>>::block_number();
				Self::deposit_event( RawEvent::BodyDisabled( hash ) );
				Ok(())
			}

			// Disable Body
			#[weight = 5_000]
			fn disable(
				origin,
				hash: T::Hash,
			) -> DispatchResult {
				ensure_root(origin)?;
				<BodyState<T>>::insert( hash.clone(), 0 );
				let now = <system::Module<T>>::block_number();
				Self::deposit_event( RawEvent::BodyDisabled( hash ) );
				Ok(())
			}

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
				fee_model: u8,              // only TX by OS | fees are reserved | fees are moved to treasury
				fee: T::Balance,
				gov_asset: u8,              // control assets to empower actors
				pay_asset: u8,
				member_limit: u64,          // max members, if 0 == no limit
			) -> DispatchResult {

				// set up fee
				let creation_fee = T::CreationFee::get();
				// creator can pay fees
				ensure!( <balances::Module<T>>::free_balance(creator.clone()) >= creation_fee, Error::<T>::BalanceTooLow );

				let now   = <system::Module<T>>::block_number();
				let index = Nonce::get();
				let state = 1; // live

				let phrase = name.clone();
				let hash = T::Randomness::random(&phrase);

				// body
				let data = Body {
					id:       hash.clone(),
					index:    index.clone(),
					creator:  creator.clone(),
					name:     name.clone(),
					cid:      cid,
					body:     body.clone(),
					created:  now.clone(),
					mutated:  now.clone(),
				};

				Bodies::<T>::insert( hash.clone(), data );

				let config = BConfig {
					fee_model: fee_model.clone(),
					fee: fee.clone(),
					gov_asset: gov_asset.clone(),
					pay_asset: pay_asset.clone(),
					member_limit: member_limit.clone(),
					access: access.clone()
				};

				// TODO: Self::update_config
				BodyConfig::<T>::insert( hash.clone(), config );

				//

				BodyByNonce::<T>::insert( index.clone(), hash.clone() );
				BodyState::<T>::insert( hash.clone(), state );
				BodyAccess::<T>::insert( hash.clone(), access.clone() );
				BodyCreator::<T>::insert( hash.clone(), creator.clone() );
				BodyController::<T>::insert( hash.clone(), controller.clone() );
				BodyTreasury::<T>::insert( hash.clone(), treasury.clone() );

				let mut controlled = Self::by_controller(&controller);
				controlled.push(hash.clone());
				ControlledBodies::<T>::mutate(
					&controller,
					|controlled| controlled.push(hash.clone())
				);

				let mut created = Self::by_creator(&creator);
				created.push(hash.clone());
				ControlledBodies::<T>::mutate(
					&creator,
					|created| created.push(hash.clone())
				);

				// ...creator, controller and treasury shall be members

				// initiate member registry -> consumes fees
				Self::add( hash.clone(), creator.clone() );
				// Err(hash) => TransactionType::None
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
				account: T::AccountId
			) -> DispatchResult {

				let caller = ensure_signed(origin)?;
				Self::add( hash.clone(), account.clone() );

				let now = <system::Module<T>>::block_number();
				Self::deposit_event(
					RawEvent::AddMember(hash, account, now)
				);
				Ok(())


			}

			// Remove Member from Body
			#[weight = 10_000]
			fn remove_member(
				origin,
				hash: T::Hash,
				account: T::AccountId,
			) {
				// TODO:
				// when fees==1 unreserve fees
			// 	let sender = ensure_signed(origin)?;
			// 	Self::remove( hash.clone(), account.clone());

			}

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

			#[weight = 5_000]
			fn check_membership(
				origin,
				hash: T::Hash
			) -> DispatchResult {

				let caller = ensure_signed(origin)?;
				let members = BodyMembers::<T>::get(hash);
				ensure!(members.contains(&caller), Error::<T>::MemberUnknown);
				// Self::deposit_event();
				Self::deposit_event(
					RawEvent::IsAMember(hash,caller)
				);
				Ok(())
			}

		// /// Set controller. Must be a current member.
		// ///
		// /// May only be called from `T::PrimeOrigin`.
		// #[weight = 50_000_000]
		// pub fn set_control(origin, who: T::AccountId) {
		// 	T::PrimeOrigin::ensure_origin(origin)?;
		// 	Self::members().binary_search(&who).ok().ok_or(Error::<T, I>::NotMember)?;
		// 	Prime::<T, I>::put(&who);
		// 	T::MembershipChanged::set_prime(Some(who));
		// }

		// /// Remove the prime member if it exists.
		// ///
		// /// May only be called from `T::PrimeOrigin`.
		// #[weight = 50_000_000]
		// pub fn clear_control(origin) {
		// 	T::PrimeOrigin::ensure_origin(origin)?;
		// 	Prime::<T, I>::kill();
		// 	T::MembershipChanged::set_prime(None);
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

		fn set_member_state(
			hash: T::Hash,
			account: T::AccountId,
			state: u8
		) -> DispatchResult {

			ensure!( <Bodies<T>>::contains_key(&hash), Error::<T>::BodyUnknown );
			let config = Self::body_config(hash);
			let current_state = Self::body_member_state(( &hash, &account ));
			let new_state = match config.access {
				0 => state, // when open use desired state
				_ => 2, // else pending
			};

			Ok(())

		}

		fn add(
			hash: T::Hash,
			account: T::AccountId
		) -> DispatchResult {

			// 1. body exists

			ensure!( <Bodies<T>>::contains_key(&hash), Error::<T>::BodyUnknown );

			// 2. member limit

			let mut members = BodyMembers::<T>::get(hash);
			let max_members = T::MaxMembersPerBody::get();
			ensure!(members.len() < max_members, Error::<T>::MembershipLimitReached);

			// 3. initial state

			let config = Self::body_config(hash);
			let state = match config.access {
				0 => 1, // active
				_ => 2, // pending
 			};

 			// 4. apply fees

			if config.fee_model != 0 {

				let fee = config.fee;
				ensure!( <balances::Module<T>>::free_balance(account.clone()) >= fee, Error::<T>::BalanceTooLow );

				// when fees==1 reserve fees until exit
				if config.fee_model == 1 {
					<balances::Module<T>>::reserve(&account, config.fee)?;
				}
				// when fees==2 send fee to treasury
				else {
					let treasury = BodyTreasury::<T>::get(hash);
					let transfer = <balances::Module<T> as Currency<_>>::transfer(
						&account,
						&treasury,
						config.fee,
						ExistenceRequirement::AllowDeath
					);
				}

			}

			// 5. add

			match members.binary_search(&account) {

				// already a member, return
				Ok(_) => Err(Error::<T>::MemberExists.into()),

				// not a member, insert at index
				Err(index) => {

					members.insert(index, account.clone());
					// BodyMembers::<T>::mutate( &hash, |members| members.push(account.clone()) );
					BodyMembers::<T>::insert( &hash, members.clone() );

					// counter
					let count = members.len();
					BodyMemberCount::<T>::insert( &hash, count as u64 );

					let mut memberships = Self::memberships(&account);
					memberships.push( hash.clone() );
					Memberships::<T>::insert( &account, memberships );

					// state
					BodyMemberState::<T>::insert(( hash, account ), state);

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
			BodyDisabled( Hash ),
			BodyTransferred( AccountId, Hash, BlockNumber),
			AddMember( Hash, AccountId, BlockNumber),
			RemoveMember( Hash, AccountId, BlockNumber),
			UpdateMember( Hash, AccountId, BlockNumber),
			IsAMember( Hash, AccountId),
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
			/// Unknown Error
			UnknownError
		}
	}

}
