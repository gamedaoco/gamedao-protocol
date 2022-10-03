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

#![allow(deprecated)] // TODO: tests are not working without transactional macro
#![cfg_attr(not(feature = "std"), no_std)]
pub mod types;

mod mock;
mod tests;
mod migration;
mod benchmarking;
pub mod weights;

use codec::Codec;
use frame_support::{dispatch::{DispatchResult, DispatchError, RawOrigin},
	ensure, PalletId, traits::{Get, StorageVersion}, weights::Weight, BoundedVec, transactional
};
use gamedao_traits::{ControlTrait, ControlBenchmarkingTrait};
use orml_traits::{MultiCurrency, MultiReservableCurrency};
use scale_info::TypeInfo;
use sp_runtime::{
	traits::{AccountIdConversion, AtLeast32BitUnsigned, Hash, BadOrigin},
	ArithmeticError::Overflow};
use sp_std::{fmt::Debug, convert::TryInto, vec, vec::{Vec}};
#[cfg(feature = "std")]
use serde::{Deserialize, Serialize};

use types::{OrgType, AccessModel, FeeModel, OrgState, MemberState, MemberLimit};

pub use pallet::*;
pub use weights::WeightInfo;

type String<T> = BoundedVec<u8, <T as pallet::Config>::StringLimit>;

type Org<T> = types::Org<
	<T as frame_system::Config>::AccountId, <T as pallet::Config>::Balance, <T as pallet::Config>::CurrencyId,
	<T as frame_system::Config>::BlockNumber, String<T>
>;

#[frame_support::pallet]
pub mod pallet {
	use super::*;
	use frame_support::pallet_prelude::*;
	use frame_system::pallet_prelude::*;

	/// The current storage version.
	const STORAGE_VERSION: StorageVersion = StorageVersion::new(0);

	#[pallet::pallet]
	#[pallet::generate_store(pub(super) trait Store)]
	#[pallet::storage_version(STORAGE_VERSION)]
	pub struct Pallet<T>(_);

	#[pallet::config]
	pub trait Config: frame_system::Config {
		type Event: From<Event<Self>>
			+ IsType<<Self as frame_system::Config>::Event>
			+ Into<<Self as frame_system::Config>::Event>;

		/// The units in which we record balances.
		type Balance: Member
			+ Parameter
			+ AtLeast32BitUnsigned
			+ Default
			+ Copy
			+ Codec
			+ MaybeSerializeDeserialize
			+ MaxEncodedLen
			+ TypeInfo;

		/// The currency ID type
		type CurrencyId: Member
			+ Parameter
			+ Copy
			+ MaybeSerializeDeserialize
			+ MaxEncodedLen
			+ TypeInfo;

		/// Weight information for extrinsics in this module.
		type WeightInfo: WeightInfo;

		/// Multi-currency support for asset management.
		type Currency: MultiCurrency<Self::AccountId, CurrencyId = Self::CurrencyId, Balance = Self::Balance>
			+ MultiReservableCurrency<Self::AccountId>;

		/// The ID for this pallet.
		#[pallet::constant]
		type PalletId: Get<PalletId>;

		/// The max number of members per one org.
		#[pallet::constant]
		type MaxMembers: Get<u32>;

		/// The CurrencyId which is used as a protokol token.
		#[pallet::constant]
		type ProtocolTokenId: Get<Self::CurrencyId>;

		/// The CurrencyId which is used as a payment token.
		#[pallet::constant]
		type PaymentTokenId: Get<Self::CurrencyId>;

		/// The min amount of the deposit which is locked during Org creation (in Protocol tokens).
		#[pallet::constant]
		type MinimumDeposit: Get<Self::Balance>;

		/// The maximum length of a name or cid stored on-chain.
		#[pallet::constant]
		type StringLimit: Get<u32>;
	}

	/// Org by its id.
	///
	/// Org: map Hash => Org
	#[pallet::storage]
	pub(super) type Orgs<T: Config> =
		StorageMap<_, Blake2_128Concat, T::Hash, Org<T>, OptionQuery>;

