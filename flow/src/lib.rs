//      _______  ________  ________  ________   ______   _______   _______
//    ╱╱       ╲╱        ╲╱        ╲╱        ╲_╱      ╲╲╱       ╲╲╱       ╲╲
//   ╱╱      __╱         ╱         ╱         ╱        ╱╱        ╱╱        ╱╱
//  ╱       ╱ ╱         ╱         ╱        _╱         ╱         ╱         ╱
//  ╲________╱╲___╱____╱╲__╱__╱__╱╲________╱╲________╱╲___╱____╱╲________╱
//
// This file is part of GameDAO Protocol.
// Copyright (C) 2018-2022 GameDAO AG.
// SPDX-License-Identifier: Apache-2.0

//! FLOW
//! # Crowdfunding Campaign Factory + Treasury
//!
//! Run `cargo doc --package module-crowdfunding --open` to view this pallet's
//! documentation.
//!
//! ## Overview
//!
//! This pallet provides a simple on-chain crowdfunding mechanism:
//!
//! - creator can create a campaign with individual length and
//! amount of funds in PLAY to raise
//!
//! - investor can invest his funds into one of the running campaigns
//! and become an investor
//!
//! Upon finalization:
//!
//! - creator can request allocation of funds
//! - investors can collectively approve allocation of funds
//!
//! TODO:
//! - supervisor can lock, cancel campaigns

// 1. create campaigns with custom funding goal and runtime
// 2. invest into open campaigns
#![cfg_attr(not(feature = "std"), no_std)]
#![allow(deprecated)] // TODO: clean transactional
pub mod types;
pub use types::*;

mod mock;
mod tests;
mod migration;
#[cfg(feature = "runtime-benchmarks")]
mod benchmarking;
pub mod weights;

// TODO: externalise error messages - Enum: number and text description
// mod errors;

use frame_support::{
	dispatch::{DispatchResult, DispatchError, DispatchResultWithPostInfo},
	traits::{Get, BalanceStatus, Hooks, StorageVersion, UnixTime},
	weights::Weight,
	transactional,
	BoundedVec
};

use scale_info::TypeInfo;
use sp_runtime::{traits::{AtLeast32BitUnsigned, Hash, Saturating}, Permill};

use sp_std::{vec::Vec, convert::{TryFrom, TryInto}};


use gamedao_traits::{ControlTrait, ControlBenchmarkingTrait, FlowTrait, FlowBenchmarkingTrait};
use orml_traits::{MultiCurrency, MultiReservableCurrency};

pub use pallet::*;
pub use weights::WeightInfo;

// TODO: use associated type instead
pub type Moment = u64;

#[frame_support::pallet]
pub mod pallet {
	use super::*;
	use frame_support::pallet_prelude::*;
	use frame_system::pallet_prelude::*;

	/// The current storage version.
	const STORAGE_VERSION: StorageVersion = StorageVersion::new(1);

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
		
		type UnixTime: UnixTime;

		type Control: ControlTrait<Self::AccountId, Self::Hash>
			+ ControlBenchmarkingTrait<Self::AccountId, Self::Hash>;

		/// The GameDAO Treasury AccountId.
		#[pallet::constant]
		type GameDAOTreasury: Get<Self::AccountId>;

		/// The min length of a campaign name.
		#[pallet::constant]
		type MinNameLength: Get<u32>;

		#[pallet::constant]
		type MaxCampaignsPerAddress: Get<u32>;

		#[pallet::constant]
		type MaxCampaignsPerOrg: Get<u32>;
		
		/// The max number of campaigns per one block.
		#[pallet::constant]
		type MaxCampaignsPerBlock: Get<u32>;

		/// The max number of contributions per one block.
		#[pallet::constant]
		type MaxContributionsPerBlock: Get<u32>;

		/// The max number of contributions per one Campaign.
		#[pallet::constant]
		type MaxCampaignContributions: Get<u32>;

		/// The max number of contributors for processing in one block (batch size)
		/// during Campaign finalization.
		#[pallet::constant]
		type MaxContributorsProcessing: Get<u32>;

		#[pallet::constant]
		type MaxCampaignsPerStatus: Get<u32>;

		/// The min number of blocks for campaign duration.
		#[pallet::constant]
		type MinCampaignDuration: Get<Self::BlockNumber>;

		/// The max number of blocks for campaign duration.
		#[pallet::constant]
		type MaxCampaignDuration: Get<Self::BlockNumber>;

		/// The min contribution amount in payment tokens
		#[pallet::constant]
		type MinContribution: Get<Self::Balance>;

		/// The CurrencyId which is used as a protokol token.
		#[pallet::constant]
		type ProtocolTokenId: Get<Self::CurrencyId>;
		
		/// The CurrencyId which is used as a payment token.
		#[pallet::constant]
		type PaymentTokenId: Get<Self::CurrencyId>;

		/// The amount of comission to be paid from the Org treasury to GameDAO treasury 
		/// after successfull Campaign finalization
		#[pallet::constant]
		type CampaignFee: Get<Permill>;

