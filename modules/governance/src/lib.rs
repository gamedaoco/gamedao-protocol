#![cfg_attr(not(feature = "std"), no_std)]

// TODO: harden checks on completion
#![allow(dead_code)]
#![allow(unused_imports)]
#![allow(unused_variables)]

use crowdfunding;
use control;

use frame_system::{ self as system, ensure_signed };
use frame_support::{
	decl_storage, decl_module, decl_event, decl_error,
	StorageValue, StorageMap,
	dispatch::DispatchResult, ensure,
	traits::{
		Currency,
		ReservableCurrency,
		Get,
		Randomness,
	}
};
use sp_core::{ Hasher, H256 };
use sp_std::prelude::*;
use codec::{ Encode, Decode };
use sp_runtime::traits::{ Hash, Zero };

#[cfg(feature = "std")]
use serde::{ Deserialize, Serialize };

use primitives::{ Balance, BlockNumber, Index, Moment};

//
//
//

type TitleText = Vec<u8>;
type CID = Vec<u8>;
type ProposalType = u8;
type ProposalState = u8;
type VotingType = u8;

type BalanceOf<T> = <<T as Config>::Currency as Currency<<T as frame_system::Config>::AccountId>>::Balance;

#[derive(Encode, Decode, Default, Clone, PartialEq)]
pub struct Proposal<Hash, BlockNumber> {
	proposal_id: Hash,
	context_id: Hash,
	proposal_type: u8,
	voting_type: u8,
	start: BlockNumber,
	expiry: BlockNumber
}

#[derive(Encode, Decode, Default, Clone, PartialEq)]
pub struct ProposalMetadata<Balance> {
	title: Vec<u8>,
	cid: Vec<u8>,
	amount: Balance,
}

//
//
//

pub trait Config: frame_system::Config + balances::Config + timestamp::Config + crowdfunding::Config {
	type Currency: ReservableCurrency<Self::AccountId>;
	type Event: From<Event<Self>> + Into<<Self as system::Config>::Event>;
	type Nonce: Get<u64>;
	type Randomness: Randomness<Self::Hash>;
	type MaxProposalsPerBlock: Get<usize>;
	// type MaxDuration: Get<usize>;
}

// TODO: replace with config
const MAX_PROPOSALS_PER_BLOCK: usize = 3;
const MAX_PROPOSAL_DURATION: u32 = 864000; // 60 * 60 * 24 * 30 / 3

//
//
//

decl_storage! {
	trait Store for Module<T: Config> as Governance25 {

		/// Global status
		Proposals get(fn proposals): map hasher(blake2_128_concat) T::Hash => Proposal<T::Hash, T::BlockNumber>;
		Metadata get(fn metadata): map hasher(blake2_128_concat) T::Hash => ProposalMetadata<T::Balance>;
		Owners get(fn owners): map hasher(blake2_128_concat) T::Hash => Option<T::AccountId>;
		/// Get the state of a proposal
       	ProposalStates get(fn proposal_states): map hasher(blake2_128_concat) T::Hash => ProposalState;

		/// Maximum time limit for a proposal
		ProposalTimeLimit get(fn proposal_time_limit) config(): T::BlockNumber = T::BlockNumber::from(MAX_PROPOSAL_DURATION);

		/// All proposals
		ProposalsArray get(fn proposals_by_index): map hasher(blake2_128_concat) u64 => T::Hash;
		ProposalsCount get(fn proposals_count): u64;
		ProposalsIndex: map hasher(blake2_128_concat) T::Hash => u64;

		/// Proposals by campaign
		ProposalsByCampaignArray get(fn proposals_by_campaign_by_index): map hasher(blake2_128_concat)  (T::Hash, u64) => T::Hash;
		ProposalsByCampaignCount get(fn proposals_by_campaign_count): map hasher(blake2_128_concat) T::Hash => u64;
		ProposalsByCampaignIndex: map hasher(blake2_128_concat) (T::Hash, T::Hash) => u64;

		/// Proposals by owner
		ProposalsByOwnerArray get(fn proposals_by_owner): map hasher(blake2_128_concat) (T::AccountId, u64) => T::Hash;
		ProposalsByOwnerCount get(fn proposals_by_owner_count): map hasher(blake2_128_concat) T::AccountId => u64;
		ProposalsByOwnerIndex: map hasher(blake2_128_concat) (T::AccountId, T::Hash) => u64;

		/// Proposals ending in a block
		ProposalsByBlock get(fn proposals_by_block): map hasher(blake2_128_concat) T::BlockNumber => Vec<T::Hash>;

		/// The amount of currency that a project has used
		CampaignBalanceUsed get(fn used_balance): map hasher(blake2_128_concat) T::Hash => T::Balance;

		/// The number of people who approve a proposal
		ProposalApprovers get(fn proposal_approvers): map hasher(blake2_128_concat) T::Hash => u64;
		/// The number of people who deny a proposal
		ProposalDeniers get(fn proposal_deniers): map hasher(blake2_128_concat) T::Hash => u64;

		// TODO: ProposalTotalVoters
		// TODO: ProposalTotalEligibleVoters
		// TODO: ProposalApproversWeight
		// TODO: ProposalDeniersWeight
		// TODO: ProposalTotalEligibleWeight

		/// Ack vs Nack
		ProposalSimpleVotes get(fn proposal_simple_votes): map hasher(blake2_128_concat) T::Hash => (u64,u64);

		/// Judge if the user has voted the proposal
		VotedBefore get(fn has_voted_before): map hasher(blake2_128_concat) (T::AccountId, T::Hash) => bool;

		/// The total number of proposals
		Nonce: u64;
	}
}

