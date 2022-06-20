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
#[cfg(feature = "runtime-benchmarks")]
mod benchmarking;
pub mod weights;

use codec::{HasCompact, Codec};
use frame_support::{
	dispatch::{DispatchResult, DispatchError},
	ensure, PalletId,
	traits::{Get},
};
use gamedao_traits::{ControlTrait, ControlBenchmarkingTrait};
use orml_traits::{MultiCurrency, MultiReservableCurrency};
use scale_info::TypeInfo;
use sp_runtime::traits::{AccountIdConversion, AtLeast32BitUnsigned, Hash};
use sp_std::{fmt::Debug, vec, vec::Vec};
#[cfg(feature = "std")]
use serde::{Deserialize, Serialize};

pub use pallet::*;
pub use weights::WeightInfo;

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
			+ Default
			+ Copy
			+ HasCompact
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

		/// The Game3 Foundation Treasury AccountId.
		#[pallet::constant]
		type Game3FoundationTreasury: Get<Self::AccountId>;

		/// The GameDAO Treasury AccountId.
		#[pallet::constant]
		type GameDAOTreasury: Get<Self::AccountId>;

		/// The max number of DAOs created per one account.
		#[pallet::constant]
		type MaxDAOsPerAccount: Get<u32>;

		/// The max number of members per one DAO.
		#[pallet::constant]
		type MaxMembersPerDAO: Get<u32>;

		#[pallet::constant]
		type MaxCreationsPerBlock: Get<u32>;

		/// The CurrencyId which is used as a protokol token.
		#[pallet::constant]
		type ProtocolTokenId: Get<Self::CurrencyId>;

		/// The CurrencyId which is used as a payment token.
		#[pallet::constant]
		type PaymentTokenId: Get<Self::CurrencyId>;

		/// The min amount of the deposit which is locked during Org creation (in Protocol tokens).
		#[pallet::constant]
		type MinimumDeposit: Get<Self::Balance>;
	}

	/// Org by its id.
	///
	/// Org: map Hash => Org
	#[pallet::storage]
	pub(super) type Orgs<T: Config> =
		StorageMap<_, Blake2_128Concat, T::Hash, Org<T::Hash, T::AccountId, T::BlockNumber>, ValueQuery>;

	/// Org id by its nonce.
	///
	/// OrgByNonce: map u128 => Hash
	#[pallet::storage]
	pub(super) type OrgByNonce<T: Config> = StorageMap<_, Blake2_128Concat, u128, T::Hash>;

	/// Org config by its id.
	///
	/// OrgConfiguration: map Hash => OrgConfig
	#[pallet::storage]
	pub(super) type OrgConfiguration<T: Config> =
		StorageMap<_, Blake2_128Concat, T::Hash, OrgConfig<T::Balance, T::CurrencyId>, OptionQuery>;

	/// Org state (Inactive | Active | Locked) by org id.
	///
	/// OrgState: map Hash => ControlState
	#[pallet::storage]
	pub(super) type OrgState<T: Config> =
		StorageMap<_, Blake2_128Concat, T::Hash, ControlState, ValueQuery, GetDefault>;

	/// Org access model (Open | Voting | Controller) by org Hash (id).
	///
	/// OrgAccess: map Hash => AccessModel
	#[pallet::storage]
	pub(super) type OrgAccess<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, AccessModel, ValueQuery>;

	/// Org members list by org id.
	///
	/// OrgMembers: map Hash => Vec<AccountId>
	#[pallet::storage]
	pub(super) type OrgMembers<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, Vec<T::AccountId>, ValueQuery>;

	/// Org members count by org id.
	///
	/// OrgMemberCount: map Hash => u64
	#[pallet::storage]
	pub(super) type OrgMemberCount<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, u64, ValueQuery>;

	/// Member state (Inactive | Active ...) by org Hash and member account.
	///
	/// OrgMemberState: map (Hash, AccountId) => ControlMemberState
	#[pallet::storage]
	pub(super) type OrgMemberState<T: Config> =
		StorageMap<_, Blake2_128Concat, (T::Hash, T::AccountId), ControlMemberState, ValueQuery, GetDefault>;

	/// Org list where account is a member.
	///
	/// Memberships: map AccountId => Vec<Hash>
	#[pallet::storage]
	pub(super) type Memberships<T: Config> = StorageMap<_, Blake2_128Concat, T::AccountId, Vec<T::Hash>, ValueQuery>;

	/// Creator account of an Org.
	///
	/// OrgCreator: map Hash => AccountId
	#[pallet::storage]
	pub(super) type OrgCreator<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, T::AccountId, ValueQuery>;

	/// Controller account of an Org.
	///
	/// OrgController: map Hash => AccountId
	#[pallet::storage]
	pub(super) type OrgController<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, T::AccountId, ValueQuery>;

	/// Treasury account of an Org.
	///
	/// OrgTreasury: map Hash => AccountId
	#[pallet::storage]
	pub(super) type OrgTreasury<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, T::AccountId, ValueQuery>;

	/// Orgs created by account.
	///
	/// OrgsCreated: map AccountId => Vec<Hash>
	#[pallet::storage]
	pub(super) type OrgsCreated<T: Config> = StorageMap<_, Blake2_128Concat, T::AccountId, Vec<T::Hash>, ValueQuery>;

	/// Number of Orgs created by account.
	///
	/// OrgsByCreatedCount: map AccountId => u64
	#[pallet::storage]
	pub(super) type OrgsByCreatedCount<T: Config> = StorageMap<_, Blake2_128Concat, T::AccountId, u64, ValueQuery>;

	/// Orgs controlled by account.
	///
	/// OrgsControlled: map AccountId => Vec<Hash>
	#[pallet::storage]
	pub(super) type OrgsControlled<T: Config> = StorageMap<_, Blake2_128Concat, T::AccountId, Vec<T::Hash>, ValueQuery>;

	/// Number of Orgs controlled by account.
	///
	/// OrgsControlledCount: map AccountId => u64
	#[pallet::storage]
	pub(super) type OrgsControlledCount<T: Config> = StorageMap<_, Blake2_128Concat, T::AccountId, u64, ValueQuery>;

	/// Nonce. Increase per each org creation.
	///
	/// Nonce: u128
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
						Pallet::<T>::do_add_member(
							org_id, controller_id.clone(), fee.clone(), fee_model.clone(), ControlMemberState::Active
						).unwrap();
						Pallet::<T>::mint_nft().unwrap();
				});
		}
	}

	#[pallet::event]
	#[pallet::generate_deposit(pub(super) fn deposit_event)]
	pub enum Event<T: Config> {
		/// Org was successfully created.
		OrgCreated {
			sender_id: T::AccountId,
			org_id: T::Hash,
			treasury_id: T::AccountId,
			created_at: T::BlockNumber,
			realm_index: u64,
		},
		/// Org was successfully updated.
		OrgUpdated(T::AccountId, T::Hash, T::BlockNumber),
		/// Org was enabled and it's state become Active.
		OrgEnabled(T::Hash),
		/// Org was disabled and it's state become Inactive.
		OrgDisabled(T::Hash),
		/// A member has been added to the Org.
		AddMember {
			org_id: T::Hash,
			account_id: T::AccountId,
			added_at: T::BlockNumber,
		},
		/// Member's state has been changed.
		UpdateMember(T::Hash, T::AccountId, T::BlockNumber),
		/// A member has been removed from the Org.
		RemoveMember {
			org_id: T::Hash,
			account_id: T::AccountId,
			removed_at: T::BlockNumber,
		},
		/// Controller's state has been changed.
		ControllerUpdated(T::Hash, T::AccountId),
		/// Account is a member of the Org.
		IsAMember {
			org_id: T::Hash,
			account_id: T::AccountId,
		},
	}

	#[pallet::error]
	pub enum Error<T> {
		/// Org Exists.
		OrganizationExists,
		/// Org Unknown.
		OrganizationUnknown,
		/// Org Inactive.
		OrganizationInactive,
		/// Insufficient Balance to create Org.
		BalanceTooLow,
		/// Member Add Overflow.
		MemberAddOverflow,
		/// Membership Limit Reached.
		MembershipLimitReached,
		/// Member Exists.
		MemberExists,
		/// Member Unknonw.
		MemberUnknown,
		/// Duplicate Address.
		DuplicateAddress,
		/// Unknown Error.
		UnknownError,
		/// Guru Meditation.
		GuruMeditation,
		/// Treasury account already exists.
		TreasuryExists,
		/// Minimum deposit to Treasury too low.
		MinimumDepositTooLow
	}

	#[pallet::call]
	impl<T: Config> Pallet<T> {

		/// Create an on chain organization
		/// 
		/// Parameters:
		/// - `origin`: Org creator.
		/// - `controller_id`: Org controller.
		/// - `name`: Org name.
		/// - `cid`: IPFS content identifier.
		/// - `org_type`: Individual | Company | Dao | Hybrid.
		/// - `access`: Open (anyone can join) | Voting (membership voting) |
		/// 	Controller (controller invites).
		/// - `fee_model`: NoFees | Reserve (amount reserved in user account) |
		/// 	Transfer (amount transfered to Org treasury).
		/// - `fee`: fees amount to be applied to new members based on fee model (in Protocol tokens).
		/// - `gov_asset`: control assets to empower actors.
		/// - `pay_asset`: asset used for payments.
		/// - `member_limit`: max members, if 0 == no limit.
		/// - `deposit`: initial deposit for the org treasury (in Protocol tokens).
		///
		/// Emits `OrgCreated` event when successful.
		///
		/// Weight: `O(1)`
		#[pallet::weight(T::WeightInfo::create_org())]
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

			let creator_balance = T::Currency::free_balance(T::ProtocolTokenId::get(), &sender);
			ensure!(creator_balance >= org_deposit, Error::<T>::BalanceTooLow);

			// TODO validation: name, cid ?
			let nonce = Self::get_and_increment_nonce();
			let treasury_account_id = T::PalletId::get().into_sub_account(nonce as i32);
			ensure!(!<frame_system::Pallet<T>>::account_exists(&treasury_account_id), Error::<T>::TreasuryExists);

			let org_id = T::Hashing::hash_of(&treasury_account_id);
			ensure!(!Orgs::<T>::contains_key(&org_id), Error::<T>::OrganizationExists);

			Self::do_create_org(
				sender.clone(), org_id.clone(), controller_id.clone(), treasury_account_id.clone(), name, cid,
				org_type, access, fee_model.clone(), fee.clone(), gov_asset, pay_asset, member_limit, org_deposit, nonce
			);
			Self::do_add_member(org_id.clone(), controller_id, fee, fee_model, ControlMemberState::Active)?;
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

		/// Enable Org
		///
		/// Enables an Org to be used and changes it's state to Active.
		/// Root origin only.
		///
		/// Parameters:
		/// `org_id`: Org hash.
		///
		/// Emits `OrgEnabled` event when successful.
		///
		/// Weight: `O(1)`
		#[pallet::weight(T::WeightInfo::enable_org())]
		pub fn enable_org(origin: OriginFor<T>, org_id: T::Hash) -> DispatchResult {
			ensure_root(origin)?;
			OrgState::<T>::insert(org_id.clone(), ControlState::Active);
			Self::deposit_event(Event::OrgEnabled(org_id));
			Ok(())
		}

		/// Disable Org
		///
		/// Disables an Org to be used and changes it's state to Inactive.
		/// Root origin only.
		///
		/// Parameters:
		/// `org_id`: Org hash.
		///
		/// Emits `OrgDisabled` event when successful.
		///
		/// Weight: `O(1)`
		#[pallet::weight(T::WeightInfo::disable_org())]
		pub fn disable_org(origin: OriginFor<T>, org_id: T::Hash) -> DispatchResult {
			ensure_root(origin)?;
			OrgState::<T>::insert(org_id.clone(), ControlState::Inactive);
			Self::deposit_event(Event::OrgDisabled(org_id));
			Ok(())
		}

		/// Add Member to Org
		///
		/// Parameters:
		/// - `org_id`: Org id
		/// - `account`: Account to be added
		///
		/// Emits `AddMember` event when successful.
		///
		/// Weight: `O(log n)`
		#[pallet::weight(T::WeightInfo::add_member(
			T::MaxMembersPerDAO::get()
		))]
		pub fn add_member(
			origin: OriginFor<T>,
			org_id: T::Hash,
			account_id: T::AccountId
		) -> DispatchResultWithPostInfo {
			ensure_signed(origin)?;
			ensure!(Orgs::<T>::contains_key(&org_id), Error::<T>::OrganizationUnknown);
			ensure!(!OrgMembers::<T>::get(org_id).contains(&account_id), Error::<T>::MemberExists);
			ensure!(
				OrgMemberCount::<T>::get(&org_id) < T::MaxMembersPerDAO::get().into(),
				Error::<T>::MembershipLimitReached
			);
			let config = OrgConfiguration::<T>::get(&org_id).ok_or(Error::<T>::OrganizationUnknown)?;
			let member_state = match config.access {
				AccessModel::Open => ControlMemberState::Active,
				_ => {
					ControlMemberState::Pending
				},
			};
			let members_count = Self::do_add_member(
				org_id.clone(), account_id.clone(), config.fee, config.fee_model, member_state
			)?;

			Self::deposit_event(Event::AddMember {
				org_id,
				account_id,
				added_at: <frame_system::Pallet<T>>::block_number(),
			});

			Ok(Some(T::WeightInfo::add_member(members_count)).into())
		}

		/// Remove member from Org
		///
		/// Parameters:
		/// - `org_id`: Org id
		/// - `account`: Account to be removed
		///
		/// Emits `RemoveMember` event when successful.
		///
		/// Weight: `O(log n)`
		#[pallet::weight(T::WeightInfo::remove_member(
			T::MaxMembersPerDAO::get()
		))]
		pub fn remove_member(origin: OriginFor<T>, org_id: T::Hash, account_id: T::AccountId) -> DispatchResultWithPostInfo {
			ensure_signed(origin)?;
			ensure!(Orgs::<T>::contains_key(&org_id), Error::<T>::OrganizationUnknown);
			ensure!(OrgMembers::<T>::get(org_id).contains(&account_id), Error::<T>::MemberUnknown);

			let config = OrgConfiguration::<T>::get(&org_id).ok_or(Error::<T>::OrganizationUnknown)?;
			let member_count = Self::do_remove_member(
				org_id.clone(), account_id.clone(), config.fee, config.fee_model
			)?;

			Self::deposit_event(Event::RemoveMember {
				org_id: org_id,
				account_id,
				removed_at: <frame_system::Pallet<T>>::block_number(),
			});
			Ok(Some(T::WeightInfo::remove_member(member_count)).into())
		}

		// TODO: fn update_state(origin: OriginFor<T>, org_id: T::Hash, state: u8),
		// Disable an org

		// TODO: No state changes for this extrinsic, do we need it at all?

		/// Checks membership
		///
		/// Checks if origin is a member of the Org.
		///
		/// Parameters:
		/// - `org_id`: Org hash
		/// - `account`: Account id
		///
		/// Emits `IsAMember` event when successful.
		///
		/// Weight: `O(1)`
		#[pallet::weight(T::WeightInfo::check_membership())]
		pub fn check_membership(origin: OriginFor<T>, org_id: T::Hash, account_id: T::AccountId) -> DispatchResult {
			ensure_signed(origin)?;
			let members = OrgMembers::<T>::get(org_id);
			ensure!(members.contains(&account_id), Error::<T>::MemberUnknown);
			Self::deposit_event(Event::IsAMember {
				org_id: org_id,
				account_id,
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
	/// Create and store a new Org
	///
	/// Transfers deposit from creator to the Org treasury.
	///
	/// Parameters:
	/// - `creator`: Org creator.
	/// - `controller_id`: Org controller.
	/// - `treasury_id`: Org treasury.
	/// - `name`: Org name.
	/// - `cid`: IPFS content identifier.
	/// - `org_type`: Individual | Company | Dao | Hybrid.
	/// - `access`: Open (anyone can join) | Voting (membership voting) |
	/// 	Controller (controller invites).
	/// - `fee_model`: NoFees | Reserve (amount reserved in user account) |
	/// 	Transfer (amount transfered to Org treasury).
	/// - `fee`:
	/// - `gov_asset`: control assets to empower actors.
	/// - `pay_asset`: asset used for payments.
	/// - `member_limit`: max members, if 0 == no limit.
	/// - `deposit`: initial deposit for the org treasury.
	/// - `nonce`: current Nonce.
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

	/// Update member's state
	///
	/// Parameters:
	/// - `org_id`: Org id.
	/// - `account_id`: Member account id.
	/// - `member_state`: Inactive | Active | Pending | Kicked | Banned | Exited.
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

	fn pay_membership_fee(
		org_id: &T::Hash,
		account_id: &T::AccountId,
		currency_id: T::CurrencyId,
		fee: T::Balance,
		fee_model: FeeModel
	) -> Result<(), DispatchError> {
		if fee_model != FeeModel::NoFees {
			ensure!(
				T::Currency::free_balance(currency_id, account_id) > fee,
				Error::<T>::BalanceTooLow
			);
		}
		match fee_model {
			// no fees
			FeeModel::NoFees => {},
			// reserve
			FeeModel::Reserve => {
				T::Currency::reserve(currency_id, &account_id, fee)?;
			},
			// transfer to treasury
			FeeModel::Transfer => {
				let treasury = OrgTreasury::<T>::get(org_id);
				let res = T::Currency::transfer(currency_id, &account_id, &treasury, fee);
				debug_assert!(res.is_ok());
			}
		};
		Ok(())
	}

	fn do_add_member(
		org_id: T::Hash,
		account_id: T::AccountId,
		fee: T::Balance,
		fee_model: FeeModel,
		member_state: ControlMemberState
	) -> Result<u32, DispatchError> {
		// TODO: use CurrencyId based on the Org configuration
		let currency_id = T::ProtocolTokenId::get();
		Self::pay_membership_fee(&org_id, &account_id, currency_id, fee, fee_model)?;

		let mut members = OrgMembers::<T>::get(&org_id);
		match members.binary_search(&account_id) {
			// already a member, return
			Ok(_) => Err(Error::<T>::MemberExists.into()),

			// not a member, insert at index
			Err(index) => {
				members.insert(index, account_id.clone());
				// OrgMembers::<T>::mutate( &org_id, |members| members.push(account_id.clone()) );
				OrgMembers::<T>::insert(&org_id, members.clone());

				let count = members.len();
				OrgMemberCount::<T>::insert(&org_id, count as u64);

				let mut memberships = Memberships::<T>::get(&account_id);
				memberships.push(org_id.clone());
				Memberships::<T>::insert(&account_id, memberships);

				// Member state
				OrgMemberState::<T>::insert((org_id.clone(), account_id.clone()), member_state);

				Ok(count as u32)
			}
		}
	}

	/// Remove member from Org
	///
	/// Parameters:
	/// - `org_id`: Org id.
	/// - `account_id`: Member account id.
	fn do_remove_member(
		org_id: T::Hash,
		account_id: T::AccountId,
		fee: T::Balance,
		fee_model: FeeModel,
	) -> Result<u32, DispatchError> {
		// TODO: use CurrencyId based on the Org configuration
		let currency_id = T::ProtocolTokenId::get();
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

				let config = OrgConfiguration::<T>::get(&org_id).ok_or(Error::<T>::OrganizationUnknown)?;
				if fee_model == FeeModel::Reserve {
					T::Currency::unreserve(currency_id, &account_id, fee);
				}

				let count = members.len();
				OrgMemberCount::<T>::insert(&org_id, count as u64);

				// member state
				OrgMemberState::<T>::insert((org_id.clone(), account_id.clone()), ControlMemberState::Inactive);

				Ok(count as u32)
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

impl<T: Config> ControlBenchmarkingTrait<T::AccountId, T::Hash> for Pallet<T> {
	/// ** Should be used for benchmarking only!!! **
	#[cfg(feature = "runtime-benchmarks")]
	fn create_org(caller: T::AccountId) -> Result<T::Hash, DispatchError> {
		let org_nonce = Nonce::<T>::get();
		let name: Vec<u8> = vec![0; 255];
		let cid: Vec<u8> = vec![0; 255];
		Pallet::<T>::create_org(
			frame_system::RawOrigin::Signed(caller.clone()).into(),
			caller.into(),
			name,
			cid,
			OrgType::Individual,
			AccessModel::Open,
			FeeModel::NoFees,
			T::Balance::default(),
			T::CurrencyId::default(),
			T::CurrencyId::default(),
			100,
			None
		)?;
		let org_id = OrgByNonce::<T>::get(org_nonce).unwrap();
		Ok(org_id)

	}

	/// ** Should be used for benchmarking only!!! **
	#[cfg(feature = "runtime-benchmarks")]
	fn fill_org_with_members(org_id: &T::Hash, accounts: &Vec<T::AccountId>) -> Result<(), DispatchError> {
		for acc in accounts {
			Pallet::<T>::add_member(
				frame_system::RawOrigin::Signed(acc.clone()).into(),
				org_id.clone(),
				acc.clone()
			).unwrap();
		}
		Ok(())
	}
}