		/// The maximum length of a name or symbol stored on-chain.
		#[pallet::constant]
		type StringLimit: Get<u32>;
	}

	/// Campaign by its id.
	/// 
	/// Campaigns: map Hash => Campaign
	#[pallet::storage]
	pub(super) type Campaigns<T: Config> = StorageMap<
		_,
		Blake2_128Concat,
		T::Hash,
		Campaign<T::Hash, T::AccountId, T::Balance, T::BlockNumber, Moment, BoundedVec<u8, T::StringLimit>>,
		OptionQuery,
	>;

	/// Org id by campaign id.
	/// 
	/// CampaignOrg: map Hash => Hash
	#[pallet::storage]
	pub(super) type CampaignOrg<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, T::Hash, ValueQuery>;

	/// Campaign owner (org controller) by campaign id.
	/// 
	/// CampaignOwner: map Hash => AccountId
	#[pallet::storage]
	pub(super) type CampaignOwner<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, T::AccountId, OptionQuery>;

	/// Campaign admin (supervision) by campaign id.
	/// 
	/// CampaignAdmin: map Hash => AccountId
	#[pallet::storage]
	pub(super) type CampaignAdmin<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, T::AccountId, OptionQuery>;

	/// Campaign state by campaign id.
	/// 0 init, 1 active, 2 paused, 3 complete success, 4 complete failed, 5 authority lock
	/// 
	/// CampaignState: map Hash => FlowState
	#[pallet::storage]
	pub(super) type CampaignState<T: Config> =
		StorageMap<_, Blake2_128Concat, T::Hash, FlowState, ValueQuery, GetDefault>;

	/// List of campaign by certain campaign state and org.
	/// 0 init, 1 active, 2 paused, 3 complete success, 4 complete failed, 5 authority lock
	/// 
	/// CampaignsByState: double_map FlowState, Hash => BoundedVec<Hash>
	#[pallet::storage]
	pub(super) type CampaignsByState<T: Config> = StorageDoubleMap<_,
		Blake2_128Concat, FlowState,
		Blake2_128Concat, T::Hash,
		BoundedVec<T::Hash, T::MaxCampaignsPerStatus>,
		ValueQuery
	>;

	/// Campaigns ending in block x.
	/// 
	/// CampaignsByBlock: map BlockNumber => BoundedVec<Hash>
	#[pallet::storage]
	pub(super) type CampaignsByBlock<T: Config> =
		StorageMap<_, Blake2_128Concat, T::BlockNumber, BoundedVec<T::Hash, T::MaxCampaignsPerBlock>, ValueQuery>;

	/// Total number of campaigns -> campaign id.
	/// 
	/// CampaignsArray: map u64 => Hash
	#[pallet::storage]
	pub(super) type CampaignsArray<T: Config> = StorageMap<_, Blake2_128Concat, u64, T::Hash, ValueQuery>;

	/// Total number of campaigns.
	/// 
	/// CampaignsArray: u64
	#[pallet::storage]
	pub type CampaignsCount<T: Config> = StorageValue<_, u64, ValueQuery>;

	/// Campaign id -> total number of campaigns.
	/// 
	/// CampaignsArray: map Hash => u64
	#[pallet::storage]
	pub(super) type CampaignsIndex<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, u64, ValueQuery>;

	/// Offset value - number of processed and sucessfully finalized contributions.
	/// Used during campaign finalization for processing contributors in batches.
	/// When MaxContributorsProcessing is achieved, set this offset to save the progress.
	/// 
	/// ContributorsFinalized: map Hash => u32
	#[pallet::storage]
	pub(super) type ContributorsFinalized<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, u32, ValueQuery, GetDefault>;

	/// Offset value - number of processed and reverted contributions.
	/// 
	/// ContributorsReverted: map Hash => u32
	#[pallet::storage]
	pub(super) type ContributorsReverted<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, u32, ValueQuery, GetDefault>;
	
	/// Campaign id by org id.
	/// 
	/// CampaignsOwnedArray: map Hash => Hash
	#[pallet::storage]
	pub(super) type CampaignsOwnedArray<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, T::Hash, ValueQuery>;
	// TODO: rename?

	/// Total number of campaigns by org id.
	/// 
	/// CampaignsOwnedCount: map Hash => u64
	#[pallet::storage]
	pub(super) type CampaignsOwnedCount<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, u64, ValueQuery>;

	/// (org id, campaign id) -> total number of campaigns.
	/// 
	/// CampaignsOwnedIndex: map (Hash, Hash) => u64
	#[pallet::storage]
	pub(super) type CampaignsOwnedIndex<T: Config> =
		StorageMap<_, Blake2_128Concat, (T::Hash, T::Hash), u64, ValueQuery>;

	/// The list of campaigns contributed by account id.
	/// 
	/// CampaignsContributed: map AccountId => BoundedVec<Hash>
	#[pallet::storage]
	pub(super) type CampaignsContributed<T: Config> =
		StorageMap<_, Blake2_128Concat, T::AccountId, BoundedVec<T::Hash, T::MaxCampaignsPerAddress>, ValueQuery>;

	/// Campaigns related to an organization.
	/// 
	/// CampaignsByOrg: map Hash => BoundedVec<Hash>
	#[pallet::storage]
	pub(super) type CampaignsByOrg<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, BoundedVec<T::Hash, T::MaxCampaignsPerOrg>, ValueQuery>;

	/// (account id, total number of campaigns contributed by account id) -> campaign id.
	/// 
	/// CampaignsContributedArray: map (AccountId, u64) => Hash
	#[pallet::storage]
	pub(super) type CampaignsContributedArray<T: Config> =
		StorageMap<_, Blake2_128Concat, (T::AccountId, u64), T::Hash, ValueQuery>;

	/// Total number of campaigns contributed by account id.
	/// 
	/// CampaignsContributedCount: map AccountId => u64
	#[pallet::storage]
	pub(super) type CampaignsContributedCount<T: Config> =
		StorageMap<_, Blake2_128Concat, T::AccountId, u64, ValueQuery>;

	/// (account id, campaign id) -> total number of campaigns contributed by account id.
	/// 
	/// CampaignsContributedIndex: map (AccountId, Hash) => u64
	#[pallet::storage]
	pub(super) type CampaignsContributedIndex<T: Config> =
		StorageMap<_, Blake2_128Concat, (T::AccountId, T::Hash), u64, ValueQuery>;

	/// Total contributions balance per campaign.
	/// 
	/// CampaignBalance: map Hash => Balance
	#[pallet::storage]
	pub(super) type CampaignBalance<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, T::Balance, ValueQuery>;

	/// Total contribution made by account id for particular campaign.
	/// (campaign id, account id) -> contribution.
	/// 
	/// CampaignContribution: map (Hash, AccountId) => Balance
	#[pallet::storage]
	pub(super) type CampaignContribution<T: Config> =
		StorageMap<_, Blake2_128Concat, (T::Hash, T::AccountId), T::Balance, ValueQuery>;

	/// Campaign contributors by campaign id.
	/// 
	/// CampaignContributors: map Hash => BoundedVec<AccountId>
	#[pallet::storage]
	pub(super) type CampaignContributors<T: Config> =
		// TODO: Contributor vs Contribution?
		StorageMap<_, Blake2_128Concat, T::Hash, BoundedVec<T::AccountId, T::MaxCampaignContributions>, ValueQuery>;

	/// Total number of contributors for particular campaign.
	/// 
	/// CampaignContributors: map Hash => u64
	#[pallet::storage]
	pub(super) type CampaignContributorsCount<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, u64, ValueQuery>;

	// Max campaign block limit
	// CampaignMaxCampaignDuration get(fn get_max_duration) config(): T::BlockNumber
	// = T::BlockNumber::from(T::MaxCampaignDuration::get());

	/// Nonce. Increase per each campaign creation.
	/// 
	/// Nonce: u128
	#[pallet::storage]
	#[pallet::getter(fn nonce)]
	pub(super) type Nonce<T: Config> = StorageValue<_, u128, ValueQuery>;

	#[pallet::event]
	#[pallet::generate_deposit(pub(super) fn deposit_event)]
	pub enum Event<T: Config> {
		/// Campaign was destroyed.
		CampaignDestroyed {
			campaign_id: T::Hash,
		},
		/// Campaign was successfully created.
		CampaignCreated {
			campaign_id: T::Hash,
			creator: T::AccountId,
			admin: T::AccountId,
			target: T::Balance,
			deposit: T::Balance,
			expiry: T::BlockNumber,
			name: BoundedVec<u8, T::StringLimit>,
		},
		/// Campaign was contributed.
		CampaignContributed {
			campaign_id: T::Hash,
			sender: T::AccountId,
			contribution: T::Balance,
			block_number: T::BlockNumber,
		},
		/// Campaign was finalized.
		CampaignFinalized {
			campaign_id: T::Hash,
			campaign_balance: T::Balance,
			block_number: T::BlockNumber,
			success: bool,
		},
		/// Campaign failed - successfully reverted.
		CampaignFailed {
			campaign_id: T::Hash,
			campaign_balance: T::Balance,
			block_number: T::BlockNumber,
			success: bool,
		},
		/// Campaign is in the middle of reverting process.
		CampaignReverting {
			campaign_id: T::Hash,
			campaign_balance: T::Balance,
			block_number: T::BlockNumber,
		},
		/// Campaign is in the middle of finalization process.
		CampaignFinalising {
			campaign_id: T::Hash,
			campaign_balance: T::Balance,
			block_number: T::BlockNumber,
		},
		/// Campaign was updated with a new state.
		CampaignUpdated {
			campaign_id: T::Hash,
			state: FlowState,
			block_number: T::BlockNumber,
		},
		Message(BoundedVec<u8, T::StringLimit>),
	}

	#[pallet::error]
	pub enum Error<T> {

		// general
		/// Must contribute at least the minimum amount of campaigns.
		ContributionTooSmall,
		/// Balance too low.
		BalanceTooLow,
		/// Treasury balance too low.
		TreasuryBalanceTooLow,
		/// The campaign id specified does not exist.
		InvalidId,
		/// The campaign's contribution period has ended; no more contributions
		/// will be accepted.
		ContributionPeriodOver,
		/// You may not withdraw or dispense Campaigns while the Campaign is
		/// still active.
		CampaignStillActive,
		/// You cannot withdraw Campaigns because you have not contributed any.
		NoContribution,
		/// You cannot dissolve a Campaign that has not yet completed its
		/// retirement period.
		CampaignNotRetired,
		/// Campaign expired.
		CampaignExpired,
		/// Cannot dispense Campaigns from an unsuccessful Campaign.
		UnsuccessfulCampaign,
		/// Campaigns limit reached.
		TooManyCampaigns,
		/// Contributors limit reached.
		TooManyContributors,

		//	create
		/// Campaign must end after it starts.
		EndTooEarly,
		/// Campaign expiry has be lower than the block number limit.
		EndTooLate,
		/// Max campaigns per block exceeded.
		CampaignsPerBlockExceeded,
		/// Max campaigns per org exceeded.
		CampaignsPerOrgExceeded,
		/// Max campaigns per state exceeded.
		CampaignsPerStateExceeded,
		/// Name too short.
		NameTooShort,
		/// Deposit exceeds the campaign target.
		DepositTooHigh,
		/// Campaign id exists.
		IdExists,

		//
		//	mint
		/// Overflow adding a new campaign to total fundings.
		AddCampaignOverflow,
		/// Overflow adding a new owner.
		AddOwnedOverflow,
		/// Overflow adding to the total number of contributors of a camapaign.
		UpdateContributorOverflow,
		/// Overflow adding to the total number of contributions of a camapaign.
		AddContributionOverflow,
		/// Campaign owner unknown.
		OwnerUnknown,
		/// Campaign admin unknown.
		AdminUnknown,
		/// Cannot contribute to owned campaign.
		NoContributionToOwnCampaign,
		/// Guru Meditation.
		GuruMeditation,
		/// Zou are not authorized for this call.
		AuthorizationError,
		/// Contributions not allowed.
		NoContributionsAllowed,
		/// Id Unknown.
		IdUnknown,
		/// Transfer Error.
		TransferError,
	}

	#[pallet::hooks]
	impl<T: Config> Hooks<T::BlockNumber> for Pallet<T> {

		fn on_initialize(block_number: T::BlockNumber) -> Weight {
			let mut contributors: u32 = 0;
			Self::process_campaigns(&block_number, FlowState::Finalizing, &mut contributors);
			Self::process_campaigns(&block_number, FlowState::Reverting, &mut contributors);
			T::WeightInfo::on_initialize(contributors)
		}

		fn on_finalize(block_number: T::BlockNumber) {
			Self::schedule_campaign_settlements(block_number)
		}

		fn on_runtime_upgrade() -> Weight {
			migration::migrate::<T, Self>()
		}
	}

	#[pallet::call]
	impl<T: Config> Pallet<T> {
		/// Create campaign
		///
		/// - `org_id`:
		/// - `admin_id`: Campaign admin. Supervision, should be dao provided!
		/// - `treasury`:
		/// - `name`: Campaign name
		/// - `target`:
		/// - `deposit`:
		/// - `expiry`:
		/// - `protocol`:
		/// - `governance`:
		/// - `cid`: IPFS content identifier.
		/// - `token_symbol`:
		/// - `token_name`:
		///
		/// Emits `CampaignCreated` event when successful.
		///
		/// Weight: `O(log n)`
		#[pallet::weight(T::WeightInfo::create_campaign(
			T::MaxCampaignsPerOrg::get()
		))]
		#[transactional]
		pub fn create_campaign(
			origin: OriginFor<T>,
			org_id: T::Hash,
			admin_id: T::AccountId,
			name: BoundedVec<u8, T::StringLimit>,
			target: T::Balance,
			deposit: T::Balance,
			expiry: T::BlockNumber,
			protocol: FlowProtocol,
			governance: FlowGovernance,
			cid: BoundedVec<u8, T::StringLimit>,
			token_symbol: BoundedVec<u8, T::StringLimit>, // up to 5
			token_name: BoundedVec<u8, T::StringLimit>,   /* cleartext
									* token_curve_a: u8,	  // preset
									* token_curve_b: BoundedVec<u8, T::StringLimit>, // custom */
		) -> DispatchResultWithPostInfo {
			let creator = ensure_signed(origin)?;
			let owner = T::Control::org_controller_account(&org_id).ok_or(Error::<T>::InvalidId)?;
			ensure!(creator == owner, Error::<T>::AuthorizationError);

			// Get Treasury account for deposits and fees
			let treasury_id = T::Control::org_treasury_account(&org_id).unwrap();

			let free_balance = T::Currency::free_balance(T::ProtocolTokenId::get(), &treasury_id);
			ensure!(free_balance > deposit, Error::<T>::TreasuryBalanceTooLow);
			// TODO: Fix deposit check
			// First iteration: MinimumDeposit >= 10% target with 1:1
			// Second iteration: check if deposit is N% worth of the target. Pallet Oracle
			// (price provider)
			ensure!(deposit <= target, Error::<T>::DepositTooHigh);

			// check name length boundary
			ensure!((name.len() as u32) >= T::MinNameLength::get(), Error::<T>::NameTooShort);

			let current_block = <frame_system::Pallet<T>>::block_number();

			// ensure campaign expires after the current block
			ensure!(expiry > current_block, Error::<T>::EndTooEarly);

			let max_length = T::MaxCampaignDuration::get();
			let max_end_block = current_block + max_length;
			ensure!(expiry <= max_end_block, Error::<T>::EndTooLate);

			// generate the unique campaign id + ensure uniqueness
			let nonce = Self::get_and_increment_nonce();
			let id = T::Hashing::hash_of(&nonce);
			// ensure!(!<CampaignOwner<T>>::exists(&id), Error::<T>::IdExists ); // check
			// for collision

			// check contribution limit per block
			let block_campaigns_cnt = CampaignsByBlock::<T>::get(expiry).len() as u32;
			ensure!(
				block_campaigns_cnt < T::MaxCampaignsPerBlock::get(),
				Error::<T>::CampaignsPerBlockExceeded
			);

			let org_campaigns_cnt = CampaignsByOrg::<T>::get(&org_id).len() as u32;
			ensure!(
				org_campaigns_cnt < T::MaxCampaignsPerOrg::get(),
				Error::<T>::CampaignsPerOrgExceeded
			);

			let campaign = Campaign {
				id: id.clone(),
				org: org_id.clone(),
				name: name.clone(),
				owner: creator.clone(),
				admin: admin_id.clone(),
				deposit: deposit.clone(),
				expiry: expiry.clone(),
				cap: target.clone(),
				protocol: protocol.clone(),
				governance: governance.clone(),
				cid: cid.clone(),
				token_symbol: token_symbol.clone(),
				token_name: token_name.clone(),
				created: T::UnixTime::now().as_secs(),
			};

			// mint the campaign
			Self::mint_campaign(campaign)?;

			// 0 init, 1 active, 2 paused, 3 complete success, 4 complete failed, 5
			// authority lock
			Self::set_state(id.clone(), FlowState::Active, &org_id)?;

			// deposit the event
			Self::deposit_event(Event::CampaignCreated {
				campaign_id: id,
				creator,
				admin: admin_id,
				target,
				deposit,
				expiry,
				name,
			});
			Ok(Some(T::WeightInfo::create_campaign(org_campaigns_cnt)).into())

			// No fees are paid here if we need to create this account;
			// that's why we don't just use the stock `transfer`.
			// T::Currency::resolve_creating(&Self::campaign_account_id(index),
			// imb);
		}

		/// Update campaign state
		///
		/// - `campaign_id`:
		/// - `state`:
		///
		/// Emits `CampaignUpdated` event when successful.
		///
		/// Weight: O(log n)
		#[pallet::weight(T::WeightInfo::update_state(
			T::MaxCampaignsPerOrg::get()
		))]
		pub fn update_state(origin: OriginFor<T>, campaign_id: T::Hash, state: FlowState) -> DispatchResultWithPostInfo {
			// access control
			let sender = ensure_signed(origin)?;

			CampaignOwner::<T>::get(campaign_id).ok_or(Error::<T>::OwnerUnknown)?;
			let admin = CampaignAdmin::<T>::get(campaign_id).ok_or(Error::<T>::AdminUnknown)?;
			ensure!(sender == admin, Error::<T>::AuthorizationError);

			// expired?
			let campaign = Campaigns::<T>::get(&campaign_id).ok_or(Error::<T>::IdUnknown)?;
			let current_block = <frame_system::Pallet<T>>::block_number();
			ensure!(current_block < campaign.expiry, Error::<T>::CampaignExpired);

			// not finished or locked?
			let org_id = CampaignOrg::<T>::get(&campaign_id);
			let org_campaigns_cnt = CampaignsByOrg::<T>::get(&org_id).len() as u32;
			let current_state = CampaignState::<T>::get(&campaign_id);
			ensure!(current_state < FlowState::Success, Error::<T>::CampaignExpired);

			Self::set_state(campaign_id.clone(), state.clone(), &org_id)?;

			// dispatch status update event
			Self::deposit_event(Event::CampaignUpdated {
				campaign_id,
				state,
				block_number: current_block,
			});

			Ok(Some(T::WeightInfo::update_state(org_campaigns_cnt)).into())
		}

		/// Contribute to project
		///
		/// - `campaign_id`:
		/// - `contribution`:
		///
		/// Emits `CampaignContributed` event when successful.
		///
		/// Weight: O(1)
		#[pallet::weight(T::WeightInfo::contribute())]
		pub fn contribute(origin: OriginFor<T>, campaign_id: T::Hash, contribution: T::Balance) -> DispatchResult {
			// check

			let sender = ensure_signed(origin)?;
			ensure!(
				T::Currency::free_balance(T::PaymentTokenId::get(), &sender) >= contribution,
				Error::<T>::BalanceTooLow
			);
			let owner = CampaignOwner::<T>::get(campaign_id).ok_or(Error::<T>::OwnerUnknown)?;
			ensure!(owner != sender, Error::<T>::NoContributionToOwnCampaign);

			ensure!(Campaigns::<T>::contains_key(campaign_id), Error::<T>::InvalidId);
			let state = CampaignState::<T>::get(campaign_id);
			ensure!(state == FlowState::Active, Error::<T>::NoContributionsAllowed);
			let campaign = Campaigns::<T>::get(&campaign_id).ok_or(Error::<T>::IdUnknown)?;
			ensure!(
				<frame_system::Pallet<T>>::block_number() < campaign.expiry,
				Error::<T>::CampaignExpired
			);

			// write

			Self::create_contribution(sender.clone(), campaign_id.clone(), contribution.clone())?;

			// event

			Self::deposit_event(Event::CampaignContributed {
				campaign_id,
				sender,
				contribution,
				block_number: <frame_system::Pallet<T>>::block_number(),
			});

			Ok(())
		}
	}
}

