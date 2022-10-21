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
#![allow(deprecated)] // TODO: tests are not working without transactional macro
pub mod types;
pub use types::{FlowProtocol, CampaignState, FlowGovernance, BlockType};

mod mock;
mod tests;
#[cfg(feature = "runtime-benchmarks")]
mod benchmarking;
pub mod weights;

use frame_support::{
	dispatch::{DispatchResult, DispatchError, DispatchResultWithPostInfo},
	traits::{Get, BalanceStatus, Hooks},
	weights::Weight, BoundedVec, log, transactional
};

use scale_info::TypeInfo;
use sp_runtime::{traits::{AtLeast32BitUnsigned, Hash}, Permill, ArithmeticError::Overflow};

use sp_std::{vec, vec::Vec, convert::{TryFrom, TryInto}};


use gamedao_traits::{ControlTrait, ControlBenchmarkingTrait, FlowTrait, FlowBenchmarkingTrait};
use orml_traits::{MultiCurrency, MultiReservableCurrency};

pub use pallet::*;
pub use weights::WeightInfo;

pub type Campaign<T> = types::Campaign<
	<T as frame_system::Config>::Hash, <T as frame_system::Config>::AccountId,
	<T as pallet::Config>::Balance, <T as frame_system::Config>::BlockNumber,
	BoundedVec<u8, <T as pallet::Config>::StringLimit>,
