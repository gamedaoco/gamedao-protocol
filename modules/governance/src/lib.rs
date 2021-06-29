//
//           _______________________________ ________
//           \____    /\_   _____/\______   \\_____  \
//             /     /  |    __)_  |       _/ /   |   \
//            /     /_  |        \ |    |   \/    |    \
//           /_______ \/_______  / |____|_  /\_______  /
//                   \/        \/         \/         \/
//           Z  E  R  O  .  I  O     N  E  T  W  O  R  K
//           © C O P Y R I O T   2 0 7 5 @ Z E R O . I O

// crowdcampaign
// campaign treasury

// 1. proposal withdrawal (unreserve) as creator from successful campaign
// 2. approve withdrawals (unreserve) as investor from successfully funded campaigns

#![cfg_attr(not(feature = "std"), no_std)]

// TODO: harden checks on completion
#![allow(dead_code)]
#![allow(unused_imports)]
#![allow(unused_variables)]
// only on nightly
// #![feature(const_fn_fn_ptr_basics)]

use crowdfunding;

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
// TODO: replace deprecated
use sp_runtime::traits::{ Hash, Zero };

// #[cfg_attr(feature = "std", derive(Debug))]

//
//
//
//
//

#[derive(Encode, Decode, Default, Clone, PartialEq)]
pub struct Proposal<Hash, Balance, BlockNumber>{

	// unique proposal id
	proposal_id: Hash,

	// unique campaign id
	campaign_id: Hash,

	// short description
	purpose: Vec<u8>,

	// ipfs content hash
	cid: Vec<u8>,

	// proposaled funds
	amount: Balance,

	// expiration block of proposal
	expiry: BlockNumber,

	// status
	// 0 open, 1 approved, 2 declined, 3 expired
	status: u8,
}

pub trait Config: timestamp::Config + crowdfunding::Config {

	type Currency: ReservableCurrency<Self::AccountId>;
	type Event: From<Event<Self>> + Into<<Self as system::Config>::Event>;
	type Nonce: Get<u64>;
	type Randomness: Randomness<Self::Hash>;

	type MaxProposalsPerBlock: Get<usize>;

}

// TODO replace with config
const MAX_PROPOSALS_PER_BLOCK: usize = 3;
const MAX_PROPOSAL_DURATION: u32 = 60480;

//
//
//
//
//

decl_event!(
	pub enum Event<T> where
		<T as system::Config>::AccountId,
		<T as system::Config>::Hash,
		<T as balances::Config>::Balance,
		<T as system::Config>::BlockNumber
	{
		ProposalCreated(AccountId, Hash, Hash, Balance, BlockNumber),
		ProposalVoted(AccountId, Hash),
		ProposalFinalized(Hash, u64, BlockNumber, bool),
	}
);

//
//
//
//
//

decl_storage! {

	trait Store for Module<T: Config> as ProposalProposal {

		// Global status
		Proposals get(fn proposals): map hasher(blake2_128_concat) T::Hash => Proposal<T::Hash, T::Balance, T::BlockNumber>;
		ProposalOwner get(fn proposal_owner): map hasher(blake2_128_concat) T::Hash => Option<T::AccountId>;

		// Maximum time limit for the proposal
		ProposalTimeLimit get(fn proposal_time_limit) config(): T::BlockNumber = T::BlockNumber::from(MAX_PROPOSAL_DURATION);

		// All proposals
		ProposalsArray get(fn proposals_by_index): map hasher(blake2_128_concat) u64 => T::Hash;
		ProposalsCount get(fn proposals_count): u64;
		ProposalsIndex: map hasher(blake2_128_concat) T::Hash => u64;

		// The campaign's proposals
		ProposalsByCampaignArray get(fn proposals_by_campaign_by_index): map hasher(blake2_128_concat)  (T::Hash, u64) => T::Hash;
		ProposalsByCampaignCount get(fn proposals_by_campaign_count): map hasher(blake2_128_concat) T::Hash => u64;
		ProposalsByCampaignIndex: map hasher(blake2_128_concat) (T::Hash, T::Hash) => u64;

		// The owner's proposals
		ProposalsByOwnerArray get(fn proposals_by_owner): map hasher(blake2_128_concat) (T::AccountId, u64) => T::Hash;
		ProposalsByOwnerCount get(fn proposals_by_owner_count): map hasher(blake2_128_concat) T::AccountId => u64;
		ProposalsByOwnerIndex: map hasher(blake2_128_concat) (T::AccountId, T::Hash) => u64;

		// Proposals ending in a block
		ProposalsByBlock get(fn proposals_by_block): map hasher(blake2_128_concat) T::BlockNumber => Vec<T::Hash>;

		// The amount of currency that the project has used
		CampaignBalanceUsed get(fn used_balance): map hasher(blake2_128_concat) T::Hash => T::Balance;

		// The number of people who support the proposal
		ProposalSupporters get(fn proposal_supporters): map hasher(blake2_128_concat) T::Hash => u64;

		// Judge if the user has voted the proposal
		VotedBefore get(fn has_voted_before): map hasher(blake2_128_concat) (T::AccountId, T::Hash) => bool;

		// Get the status of a proposal: 0 undecided 1 accepted 2 declined
       	ProposalStatus get(fn proposal_status): map hasher(blake2_128_concat) T::Hash => u8;

		// Record the number of proposals
		Nonce: u64;
	}
}

