//      _______  ________  ________  ________   ______   _______   _______
//    ╱╱       ╲╱        ╲╱        ╲╱        ╲_╱      ╲╲╱       ╲╲╱       ╲╲
//   ╱╱      __╱         ╱         ╱         ╱        ╱╱        ╱╱        ╱╱
//  ╱       ╱ ╱         ╱         ╱        _╱         ╱         ╱         ╱
//  ╲________╱╲___╱____╱╲__╱__╱__╱╲________╱╲________╱╲___╱____╱╲________╱
//
// This file is part of GameDAO Protocol.
// Copyright (C) 2018-2022 GameDAO AG.
// SPDX-License-Identifier: Apache-2.0

//! CONTROL
//! Create and manage DAO like organizations.

// #![warn(unused_imports)]
#![allow(clippy::unused_unit)]
#![allow(dead_code)]
#![allow(unused_variables)]

#![cfg_attr(not(feature = "std"), no_std)]
#![feature(derive_default_enum)]
pub use pallet::*;
// TODO:
// mod default_weight;
// mod mock;
// mod tests;

use frame_support::{
	ensure,
	codec::{ Decode, Encode },
	dispatch::DispatchResult,
	traits::{ Randomness, UnixTime, Get },
};
use scale_info::TypeInfo;
use sp_std::{ fmt::Debug, vec::Vec };
// use pallet_balances::{ self as balances };
use orml_traits::{ MultiCurrency, MultiReservableCurrency };
use primitives::{ Balance, CurrencyId, BlockNumber };

//
//
//	structs
//
//

#[derive(Encode, Decode, PartialEq, Clone, Eq, PartialOrd, Ord, TypeInfo)]
#[repr(u8)]
#[derive(Debug)]
pub enum OrgType {
	Individual = 0,
	Company = 1,
	Dao = 2,
	Hybrid = 3,
}
impl Default for OrgType {
	fn default() -> Self {
		Self::Individual
	}
}

#[derive(Encode, Decode, PartialEq, Clone, Eq, PartialOrd, Ord, TypeInfo, Default)]
#[repr(u8)]
pub enum State {
#[default]
	Inactive = 0,
	Active = 1,
	Locked = 2,
}

#[derive(Encode, Decode, PartialEq, Clone, Eq, PartialOrd, Ord, TypeInfo, Default)]
#[repr(u8)]
pub enum MemberState {
#[default]
	Inactive = 0, // eg inactive after threshold period
	Active = 1,   // active
	Pending = 2,  // application voting pending
	Kicked = 3,
	Banned = 4,
	Exited = 5,
}

#[derive(Encode, Decode, Clone, PartialEq, Eq, PartialOrd, Ord, TypeInfo, Default)]
#[repr(u8)]
#[derive(Debug)]
pub enum FeeModel {
#[default]
	NoFees = 0,		// feeless
	Reserve = 1,	// amount is reserved in user account
	Transfer = 2,	// amount is transfered to Org treasury
}

#[derive(Encode, Decode, Clone, PartialEq, Eq, PartialOrd, Ord, TypeInfo, Default)]
#[repr(u8)]
#[derive(Debug)]
pub enum AccessModel {
#[default]
	Open = 0,		// anyDAO can join
	Voting = 1,		// application creates membership voting
	Controller = 2,	// controller invites
}

/// Organization
#[derive(Encode, Decode, PartialEq, Eq, TypeInfo)]
#[cfg_attr(feature = "std", derive(Debug))]
pub struct Org<Hash, AccountId, BlockNumber, OrgType> {
	/// Org Hash
	id: Hash,
	/// Org global index
	index: u64,
	/// Org Creator
	creator: AccountId,
	/// Org Name
	name: Vec<u8>,
	/// IPFS Hash
	cid: Vec<u8>,
	/// Organization Type
	org_type: OrgType,
	/// Creation Block
	created: BlockNumber,
	/// Last Mutation Block
	mutated: BlockNumber,
}

