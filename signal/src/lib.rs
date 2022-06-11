//      _______  ________  ________  ________   ______   _______   _______
//    ╱╱       ╲╱        ╲╱        ╲╱        ╲_╱      ╲╲╱       ╲╲╱       ╲╲
//   ╱╱      __╱         ╱         ╱         ╱        ╱╱        ╱╱        ╱╱
//  ╱       ╱ ╱         ╱         ╱        _╱         ╱         ╱         ╱
//  ╲________╱╲___╱____╱╲__╱__╱__╱╲________╱╲________╱╲___╱____╱╲________╱
//
// This file is part of GameDAO Protocol.
// Copyright (C) 2018-2022 GameDAO AG.
// SPDX-License-Identifier: Apache-2.0

//! SIGNAL
//! TODO: add description (module, function, Cargo.toml)

#![cfg_attr(not(feature = "std"), no_std)]

pub mod types;
pub mod migration;

#[cfg(test)]
pub mod mock;
#[cfg(test)]
mod tests;
// #[cfg(feature = "runtime-benchmarks")]
// mod benchmarking;

use frame_support::{{traits::StorageVersion}, transactional, dispatch::DispatchResult, weights::{GetDispatchInfo, Weight}};
use frame_system::{ensure_signed, WeightInfo};
use orml_traits::{MultiCurrency, MultiReservableCurrency};
use sp_runtime::traits::{AtLeast32BitUnsigned, CheckedAdd, CheckedSub, Zero, Hash};
use sp_std::vec::Vec;
use codec::HasCompact;

use gamedao_traits::{ControlTrait, FlowTrait};

use types::{Proposal, ProposalMetadata, ProposalState, ProposalType, VotingType};

