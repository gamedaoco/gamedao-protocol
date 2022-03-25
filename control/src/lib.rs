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

#![cfg_attr(not(feature = "std"), no_std)]
pub mod types;
pub use types::*;

mod mock;
mod tests;
// #[cfg(feature = "runtime-benchmarks")]
// mod benchmarking;

use codec::HasCompact;
use frame_support::{
	codec::{Encode},
	dispatch::DispatchResult,
	ensure,
	traits::{Get, Randomness},
};
use gamedao_traits::ControlTrait;
use orml_traits::{MultiCurrency, MultiReservableCurrency};
use scale_info::TypeInfo;
use sp_runtime::traits::AtLeast32BitUnsigned;
use sp_std::{fmt::Debug, vec::Vec};

pub use pallet::*;

#[frame_support::pallet]
pub mod pallet {
	use super::*;
	use frame_support::pallet_prelude::*;
	use frame_system::pallet_prelude::*;

	#[pallet::pallet]
	#[pallet::generate_store(pub(super) trait Store)]
	pub struct Pallet<T>(_);

	#[pallet::config]
	pub trait Config: frame_system::Config {
		type Balance: Member
			+ Parameter
			+ AtLeast32BitUnsigned
			+ Default
			+ Copy
			+ MaybeSerializeDeserialize
			+ MaxEncodedLen
			+ TypeInfo;

		type CurrencyId: Member
			+ Parameter
			+ Default
			+ Copy
			+ HasCompact
			+ MaybeSerializeDeserialize
			+ MaxEncodedLen
			+ TypeInfo;

		type ForceOrigin: EnsureOrigin<Self::Origin>;
		type WeightInfo: frame_system::weights::WeightInfo;
		type Event: From<Event<Self>>
			+ IsType<<Self as frame_system::Config>::Event>
			+ Into<<Self as frame_system::Config>::Event>;
		type Currency: MultiCurrency<Self::AccountId, CurrencyId = Self::CurrencyId, Balance = Self::Balance>
			+ MultiReservableCurrency<Self::AccountId>;
		// type UnixTime: UnixTime;
		type Randomness: Randomness<Self::Hash, Self::BlockNumber>;

		// type GameDAOAdminOrigin: EnsureOrigin<Self::Origin>;
		type GameDAOTreasury: Get<Self::AccountId>;

		#[pallet::constant]
		type MaxDAOsPerAccount: Get<u32>;
		#[pallet::constant]
		type MaxMembersPerDAO: Get<u32>;
		#[pallet::constant]
		type MaxCreationsPerBlock: Get<u32>;

		#[pallet::constant]
		type ProtocolTokenId: Get<Self::CurrencyId>;
		#[pallet::constant]
		type PaymentTokenId: Get<Self::CurrencyId>;

		#[pallet::constant]
		type CreationFee: Get<Self::Balance>;
	}

	/// Get an Org by its hash
	#[pallet::storage]
	pub(super) type Orgs<T: Config> =
		StorageMap<_, Blake2_128Concat, T::Hash, Org<T::Hash, T::AccountId, T::BlockNumber>, ValueQuery>;

	/// Get an Org by its nonce
	#[pallet::storage]
	pub(super) type OrgByNonce<T: Config> = StorageMap<_, Blake2_128Concat, u128, T::Hash>;

	/// Org settings
	#[pallet::storage]
	pub(super) type OrgConfiguration<T: Config> =
		StorageMap<_, Blake2_128Concat, T::Hash, OrgConfig<T::Balance>, OptionQuery>;

	/// Global Org State
	#[pallet::storage]
	pub(super) type OrgState<T: Config> =
		StorageMap<_, Blake2_128Concat, T::Hash, ControlState, ValueQuery, GetDefault>;

	/// Access model
	#[pallet::storage]
	pub(super) type OrgAccess<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, AccessModel, ValueQuery>;

	/// Members of a Org
	#[pallet::storage]
	pub(super) type OrgMembers<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, Vec<T::AccountId>, ValueQuery>;

	/// Membercount of a Org
	#[pallet::storage]
	pub(super) type OrgMemberCount<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, u64, ValueQuery>;

	/// Member state for a Org
	#[pallet::storage]
	pub(super) type OrgMemberState<T: Config> =
		StorageMap<_, Blake2_128Concat, (T::Hash, T::AccountId), ControlMemberState, ValueQuery, GetDefault>;