/// Organization Config
// TODO: refactor to bit flags
#[derive(Encode, Decode, PartialEq, Eq, TypeInfo)]
#[cfg_attr(feature = "std", derive(Debug))]
pub struct OrgConfig<Balance, FeeModel, AccessModel> {
	/// Fee Model: TX only | Reserve | Transfer
	fee_model: FeeModel,
	/// Fee amount
	fee: Balance,
	/// Governance Asset
	gov_asset: u8,
	/// Payment Asset
	pay_asset: u8,
	/// Access Model
	access: AccessModel,
	/// Max Member Limit
	member_limit: u64,
}

//
//
//	Pallet
//
//

#[frame_support::pallet]
pub mod pallet {

	use super::*;
	use frame_support::pallet_prelude::*;
	use frame_system::pallet_prelude::*;

	#[pallet::pallet]
	#[pallet::generate_store(pub(super) trait Store)]
	pub struct Pallet<T>(_);

	//
	//	Pallet Config
	//

	#[pallet::config]
	pub trait Config: frame_system::Config {

		type WeightInfo: frame_system::weights::WeightInfo;
		type Event: From<Event<Self>>
			+ IsType<<Self as frame_system::Config>::Event>
			+ Into<<Self as frame_system::Config>::Event>;
		type Currency: MultiCurrency<Self::AccountId, CurrencyId = CurrencyId, Balance = Balance>
			+ MultiReservableCurrency<Self::AccountId>;
		type UnixTime: UnixTime;
		type Randomness: Randomness<Self::Hash, Self::BlockNumber>;

		type GameDAOAdminOrigin: EnsureOrigin<Self::Origin>;
		type GameDAOTreasury: Get<Self::AccountId>;

		type ForceOrigin: EnsureOrigin<Self::Origin>;

		#[pallet::constant]
		type MaxDAOsPerAccount: Get<u32>;
		#[pallet::constant]
		type MaxMembersPerDAO: Get<u32>;
		#[pallet::constant]
		type MaxCreationsPerBlock: Get<u32>;

		#[pallet::constant]
		type NetworkCurrencyId: Get<CurrencyId>;
		#[pallet::constant]
		type FundingCurrencyId: Get<CurrencyId>;
		#[pallet::constant]
		type DepositCurrencyId: Get<CurrencyId>;

		#[pallet::constant]
		type CreationFee: Get<Balance>;

	}

	//
	//	Pallet Storage
	//

	/// Get an Org by its hash
	#[pallet::storage]
	#[pallet::getter(fn org_by_hash )]
	pub(super) type OrgByHash<T: Config> =
		StorageMap <_, Blake2_128Concat, T::Hash, Org<T::Hash, T::AccountId, BlockNumber, OrgType>>;

	/// Get an Org by its nonce
	#[pallet::storage]
	#[pallet::getter(fn org_by_nonce )]
	pub(super) type OrgByNonce<T: Config> =
		StorageMap <_, Blake2_128Concat, u64, T::Hash>;

	/// Org settings
	#[pallet::storage]
	#[pallet::getter(fn org_configuration )]
	pub(super) type OrgConfiguration<T: Config> =
		StorageMap <_, Blake2_128Concat, T::Hash, OrgConfig<Balance, FeeModel, AccessModel>, OptionQuery>;

	/// Global Org State
	#[pallet::storage]
	#[pallet::getter(fn org_state )]
	pub(super) type OrgState<T: Config> =
		StorageMap <_, Blake2_128Concat, T::Hash, State, OptionQuery>;

	/// Access model
	#[pallet::storage]
	#[pallet::getter(fn org_access )]
	pub(super) type OrgAccess<T: Config> =
		StorageMap <_, Blake2_128Concat, T::Hash, AccessModel, ValueQuery>;

	/// Members of a Org
	#[pallet::storage]
	#[pallet::getter(fn org_members )]
	pub(super) type OrgMembers<T: Config> =
		StorageMap <_, Blake2_128Concat, T::Hash, Vec<T::AccountId>, ValueQuery>;

	/// Membercount of a Org
	#[pallet::storage]
	#[pallet::getter(fn org_member_count )]
	pub(super) type OrgMemberCount<T: Config> =
		StorageMap <_, Blake2_128Concat, T::Hash, u64, ValueQuery>;