	/// Org state (Inactive | Active | Locked) by org id.	
	///
	/// OrgStates: map Hash => OrgState
	#[pallet::storage]
	pub(super) type OrgStates<T: Config> =
		StorageMap<_, Blake2_128Concat, T::Hash, OrgState, ValueQuery, GetDefault>;

	/// Org members list by org id.
	///
	/// Members: map Hash => Vec<AccountId>
	#[pallet::storage]
	pub(super) type Members<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash,
		BoundedVec<T::AccountId, T::MaxMembers>, ValueQuery>;

	/// Org members count by org id.
	///
	/// OrgMemberCount: map Hash => MemberLimit
	#[pallet::storage]
	pub(super) type OrgMemberCount<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, MemberLimit, ValueQuery>;

	/// Member state (Inactive | Active ...) by org Hash and member account.
	///
	/// MemberStates: map Hash, AccountId => MemberState
	#[pallet::storage]
	pub(super) type MemberStates<T: Config> =
	StorageDoubleMap<_, Blake2_128Concat, T::Hash, Blake2_128Concat, T::AccountId, MemberState, ValueQuery, GetDefault>;

	/// Treasury account of an Org.
	///
	/// OrgTreasury: map Hash => AccountId
	#[pallet::storage]
	pub(super) type OrgTreasury<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, T::AccountId, OptionQuery>;

	#[pallet::storage]
	#[pallet::getter(fn org_count)]
	pub type OrgCount<T: Config> = StorageValue<_, u32, ValueQuery>;