//
//
//
//
//

decl_module! {
	pub struct Module<T: Config> for enum Call where origin: T::Origin {

		type Error = Error<T>;

		fn deposit_event() = default;

		#[weight = 1_000]
		fn create_proposal(
			origin,
			campaign_id: T::Hash,
			purpose: Vec<u8>,
			cid: Vec<u8>,
			amount: T::Balance,
			expiry: T::BlockNumber,
		) -> DispatchResult {

			let sender = ensure_signed(origin)?;

			// Ensure the campaign exists
			// ensure!(<campaign::Module<T>>::is_campaign_exists(campaign_id), "The campaign does not exist");
			// ensure!( <campaign::Module<T>>::campaign_by_id(campaign_id), "The campaign does not exist" );

			// Ensure the campaign reached its cap
			ensure!(<crowdfunding::Module<T>>::campaign_state(campaign_id) == 3, "The campaign did not succeed");

			// Ensure the sender is the owner
			let owner = <crowdfunding::Module<T>>::campaign_owner(campaign_id).ok_or("The owner does not exist")?;
			ensure!(sender == owner, "The sender must be the owner of the campaign");

			// ensure that the expiry is valid
			ensure!(expiry > <system::Module<T>>::block_number(), "The expiry has to be greater than the current block number");
			ensure!(expiry <= <system::Module<T>>::block_number() + Self::proposal_time_limit(), "The expiry has to be lower than the limit");

			let used_balance = Self::used_balance(&campaign_id);
			let total_balance = <crowdfunding::Module<T>>::campaign_balance(campaign_id);
			let remaining_balance = total_balance - used_balance;
			ensure!(remaining_balance >= amount, "The remaining balance is too low");

			// get the nonce
			let nonce = Nonce::get();

			// generate the unique id
			let phrase = b"another proposal";
			let proposal_id = <T as Config>::Randomness::random(phrase);

			// ensure that the proposal id is unique
			ensure!(!<Proposals<T>>::contains_key(&campaign_id), "Proposal id already exists");

			let new_proposal = Proposal{
				proposal_id,
				campaign_id: campaign_id.clone(),
				purpose,
				cid,
				amount,
				expiry,
				status: 0,
			};

			// ensure that number of proposals
			// ending in target block
			// does not exceed maximum
			let proposals = Self::proposals_by_block(expiry);
			ensure!(proposals.len() < MAX_PROPOSALS_PER_BLOCK, "Maximum number of proposals is reached for the target block, try another block");

			// check add
			let proposals_count = Self::proposals_count();
			let updated_proposals_count = proposals_count.checked_add(1).ok_or("Overflow adding a new proposal to total proposals")?;
			let proposals_by_campaign_count = Self::proposals_by_campaign_count(campaign_id);
			let updated_proposals_by_campaign_count = proposals_by_campaign_count.checked_add(1).ok_or("Overflow adding a new proposal to the campaign's proposals")?;
			let proposals_by_owner_count = Self::proposals_by_owner_count(&sender);
			let updated_proposals_by_owner_count = proposals_by_owner_count.checked_add(1).ok_or("Overflow adding a new proposal to the owner's proposals")?;

			// insert proposals
			<Proposals<T>>::insert(proposal_id.clone(), new_proposal.clone());
			<ProposalOwner<T>>::insert(proposal_id.clone(), sender.clone());

			// update max per block
			<ProposalsByBlock<T>>::mutate(expiry, |proposals| proposals.push(proposal_id.clone()));

			// update proposal map
			<ProposalsArray<T>>::insert(&proposals_count, proposal_id.clone());
			<ProposalsCount>::put(updated_proposals_count);
			<ProposalsIndex<T>>::insert(proposal_id.clone(), proposals_count);

			// update campaign map
			<ProposalsByCampaignArray<T>>::insert((campaign_id.clone(), proposals_by_campaign_count.clone()), proposal_id.clone());
			<ProposalsByCampaignCount<T>>::insert(campaign_id.clone(), updated_proposals_by_campaign_count);
			<ProposalsByCampaignIndex<T>>::insert((campaign_id.clone(), proposal_id.clone()), proposals_by_campaign_count);

			// update owner map
			<ProposalsByOwnerArray<T>>::insert((sender.clone(), proposals_by_owner_count.clone()), proposal_id.clone());
			<ProposalsByOwnerCount<T>>::insert(sender.clone(), updated_proposals_by_owner_count);
			<ProposalsByOwnerIndex<T>>::insert((sender.clone(), proposal_id.clone()), proposals_by_owner_count);

			// nonce++
			Nonce::mutate(|n| *n += 1);

			// deposit event
			Self::deposit_event(
				RawEvent::ProposalCreated(
					sender,
					campaign_id,
					proposal_id,
					amount,
					expiry
				)
			);
			Ok(())

		}

		#[weight = 1_000]
		fn support_proposal(
			origin,
			proposal_id: T::Hash
		) -> DispatchResult {

			let sender = ensure_signed(origin)?;

			// Ensure the proposal exists
			ensure!(<Proposals<T>>::contains_key(&proposal_id), "The proposal does not exist");

			// Get the proposal
			let proposal = Self::proposals(&proposal_id);

			// Ensure the user is a contributor
			// let sender_balance = <campaign::Module<T>>::campaign_contribution(proposal.campaign_id, sender.clone());
			// ensure!( sender_balance > T::Balance::from(0), "You are not a contributor of this Campaign");

			// Ensure the investor does not vote before
			ensure!(!<VotedBefore<T>>::get((sender.clone(), proposal_id.clone())), "You have already voted before");

			// Ensure the proposal has not ended
			ensure!(proposal.status == 0, "The proposal has ended");

			// Ensure the proposal is not expired
			ensure!(<system::Module<T>>::block_number() < proposal.expiry, "The proposal expired");

			// Get the number of people who have supported the proposal and add 1
			let proposal_supporters = Self::proposal_supporters(&proposal_id);
			let updated_proposal_supporters = proposal_supporters.checked_add(1).ok_or("Overflow adding the number of people who have voted the proposal")?;

			let contributors = <crowdfunding::Module<T>>::campaign_contributors_count(proposal.campaign_id);
			let supporters = updated_proposal_supporters.clone();

			// TODO: make this variable
			let fittycent = contributors.checked_div(2).ok_or("Error on division")?;

			// If the supporters are more than half the contributors,
			// the proposal shall pass
			// and funds will be released
			if updated_proposal_supporters > fittycent {

				Self::can_use_balance(proposal_id, supporters)?;

			}

			// W R I T E

			// Change the investor voting status
			<VotedBefore<T>>::insert(
				(
					sender.clone(),
					proposal_id.clone()
				),
				true
			);

			// Change the number of supporters

			<ProposalSupporters<T>>::insert(
				proposal_id.clone(),
				updated_proposal_supporters.clone()
			);

			// dispatch vote event

			Self::deposit_event(
				RawEvent::ProposalVoted(
					sender,
					proposal_id.clone()
				)
			);
			Ok(())

		}

		fn on_finalize() {

			// i'm still jenny from the the block

			let block_number = <system::Module<T>>::block_number();
			let proposal_hashes = Self::proposals_by_block(block_number);

			for proposal_id in &proposal_hashes {

				let mut proposal = Self::proposals(proposal_id);

				if proposal.status == 1 {
					continue;
				}

				proposal.status = 2;

				<Proposals<T>>::insert(proposal_id.clone(), proposal.clone());

				let supporters = <ProposalSupporters<T>>::get(proposal.proposal_id);

				Self::deposit_event(
					RawEvent::ProposalFinalized(
						proposal.proposal_id,
						supporters,
						proposal.expiry,
						false
					)
				);
			}

		}

	}
}