	/// Member state for a Org
	#[pallet::storage]
	#[pallet::getter(fn org_member_state )]
	pub(super) type OrgMemberState<T: Config> =
		StorageMap <_, Blake2_128Concat, (T::Hash, T::AccountId), MemberState, ValueQuery>;

	/// Memberships by AccountId
	#[pallet::storage]
	#[pallet::getter(fn memberships )]
	pub(super) type Memberships<T: Config> =
		StorageMap <_, Blake2_128Concat, T::AccountId, Vec<T::Hash>, ValueQuery>;

	/// Creator of an Org
	#[pallet::storage]
	#[pallet::getter(fn org_creator )]
	pub(super) type OrgCreator<T: Config> =
		StorageMap <_, Blake2_128Concat, T::Hash, T::AccountId, ValueQuery>;

	/// Controller of an Org
	#[pallet::storage]
	#[pallet::getter(fn org_controller )]
	pub(super) type OrgController<T: Config> =
		StorageMap <_, Blake2_128Concat, T::Hash, T::AccountId, ValueQuery>;

	/// Treasury of an Org
	#[pallet::storage]
	#[pallet::getter(fn org_treasury )]
	pub(super) type OrgTreasury<T: Config> =
		StorageMap <_, Blake2_128Concat, T::Hash, T::AccountId, ValueQuery>;

	/// Orgs created by account
	#[pallet::storage]
	#[pallet::getter(fn orgs_created )]
	pub(super) type OrgsCreated<T: Config> =
		StorageMap <_, Blake2_128Concat, T::AccountId, Vec<T::Hash>, ValueQuery>;

	/// Number of Orgs created by account
	#[pallet::storage]
	#[pallet::getter(fn orgs_created_count )]
	pub(super) type OrgsByCreatedCount<T: Config> =
		StorageMap <_, Blake2_128Concat, T::AccountId, u64, ValueQuery>;

	/// Orgs controlled by account
	#[pallet::storage]
	#[pallet::getter(fn orgs_controlled )]
	pub(super) type OrgsControlled<T: Config> =
		StorageMap <_, Blake2_128Concat, T::AccountId, Vec<T::Hash>, ValueQuery>;

	/// Number of Orgs controlled by account
	#[pallet::storage]
	#[pallet::getter(fn orgs_controlled_count )]
	pub(super) type OrgsControlledCount<T: Config> =
		StorageMap <_, Blake2_128Concat, T::AccountId, u64, ValueQuery>;

	/// the goode olde nonce
	#[pallet::storage]
	#[pallet::getter(fn nonce)]
	pub(super) type Nonce<T: Config> = StorageValue<_, u64, ValueQuery>;

	//
	//	Pallet Events
	//

	#[pallet::event]
	#[pallet::generate_deposit(pub(super) fn deposit_event)]
	pub enum Event<T: Config> {
		OrgCreated( T::AccountId, T::Hash, T::BlockNumber, u64),
		OrgUpdated( T::AccountId, T::Hash, T::BlockNumber),
		OrgEnabled( T::Hash ),
		OrgDisabled( T::Hash ),
		//
		AddMember( T::Hash, T::AccountId, T::BlockNumber),
		UpdateMember( T::Hash, T::AccountId, T::BlockNumber),
		RemoveMember( T::Hash, T::AccountId, T::BlockNumber),
		//
		ControllerUpdated( T::Hash, T::AccountId ),
		//
		IsAMember( T::Hash, T::AccountId),
		Message(Vec<u8>),
	}

	//
	//	Pallet Errors
	//

	#[pallet::error]
	pub enum Error<T> {
		/// Org Exists
		OrganizationExists,
		/// Org Unknown
		OrganizationUnknown,
		/// Org Inactive
		OrganizationInactive,
		/// Insufficient Balance to create Org
		BalanceTooLow,
		/// Member Add Overflow
		MemberAddOverflow,
		/// Membership Limit Reached
		MembershipLimitReached,
		/// Member Exists
		MemberExists,
		/// Member Unknonw
		MemberUnknown,
		/// Duplicate Address
		DuplicateAddress,
		/// Unknown Error
		UnknownError,
		/// Guru Meditation
		GuruMeditation,
	}

