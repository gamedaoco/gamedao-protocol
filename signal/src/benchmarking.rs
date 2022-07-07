#![cfg(feature = "runtime-benchmarks")]

use frame_benchmarking::{account, benchmarks, impl_benchmark_test_suite, whitelisted_caller};
use frame_system::RawOrigin;
use frame_support::{dispatch::DispatchError, traits::Get, BoundedVec};
use sp_runtime::traits::{SaturatedConversion};
// use sp_std::vec;

use crate::*;


const SEED: u32 = 0;
const DEPOSIT_AMOUNT: u128 = 10_000_000_000_000_000_000;


/// Fund account with tokens, needed for org and campaign interactions
fn fund_account<T: Config>(account_id: &T::AccountId) -> Result<(), DispatchError> {
	let balance_amount: T::Balance = DEPOSIT_AMOUNT.saturated_into();
	T::Currency::deposit(T::ProtocolTokenId::get(), account_id, balance_amount)?;
	T::Currency::deposit(T::PaymentTokenId::get(), account_id, balance_amount)?;
	Ok(())
}

fn fund_accounts<T: Config>(account_ids: &Vec<T::AccountId>) -> Result<(), DispatchError> {
	for account_id in account_ids {
		fund_account::<T>(&account_id)?;
	}
	Ok(())
}


fn create_and_finalize_campaign<T: Config>(caller: T::AccountId, contributors_count: u32) -> Result<T::Hash, DispatchError> {
	let org_id = T::Control::create_org(caller.clone())?;
	let treasury_account_id = T::Control::org_treasury_account(&org_id).unwrap();
	fund_account::<T>(&treasury_account_id)?;
	let campaign_id = T::Flow::create_campaign(&caller, &org_id)?;
	let contributors: Vec<T::AccountId> = (0..contributors_count).collect::<Vec<u32>>().iter()
		.map(|i| account("contributor", *i, SEED)).collect();
	fund_accounts::<T>(&contributors)?;
	T::Flow::create_contributions(&campaign_id, contributors)?;
	let current_block = frame_system::Pallet::<T>::block_number();
	let mut expiry = current_block + 200_u32.into();
	for _ in 0 .. 10 {
		T::Flow::finalize_campaigns_by_block(expiry);
		if T::Flow::is_campaign_succeeded(&campaign_id) {
			break;
		}
		expiry = expiry + 1_u32.into();
	}
	Ok(campaign_id)
}