	#[pallet::genesis_config]
	pub struct GenesisConfig<T: Config> {
		pub orgs: Vec<(T::AccountId, T::AccountId, T::AccountId, String<T>, String<T>,
			OrgType, AccessModel, FeeModel, T::Balance, T::CurrencyId, T::CurrencyId, MemberLimit, T::Balance)>,
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
				.for_each(|(creator, prime, treasury_id, name, cid, org_type,
					access_model, fee_model, membership_fee, gov_currency, pay_currency, member_limit, deposit)| {
						let now = frame_system::Pallet::<T>::block_number();
						let index = OrgCount::<T>::get();
						let org: Org<T> = types::Org {
							index, creator: creator.clone(), prime: prime.clone(), name: name.clone(), cid: cid.clone(),
							org_type: org_type.clone(), fee_model: fee_model.clone(), membership_fee: Some(*membership_fee),
							gov_currency: gov_currency.clone(), pay_currency: *pay_currency, member_limit: *member_limit,
							access_model: access_model.clone(), created: now.clone(), mutated: now
						};
						let org_id = <T as frame_system::Config>::Hashing::hash_of(&org);

						Pallet::<T>::do_create_org(org_id.clone(), &org, treasury_id.clone(), *deposit).unwrap();
						Pallet::<T>::do_add_member(org_id, creator.clone(), MemberState::Active).unwrap();
						Pallet::<T>::pay_membership_fee(
							&creator, &treasury_id, Some(*membership_fee), fee_model.clone(), *gov_currency).unwrap();
				});
		}
	}

	#[pallet::event]
	#[pallet::generate_deposit(pub(super) fn deposit_event)]
	pub enum Event<T: Config> {
		/// Org was successfully created.
		OrgCreated {
			org_id: T::Hash,
			creator: T::AccountId,
			treasury_id: T::AccountId,
			created_at: T::BlockNumber,
			realm_index: u64,
		},
		/// Org was enabled and it's state become Active.
		OrgEnabled(T::Hash),
		/// Org was disabled and it's state become Inactive.
		OrgDisabled(T::Hash),
		/// A member has been added to the Org.
		MemberAdded {
			org_id: T::Hash,
			who: T::AccountId,
			block_number: T::BlockNumber,
		},
		/// A member has been removed from the Org.
		MemberRemoved {
			org_id: T::Hash,
			who: T::AccountId,
			block_number: T::BlockNumber,
		},
		OrgUpdated {
			org_id: T::Hash,
			prime_id: Option<T::AccountId>,
			org_type: Option<OrgType>,
			access_model: Option<AccessModel>,
			member_limit: Option<MemberLimit>,
			fee_model: Option<FeeModel>,
			membership_fee: Option<T::Balance>,
			block_number: T::BlockNumber,
		},
		FundsSpended {
			org_id: T::Hash,
			beneficiary: T::AccountId,
			amount: T::Balance,
			currency_id: T::CurrencyId,
			block_number: T::BlockNumber,
		},
	}

	#[pallet::error]
	pub enum Error<T> {
		AuthorizationError,
		/// Org Exists.
		OrganizationExists,
		/// Org Unknown.
		OrganizationUnknown,
		/// Insufficient Balance to create Org.
		BalanceLow,
		/// Membership Limit Reached.
		MembershipLimitReached,
		/// Member Exists.
		AlreadyMember,
		/// Member Unknonw.
		NotMember,
		NoChangesProvided,
		/// Treasury account already exists.
		TreasuryExists,
		/// Treasury account does not exists.
		TreasuryUnknown,
		/// Minimum deposit to Treasury too low.
		MinimumDepositTooLow,
		MissingParameter,
		WrongOrganizationType
	}

	#[pallet::hooks]
	impl<T: Config> Hooks<T::BlockNumber> for Pallet<T> {

		fn on_runtime_upgrade() -> Weight {
			migration::migrate::<T, Self>()
		}

	}

	#[pallet::call]
	impl<T: Config> Pallet<T> {

		/// Create an on chain organization
		/// 
		/// Parameters:
		/// - `origin`: Org creator.
		/// - `name`: Org name.
		/// - `cid`: IPFS content identifier.
		/// - `org_type`: Individual | Company | Dao | Hybrid.
		/// - `access_model`:
		/// - `fee_model`:
		/// 
		/// Optional parameters:
		/// - `member_limit`: max members. Default: MaxMembers.
		/// - `member_fee`: fees amount to be applied to new members based on fee model (in `gov_asset` tokens).
		/// - `gov_asset`: control assets to empower actors.
		/// - `pay_asset`: asset used for payments.
		/// - `deposit`: initial deposit for the org treasury (in Protocol tokens).
		///
		/// Emits `OrgCreated` event when successful.
		///
		/// Weight: `O(1)`
		#[pallet::weight(T::WeightInfo::create_org())]
		// Tests are not working without this deprecated transactional macro
		#[transactional]
		pub fn create_org(
			origin: OriginFor<T>,
			name: String<T>,
			cid: String<T>,
			org_type: OrgType,
			access_model: AccessModel,
			fee_model: FeeModel,
			// Optional parameters:
			member_limit: Option<MemberLimit>,
			membership_fee: Option<T::Balance>,
			gov_currency: Option<T::CurrencyId>,
			pay_currency: Option<T::CurrencyId>,
			deposit: Option<T::Balance>,
		) -> DispatchResult {
			let sender = ensure_signed(origin.clone())?;

			// Provide default values for optional parameters:
			let member_limit = member_limit.unwrap_or(T::MaxMembers::get());
			let gov_currency = gov_currency.unwrap_or(T::ProtocolTokenId::get());
			let pay_currency = pay_currency.unwrap_or(T::PaymentTokenId::get());
			let deposit = deposit.unwrap_or(T::MinimumDeposit::get());

			ensure!(
				org_type == OrgType::Individual || org_type == OrgType::Dao,
				Error::<T>::WrongOrganizationType
			);
			ensure!(deposit >= T::MinimumDeposit::get(), Error::<T>::MinimumDepositTooLow);
			ensure!(fee_model == FeeModel::NoFees || membership_fee.is_some(), Error::<T>::MissingParameter);

			let index = OrgCount::<T>::get();
			let treasury_id = T::PalletId::get().into_sub_account_truncating(index as i32);
			ensure!(!<frame_system::Pallet<T>>::account_exists(&treasury_id), Error::<T>::TreasuryExists);

			let now = frame_system::Pallet::<T>::block_number();
			let org = types::Org {
				index, creator: sender.clone(), prime: sender.clone(), name, cid, org_type,
				fee_model: fee_model.clone(), membership_fee: membership_fee.clone(), gov_currency,
				pay_currency, member_limit, access_model, created: now.clone(), mutated: now,
			};
			let org_id = T::Hashing::hash_of(&org);
			ensure!(!Orgs::<T>::contains_key(&org_id), Error::<T>::OrganizationExists);

			Self::do_create_org(org_id, &org, treasury_id.clone(), deposit)?;
			Self::do_add_member(org_id, sender.clone(), MemberState::Active)?;
			Self::pay_membership_fee(&sender, &treasury_id, membership_fee, fee_model, gov_currency)?;

			Ok(())
		}

		/// Update Org
		///
		/// Allowed origins: Root or prime if OrgType::Individual
		///
		/// Parameters:
		/// - `org_id`: Org hash.
		/// 
		/// Optional parameters:
		/// - `prime_id`: new prime id.
		/// - `access_model`: new access model.
		/// - `member_limit`: new member limit.
		/// - `fee_model`: new fee model.
		/// - `membership_fee`: new membership fee.
		///
		/// Emits `OrgUpdated` event when successful.
		///
		/// Weight: `O(1)`
		#[pallet::weight(T::WeightInfo::update_org())]
		pub fn update_org(
			origin: OriginFor<T>,
			org_id: T::Hash,
			prime_id: Option<T::AccountId>,
			org_type: Option<OrgType>,
			access_model: Option<AccessModel>,
			member_limit: Option<MemberLimit>,
			fee_model: Option<FeeModel>,
			membership_fee: Option<T::Balance>,
		) -> DispatchResult {
			let mut org = Orgs::<T>::get(&org_id).ok_or(Error::<T>::OrganizationUnknown)?;
			Self::ensure_root_or_prime(origin, org.prime.clone(), org.org_type.clone())?;

			let args = [prime_id.is_some(), fee_model.is_some(), membership_fee.is_some(),
						access_model.is_some(), member_limit.is_some(), org_type.is_some()];
			ensure!(args.iter().any(|x| *x == true), Error::<T>::NoChangesProvided);

			if let Some(access_model) = access_model.clone() { org.access_model = access_model; };
			if let Some(org_type) = org_type.clone() { org.org_type = org_type; };
			if let Some(member_limit) = member_limit.clone() { org.member_limit = member_limit; };
			if let Some(_) = membership_fee.clone() { org.membership_fee = membership_fee; };
			if let Some(prime_id) = prime_id.clone() {
				ensure!(MemberStates::<T>::contains_key(&org_id, &prime_id), Error::<T>::NotMember);
				org.prime = prime_id;
			};
			if let Some(fee_model) = fee_model.clone() {
				if fee_model != FeeModel::NoFees && membership_fee.is_none() {
					return Err(Error::<T>::MissingParameter)?
				};
				org.fee_model = fee_model;
			};

			Orgs::<T>::insert(&org_id, org);
			
			let block_number = frame_system::Pallet::<T>::block_number();
			Self::deposit_event(Event::OrgUpdated {
				org_id, prime_id, org_type, access_model, member_limit,
				fee_model, membership_fee, block_number
			});

			Ok(())
		}

		/// Enable Org
		///
		/// Enables an Org to be used and changes it's state to Active.
		/// Allowed origins: Root or prime if OrgType::Individual
		///
		/// Parameters:
		/// - `org_id`: Org hash.
		///
		/// Emits `OrgEnabled` event when successful.
		///
		/// Weight: `O(1)`
		#[pallet::weight(T::WeightInfo::enable_org())]
		pub fn enable_org(origin: OriginFor<T>, org_id: T::Hash) -> DispatchResult {
			let org = Orgs::<T>::get(&org_id).ok_or(Error::<T>::OrganizationUnknown)?;
			Self::ensure_root_or_prime(origin, org.prime, org.org_type)?;

			OrgStates::<T>::insert(org_id.clone(), OrgState::Active);
			Self::deposit_event(Event::OrgEnabled(org_id));
			Ok(())
		}

		/// Disable Org
		///
		/// Disables an Org to be used and changes it's state to Inactive.
		/// Allowed origins: Root or prime if OrgType::Individual
		/// 
		/// Parameters:
		/// - `org_id`: Org hash.
		///
		/// Emits `OrgDisabled` event when successful.
		///
		/// Weight: `O(1)`
		#[pallet::weight(T::WeightInfo::disable_org())]
		pub fn disable_org(origin: OriginFor<T>, org_id: T::Hash) -> DispatchResult {
			let org = Orgs::<T>::get(&org_id).ok_or(Error::<T>::OrganizationUnknown)?;
			Self::ensure_root_or_prime(origin, org.prime, org.org_type)?;

			OrgStates::<T>::insert(org_id.clone(), OrgState::Inactive);
			Self::deposit_event(Event::OrgDisabled(org_id));
			Ok(())
		}

		/// Add Member to Org
		/// 
		/// Parameters:
		/// - `org_id`: Org id
		/// - `who`: Account to be added
		///
		/// Emits `MemberAdded` event when successful.
		///
		/// Weight: `O(log n)`
		#[pallet::weight(T::WeightInfo::add_member(T::MaxMembers::get()))]
		pub fn add_member(
			origin: OriginFor<T>,
			org_id: T::Hash,
			who: T::AccountId
		) -> DispatchResultWithPostInfo {
			let org = Orgs::<T>::get(&org_id).ok_or(Error::<T>::OrganizationUnknown)?;
			match org.access_model {
				AccessModel::Open => {
					Self::ensure_root_or_self(origin, who.clone())?;
				},
				AccessModel::Prime => {
					Self::ensure_root_or_prime(origin, org.prime.clone(), org.org_type)?;
				},
				AccessModel::Voting => {
					Self::ensure_root_or_governance(origin)?;
				},
			}
			let member_state = match org.access_model {
				AccessModel::Open => MemberState::Active,
				_ => MemberState::Pending,
			};
			let treasury_id = OrgTreasury::<T>::get(org_id).ok_or(Error::<T>::TreasuryUnknown)?;
			Self::pay_membership_fee(&org.prime, &treasury_id, org.membership_fee, org.fee_model, org.gov_currency)?;
			let members_count = Self::do_add_member(org_id, who.clone(), member_state)?;

			Ok(Some(T::WeightInfo::add_member(members_count)).into())
		}

		/// Remove member from Org
		/// 
		/// Parameters:
		/// - `org_id`: Org id
		/// - `who`: Account to be removed
		///
		/// Emits `MemberRemoved` event when successful.
		///
		/// Weight: `O(log n)`
		#[pallet::weight(T::WeightInfo::remove_member(T::MaxMembers::get()))]
		pub fn remove_member(origin: OriginFor<T>, org_id: T::Hash, who: T::AccountId) -> DispatchResultWithPostInfo {
			let org = Orgs::<T>::get(&org_id).ok_or(Error::<T>::OrganizationUnknown)?;
			match org.access_model {
				AccessModel::Open => {
					Self::ensure_root_or_self(origin, who.clone())?;
				},
				AccessModel::Prime => {
					Self::ensure_root_or_prime(origin, org.prime.clone(), org.org_type)?;
				},
				AccessModel::Voting => {
					Self::ensure_root_or_governance(origin)?;
				},
			}
			let member_count = Self::do_remove_member(org_id.clone(), who.clone())?;
			if org.fee_model == FeeModel::Reserve {
				T::Currency::unreserve(org.gov_currency, &who, org.membership_fee.unwrap());
			}

			Ok(Some(T::WeightInfo::remove_member(member_count)).into())
		}

		/// Make spending from the org treasury
		/// 
		/// Allowed origins: Root or prime if OrgType::Individual
		///
		/// Parameters:
		/// - `org_id`: Org id
		/// - `currency_id`: currency to be spent
		/// - `beneficiary`: receiver account
		/// - `amount`: amount to be spent
		///
		/// Emits `FundsSpended` event when successful.
		///
		/// Weight: `O(1)`
		#[pallet::weight(T::WeightInfo::spend_funds())]
		#[transactional]
		pub fn spend_funds(
			origin: OriginFor<T>,
			org_id: T::Hash,
			currency_id: T::CurrencyId,
			beneficiary: T::AccountId,
			amount: T::Balance
		) -> DispatchResult {
			let org = Orgs::<T>::get(&org_id).ok_or(Error::<T>::OrganizationUnknown)?;
			let treasury_id = OrgTreasury::<T>::get(org_id).ok_or(Error::<T>::TreasuryUnknown)?;
			Self::ensure_root_or_prime(origin, org.prime, org.org_type)?;

			T::Currency::transfer(currency_id, &treasury_id, &beneficiary, amount
				).map_err(|_| Error::<T>::BalanceLow)?;
			
			let block_number = frame_system::Pallet::<T>::block_number();
			Self::deposit_event(Event::FundsSpended { org_id, beneficiary, amount, currency_id, block_number });

			Ok(())
		}
	}
}