	//
	//
	//	Pallet Hooks
	//
	//

	#[pallet::hooks]
	impl<T: Config> Hooks<BlockNumberFor<T>> for Pallet<T> {

		/// Block finalization
		fn on_finalize(_n: BlockNumberFor<T>) {
		}

	}

	//
	//	Pallet Functions
	//

	#[pallet::call]
	impl<T: Config> Pallet<T> {

		// Enable Org
		// currently root, layer supervisor
		// enables an org to be used
		// hash: an organisations hash
		#[pallet::weight(1_000_000)]
		pub fn enable(
			origin: OriginFor<T>,
			hash: T::Hash,
		) -> DispatchResult {
			ensure_root(origin)?;
			OrgState::<T>::insert( hash.clone(), State::Active );
			Self::deposit_event( Event::OrgEnabled( hash ) );
			Ok(())
		}

		// Disable Org
		// currently root, layer supervisor
		// disables an org to be used
		// hash: an organisations hash
		#[pallet::weight(1_000_000)]
		pub fn disable(
			origin: OriginFor<T>,
			hash: T::Hash,
		) -> DispatchResult {
			ensure_root(origin)?;
			OrgState::<T>::insert( hash.clone(), State::Inactive );
			Self::deposit_event( Event::OrgDisabled( hash ) );
			Ok(())
		}

