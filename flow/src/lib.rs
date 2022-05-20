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
// #[warn(unused_imports)]
// pub use weights::WeightInfo;
pub mod types;
pub use types::*;

mod mock;
mod tests;

// #[cfg(feature = "runtime-benchmarks")]
// mod benchmarking;

// TODO: weights
// mod default_weights;

// TODO: externalise error messages - Enum: number and text description
// mod errors;

use frame_support::{
	codec::Encode,
	dispatch::DispatchResult,
	traits::{Get, Randomness, UnixTime, BalanceStatus},
	transactional,
	weights::Weight
};

use scale_info::TypeInfo;
use sp_runtime::{traits::{AtLeast32BitUnsigned}, Permill};
use sp_std::vec::Vec;

use sp_std::convert::TryFrom;

use codec::HasCompact;
use gamedao_traits::{ControlTrait, FlowTrait};
use orml_traits::{MultiCurrency, MultiReservableCurrency};

pub use pallet::*;

// TODO: use associated type instead
pub type Moment = u64;

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

		// type Moment: AtLeast32Bit + Parameter + Default + Copy;

		type WeightInfo: frame_system::weights::WeightInfo;
		type Event: From<Event<Self>>
			+ IsType<<Self as frame_system::Config>::Event>
			+ Into<<Self as frame_system::Config>::Event>;

		type Currency: MultiCurrency<Self::AccountId, CurrencyId = Self::CurrencyId, Balance = Self::Balance>
			+ MultiReservableCurrency<Self::AccountId>;
		type UnixTime: UnixTime;
		type Randomness: Randomness<Self::Hash, Self::BlockNumber>;
		type Control: ControlTrait<Self::AccountId, Self::Hash>;

		/// The origin that is allowed to make judgements.
		type GameDAOAdminOrigin: EnsureOrigin<Self::Origin>;
		type GameDAOTreasury: Get<Self::AccountId>;

		#[pallet::constant]
		type MinNameLength: Get<u32>;
		#[pallet::constant]
		type MaxNameLength: Get<u32>;

		#[pallet::constant]
		type MaxCampaignsPerAddress: Get<u32>;
		#[pallet::constant]
		type MaxCampaignsPerBlock: Get<u32>;
		#[pallet::constant]
		type MaxContributionsPerBlock: Get<u32>;
		#[pallet::constant]
		type MaxContributorsProcessing: Get<u32>;

		#[pallet::constant]
		type MinCampaignDuration: Get<Self::BlockNumber>;
		#[pallet::constant]
		type MaxCampaignDuration: Get<Self::BlockNumber>;
		#[pallet::constant]
		type MinCreatorDeposit: Get<Self::Balance>;
		#[pallet::constant]
		type MinContribution: Get<Self::Balance>;

		#[pallet::constant]
		type ProtocolTokenId: Get<Self::CurrencyId>;
		#[pallet::constant]
		type PaymentTokenId: Get<Self::CurrencyId>;

		#[pallet::constant]
		type CampaignFee: Get<Permill>;
	}

	/// Campaign
	#[pallet::storage]
	pub(super) type Campaigns<T: Config> = StorageMap<
		_,
		Blake2_128Concat,
		T::Hash,
		Campaign<T::Hash, T::AccountId, T::Balance, T::BlockNumber, Moment>,
		ValueQuery,
	>;

	/// Associated Body
	#[pallet::storage]
	pub(super) type CampaignOrg<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, T::Hash, ValueQuery>;

	/// Get Campaign Owner (body controller) by campaign id
	#[pallet::storage]
	pub(super) type CampaignOwner<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, T::AccountId, OptionQuery>;

	/// Get Campaign Admin (supervision) by campaign id
	#[pallet::storage]
	pub(super) type CampaignAdmin<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, T::AccountId, OptionQuery>;

	/// Campaign state
	/// 0 init, 1 active, 2 paused, 3 complete success, 4 complete failed, 5
	/// authority lock
	#[pallet::storage]
	pub(super) type CampaignState<T: Config> =
		StorageMap<_, Blake2_128Concat, T::Hash, FlowState, ValueQuery, GetDefault>;

	/// Get Campaigns for a certain state
	#[pallet::storage]
	pub(super) type CampaignsByState<T: Config> = StorageMap<_, Blake2_128Concat, FlowState, Vec<T::Hash>, ValueQuery>;

	/// Campaigns ending in block x
	#[pallet::storage]
	pub(super) type CampaignsByBlock<T: Config> =
		StorageMap<_, Blake2_128Concat, T::BlockNumber, Vec<T::Hash>, ValueQuery>;

	/// Total number of campaigns -> all campaigns
	#[pallet::storage]
	pub(super) type CampaignsArray<T: Config> = StorageMap<_, Blake2_128Concat, u64, T::Hash, ValueQuery>;
	#[pallet::storage]
	pub type CampaignsCount<T: Config> = StorageValue<_, u64, ValueQuery>;
	#[pallet::storage]
	pub(super) type CampaignsIndex<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, u64, ValueQuery>;

	/// Number of contributors processed
	#[pallet::storage]
	pub(super) type ContributorsFinalized<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, u32, ValueQuery, GetDefault>;
	#[pallet::storage]
	pub(super) type ContributorsReverted<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, u32, ValueQuery, GetDefault>;
	
	// caller owned campaigns -> my campaigns
	#[pallet::storage]
	pub(super) type CampaignsOwnedArray<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, T::Hash, ValueQuery>;
	#[pallet::storage]
	pub(super) type CampaignsOwnedCount<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, u64, ValueQuery>;
	#[pallet::storage]
	pub(super) type CampaignsOwnedIndex<T: Config> =
		StorageMap<_, Blake2_128Concat, (T::Hash, T::Hash), u64, ValueQuery>;

	/// campaigns contributed by accountid
	#[pallet::storage]
	pub(super) type CampaignsContributed<T: Config> =
		StorageMap<_, Blake2_128Concat, T::AccountId, Vec<T::Hash>, ValueQuery>;

	/// campaigns related to an organisation
	#[pallet::storage]
	pub(super) type CampaignsByOrg<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, Vec<T::Hash>, ValueQuery>;

	// caller contributed campaigns -> contributed campaigns
	#[pallet::storage]
	pub(super) type CampaignsContributedArray<T: Config> =
		StorageMap<_, Blake2_128Concat, (T::AccountId, u64), T::Hash, ValueQuery>;
	#[pallet::storage]
	pub(super) type CampaignsContributedCount<T: Config> =
		StorageMap<_, Blake2_128Concat, T::AccountId, u64, ValueQuery>;
	#[pallet::storage]
	pub(super) type CampaignsContributedIndex<T: Config> =
		StorageMap<_, Blake2_128Concat, (T::AccountId, T::Hash), u64, ValueQuery>;

	// Total contributions balance per campaign
	#[pallet::storage]
	pub(super) type CampaignBalance<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, T::Balance, ValueQuery>;

	// Contributions per user
	#[pallet::storage]
	pub(super) type CampaignContribution<T: Config> =
		StorageMap<_, Blake2_128Concat, (T::Hash, T::AccountId), T::Balance, ValueQuery>;

	// Contributors
	#[pallet::storage]
	pub(super) type CampaignContributors<T: Config> =
		StorageMap<_, Blake2_128Concat, T::Hash, Vec<T::AccountId>, ValueQuery>;
	#[pallet::storage]
	pub(super) type CampaignContributorsCount<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, u64, ValueQuery>;

	// Max campaign block limit
	// CampaignMaxCampaignDuration get(fn get_max_duration) config(): T::BlockNumber
	// = T::BlockNumber::from(T::MaxCampaignDuration::get());

	// Campaign nonce, increases per created campaign
	#[pallet::storage]
	#[pallet::getter(fn nonce)]
	pub(super) type Nonce<T: Config> = StorageValue<_, u128, ValueQuery>;

	#[pallet::event]
	#[pallet::generate_deposit(pub(super) fn deposit_event)]
	pub enum Event<T: Config> {
		CampaignDestroyed {
			campaign_id: T::Hash,
		},
		CampaignCreated {
			campaign_id: T::Hash,
			creator: T::AccountId,
			admin: T::AccountId,
			target: T::Balance,
			deposit: T::Balance,
			expiry: T::BlockNumber,
			name: Vec<u8>,
		},
		CampaignContributed {
			campaign_id: T::Hash,
			sender: T::AccountId,
			contribution: T::Balance,
			block_number: T::BlockNumber,
		},
		CampaignFinalized {
			campaign_id: T::Hash,
			campaign_balance: T::Balance,
			block_number: T::BlockNumber,
			success: bool,
		},
		CampaignFailed {
			campaign_id: T::Hash,
			campaign_balance: T::Balance,
			block_number: T::BlockNumber,
			success: bool,
		},
		CampaignReverting {
			campaign_id: T::Hash,
			campaign_balance: T::Balance,
			block_number: T::BlockNumber,
		},
		CampaignFinalising {
			campaign_id: T::Hash,
			campaign_balance: T::Balance,
			block_number: T::BlockNumber,
		},
		CampaignUpdated {
			campaign_id: T::Hash,
			state: FlowState,
			block_number: T::BlockNumber,
		},
		Message(Vec<u8>),
	}

	#[pallet::error]
	pub enum Error<T> {
		//
		//	general
		/// Must contribute at least the minimum amount of Campaigns
		ContributionTooSmall,
		/// Balance too low.
		BalanceTooLow,
		/// Treasury Balance Too Low
		TreasuryBalanceTooLow,
		/// The Campaign id specified does not exist
		InvalidId,
		/// The Campaign's contribution period has ended; no more contributions
		/// will be accepted
		ContributionPeriodOver,
		/// You may not withdraw or dispense Campaigns while the Campaign is
		/// still active
		CampaignStillActive,
		/// You cannot withdraw Campaigns because you have not contributed any
		NoContribution,
		/// You cannot dissolve a Campaign that has not yet completed its
		/// retirement period
		CampaignNotRetired,
		/// Campaign expired
		CampaignExpired,
		/// Cannot dispense Campaigns from an unsuccessful Campaign
		UnsuccessfulCampaign,

		//
		//	create
		/// Campaign must end after it starts
		EndTooEarly,
		/// Campaign expiry has be lower than the block number limit
		EndTooLate,
		/// Max campaigns per block exceeded
		CampaignsPerBlockExceeded,
		/// Name too long
		NameTooLong,
		/// Name too short
		NameTooShort,
		/// Deposit exceeds the campaign target
		DepositTooHigh,
		/// Campaign id exists
		IdExists,

		//
		//	mint
		/// Overflow adding a new campaign to total fundings
		AddCampaignOverflow,
		/// Overflow adding a new owner
		AddOwnedOverflow,
		/// Overflow adding to the total number of contributors of a camapaign
		UpdateContributorOverflow,
		/// Overflow adding to the total number of contributions of a camapaign
		AddContributionOverflow,
		/// Campaign owner unknown
		OwnerUnknown,
		/// Campaign admin unknown
		AdminUnknown,
		/// Cannot contribute to owned campaign
		NoContributionToOwnCampaign,
		/// Guru Meditation
		GuruMeditation,
		/// Zou are not authorized for this call
		AuthorizationError,
		/// Contributions not allowed
		NoContributionsAllowed,
		/// Id Unknown
		IdUnknown,
		/// Transfer Error
		TransferError,
	}

	#[pallet::hooks]
	impl<T: Config> Hooks<T::BlockNumber> for Pallet<T> {

        fn on_initialize(block_number: T::BlockNumber) -> Weight {
			let mut processed: u32 = 0;
			Self::process_campaigns(&block_number, FlowState::Finalizing, &mut processed)
			.saturating_add(
				Self::process_campaigns(&block_number, FlowState::Reverting, &mut processed)
			)
        }

		fn on_finalize(block_number: T::BlockNumber) {
			Self::schedule_campaign_settlements(block_number)
		}
	}

	#[pallet::call]
	impl<T: Config> Pallet<T> {
		/// Create campaign
		///
		/// - `org`:
		/// - `admin`: Campaign admin. Supervision, should be dao provided!
		/// - `treasury`:
		/// - `name`: Campaign name
		/// - `target`:
		/// - `deposit`:
		/// - `expiry`:
		/// - `protocol`:
		/// - `governance`:
		/// - `cid`: IPFS
		/// - `token_symbol`:
		/// - `token_name`:
		///
		/// Emits `CampaignCreated` event when successful.
		///
		/// Weight:
		#[pallet::weight(5_000_000)]
		#[transactional]
		pub fn create_campaign(
			origin: OriginFor<T>,
			org_id: T::Hash,
			admin_id: T::AccountId,
			name: Vec<u8>,
			target: T::Balance,
			deposit: T::Balance,
			expiry: T::BlockNumber,
			protocol: FlowProtocol,
			governance: FlowGovernance,
			cid: Vec<u8>,
			token_symbol: Vec<u8>, // up to 5
			token_name: Vec<u8>,   /* cleartext
			                        * token_curve_a: u8,	  // preset
			                        * token_curve_b: Vec<u8>, // custom */
		) -> DispatchResult {
			let creator = ensure_signed(origin)?;

			let owner = T::Control::org_controller_account(&org_id);

			ensure!(creator == owner, Error::<T>::AuthorizationError);

			// Get Treasury account for deposits and fees
			let treasury_id = T::Control::org_treasury_account(&org_id);

			let free_balance = T::Currency::free_balance(T::ProtocolTokenId::get(), &treasury_id);
			ensure!(free_balance > deposit, Error::<T>::TreasuryBalanceTooLow);
			// TODO: Fix deposit check
			// First iteration: MinimumDeposit >= 10% target with 1:1
			// Second iteration: check if deposit is N% worth of the target. Pallet Oracle
			// (price provider)
			ensure!(deposit <= target, Error::<T>::DepositTooHigh);

			// check name length boundary
			ensure!((name.len() as u32) >= T::MinNameLength::get(), Error::<T>::NameTooShort);
			ensure!((name.len() as u32) <= T::MaxNameLength::get(), Error::<T>::NameTooLong);

			let current_block = <frame_system::Pallet<T>>::block_number();

			// ensure campaign expires after the current block
			ensure!(expiry > current_block, Error::<T>::EndTooEarly);

			let max_length = T::MaxCampaignDuration::get();
			let max_end_block = current_block + max_length;
			ensure!(expiry <= max_end_block, Error::<T>::EndTooLate);

			// generate the unique campaign id + ensure uniqueness
			let nonce = Self::get_and_increment_nonce();
			let (id, _) = T::Randomness::random(&nonce.encode());
			// ensure!(!<CampaignOwner<T>>::exists(&id), Error::<T>::IdExists ); // check
			// for collision

			// check contribution limit per block
			let camapaigns = CampaignsByBlock::<T>::get(expiry);
			ensure!(
				(camapaigns.len() as u32) < T::MaxCampaignsPerBlock::get(),
				Error::<T>::CampaignsPerBlockExceeded
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
			Self::set_state(id.clone(), FlowState::Active);

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
			Ok(())

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
		/// Weight:
		#[pallet::weight(1_000_000)]
		pub fn update_state(origin: OriginFor<T>, campaign_id: T::Hash, state: FlowState) -> DispatchResult {
			// access control
			let sender = ensure_signed(origin)?;

			CampaignOwner::<T>::get(campaign_id).ok_or(Error::<T>::OwnerUnknown)?;
			let admin = CampaignAdmin::<T>::get(campaign_id).ok_or(Error::<T>::AdminUnknown)?;
			ensure!(sender == admin, Error::<T>::AuthorizationError);

			// expired?
			let campaign = Campaigns::<T>::get(&campaign_id);
			let current_block = <frame_system::Pallet<T>>::block_number();
			ensure!(current_block < campaign.expiry, Error::<T>::CampaignExpired);

			// not finished or locked?
			let current_state = CampaignState::<T>::get(campaign_id);
			ensure!(current_state < FlowState::Success, Error::<T>::CampaignExpired);

			Self::set_state(campaign_id.clone(), state.clone());

			// dispatch status update event
			Self::deposit_event(Event::CampaignUpdated {
				campaign_id,
				state,
				block_number: current_block,
			});

			Ok(())
		}

		/// Contribute to project
		///
		/// - `campaign_id`:
		/// - `contribution`:
		///
		/// Emits `CampaignContributed` event when successful.
		///
		/// Weight:
		#[pallet::weight(5_000_000)]
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
			let campaign = Campaigns::<T>::get(&campaign_id);
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
	fn set_state(campaign_id: T::Hash, state: FlowState) {
		let current_state = CampaignState::<T>::get(&campaign_id);

		// remove

		let mut current_state_members = CampaignsByState::<T>::get(&current_state);
		match current_state_members.binary_search(&campaign_id) {
			Ok(index) => {
				current_state_members.remove(index);
				CampaignsByState::<T>::insert(&current_state, current_state_members);
			}
			Err(_) => (), //(Error::<T>::IdUnknown)
		}

		// add
		CampaignsByState::<T>::mutate(&state, |campaigns| campaigns.push(campaign_id.clone()));
		CampaignState::<T>::insert(campaign_id, state);
	}

	fn mint_campaign(campaign: Campaign<T::Hash, T::AccountId, T::Balance, T::BlockNumber, Moment>) -> DispatchResult {
		// add campaign to campaigns
		Campaigns::<T>::insert(&campaign.id, campaign.clone());
		// add org to index
		CampaignOrg::<T>::insert(&campaign.id, campaign.org.clone());
		// Owner == DAO
		CampaignOwner::<T>::insert(&campaign.id, campaign.owner.clone());
		// TODO: Admin == Council
		CampaignAdmin::<T>::insert(&campaign.id, campaign.admin.clone());
		// add to campaigns by body
		CampaignsByOrg::<T>::mutate(&campaign.org, |campaigns| campaigns.push(campaign.id));

		// expiration
		CampaignsByBlock::<T>::mutate(&campaign.expiry, |campaigns| campaigns.push(campaign.id.clone()));

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
		let treasury = T::Control::org_treasury_account(&campaign.org);

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
			CampaignContributors::<T>::mutate(&campaign_id, |accounts| accounts.push(sender.clone()));
		}

		// check if campaign is in contributions map of contributor and add
		let mut campaigns_contributed = CampaignsContributed::<T>::get(&sender);
		if !campaigns_contributed.contains(&campaign_id) {
			campaigns_contributed.push(campaign_id.clone());
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
			let campaign = Campaigns::<T>::get(campaign_id);
			let campaign_balance = CampaignBalance::<T>::get(campaign_id);
			
			// Campaign cap reached: Finalizing
			if campaign_balance >= campaign.cap {
				Self::set_state(campaign.id, FlowState::Finalizing);

				Self::deposit_event(Event::CampaignFinalising {
					campaign_id: *campaign_id,
					campaign_balance,
					block_number,
				});

			// Campaign cap not reached: Reverting
			} else {
				Self::set_state(campaign.id, FlowState::Reverting);

				Self::deposit_event(Event::CampaignReverting {
					campaign_id: *campaign_id,
					campaign_balance,
					block_number,
				});
			}
		}
	}

	fn process_campaigns(block_number: &T::BlockNumber, state: FlowState, processed: &mut u32) -> Weight {
		let campaign_ids = CampaignsByState::<T>::get(&state);
		let total_weight: Weight = 0;
		for campaign_id in campaign_ids {
			let campaign = Campaigns::<T>::get(campaign_id);
			let campaign_balance = CampaignBalance::<T>::get(campaign_id);
			let org = CampaignOrg::<T>::get(&campaign_id);
			let org_treasury = T::Control::org_treasury_account(&org);
			let contributors = CampaignContributors::<T>::get(campaign_id);

			if state == FlowState::Finalizing {
				if let Some(owner) = CampaignOwner::<T>::get(campaign.id) {
					total_weight.saturating_add(
						Self::finalize_campaign(&block_number, processed, &campaign, &campaign_balance, &org, &org_treasury, &contributors, &owner)
					);
				} else {
					// TODO: If no campaign owner: revert the campaign or leave it as is?
				}
			} else if state == FlowState::Reverting {
				total_weight.saturating_add(
					Self::revert_campaign(&block_number, processed, &campaign, &campaign_balance, &org, &org_treasury, &contributors)
				);
			}
		}
		total_weight
	}

	fn finalize_campaign(
		block_number: &T::BlockNumber, processed: &mut u32,
		campaign: &Campaign<T::Hash, T::AccountId, T::Balance, T::BlockNumber, Moment>,
		campaign_balance: &T::Balance, org: &T::Hash, org_treasury: &T::AccountId,
		contributors: &Vec<T::AccountId>, owner: &T::AccountId
	) -> Weight {
		let contributors = CampaignContributors::<T>::get(campaign.id);
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
				// TODO: return T::WeightInfo::finalize_campaign(processed)
				return 1 as Weight
			}
		}
		ContributorsFinalized::<T>::insert(campaign.id, processed_offset + *processed);
		// TODO: This doesn't make sense without "transfer_amount" error handling
		if *campaign_balance < campaign.cap {
			Self::set_state(campaign.id, FlowState::Reverting);
			// TODO: return T::WeightInfo::finalize_campaign(processed)
			return 1 as Weight
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

		Self::set_state(campaign.id, FlowState::Success);

		Self::deposit_event(Event::CampaignFinalized {
			campaign_id: campaign.id,
			campaign_balance: updated_balance,
			block_number: *block_number,
			success: true,
		});

		// TODO: return T::WeightInfo::finalize_campaign(processed)
		1 as Weight
	}

	fn revert_campaign(
		block_number: &T::BlockNumber, processed: &mut u32,
		campaign: &Campaign<T::Hash, T::AccountId, T::Balance, T::BlockNumber, Moment>,
		campaign_balance: &T::Balance, org: &T::Hash, org_treasury: &T::AccountId,
		contributors: &Vec<T::AccountId>
	) -> Weight {
		let processed_offset = ContributorsReverted::<T>::get(campaign.id);
		let offset: usize = usize::try_from(processed_offset).unwrap();
		for account in &contributors[offset..] {
			let contribution = CampaignContribution::<T>::get((campaign.id, account.clone()));
			T::Currency::unreserve(T::PaymentTokenId::get(), &account, contribution);

			*processed += 1;
			if *processed >= T::MaxContributorsProcessing::get() {
				ContributorsReverted::<T>::insert(campaign.id, processed_offset + *processed);
				// TODO: return T::WeightInfo::revert_campaign(processed)
				return 1 as Weight
			}
		}
		ContributorsReverted::<T>::insert(campaign.id, processed_offset + *processed);
		// Unreserve Initial deposit
		T::Currency::unreserve(T::ProtocolTokenId::get(), &org_treasury, campaign.deposit);

		Self::set_state(campaign.id, FlowState::Failed);
		Self::deposit_event(Event::CampaignFailed {
			campaign_id: campaign.id,
			campaign_balance: *campaign_balance,
			block_number: *block_number,
			success: false,
		});
		
		// TODO: return T::WeightInfo::revert_campaign(processed)
		1 as Weight
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