impl<T: Config> Pallet<T> {
	fn set_state(campaign_id: T::Hash, state: FlowState, org_id: &T::Hash) -> DispatchResult {
		let current_state = CampaignState::<T>::get(&campaign_id);

		// remove

		let mut current_state_members = CampaignsByState::<T>::get(&current_state, org_id);
		match current_state_members.binary_search(&campaign_id) {
			Ok(index) => {
				current_state_members.remove(index);
				CampaignsByState::<T>::insert(&current_state, org_id, current_state_members);
			}
			Err(_) => (), //(Error::<T>::IdUnknown)
		}

		// add
		CampaignsByState::<T>::try_mutate(
			&state, org_id,
			|ref mut campaigns| -> Result<(), DispatchError> {
				campaigns.try_push(campaign_id.clone()).map_err(|_| Error::<T>::CampaignsPerStateExceeded)?;
				Ok(())
			}
		)?;
		CampaignState::<T>::insert(campaign_id, state);
		Ok(())
	}

	fn mint_campaign(campaign: Campaign<T::Hash, T::AccountId, T::Balance, T::BlockNumber, Moment, BoundedVec<u8, T::StringLimit>>) -> DispatchResult {
		// add campaign to campaigns
		Campaigns::<T>::insert(&campaign.id, campaign.clone());
		// add org to index
		CampaignOrg::<T>::insert(&campaign.id, campaign.org.clone());
		// Owner == DAO
		CampaignOwner::<T>::insert(&campaign.id, campaign.owner.clone());
		// TODO: Admin == Council
		CampaignAdmin::<T>::insert(&campaign.id, campaign.admin.clone());
		// add to campaigns by org
		CampaignsByOrg::<T>::try_mutate(
			&campaign.org,
			|ref mut campaigns| -> Result<(), DispatchError> {
				campaigns.try_push(campaign.id).map_err(|_| Error::<T>::TooManyCampaigns)?;
				Ok(())
			}
		)?;

		// expiration
		CampaignsByBlock::<T>::mutate(
			&campaign.expiry,
			|ref mut campaigns| -> Result<(), DispatchError> {
				campaigns.try_push(campaign.id.clone()).map_err(|_| Error::<T>::TooManyCampaigns)?;
				Ok(())
			}
		)?;

		// global campaigns count

		let campaigns_count = CampaignsCount::<T>::get();
		let update_campaigns_count = campaigns_count.checked_add(1).ok_or(Error::<T>::AddCampaignOverflow)?;

		// update global campaign count
		CampaignsArray::<T>::insert(&campaigns_count, campaign.id.clone());
		CampaignsCount::<T>::put(update_campaigns_count);
		CampaignsIndex::<T>::insert(campaign.id.clone(), campaigns_count);

		// campaigns owned needs a refactor:
		// CampaignsCreated( dao => map )
		// owned campaigns count
		let campaigns_owned_count = CampaignsOwnedCount::<T>::get(&campaign.org);
		campaigns_owned_count
			.checked_add(1)
			.ok_or(Error::<T>::AddOwnedOverflow)?;

		// update owned campaigns for dao
		CampaignsOwnedArray::<T>::insert(&campaign.org, campaign.id.clone());
		CampaignsOwnedCount::<T>::insert(&campaign.org, update_campaigns_count);
		CampaignsOwnedIndex::<T>::insert((&campaign.org, &campaign.id), campaigns_owned_count);

		// TODO: this should be a proper mechanism
		// to reserve some of the staked GAME
		let treasury = T::Control::org_treasury_account(&campaign.org).ok_or(Error::<T>::InvalidId)?;

		T::Currency::reserve(T::ProtocolTokenId::get(), &treasury, campaign.deposit.clone())?;

		Ok(())
	}