	/// Memberships by AccountId
	#[pallet::storage]
	pub(super) type Memberships<T: Config> = StorageMap<_, Blake2_128Concat, T::AccountId, Vec<T::Hash>, ValueQuery>;

	/// Creator of an Org
	#[pallet::storage]
	pub(super) type OrgCreator<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, T::AccountId, ValueQuery>;

	/// Controller of an Org
	#[pallet::storage]
	pub(super) type OrgController<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, T::AccountId, ValueQuery>;

	/// Treasury of an Org
	#[pallet::storage]
	pub(super) type OrgTreasury<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, T::AccountId, ValueQuery>;

	/// Orgs created by account
	#[pallet::storage]
	pub(super) type OrgsCreated<T: Config> = StorageMap<_, Blake2_128Concat, T::AccountId, Vec<T::Hash>, ValueQuery>;

	/// Number of Orgs created by account
	#[pallet::storage]
	pub(super) type OrgsByCreatedCount<T: Config> = StorageMap<_, Blake2_128Concat, T::AccountId, u64, ValueQuery>;

	/// Orgs controlled by account
	#[pallet::storage]
	pub(super) type OrgsControlled<T: Config> = StorageMap<_, Blake2_128Concat, T::AccountId, Vec<T::Hash>, ValueQuery>;

	/// Number of Orgs controlled by account
	#[pallet::storage]
	pub(super) type OrgsControlledCount<T: Config> = StorageMap<_, Blake2_128Concat, T::AccountId, u64, ValueQuery>;

	/// the goode olde nonce
	#[pallet::storage]
	#[pallet::getter(fn nonce)]
	pub(super) type Nonce<T: Config> = StorageValue<_, u128, ValueQuery>;

	#[pallet::event]
	#[pallet::generate_deposit(pub(super) fn deposit_event)]
	pub enum Event<T: Config> {
		OrgCreated {
			sender_id: T::AccountId,
			org_id: T::Hash,
			created_at: T::BlockNumber,
			realm_index: u64,
		},
		OrgUpdated(T::AccountId, T::Hash, T::BlockNumber),
		OrgEnabled(T::Hash),
		OrgDisabled(T::Hash),
		AddMember {
			org_id: T::Hash,
			account_id: T::AccountId,
			added_at: T::BlockNumber,
		},
		UpdateMember(T::Hash, T::AccountId, T::BlockNumber),
		RemoveMember {
			org_id: T::Hash,
			account_id: T::AccountId,
			removed_at: T::BlockNumber,
		},
		ControllerUpdated(T::Hash, T::AccountId),
		IsAMember {
			org_id: T::Hash,
			account_id: T::AccountId,
		},
		Message(Vec<u8>),
	}

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

	#[pallet::call]
	impl<T: Config> Pallet<T> {
		// Enable Org
		// currently root, layer supervisor
		// enables an org to be used
		// org_id: an organisations hash
		#[pallet::weight(1_000_000)]
		pub fn enable_org(origin: OriginFor<T>, org_id: T::Hash) -> DispatchResult {
			ensure_root(origin)?;
			OrgState::<T>::insert(org_id.clone(), ControlState::Active);
			Self::deposit_event(Event::OrgEnabled(org_id));
			Ok(())
		}

		// Disable Org
		// currently root, layer supervisor
		// disables an org to be used
		// org_id: an organisations hash
		#[pallet::weight(1_000_000)]
		pub fn disable_org(origin: OriginFor<T>, org_id: T::Hash) -> DispatchResult {
			ensure_root(origin)?;
			OrgState::<T>::insert(org_id.clone(), ControlState::Inactive);
			Self::deposit_event(Event::OrgDisabled(org_id));
			Ok(())
		}