//
//
//

decl_module! {
	pub struct Module<T: Config> for enum Call where origin: T::Origin {

		type Error = Error<T>;

		fn deposit_event() = default;

		// TODO: general proposal for a DAO
		#[weight = 10_000]
		fn general_proposal(
			origin,
			context_id: T::Hash,
			title: Vec<u8>,
			cid: Vec<u8>,
			start: T::BlockNumber,
			expiry: T::BlockNumber
		) -> DispatchResult {

			let sender = ensure_signed(origin)?;

			// active/existing dao?
			ensure!( <control::Module<T>>::body_state(&context_id) == 1, Error::<T>::DAOInactive );

			// search by body_member_state:
			let member = <control::Module<T>>::body_member_state((&context_id,&sender));
			ensure!( member == 1, Error::<T>::AuthorizationError );

			// ensure that start and expiry are in bounds
			let current_block = <system::Module<T>>::block_number();
			// ensure!(start > current_block, Error::<T>::OutOfBounds );
			ensure!(expiry > current_block, Error::<T>::OutOfBounds );
			ensure!(expiry <= current_block + Self::proposal_time_limit(), Error::<T>::OutOfBounds );

			// ensure that number of proposals
			// ending in target block
			// do not exceed the maximum
			let proposals = Self::proposals_by_block(expiry);
			ensure!(proposals.len() < MAX_PROPOSALS_PER_BLOCK, "Maximum number of proposals is reached for the target block, try another block");

			//

			let proposal_type = 0;
			let proposal_state = 1;
			let voting_type = 0;
			let nonce = Nonce::get();

			// generate unique id
			let phrase = b"just another proposal";
			let proposal_id = <T as Config>::Randomness::random(phrase);
			ensure!(!<Proposals<T>>::contains_key(&context_id), "Proposal id already exists");

			// proposal

			let new_proposal = Proposal {
				proposal_id: proposal_id.clone(),
				context_id: context_id.clone(),
				proposal_type,
				voting_type,
				start,
				expiry,
			};

			// metadata

			let metadata = ProposalMetadata {
				title: title,
				cid: cid,
				amount: T::Balance::zero()
			};

			//
			//
			//

			// check add
			let proposals_count = Self::proposals_count();
			let updated_proposals_count = proposals_count.checked_add(1).ok_or("Overflow adding a new proposal to total proposals")?;

			let proposals_by_campaign_count = Self::proposals_by_campaign_count(&context_id);
			let updated_proposals_by_campaign_count = proposals_by_campaign_count.checked_add(1).ok_or("Overflow adding a new proposal to an organisation")?;

			let proposals_by_owner_count = Self::proposals_by_owner_count(&sender);
			let updated_proposals_by_owner_count = proposals_by_owner_count.checked_add(1).ok_or("Overflow adding a new proposal to an owner")?;

			// insert proposals
			<Proposals<T>>::insert(proposal_id.clone(), new_proposal.clone());
			<Metadata<T>>::insert(proposal_id.clone(), metadata.clone());
			<Owners<T>>::insert(proposal_id.clone(), sender.clone());

			<ProposalStates<T>>::insert(proposal_id.clone(), 1);

			// update max per block
			<ProposalsByBlock<T>>::mutate(expiry, |proposals| proposals.push(proposal_id.clone()));

			// update proposal map
			<ProposalsArray<T>>::insert(&proposals_count, proposal_id.clone());
			<ProposalsCount>::put(updated_proposals_count);
			<ProposalsIndex<T>>::insert(proposal_id.clone(), proposals_count);

			// update campaign map
			<ProposalsByCampaignArray<T>>::insert((context_id.clone(), proposals_by_campaign_count.clone()), proposal_id.clone());
			<ProposalsByCampaignCount<T>>::insert(context_id.clone(), updated_proposals_by_campaign_count);
			<ProposalsByCampaignIndex<T>>::insert((context_id.clone(), proposal_id.clone()), proposals_by_campaign_count);

			// update owner map
			<ProposalsByOwnerArray<T>>::insert((sender.clone(), proposals_by_owner_count.clone()), proposal_id.clone());
			<ProposalsByOwnerCount<T>>::insert(sender.clone(), updated_proposals_by_owner_count);
			<ProposalsByOwnerIndex<T>>::insert((sender.clone(), proposal_id.clone()), proposals_by_owner_count);

			//
			//
			//

			// nonce++
			Nonce::mutate(|n| *n += 1);

			// deposit event
			Self::deposit_event(
				RawEvent::Proposal(
					sender,
					proposal_id
				)
			);
			Ok(())
		}

//
//
//

		// TODO: membership proposal for a DAO

		#[weight = 10_000]
		fn propose_add(origin, org: T::Hash, who: T::AccountId ) -> DispatchResult {
			Ok(())
		}

		#[weight = 10_000]
		fn propose_kick(origin, org: T::Hash, who: T::AccountId ) -> DispatchResult {
			Ok(())
		}

		#[weight = 10_000]
		fn propose_ban(origin, org: T::Hash, who: T::AccountId ) -> DispatchResult {
			Ok(())
		}

//
//
//

		// TODO: withdrawal proposal for a campaign
		#[weight = 10_000]
		fn withdraw_proposal(
			origin,
			context_id: T::Hash,
			title: Vec<u8>,
			cid: Vec<u8>,
			amount: T::Balance,
			start: T::BlockNumber,
			expiry: T::BlockNumber,
		) -> DispatchResult {

			let sender = ensure_signed(origin)?;

			//
			//
			//

			// existing campaign?
			// ensure!( <crowdfunding::Module<T>>::campaign_by_id(context_id), "The campaign does not exist" );

			// successful campaign?
			// ensure!( <crowdfunding::Module<T>>::campaign_state(context_id) == 3, "The campaign did not succeed");

			// DISCUSSION: can proposals be made by contributors?
			// request by owner?
			let owner = <crowdfunding::Module<T>>::campaign_owner(context_id).ok_or("The owner does not exist")?;
			ensure!(sender == owner, "The sender must be the owner of the campaign");

			// ensure that start and expiry are in bounds
			let current_block = <system::Module<T>>::block_number();
			// ensure!(start > current_block, Error::<T>::OutOfBounds );
			ensure!(expiry > current_block, Error::<T>::OutOfBounds );
			ensure!(expiry <= current_block + Self::proposal_time_limit(), Error::<T>::OutOfBounds );

			// balance check
			let used_balance = Self::used_balance(&context_id);
			let total_balance = <crowdfunding::Module<T>>::campaign_balance(context_id);
			let remaining_balance = total_balance - used_balance;
			ensure!(remaining_balance >= amount, "The remaining balance is too low");

			// ensure that number of proposals
			// ending in target block
			// do not exceed the maximum
			let proposals = Self::proposals_by_block(expiry);
			ensure!(proposals.len() < MAX_PROPOSALS_PER_BLOCK, "Maximum number of proposals is reached for the target block, try another block");

			//

			let proposal_type = 1; // treasury
			let voting_type = 0; // votes

			// get the nonce
			let nonce = Nonce::get();

			// generate unique id
			let phrase = b"just another withdrawal";
			let proposal_id = <T as Config>::Randomness::random(phrase);

			// ensure that the proposal id is unique
			ensure!(!<Proposals<T>>::contains_key(&context_id), "Proposal id already exists");

			// metadata

			let metadata = ProposalMetadata {
				title: title,
				cid: cid,
				amount,
			};

			// proposal

			let new_proposal = Proposal {
				proposal_id: proposal_id.clone(),
				context_id: context_id.clone(),
				proposal_type,
				voting_type,
				start,
				expiry,
			};

			// check add
			let proposals_count = Self::proposals_count();
			let updated_proposals_count = proposals_count.checked_add(1).ok_or("Overflow adding a new proposal to total proposals")?;
			let proposals_by_campaign_count = Self::proposals_by_campaign_count(context_id);
			let updated_proposals_by_campaign_count = proposals_by_campaign_count.checked_add(1).ok_or("Overflow adding a new proposal to the campaign's proposals")?;
			let proposals_by_owner_count = Self::proposals_by_owner_count(&sender);
			let updated_proposals_by_owner_count = proposals_by_owner_count.checked_add(1).ok_or("Overflow adding a new proposal to the owner's proposals")?;

			// insert proposals
			<Proposals<T>>::insert(proposal_id.clone(), new_proposal.clone());
			<Metadata<T>>::insert(proposal_id.clone(), metadata.clone());
			<Owners<T>>::insert(proposal_id.clone(), sender.clone());

			<ProposalStates<T>>::insert(proposal_id.clone(), 1);

			// update max per block
			<ProposalsByBlock<T>>::mutate(expiry, |proposals| proposals.push(proposal_id.clone()));

			// update proposal map
			<ProposalsArray<T>>::insert(&proposals_count, proposal_id.clone());
			<ProposalsCount>::put(updated_proposals_count);
			<ProposalsIndex<T>>::insert(proposal_id.clone(), proposals_count);

			// update campaign map
			<ProposalsByCampaignArray<T>>::insert((context_id.clone(), proposals_by_campaign_count.clone()), proposal_id.clone());
			<ProposalsByCampaignCount<T>>::insert(context_id.clone(), updated_proposals_by_campaign_count);
			<ProposalsByCampaignIndex<T>>::insert((context_id.clone(), proposal_id.clone()), proposals_by_campaign_count);

			// update owner map
			<ProposalsByOwnerArray<T>>::insert((sender.clone(), proposals_by_owner_count.clone()), proposal_id.clone());
			<ProposalsByOwnerCount<T>>::insert(sender.clone(), updated_proposals_by_owner_count);
			<ProposalsByOwnerIndex<T>>::insert((sender.clone(), proposal_id.clone()), proposals_by_owner_count);

			//
			//
			//

			// nonce++
			Nonce::mutate(|n| *n += 1);

			// deposit event
			Self::deposit_event(
				RawEvent::ProposalCreated(
					sender,
					context_id,
					proposal_id,
					amount,
					expiry
				)
			);
			Ok(())

		}

		// TODO:
		// voting vs staking, e.g.
		// 1. token weighted and democratic voting require yes/no
		// 2. conviction voting requires ongoing staking
		// 3. quadratic voting

		#[weight = 5_000]
		fn simple_vote(
			origin,
			proposal_id: T::Hash,
			vote: bool
		) -> DispatchResult {

			let sender = ensure_signed(origin)?;

			// Ensure the proposal exists
			ensure!(<Proposals<T>>::contains_key(&proposal_id), Error::<T>::ProposalUnknown);

			// Ensure the proposal has not ended
			let proposal_state = Self::proposal_states(&proposal_id);
			ensure!(proposal_state == 1, Error::<T>::ProposalEnded);

			// Ensure the contributor did not vote before
			ensure!(!<VotedBefore<T>>::get((sender.clone(), proposal_id.clone())), Error::<T>::AlreadyVoted);

			// Get the proposal
			let proposal = Self::proposals(&proposal_id);
			// Ensure the proposal is not expired
			ensure!(<system::Module<T>>::block_number() < proposal.expiry, Error::<T>::ProposalExpired);

			// ensure origin is one of:
			// a. member when the proposal is general
			// b. contributor when the proposal is a withdrawal request
			// let sender_balance = <campaign::Module<T>>::campaign_contribution(proposal.campaign_id, sender.clone());
			// ensure!( sender_balance > T::Balance::from(0), "You are not a contributor of this Campaign");

			match &proposal.proposal_type {
				// DAO Democratic Proposal
				// simply one member one vote yes / no,
				// TODO: ratio definable, now > 50% majority wins
				0 => {

						let votes = Self::proposal_simple_votes(&proposal_id);
						let yes = votes.0;
						let no  = votes.1;

						// a naive attempt to update a tuple
						if vote == true  { yes.checked_add(1).ok_or("voting overflow")?; }
						if vote == false { no.checked_add(1).ok_or("voting overflow")?; }
						let updated_votes = ( yes, no );
						<ProposalSimpleVotes<T>>::insert(
							proposal_id.clone(),
							updated_votes
						);

						if vote == true {
							let proposal_approvers = Self::proposal_approvers(&proposal_id);
							let updated_proposal_approvers = proposal_approvers.checked_add(1).ok_or("Overflow")?;
							<ProposalApprovers<T>>::insert(
								proposal_id.clone(),
								updated_proposal_approvers.clone()
							);
						}

						if vote == false {
							let proposal_deniers = Self::proposal_deniers(&proposal_id);
							let updated_proposal_deniers = proposal_deniers.checked_add(1).ok_or("Overflow")?;
							<ProposalDeniers<T>>::insert(
								proposal_id.clone(),
								updated_proposal_deniers.clone()
							);
						}
				},
				// Campaign Token Weighted Proposal
				// total token balance yes vs no
				// TODO: ratio definable, now > 50% majority wins
				1 => {

				},
				// Membership Voting
				// simply one token one vote yes / no,
				// TODO: ratio definable, now simple majority wins
				2 => {

				},
				// supporters vs total threshold voting ( e.g. accept deliverable )
				3 => {

					// Get the number of people who have supported the proposal and add 1
					let proposal_approvers = Self::proposal_approvers(&proposal_id);
					let updated_proposal_approvers = proposal_approvers.checked_add(1).ok_or("Overflow adding the number of people who have voted the proposal")?;
					let contributors = <crowdfunding::Module<T>>::campaign_contributors_count(proposal.context_id);
					let approvers = updated_proposal_approvers.clone();
					// TODO: make this variable
					let fittycent = contributors.checked_div(2).ok_or("Error on division")?;

					// If the approvers are more than half the contributors,
					// the proposal shall pass
					// and funds will be released
					if updated_proposal_approvers > fittycent {
						Self::unlock_balance(proposal_id, approvers)?;
					}

					// Change the number of supporters

					<ProposalApprovers<T>>::insert(
						proposal_id.clone(),
						updated_proposal_approvers.clone()
					);

				}
				// default
				_ => {

				},
			}

			// register voting
			<VotedBefore<T>>::insert( ( sender.clone(), proposal_id.clone() ), true );

			// dispatch vote event
			Self::deposit_event(
				RawEvent::ProposalVoted(
					sender,
					proposal_id.clone(),
					proposal.proposal_type
				)
			);
			Ok(())

		}

		fn on_finalize() {

			// i'm still jenny from the block
			let block_number = <system::Module<T>>::block_number();
			let proposal_hashes = Self::proposals_by_block(block_number);

			for proposal_id in &proposal_hashes {

				let mut proposal_state = Self::proposal_states(&proposal_id);
				if proposal_state != 1 {
					continue;
				}

				let proposal = Self::proposals(&proposal_id);

				// TODO:
				// a. result( accepted, rejected )
				// b. result( accepted, rejected, total_allowed )
				// c. result( required_majority, staked_accept, staked_reject, slash_amount )
				// d. threshold reached
				// e. conviction

				match &proposal.proposal_type {
					0 => {
						// simple vote
						let votes = Self::proposal_simple_votes(&proposal_id);
						let ack = votes.0;
						let nack = votes.1;
						if ack > nack { proposal_state = 1; } // accepted
						if ack < nack { proposal_state = 2; } // rejected
					},
					1 => {
						// treasury
						// if ( ack > nack ) { proposal_state = 1; }
						// if ( ack < nack ) { proposal_state = 2; }
					},
					2 => {
						// membership
						//
					},
					_ => {
						// no result - fail
						proposal_state = 4;
					}
				}

				<ProposalStates<T>>::insert(proposal_id.clone(), proposal_state);
				// let approvers = <ProposalApprovers<T>>::get(proposal_id.clone());

				// Self::deposit_event(
				// 	RawEvent::ProposalFinalized(
				// 		proposal_id,
				// 		// approvers,
				// 		// block_number,
				// 		// false
				// 	)
				// );
			}

		}

	}
}