//
//
//
//
//

impl<T:Config> Module<T> {

	fn can_use_balance(
		proposal_id: T::Hash,
		supported_count: u64
	) -> DispatchResult {

		// Get the proposal
		let mut proposal = Self::proposals(&proposal_id);
		let proposal_balance = proposal.amount;

		// Ensure sufficient balance
		let total_balance = <crowdfunding::Module<T>>::campaign_balance(proposal.campaign_id);
		// let used_balance = Self::balance_used(proposal.campaign_id);
		let used_balance = <CampaignBalanceUsed<T>>::get(proposal.campaign_id);
		let available_balance = total_balance - used_balance.clone();
		ensure!(available_balance >= proposal_balance, "The remaining balance is insufficient");

		// Get the owner of the campaign
		let owner = <ProposalOwner<T>>::get(&proposal_id).ok_or("No owner for proposal")?;

		// Unreserve the proposal balance
		let _ = <balances::Module<T>>::unreserve(&owner, proposal_balance.clone());

		// Change the used amount
		let new_used_balance = used_balance + proposal_balance;
		<CampaignBalanceUsed<T>>::insert(proposal.campaign_id, new_used_balance);

		// Change the proposal status
		proposal.status = 1;
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

decl_error! {
	pub enum Error for Module<T: Config> {

	}
}