		/// Create Org
		/// create an on chain organisation
		///
		/// - `creator`: creator
		/// - `controller`: current controller
		/// - `treasury`: treasury
		/// - `name`: Org name
		/// - `cid`: IPFS
		/// - `org_type`: individual | legal Org | dao
		/// - `access`: anyDAO can join | only member can add | only
		/// - `fee_model`: only TX by OS | fees are reserved | fees are moved to
		///   treasury
		/// - `fee`: fee
		/// - `gov_asset`: control assets to empower actors
		/// - `pay_asset`:
		/// - `member_limit`: max members, if 0 == no limit
		///
		/// Emits `OrgCreated` event when successful.
		///
		/// Weight:
		#[pallet::weight(5_000_000)]
		pub fn create_org(
			origin: OriginFor<T>,
			controller: T::AccountId,
			// TODO: treasury shouldn't be provided here. Ink contract as an option. How to dynamically init the
			// pallet?
			treasury: T::AccountId,
			name: Vec<u8>,
			cid: Vec<u8>,
			org_type: OrgType,
			access: AccessModel,
			fee_model: FeeModel,
			fee: T::Balance,
			gov_asset: u8,
			pay_asset: u8,
			member_limit: u64,
			// mint: T::Balance,
			// burn: T::Balance,
			// strategy: u16,
		) -> DispatchResult {
			let sender = ensure_signed(origin)?;

			let creation_fee = T::CreationFee::get();
			let free_balance = T::Currency::free_balance(T::PaymentTokenId::get(), &sender);
			ensure!(free_balance > creation_fee, Error::<T>::BalanceTooLow);

			let free_balance_treasury = T::Currency::free_balance(T::PaymentTokenId::get(), &treasury);
			ensure!(free_balance_treasury > creation_fee, Error::<T>::BalanceTooLow);

			// controller and treasury must not be equal
			ensure!(&controller != &treasury, Error::<T>::DuplicateAddress);

			let nonce = Self::get_and_increment_nonce();
			let (org_id, _) = T::Randomness::random(&nonce.encode());
			let current_block = <frame_system::Pallet<T>>::block_number();

			let org = Org {
				id: org_id.clone(),
				index: nonce.clone(),
				creator: sender.clone(),
				name: name.clone(),
				cid: cid,
				org_type: org_type.clone(),
				created: current_block.clone(),
				mutated: current_block.clone(),
			};

			let mut _fee = fee;
			match &fee_model {
				// TODO: membership fees
				FeeModel::Reserve => _fee = fee,
				FeeModel::Transfer => _fee = fee,
				_ => {}
			};

			let org_config = OrgConfig {
				fee_model: fee_model.clone(),
				fee: _fee.clone(),
				gov_asset: gov_asset.clone(),
				pay_asset: pay_asset.clone(),
				member_limit: member_limit.clone(),
				access: access.clone(),
			};

			Self::do_create_org(org, org_config, controller, treasury)?;

			// dispatch event
			Self::deposit_event(Event::OrgCreated {
				sender_id: sender,
				org_id: org_id,
				created_at: current_block,
				// TODO: tangram::NextRealmIndex::get()
				realm_index: 0,
			});
			Ok(())
		}

		/// Add Member to Org
		///
		/// - `org_id`: Org id
		/// - `account`: Account to be added
		///
		/// Emits `AddMember` event when successful.
		///
		/// Weight:
		#[pallet::weight(1_000_000)]
		pub fn add_member(origin: OriginFor<T>, org_id: T::Hash, account: T::AccountId) -> DispatchResult {
			ensure_signed(origin)?;
			// TODO: ensure not a member yet, org exists
			Self::do_add_member(org_id.clone(), account.clone())?;

			let now = <frame_system::Pallet<T>>::block_number();
			Self::deposit_event(Event::AddMember {
				org_id: org_id,
				account_id: account,
				added_at: now,
			});

			Ok(())
		}

		/// Remove Member from Org
		///
		/// - `org_id`: Org id
		/// - `account`: Account to be removed
		///
		/// Emits `RemoveMember` event when successful.
		///
		/// Weight:
		#[pallet::weight(1_000_000)]
		pub fn remove_member(origin: OriginFor<T>, org_id: T::Hash, account: T::AccountId) -> DispatchResult {
			ensure_signed(origin)?;
			Self::do_remove_member(org_id.clone(), account.clone())?;
			let config = OrgConfiguration::<T>::get(&org_id).ok_or(Error::<T>::OrganizationUnknown)?;
			if config.fee_model == FeeModel::Reserve {
				T::Currency::unreserve(T::ProtocolTokenId::get(), &account, config.fee);
			}
			Self::deposit_event(Event::RemoveMember {
				org_id: org_id,
				account_id: account,
				removed_at: <frame_system::Pallet<T>>::block_number(),
			});
			Ok(())
		}

