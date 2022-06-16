//! Benchmarking setup for gamedao-flow
use super::*;

use crate::Pallet as Flow;
use frame_benchmarking::{account, benchmarks, impl_benchmark_test_suite, whitelisted_caller};
use frame_system::RawOrigin;
use frame_support::traits::Hooks;
use sp_runtime::{DispatchError, traits::{Saturating}};
use sp_std::{vec};


fn fund_account<T: Config>(account_id: &T::AccountId, multiplier: Option<u32>) -> Result<(), DispatchError> {
	let amount = T::MinContribution::get().saturating_mul(multiplier.unwrap_or(10).into());
	T::Currency::deposit(T::ProtocolTokenId::get(), account_id, amount)?;
	T::Currency::deposit(T::PaymentTokenId::get(), account_id, amount)?;
	Ok(())
}

/// Fund accounts with tokens, needed for org interactions
fn fund_accounts<T: Config>(account_ids: &Vec<T::AccountId>, multiplier: Option<u32>) -> Result<(), DispatchError> {
	for account_id in account_ids {
		fund_account::<T>(&account_id, multiplier)?;
	}
	Ok(())
}

fn create_campaign_call<T: Config>(caller: T::AccountId, org_id: T::Hash) -> Result<T::Hash, &'static str> {
	let name: Vec<u8> = vec![0; T::MaxNameLength::get() as usize];
	let cid: Vec<u8> = vec![0; T::MaxNameLength::get() as usize];
	let token_symbol: Vec<u8> = vec![0; 5];
	let token_name: Vec<u8> = vec![0; 32];
	Flow::<T>::create_campaign(
		RawOrigin::Signed(caller.clone()).into(),
		org_id,
		caller.clone(),
		name,
		T::MinContribution::get(),
		T::MinContribution::get(),
		frame_system::Pallet::<T>::block_number() + 200_u32.into(),
		Default::default(),
		Default::default(),
		cid,
		token_name,
		token_symbol
	)?;
	let nonce = Nonce::<T>::get() - 1u128;
	Ok(T::Hashing::hash_of(&nonce))
}


benchmarks! {

	create_campaign {
		let b in 0 .. T::MaxCampaignsPerBlock::get()-1;  // already created campaigns at current block

		let caller: T::AccountId = whitelisted_caller();
		fund_account::<T>(&caller, None)?;
		let org_id = T::Control::create_org(caller.clone().into())?;
		let treasury_id = T::Control::org_treasury_account(&org_id);
		fund_account::<T>(&treasury_id, None)?;
		for i in 0..b {
			create_campaign_call::<T>(caller.clone(), org_id.clone())?;
		}
		let count_before = CampaignsCount::<T>::get();

	}: _(
		RawOrigin::Signed(caller.clone()),
		org_id,
		caller.clone(),
		vec![0; T::MaxNameLength::get() as usize],
		T::MinContribution::get(),
		T::MinContribution::get(),
		200_u32.into(),
		Default::default(),
		Default::default(),
		vec![0; T::MaxNameLength::get() as usize],
		vec![0; 5],
		vec![0; 32]
	)
	verify {
		assert!(CampaignsCount::<T>::get() == count_before + 1);
	}

	update_state {
		let caller: T::AccountId = whitelisted_caller();
		fund_account::<T>(&caller, None)?;
		let org_id = T::Control::create_org(caller.clone().into())?;
		let treasury_id = T::Control::org_treasury_account(&org_id);
		fund_account::<T>(&treasury_id, None)?;
		let campaign_id = create_campaign_call::<T>(caller.clone(), org_id.clone())?;
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
		let owner: T::AccountId = whitelisted_caller();
		let contributor: T::AccountId = account("contributor", 0, 0);
		fund_accounts::<T>(&vec![owner.clone(), contributor.clone()], None)?;
		let org_id = T::Control::create_org(owner.clone().into())?;
		let treasury_id = T::Control::org_treasury_account(&org_id);
		fund_account::<T>(&treasury_id, None)?;
		let campaign_id = create_campaign_call::<T>(owner, org_id)?;
	}: _(
		RawOrigin::Signed(contributor.clone()),
		campaign_id.clone(),
		T::MinContribution::get()
	)
	verify {
		assert!(CampaignContribution::<T>::contains_key((&campaign_id, &contributor)));
	}

	on_initialize {
		let b in 0 .. T::MaxContributorsProcessing::get();  // number of contributions in current block
		let c in 0 .. T::MaxCampaignsPerBlock::get();  // number of campaigns in current block

		let owner: T::AccountId = whitelisted_caller();
		fund_account::<T>(&owner, None)?;
		let org_id = T::Control::create_org(owner.clone().into())?;
		let treasury_id = T::Control::org_treasury_account(&org_id);
		fund_account::<T>(&treasury_id, None)?;
		for _ in 0..c {
			let campaign_id = create_campaign_call::<T>(owner.clone(), org_id.clone())?;
			for i in 0..b {
				let account: T::AccountId = account("contributor", i, 0);
				fund_account::<T>(&account, None)?;
				Pallet::<T>::contribute(RawOrigin::Signed(account).into(), campaign_id.clone(), T::MinContribution::get())?;
			}
		}
		let nonce = Nonce::<T>::get().saturating_sub(1_u128);
		let campaign_id = T::Hashing::hash_of(&nonce);
		let campaign = Campaigns::<T>::get(&campaign_id);
		let mut block_number = campaign.expiry;
		frame_system::Pallet::<T>::set_block_number(block_number.clone());
		Pallet::<T>::on_finalize(block_number.clone());
		block_number = block_number.saturating_add(1_u32.into());
		frame_system::Pallet::<T>::set_block_number(block_number);
	}: {
		Pallet::<T>::on_initialize(block_number);
	}

}

impl_benchmark_test_suite!(Flow, crate::mock::new_test_ext(), crate::mock::Test);
