#![cfg(feature = "runtime-benchmarks")]

use frame_benchmarking::{account, benchmarks, impl_benchmark_test_suite, whitelisted_caller};
use frame_system::RawOrigin;
use frame_support::{dispatch::DispatchError, traits::{Get, Hooks}, BoundedVec};
use sp_runtime::traits::SaturatedConversion;
use sp_std::vec::Vec;

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

fn create_org_campaign<T: Config>(caller: T::AccountId, contributors_count: u32, members: Option<Vec<T::AccountId>>) -> Result<(T::Hash, T::Hash), DispatchError> {
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
	if let Some(members) = members {
		T::Control::fill_org_with_members(&org_id, members)?;
	}
	Ok((campaign_id, org_id))
}


benchmarks! {

	proposal {
		let caller: T::AccountId = whitelisted_caller();
		fund_account::<T>(&caller)?;
		let (campaign_id, org_id) = create_org_campaign::<T>(caller.clone(), 10, None)?;
		let bounded_str = BoundedVec::truncate_from((0..255).collect());
		let start = frame_system::Pallet::<T>::block_number();
		let expiry = frame_system::Pallet::<T>::block_number() + 200_u32.into();
		let deposit = T::MinProposalDeposit::get();
		let amount: T::Balance = 10_000u32.saturated_into();
		let currency = T::PaymentTokenId::get();
		let beneficiary = account("beneficiary", 1, SEED);
		let quorum = Permill::from_rational(1u32, 3u32);
		let prop = types::Proposal {
			index: ProposalCount::<T>::get(), proposal_type: ProposalType::Spending,
			owner: caller.clone(), title: bounded_str.clone(), cid: bounded_str.clone(),
			slashing_rule: SlashingRule::Automated, start, expiry, deposit, org_id,
			campaign_id: Some(campaign_id), amount: Some(amount),
			beneficiary: Some(beneficiary), currency_id: Some(currency)
		};
		let proposal_id = T::Hashing::hash_of(&prop);
		// TODO: change to token weighted voting
	}: _(
		RawOrigin::Signed(caller), prop.proposal_type, prop.org_id,
		prop.title, prop.cid, prop.deposit, prop.expiry,
		Majority::Relative, Unit::Person, Scale::Linear, Some(prop.start), Some(quorum),
		prop.campaign_id, prop.amount, prop.beneficiary, prop.currency_id
	)
	verify {
		assert!(ProposalOf::<T>::contains_key(&proposal_id));
	}

	vote {
		// The most heavy execution path is triggering an early finalization flow (fn try_finalize_proposal)
		//	with either Withdrawal or Spending proposal type and Relative or Simple majority type.
		let m in 0 .. T::MaxMembersPerOrg::get();

		let mut members = vec![];
		let proposer: T::AccountId = account::<T::AccountId>("proposer", 0, SEED);
		fund_account::<T>(&proposer)?;

		for i in 1 .. m {
			let member = account::<T::AccountId>("member", i, SEED);
			fund_account::<T>(&member)?;
			members.push(member);
		}
		let (campaign_id, org_id) = create_org_campaign::<T>(proposer.clone(), 10, Some(members.clone()))?;
		let bounded_str: BoundedVec<u8, T::StringLimit> = BoundedVec::truncate_from((0..255).collect());
		let start = frame_system::Pallet::<T>::block_number();
		let expiry = frame_system::Pallet::<T>::block_number() + 200_u32.into();
		let deposit = T::MinProposalDeposit::get();
		let amount: T::Balance = 10_000u32.saturated_into();
		let currency_id = T::PaymentTokenId::get();
		let quorum = Permill::from_rational(1u32, 3u32);
		let beneficiary = account::<T::AccountId>("beneficiary", 0, SEED);
		let prop = types::Proposal {
			index: ProposalCount::<T>::get(), proposal_type: ProposalType::Spending,
			owner: proposer.clone(), title: bounded_str.clone(), cid: bounded_str.clone(),
			slashing_rule: SlashingRule::Automated, start, expiry, deposit, org_id,
			campaign_id: Some(campaign_id), amount: Some(amount),
			beneficiary: Some(beneficiary), currency_id: Some(currency_id)
		};
		let proposal_id = T::Hashing::hash_of(&prop);

		Pallet::<T>::proposal(
			RawOrigin::Signed(proposer.clone()).into(), prop.proposal_type.clone(), prop.org_id,
			prop.title.clone(), prop.cid.clone(), prop.deposit, prop.expiry,
			Majority::Simple, Unit::Person, Scale::Linear, None, Some(quorum),
			prop.campaign_id, prop.amount, prop.beneficiary, prop.currency_id,
		)?;

		// Ensure that proposal exists and Activated
		assert!(ProposalStates::<T>::get(&proposal_id) == ProposalState::Activated);

		// Have everyone vote aye on proposal and not yet trigger early finalization flow.
		for j in 1 .. m {
			let voter = &members[(j - 1) as usize];
			let approve = true;
			Pallet::<T>::vote(
				RawOrigin::Signed(voter.clone()).into(),
				proposal_id,
				approve,
				None
			)?;
		}

		// Ensure that proposal is still Active and not Finalized yet
		assert!(ProposalStates::<T>::get(&proposal_id) == ProposalState::Activated);

		// Only proposer haven't voted "YES", so his vote should trigger an early finalization flow
		let voter = proposer;
		let approve = true;
		// Whitelist voter account from further DB operations.
		let voter_key = frame_system::Account::<T>::hashed_key_for(&voter);
		frame_benchmarking::benchmarking::add_to_whitelist(voter_key.into());

	}: _(RawOrigin::Signed(voter), proposal_id.clone(), approve, None)

	verify {
		assert!(ProposalStates::<T>::get(&proposal_id) == ProposalState::Finalized);
	}

	on_initialize {
		let p in 0 .. T::MaxProposalsPerBlock::get();

		let caller: T::AccountId = whitelisted_caller();
		fund_account::<T>(&caller)?;
		let (campaign_id, org_id) = create_org_campaign::<T>(caller.clone(), 10, None)?;
		let bounded_str: BoundedVec<u8, T::StringLimit> = BoundedVec::truncate_from((0..255).collect());
		let start = frame_system::Pallet::<T>::block_number() + 10_u32.into();
		let expiry = frame_system::Pallet::<T>::block_number() + 200_u32.into();
		let deposit = T::MinProposalDeposit::get();
		let amount: T::Balance = 10_000u32.saturated_into();
		let currency_id = T::PaymentTokenId::get();
		let quorum = Permill::from_rational(1u32, 3u32);

		for i in 0 .. p {
			let prop = types::Proposal {
				index: i as u32, proposal_type: ProposalType::Withdrawal,
				owner: caller.clone(), title: bounded_str.clone(), cid: bounded_str.clone(),
				slashing_rule: SlashingRule::Automated, start, expiry, deposit, org_id,
				campaign_id: Some(campaign_id), amount: Some(amount),
				beneficiary: None, currency_id: Some(currency_id)
			};
			let proposal_id = T::Hashing::hash_of(&prop);
			Pallet::<T>::proposal(
				RawOrigin::Signed(caller.clone()).into(), prop.proposal_type.clone(), prop.org_id,
				prop.title.clone(), prop.cid.clone(), prop.deposit, prop.expiry,
				Majority::Simple, Unit::Person, Scale::Linear, Some(prop.start), Some(quorum),
				prop.campaign_id, prop.amount, prop.beneficiary, prop.currency_id,
			)?;
			// Ensure that proposal exists and Activated
			assert!(ProposalStates::<T>::get(&proposal_id) == ProposalState::Created);
		}

	}: { Pallet::<T>::on_initialize(start); }

	verify {
		// Ensure proposals were Activated
		for i in 0 .. p {
			let prop = types::Proposal {
				index: i as u32, proposal_type: ProposalType::Withdrawal,
				owner: caller.clone(), title: bounded_str.clone(), cid: bounded_str.clone(),
				slashing_rule: SlashingRule::Automated, start, expiry, deposit, org_id,
				campaign_id: Some(campaign_id), amount: Some(amount),
				beneficiary: None, currency_id: Some(currency_id)
			};
			let proposal_id = T::Hashing::hash_of(&prop);
			assert!(ProposalStates::<T>::get(&proposal_id) == ProposalState::Activated);
		}
	}

	impl_benchmark_test_suite!(Signal, crate::tests::new_test_ext(), crate::tests::Test);

}
