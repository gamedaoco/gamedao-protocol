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

use codec::{HasCompact, Decode};
use frame_support::{
	codec::{Encode},
	dispatch::DispatchResult,
	ensure, PalletId,
	traits::{Get},
};
use gamedao_traits::ControlTrait;
use orml_traits::{MultiCurrency, MultiReservableCurrency};
use scale_info::TypeInfo;
use sp_runtime::traits::{AtLeast32BitUnsigned, TrailingZeroInput, AccountIdConversion, Hash};
use sp_std::{fmt::Debug, vec::Vec};
#[cfg(feature = "std")]
use serde::{Deserialize, Serialize};

pub use pallet::*;

#[frame_support::pallet]
pub mod pallet {
	use super::*;
	use frame_support::{pallet_prelude::*, transactional};
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

		type WeightInfo: frame_system::weights::WeightInfo;
		type Event: From<Event<Self>>
			+ IsType<<Self as frame_system::Config>::Event>
			+ Into<<Self as frame_system::Config>::Event>;
		type Currency: MultiCurrency<Self::AccountId, CurrencyId = Self::CurrencyId, Balance = Self::Balance>
			+ MultiReservableCurrency<Self::AccountId>;

		#[pallet::constant]
		type PalletId: Get<PalletId>;
		#[pallet::constant]
		type Game3FoundationTreasury: Get<Self::AccountId>;
		#[pallet::constant]
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
		type MinimumDeposit: Get<Self::Balance>;
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
		StorageMap<_, Blake2_128Concat, T::Hash, OrgConfig<T::Balance, T::CurrencyId>, OptionQuery>;

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

	#[pallet::genesis_config]
	pub struct GenesisConfig<T: Config> {
		pub orgs: Vec<(T::AccountId, T::AccountId, T::AccountId, Vec<u8>, Vec<u8>, OrgType,
			AccessModel, FeeModel, T::Balance, T::CurrencyId, T::CurrencyId, u64, T::Balance)>,
	}

	#[cfg(feature = "std")]
	impl<T: Config> Default for GenesisConfig<T> {
		fn default() -> Self {
			GenesisConfig { orgs: vec![] }
		}
	}

	#[pallet::genesis_build]
	impl<T: Config> GenesisBuild<T> for GenesisConfig<T> {
		fn build(&self) {
			self.orgs
				.iter()
				.for_each(|(creator_id, controller_id, treasury_id, name, cid, org_type,
					access, fee_model, fee, gov_asset, pay_asset, member_limit, deposit)| {
						let nonce = Pallet::<T>::get_and_increment_nonce();
						let org_id = T::Hashing::hash_of(&treasury_id);
						Pallet::<T>::do_create_org(
							creator_id.clone(), org_id.clone(), controller_id.clone(), treasury_id.clone(), name.clone(),
							cid.clone(), org_type.clone(), access.clone(), fee_model.clone(), fee.clone(), gov_asset.clone(),
							pay_asset.clone(), member_limit.clone(), deposit.clone(), nonce
						);
						Pallet::<T>::do_add_member(org_id, controller_id.clone()).unwrap();
						Pallet::<T>::mint_nft().unwrap();
				});
		}
	}

