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
//! SIGNAL is GameDAOs governance module providing simple interfaces to create proposals and vote on them

#![cfg_attr(not(feature = "std"), no_std)]
#![allow(deprecated)] // TODO: clean transactional
pub mod types;

#[cfg(test)]
pub mod mock;
#[cfg(test)]
mod tests;
#[cfg(feature = "runtime-benchmarks")]
mod benchmarking;
pub mod weights;

use frame_support::{
	BoundedVec,
	traits::BalanceStatus,
	dispatch::DispatchResult,
	weights::Weight,
	log,
	transactional
};
use frame_system::ensure_signed;
use orml_traits::{MultiCurrency, MultiReservableCurrency};
use sp_runtime::{
	traits::{AtLeast32BitUnsigned, CheckedAdd, CheckedSub, Zero, Hash, SaturatedConversion, IntegerSquareRoot},
	Permill
};
use sp_std::vec;

#[cfg(feature = "runtime-benchmarks")]
use gamedao_traits::{ControlBenchmarkingTrait, FlowBenchmarkingTrait};
use gamedao_traits::{ControlTrait, FlowTrait};

use types::{
	ProposalIndex, ProposalType, ProposalState, SlashingRule,
	Majority, Unit, Scale, VotingPower, BlockType
};

pub use pallet::*;
pub use weights::WeightInfo;

type Proposal<T> = types::Proposal<
	<T as frame_system::Config>::Hash, <T as frame_system::Config>::BlockNumber,
	<T as frame_system::Config>::AccountId, <T as pallet::Config>::Balance,
	<T as pallet::Config>::CurrencyId, BoundedVec<u8, <T as pallet::Config>::StringLimit>
>;

type Voting<T> = types::Voting<
	<T as frame_system::Config>::AccountId, <T as pallet::Config>::Balance,
	<T as pallet::Config>::MaxMembers
>;

#[frame_support::pallet]
pub mod pallet {
	use super::*;
	use core::convert::TryInto;
	use frame_support::pallet_prelude::*;
	use frame_system::pallet_prelude::*;

	#[pallet::pallet]
	pub struct Pallet<T>(_);

	#[pallet::config]
	pub trait Config: frame_system::Config {
		type RuntimeEvent: From<Event<Self>>
			+ IsType<<Self as frame_system::Config>::RuntimeEvent>
			+ Into<<Self as frame_system::Config>::RuntimeEvent>;

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
		type Control: ControlTrait<Self::AccountId, Self::Hash>;

		/// Flow pallet's public interface.
		type Flow: FlowTrait<Self::AccountId, Self::Balance, Self::Hash>;

		#[cfg(feature = "runtime-benchmarks")]
		type ControlBenchmarkHelper: ControlBenchmarkingTrait<Self::AccountId, Self::Hash>;

		#[cfg(feature = "runtime-benchmarks")]
		type FlowBenchmarkHelper: FlowBenchmarkingTrait<Self::AccountId, Self::BlockNumber, Self::Hash>;

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

		/// Default time limit for a proposal in blocks.
		#[pallet::constant]
		type ProposalDurationLimits: Get<(Self::BlockNumber, Self::BlockNumber)>;

		/// The GameDAO Treasury AccountId.
		#[pallet::constant]
		type GameDAOTreasury: Get<Self::AccountId>;

		/// Max number of members per organization
		#[pallet::constant]
		type MaxMembers: Get<u32>;

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

	/// Proposal's state: Created | Activated | Accepted | Rejected | Expired | Aborted | Finalized
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
		Voted {
			account: T::AccountId,
			proposal_id: T::Hash,
			voted: bool,
			yes: VotingPower,
			no: VotingPower,
			vote_power: VotingPower
		},
		Created {
			account: T::AccountId,
			proposal_id: T::Hash,
			org_id: T::Hash,
			campaign_id: Option<T::Hash>,
			amount: Option<T::Balance>,
			start: T::BlockNumber,
			expiry: T::BlockNumber,
		},
		Activated { proposal_id: T::Hash },
		Accepted { proposal_id: T::Hash },
		Rejected { proposal_id: T::Hash },
		Expired { proposal_id: T::Hash },
		Aborted { proposal_id: T::Hash },
		Finalized { proposal_id: T::Hash }
	}