	fn create_contribution(sender: T::AccountId, campaign_id: T::Hash, contribution: T::Balance) -> DispatchResult {
		let returning_contributor = CampaignContribution::<T>::contains_key((&campaign_id, &sender));

		// check if contributor exists
		// if not, update metadata
		if !returning_contributor {
			// increase the number of contributors
			let campaigns_contributed = CampaignsContributedCount::<T>::get(&sender);
			CampaignsContributedArray::<T>::insert((sender.clone(), campaigns_contributed), campaign_id);
			CampaignsContributedIndex::<T>::insert((sender.clone(), campaign_id.clone()), campaigns_contributed);

			let update_campaigns_contributed = campaigns_contributed
				.checked_add(1)
				.ok_or(Error::<T>::AddContributionOverflow)?;
			CampaignsContributedCount::<T>::insert(&sender, update_campaigns_contributed);

			// increase the number of contributors of the campaign
			let contributors = CampaignContributorsCount::<T>::get(&campaign_id);
			let update_contributors = contributors
				.checked_add(1)
				.ok_or(Error::<T>::UpdateContributorOverflow)?;
			CampaignContributorsCount::<T>::insert(campaign_id.clone(), update_contributors);

			// add contibutor to campaign contributors
			CampaignContributors::<T>::mutate(
				&campaign_id,
				|accounts| -> Result<(), DispatchError> {
					accounts.try_push(sender.clone()).map_err(|_| Error::<T>::TooManyContributors)?;
					Ok(())
				}
			)?;
		}

		// check if campaign is in contributions map of contributor and add
		let mut campaigns_contributed = CampaignsContributed::<T>::get(&sender);
		if !campaigns_contributed.contains(&campaign_id) {
			campaigns_contributed.try_push(campaign_id.clone()).map_err(|_| Error::<T>::TooManyCampaigns)?;
			CampaignsContributed::<T>::insert(&sender, campaigns_contributed);
		}

		// reserve contributed amount
		T::Currency::reserve(T::PaymentTokenId::get(), &sender, contribution)?;

		// update contributor balance for campaign
		let total_contribution = CampaignContribution::<T>::get((&campaign_id, &sender));
		let update_total_contribution = total_contribution + contribution;
		CampaignContribution::<T>::insert((&campaign_id, &sender), update_total_contribution);

		// update campaign balance
		let total_campaign_balance = CampaignBalance::<T>::get(&campaign_id);
		let update_campaign_balance = total_campaign_balance + contribution;
		CampaignBalance::<T>::insert(&campaign_id, update_campaign_balance);

		Ok(())
	}

