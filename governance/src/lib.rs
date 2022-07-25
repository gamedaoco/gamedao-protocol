//      _______  ________  ________  ________   ______   _______   _______
//    ╱╱       ╲╱        ╲╱        ╲╱        ╲_╱      ╲╲╱       ╲╲╱       ╲╲
//   ╱╱      __╱         ╱         ╱         ╱        ╱╱        ╱╱        ╱╱
//  ╱       ╱ ╱         ╱         ╱        _╱         ╱         ╱         ╱
//  ╲________╱╲___╱____╱╲__╱__╱__╱╲________╱╲________╱╲___╱____╱╲________╱
//
// This file is part of GameDAO Protocol.
// Copyright (C) 2018-2022 GameDAO AG.
// SPDX-License-Identifier: Apache-2.0

//! Governance
//! GameDAOs module providing simple interfaces to vote on governance proposals

#![cfg_attr(not(feature = "std"), no_std)]
#![allow(deprecated)] // TODO: clean transactional
pub mod types;
// pub mod migration;

// #[cfg(test)]
// pub mod mock;
// #[cfg(test)]
// mod tests;
// #[cfg(feature = "runtime-benchmarks")]
// mod benchmarking;
// pub mod weights;

use frame_support::{
	traits::StorageVersion,
	dispatch::DispatchResult,
	weights::Weight,
	transactional
};
use frame_system::{ensure_signed};
use orml_traits::{MultiCurrency, MultiReservableCurrency};
use sp_runtime::{traits::{AtLeast32BitUnsigned, CheckedAdd, CheckedSub, Zero, Hash}, Permill};

use gamedao_traits::{ControlTrait, ControlBenchmarkingTrait, FlowTrait, FlowBenchmarkingTrait};

use types::{
	ProposalIndex, ProposalType, ProposalState, SlashingRule,
	Majority, Unit, Scale, VotingPower, BlockType
};

pub use pallet::*;
use frame_system::WeightInfo;
// pub use weights::WeightInfo;

use frame_support::{traits::{BalanceStatus}, BoundedVec};
type Proposal<T> = types::Proposal<
	<T as frame_system::Config>::Hash, <T as frame_system::Config>::BlockNumber, 
	<T as frame_system::Config>::AccountId, <T as pallet::Config>::Balance, 
	<T as pallet::Config>::CurrencyId, BoundedVec<u8, <T as pallet::Config>::StringLimit>
>;

type Voting<T> = types::Voting<
	<T as frame_system::Config>::AccountId, <T as pallet::Config>::Balance,
	<T as pallet::Config>::MaxVotesPerProposal
>;


#[frame_support::pallet]
pub mod pallet {
	use super::*;
	use core::convert::TryInto;
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
			+ CheckedAdd
			+ CheckedSub
			+ Copy
			+ Zero
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

		/// Multi-currency support for asset management.
		type Currency: MultiCurrency<Self::AccountId, CurrencyId = Self::CurrencyId, Balance = Self::Balance>
			+ MultiReservableCurrency<Self::AccountId>;

		/// Control pallet's public interface.
		type Control: ControlTrait<Self::AccountId, Self::Hash>
			+ ControlBenchmarkingTrait<Self::AccountId, Self::Hash>;

		/// Flow pallet's public interface.
		type Flow: FlowTrait<Self::AccountId, Self::Balance, Self::Hash>
			+ FlowBenchmarkingTrait<Self::AccountId, Self::BlockNumber, Self::Hash>;

		/// Weight information for extrinsics in this module.
		type WeightInfo: WeightInfo;
		
		/// The CurrencyId which is used as a payment token.
		#[pallet::constant]
		type PaymentTokenId: Get<Self::CurrencyId>;

		/// The CurrencyId which is used as a protokol token.
		#[pallet::constant]
		type ProtocolTokenId: Get<Self::CurrencyId>;

		/// Min deposit for Proposal creation
		#[pallet::constant]
		type MinProposalDeposit: Get<Self::Balance>;

		/// Default time limit for a proposal in blocks..
		#[pallet::constant]
		type ProposalTimeLimit: Get<Self::BlockNumber>;