benchmarks! {

	general_proposal {
		let caller: T::AccountId = whitelisted_caller();
		fund_account::<T>(&caller)?;
		let org_id = T::Control::create_org(caller.clone())?;
		let start = frame_system::Pallet::<T>::block_number() + 1_u32.into();
		let expiry = start + 100_u32.into();
		let proposal_id = T::Hashing::hash_of(&Nonce::<T>::get());
	}: _(
		RawOrigin::Signed(caller.clone()),
		org_id.clone(),
		BoundedVec::truncate_from((0..255).collect()),
		BoundedVec::truncate_from((0..255).collect()),
		start,
		expiry
	)
	verify {
		assert!(Proposals::<T>::contains_key(&proposal_id));
	}

	membership_proposal {
		let caller: T::AccountId = whitelisted_caller();
		fund_account::<T>(&caller)?;
		let org_id = T::Control::create_org(caller.clone())?;
		let start = frame_system::Pallet::<T>::block_number() + 1_u32.into();
		let expiry = start + 100_u32.into();
		let member: T::AccountId = account("member", 0, SEED);
		let proposal_id = T::Hashing::hash_of(&Nonce::<T>::get());
	}: _(RawOrigin::Signed(caller), org_id, member, 0, start, expiry)

	withdraw_proposal {
		let caller: T::AccountId = whitelisted_caller();
		fund_account::<T>(&caller)?;
		let campaign_id = create_and_finalize_campaign::<T>(caller.clone(), 10)?;
		let proposal_id = T::Hashing::hash_of(&Nonce::<T>::get());
	}: _(
		RawOrigin::Signed(caller),
		campaign_id.clone(),
		BoundedVec::truncate_from((0..255).collect()),
		BoundedVec::truncate_from((0..255).collect()),
		T::Flow::campaign_balance(&campaign_id),
		frame_system::Pallet::<T>::block_number() + 1_u32.into(),
		frame_system::Pallet::<T>::block_number() + 200_u32.into()
	)
	verify {
		assert!(Proposals::<T>::contains_key(&proposal_id));
	}

	simple_vote_general {
		let b in 0 .. T::MaxVotesPerProposal::get()-1;  // limit number of votes

		let caller: T::AccountId = whitelisted_caller();
		fund_account::<T>(&caller)?;
		let org_id = T::Control::create_org(caller.clone())?;
		let start = frame_system::Pallet::<T>::block_number() + 1_u32.into();
		let expiry = start + 500_u32.into();
		let proposal_id = T::Hashing::hash_of(&Nonce::<T>::get());
		Pallet::<T>::general_proposal(
			RawOrigin::Signed(caller.clone()).into(),
			org_id.clone(),
			BoundedVec::truncate_from((0..255).collect()),
			BoundedVec::truncate_from((0..255).collect()),
			start,
			expiry
		)?;
		let voters: Vec<T::AccountId> = (0..b).collect::<Vec<u32>>().iter()
			.map(|i| account("voter", *i, SEED)).collect();
		fund_accounts::<T>(&voters)?;
		for voter in voters.iter().step_by(2) {
			Pallet::<T>::simple_vote(RawOrigin::Signed(voter.clone()).into(), proposal_id, true)?;
		}
		for voter in voters.iter().skip(1).step_by(2) {
			Pallet::<T>::simple_vote(RawOrigin::Signed(voter.clone()).into(), proposal_id, false)?;
		}
		let votes_count_before = ProposalVotes::<T>::get(&proposal_id);
	}: {
		Pallet::<T>::simple_vote(
			RawOrigin::Signed(caller.clone()).into(),
			proposal_id.clone(),
			true
		)?;
	}
	verify {
		assert!(ProposalVotes::<T>::get(&proposal_id) == votes_count_before + 1);
	}

	simple_vote_withdraw {
		let b in 0 .. T::MaxVotesPerProposal::get()-1;

		let caller: T::AccountId = whitelisted_caller();
		fund_account::<T>(&caller)?;

		// Create campaign and withdraw proposal
		let campaign_id = create_and_finalize_campaign::<T>(caller.clone(), 10)?;
		let withdraw_amount = T::Flow::campaign_balance(&campaign_id);
		let start = frame_system::Pallet::<T>::block_number() + 1_u32.into();
		let expiry = start + 200_u32.into();
		let proposal_id = T::Hashing::hash_of(&Nonce::<T>::get());
		Pallet::<T>::withdraw_proposal(
			RawOrigin::Signed(caller.clone()).into(),
			campaign_id,
			BoundedVec::truncate_from((0..255).collect()),
			BoundedVec::truncate_from((0..255).collect()),
			withdraw_amount,
			start,
			expiry
		)?;

		let voters: Vec<T::AccountId> = (0 .. b).collect::<Vec<u32>>().iter()
			.map(|i| account("voter", *i, SEED)).collect();
		fund_accounts::<T>(&voters)?;
		for voter in voters {
			Pallet::<T>::simple_vote(RawOrigin::Signed(voter.clone()).into(), proposal_id.clone(), false)?;
		}
		let votes_count_before = ProposalVotes::<T>::get(&proposal_id);

	}: {
		Pallet::<T>::simple_vote(
			RawOrigin::Signed(caller.clone()).into(),
			proposal_id.clone(),
			true
		)?;
	}
	verify {
		assert!(ProposalVotes::<T>::get(&proposal_id) == votes_count_before + 1);
	}

	unlock_balance {
		let b in 2 .. 100;

		let caller: T::AccountId = whitelisted_caller();
		fund_account::<T>(&caller)?;

		// Create campaign and withdraw proposal
		let campaign_id = create_and_finalize_campaign::<T>(caller.clone(), b*2)?;
		let withdraw_amount = T::Flow::campaign_balance(&campaign_id);
		let start = frame_system::Pallet::<T>::block_number() + 1_u32.into();
		let expiry = start + 200_u32.into();
		let proposal_id = T::Hashing::hash_of(&Nonce::<T>::get());
		Pallet::<T>::withdraw_proposal(
			RawOrigin::Signed(caller.clone()).into(),
			campaign_id,
			BoundedVec::truncate_from((0..255).collect()),
			BoundedVec::truncate_from((0..255).collect()),
			withdraw_amount,
			start,
			expiry
		)?;

		let voters: Vec<T::AccountId> = (0 .. b).collect::<Vec<u32>>().iter()
			.map(|i| account("voter", *i, SEED)).collect();
		fund_accounts::<T>(&voters)?;
		for voter in voters {
			Pallet::<T>::simple_vote(RawOrigin::Signed(voter.clone()).into(), proposal_id.clone(), true)?;
		}
		ProposalSimpleVotes::<T>::insert(proposal_id, (b as u64 + 1, 0));
		let proposal = Proposals::<T>::get(&proposal_id).unwrap();
	}: {
		Pallet::<T>::unlock_balance(
			&proposal,
			0
		).map_err(|e| "Unlock balance error")?;
	}
	verify {
		assert!(ProposalStates::<T>::get(&proposal_id) == ProposalState::Finalized);
	}
}

impl_benchmark_test_suite!(Signal, crate::tests::new_test_ext(), crate::tests::Test);