	fn get_and_increment_nonce() -> u128 {
		let nonce = Nonce::<T>::get();
		Nonce::<T>::put(nonce.wrapping_add(1));
		nonce
	}

	fn schedule_campaign_settlements(block_number: T::BlockNumber) {
		// Iterate over campaigns ending in this block
		for campaign_id in &CampaignsByBlock::<T>::get(block_number) {
			let campaign = Campaigns::<T>::get(campaign_id).unwrap();
			let campaign_balance = CampaignBalance::<T>::get(campaign_id);

			// Campaign cap reached: Finalizing
			if campaign_balance >= campaign.cap {
				let _ = Self::set_state(campaign.id, FlowState::Finalizing, &campaign.org);

				Self::deposit_event(Event::CampaignFinalising {
					campaign_id: *campaign_id,
					campaign_balance,
					block_number,
				});

			// Campaign cap not reached: Reverting
			} else {
				let _ = Self::set_state(campaign.id, FlowState::Reverting, &campaign.org);

				Self::deposit_event(Event::CampaignReverting {
					campaign_id: *campaign_id,
					campaign_balance,
					block_number,
				});
			}
		}
	}

	fn process_campaigns(block_number: &T::BlockNumber, state: FlowState, processed: &mut u32) -> u32 {
		let mut campaigns_processed: u32 = 0;
		let campaign_ids_by_org: Vec<(T::Hash, BoundedVec<T::Hash, T::MaxCampaignsPerStatus>)> = CampaignsByState::<T>::iter_prefix(&state).collect();
		for (_org_id, campaign_ids) in campaign_ids_by_org {
			for campaign_id in campaign_ids {
				let campaign = Campaigns::<T>::get(campaign_id).unwrap();
				let campaign_balance = CampaignBalance::<T>::get(&campaign_id);
				let org_treasury = T::Control::org_treasury_account(&campaign.org).unwrap();
				let contributors = CampaignContributors::<T>::get(&campaign_id);

				if state == FlowState::Finalizing {
					if let Some(owner) = CampaignOwner::<T>::get(campaign.id) {
						Self::finalize_campaign(&block_number, processed, &campaign, &campaign_balance, &org_treasury, &contributors, &owner);
					} else {
						// TODO: If no campaign owner: revert the campaign or leave it as is?
					}
				} else if state == FlowState::Reverting {
					Self::revert_campaign(&block_number, processed, &campaign, &campaign_balance, &org_treasury, &contributors);
				}
				campaigns_processed = campaigns_processed.saturating_add(1);
			}
		}
		campaigns_processed
	}