impl<T: Config> Pallet<T> {

	fn do_create_org(org_id: T::Hash, org: &Org<T>, treasury_id: T::AccountId, deposit: T::Balance,
	) -> Result<(), DispatchError> {
		let creator = org.creator.clone();
		let created_at = org.created.clone();

		OrgTreasury::<T>::insert(&org_id, &treasury_id);
		OrgStates::<T>::insert(&org_id, OrgState::Active);
		OrgCount::<T>::set(org.index.checked_add(1).ok_or(Overflow)?);

		T::Currency::transfer(
			org.gov_currency, &creator, &treasury_id, deposit,
		).map_err(|_| Error::<T>::BalanceLow)?;

		Orgs::<T>::insert(&org_id, org);

		Self::deposit_event(Event::OrgCreated { org_id, creator, treasury_id, created_at, realm_index: 0 });
		Ok(())
	}

	fn do_add_member(org_id: T::Hash, who: T::AccountId, member_state: MemberState
	) -> Result<u32, DispatchError> {
		let mut members = Members::<T>::get(&org_id);
		let location = members.binary_search(&who).err().ok_or(Error::<T>::AlreadyMember)?;
		members
			.try_insert(location, who.clone())
			.map_err(|_| Error::<T>::MembershipLimitReached)?;
		let members_count = members.len() as u32;

		Members::<T>::insert(&org_id, &members);
		OrgMemberCount::<T>::insert(&org_id, members_count);
		MemberStates::<T>::insert(&org_id, &who, member_state);
		
		let block_number = frame_system::Pallet::<T>::block_number();
		Self::deposit_event(Event::MemberAdded { org_id, who, block_number });
		
		Ok(members_count)
	}