		// Create Org
		// create an on chain organisation
		// creator: T::AccountId,      // creator
		// controller: T::AccountId,   // current controller
		// treasury: T::AccountId,     // treasury
		// name: Vec<u8>,              // Org name
		// cid: Vec<u8>,               // cid -> ipfs
		// Org: u8,                   // individual | legal Org | dao
		// access: u8,                 // anyDAO can join | only member can add | only controller can add
		// fee_model: u8,              // only TX by OS | fees are reserved | fees are moved to treasury
		// fee: T::Balance,
		// gov_asset: u8,              // control assets to empower actors
		// pay_asset: u8,
		// member_limit: u64,          // max members, if 0 == no limit
		// // mint: T::Balance,		// cost to mint
		// // burn: T::Balance,		// cost to burn
		// // strategy: u16,
		#[pallet::weight(5_000_000)]
		pub fn create(
			origin: OriginFor<T>,
			controller: T::AccountId,
			treasury: T::AccountId,
			name: Vec<u8>,
			cid: Vec<u8>,
			org_type: OrgType,
			access: AccessModel,
			fee_model: FeeModel,
			fee: Balance,
			gov_asset: u8,
			pay_asset: u8,
			member_limit: u64,
			// mint: T::Balance,
			// burn: T::Balance,
			// strategy: u16,
		) -> DispatchResult {

			let sender = ensure_signed(origin)?;

			let creation_fee = T::CreationFee::get();
			let free_balance = T::Currency::free_balance(
				T::DepositCurrencyId::get(),
				&sender
			);
			ensure!( free_balance > creation_fee, Error::<T>::BalanceTooLow );

			let free_balance_treasury = T::Currency::free_balance(
				T::DepositCurrencyId::get(),
				&treasury
			);
			ensure!( free_balance_treasury > creation_fee, Error::<T>::BalanceTooLow );

			// controller and treasury must not be equal
			ensure!(&controller != &treasury, Error::<T>::DuplicateAddress );

			let hash = T::Randomness::random(&name);
			let index = Nonce::<T>::get();
			let now   = <frame_system::Pallet<T>>::block_number();
			let state = State::Active;

			let new_org = Org {
				id: hash.clone(),
				index: index.clone(),
				creator: sender.clone(),
				name: name.clone(),
				cid: cid,
				org_type: org_type.clone(),
				created: now.clone(),
				mutated: now.clone(),
			};

			// membership fees
			let mut _fee = fee;
			match &fee_model {
				FeeModel::Reserve => { _fee = fee },
				FeeModel::Transfer => { _fee = fee },
				_ => { }
			};

			let new_org_config = OrgConfig {
				fee_model: fee_model.clone(),
				fee: _fee.clone(),
				gov_asset: gov_asset.clone(),
				pay_asset: pay_asset.clone(),
				member_limit: member_limit.clone(),
				access: access.clone()
			};

			// OrgByHash::<T>::insert( hash.clone(), new_org );
			// OrgConfiguration::<T>::insert( hash.clone(), org_config );

			// OrgByNonce::<T>::insert( index.clone(), hash.clone() );
			// OrgAccess::<T>::insert( hash.clone(), access.clone() );
			// OrgCreator::<T>::insert( hash.clone(), sender.clone() );
			// OrgController::<T>::insert( hash.clone(), controller.clone() );
			// OrgTreasury::<T>::insert( hash.clone(), treasury.clone() );
			// OrgState::<T>::insert( hash.clone(), state );

			// let mut controlled = Self::by_controller(&controller);
			// controlled.push(hash.clone());
			// OrgsControlled::<T>::mutate(
			// 	&controller,
			// 	|controlled| controlled.push(hash.clone())
			// );

			// // TODO: this needs a separate add / removal function
			// // whenever the controller of an organisation changes!
			// OrgsControlledCount::<T>::mutate(
			// 	&controller,
			// 	|controlled_count| *controlled_count += 1
			// );


			// let mut created = Self::by_creator(sender.clone());
			// created.push(hash.clone());
			// OrgssControlled::<T>::mutate(
			// 	&sender,
			// 	|created| created.push(hash.clone())
			// );

			// initiate member registry -> consumes fees
			// creator and controller can be equal
			// controller and treasury cannot be equal
			// match Self::add( &hash, creator.clone() ) {
			// 		Ok(_) => {},
			// 		Err(err) => { panic!("{err}") }
			// };
			// match Self::add( hash.clone(), controller.clone() ) {
			// 		Ok(_) => {},
			// 		Err(err) => { panic!("{err}") }
			// };
			// match Self::add( hash.clone(), treasury.clone() ) {
			// 		Ok(_) => {},
			// 		Err(err) => { panic!("{err}") }
			// };

			// generate nft realm
			// generate nft realm
			// generate nft realm

			// // get the current realm index
			// let current_realm_index = tangram::NextRealmIndex::get();

			// // every org receives a token realm by default
			// let realm = tangram::Pallet::<T>::create_realm(origin.clone(), hash.clone());
			// let realm = match realm {
			// 		Ok(_) => {},
			// 		Err(err) => { return Err(err) }
			// };

			// // get current class index
			// let current_class_index = tangram::NextClassIndex::get(current_realm_index);

			// // generate a class name
			// let name:Vec<u8> = b"game".to_vec();
			// // every org receives a token class for collectables by default
			// let max = 1000; // TODO: externalise max
			// let class = tangram::Pallet::<T>::create_class(
			// 	origin.clone(),
			// 	current_realm_index.clone(),
			// 	name,
			// 	max,
			// 	// mint,
			// 	// burn,
			// 	strategy
			// );
			// let class = match class {
			// 		Ok(_) => {},
			// 		Err(err) => { return Err(err) }
			// };

			// // get the next realm index...
			// let next_realm_index = tangram::NextRealmIndex::get();


			// disabled due to weight overload
			// disabled due to weight overload
			// disabled due to weight overload

			// mint an item for creator
			// let item_name:Vec<u8> = b"creator".to_vec();
			// let item_cid:Vec<u8> = b"0".to_vec();

			// let item = tangram::Pallet::<T>::create_item(
			// 	origin.clone(),
			// 	current_realm_index,
			// 	current_class_index,
			// 	item_name,
			// 	item_cid,
			// 	creator.clone()
			// );
			// let item = match item {
			// 		Ok(_) => {},
			// 		Err(err) => { return Err(err) }
			// };

			// mint an item for controller
			// let ctrl_item_name:Vec<u8> = b"controller".to_vec();
			// let ctrl_item_cid:Vec<u8> = b"1".to_vec();

			// let ctrl_item = tangram::Pallet::<T>::create_item(
			// 	origin.clone(),
			// 	current_realm_index,
			// 	current_class_index,
			// 	ctrl_item_name,
			// 	ctrl_item_cid,
			// 	controller.clone()
			// );
			// let ctrl_item = match ctrl_item {
			// 		Ok(_) => {},
			// 		Err(err) => { return Err(err) }
			// };

			// pay tribute
			// let balance = <balances::Pallet<T>>::free_balance(&sender);
			// let dao_fee = _fee.checked_mul(0.25);

			let transfer = T::Currency::transfer(
				T::FundingCurrencyId::get(),
				&sender,
				&T::GameDAOTreasury::get(),
				creation_fee
			);

			// nonce
			Nonce::<T>::mutate(|n| *n += 1);

			// dispatch event
			// Self::deposit_event(
			// 	Event::OrgCreated(sender, &hash, now, 0 )
			// );
			Ok(())

		}