		/// The GameDAO Treasury AccountId.
		#[pallet::constant]
		type GameDAOTreasury: Get<Self::AccountId>;

		/// Max number of votes per proposal
		#[pallet::constant]
		type MaxVotesPerProposal: Get<u32>;

		/// The max number of proposals per one block.
		#[pallet::constant]
		type MaxProposalsPerBlock: Get<u32>;

		/// The maximum length of a string, stored on chain.
		#[pallet::constant]
		type StringLimit: Get<u32>;

		/// Majority of rejection >= {this value} * eligible voters --> slash deposit (default: 2/3).
		#[pallet::constant]
		type SlashingMajority: Get<Permill>;

		/// This part of slashing goes to GameDAO treasury (default: 1/4).
		#[pallet::constant]
		type GameDAOGetsFromSlashing: Get<Permill>;

	}

	/// Proposal by its hash (id).
	///
	/// Proposals: map Hash => Proposal
	#[pallet::storage]
	pub(super) type ProposalOf<T: Config> = 
		StorageMap<_, Blake2_128Concat, T::Hash,
		Proposal<T>, OptionQuery>;

	/// Proposal's state: Init | Active | Accepted | Rejected | Expired | Aborted | Finalized.
	///
	/// ProposalStates: map Hash => ProposalState
	#[pallet::storage]
	pub(super) type ProposalStates<T: Config> = 
		StorageMap<_, Blake2_128Concat, T::Hash, ProposalState, ValueQuery, GetDefault>;

	/// Proposals ending in a block.
	///
	/// ProposalsByBlock: map BlockNumber => BoundedVec<Hash, MaxProposalsPerBlock>
	#[pallet::storage]
	pub(super) type ProposalsByBlock<T: Config> =
		StorageDoubleMap<_, Blake2_128Concat, BlockType, Blake2_128Concat, T::BlockNumber, BoundedVec<T::Hash, T::MaxProposalsPerBlock>, ValueQuery>;
	
	#[pallet::storage]
	pub type ProposalCount<T: Config> = StorageValue<_, ProposalIndex, ValueQuery>;

	#[pallet::storage]
	pub type ProposalVoting<T: Config> = StorageMap<_, Identity, T::Hash, Voting<T>, OptionQuery>;

	/// The amount of currency that a project has used.
	///
	/// CampaignBalanceUsed: map Hash => Balance
	#[pallet::storage]
	pub(super) type CampaignBalanceUsed<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, T::Balance, ValueQuery>;


	#[pallet::event]
	#[pallet::generate_deposit(pub(super) fn deposit_event)]
	pub enum Event<T: Config> {
		/// Proposal was successfully created (ex. Withdrawal proposal).
		ProposalCreated {
			account: T::AccountId,
			proposal_id: T::Hash,
			org_id: T::Hash,
			campaign_id: Option<T::Hash>,
			amount: Option<T::Balance>,
			start: T::BlockNumber,
			expiry: T::BlockNumber,
		},
		/// A motion (given hash) has been voted on by given account, leaving
		/// a tally (yes votes and no votes given respectively as `MemberCount`).
		Voted {
			account: T::AccountId,
			proposal_id: T::Hash,
			voted: bool,
			yes: VotingPower,
			no: VotingPower,
			vote_power: VotingPower
		},
		/// Proposal was approved after the voting.
		ProposalApproved {
			proposal_id: T::Hash,
		},
		/// Proposal was rejected after the voting.
		ProposalRejected {
			proposal_id: T::Hash,
		},
		/// Proposal was expired, not finalized before expiry block number.
		ProposalExpired {
			proposal_id: T::Hash,
		},
	}

	#[pallet::error]
	pub enum Error<T> {
		AuthorizationError,
		BalanceInsufficient,
		CampaignFailed,
		DepositInsufficient,
		DuplicateVote,
		OrgInactive,
		OutOfBounds,
		ParameterError,
		ProposalExists,
		ProposalNotActive,
		ProposalUnknown,
		TooManyProposals,
		VoteLimitReached,
	}

	#[pallet::call]
	impl<T: Config> Pallet<T> {

		#[pallet::weight(10_000_000)]
		#[transactional]
		pub fn proposal(
			origin: OriginFor<T>,
			proposal_type: ProposalType,
			org_id: T::Hash,
			title: BoundedVec<u8, T::StringLimit>,
			cid: BoundedVec<u8, T::StringLimit>,
			deposit: T::Balance,
			expiry: T::BlockNumber,
			majority: Majority,
			// Optional params:
			start: Option<T::BlockNumber>,
			quorum: Option<Permill>,
			// Optional proposal specific params:
			campaign_id: Option<T::Hash>,
			amount: Option<T::Balance>,
			beneficiary: Option<T::AccountId>,
			currency: Option<T::CurrencyId>,
		) -> DispatchResult {
			let proposer = ensure_signed(origin)?;
			ensure!(T::Control::is_org_active(&org_id), Error::<T>::OrgInactive);
			ensure!(T::Control::is_org_member_active(&org_id, &proposer), Error::<T>::AuthorizationError);
			ensure!(deposit >= T::MinProposalDeposit::get(), Error::<T>::DepositInsufficient);

			// "start" validation:
			let mut starts;
			let current_block = <frame_system::Pallet<T>>::block_number();
			match start {
				Some(start) => {
					ensure!(start >= current_block, Error::<T>::OutOfBounds);
					if start > current_block {
						let prop_start = ProposalsByBlock::<T>::get(BlockType::Start, start);
						ensure!((prop_start.len() as u32) < T::MaxProposalsPerBlock::get(),
							Error::<T>::TooManyProposals);
					};
					starts = start;
				}
				None => {
					starts = current_block;
				}
			}
			// "expiry" validation
			ensure!(expiry > current_block, Error::<T>::OutOfBounds);
			ensure!(expiry <= current_block + T::ProposalTimeLimit::get(), Error::<T>::OutOfBounds);
			let prop_exp = ProposalsByBlock::<T>::get(BlockType::Expiry, starts);
			ensure!((prop_exp.len() as u32) < T::MaxProposalsPerBlock::get(), Error::<T>::TooManyProposals);

			// Proposal specific validation:
			match proposal_type {
				ProposalType::Withdrawal | ProposalType::Spending => {
					if proposal_type == ProposalType::Spending && beneficiary.is_none() {
						return Err(Error::<T>::ParameterError)?;
					}
					if currency.is_none() {
						return Err(Error::<T>::ParameterError)?;
					}
					let bond = amount.ok_or(Error::<T>::ParameterError)?;
					let c_id = campaign_id.ok_or(Error::<T>::ParameterError)?;

					let campaign_owner = T::Flow::campaign_owner(&c_id).ok_or(Error::<T>::AuthorizationError)?;
					ensure!(proposer == campaign_owner, Error::<T>::AuthorizationError);
					ensure!(T::Flow::is_campaign_succeeded(&c_id), Error::<T>::CampaignFailed);
					
					let used_balance = CampaignBalanceUsed::<T>::get(&c_id);
					let total_balance = T::Flow::campaign_balance(&c_id);
					let remaining_balance = total_balance
						.checked_sub(&used_balance)
						.ok_or(Error::<T>::BalanceInsufficient)?;
					ensure!(remaining_balance >= bond, Error::<T>::BalanceInsufficient);
				},
				_ => {}
			}

			let index = ProposalCount::<T>::get();
			let proposal = types::Proposal {
				index: index.clone(), title, cid, org_id, campaign_id, amount, deposit, currency,
				beneficiary, proposal_type, start: starts, expiry, owner: proposer.clone(),
				slashing_rule: SlashingRule::Automated
			};
			let proposal_hash = T::Hashing::hash_of(&proposal);
			ensure!(!ProposalOf::<T>::contains_key(&proposal_hash), Error::<T>::ProposalExists);

			Self::create_proposal(&proposal_hash, proposal);
			Self::create_voting(&proposal_hash, &index, &org_id, quorum, majority);

			Self::deposit_event(Event::<T>::ProposalCreated {
				proposal_id: proposal_hash,
				account: proposer,
				org_id,
				campaign_id,
				amount,
				start: starts,
				expiry,
			});

			Ok(())
		}

		#[pallet::weight(10_000_000)]
		#[transactional]
		pub fn vote(
			origin: OriginFor<T>,
			proposal_id: T::Hash,
			approve: bool,
			deposit: Option<T::Balance>,
		) -> DispatchResult {
			let who = ensure_signed(origin)?;
			let voting = ProposalVoting::<T>::get(&proposal_id).ok_or(Error::<T>::ProposalUnknown)?;

			// Ensure the Proposal is Active
			ensure!(
				ProposalStates::<T>::get(&proposal_id) == ProposalState::Active,
				Error::<T>::ProposalNotActive
			);

			Self::do_vote(who, voting, proposal_id, approve, deposit)?;

			Ok(())
		}
	}

	#[pallet::hooks]
	impl<T: Config> Hooks<BlockNumberFor<T>> for Pallet<T> {

		fn on_runtime_upgrade() -> frame_support::weights::Weight {
			// migration::migrate::<T>()
			1 as frame_support::weights::Weight
		}

		fn on_initialize(block_number: T::BlockNumber) -> Weight {
			// TODO ASAP: Activate proposal
			1 as frame_support::weights::Weight
		}

		fn on_finalize(block_number: T::BlockNumber) {
			for proposal_id in &ProposalsByBlock::<T>::get(BlockType::Expiry, &block_number) {
				// Skip already finalized proposals (absolute majority case)
				let mut proposal_state = ProposalStates::<T>::get(&proposal_id);
				if proposal_state != ProposalState::Active {
					continue;
				};
				let maybe_voting = ProposalVoting::<T>::get(&proposal_id);
				if maybe_voting.is_none() {
					continue;	// should never happen
				}
				let voting = maybe_voting.unwrap();

				// Get the final state based on Voting participation, quorum, majority
				proposal_state = Self::get_final_proposal_state(&voting);
				
				Self::finalize_proposal(&proposal_id, &proposal_state, &voting);
			}
		}
	}

	impl<T: Config> Pallet<T> {

		pub fn get_voting_power(voting: &Voting<T>, _deposit: &Option<T::Balance>) -> VotingPower {
			let mut power: VotingPower = 1;
			match voting.unit {
				Unit::Person => {
					match voting.scale {
						Scale::Linear => { 
							power = 1;
						}
						Scale::Quadratic => { 
							// In case of vote delegation Quadratic scale also possible?
						}
					}
				}
				Unit::Token => {
					match voting.scale {
						Scale::Linear => { 
							// TODO: Token weighted voting
							// power = balance.into();
						}
						Scale::Quadratic => { 
							// TODO: Quadratic voting
							// use sp_runtime::traits::IntegerSquareRoot
							// power = balance.integer_sqrt()
						}
					}
				}
			}
			power
		}

		pub fn process_voting_deposits(
			who: &T::AccountId,
			old_deposit: &Option<T::Balance>,
			deposit: &Option<T::Balance>
		) {
			if let Some(amount) = old_deposit {
				let _ = T::Currency::unreserve(T::ProtocolTokenId::get(), &who, *amount);
			}
			if let Some(amount) = deposit {
				let _ = T::Currency::reserve(T::ProtocolTokenId::get(), &who, *amount);
			}
		}

		pub fn try_finalize_proposal(voting: &Voting<T>) -> Option<ProposalState> {
			match voting.majority {
				Majority::Absolute => {
					let majority_quorum = Permill::from_rational(1u32, 2u32);
					if voting.yes >= majority_quorum.mul_floor(voting.eligible) {
						return Some(ProposalState::Accepted);
					}
				}
				_ => {
					// TODO: Collect other cases when voting could be finalized earlier
				}
			}
			return None;
		}

		pub fn do_vote(
			who: T::AccountId,
			mut voting: Voting<T>,
			proposal_id: T::Hash,
			approve: bool,
			deposit: Option<T::Balance>,
		) -> Result<(), DispatchError> {
			let position_yes = voting.ayes.iter().position(|a| a.0 == who);
			let position_no = voting.nays.iter().position(|a| a.0 == who);
			let power = Self::get_voting_power(&voting, &deposit);
			let mut old_deposit: Option<T::Balance> = None;

			if approve {
				if let Some(pos) = position_no {
					old_deposit = voting.nays[pos].2;
					voting.nays.swap_remove(pos);
				}
				if position_yes.is_none() {
					voting.ayes.try_push((who.clone(), power.clone(), deposit.clone())).map_err(|_| Error::<T>::VoteLimitReached)?;
				} else {
					return Err(Error::<T>::DuplicateVote.into())
				}
			} else {
				if let Some(pos) = position_yes {
					old_deposit = voting.nays[pos].2;
					voting.ayes.swap_remove(pos);
				}
				if position_no.is_none() {
					voting.nays.try_push((who.clone(), power.clone(), deposit.clone())).map_err(|_| Error::<T>::VoteLimitReached)?;
				} else {
					return Err(Error::<T>::DuplicateVote.into())
				}
			}

			voting.yes = voting.ayes.iter().map(|a| a.1).sum();
			voting.no = voting.nays.iter().map(|a| a.1).sum();
			voting.participating = voting.yes + voting.no;

			Self::process_voting_deposits(&who, &old_deposit, &deposit);

			Self::deposit_event(Event::Voted {
				account: who,
				proposal_id,
				voted: approve,
				vote_power: power,
				yes: voting.yes,
				no: voting.no,
			});

			ProposalVoting::<T>::insert(&proposal_id, &voting);

			// For Absolute majority if more then 50% of members vote for one option, the proposal period ends earlier.
			if let Some(final_proposal_state) = Self::try_finalize_proposal(&voting) {
				Self::finalize_proposal(&proposal_id, &final_proposal_state, &voting);
			}

			Ok(())
		}

		fn create_proposal(
			proposal_id: &T::Hash,
			proposal: Proposal<T>
		) -> Result<(), DispatchError> {
			if proposal.start > <frame_system::Pallet<T>>::block_number() {
				ProposalsByBlock::<T>::try_mutate(
					BlockType::Start, proposal.start, |proposals| -> Result<(), DispatchError> {
						proposals.try_push(proposal_id.clone()).map_err(|_| Error::<T>::TooManyProposals)?;
						Ok(())
					}
				)?;
			} else {
				ProposalStates::<T>::insert(proposal_id, ProposalState::Active);
			}
			ProposalsByBlock::<T>::try_mutate(
				BlockType::Expiry, proposal.expiry, |proposals| -> Result<(), DispatchError> {
					proposals.try_push(proposal_id.clone()).map_err(|_| Error::<T>::TooManyProposals)?;
					Ok(())
				}
			)?;
			ProposalOf::<T>::insert(proposal_id, proposal);
			ProposalCount::<T>::mutate(|i| *i += 1);

			Ok(())
		}

		fn create_voting(
			proposal_id: &T::Hash,
			index: &ProposalIndex,
			org_id: &T::Hash,
			quorum: Option<Permill>,
			majority: Majority,
		) {
			let unit = Unit::Person;
			let scale = Scale::Linear;
			let mut eligible: VotingPower = 0;
			match unit {
				Unit::Person => {
					eligible = T::Control::org_member_count(&org_id).into();
				},
				Unit::Token => {
					match scale {
						Scale::Linear => {
							// TODO: eligible = Σ (member tokens)
						}
						Scale::Quadratic => {
							// TODO: eligible = Σ (√member tokens) - if it make sense (investigation needed)
						}
					}
				},
			}
			let voting = types::Voting {
				index: *index, unit, majority, scale, quorum,
				eligible, participating: 0, yes: 0, no: 0,
				ayes: BoundedVec::truncate_from(vec![]),
				nays: BoundedVec::truncate_from(vec![]),
			};
			ProposalVoting::<T>::insert(proposal_id, voting);
		}

		fn get_final_proposal_state(voting: &Voting<T>) -> ProposalState {
			// Check if anyone participated
			if voting.participating == 0 as VotingPower {
				return ProposalState::Expired;
			}
			// Apply quorum
			if let Some(quorum) = voting.quorum {
				if voting.participating < quorum.mul_floor(voting.eligible) {
					return ProposalState::Rejected;
				}
			}
			// Apply majority
			match voting.majority {
				// TODO: For yes/no voting Relative and Simple majorities are the same
				// Simple majority should be implemented for multiple options voting
				Majority::Relative | Majority::Simple => {
					if voting.yes > voting.no {
						return ProposalState::Accepted;
					} else {
						return ProposalState::Rejected;
					}
				}
				Majority::Absolute => {
					let majority_quorum = Permill::from_rational(1u32, 2u32);
					if voting.yes >= majority_quorum.mul_floor(voting.eligible) {
						return ProposalState::Accepted;
					} else {
						return ProposalState::Rejected;
					}
				}
			}
		}

		fn apply_proposal_actions(proposal: &Proposal<T>) -> Option<ProposalState> {
			match proposal.proposal_type {
				ProposalType::Withdrawal => {
					let currency_id = proposal.currency.unwrap();
					let org_trsry = T::Control::org_treasury_account(&proposal.org_id).unwrap();
					let amount = proposal.amount.unwrap();
					T::Currency::unreserve(currency_id, &org_trsry, amount);
					return ProposalState::Finalized;
				}
				ProposalType::Spending => {
					let currency_id = proposal.currency.unwrap();
					let org_trsry = T::Control::org_treasury_account(&proposal.org_id).unwrap();
					let amount = proposal.amount.unwrap();
					let beneficiary = proposal.beneficiary.as_ref().unwrap();

					// This could fail if not enough balance
					let res = T::Currency::transfer(currency_id, &org_trsry, &beneficiary, amount);
				}
				_ => { return None }
			}

		}

		fn process_proposal_deposit(proposal: &Proposal<T>, voting: &Voting<T>, proposal_state: &ProposalState) {
			let currency = T::ProtocolTokenId::get();
			match proposal_state {
				ProposalState::Accepted | ProposalState::Expired => {
					T::Currency::unreserve(currency, &proposal.owner, proposal.deposit);
				}
				ProposalState::Rejected => {
					match proposal.slashing_rule {
						SlashingRule::Automated => {
							T::Currency::unreserve(currency, &proposal.owner, proposal.deposit);
							let slashing_majority = T::SlashingMajority::get().mul_floor(voting.eligible);
							// majority of rejection >= 2/3 of eligible voters --> slash deposit
							if voting.no >= slashing_majority {
								let gamedao_share = T::GameDAOGetsFromSlashing::get().mul_floor(proposal.deposit);
								let org_share = proposal.deposit - gamedao_share;
								let gamedo_trsry = T::GameDAOTreasury::get();
								let org_trsry = T::Control::org_treasury_account(&proposal.org_id).unwrap();
								
								let res = T::Currency::transfer(currency, &proposal.owner, &gamedo_trsry, gamedao_share);
								debug_assert!(res.is_ok());
								let res = T::Currency::transfer(currency, &proposal.owner, &org_trsry, org_share);
								debug_assert!(res.is_ok());
							}
						}
						SlashingRule::Tribunal => {
							// TODO: rejection criteria met --> create slashing vote
						}
					}
				}
				_ => {}
			}

		}

		fn finalize_proposal(proposal_id: &T::Hash, proposal_state: &ProposalState, voting: &Voting<T>) {
			let maybe_proposal = ProposalOf::<T>::get(&proposal_id);
			let proposal = maybe_proposal.unwrap();  // should not fail
			
			// Refund or slash proposal's deposit based on proposal state and majority of rejection
			Self::process_proposal_deposit(&proposal, &voting, &proposal_state);

			ProposalStates::<T>::insert(proposal_id, proposal_state);

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

			// Apply actions based on the final state and proposal type
			match Self::apply_proposal_actions(&proposal) 
			// TODO: !!!!
			{
				ProposalState::Finalized => {
					Self::deposit_event(Event::<T>::ProposalApproved {
						proposal_id: proposal_id.clone(),
					});
				}
			}
		}
	}
}