pub use pallet::*;

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
		type Balance: Member
			+ Parameter
			+ AtLeast32BitUnsigned
			+ Default
			+ CheckedAdd
			+ CheckedSub
			+ Copy
			+ Zero
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
		type Currency: MultiCurrency<Self::AccountId, CurrencyId = Self::CurrencyId, Balance = Self::Balance>
			+ MultiReservableCurrency<Self::AccountId>;
		type Control: ControlTrait<Self::AccountId, Self::Hash>;
		type Flow: FlowTrait<Self::AccountId, Self::Balance, Self::Hash>;
		type WeightInfo: WeightInfo;

		#[pallet::constant]
		type MaxProposalsPerBlock: Get<u32>; // 3

		#[pallet::constant]
		type MaxProposalDuration: Get<u32>; // 864000, 60 * 60 * 24 * 30 / 3

		#[pallet::constant]
		type PaymentTokenId: Get<Self::CurrencyId>;
		#[pallet::constant]
		type ProtocolTokenId: Get<Self::CurrencyId>;
	}

	/// Global status
	#[pallet::storage]
	pub(super) type Proposals<T: Config> =
		StorageMap<_, Blake2_128Concat, T::Hash, Proposal<T::Hash, T::BlockNumber>, OptionQuery>;

	#[pallet::storage]
	pub(super) type Metadata<T: Config> =
		StorageMap<_, Blake2_128Concat, T::Hash, ProposalMetadata<T::Balance>, ValueQuery>;

	#[pallet::storage]
	pub(super) type Owners<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, T::AccountId, OptionQuery>;

	#[pallet::storage]
	pub(super) type ProposalStates<T: Config> =
		StorageMap<_, Blake2_128Concat, T::Hash, ProposalState, ValueQuery, GetDefault>;

	/// Maximum time limit for a proposal
	#[pallet::type_value]
	pub(super) fn ProposalTimeLimitDefault<T: Config>() -> T::BlockNumber {
		T::BlockNumber::from(T::MaxProposalDuration::get())
	}
	#[pallet::storage]
	pub(super) type ProposalTimeLimit<T: Config> =
		StorageValue<_, T::BlockNumber, ValueQuery, ProposalTimeLimitDefault<T>>;

	/// All proposals
	#[pallet::storage]
	pub(super) type ProposalsArray<T: Config> = StorageMap<_, Blake2_128Concat, u64, T::Hash, ValueQuery>;

	#[pallet::storage]
	pub(super) type ProposalsCount<T: Config> = StorageValue<_, u64, ValueQuery>;

	#[pallet::storage]
	pub(super) type ProposalsIndex<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, u64, ValueQuery>;

	/// Proposals by org
	#[pallet::storage]
	pub(super) type ProposalsByOrgArray<T: Config> =
		StorageMap<_, Blake2_128Concat, (T::Hash, u64), T::Hash, ValueQuery>;

	#[pallet::storage]
	pub(super) type ProposalsByOrgCount<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, u64, ValueQuery>;

	#[pallet::storage]
	pub(super) type ProposalsByOrgIndex<T: Config> =
		StorageMap<_, Blake2_128Concat, (T::Hash, T::Hash), u64, ValueQuery>;

	#[pallet::storage]
	pub(super) type ProposalsByOrg<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, Vec<T::Hash>, ValueQuery>;

	/// Proposals by owner
	#[pallet::storage]
	pub(super) type ProposalsByOwnerArray<T: Config> =
		StorageMap<_, Blake2_128Concat, (T::AccountId, u64), T::Hash, ValueQuery>;

	#[pallet::storage]
	pub(super) type ProposalsByOwnerCount<T: Config> = StorageMap<_, Blake2_128Concat, T::AccountId, u64, ValueQuery>;

	#[pallet::storage]
	pub(super) type ProposalsByOwnerIndex<T: Config> =
		StorageMap<_, Blake2_128Concat, (T::AccountId, T::Hash), u64, ValueQuery>;

	/// Proposals where voter participated
	#[pallet::storage]
	pub(super) type ProposalsByVoter<T: Config> =
		StorageMap<_, Blake2_128Concat, T::AccountId, Vec<(T::Hash, bool)>, ValueQuery>;

	/// Proposal voters and votes by proposal
	#[pallet::storage]
	pub(super) type ProposalVotesByVoters<T: Config> =
		StorageMap<_, Blake2_128Concat, T::Hash, Vec<(T::AccountId, bool)>, ValueQuery>;

	/// Total proposals voted on by voter
	#[pallet::storage]
	pub(super) type ProposalsByVoterCount<T: Config> = StorageMap<_, Blake2_128Concat, T::AccountId, u64, ValueQuery>;

	/// Proposals ending in a block
	#[pallet::storage]
	pub(super) type ProposalsByBlock<T: Config> =
		StorageMap<_, Blake2_128Concat, T::BlockNumber, Vec<T::Hash>, ValueQuery>;

	/// The amount of currency that a project has used
	#[pallet::storage]
	pub(super) type CampaignBalanceUsed<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, T::Balance, ValueQuery>;

	/// The number of people who approve a proposal
	#[pallet::storage]
	pub(super) type ProposalApprovers<T: Config> =
		StorageMap<_, Blake2_128Concat, T::Hash, u64, ValueQuery, GetDefault>;

	/// The number of people who deny a proposal
	#[pallet::storage]
	pub(super) type ProposalDeniers<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, u64, ValueQuery, GetDefault>;

	/// Voters per proposal
	#[pallet::storage]
	pub(super) type ProposalVoters<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, Vec<T::AccountId>, ValueQuery>;

	/// Voter count per proposal
	#[pallet::storage]
	pub(super) type ProposalVotes<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, u64, ValueQuery, GetDefault>;

	/// Ack vs Nack
	#[pallet::storage]
	pub(super) type ProposalSimpleVotes<T: Config> =
		StorageMap<_, Blake2_128Concat, T::Hash, (u64, u64), ValueQuery, GetDefault>;

	/// User has voted on a proposal
	#[pallet::storage]
	pub(super) type VotedBefore<T: Config> =
		StorageMap<_, Blake2_128Concat, (T::AccountId, T::Hash), bool, ValueQuery, GetDefault>;

	// TODO: ProposalTotalEligibleVoters
	// TODO: ProposalApproversWeight
	// TODO: ProposalDeniersWeight
	// TODO: ProposalTotalEligibleWeight

	/// The total number of proposals
	#[pallet::storage]
	#[pallet::getter(fn nonce)]
	pub(super) type Nonce<T: Config> = StorageValue<_, u128, ValueQuery>;

	#[pallet::event]
	#[pallet::generate_deposit(pub(super) fn deposit_event)]
	pub enum Event<T: Config> {
		Proposal {
			sender_id: T::AccountId,
			proposal_id: T::Hash,
		},
		ProposalCreated {
			sender_id: T::AccountId,
			org_id: T::Hash,
			campaign_id: Option<T::Hash>,
			proposal_id: T::Hash,
			amount: T::Balance,
			expiry: T::BlockNumber,
		},
		ProposalVoted {
			sender_id: T::AccountId,
			proposal_id: T::Hash,
			vote: bool,
		},
		// ProposalFinalized(T::Hash, u8),
		ProposalApproved {
			proposal_id: T::Hash,
		},
		ProposalRejected {
			proposal_id: T::Hash,
		},
		ProposalExpired {
			proposal_id: T::Hash,
		},
		// ProposalAborted(T::Hash),
		// ProposalError(T::Hash, Vec<u8>),
		WithdrawalGranted {
			proposal_id: T::Hash,
			campaign_id: T::Hash,
			org_id: T::Hash,
		},
	}

	#[pallet::error]
	pub enum Error<T> {
		/// Proposal Ended
		ProposalEnded,
		/// Proposal Exists
		ProposalExists,
		/// Proposal Expired
		ProposalExpired,
		/// Already Voted
		AlreadyVoted,
		/// Proposal Unknown
		ProposalUnknown,
		/// DAO Inactive
		DAOInactive,
		/// Authorization Error
		AuthorizationError,
		/// Tangram Creation Failed
		TangramCreationError,
		/// Out Of Bounds Error
		OutOfBounds,
		/// Unknown Error
		UnknownError,
		///MemberExists
		MemberExists,
		/// Unknown Campaign
		CampaignUnknown,
		/// Campaign Failed
		CampaignFailed,
		/// Balance Too Low
		BalanceInsufficient,
		/// Hash Collision
		HashCollision,
		/// Unknown Account
		UnknownAccount,
		/// Too Many Proposals for block
		TooManyProposals,
		/// Proposal has no owner
		NoProposalOwner,
		/// Overflow Error
		OverflowError,
		/// Division Error
		DivisionError,
	}

	#[pallet::call]
	impl<T: Config> Pallet<T> {
		// TODO: One create proposal Extrinsic. Optional parameters (struct, parameter
		// or None) - not yet clear TODO: Remove all mutable data from the respective
		// structs. Ex. title -> ipfs (mutation should be cheap)

		/// Create a general proposal
		///
		/// - `org_id`:
		/// - `title`:
		/// - `cid`:
		/// - `start`:
		/// - `expiry`:
		///
		/// Emits `Proposal` event when successful.
		///
		/// Weight:
		#[pallet::weight(5_000_000)]
		#[transactional]
		pub fn general_proposal(
			origin: OriginFor<T>,
			org_id: T::Hash,
			title: Vec<u8>,
			cid: Vec<u8>,
			start: T::BlockNumber,
			expiry: T::BlockNumber,
		) -> DispatchResult {
			let sender = ensure_signed(origin)?;

			ensure!(T::Control::is_org_active(&org_id), Error::<T>::DAOInactive);
			ensure!(
				T::Control::is_org_member_active(&org_id, &sender),
				Error::<T>::AuthorizationError
			);

			let current_block = <frame_system::Pallet<T>>::block_number();
			ensure!(expiry > current_block, Error::<T>::OutOfBounds);
			ensure!(
				expiry <= current_block + ProposalTimeLimit::<T>::get(),
				Error::<T>::OutOfBounds
			);
			let proposals = ProposalsByBlock::<T>::get(expiry);
			ensure!(
				(proposals.len() as u32) < T::MaxProposalsPerBlock::get(),
				Error::<T>::TooManyProposals
			);

			let nonce = Self::get_and_increment_nonce();
			let proposal_id = T::Hashing::hash_of(&nonce);
			ensure!(!Proposals::<T>::contains_key(&proposal_id), Error::<T>::ProposalExists);

			Self::create_proposal(
				&sender, proposal_id.clone(), org_id, None, title, cid, T::Balance::zero(),
				ProposalType::General, VotingType::Simple, start, expiry
			)?;

			Self::deposit_event(Event::<T>::Proposal {
				sender_id: sender,
				proposal_id,
			});
			Ok(())
		}

		// TODO: membership proposal for a DAO

		/// Create a membership proposal
		///
		/// - `org_id`:
		/// - `_member`:
		/// - `_action`:
		/// - `_start`:
		/// - `_expiry`:
		///
		/// Emits `Proposal` event when successful.
		///
		/// Weight:
		#[pallet::weight(5_000_000)]
		pub fn membership_proposal(
			origin: OriginFor<T>,
			org_id: T::Hash,
			_member: T::Hash,
			_action: u8,
			_start: T::BlockNumber,
			_expiry: T::BlockNumber,
		) -> DispatchResult {
			let sender = ensure_signed(origin)?;
			// ensure active
			// ensure member
			// match action
			// action
			// deposit event
			// Self::deposit_event(Event::<T>::Proposal {
			// 	sender_id: sender,
			// 	proposal_id: campaign_id,
			// });
			Ok(())
		}

		/// Create a withdrawal proposal
		/// origin must be controller of the campaign == controller of the dao
		/// beneficiary must be the treasury of the dao
		///
		/// - `campaign_id`:
		/// - `title`:
		/// - `cid`:
		/// - `amount`:
		/// - `start`:
        /// - `expiry`:
		///
		/// Emits `Proposal` event when successful.
		///
		/// Weight:
		#[pallet::weight(5_000_000)]
		#[transactional]
		pub fn withdraw_proposal(
			origin: OriginFor<T>,
			campaign_id: T::Hash,
			title: Vec<u8>,
			cid: Vec<u8>,
			amount: T::Balance,
			start: T::BlockNumber,
			expiry: T::BlockNumber,
		) -> DispatchResult {
			let sender = ensure_signed(origin)?;

			ensure!(T::Flow::is_campaign_succeeded(&campaign_id), Error::<T>::CampaignFailed);

			let owner = T::Flow::campaign_owner(&campaign_id).ok_or(Error::<T>::AuthorizationError)?;
			ensure!(sender == owner, Error::<T>::AuthorizationError);

			let current_block = <frame_system::Pallet<T>>::block_number();
			ensure!(start > current_block, Error::<T>::OutOfBounds );
			ensure!(expiry > start, Error::<T>::OutOfBounds );
			ensure!(
				expiry <= current_block + ProposalTimeLimit::<T>::get(),
				Error::<T>::OutOfBounds
			);

			let used_balance = CampaignBalanceUsed::<T>::get(&campaign_id);
			let total_balance = T::Flow::campaign_balance(&campaign_id);
			let remaining_balance = total_balance
				.checked_sub(&used_balance)
				.ok_or(Error::<T>::BalanceInsufficient)?;
			ensure!(remaining_balance >= amount, Error::<T>::BalanceInsufficient);

			let proposals = ProposalsByBlock::<T>::get(expiry);
			ensure!(
				(proposals.len() as u32) < T::MaxProposalsPerBlock::get(),
				Error::<T>::TooManyProposals
			);
			
			let nonce = Self::get_and_increment_nonce();
			let proposal_id = T::Hashing::hash_of(&nonce);
			ensure!(!Proposals::<T>::contains_key(&proposal_id), Error::<T>::ProposalExists);

			let org_id = T::Flow::campaign_org(&campaign_id);
			Self::create_proposal(
				&sender, proposal_id, org_id, Some(campaign_id), title, cid, amount,
				ProposalType::Withdrawal, VotingType::Simple, start, expiry
			);

			Self::deposit_event(Event::<T>::ProposalCreated {
				sender_id: sender,
				org_id,
				campaign_id: Some(campaign_id),
				proposal_id,
				amount,
				expiry,
			});
			Ok(())
		}

		// TODO: voting vs staking, e.g.
		// 1. token weighted and democratic voting require yes/no
		// 2. conviction voting requires ongoing staking
		// 3. quadratic voting

		/// Create a simple voting
		///
		/// - `proposal_id`:
		/// - `vote`:
		///
		/// Emits `ProposalVoted` event when successful.
		///
		/// Weight:
		#[pallet::weight(5_000_000)]
		pub fn simple_vote(origin: OriginFor<T>, proposal_id: T::Hash, vote: bool) -> DispatchResult {
			let sender = ensure_signed(origin)?;

			let proposal = Proposals::<T>::get(&proposal_id).ok_or(Error::<T>::ProposalUnknown)?;

			// Ensure the proposal has not ended
			let proposal_state = ProposalStates::<T>::get(&proposal_id);
			ensure!(proposal_state == ProposalState::Active, Error::<T>::ProposalEnded);

			// Ensure the contributor did not vote before
			ensure!(
				!VotedBefore::<T>::get((sender.clone(), proposal_id.clone())),
				Error::<T>::AlreadyVoted
			);

			// Ensure the proposal is not expired
			ensure!(
				<frame_system::Pallet<T>>::block_number() < proposal.expiry,
				Error::<T>::ProposalExpired
			);

			// TODO: ensure origin is one of:
			// a. member when the proposal is general
			// b. contributor when the proposal is a withdrawal request
			// let sender_balance =
			// <campaign::Module<T>>::campaign_contribution(proposal.campaign_id,
			// sender.clone()); ensure!( sender_balance > T::Balance::from(0), "You are not
			// a contributor of this Campaign");

			Self::perform_vote(&sender, &proposal, vote)?;

			// dispatch vote event
			Self::deposit_event(Event::<T>::ProposalVoted {
				sender_id: sender,
				proposal_id: proposal_id.clone(),
				vote,
			});
			Ok(())
		}
	}

	#[pallet::hooks]
	impl<T: Config> Hooks<BlockNumberFor<T>> for Pallet<T> {

		fn on_runtime_upgrade() -> frame_support::weights::Weight {
			migration::migrate::<T>()
		}

		fn on_finalize(block_number: T::BlockNumber) {
			let proposal_hashes = ProposalsByBlock::<T>::get(&block_number);

			for proposal_id in &proposal_hashes {
				let mut proposal_state = ProposalStates::<T>::get(&proposal_id);
				if proposal_state != ProposalState::Active {
					continue;
				};

				let item = Proposals::<T>::get(&proposal_id);
				if item.is_none() {
					continue; // should never happen
				}
				let proposal = item.unwrap();

				// TODO:
				// a. result( accepted, rejected )
				// b. result( accepted, rejected, total_allowed )
				// c. result( required_majority, staked_accept, staked_reject, slash_amount )
				// d. threshold reached
				// e. conviction

				match &proposal.proposal_type {
					ProposalType::General => {
						// simple vote
						let (yes, no) = ProposalSimpleVotes::<T>::get(&proposal_id);
						if yes > no {
							proposal_state = ProposalState::Accepted;
						}
						if yes <= no {
							proposal_state = ProposalState::Rejected;
						}
						if yes == 0 && no == 0 {
							proposal_state = ProposalState::Expired;
						}
					}
					ProposalType::Withdrawal => {
						// treasury
						// 50% majority of eligible voters
						let (yes, _no) = ProposalSimpleVotes::<T>::get(&proposal_id);
						let campaign_id = &proposal.campaign_id.unwrap();
						let contributors = T::Flow::campaign_contributors_count(&campaign_id);
						// TODO: dynamic threshold
						let threshold = contributors.checked_div(2).ok_or(Error::<T>::DivisionError);
						match threshold {
							Ok(t) => {
								if yes > t {
									proposal_state = ProposalState::Accepted;
									// TODO: handle an error
									Self::unlock_balance(&proposal, yes);
								} else {
									proposal_state = ProposalState::Rejected;
								}
							}
							Err(_err) => {
								// todo: logic on error event
							}
						}
					}
					ProposalType::Member => {
						// membership
						//
					}
					_ => {
						// no result - fail
						proposal_state = ProposalState::Expired;
					}
				}

				ProposalStates::<T>::insert(&proposal_id, proposal_state.clone());

				match proposal_state {
					ProposalState::Accepted => {
						Self::deposit_event(Event::<T>::ProposalApproved {
							proposal_id: proposal_id.clone(),
						});
					}
					ProposalState::Rejected => {
						Self::deposit_event(Event::<T>::ProposalRejected {
							proposal_id: proposal_id.clone(),
						});
					}
					ProposalState::Expired => {
						Self::deposit_event(Event::<T>::ProposalExpired {
							proposal_id: proposal_id.clone(),
						});
					}
					_ => {}
				}
			}
		}
	}

	impl<T: Config> Pallet<T> {
		// TODO: DISCUSSION
		// withdrawal proposals are accepted
		// when the number of approvals is higher
		// than the number of rejections
		// accepted / denied >= 1
		fn unlock_balance(proposal: &Proposal<T::Hash, T::BlockNumber>, _supported_count: u64) -> Result<(), Error<T>> {
			let metadata = Metadata::<T>::get(&proposal.proposal_id);

			// Ensure sufficient balance
			let proposal_balance = metadata.amount;
			let campaign_id = proposal.campaign_id.unwrap();
			let total_balance = T::Flow::campaign_balance(&campaign_id);
			let used_balance = CampaignBalanceUsed::<T>::get(&campaign_id);
			let available_balance = total_balance
				.checked_sub(&used_balance)
				.ok_or(Error::<T>::BalanceInsufficient)?;
			ensure!(available_balance >= proposal_balance, Error::<T>::BalanceInsufficient);

			// Get the owner of the campaign
			let _owner = Owners::<T>::get(&proposal.proposal_id).ok_or(Error::<T>::NoProposalOwner)?;

			// get treasury account for related org and unlock balance
			let org_id = T::Flow::campaign_org(&campaign_id);
			let treasury_account = T::Control::org_treasury_account(&org_id);
			T::Currency::unreserve(T::PaymentTokenId::get(), &treasury_account, proposal_balance);

			// Change the used amount
			let new_used_balance = used_balance
				.checked_add(&proposal_balance)
				.ok_or(Error::<T>::OverflowError)?;
			CampaignBalanceUsed::<T>::insert(&campaign_id, new_used_balance);

			// proposal completed
			ProposalStates::<T>::insert(proposal.proposal_id, ProposalState::Finalized);

			Self::deposit_event(Event::<T>::WithdrawalGranted {
				proposal_id: proposal.proposal_id,
				campaign_id,
				org_id
			});
			Ok(())
		}

		fn create_proposal(
			sender: &T::AccountId,
			proposal_id: T::Hash,
			org_id: T::Hash,
			campaign_id: Option<T::Hash>,
			title: Vec<u8>,
			cid: Vec<u8>,
			amount: T::Balance,
			proposal_type: ProposalType,
			voting_type: VotingType,
			start: T::BlockNumber,
			expiry: T::BlockNumber,
		) -> Result<T::Hash, Error<T>> {
			let proposal = Proposal {
				proposal_id: proposal_id.clone(),
				org_id: org_id.clone(),
				campaign_id: campaign_id,
				proposal_type: proposal_type,
				voting_type: voting_type,
				start,
				expiry,
			};
			let metadata = ProposalMetadata {
				title: title,
				cid: cid,
				amount: amount,
			};

			let proposals_count = ProposalsCount::<T>::get();
			let updated_proposals_count = proposals_count.checked_add(1).ok_or(Error::<T>::OverflowError)?;
			let proposals_by_org_count = ProposalsByOrgCount::<T>::get(&org_id);
			let updated_proposals_by_org_count = proposals_by_org_count
				.checked_add(1)
				.ok_or(Error::<T>::OverflowError)?;
			let proposals_by_owner_count = ProposalsByOwnerCount::<T>::get(&sender);
			let updated_proposals_by_owner_count = proposals_by_owner_count
				.checked_add(1)
				.ok_or(Error::<T>::OverflowError)?;

			// insert proposals
			Proposals::<T>::insert(proposal_id.clone(), proposal.clone());
			Metadata::<T>::insert(proposal_id.clone(), metadata.clone());
			Owners::<T>::insert(proposal_id.clone(), sender.clone());
			ProposalStates::<T>::insert(proposal_id.clone(), ProposalState::Active);
			// update max per block
			ProposalsByBlock::<T>::mutate(expiry, |proposals| proposals.push(proposal_id.clone()));
			// update proposal map
			ProposalsArray::<T>::insert(&proposals_count, proposal_id.clone());
			ProposalsCount::<T>::put(updated_proposals_count);
			ProposalsIndex::<T>::insert(proposal_id.clone(), proposals_count);
			// update org map
			ProposalsByOrgArray::<T>::insert(
				(org_id.clone(), proposals_by_org_count.clone()),
				proposal_id.clone(),
			);
			ProposalsByOrgCount::<T>::insert(org_id.clone(), updated_proposals_by_org_count);
			ProposalsByOrgIndex::<T>::insert(
				(org_id.clone(), proposal_id.clone()),
				proposals_by_org_count,
			);
			ProposalsByOrg::<T>::mutate(org_id.clone(), |proposals| proposals.push(proposal_id.clone()));
			// update owner map
			ProposalsByOwnerArray::<T>::insert((sender.clone(), proposals_by_owner_count.clone()), proposal_id.clone());
			ProposalsByOwnerCount::<T>::insert(sender.clone(), updated_proposals_by_owner_count);
			ProposalsByOwnerIndex::<T>::insert((sender.clone(), proposal_id.clone()), proposals_by_owner_count);

			Ok(proposal_id)
		}

		fn perform_vote(
			sender: &T::AccountId,
			proposal: &Proposal<T::Hash, T::BlockNumber>,
			vote: bool,
		) -> Result<(), Error<T>> {
			let proposal_id = &proposal.proposal_id;

			match &proposal.proposal_type {
				// DAO Democratic Proposal
				// simply one member one vote yes / no,
				// TODO: ratio definable, now > 50% majority wins
				ProposalType::General => {
					let (mut yes, mut no) = ProposalSimpleVotes::<T>::get(&proposal_id);

					match vote {
						true => {
							yes = yes.checked_add(1).ok_or(Error::<T>::OverflowError)?;
							let proposal_approvers = ProposalApprovers::<T>::get(&proposal_id);
							let updated_proposal_approvers =
								proposal_approvers.checked_add(1).ok_or(Error::<T>::OverflowError)?;
							ProposalApprovers::<T>::insert(proposal_id.clone(), updated_proposal_approvers.clone());
						}
						false => {
							no = no.checked_add(1).ok_or(Error::<T>::OverflowError)?;
							let proposal_deniers = ProposalDeniers::<T>::get(&proposal_id);
							let updated_proposal_deniers =
								proposal_deniers.checked_add(1).ok_or(Error::<T>::OverflowError)?;
							ProposalDeniers::<T>::insert(proposal_id.clone(), updated_proposal_deniers.clone());
						}
					}

					ProposalSimpleVotes::<T>::insert(proposal_id.clone(), (yes, no));
				}
				// 50% majority over total number of campaign contributors
				ProposalType::Withdrawal => {
					let (mut yes, mut no) = ProposalSimpleVotes::<T>::get(&proposal_id);

					match vote {
						true => {
							yes = yes.checked_add(1).ok_or(Error::<T>::OverflowError)?;

							let current_approvers = ProposalApprovers::<T>::get(&proposal_id);
							let updated_approvers =
								current_approvers.checked_add(1).ok_or(Error::<T>::OverflowError)?;
							ProposalApprovers::<T>::insert(proposal_id.clone(), updated_approvers.clone());

							let campaign_id = &proposal.campaign_id.unwrap();
							let contributors = T::Flow::campaign_contributors_count(&campaign_id);
							// TODO: make this variable
							let threshold = contributors.checked_div(2).ok_or(Error::<T>::DivisionError)?;
							if updated_approvers > threshold {
								// todo: if proposal finished ahead of expiry, probably remove it from expiry
								// proposals mapping?
								Self::unlock_balance(&proposal, updated_approvers)?;
							}
						}
						false => {
							no = no.checked_add(1).ok_or(Error::<T>::OverflowError)?;
							// remove
							let proposal_deniers = ProposalDeniers::<T>::get(&proposal_id);
							let updated_proposal_deniers =
								proposal_deniers.checked_add(1).ok_or(Error::<T>::OverflowError)?;
							ProposalDeniers::<T>::insert(proposal_id.clone(), updated_proposal_deniers.clone());
						}
					}

					ProposalSimpleVotes::<T>::insert(proposal_id.clone(), (yes, no));
				}

				// Campaign Token Weighted Proposal
				// total token balance yes vs no
				// TODO: ratio definable, now > 50% majority wins
				// ProposalType:: => {
				// },

				// Membership Voting
				// simply one token one vote yes / no,
				// TODO: ratio definable, now simple majority wins
				ProposalType::Member => {
					// approve
					// deny
					// kick
					// ban
				}
				// default
				_ => {}
			}

			VotedBefore::<T>::insert((&sender, proposal_id.clone()), true);
			ProposalsByVoterCount::<T>::mutate(&sender, |v| *v += 1);
			ProposalVotesByVoters::<T>::mutate(&proposal_id, |votings| votings.push((sender.clone(), vote.clone())));
			ProposalsByVoter::<T>::mutate(&sender, |votings| votings.push((proposal_id.clone(), vote)));

			let mut voters = ProposalVoters::<T>::get(&proposal_id);
			match voters.binary_search(&sender) {
				Ok(_) => {} // should never happen
				Err(index) => {
					voters.insert(index, sender.clone());
					ProposalVoters::<T>::insert(&proposal_id, voters);
				}
			}
			Ok(())
		}

		fn get_and_increment_nonce() -> u128 {
			let nonce = Nonce::<T>::get();
			Nonce::<T>::put(nonce.wrapping_add(1));
			nonce
		}
	}
}