>;
pub type Contributors<T> = BoundedVec<<T as frame_system::Config>::AccountId, <T as pallet::Config>::MaxCampaignContributors>;

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

		type Control: ControlTrait<Self::AccountId, Self::Hash>
			+ ControlBenchmarkingTrait<Self::AccountId, Self::Hash>;

		/// The GameDAO Treasury AccountId.
		#[pallet::constant]
		type GameDAOTreasury: Get<Self::AccountId>;

		/// The min length of a campaign name.
		#[pallet::constant]
		type MinNameLength: Get<u32>;

		/// The max number of campaigns per one block.
		#[pallet::constant]
		type MaxCampaignsPerBlock: Get<u32>;

		/// The max number of contributors per one Campaign.
		#[pallet::constant]
		type MaxCampaignContributors: Get<u32>;

		/// The max number of contributors for processing in one block (batch size)
		/// during Campaign finalization.
		#[pallet::constant]
		type MaxContributorsProcessing: Get<u32>;

		/// The min contribution amount in payment tokens
		#[pallet::constant]
		type MinContribution: Get<Self::Balance>;

		/// The min campaign deposit - fraction of a target, default 10%
		#[pallet::constant]
		type MinCampaignDeposit: Get<Permill>;

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

		/// Default time limit for a campaign in blocks.
		#[pallet::constant]
		type CampaignDurationLimits: Get<(Self::BlockNumber, Self::BlockNumber)>;
	}

	/// Campaign by its id.
	///
	/// CampaignOf: map Hash => Campaign
	#[pallet::storage]
	pub(super) type CampaignOf<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, Campaign<T>, OptionQuery>;

	/// Total number of campaigns.
	///
	/// CampaignCount: u32
	#[pallet::storage]
	#[pallet::getter(fn campaign_count)]
	pub type CampaignCount<T: Config> = StorageValue<_, u32, ValueQuery>;

	/// Total contributions balance per campaign.
	///
	/// CampaignBalance: map Hash => Balance
	#[pallet::storage]
	pub(super) type CampaignBalance<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, T::Balance, ValueQuery>;

	/// Total contribution made by account id for particular campaign.
	/// campaign id, account id -> contribution.
	///
	/// CampaignContribution: double map Hash, AccountId => Balance
	#[pallet::storage]
	pub(super) type CampaignContribution<T: Config> =
		StorageDoubleMap<_, Blake2_128Concat, T::Hash, Blake2_128Concat, T::AccountId, T::Balance, ValueQuery>;

	/// Campaign state by campaign id.
	/// 0 created, 1 activated, 2 paused, ...
	///
	/// CampaignStates: map Hash => CampaignState
	#[pallet::storage]
	pub(super) type CampaignStates<T: Config> =
		StorageMap<_, Blake2_128Concat, T::Hash, CampaignState, ValueQuery, GetDefault>;

	/// Campaigns starting/ending in block x.
	///
	/// CampaignsByBlock: double map BlockType, BlockNumber => BoundedVec<Hash>
	#[pallet::storage]
	pub(super) type CampaignsByBlock<T: Config> =
		StorageDoubleMap<_, Blake2_128Concat, BlockType, Blake2_128Concat, T::BlockNumber, BoundedVec<T::Hash, T::MaxCampaignsPerBlock>, ValueQuery>;

	#[pallet::storage]
	pub(super) type CampaignFinalizationQueue<T: Config> =
		StorageMap<_, Blake2_128Concat, T::Hash, (Campaign<T>, T::Balance, CampaignState, T::AccountId, Contributors<T>), OptionQuery>;

	/// Offset value - number of processed and sucessfully finalized contributions.
	/// Used during campaign finalization for processing contributors in batches.
	/// When MaxContributorsProcessing is achieved, set this offset to save the progress.
	///
	/// ProcessingOffset: map Hash => u32
	#[pallet::storage]
	pub(super) type ProcessingOffset<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, u32, ValueQuery>;

	/// Total number of contributors for particular campaign. This is needed for voting
	/// in order do determine eligible voters for Withdrawal proposal.
	///
	/// CampaignContributors: map Hash => u64
	#[pallet::storage]
	pub(super) type CampaignContributorsCount<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, u64, ValueQuery>;

	#[pallet::event]
	#[pallet::generate_deposit(pub(super) fn deposit_event)]
	pub enum Event<T: Config> {
		/// Campaign was successfully created.
		Created {
			campaign_id: T::Hash,
			creator: T::AccountId,
			admin: T::AccountId,
			target: T::Balance,
			deposit: T::Balance,
			expiry: T::BlockNumber,
			name: BoundedVec<u8, T::StringLimit>,
		},
		Activated {
			campaign_id: T::Hash,
		},
		/// Campaign was contributed.
		Contributed {
			campaign_id: T::Hash,
			sender: T::AccountId,
			contribution: T::Balance,
			block_number: T::BlockNumber,
		},
		/// Campaign was finalized.
		Succeeded {
			campaign_id: T::Hash,
			campaign_balance: T::Balance,
			block_number: T::BlockNumber,
		},
		/// Campaign failed - successfully reverted.
		Failed {
			campaign_id: T::Hash,
			campaign_balance: T::Balance,
			block_number: T::BlockNumber,
		},
	}

	#[pallet::error]
	pub enum Error<T> {
		AuthorizationError,
		BalanceLow,
		CampaignExpired,
		CampaignsPerBlockExceeded,
		CampaignUnknown,
		ContributionInsufficient,
		DepositInsufficient,
		/// Deposit exceeds the campaign target.
		DepositTooHigh,
		NameTooShort,
		NoContributionsAllowed,
		NoContributionToOwnCampaign,
		OrgPrimeUnknown,
		/// Campaign starts/expires validation failed.
		OutOfBounds,
		TreasuryBalanceLow,
		TreasuryNotExist,
	}

	#[pallet::hooks]
	impl<T: Config> Hooks<T::BlockNumber> for Pallet<T> {

		fn on_initialize(block_number: T::BlockNumber) -> Weight {
			// Activate campaigns
			let campaigns = CampaignsByBlock::<T>::get(BlockType::Start, &block_number);
			for campaign_id in &campaigns {
				let campaign_state = CampaignStates::<T>::get(&campaign_id);
				if campaign_state != CampaignState::Created {
					continue; // Just a safety check, never should happen
				};
				CampaignStates::<T>::insert(&campaign_id, CampaignState::Active);
				Self::deposit_event(Event::<T>::Activated { campaign_id: *campaign_id });
			}

			// Finalize campaigns
			let mut processed: u32 = 0;
			let queue = CampaignFinalizationQueue::<T>::iter().collect::<Vec<_>>();
			for item in queue {
				if processed >= T::MaxContributorsProcessing::get() {
					break
				}
				let (campaign_id, (campaign, campaign_balance, campaign_state, treasury_id, contributors)): (T::Hash, (
					Campaign<T>, T::Balance, CampaignState, T::AccountId, Contributors<T>)) = item;
				let mut contributors_finalized = true;
				for (i, c) in contributors.clone().into_iter().enumerate() {
					if processed >= T::MaxContributorsProcessing::get() {
						let not_finalized = BoundedVec::truncate_from(contributors[i..].into());
						CampaignFinalizationQueue::<T>::insert(&campaign_id,
							(&campaign, &campaign_balance, &campaign_state, &treasury_id, not_finalized));
						contributors_finalized = false;
						break
					}
					Self::finalize_contributor(&campaign_state, c, campaign_id, &treasury_id);
					processed += 1;
				}
				if contributors_finalized {
					Self::finalize_campaign(&campaign_state, campaign_id, &campaign, campaign_balance, treasury_id, block_number);
					CampaignFinalizationQueue::<T>::remove(&campaign_id);
				}
			}
			T::WeightInfo::on_initialize(processed, campaigns.len() as u32)
		}

		// SBP-M2 reviews: I am wondering if just `continue` in case of unexpected state in this functions is a
		// correct & proper way of handling
		fn on_finalize(block_number: T::BlockNumber) {
			// Prepare and validate data for campaign settlement
			for campaign_id in &CampaignsByBlock::<T>::get(BlockType::Expiry, block_number) {
				let maybe_campaign = CampaignOf::<T>::get(campaign_id);
				if maybe_campaign.is_none() {
					log::error!(target: "runtime::gamedao_flow", "Campaign unknown: '{:?}'", campaign_id);
					continue
				}
				// SBP-M2 review: Do not unwrap
				// Use error handling
				let campaign = maybe_campaign.unwrap();
				let maybe_treasury_id = T::Control::org_treasury_account(&campaign.org_id);
				if maybe_treasury_id.is_none() {
					log::error!(target: "runtime::gamedao_flow", "Treasury unknown for Org: '{:?}'", &campaign.org_id);
					continue
				}
				let treasury_id = maybe_treasury_id.unwrap();
				let campaign_balance = CampaignBalance::<T>::get(campaign_id);
				let contributors = CampaignContribution::<T>::iter_key_prefix(&campaign_id).collect::<Vec<_>>();
				let state: CampaignState;
				if campaign_balance >= campaign.cap {
					state = CampaignState::Succeeded;
				} else {
					state = CampaignState::Failed;
				}
				if contributors.len() as u32 > T::MaxCampaignContributors::get() {
					log::error!(
						target: "runtime::gamedao_flow", "MaxCampaignContributors exceeds limits {},
						campaign '{:?}' haven't been scheduled for settlement",
						T::MaxCampaignContributors::get(), campaign_id,
					);
					continue
				}
				let c = BoundedVec::try_from(contributors.clone()).unwrap();
				CampaignFinalizationQueue::<T>::insert(campaign_id, (campaign, campaign_balance, state, treasury_id, c));
			}
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
		/// - `token_symbol`: a new custom token symbol
		/// - `token_name`: a new custom token name
		/// - `start`:
		///
		/// The two params `token_symbol` and `token_name` are meant for setting up a new custom token if creator wants to
		/// conduct a token generation event. Therefore these two are optionals and would result in a TGE dropping
		/// fungible token with a new currency id to contributors.
		///
		/// Emits `CampaignCreated` event when successful.
		///
		/// Weight: `O(1)`
		#[pallet::weight(T::WeightInfo::create_campaign())]
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
			start: Option<T::BlockNumber>,
			token_symbol: Option<BoundedVec<u8, T::StringLimit>>,
			token_name: Option<BoundedVec<u8, T::StringLimit>>,
		) -> DispatchResult {
			let creator = ensure_signed(origin)?;
			let prime = T::Control::org_prime_account(&org_id).ok_or(Error::<T>::OrgPrimeUnknown)?;
			ensure!(creator == prime, Error::<T>::AuthorizationError);
			ensure!((name.len() as u32) >= T::MinNameLength::get(), Error::<T>::NameTooShort);

			// Campaign deposit validation:
			let min_deposit = T::MinCampaignDeposit::get().mul_floor(target);
			ensure!(deposit >= min_deposit, Error::<T>::DepositInsufficient);
			ensure!(deposit <= target, Error::<T>::DepositTooHigh);

			// Campaign start/expiry validation:
			let current_block = <frame_system::Pallet<T>>::block_number();
			let starts = start.unwrap_or(current_block);
			let (min_duration, max_duration) = T::CampaignDurationLimits::get();
			ensure!(starts >= current_block, Error::<T>::OutOfBounds);
			ensure!(expiry > current_block, Error::<T>::OutOfBounds);
			ensure!(expiry <= starts + max_duration, Error::<T>::OutOfBounds);
			ensure!(expiry >= starts + min_duration, Error::<T>::OutOfBounds);

			let index = CampaignCount::<T>::get();
			let campaign = types::Campaign {
				index, org_id, name: name.clone(), owner: creator.clone(),
				admin: admin_id.clone(), deposit, start: starts, expiry, cap: target,
				protocol, governance, cid, token_symbol, token_name, created: current_block,
			};

			let campaign_id: T::Hash = T::Hashing::hash_of(&campaign);
			Self::mint_campaign(&campaign_id, campaign)?;
			Self::deposit_event(Event::Created {
				campaign_id, creator, admin: admin_id, target, deposit, expiry, name
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
		/// Weight: O(1)
		#[pallet::weight(T::WeightInfo::contribute())]
		#[transactional]
		pub fn contribute(origin: OriginFor<T>, campaign_id: T::Hash, contribution: T::Balance) -> DispatchResult {
			let sender = ensure_signed(origin)?;
			let campaign = CampaignOf::<T>::get(&campaign_id).ok_or(Error::<T>::CampaignUnknown)?;
			let block_number = <frame_system::Pallet<T>>::block_number();

			ensure!(block_number < campaign.expiry, Error::<T>::CampaignExpired);
			ensure!(campaign.owner != sender, Error::<T>::NoContributionToOwnCampaign);
			ensure!(
				CampaignStates::<T>::get(campaign_id) == CampaignState::Active,
				Error::<T>::NoContributionsAllowed
			);
			ensure!(contribution >= T::MinContribution::get(), Error::<T>::ContributionInsufficient);

			Self::create_contribution(sender.clone(), campaign_id, contribution)?;
			Self::deposit_event(Event::Contributed {
				campaign_id, sender,
				contribution, block_number,
			});

			Ok(())
		}
	}
}

impl<T: Config> Pallet<T> {

	fn mint_campaign(campaign_id: &T::Hash, campaign: Campaign<T>) -> DispatchResult {
		let campaign_state;
		if campaign.start > <frame_system::Pallet<T>>::block_number() {
			campaign_state = CampaignState::Created;
		} else {
			campaign_state = CampaignState::Active;
		}
		CampaignStates::<T>::insert(&campaign_id, campaign_state);
		CampaignsByBlock::<T>::try_mutate(
			BlockType::Start, campaign.start, |campaigns| -> Result<(), DispatchError> {
				campaigns.try_push(campaign_id.clone()).map_err(|_| Error::<T>::CampaignsPerBlockExceeded)?;
				Ok(())
			}
		)?;
		CampaignsByBlock::<T>::try_mutate(
			BlockType::Expiry, campaign.expiry, |campaigns| -> Result<(), DispatchError> {
				campaigns.try_push(campaign_id.clone()).map_err(|_| Error::<T>::CampaignsPerBlockExceeded)?;
				Ok(())
			}
		)?;
		CampaignOf::<T>::insert(&campaign_id, campaign.clone());
		CampaignCount::<T>::set(campaign.index.checked_add(1).ok_or(Overflow)?);

		let treasury_id = T::Control::org_treasury_account(&campaign.org_id).ok_or(Error::<T>::TreasuryNotExist)?;
		T::Currency::reserve(
			T::ProtocolTokenId::get(), &treasury_id, campaign.deposit.clone()
		).map_err(|_| Error::<T>::TreasuryBalanceLow)?;

		Ok(())
	}

	fn create_contribution(sender: T::AccountId, campaign_id: T::Hash, contribution: T::Balance) -> DispatchResult {
		let is_returning_contributor = CampaignContribution::<T>::contains_key(&campaign_id, &sender);
		if !is_returning_contributor {
			let contributors = CampaignContributorsCount::<T>::get(&campaign_id);
			CampaignContributorsCount::<T>::insert(campaign_id.clone(), contributors.checked_add(1).ok_or(Overflow)?);
		}
		// Reserve contributed amount
		T::Currency::reserve(T::PaymentTokenId::get(), &sender, contribution).map_err(|_| Error::<T>::BalanceLow)?;

		// Update contributor balance for campaign
		let total_contribution = CampaignContribution::<T>::get(&campaign_id, &sender);
		CampaignContribution::<T>::insert(&campaign_id, &sender, total_contribution + contribution);

		// Update campaign balance
		let total_campaign_balance = CampaignBalance::<T>::get(&campaign_id);
		CampaignBalance::<T>::insert(&campaign_id, total_campaign_balance + contribution);

		Ok(())
	}

	fn finalize_contributor(
		campaign_state: &CampaignState,
		contributor: T::AccountId,
		campaign_id: T::Hash,
		org_treasury: &T::AccountId,
	) {
		// SBP-M2 review: consider match clause
		if campaign_state == &CampaignState::Succeeded {
			let contributor_balance = CampaignContribution::<T>::get(campaign_id, &contributor);
			let _transfer_amount = T::Currency::repatriate_reserved(
				T::PaymentTokenId::get(),
				&contributor,
				&org_treasury,
				contributor_balance.clone(),
				BalanceStatus::Reserved
			);
		} else if campaign_state == &CampaignState::Failed {
			let contribution = CampaignContribution::<T>::get(campaign_id, contributor.clone());
			T::Currency::unreserve(T::PaymentTokenId::get(), &contributor, contribution);
		}
	}

	fn finalize_campaign(
		campaign_state: &CampaignState,
		campaign_id: T::Hash,
		campaign: &Campaign<T>,
		campaign_balance: T::Balance,
		org_treasury: T::AccountId,
		block_number: T::BlockNumber,
	) {
		// SBP-M2 review: consider match clause
		if campaign_state == &CampaignState::Succeeded {
			let commission = T::CampaignFee::get().mul_floor(campaign_balance.clone());
			let _transfer_commission = T::Currency::repatriate_reserved(
				T::PaymentTokenId::get(),
				&org_treasury,
				&T::GameDAOTreasury::get(),
				commission,
				BalanceStatus::Free
			);
			// Update campaign balance
			let updated_balance = campaign_balance - commission;
			CampaignBalance::<T>::insert(campaign_id, updated_balance);
			CampaignStates::<T>::insert(&campaign_id, CampaignState::Succeeded);

			Self::deposit_event(Event::Succeeded { campaign_id, campaign_balance: updated_balance, block_number });

		} else if campaign_state == &CampaignState::Failed {
			// Unreserve Initial deposit
			T::Currency::unreserve(T::ProtocolTokenId::get(), &org_treasury, campaign.deposit);
			CampaignStates::<T>::insert(campaign_id, CampaignState::Failed);

			Self::deposit_event(Event::Failed { campaign_id, campaign_balance, block_number });
		}

	}

}

impl<T: Config> FlowTrait<T::AccountId, T::Balance, T::Hash> for Pallet<T> {
	fn campaign_balance(campaign_id: &T::Hash) -> T::Balance {
		CampaignBalance::<T>::get(campaign_id)
	}
	fn campaign_contributors_count(campaign_id: &T::Hash) -> u64 {
		CampaignContributorsCount::<T>::get(campaign_id)
	}
	fn campaign_owner(campaign_id: &T::Hash) -> Option<T::AccountId> {
		let campaign = CampaignOf::<T>::get(campaign_id);
		if let Some(campaign) = campaign {
			return Some(campaign.owner);
		};
		return None;
	}
	fn is_campaign_succeeded(campaign_id: &T::Hash) -> bool {
		CampaignStates::<T>::get(campaign_id) == CampaignState::Succeeded
	}
	fn is_campaign_contributor(campaign_id: &T::Hash, who: &T::AccountId) -> bool {
		CampaignContribution::<T>::contains_key(campaign_id, who)
	}
}

// SBP-M2 review: move benchmarking stuff to benchmarking/mock module
impl<T: Config> FlowBenchmarkingTrait<T::AccountId, T::BlockNumber, T::Hash> for Pallet<T> {

	/// ** Should be used for benchmarking only!!! **
	#[cfg(feature = "runtime-benchmarks")]
	fn create_campaign(caller: &T::AccountId, org_id: &T::Hash, start: T::BlockNumber) -> Result<T::Hash, &'static str> {
		use sp_runtime::traits::Saturating;
		let bounded_str: BoundedVec<u8, T::StringLimit> = BoundedVec::truncate_from(vec![0; T::StringLimit::get() as usize]);
		let now = frame_system::Pallet::<T>::block_number();
		let index = CampaignCount::<T>::get();
		let target: T::Balance = T::MinContribution::get().saturating_mul(10u32.into());
		let campaign = types::Campaign {
			index,
			org_id,
			name: bounded_str.clone(),
			owner: caller.clone(),
			admin: caller.clone(),
			deposit: T::MinContribution::get(),
			start,
			expiry: start + 57_600_u32.into(), // 60/3*60*24*2 (2 days with 3 sec block time)
			cap: target,
			protocol: FlowProtocol::default(),
			governance: FlowGovernance::default(),
			cid: bounded_str.clone(),
			token_symbol: Some(bounded_str.clone()),
			token_name: Some(bounded_str.clone()),
			created: now,
		};
		let campaign_id = T::Hashing::hash_of(&campaign);

		Pallet::<T>::create_campaign(
			frame_system::RawOrigin::Signed(caller.clone()).into(),
			*campaign.org_id, campaign.owner, campaign.name, campaign.cap, campaign.deposit,
			campaign.expiry, campaign.protocol, campaign.governance, campaign.cid,
			Some(campaign.start), campaign.token_symbol, campaign.token_name
		)?;
		Ok(campaign_id)
	}

	/// ** Should be used for benchmarking only!!! **
	#[cfg(feature = "runtime-benchmarks")]
	fn create_contributions(campaign_id: &T::Hash, contributors: Vec<T::AccountId>) -> Result<(), DispatchError> {
		for account_id in BoundedVec::<T::AccountId, T::MaxCampaignContributors>::truncate_from(contributors) {
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
		use sp_runtime::traits::Saturating;
		frame_system::Pallet::<T>::set_block_number(block_number);
		Pallet::<T>::on_finalize(block_number);
		let next_block = block_number.saturating_add(1_u32.into());
		frame_system::Pallet::<T>::set_block_number(next_block);
		Pallet::<T>::on_initialize(next_block);
	}
}
