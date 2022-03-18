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
//! Run `cargo doc --package module-crowdfunding --open` to view this pallet's documentation.
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
//!

// 1. create campaigns with custom funding goal and runtime
// 2. invest into open campaigns
#![cfg_attr(not(feature = "std"), no_std)]
// #[warn(unused_imports)]
// pub use weights::WeightInfo;
pub mod types;
pub use types::*;

mod mock;
mod tests;

// mod benchmarking;

// TODO: weights
// mod default_weights;

// TODO: externalise error messages
// mod errors;

use frame_support::{
	transactional,
	codec::Encode,
	dispatch::DispatchResult,
	traits::{Randomness, UnixTime, Get}
};

use scale_info::TypeInfo;
use sp_std::vec::Vec;
use sp_runtime::{traits::{AtLeast32BitUnsigned}, Permill};

use orml_traits::{MultiCurrency, MultiReservableCurrency};
use gamedao_traits::{ControlTrait, FlowTrait};
use codec::HasCompact;

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
		type MinCampaignDuration: Get<Self::BlockNumber>;
		#[pallet::constant]
		type MaxCampaignDuration: Get<Self::BlockNumber>;
		#[pallet::constant]
		type MinCreatorDeposit: Get<Self::Balance>;
		#[pallet::constant]
		type MinContribution: Get<Self::Balance>;

		#[pallet::constant]
		type ProtocolTokenId: Get<Self::CurrencyId>;

		// TODO: collect fees for treasury
		#[pallet::constant]
		type CampaignFee: Get<Permill>;
	}

	/// Campaign
	#[pallet::storage]
	#[pallet::getter(fn campaign_by_id)]
	pub(super) type Campaigns<T: Config> = StorageMap<
		_,
		Blake2_128Concat,
		T::Hash,
		Campaign<
			T::Hash,
			T::AccountId,
			T::Balance,
			T::BlockNumber,
			Moment,
			FlowProtocol,
			FlowGovernance,
		>,
		ValueQuery,
	>;

	/// Associated Body
	#[pallet::storage]
	pub(super) type CampaignOrg<T: Config> =
		StorageMap<_, Blake2_128Concat, T::Hash, T::Hash, ValueQuery>;

	/// Get Campaign Owner (body controller) by campaign id
	#[pallet::storage]
	pub(super) type CampaignOwner<T: Config> =
		StorageMap<_, Blake2_128Concat, T::Hash, T::AccountId, OptionQuery>;

	/// Get Campaign Admin (supervision) by campaign id
	#[pallet::storage]
	pub(super) type CampaignAdmin<T: Config> =
		StorageMap<_, Blake2_128Concat, T::Hash, T::AccountId, OptionQuery>;

	/// Campaign state
	/// 0 init, 1 active, 2 paused, 3 complete success, 4 complete failed, 5 authority lock
	#[pallet::storage]
	pub(super) type CampaignState<T: Config> =
		StorageMap<_, Blake2_128Concat, T::Hash, FlowState, ValueQuery, GetDefault>;

	/// Get Campaigns for a certain state
	#[pallet::storage]
	pub(super) type CampaignsByState<T: Config> =
		StorageMap<_, Blake2_128Concat, FlowState, Vec<T::Hash>, ValueQuery>;

	/// Campaigns ending in block x
	#[pallet::storage]
	pub(super) type CampaignsByBlock<T: Config> =
		StorageMap<_, Blake2_128Concat, T::BlockNumber, Vec<T::Hash>, ValueQuery>;

	/// Total number of campaigns -> all campaigns
	#[pallet::storage]
	pub(super) type CampaignsArray<T: Config> =
		StorageMap<_, Blake2_128Concat, u64, T::Hash, ValueQuery>;
	#[pallet::storage]
	pub type CampaignsCount<T: Config> = StorageValue<_, u64, ValueQuery>;
	#[pallet::storage]
	pub(super) type CampaignsIndex<T: Config> =
		StorageMap<_, Blake2_128Concat, T::Hash, u64, ValueQuery>;

	// caller owned campaigns -> my campaigns
	#[pallet::storage]
	pub(super) type CampaignsOwnedArray<T: Config> =
		StorageMap<_, Blake2_128Concat, T::Hash, T::Hash, ValueQuery>;
	#[pallet::storage]
	pub(super) type CampaignsOwnedCount<T: Config> =
		StorageMap<_, Blake2_128Concat, T::Hash, u64, ValueQuery>;
	#[pallet::storage]
	pub(super) type CampaignsOwnedIndex<T: Config> =
		StorageMap<_, Blake2_128Concat, (T::Hash, T::Hash), u64, ValueQuery>;

	/// campaigns contributed by accountid
	#[pallet::storage]
	pub(super) type CampaignsContributed<T: Config> =
		StorageMap<_, Blake2_128Concat, T::AccountId, Vec<T::Hash>, ValueQuery>;

	/// campaigns related to an organisation
	#[pallet::storage]
	pub(super) type CampaignsByOrg<T: Config> =
		StorageMap<_, Blake2_128Concat, T::Hash, Vec<T::Hash>, ValueQuery>;

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
	pub(super) type CampaignBalance<T: Config> =
		StorageMap<_, Blake2_128Concat, T::Hash, T::Balance, ValueQuery>;

	// Contributions per user
	#[pallet::storage]
	pub(super) type CampaignContribution<T: Config> =
		StorageMap<_, Blake2_128Concat, (T::Hash, T::AccountId), T::Balance, ValueQuery>;

	// Contributors
	#[pallet::storage]
	pub(super) type CampaignContributors<T: Config> =
		StorageMap<_, Blake2_128Concat, T::Hash, Vec<T::AccountId>, ValueQuery>;
	#[pallet::storage]
	pub(super) type CampaignContributorsCount<T: Config> =
		StorageMap<_, Blake2_128Concat, T::Hash, u64, ValueQuery>;

	// Max campaign block limit
	// CampaignMaxCampaignDuration get(fn get_max_duration) config(): T::BlockNumber = T::BlockNumber::from(T::MaxCampaignDuration::get());

	// Campaign nonce, increases per created campaign
	#[pallet::storage]
	#[pallet::getter(fn nonce)]
	pub type Nonce<T: Config> = StorageValue<_, u128, ValueQuery>;

	#[pallet::event]
	#[pallet::generate_deposit(pub(super) fn deposit_event)]
	pub enum Event<T: Config> {
		CampaignDestroyed{
			campaign_id: T::Hash
		},
		CampaignCreated{
			campaign_id: T::Hash,
			creator: T::AccountId,
			admin: T::AccountId,
			target: T::Balance,
			deposit: T::Balance,
			expiry: T::BlockNumber,
			name: Vec<u8>,
		},
		CampaignContributed{
			campaign_id: T::Hash,
			sender: T::AccountId,
			contribution: T::Balance,
			block_number: T::BlockNumber
		},
		CampaignFinalized{
			campaign_id: T::Hash,
			campaign_balance: T::Balance,
			block_number: T::BlockNumber,
			success: bool
		},
		CampaignFailed{
			campaign_id: T::Hash,
			campaign_balance: T::Balance,
			block_number: T::BlockNumber,
			success: bool
		},
		CampaignUpdated{
			campaign_id: T::Hash,
			state: FlowState,
			block_number: T::BlockNumber
		},
		Message(Vec<u8>),
	}

	#[pallet::error]
	pub enum Error<T> {
		//
		//	general
		//
		/// Must contribute at least the minimum amount of Campaigns
		ContributionTooSmall,
		/// Balance too low.
		BalanceTooLow,
		/// Treasury Balance Too Low
		TreasuryBalanceTooLow,
		/// The Campaign id specified does not exist
		InvalidId,
		/// The Campaign's contribution period has ended; no more contributions will be accepted
		ContributionPeriodOver,
		/// You may not withdraw or dispense Campaigns while the Campaign is still active
		CampaignStillActive,
		/// You cannot withdraw Campaigns because you have not contributed any
		NoContribution,
		/// You cannot dissolve a Campaign that has not yet completed its retirement period
		CampaignNotRetired,
		/// Campaign expired
		CampaignExpired,
		/// Cannot dispense Campaigns from an unsuccessful Campaign
		UnsuccessfulCampaign,

		//
		//	create
		//
		/// Campaign must end after it starts
		EndTooEarly,
		/// Campaign expiry has be lower than the block number limit
		EndTooLate,
		/// Max contributions per block exceeded
		ContributionsPerBlockExceeded,
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
		//
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
	impl<T: Config> Hooks<BlockNumberFor<T>> for Pallet<T> {
		/// Block finalization
		fn on_finalize(block_number: BlockNumberFor<T>) {
			// which campaigns end in this block
			let campaign_hashes = CampaignsByBlock::<T>::get(block_number);

			// iterate over campaigns ending in this block
			for campaign_id in &campaign_hashes {
				// get campaign struct
				let campaign = Self::campaign_by_id(campaign_id);
				let campaign_balance = CampaignBalance::<T>::get(campaign_id);
				let org = CampaignOrg::<T>::get(&campaign_id);
                // TODO: rename method
				let org_treasury = T::Control::body_treasury(&org);

				// check for cap reached
				if campaign_balance >= campaign.cap {
					// get campaign owner
					// should be controller --- test?
					let _owner = CampaignOwner::<T>::get(campaign_id);

					match _owner {
						Some(owner) => {
							// get all contributors
							let contributors = CampaignContributors::<T>::get(campaign_id);
							let mut transaction_complete = true;

							// 1 iterate over contributors
							// 2 unreserve contribution
							// 3 transfer contribution to campaign treasury
							'inner: for contributor in &contributors {
								// if contributor == campaign owner, skip
								if contributor == &owner {
									continue;
								}

								// get amount from contributor
								let contributor_balance = CampaignContribution::<T>::get((
									*campaign_id,
									contributor.clone(),
								));

								// unreserve the amount in contributor balance
								T::Currency::unreserve(
									T::ProtocolTokenId::get(),
									&contributor,
									contributor_balance.clone(),
								);

								// transfer from contributor
								let transfer_amount = T::Currency::transfer(
									T::ProtocolTokenId::get(),
									&contributor,
									&org_treasury,
									contributor_balance.clone(),
								);

								// success?
								match transfer_amount {
									Err(_e) => {
										transaction_complete = false;
										break 'inner;
									}
									Ok(_v) => {}
								}
							}

							// If all transactions are settled
							// 1. reserve campaign balance
							// 2. unreserve and send the commission to operator treasury
							if transaction_complete {
								// reserve campaign volume
								let _reserve_campaign_amount = T::Currency::reserve(
									T::ProtocolTokenId::get(),
									&org_treasury,
									campaign_balance.clone(),
								);

								let fee = T::CampaignFee::get();
								let commission = fee.mul_floor(campaign_balance.clone());
								T::Currency::unreserve(T::ProtocolTokenId::get(), &org_treasury, commission.clone());

								let _transfer_commission = T::Currency::transfer(
									T::ProtocolTokenId::get(),
									&org_treasury,
									&T::GameDAOTreasury::get(),
									commission,
								);

								// TODO: TransferError?
								// match transfer_commission {
								// 	Err(_e) => {   }, //(Error::<T>::TransferError)
								// 	Ok(_v) => {}
								// }

								Self::set_state(campaign.id.clone(), FlowState::Success);

								// finalized event
								Self::deposit_event(Event::CampaignFinalized{
									campaign_id: *campaign_id,
									campaign_balance,
									block_number,
									success: true,
								});
							}
						}
						None => continue,
					}

				// campaign cap not reached
				} else {
					// campaign failed, revert all contributions

					let contributors = CampaignContributors::<T>::get(campaign_id);
					for account in contributors {
						let contribution =
                            CampaignContribution::<T>::get((*campaign_id, account.clone()));
						T::Currency::unreserve(T::ProtocolTokenId::get(), &account, contribution);
					}

					// update campaign state to failed
					Self::set_state(campaign.id, FlowState::Failed);

					// unreserve DEPOSIT

					T::Currency::unreserve(
						T::ProtocolTokenId::get(),
						&org_treasury,
						campaign.deposit,
					);

					// failed event
					Self::deposit_event(Event::CampaignFailed{
						campaign_id: *campaign_id,
						campaign_balance,
						block_number,
						success: false,
					});
				}
			}
		}
	}

	#[pallet::call]
	impl<T: Config> Pallet<T> {
		#[pallet::weight(5_000_000)]
		// Reason for using transactional is get_and_increment_nonce
		#[transactional]
		pub fn create(
			origin: OriginFor<T>,
			org: T::Hash,
			admin: T::AccountId, // supervision, should be dao provided!
			name: Vec<u8>,
			target: T::Balance,
			deposit: T::Balance,
			expiry: T::BlockNumber,
			protocol: FlowProtocol,
			governance: FlowGovernance,
			cid: Vec<u8>,          // content cid
			token_symbol: Vec<u8>, // up to 5
			token_name: Vec<u8>,   // cleartext
								   // token_curve_a: u8,      // preset
								   // token_curve_b: Vec<u8>, // custom
		) -> DispatchResult {
			let creator = ensure_signed(origin)?;
            
            // TODO: rename method
			let owner = T::Control::body_controller(&org);

			ensure!(creator == owner, Error::<T>::AuthorizationError);

			// Get Treasury account for deposits and fees

            // TODO: rename method
			let treasury = T::Control::body_treasury(&org);

			let free_balance = T::Currency::free_balance(T::ProtocolTokenId::get(), &treasury);
			ensure!(free_balance > deposit, Error::<T>::TreasuryBalanceTooLow);
			ensure!(deposit <= target, Error::<T>::DepositTooHigh);

			// check name length boundary
			ensure!(
				(name.len() as u32) >= T::MinNameLength::get(),
				Error::<T>::NameTooShort
			);
			ensure!(
				(name.len() as u32) <= T::MaxNameLength::get(),
				Error::<T>::NameTooLong
			);

			let current_block = <frame_system::Pallet<T>>::block_number();

			// ensure campaign expires after the current block
			ensure!(expiry > current_block, Error::<T>::EndTooEarly);

			let max_length = T::MaxCampaignDuration::get();
			let max_end_block = current_block + max_length;
			ensure!(expiry <= max_end_block, Error::<T>::EndTooLate);

			// generate the unique campaign id + ensure uniqueness
			let nonce = Self::get_and_increment_nonce();
			let (id, _) = T::Randomness::random(&nonce);
			// ensure!(!<CampaignOwner<T>>::exists(&id), Error::<T>::IdExists ); // check for collision

			// check contribution limit per block
			let contributions = CampaignsByBlock::<T>::get(expiry);
			ensure!(
				(contributions.len() as u32) < T::MaxCampaignsPerBlock::get(),
				Error::<T>::ContributionsPerBlockExceeded
			);

			let new_campaign = Campaign {
				id: id.clone(),
				org: org.clone(),
				name: name.clone(),
				owner: creator.clone(),
				admin: admin.clone(),
				deposit: deposit.clone(),
				expiry: expiry.clone(),
				cap: target.clone(),
				protocol: protocol.clone(),
				governance: governance.clone(),
				cid: cid.clone(),
				token_symbol: token_symbol.clone(),
				token_name: token_name.clone(),
				// created: T::UnixTime::now(),
                created: T::UnixTime::now().as_secs(),
			};

			// mint the campaign
			Self::mint(new_campaign)?;

			// 0 init, 1 active, 2 paused, 3 complete success, 4 complete failed, 5 authority lock
			Self::set_state(id.clone(), FlowState::Active);

			// deposit the event
			Self::deposit_event(Event::CampaignCreated{
				campaign_id: id, creator, admin, target, deposit, expiry, name,
			});
			Ok(())

			// No fees are paid here if we need to create this account;
			// that's why we don't just use the stock `transfer`.
			// T::Currency::resolve_creating(&Self::campaign_account_id(index), imb);
		}

		#[pallet::weight(1_000_000)]
		pub fn update_state(
			origin: OriginFor<T>,
			campaign_id: T::Hash,
			state: FlowState,
		) -> DispatchResult {
			// access control
			let sender = ensure_signed(origin)?;

			CampaignOwner::<T>::get(campaign_id).ok_or(Error::<T>::OwnerUnknown)?;
			let admin = CampaignAdmin::<T>::get(campaign_id).ok_or(Error::<T>::AdminUnknown)?;
			ensure!(sender == admin, Error::<T>::AuthorizationError);

			// expired?
			let campaign = Self::campaign_by_id(&campaign_id);
			let current_block = <frame_system::Pallet<T>>::block_number();
			ensure!(current_block < campaign.expiry, Error::<T>::CampaignExpired);

			// not finished or locked?
			let current_state = CampaignState::<T>::get(campaign_id);
			ensure!(
				current_state < FlowState::Success,
				Error::<T>::CampaignExpired
			);

			Self::set_state(campaign_id.clone(), state.clone());

			// dispatch status update event
			Self::deposit_event(Event::CampaignUpdated{campaign_id, state, block_number: current_block});

			Ok(())
		}

		/// contribute to project
		#[pallet::weight(5_000_000)]
		pub fn contribute(
			origin: OriginFor<T>,
			campaign_id: T::Hash,
			contribution: T::Balance,
		) -> DispatchResult {
			// check

			let sender = ensure_signed(origin)?;
			ensure!(
				T::Currency::free_balance(T::ProtocolTokenId::get(), &sender) >= contribution,
				Error::<T>::BalanceTooLow
			);
			let owner = CampaignOwner::<T>::get(campaign_id).ok_or(Error::<T>::OwnerUnknown)?;
			ensure!(owner != sender, Error::<T>::NoContributionToOwnCampaign);

			ensure!(
				Campaigns::<T>::contains_key(campaign_id),
				Error::<T>::InvalidId
			);
			let state = CampaignState::<T>::get(campaign_id);
			ensure!(
				state == FlowState::Active,
				Error::<T>::NoContributionsAllowed
			);
			let campaign = Self::campaign_by_id(&campaign_id);
			ensure!(
				<frame_system::Pallet<T>>::block_number() < campaign.expiry,
				Error::<T>::CampaignExpired
			);

			// write

			Self::create_contribution(sender.clone(), campaign_id.clone(), contribution.clone())?;

			// event

			Self::deposit_event(Event::CampaignContributed{
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
	fn set_state(id: T::Hash, state: FlowState) {
		let current_state = CampaignState::<T>::get(&id);

		// remove
        
		let mut current_state_members = CampaignsByState::<T>::get(&current_state);
		match current_state_members.binary_search(&id) {
			Ok(index) => {
				current_state_members.remove(index);
				CampaignsByState::<T>::insert(&current_state, current_state_members);
			}
			Err(_) => (), //(Error::<T>::IdUnknown)
		}

		// add
		CampaignsByState::<T>::mutate(&state, |campaigns| campaigns.push(id.clone()));
		CampaignState::<T>::insert(id, state);
	}

	// campaign creator
	// sender: T::AccountId,
	// generated campaign id
	// campaign_id: T::Hash,
	// expiration blocktime
	// example: desired lifetime == 30 days
	// 30 days * 24h * 60m / 5s avg blocktime ==
	// 2592000s / 5s == 518400 blocks from now.
	// expiry: T::BlockNumber,
	// campaign creator deposit to invoke the campaign
	// deposit: Balance,
	// funding protocol
	// 0 grant, 1 prepaid, 2 loan, 3 shares, 4 dao, 5 pool
	// proper assignment of funds into the instrument
	// happens after successful funding of the campaing
	// protocol: u8,
	// campaign object
	pub fn mint(
		campaign: Campaign<
			T::Hash,
			T::AccountId,
			T::Balance,
			T::BlockNumber,
			Moment,
			FlowProtocol,
			FlowGovernance,
		>,
	) -> DispatchResult {
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
		CampaignsByBlock::<T>::mutate(&campaign.expiry, |campaigns| {
			campaigns.push(campaign.id.clone())
		});

		// global campaigns count
        
		let campaigns_count = CampaignsCount::<T>::get();
		let update_campaigns_count = campaigns_count
			.checked_add(1)
			.ok_or(Error::<T>::AddCampaignOverflow)?;

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
        // TODO: rename method
		let treasury = T::Control::body_treasury(&campaign.org);

		T::Currency::reserve(
			T::ProtocolTokenId::get(),
			&treasury,
			campaign.deposit.clone(),
		)?;

		Ok(())
	}
	
	fn create_contribution(
		sender: T::AccountId,
		campaign_id: T::Hash,
		contribution: T::Balance,
	) -> DispatchResult {
		let returning_contributor =
			CampaignContribution::<T>::contains_key((&campaign_id, &sender));

		// check if contributor exists
		// if not, update metadata
		if !returning_contributor {
			// increase the number of contributors
			let campaigns_contributed = CampaignsContributedCount::<T>::get(&sender);
			CampaignsContributedArray::<T>::insert(
				(sender.clone(), campaigns_contributed),
				campaign_id,
			);
			CampaignsContributedIndex::<T>::insert(
				(sender.clone(), campaign_id.clone()),
				campaigns_contributed,
			);

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
			CampaignContributors::<T>::mutate(&campaign_id, |accounts| {
				accounts.push(sender.clone())
			});
		}

		// check if campaign is in contributions map of contributor and add
		let mut campaigns_contributed = CampaignsContributed::<T>::get(&sender);
		if !campaigns_contributed.contains(&campaign_id) {
			campaigns_contributed.push(campaign_id.clone());
			CampaignsContributed::<T>::insert(&sender, campaigns_contributed);
		}

		// reserve contributed amount
		T::Currency::reserve(T::ProtocolTokenId::get(), &sender, contribution)?;

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

	fn get_and_increment_nonce() -> Vec<u8> {
		let nonce = Nonce::<T>::get();
		Nonce::<T>::put(nonce.wrapping_add(1));
		nonce.encode()
	}
}

impl <T: Config>FlowTrait<T::Hash, T::Balance> for Pallet<T> {

    type FlowState = FlowState;

	fn campaign_balance(hash: &T::Hash) -> T::Balance {
		CampaignBalance::<T>::get(hash)
	}
    fn campaign_state(hash: &T::Hash) -> Self::FlowState {
    	CampaignState::<T>::get(hash)
    }
    fn campaign_contributors_count(hash: &T::Hash) -> u64 {
    	CampaignContributorsCount::<T>::get(hash)
    }
    fn campaign_org(hash: &T::Hash) -> T::Hash {
    	CampaignOrg::<T>::get(hash)
    }
}