//
//
//

impl<T:Config> Module<T> {

	// TODO: DISCUSSION
	// withdrawal proposals are accepted
	// when the number of supporters is higher
	// than the number of deniers
	// accepted / denied >= 1
	fn unlock_balance(
		proposal_id: T::Hash,
		supported_count: u64
	) -> DispatchResult {

		// Get proposal and metadata
		let proposal = Self::proposals(proposal_id.clone());
		let metadata = Self::metadata(proposal_id.clone());
		let proposal_balance = metadata.amount;

		// Ensure sufficient balance
		let total_balance = <crowdfunding::Module<T>>::campaign_balance(proposal.context_id);

		// let used_balance = Self::balance_used(proposal.context_id);
		let used_balance = <CampaignBalanceUsed<T>>::get(proposal.context_id);
		let available_balance = total_balance - used_balance.clone();
		ensure!(available_balance >= proposal_balance, "The remaining balance is insufficient");

		// Get the owner of the campaign
		let owner = <Owners<T>>::get(&proposal_id).ok_or("No owner for proposal")?;

		// Unreserve the proposal balance
		let _ = <balances::Module<T>>::unreserve(&owner, proposal_balance.clone());

		// Change the used amount
		let new_used_balance = used_balance + proposal_balance;
		<CampaignBalanceUsed<T>>::insert(proposal.context_id, new_used_balance);

		// proposal completed
		let proposal_state = 5;
		<ProposalStates<T>>::insert(proposal_id.clone(), proposal_state);

		<Proposals<T>>::insert(proposal_id.clone(), proposal.clone());

		Self::deposit_event(
			RawEvent::ProposalFinalized(
				proposal_id,
				supported_count,
				proposal.expiry,
				true
			)
		);
		Ok(())

	}
}

//
//	e v e n t s
//

decl_event!(
	pub enum Event<T> where
		<T as system::Config>::AccountId,
		<T as system::Config>::Hash,
		<T as balances::Config>::Balance,
		<T as system::Config>::BlockNumber
	{
		Proposal(AccountId, Hash),
		ProposalCreated(AccountId, Hash, Hash, Balance, BlockNumber),
		ProposalVoted(AccountId, Hash, u8),
		ProposalFinalized(Hash, u64, BlockNumber, bool),
		ProposalError(Hash, Vec<u8>),
	}
);

//
//	e r r o r s
//

decl_error! {
	pub enum Error for Module<T: Config> {

		/// Proposal Ended
		ProposalEnded,
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

	}
}