	fn do_remove_member(org_id: T::Hash, who: T::AccountId) -> Result<u32, DispatchError> {
		let mut members = Members::<T>::get(&org_id);
		let location = members.binary_search(&who).ok().ok_or(Error::<T>::NotMember)?;
		members.remove(location);
		let members_count = members.len() as u32;

		Members::<T>::insert(&org_id, &members);
		OrgMemberCount::<T>::insert(&org_id, members_count);
		MemberStates::<T>::remove(&org_id, &who);

		let block_number = frame_system::Pallet::<T>::block_number();
		Self::deposit_event(Event::MemberRemoved { org_id, who, block_number });

		Ok(members_count)
	}

	fn pay_membership_fee(
		who: &T::AccountId,
		treasury_id: &T::AccountId,
		fee: Option<T::Balance>,
		fee_model: FeeModel,
		gov_currency_id: T::CurrencyId
	) -> Result<(), DispatchError> {
		match fee_model {
			FeeModel::NoFees => {},
			FeeModel::Reserve => {
				T::Currency::reserve(gov_currency_id, &who, fee.unwrap()
					).map_err(|_| Error::<T>::BalanceLow)?;
			},
			FeeModel::Transfer => {
				T::Currency::transfer(
					gov_currency_id, &who, &treasury_id, fee.unwrap()
				).map_err(|_| Error::<T>::BalanceLow)?;
			}
		};
		Ok(())
	}