	#[pallet::event]
	#[pallet::generate_deposit(pub(super) fn deposit_event)]
	pub enum Event<T: Config> {
		OrgCreated {
			sender_id: T::AccountId,
			org_id: T::Hash,
			treasury_id: T::AccountId,
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
		/// Treasury account already exists
		TreasuryExists,
		/// Minimum deposit to Treasury too low
		MinimumDepositTooLow,
		/// Organization already exists
		OrgExists
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
		/// - `name`: Org name
		/// - `cid`: IPFS
		/// - `org_type`: individual | legal Org | dao
		/// - `access`: anyDAO can join | only member can add | only
		/// - `fee_model`: only TX by OS | fees are reserved | fees are moved to treasury
		/// - `fee`: fee
		/// - `gov_asset`: control assets to empower actors
		/// - `pay_asset`:
		/// - `member_limit`: max members, if 0 == no limit
		/// - `deposit`: initial deposit for the org treasury
		///
		/// Emits `OrgCreated` event when successful.
		///
		/// Weight:
		#[pallet::weight(5_000_000)]
		#[transactional]
		pub fn create_org(
			origin: OriginFor<T>,
			controller_id: T::AccountId,
			name: Vec<u8>,
			cid: Vec<u8>,
			org_type: OrgType,
			access: AccessModel,
			fee_model: FeeModel,
			fee: T::Balance,
			gov_asset: T::CurrencyId,
			pay_asset: T::CurrencyId,
			member_limit: u64,
			deposit: Option<T::Balance>,
			// mint: T::Balance,
			// burn: T::Balance,
			// strategy: u16,
		) -> DispatchResult {
			let sender = ensure_signed(origin.clone())?;

			let mut org_deposit: T::Balance = T::MinimumDeposit::get();
			if deposit.is_some() {
				org_deposit = deposit.unwrap();
				ensure!(org_deposit >= T::MinimumDeposit::get(), Error::<T>::MinimumDepositTooLow);
			}
			
			let free_balance = T::Currency::free_balance(T::ProtocolTokenId::get(), &sender);
			ensure!(free_balance >= org_deposit, Error::<T>::BalanceTooLow);

			// TODO validation: name, cid ?
			let nonce = Self::get_and_increment_nonce();
			let treasury_account_id = T::PalletId::get().into_sub_account(nonce as i32);
			ensure!(!<frame_system::Pallet<T>>::account_exists(&treasury_account_id), Error::<T>::TreasuryExists);

			let org_id = T::Hashing::hash_of(&treasury_account_id);
			ensure!(!Orgs::<T>::contains_key(&org_id), Error::<T>::OrgExists);

			Self::do_create_org(
				sender.clone(), org_id.clone(), controller_id.clone(), treasury_account_id.clone(), name, cid,
				org_type, access, fee_model, fee, gov_asset, pay_asset, member_limit, org_deposit, nonce
			);
			Self::do_add_member(org_id.clone(), controller_id)?;
			Self::mint_nft()?;

			Self::deposit_event(Event::OrgCreated {
				sender_id: sender,
				org_id,
				treasury_id: treasury_account_id,
				created_at: <frame_system::Pallet<T>>::block_number(),
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
		pub fn add_member(origin: OriginFor<T>, org_id: T::Hash, account_id: T::AccountId) -> DispatchResult {
			ensure_signed(origin)?;
			// TODO: ensure not a member yet, org exists
			Self::do_add_member(org_id.clone(), account_id.clone())?;

			let now = <frame_system::Pallet<T>>::block_number();
			Self::deposit_event(Event::AddMember {
				org_id: org_id,
				account_id,
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
		pub fn remove_member(origin: OriginFor<T>, org_id: T::Hash, account_id: T::AccountId) -> DispatchResult {
			ensure_signed(origin)?;
			Self::do_remove_member(org_id.clone(), account_id.clone())?;
			let config = OrgConfiguration::<T>::get(&org_id).ok_or(Error::<T>::OrganizationUnknown)?;
			if config.fee_model == FeeModel::Reserve {
				T::Currency::unreserve(T::ProtocolTokenId::get(), &account_id, config.fee);
			}
			Self::deposit_event(Event::RemoveMember {
				org_id: org_id,
				account_id,
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
		creator: T::AccountId,
		org_id: T::Hash,
		controller_id: T::AccountId,
		treasury_id: T::AccountId,
		name: Vec<u8>,
		cid: Vec<u8>,
		org_type: OrgType,
		access: AccessModel,
		fee_model: FeeModel,
		fee: T::Balance,
		gov_asset: T::CurrencyId,
		pay_asset: T::CurrencyId,
		member_limit: u64,
		deposit: T::Balance,
		nonce: u128
	) {
		let now = <frame_system::Pallet<T>>::block_number();

		let org = Org {
			id: org_id.clone(),
			index: nonce,
			creator: creator.clone(),
			name: name,
			cid: cid,
			org_type: org_type,
			created: now.clone(),
			mutated: now,
		};

		let mut _fee = fee;
		match &fee_model {
			// TODO: membership fees
			FeeModel::Reserve => _fee = fee,
			FeeModel::Transfer => _fee = fee,
			_ => {}
		};

		let org_config = OrgConfig {
			fee_model: fee_model,
			fee: _fee,
			gov_asset: gov_asset,
			pay_asset: pay_asset,
			member_limit: member_limit,
			access: access.clone(),
		};

		Orgs::<T>::insert(org_id.clone(), org);
		OrgConfiguration::<T>::insert(org_id.clone(), org_config);
		OrgByNonce::<T>::insert(nonce, org_id.clone());
		OrgAccess::<T>::insert(org_id.clone(), access.clone());
		OrgCreator::<T>::insert(org_id.clone(), creator.clone());
		OrgController::<T>::insert(org_id.clone(), controller_id.clone());
		OrgTreasury::<T>::insert(org_id.clone(), treasury_id.clone());
		OrgState::<T>::insert(org_id.clone(), ControlState::Active);
		OrgsControlled::<T>::mutate(&controller_id, |controlled| controlled.push(org_id.clone()));

		OrgsControlledCount::<T>::mutate(&controller_id, |controlled_count| *controlled_count += 1);
		OrgsCreated::<T>::mutate(&creator, |created| created.push(org_id.clone()));

		// initiate member registry -> consumes fees
		// creator and controller can be equal
		// controller and treasury cannot be equal
		// match Self::add_org_member( &org_id, creator.clone() ) {
		// 		Ok(_) => {},
		// 		Err(err) => { panic!("{err}") }
		// };

		let res = T::Currency::transfer(
			T::ProtocolTokenId::get(),
			&creator,
			&treasury_id,
			deposit,
		);
		debug_assert!(res.is_ok());
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

	fn set_member_state(org_id: T::Hash, account_id: T::AccountId, member_state: ControlMemberState) -> DispatchResult {
		// TODO: we would like to update member state based on voting result
		ensure!(Orgs::<T>::contains_key(&org_id), Error::<T>::OrganizationUnknown);
		let config = OrgConfiguration::<T>::get(&org_id).ok_or(Error::<T>::OrganizationUnknown)?;
		let new_state = match config.access {
			AccessModel::Open => member_state, // when open use desired state
			_ => ControlMemberState::Pending,  // else pending
		};
		OrgMemberState::<T>::insert((&org_id, &account_id), new_state);

		Ok(())
	}

	fn do_add_member(org_id: T::Hash, account_id: T::AccountId) -> DispatchResult {
		ensure!(Orgs::<T>::contains_key(&org_id), Error::<T>::OrganizationUnknown);

		let mut members = OrgMembers::<T>::get(&org_id);
		let max_members = T::MaxMembersPerDAO::get();
		ensure!((members.len() as u32) < max_members, Error::<T>::MembershipLimitReached);

		let config = OrgConfiguration::<T>::get(&org_id).ok_or(Error::<T>::OrganizationUnknown)?;
		let state = match config.access {
			AccessModel::Open => ControlMemberState::Active,
			// FIXME: now Controller as an org creator has Pending status as well
			_ => ControlMemberState::Pending,
		};

		let currency_id = T::ProtocolTokenId::get();
		let fee = config.fee;
		ensure!(
			T::Currency::free_balance(currency_id, &account_id) > fee,
			Error::<T>::BalanceTooLow
		);

		match &config.fee_model {
			// no fees
			FeeModel::NoFees => {}
			// reserve
			FeeModel::Reserve => {
				T::Currency::reserve(currency_id, &account_id, config.fee)?;
			}
			// transfer to treasury
			FeeModel::Transfer => {
				let treasury = OrgTreasury::<T>::get(org_id);
				T::Currency::transfer(currency_id, &account_id, &treasury, config.fee)?;
			}
		}

		match members.binary_search(&account_id) {
			// already a member, return
			Ok(_) => Err(Error::<T>::MemberExists.into()),

			// not a member, insert at index
			Err(index) => {
				members.insert(index, account_id.clone());
				// OrgMembers::<T>::mutate( &org_id, |members| members.push(account_id.clone()) );
				OrgMembers::<T>::insert(&org_id, members.clone());

				// counter
				let count = members.len();
				OrgMemberCount::<T>::insert(&org_id, count as u64);

				let mut memberships = Memberships::<T>::get(&account_id);
				memberships.push(org_id.clone());
				Memberships::<T>::insert(&account_id, memberships);

				// state
				OrgMemberState::<T>::insert((org_id.clone(), account_id.clone()), state);

				Ok(())
			}
		}
	}

	fn do_remove_member(org_id: T::Hash, account_id: T::AccountId) -> DispatchResult {
		// existence
		ensure!(Orgs::<T>::contains_key(&org_id), Error::<T>::OrganizationUnknown);

		let mut members = OrgMembers::<T>::get(org_id);
		match members.binary_search(&account_id) {
			Ok(index) => {
				// remove member from Org
				members.remove(index);
				OrgMembers::<T>::insert(&org_id, members.clone());

				// remove Org from member's Orgs
				let mut memberships = Memberships::<T>::get(&account_id);
				match memberships.binary_search(&org_id) {
					Ok(index) => {
						memberships.remove(index);
						Memberships::<T>::insert(&account_id, memberships);
					}
					Err(_) => {}
				}

				// todo: Should this be ProtocolTokenId or other currency id?
				let currency_id = T::ProtocolTokenId::get();
				// unreserve?
				let config = OrgConfiguration::<T>::get(&org_id).ok_or(Error::<T>::OrganizationUnknown)?;
				if config.fee_model == FeeModel::Reserve {
					T::Currency::unreserve(currency_id, &account_id, config.fee);
				}

				// counter --
				let count = members.len();
				OrgMemberCount::<T>::insert(&org_id, count as u64);

				// member state
				OrgMemberState::<T>::insert((org_id.clone(), account_id.clone()), ControlMemberState::Inactive);

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
	fn org_controller_account(org_id: &T::Hash) -> T::AccountId {
		OrgController::<T>::get(org_id)
	}
	fn org_treasury_account(org_id: &T::Hash) -> T::AccountId {
		OrgTreasury::<T>::get(org_id)
	}
	fn is_org_active(org_id: &T::Hash) -> bool {
		OrgState::<T>::get(org_id) == ControlState::Active
	}
	fn is_org_member_active(org_id: &T::Hash, account_id: &T::AccountId) -> bool {
		OrgMemberState::<T>::get((org_id, account_id)) == ControlMemberState::Active
	}
}
