//! Benchmarking setup for gamedao-flow
use super::*;

use crate::Pallet as Flow;
use frame_benchmarking::{account, benchmarks, impl_benchmark_test_suite, whitelisted_caller};
use frame_system::RawOrigin;
use frame_support::traits::Hooks;
use sp_runtime::{DispatchError, traits::{Saturating, SaturatedConversion}};
use sp_std::vec;


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

/// Switch to next block number
fn next_block<T: Config>() {
	let current_block = frame_system::Pallet::<T>::block_number();
	frame_system::Pallet::<T>::set_block_number(current_block + 1_u32.into());
}


benchmarks! {

	create_campaign {
		let b in 0 .. T::MaxCampaignsPerOrg::get()-1;  // limit to total campaigns per organization

		let caller: T::AccountId = whitelisted_caller();
		fund_account::<T>(&caller)?;

		// Prepare organization and treasury
		let per_block_cnt = T::MaxCampaignsPerBlock::get();
		let org_id = T::Control::create_org(caller.clone().into())?;
		let treasury_id = T::Control::org_treasury_account(&org_id).unwrap();
		fund_account::<T>(&treasury_id)?;

		// Create some campaigns, respecting per block limitation
		for i in 0 .. b {
			<Flow::<T> as FlowBenchmarkingTrait<T::AccountId, T::BlockNumber, T::Hash>>::create_campaign(&caller, &org_id)?;
			if i % per_block_cnt == 0 {
				next_block::<T>();
			}
		}

		// Save number of existing campaigns to compare to new count after extrinsic called
		let count_before = CampaignsCount::<T>::get();
	}: _(
		RawOrigin::Signed(caller.clone()),
		org_id,
		caller.clone(),
		BoundedVec::truncate_from(vec![0; T::StringLimit::get() as usize]),
		T::MinContribution::get(),
		T::MinContribution::get(),
		frame_system::Pallet::<T>::block_number() + 200_u32.into(),
		Default::default(),
		Default::default(),
		BoundedVec::truncate_from(vec![0; T::StringLimit::get() as usize]),
		BoundedVec::truncate_from(vec![0; 5]),
		BoundedVec::truncate_from(vec![0; 32])
	)
	verify {
		assert!(CampaignsCount::<T>::get() == count_before + 1);
	}

	update_state {
		let b in 1 .. T::MaxCampaignsPerOrg::get();  // limit to campaigns per organization

		let caller: T::AccountId = whitelisted_caller();
		fund_account::<T>(&caller)?;

		// Prepare organization and treasury
		let per_block_cnt = T::MaxCampaignsPerBlock::get();
		let org_id = T::Control::create_org(caller.clone().into())?;
		let treasury_id = T::Control::org_treasury_account(&org_id).unwrap();
		fund_account::<T>(&treasury_id)?;

		// Create some campaigns, respecting per block limitation
		for i in 0 .. b {
			<Flow::<T> as FlowBenchmarkingTrait<T::AccountId, T::BlockNumber, T::Hash>>::create_campaign(&caller, &org_id)?;
			if i % per_block_cnt == 0 {
				next_block::<T>();
			}
		}

		// Use last campaign to call extrinsic with
		let campaign_id = T::Hashing::hash_of(&Nonce::<T>::get().saturating_sub(1_u128));
		let new_state = FlowState::Paused;
	}: _(
		RawOrigin::Signed(caller.clone()),
		campaign_id,
		new_state.clone()
	)
	verify {
		assert!(CampaignState::<T>::get(&campaign_id) == new_state);
	}

	contribute {

		// Prepare owner and contributor accounts
		let owner: T::AccountId = whitelisted_caller();
		let contributor: T::AccountId = account("contributor", 0, SEED);
		fund_accounts::<T>(&vec![owner.clone(), contributor.clone()])?;

		// Prepare organization and treasury
		let org_id = T::Control::create_org(owner.clone().into())?;
		let treasury_id = T::Control::org_treasury_account(&org_id).unwrap();
		fund_account::<T>(&treasury_id)?;

		// Create campaign to use for contributions
		let campaign_id = <Flow::<T> as FlowBenchmarkingTrait<T::AccountId, T::BlockNumber, T::Hash>>::create_campaign(&owner, &org_id)?;
	}: _(
		RawOrigin::Signed(contributor.clone()),
		campaign_id.clone(),
		T::MinContribution::get()
	)
	verify {
		assert!(CampaignContribution::<T>::contains_key((&campaign_id, &contributor)));
	}

	on_initialize {
		let c in 1 .. T::MaxContributorsProcessing::get();  // number of contributions in current block

		let owner: T::AccountId = whitelisted_caller();
		fund_account::<T>(&owner)?;

		// Prepare organization and treasury
		let org_id = T::Control::create_org(owner.clone().into())?;
		let treasury_id = T::Control::org_treasury_account(&org_id).unwrap();
		fund_account::<T>(&treasury_id)?;

		// Create campaign and add some contributions
		let campaign_id = <Flow::<T> as FlowBenchmarkingTrait<T::AccountId, T::BlockNumber, T::Hash>>::create_campaign(&owner, &org_id)?;
		for i in 0 .. c {
			let account: T::AccountId = account("contributor", i, SEED);
			fund_account::<T>(&account)?;
			Flow::<T>::contribute(RawOrigin::Signed(account).into(), campaign_id.clone(), T::MinContribution::get())?;
		}

		// Trigger on_finalize to prepare object to be used in initialize hook
		let mut block_number = Campaigns::<T>::get(&campaign_id).unwrap().expiry;
		frame_system::Pallet::<T>::set_block_number(block_number.clone());
		Flow::<T>::on_finalize(block_number.clone());
		block_number = block_number.saturating_add(1_u32.into());
		frame_system::Pallet::<T>::set_block_number(block_number);
	}: {
		Flow::<T>::on_initialize(block_number);
	}

}

impl_benchmark_test_suite!(Flow, crate::mock::new_test_ext(), crate::mock::Test);