	fn ensure_root_or_prime(origin: T::Origin, prime: T::AccountId, org_type: OrgType) -> Result<(), BadOrigin> {
		match origin.into() {
			Ok(RawOrigin::Root) => Ok(()),
			Ok(RawOrigin::Signed(t)) => {
				if org_type == OrgType::Individual && t == prime {
					return Ok(());
				}
				Err(BadOrigin)
			},
			_ => Err(BadOrigin),
		}
	}

	fn ensure_root_or_governance(origin: T::Origin) -> Result<(), BadOrigin> {
		match origin.into() {
			Ok(RawOrigin::Root) => Ok(()),
			// TODO: implement governance origin type
			_ => Err(BadOrigin),
		}
	}

	fn ensure_root_or_self(origin: T::Origin, who: T::AccountId) -> Result<(), BadOrigin> {
		match origin.into() {
			Ok(RawOrigin::Root) => Ok(()),
			Ok(RawOrigin::Signed(t)) => {
				if t == who {
					return Ok(());
				}
				Err(BadOrigin)
			},
			_ => Err(BadOrigin),
		}
	}

}


impl<T: Config> ControlTrait<T::AccountId, T::Hash> for Pallet<T> {

	fn org_prime_account(org_id: &T::Hash) -> Option<T::AccountId> {
		if let Some(org) = Orgs::<T>::get(org_id) {
			return Some(org.prime)
		} else { return None }
	}
	fn org_treasury_account(org_id: &T::Hash) -> Option<T::AccountId> {
		OrgTreasury::<T>::get(org_id)
	}
	fn org_member_count(org_id: &T::Hash) -> u32 {
		OrgMemberCount::<T>::get(org_id)
	}
	fn is_org_active(org_id: &T::Hash) -> bool {
		OrgStates::<T>::get(org_id) == OrgState::Active
	}
	fn is_org_member_active(org_id: &T::Hash, account_id: &T::AccountId) -> bool {
		MemberStates::<T>::get(org_id, account_id) == MemberState::Active
	}
}