		// TODO: fn update_state(origin: OriginFor<T>, org_id: T::Hash, state: u8),
		// Disable an org

		/// Check membership
		///
		/// - `org_id`: Org id
		///
		/// Emits `IsAMember` event when successful.
		///
		/// Weight:
		#[pallet::weight(1_000_000)]
		pub fn check_membership(origin: OriginFor<T>, org_id: T::Hash) -> DispatchResult {
			let caller = ensure_signed(origin)?;
			let members = OrgMembers::<T>::get(org_id);
			ensure!(members.contains(&caller), Error::<T>::MemberUnknown);
			Self::deposit_event(Event::IsAMember {
				org_id: org_id,
				account_id: caller,
			});
			Ok(())
		}

		// TODO: transfer control of a Org
		// Refactoring, user FRAME Membership partially.

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

impl<T: Config> Pallet<T> {
	// fn set_state(
	// 	org_id: T::Hash,
	// 	state: u8
	// ) -> DispatchResult {

	// 	<DAOState<T>>::insert( org_id.clone(), state.clone() );

	// 	let now = <frame_system::Pallet<T>>::block_number();
	// 	Self::deposit_event( Event::DAOUpdated(org_id, state, now ) );
	// 	Ok(())

	// }

	fn do_create_org(
		org: Org<T::Hash, T::AccountId, T::BlockNumber>,
		org_config: OrgConfig<T::Balance>,
		controller: T::AccountId,
		treasury: T::AccountId,
	) -> DispatchResult {
		let org_id = org.id.clone();
		let access = org_config.access.clone();
		let creator = org.creator.clone();
		let nonce = org.index.clone();

		Orgs::<T>::insert(org_id.clone(), org);
		OrgConfiguration::<T>::insert(org_id.clone(), org_config);
		OrgByNonce::<T>::insert(nonce.clone(), org_id.clone());
		OrgAccess::<T>::insert(org_id.clone(), access.clone());
		OrgCreator::<T>::insert(org_id.clone(), creator.clone());
		OrgController::<T>::insert(org_id.clone(), controller.clone());
		OrgTreasury::<T>::insert(org_id.clone(), treasury.clone());
		OrgState::<T>::insert(org_id.clone(), ControlState::Active);
		OrgsControlled::<T>::mutate(&controller, |controlled| controlled.push(org_id.clone()));

		OrgsControlledCount::<T>::mutate(&controller, |controlled_count| *controlled_count += 1);
		OrgsCreated::<T>::mutate(&creator, |created| created.push(org_id.clone()));

		// initiate member registry -> consumes fees
		// creator and controller can be equal
		// controller and treasury cannot be equal
		// match Self::add_org_member( &org_id, creator.clone() ) {
		// 		Ok(_) => {},
		// 		Err(err) => { panic!("{err}") }
		// };
		Self::do_add_member(org_id.clone(), controller.clone())?;

		Self::mint_nft()?;

		T::Currency::transfer(
			T::ProtocolTokenId::get(),
			&creator,
			&T::GameDAOTreasury::get(),
			T::CreationFee::get(),
		)?;

		Ok(())
	}

	fn mint_nft() -> DispatchResult {
		// TODO ASAP: work with tangram nfts
		// generate nft realm

		// // get the current realm index
		// let current_realm_index = tangram::NextRealmIndex::get();

		// // every org receives a token realm by default
		// let realm = tangram::Pallet::<T>::create_realm(origin.clone(),
		// org_id.clone()); let realm = match realm {
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
		Ok(())
	}

	fn set_member_state(org_id: T::Hash, account: T::AccountId, member_state: ControlMemberState) -> DispatchResult {
		// TODO: we would like to update member state based on voting result
		ensure!(Orgs::<T>::contains_key(&org_id), Error::<T>::OrganizationUnknown);
		let config = OrgConfiguration::<T>::get(&org_id).ok_or(Error::<T>::OrganizationUnknown)?;
		let new_state = match config.access {
			AccessModel::Open => member_state, // when open use desired state
			_ => ControlMemberState::Pending,  // else pending
		};
		OrgMemberState::<T>::insert((&org_id, &account), new_state);

		Ok(())
	}