		// Add Member to Org
		#[pallet::weight(1_000_000)]
		pub fn add_member(
			origin: OriginFor<T>,
			hash: T::Hash,
			account: T::AccountId
		) -> DispatchResult {

			// let caller = ensure_signed(origin)?;
			// // TODO: ensure not a member yet
			// let add = Self::add( hash.clone(), account.clone() );
			// let add = match add {
			// 		Ok(_) => {},
			// 		Err(err) => { return Err(err) }
			// };

			// let now = <frame_system::Pallet<T>>::block_number();
			// Self::deposit_event(
			// 	Event::AddMember( hash, account, now )
			// );

			Ok(())

		}

		// Remove Member from Org
		#[pallet::weight(1_000_000)]
		pub fn remove_member(
			origin: OriginFor<T>,
			hash: T::Hash,
			account: T::AccountId,
		) -> DispatchResult {

			// TODO:
			// when fees==1 unreserve fees
			// let caller = ensure_signed(origin)?;
			// let remove = Self::remove( hash.clone(), account.clone());
			// let remove = match remove {
			// 		Ok(_) => {},
			// 		Err(err) => { return Err(err) }
			// };
			// let now = <frame_system::Pallet<T>>::block_number();
			// Self::deposit_event(
			// 	Event::RemoveMember( hash, account, now )
			// );
			Ok(())

		}

		// Update State of Org
		// #[weight = 5_000]
		// fn update_state(
		// 	origin: OriginFor<T>,
		// 	hash: T::Hash,
		// 	state: u8
		// ) {

		// 	let sender = ensure_root(origin)?;
		// 	Self::set_state(hash.clone(), state.clone());

		// }

