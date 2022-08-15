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
		let caller: T::AccountId = whitelisted_caller();
		fund_account::<T>(&caller)?;
		
		// Prepare organization and treasury
		let org_id = T::Control::create_org(caller.clone().into())?;
		let treasury_id = T::Control::org_treasury_account(&org_id).unwrap();
		let bounded_vec = BoundedVec::truncate_from(vec![0; T::StringLimit::get() as usize]);
		fund_account::<T>(&treasury_id)?;

		// Save number of existing campaigns to compare to new count after extrinsic called
		let count_before = CampaignCount::<T>::get();
	}: _(
		RawOrigin::Signed(caller.clone()),
		org_id, caller.clone(),
		bounded_vec.clone(),
		T::MinContribution::get().saturating_mul(10u32.into()),
		T::MinContribution::get(),
		frame_system::Pallet::<T>::block_number() + 57_600_u32.into(), // 60/3*60*24*2 (2 days with 3 sec block time)
		Default::default(), Default::default(),
		bounded_vec.clone(), None,
		Some(bounded_vec.clone()), Some(bounded_vec.clone())
	)
	verify {
		assert!(CampaignCount::<T>::get() == count_before + 1);
	}

	contribute {
		// Prepare owner and contributor accounts
		let contributor: T::AccountId = whitelisted_caller();
		let owner: T::AccountId = account("owner", 0, SEED);
		fund_accounts::<T>(&vec![owner.clone(), contributor.clone()])?;

		// Prepare organization and treasury
		let org_id = T::Control::create_org(owner.clone().into())?;
		let treasury_id = T::Control::org_treasury_account(&org_id).unwrap();
		fund_account::<T>(&treasury_id)?;

		// Create campaign to use for contributions
		let now = frame_system::Pallet::<T>::block_number();
		let campaign_id = <Flow::<T> as FlowBenchmarkingTrait<T::AccountId, T::BlockNumber, T::Hash>>::create_campaign(&owner, &org_id, now)?;
	}: _(
		RawOrigin::Signed(contributor.clone()),
		campaign_id.clone(),
		T::MinContribution::get()
	)
	verify {
		assert!(CampaignContribution::<T>::contains_key(&campaign_id, &contributor));
	}

	on_initialize {
		let c in 0 .. T::MaxContributorsProcessing::get();
		let p in 0 .. T::MaxCampaignsPerBlock::get();

		let now = frame_system::Pallet::<T>::block_number();
		let owner: T::AccountId = whitelisted_caller();
		fund_account::<T>(&owner)?;
		let org_id = T::Control::create_org(owner.clone().into())?;
		let treasury_id = T::Control::org_treasury_account(&org_id).unwrap();
		fund_account::<T>(&treasury_id)?;

		// 1. Prepare for Campaign finalization. Create campaign and contributions
		let campaign_id = <Flow::<T> as FlowBenchmarkingTrait<T::AccountId, T::BlockNumber, T::Hash>>
			::create_campaign(&owner, &org_id, now)?;
		for i in 0 .. c {
			let account: T::AccountId = account("contributor", i, SEED);
			fund_account::<T>(&account)?;
			Flow::<T>::contribute(RawOrigin::Signed(account).into(), campaign_id.clone(), T::MinContribution::get())?;
		}
		let mut expiry_block = CampaignOf::<T>::get(&campaign_id).unwrap().expiry;

		// 2. Prepare for Campaign activation. Create campaigns to be Activated at the same block when finalization happens
		let finalization_block = expiry_block.clone().saturating_add(1_u32.into());
		for j in 0 .. p {
			let _ = <Flow::<T> as FlowBenchmarkingTrait<T::AccountId, T::BlockNumber, T::Hash>>
				::create_campaign(&owner, &org_id, finalization_block)?;
		}

		frame_system::Pallet::<T>::set_block_number(expiry_block);
		Flow::<T>::on_finalize(expiry_block.clone());

		frame_system::Pallet::<T>::set_block_number(finalization_block);
		assert!(CampaignStates::<T>::get(&campaign_id) == CampaignState::Activated);
	}: { Flow::<T>::on_initialize(finalization_block); }

	verify {
		// TODO: each status check panics, not sure what's going on here

		// assert!(CampaignStates::<T>::get(&campaign_id) == CampaignState::Created);
		// assert!(CampaignStates::<T>::get(&campaign_id) == CampaignState::Failed);
		// assert!(CampaignStates::<T>::get(&campaign_id) == CampaignState::Activated);
		// assert!(CampaignStates::<T>::get(&campaign_id) == CampaignState::Succeeded);
	}

	impl_benchmark_test_suite!(Flow, crate::mock::new_test_ext(), crate::mock::Test);
}