	#[pallet::error]
	pub enum Error<T> {
		AuthorizationError,
		BalanceLow,
		CampaignUnsucceeded,
		DepositInsufficient,
		DuplicateVote,
		MissingParameter,
		OrgInactive,
		OutOfBounds,
		ProposalExists,
		ProposalInvalid,
		ProposalNotActive,
		ProposalUnknown,
		TooManyProposals,
		TreasuryBalanceLow,
		TreasuryUnknown,
		VoteLimitReached,
		VotingInvalid,
		WrongParameter,
	}

	#[pallet::call]
	impl<T: Config> Pallet<T> {

		#[pallet::weight(T::WeightInfo::proposal())]
		#[transactional]
		pub fn proposal(
			origin: OriginFor<T>,
			proposal_type: ProposalType,
			org_id: T::Hash,
			title: BoundedVec<u8, T::StringLimit>,
			cid: BoundedVec<u8, T::StringLimit>,
			expiry: T::BlockNumber,
			majority: Majority,
			unit: Unit,
			scale: Scale,
			// Optional params:
			start: Option<T::BlockNumber>,
			quorum: Option<Permill>,
			deposit: Option<T::Balance>,
			// Optional proposal specific params:
			campaign_id: Option<T::Hash>,
			amount: Option<T::Balance>,
			beneficiary: Option<T::AccountId>,
			currency_id: Option<T::CurrencyId>,
		) -> DispatchResult {
			let proposer = ensure_signed(origin)?;
			// Org/member validation:
			ensure!(T::Control::is_org_active(&org_id), Error::<T>::OrgInactive);
			// This also !implicitly! checks if not a member -> returns default Incative
			ensure!(T::Control::is_org_member_active(&org_id, &proposer), Error::<T>::AuthorizationError);
			// Proposal start/expiry validation:
			let current_block = <frame_system::Pallet<T>>::block_number();
			let starts = start.unwrap_or(current_block);
			ensure!(starts >= current_block, Error::<T>::OutOfBounds);
			ensure!(expiry > current_block, Error::<T>::OutOfBounds);
			let (min_duration, max_duration) = T::ProposalDurationLimits::get();
			ensure!(expiry <= starts + max_duration, Error::<T>::OutOfBounds);
			ensure!(expiry >= starts + min_duration, Error::<T>::OutOfBounds);
			// Deposit validation:
			let mut proposal_deposit: T::Balance = T::MinProposalDeposit::get();
			if let Some(deposit) = deposit {
				proposal_deposit = deposit;
				ensure!(proposal_deposit >= T::MinProposalDeposit::get(), Error::<T>::DepositInsufficient);
			}
			// Check if all parameters are combinable:
			match unit {
				Unit::Account => {
					// Unit::Account doesn't work with quadratic scale
					ensure!(scale != Scale::Quadratic, Error::<T>::WrongParameter);
				}
				Unit::Token => {
					// Since it's not possible to calculate eligible voting power,
					// 	Absolute majority and quorum doesn't work for Unit::Token
					ensure!(majority != Majority::Absolute, Error::<T>::WrongParameter);
					ensure!(quorum.is_none(), Error::<T>::WrongParameter);
				}
			}
			// Proposal type specific validation:
			match proposal_type {
				ProposalType::Withdrawal => {
					if currency_id.is_none() {
						return Err(Error::<T>::MissingParameter)?;
					}
					let bond = amount.ok_or(Error::<T>::MissingParameter)?;
					let c_id = campaign_id.ok_or(Error::<T>::MissingParameter)?;

					let campaign_owner = T::Flow::campaign_owner(&c_id).ok_or(Error::<T>::AuthorizationError)?;
					ensure!(proposer == campaign_owner, Error::<T>::AuthorizationError);
					ensure!(T::Flow::is_campaign_succeeded(&c_id), Error::<T>::CampaignUnsucceeded);

					let used_balance = CampaignBalanceUsed::<T>::get(&c_id);
					let total_balance = T::Flow::campaign_balance(&c_id);
					let remaining_balance = total_balance
						.checked_sub(&used_balance)
						.ok_or(Error::<T>::BalanceLow)?;
					ensure!(remaining_balance >= bond, Error::<T>::BalanceLow);
				}
				ProposalType::Spending => {
					if currency_id.is_none() || amount.is_none() || beneficiary.is_none() {
						return Err(Error::<T>::MissingParameter)?;
					}
				}
				_ => {}
			}

			// Create Proposal
			let index = ProposalCount::<T>::get();
			let proposal = types::Proposal {
				index: index.clone(), title, cid, org_id, campaign_id, amount, deposit: proposal_deposit,
				currency_id, beneficiary, proposal_type: proposal_type.clone(), start: starts, expiry,
				owner: proposer.clone(), slashing_rule: SlashingRule::Automated
			};
			let proposal_hash = T::Hashing::hash_of(&proposal);
			ensure!(!ProposalOf::<T>::contains_key(&proposal_hash), Error::<T>::ProposalExists);

			Self::create_proposal(&proposal_hash, proposal)?;
			Self::create_voting(&proposal_hash, &proposal_type, &index, &org_id, &campaign_id, quorum, majority, unit, scale);

			Self::deposit_event(Event::<T>::Created {
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

		#[pallet::weight(T::WeightInfo::vote(T::MaxMembers::get()))]
		pub fn vote(
			origin: OriginFor<T>,
			proposal_id: T::Hash,
			approve: bool,
			deposit: Option<T::Balance>,
		) -> DispatchResultWithPostInfo {
			let who = ensure_signed(origin)?;
			let voting = ProposalVoting::<T>::get(&proposal_id).ok_or(Error::<T>::ProposalUnknown)?;

			// Deposit is required for token weighted voting only
			if voting.unit == Unit::Token && deposit.is_none() {
				return Err(Error::<T>::MissingParameter)?;
			} else if voting.unit == Unit::Account && deposit.is_some() {
				return Err(Error::<T>::WrongParameter)?;
			}

			let proposal = ProposalOf::<T>::get(&proposal_id).ok_or(Error::<T>::ProposalUnknown)?;
			match proposal.proposal_type {
				ProposalType::General | ProposalType::Spending => {
					ensure!(
						// This also !implicitly! checks if not a member -> returns default Incative
						T::Control::is_org_member_active(&proposal.org_id, &who),
						Error::<T>::AuthorizationError
					);
				},
				ProposalType::Withdrawal => {
					ensure!(proposal.campaign_id.is_some(), Error::<T>::ProposalInvalid);
					ensure!(
						T::Flow::is_campaign_contributor(&proposal.campaign_id.unwrap(), &who),
						Error::<T>::AuthorizationError
					);
				},
			}

			// Ensure the Proposal is Active
			ensure!(
				ProposalStates::<T>::get(&proposal_id) == ProposalState::Active,
				Error::<T>::ProposalNotActive
			);

			let participating = Self::do_vote(who, voting, proposal_id, approve, deposit)?;
			Ok(Some(T::WeightInfo::vote(participating)).into())
		}
	}

	#[pallet::hooks]
	impl<T: Config> Hooks<BlockNumberFor<T>> for Pallet<T> {


		fn on_initialize(block_number: T::BlockNumber) -> Weight {
			let proposals = ProposalsByBlock::<T>::get(BlockType::Start, &block_number);
			for proposal_id in &proposals {
				let proposal_state = ProposalStates::<T>::get(&proposal_id);
				if proposal_state != ProposalState::Created {
					continue; // Just a safety check, never should happen
				};
				ProposalStates::<T>::insert(proposal_id, ProposalState::Active);
				Self::deposit_event(Event::<T>::Activated { proposal_id: *proposal_id });
			}

			T::WeightInfo::on_initialize(proposals.len().saturated_into())
		}

		fn on_finalize(block_number: T::BlockNumber) {
			for proposal_id in &ProposalsByBlock::<T>::get(BlockType::Expiry, &block_number) {
				// Skip already finalized proposals (ex. if absolute majority was achieved)
				let mut proposal_state = ProposalStates::<T>::get(&proposal_id);
				if proposal_state != ProposalState::Active {
					continue;
				};
				let maybe_voting = ProposalVoting::<T>::get(&proposal_id);
				let proposal_exists = ProposalOf::<T>::contains_key(&proposal_id);

				if maybe_voting.is_none() || !proposal_exists {
					log::error!(target: "runtime::gamedao_signal", "Proposal [{:?}] or voting [{:?}] is missing for proposal id: {:?}.", proposal_exists, maybe_voting.is_some(), proposal_id);
					continue;	// should never happen
				}
				let voting =  maybe_voting.unwrap();

				// Get the final state based on Voting participation, quorum, majority
				proposal_state = Self::get_final_proposal_state(&voting);

				if Self::finalize_proposal(&proposal_id, proposal_state, &voting).is_err() {
					log::error!(target: "runtime::gamedao_signal", "Failed to finalize a proposal {:?}.", proposal_id);
				};
			}
		}
	}

	impl<T: Config> Pallet<T> {

		pub fn get_voting_power(voting: &Voting<T>, deposit: &Option<T::Balance>) -> Result<VotingPower, DispatchError> {
			let mut power: VotingPower = 1;
			match voting.unit {
				Unit::Account => {
					match voting.scale {
						Scale::Linear => {
							power = 1;
						}
						Scale::Quadratic => {
							// So far not possible, maybe in case of delegation
						}
					}
				}
				Unit::Token => {
					let linear_power: VotingPower = deposit.ok_or(Error::<T>::MissingParameter)?.saturated_into();
					match voting.scale {
						Scale::Linear => {
							power = linear_power;
						}
						Scale::Quadratic => {
							power = linear_power.integer_sqrt();
						}
					}
				}
			}
			Ok(power)
		}

		pub fn process_voting_deposits(
			who: &T::AccountId,
			old_deposit: &Option<T::Balance>,
			deposit: &Option<T::Balance>
		) -> Result<(), DispatchError> {
			if old_deposit == deposit {
				return Ok(());
			};
			if let Some(amount) = old_deposit {
				let _ = T::Currency::unreserve(T::ProtocolTokenId::get(), &who, *amount);
			}
			if let Some(amount) = deposit {
				T::Currency::reserve(T::ProtocolTokenId::get(), &who, *amount).map_err(|_| Error::<T>::BalanceLow)?;
			}
			return Ok(());
		}

		pub fn try_finalize_proposal(voting: &Voting<T>) -> Option<ProposalState> {
			// Absolute majority reached
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
			// Everyone voted
			if voting.eligible == voting.participating {
				return Some(Self::get_final_proposal_state(&voting));
			}
			return None;
		}

		pub fn do_vote(
			who: T::AccountId,
			mut voting: Voting<T>,
			proposal_id: T::Hash,
			approve: bool,
			deposit: Option<T::Balance>,
		) -> Result<u32, DispatchError> {
			let position_yes = voting.ayes.iter().position(|a| a.0 == who);
			let position_no = voting.nays.iter().position(|a| a.0 == who);
			let power = Self::get_voting_power(&voting, &deposit)?;
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

			Self::process_voting_deposits(&who, &old_deposit, &deposit)?;

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
				Self::finalize_proposal(&proposal_id, final_proposal_state, &voting)?;
			}

			Ok(voting.participating as u32)
		}

		fn create_proposal(
			proposal_id: &T::Hash,
			proposal: Proposal<T>
		) -> Result<(), DispatchError> {
			let proposal_state;
			if proposal.start > <frame_system::Pallet<T>>::block_number() {
				proposal_state = ProposalState::Created;
			} else {
				proposal_state = ProposalState::Active;
			}
			T::Currency::reserve(
				T::ProtocolTokenId::get(), &proposal.owner, proposal.deposit
			).map_err(|_| Error::<T>::BalanceLow)?;

			if proposal.proposal_type == ProposalType::Spending {
				let treasury_id = T::Control::org_treasury_account(&proposal.org_id).ok_or(Error::<T>::TreasuryUnknown)?;
				T::Currency::reserve(
					proposal.currency_id.unwrap(), &treasury_id, proposal.amount.unwrap()
				).map_err(|_| Error::<T>::TreasuryBalanceLow)?;
			}

			ProposalsByBlock::<T>::try_mutate(
				BlockType::Start, proposal.start, |proposals| -> Result<(), DispatchError> {
					proposals.try_push(proposal_id.clone()).map_err(|_| Error::<T>::TooManyProposals)?;
					Ok(())
				}
			)?;
			ProposalsByBlock::<T>::try_mutate(
				BlockType::Expiry, proposal.expiry, |proposals| -> Result<(), DispatchError> {
					proposals.try_push(proposal_id.clone()).map_err(|_| Error::<T>::TooManyProposals)?;
					Ok(())
				}
			)?;
			ProposalOf::<T>::insert(proposal_id, proposal);
			ProposalStates::<T>::insert(proposal_id, proposal_state);
			ProposalCount::<T>::mutate(|i| *i += 1);

			Ok(())
		}

		fn create_voting(
			proposal_id: &T::Hash,
			proposal_type: &ProposalType,
			index: &ProposalIndex,
			org_id: &T::Hash,
			campaign_id: &Option<T::Hash>,
			quorum: Option<Permill>,
			majority: Majority,
			unit: Unit,
			scale: Scale,
		) {
			// Eligible is needed only for the Absolute majority voting type
			let mut eligible: VotingPower = 0;

			match unit {
				Unit::Account => {
					match proposal_type {
						ProposalType::Withdrawal => {
							eligible = T::Flow::campaign_contributors_count(&campaign_id.unwrap()).into();
						}
						_ => {
							eligible = T::Control::org_member_count(&org_id).into();
						}
					}
				}
				Unit::Token => {
					// Absolute majority voting can't be applied to the Token weighted voting,
					// 	since it's not possible to calculate eligible
				}
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

		fn apply_proposal_actions(proposal: &Proposal<T>, proposal_state: ProposalState) -> Result<ProposalState, DispatchError> {
			match proposal.proposal_type {
				ProposalType::Withdrawal => {
					let campaign_id = proposal.campaign_id.ok_or(Error::<T>::ProposalInvalid)?;
					let amount = proposal.amount.ok_or(Error::<T>::ProposalInvalid)?;
					let currency_id = proposal.currency_id.ok_or(Error::<T>::ProposalInvalid)?;
					let treasury = T::Control::org_treasury_account(&proposal.org_id).ok_or(Error::<T>::TreasuryUnknown)?;
					T::Currency::unreserve(currency_id, &treasury, amount);
					let used_balance = CampaignBalanceUsed::<T>::get(&campaign_id);
					CampaignBalanceUsed::<T>::insert(&campaign_id, used_balance + amount);
					return Ok(ProposalState::Finalized);
				}
				ProposalType::Spending => {
					let amount = proposal.amount.ok_or(Error::<T>::ProposalInvalid)?;
					let currency_id = proposal.currency_id.ok_or(Error::<T>::ProposalInvalid)?;
					let treasury = T::Control::org_treasury_account(&proposal.org_id).ok_or(Error::<T>::TreasuryUnknown)?;
					let beneficiary = proposal.beneficiary.as_ref().ok_or(Error::<T>::ProposalInvalid)?;
					T::Currency::repatriate_reserved(
						currency_id,
						&treasury,
						&beneficiary,
						amount,
						BalanceStatus::Free)?;
					return Ok(ProposalState::Finalized);
				}
				_ => { return Ok(proposal_state) }
			}

		}

		fn process_proposal_deposit(proposal: &Proposal<T>, voting: &Voting<T>, proposal_state: &ProposalState) -> DispatchResult {
			let currency_id = T::ProtocolTokenId::get();
			match proposal_state {
				ProposalState::Rejected => {
					match proposal.slashing_rule {
						SlashingRule::Automated => {
							T::Currency::unreserve(currency_id, &proposal.owner, proposal.deposit);
							let slashing_majority = T::SlashingMajority::get().mul_floor(voting.eligible);
							// majority of rejection >= 2/3 of eligible voters --> slash deposit
							if voting.no >= slashing_majority {
								let gamedao_share = T::GameDAOGetsFromSlashing::get().mul_floor(proposal.deposit);
								let org_share = proposal.deposit - gamedao_share;
								let gamedo_trsry = T::GameDAOTreasury::get();
								let org_trsry = T::Control::org_treasury_account(&proposal.org_id).ok_or(Error::<T>::TreasuryUnknown)?;
								T::Currency::transfer(currency_id, &proposal.owner, &gamedo_trsry, gamedao_share)?;
								T::Currency::transfer(currency_id, &proposal.owner, &org_trsry, org_share)?;
							}
						}
						SlashingRule::Tribunal => {
							// TODO: rejection criteria met --> create slashing voting
						}
					}
				}
				_ => { T::Currency::unreserve(currency_id, &proposal.owner, proposal.deposit); }
			}
			Ok(())
		}

		fn emit_event(proposal_state: &ProposalState, proposal_id: &T::Hash) {
			match proposal_state {
				ProposalState::Accepted => {
					Self::deposit_event(Event::<T>::Accepted { proposal_id: proposal_id.clone() });
				}
				ProposalState::Rejected => {
					Self::deposit_event(Event::<T>::Rejected { proposal_id: proposal_id.clone() });
				}
				ProposalState::Expired => {
					Self::deposit_event(Event::<T>::Expired { proposal_id: proposal_id.clone() });
				}
				ProposalState::Finalized => {
					Self::deposit_event(Event::<T>::Finalized { proposal_id: proposal_id.clone() });
				}
				_ => { }
			}
		}

		fn finalize_proposal(proposal_id: &T::Hash, mut proposal_state: ProposalState, voting: &Voting<T>) -> DispatchResult {
			let proposal = ProposalOf::<T>::get(&proposal_id).ok_or(Error::<T>::ProposalUnknown)?;

			match proposal_state {
				ProposalState::Accepted => {
					proposal_state = Self::apply_proposal_actions(&proposal, proposal_state)?;
				}
				_ => {
					if proposal.proposal_type == ProposalType::Spending {
						let amount = proposal.amount.ok_or(Error::<T>::ProposalInvalid)?;
						let currency_id = proposal.currency_id.ok_or(Error::<T>::ProposalInvalid)?;
						let treasury = T::Control::org_treasury_account(&proposal.org_id).ok_or(Error::<T>::TreasuryUnknown)?;
						T::Currency::unreserve(
							currency_id,
							&treasury,
							amount);
					};
				}
			}
			// Unreserve all voting deposits
			if voting.unit == Unit::Token {
				let currency_id = T::ProtocolTokenId::get();
				// TODO: chain -  &voting.ayes.iter().chain(&voting.nays.iter())
				for (who, _, deposit) in &voting.ayes {
					let _ = T::Currency::unreserve(currency_id, &who, deposit.ok_or(Error::<T>::VotingInvalid)?);
				};
				for (who, _, deposit) in &voting.nays {
					let _ = T::Currency::unreserve(currency_id, &who, deposit.ok_or(Error::<T>::VotingInvalid)?);
				};
			}
			// Refund or slash proposal's deposit based on proposal state and majority of rejection
			Self::process_proposal_deposit(&proposal, &voting, &proposal_state)?;

			Self::emit_event(&proposal_state, &proposal_id);
			ProposalStates::<T>::insert(proposal_id, proposal_state);

			Ok(())
		}
	}
}