		#[pallet::weight(1_000_000)]
		pub fn check_membership(
			origin: OriginFor<T>,
			hash: T::Hash
		) -> DispatchResult {

			// let caller = ensure_signed(origin)?;
			// let members = OrgMembers::<T>::get(hash);
			// ensure!(members.contains(&caller), Error::<T>::MemberUnknown);
			// Self::deposit_event(
			// 	Event::IsAMember(hash,caller)
			// );
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

//
//
//	Pallet Private Functions
//
//

impl<T: Config> Pallet<T> {

	// fn set_state(
	// 	hash: T::Hash,
	// 	state: u8
	// ) -> DispatchResult {

	// 	<DAOState<T>>::insert( hash.clone(), state.clone() );

	// 	let now = <frame_system::Pallet<T>>::block_number();
	// 	Self::deposit_event( Event::DAOUpdated(hash, state, now ) );
	// 	Ok(())

	// }

	fn set_member_state(
		hash: T::Hash,
		account: T::AccountId,
		member_state: MemberState
	) -> DispatchResult {

		// ensure!( OrgByHash::<T>::contains_key(&hash), Error::<T>::DAOUnknown );
		// let config = Self::org_configuration(hash);
		// let current_state = Self::org_member_state(( &hash, &account ));
		// let new_state = match config.access {
		// 	AccessModel::Open => member_state, // when open use desired state
		// 	_ => MemberState::Pending, // else pending
		// };

		Ok(())

	}

	fn add(
		hash: T::Hash,
		account: T::AccountId
	) -> DispatchResult {

		// ensure!( OrgByHash::<T>::contains_key(&hash), Error::<T>::OrgUnknown );

		// let mut members = Self::dao_members::get(hash);
		// let max_members = T::MaxMembersPerDAO::get();
		// ensure!(members.len() < max_members, Error::<T>::MembershipLimitReached);

		// let config = Self::dao_configuration(hash);
		// let state = match config.access {
		// 	AccessModel::Open => MemberState::Active, // active
		// 	_ => MemberState::Pending, // pending
		// };

		// let fee = config.fee;
		// // TODO: orml currency
		// // ensure!( <balances::Pallet<T>>::free_balance(account.clone()) >= fee, Error::<T>::BalanceTooLow );

		// match &config.fee_model {

		// 	// no fees
		// 	FeeModel::NoFees => {
		// 	},
		// 	// reserve
		// 	FeeModel::Reserve => {
		// 		// TODO: orml currency
		// 		<balances::Pallet<T>>::reserve(&account, config.fee)?;
		// 	},
		// 	// transfer to treasury
		// 	FeeModel::Transfer => {
		// 		let treasury = OrgTreasury::<T>::get(hash);
		// 		// TODO: orml currency
		// 		let transfer = T::Currency::transfer(
		// 			&account,
		// 			&treasury,
		// 			config.fee,
		// 		);
		// 	}
		// 	_ => {}
		// }

		// // 5. add

		// match members.binary_search(&account) {

		// 	// already a member, return
		// 	Ok(_) => Err(Error::<T>::MemberExists.into()),

		// 	// not a member, insert at index
		// 	Err(index) => {

		// 		members.insert(index, account.clone());
		// 		// OrgMembers::<T>::mutate( &hash, |members| members.push(account.clone()) );
		// 		OrgMembers::<T>::insert( &hash, members.clone() );

		// 		// counter
		// 		let count = members.len();
		// 		OrgMemberCount::<T>::insert( &hash, count as u64 );

		// 		let mut memberships = Self::memberships(&account);
		// 		memberships.push( hash.clone() );
		// 		Memberships::<T>::insert( &account, memberships );

		// 		// state
		// 		MemberState::<T>::insert(( hash.clone(), account.clone() ), state);


				Ok(())
		// 	}

		// }

	}

	fn remove(
		hash: T::Hash,
		account: T::AccountId,
	) -> DispatchResult {

		// // existence
		// ensure!( Self::DAO::contains_key(&hash), Error::<T>::OrgUnknown );

		// let mut members = OrgMembers::<T>::get(hash);
		// match members.binary_search(&account) {

		// 	Ok(index) => {

		// 		// remove member from Org
		// 		members.remove(index);
		// 		OrgMembers::<T>::insert(&hash,members.clone());

		// 		// remove Org from member's Orgs
		// 		let mut memberships = Self::memberships(&account);
		// 		match memberships.binary_search(&hash) {
		// 			Ok(index) => {
		// 				memberships.remove(index);
		// 				Memberships::<T>::insert( &account, memberships );
		// 			},
		// 			Err(_) => {},
		// 		}

		// 		// unreserve?
		// 		let config = Self::DAO_config(hash);
		// 		if config.fee_model == FeeModel::Reserve {
		// 			<balances::Pallet<T>>::unreserve( &account, config.fee );
		// 		}

		// 		// counter --
		// 		let count = members.len();
		// 		OrgMemberCount::<T>::insert( &hash, count as u64 );

		// 		// member state
		// 		OrgMemberState::<T>::insert(( hash.clone(), account.clone() ), OrgMemberState::Inactive);


				Ok(())
		// 	},

		// 	Err(_) => Err(Error::<T>::MemberUnknown.into()),

		// }

	}

	// transfer control of a Org
	fn transfer(
		hash: T::Hash,
		account: T::AccountId
	) {

	}

}