impl<T: Config> ControlBenchmarkingTrait<T::AccountId, T::Hash> for Pallet<T> {
	/// ** Should be used for benchmarking only!!! **
	#[cfg(feature = "runtime-benchmarks")]
	fn create_org(caller: T::AccountId) -> Result<T::Hash, DispatchError> {
		let text = BoundedVec::truncate_from(vec![1, 2, 3, 4]);
		let index = OrgCount::<T>::get();
		let now = frame_system::Pallet::<T>::block_number();
		let org: Org<T> = types::Org {
			index, creator: caller.clone(), prime: caller.clone(), name: text.clone(), cid: text.clone(),
			org_type: OrgType::Individual, fee_model: FeeModel::NoFees, membership_fee: None,
			gov_currency: T::ProtocolTokenId::get(), pay_currency: T::PaymentTokenId::get(),
			access_model: AccessModel::Prime, member_limit: T::MaxMembers::get(),
			created: now.clone(), mutated: now
		};
		let org_id = <T as frame_system::Config>::Hashing::hash_of(&org);
		Pallet::<T>::create_org(
			frame_system::RawOrigin::Signed(caller).into(),
			org.name, org.cid, org.org_type, org.access_model, org.fee_model, None,
			None, Some(org.gov_currency), Some(org.pay_currency), None
		)?;
		Ok(org_id)
	}

	/// ** Should be used for benchmarking only!!! **
	#[cfg(feature = "runtime-benchmarks")]
	fn fill_org_with_members(org_id: &T::Hash, accounts: Vec<T::AccountId>) -> Result<(), DispatchError> {
		for acc in BoundedVec::<T::AccountId, T::MaxMembers>::truncate_from(accounts) {
			Pallet::<T>::add_member(
				frame_system::RawOrigin::Root.into(),
				org_id.clone(),
				acc.clone()
			).unwrap();
		}
		Ok(())
	}
}