	fn finalize_campaign(
		block_number: &T::BlockNumber, processed: &mut u32,
		campaign: &Campaign<T::Hash, T::AccountId, T::Balance, T::BlockNumber, Moment, BoundedVec<u8, T::StringLimit>>,
		campaign_balance: &T::Balance, org_treasury: &T::AccountId,
		contributors: &Vec<T::AccountId>, owner: &T::AccountId
	) {
		let processed_offset = ContributorsFinalized::<T>::get(campaign.id);
		let offset: usize = usize::try_from(processed_offset).unwrap();
		for contributor in &contributors[offset..] {
			if contributor == owner {
				continue;
			}
			let contributor_balance = CampaignContribution::<T>::get((campaign.id, contributor));
			
			// Unreserve, transfer balance from contributor to org treasury (reserved balance)
			let transfer_amount = T::Currency::repatriate_reserved(
				T::PaymentTokenId::get(),
				&contributor,
				&org_treasury,
				contributor_balance.clone(),
				BalanceStatus::Reserved
			);
			match transfer_amount {
				Err(_) => {
					// TODO: Update CampaignContributors -> for proper revert_campaign processing
					// TODO: Update CampaignBalance -> still possible to have < campaign.cap
					// TODO: Probably create reverse function for "fn create_contribution" -> "fn remove_contribution"
				},
				Ok(_) => { }
			}
			*processed += 1;
			if *processed >= T::MaxContributorsProcessing::get() {
				ContributorsFinalized::<T>::insert(campaign.id, processed_offset + *processed);
				return
			}
		}
		ContributorsFinalized::<T>::insert(campaign.id, processed_offset + *processed);
		// TODO: This doesn't make sense without "transfer_amount" error handling
		if *campaign_balance < campaign.cap {
			let _ = Self::set_state(campaign.id, FlowState::Reverting, &campaign.org);
			return
		}
		let commission = T::CampaignFee::get().mul_floor(campaign_balance.clone());
		let _transfer_commission = T::Currency::repatriate_reserved(
			T::PaymentTokenId::get(),
			&org_treasury,
			&T::GameDAOTreasury::get(),
			commission,
			BalanceStatus::Free
		);

		// Update campaign balance
		let updated_balance = *campaign_balance - commission;
		CampaignBalance::<T>::insert(campaign.id, updated_balance);

		let _ = Self::set_state(campaign.id, FlowState::Success, &campaign.org);

		Self::deposit_event(Event::CampaignFinalized {
			campaign_id: campaign.id,
			campaign_balance: updated_balance,
			block_number: *block_number,
			success: true,
		});
	}