	fn do_add_member(org_id: T::Hash, account: T::AccountId) -> DispatchResult {
		ensure!(Orgs::<T>::contains_key(&org_id), Error::<T>::OrganizationUnknown);

		let mut members = OrgMembers::<T>::get(&org_id);
		let max_members = T::MaxMembersPerDAO::get();
		ensure!((members.len() as u32) < max_members, Error::<T>::MembershipLimitReached);

		let config = OrgConfiguration::<T>::get(&org_id).ok_or(Error::<T>::OrganizationUnknown)?;
		let state = match config.access {
			AccessModel::Open => ControlMemberState::Active,
			_ => ControlMemberState::Pending,
		};

		let currency_id = T::ProtocolTokenId::get();
		let fee = config.fee;
		ensure!(
			T::Currency::free_balance(currency_id, &account) > fee,
			Error::<T>::BalanceTooLow
		);

		match &config.fee_model {
			// no fees
			FeeModel::NoFees => {}
			// reserve
			FeeModel::Reserve => {
				T::Currency::reserve(currency_id, &account, config.fee)?;
			}
			// transfer to treasury
			FeeModel::Transfer => {
				let treasury = OrgTreasury::<T>::get(org_id);
				T::Currency::transfer(currency_id, &account, &treasury, config.fee)?;
			}
		}

		match members.binary_search(&account) {
			// already a member, return
			Ok(_) => Err(Error::<T>::MemberExists.into()),

			// not a member, insert at index
			Err(index) => {
				members.insert(index, account.clone());
				// OrgMembers::<T>::mutate( &org_id, |members| members.push(account.clone()) );
				OrgMembers::<T>::insert(&org_id, members.clone());

				// counter
				let count = members.len();
				OrgMemberCount::<T>::insert(&org_id, count as u64);

				let mut memberships = Memberships::<T>::get(&account);
				memberships.push(org_id.clone());
				Memberships::<T>::insert(&account, memberships);

				// state
				OrgMemberState::<T>::insert((org_id.clone(), account.clone()), state);

				Ok(())
			}
		}
	}

	fn do_remove_member(org_id: T::Hash, account: T::AccountId) -> DispatchResult {
		// existence
		ensure!(Orgs::<T>::contains_key(&org_id), Error::<T>::OrganizationUnknown);

		let mut members = OrgMembers::<T>::get(org_id);
		match members.binary_search(&account) {
			Ok(index) => {
				// remove member from Org
				members.remove(index);
				OrgMembers::<T>::insert(&org_id, members.clone());

				// remove Org from member's Orgs
				let mut memberships = Memberships::<T>::get(&account);
				match memberships.binary_search(&org_id) {
					Ok(index) => {
						memberships.remove(index);
						Memberships::<T>::insert(&account, memberships);
					}
					Err(_) => {}
				}

				// todo: Should this be ProtocolTokenId or other currency id?
				let currency_id = T::ProtocolTokenId::get();
				// unreserve?
				let config = OrgConfiguration::<T>::get(&org_id).ok_or(Error::<T>::OrganizationUnknown)?;
				if config.fee_model == FeeModel::Reserve {
					T::Currency::unreserve(currency_id, &account, config.fee);
				}

				// counter --
				let count = members.len();
				OrgMemberCount::<T>::insert(&org_id, count as u64);

				// member state
				OrgMemberState::<T>::insert((org_id.clone(), account.clone()), ControlMemberState::Inactive);

				Ok(())
			}

			Err(_) => Err(Error::<T>::MemberUnknown.into()),
		}
	}

	fn get_and_increment_nonce() -> u128 {
		let nonce = Nonce::<T>::get();
		Nonce::<T>::put(nonce.wrapping_add(1));
		nonce
	}
}

impl<T: Config> ControlTrait<T::AccountId, T::Hash> for Pallet<T> {
	fn org_controller_account(org: &T::Hash) -> T::AccountId {
		OrgController::<T>::get(org)
	}
	fn org_treasury_account(org: &T::Hash) -> T::AccountId {
		OrgTreasury::<T>::get(org)
	}
	fn is_org_active(org: &T::Hash) -> bool {
		OrgState::<T>::get(org) == ControlState::Active
	}
	fn is_org_member_active(org: &T::Hash, account_id: &T::AccountId) -> bool {
		OrgMemberState::<T>::get((org, account_id)) == ControlMemberState::Active
	}
}