	fn revert_campaign(
		block_number: &T::BlockNumber, processed: &mut u32,
		campaign: &Campaign<T::Hash, T::AccountId, T::Balance, T::BlockNumber, Moment, BoundedVec<u8, T::StringLimit>>,
		campaign_balance: &T::Balance, org_treasury: &T::AccountId,
		contributors: &Vec<T::AccountId>
	) {
		let processed_offset = ContributorsReverted::<T>::get(campaign.id);
		let offset: usize = usize::try_from(processed_offset).unwrap();
		for account in &contributors[offset..] {
			let contribution = CampaignContribution::<T>::get((campaign.id, account.clone()));
			T::Currency::unreserve(T::PaymentTokenId::get(), &account, contribution);

			*processed += 1;
			if *processed >= T::MaxContributorsProcessing::get() {
				ContributorsReverted::<T>::insert(campaign.id, processed_offset + *processed);
				return
			}
		}
		ContributorsReverted::<T>::insert(campaign.id, processed_offset + *processed);
		// Unreserve Initial deposit
		T::Currency::unreserve(T::ProtocolTokenId::get(), &org_treasury, campaign.deposit);

		let _ = Self::set_state(campaign.id, FlowState::Failed, &campaign.org);
		Self::deposit_event(Event::CampaignFailed {
			campaign_id: campaign.id,
			campaign_balance: *campaign_balance,
			block_number: *block_number,
			success: false,
		});
		
	}

}

impl<T: Config> FlowTrait<T::AccountId, T::Balance, T::Hash> for Pallet<T> {
	fn campaign_balance(campaign_id: &T::Hash) -> T::Balance {
		CampaignBalance::<T>::get(campaign_id)
	}
	fn campaign_contributors_count(campaign_id: &T::Hash) -> u64 {
		CampaignContributorsCount::<T>::get(campaign_id)
	}
	fn campaign_org(campaign_id: &T::Hash) -> T::Hash {
		CampaignOrg::<T>::get(campaign_id)
	}
	fn campaign_owner(campaign_id: &T::Hash) -> Option<T::AccountId> {
		CampaignOwner::<T>::get(campaign_id)
	}
	fn is_campaign_succeeded(campaign_id: &T::Hash) -> bool {
		CampaignState::<T>::get(campaign_id) == FlowState::Success
	}
}

impl<T: Config> FlowBenchmarkingTrait<T::AccountId, T::BlockNumber, T::Hash> for Pallet<T> {

	/// ** Should be used for benchmarking only!!! **
	#[cfg(feature = "runtime-benchmarks")]
	fn create_campaign(caller: &T::AccountId, org_id: &T::Hash) -> Result<T::Hash, &'static str> {
		let name: BoundedVec<u8, T::StringLimit> = BoundedVec::truncate_from(vec![0; T::StringLimit::get() as usize]);
		let cid: BoundedVec<u8, T::StringLimit> = BoundedVec::truncate_from(vec![0; T::StringLimit::get() as usize]);
		let token_symbol: BoundedVec<u8, T::StringLimit> = BoundedVec::truncate_from(vec![0; T::StringLimit::get() as usize]);
		let token_name: BoundedVec<u8, T::StringLimit> = BoundedVec::truncate_from(vec![0; T::StringLimit::get() as usize]);
		let target: T::Balance = T::MinContribution::get();
		let deposit: T::Balance = T::MinContribution::get();
		let expiry: T::BlockNumber = frame_system::Pallet::<T>::block_number() + 200_u32.into();
		let protocol: FlowProtocol = FlowProtocol::default();
		let governance: FlowGovernance = FlowGovernance::default();
		let nonce = Nonce::<T>::get();
		Pallet::<T>::create_campaign(
			frame_system::RawOrigin::Signed(caller.clone()).into(),
			*org_id,
			caller.clone(),
			name,
			target,
			deposit,
			expiry,
			protocol,
			governance,
			cid,
			token_name,
			token_symbol
		)?;
		Ok(T::Hashing::hash_of(&nonce))
	}

	/// ** Should be used for benchmarking only!!! **
	#[cfg(feature = "runtime-benchmarks")]
	fn create_contributions(campaign_id: &T::Hash, contributors: Vec<T::AccountId>) -> Result<(), DispatchError> {
		for account_id in BoundedVec::<T::AccountId, T::MaxCampaignContributions>::truncate_from(contributors) {
			Pallet::<T>::contribute(
				frame_system::RawOrigin::Signed(account_id.clone()).into(),
				campaign_id.clone(),
				T::MinContribution::get()
			)?;
		}
		Ok(())
	}

	/// ** Should be used for benchmarking only!!! **
	#[cfg(feature = "runtime-benchmarks")]
	fn finalize_campaigns_by_block(block_number: T::BlockNumber) {
		frame_system::Pallet::<T>::set_block_number(block_number);
		Pallet::<T>::on_finalize(block_number);
		let next_block = block_number.saturating_add(1_u32.into());
		frame_system::Pallet::<T>::set_block_number(next_block);
		Pallet::<T>::on_initialize(next_block);
	}
}
