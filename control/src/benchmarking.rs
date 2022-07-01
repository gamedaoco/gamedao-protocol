#![cfg(feature = "runtime-benchmarks")]

use crate::*;
use frame_benchmarking::{account, benchmarks, impl_benchmark_test_suite, whitelisted_caller};
use frame_system::RawOrigin;
use sp_runtime::{DispatchError, traits::SaturatedConversion};
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


benchmarks! {

	create_org {
		let caller: T::AccountId = whitelisted_caller();
		fund_account::<T>(&caller)?;
		let org_nonce = Nonce::<T>::get();
	}: 	_(
		RawOrigin::Signed(caller.clone()),
		caller.clone().into(),
		(0..255).collect(),
		(0..255).collect(),
		OrgType::Individual,
		AccessModel::Open,
		FeeModel::NoFees,
		T::Balance::default(),
		T::ProtocolTokenId::get(),
		T::PaymentTokenId::get(),
		100,
		None
	)
	verify {
		assert!(OrgByNonce::<T>::get(org_nonce).is_some());
	}

	disable_org {
		let caller: T::AccountId = whitelisted_caller();
		fund_account::<T>(&caller)?;
		let org_id = <Pallet::<T> as ControlBenchmarkingTrait<T::AccountId, T::Hash>>::create_org(caller.clone()).unwrap();
	}: _(
		RawOrigin::Root,
		org_id
	)
	verify {
		assert!(OrgState::<T>::get(org_id) == ControlState::Inactive);
	}

	enable_org {
		let caller: T::AccountId = whitelisted_caller();
		fund_account::<T>(&caller)?;
		let org_id = <Pallet::<T> as ControlBenchmarkingTrait<T::AccountId, T::Hash>>::create_org(caller.clone()).unwrap();
		Pallet::<T>::disable_org(RawOrigin::Root.into(), org_id)?;
	}: _(
		RawOrigin::Root,
		org_id
	)
	verify {
		assert!(OrgState::<T>::get(org_id) == ControlState::Active);
	}

	add_member {
		let r in 1 .. T::MaxMembersPerOrg::get()-1;  // Limit members per org

		// Prepare org creator and members
		let creator: T::AccountId = whitelisted_caller();
		let member: T::AccountId = account("member", 0, SEED);
		let accounts: Vec<T::AccountId> = (1..r)
			.collect::<Vec<u32>>()
			.iter()
			.map(|i| account("member", *i, SEED))
			.collect();
		fund_accounts::<T>(&vec![creator.clone(), member.clone()])?;
		fund_accounts::<T>(&accounts)?;

		// Create org and fill with members
		let org_id = <Pallet::<T> as ControlBenchmarkingTrait<T::AccountId, T::Hash>>::create_org(creator.clone()).unwrap();
		Pallet::<T>::fill_org_with_members(&org_id, &accounts)?;
	}: _(
		RawOrigin::Signed(creator),
		org_id,
		member.clone()
	)
	verify {
		assert!(OrgMembers::<T>::get(&org_id).contains(&member));
	}

	remove_member {
		let r in 1 .. T::MaxMembersPerOrg::get();  // Limit members per org

		// Prepare org creator and members
		let creator: T::AccountId = whitelisted_caller();
		fund_account::<T>(&creator)?;
		let org_id = <Pallet::<T> as ControlBenchmarkingTrait<T::AccountId, T::Hash>>::create_org(creator.clone()).unwrap();
		let accounts: Vec<T::AccountId> = (1..r+1)
			.collect::<Vec<u32>>()
			.iter()
			.map(|i| account("member", *i, SEED))
			.collect();
		fund_accounts::<T>(&accounts)?;

		// Add members to org
		Pallet::<T>::fill_org_with_members(&org_id, &accounts)?;
	}: _(
		RawOrigin::Signed(creator),
		org_id,
		accounts[0].clone()
	)
	verify {
		assert!(!OrgMembers::<T>::get(&org_id).contains(&accounts[0]));
	}

	check_membership {
		let caller: T::AccountId = whitelisted_caller();
		fund_account::<T>(&caller)?;
		let org_id = <Pallet::<T> as ControlBenchmarkingTrait<T::AccountId, T::Hash>>::create_org(caller.clone()).unwrap();
	}: _(
		RawOrigin::Signed(caller.clone()),
		org_id,
		caller.clone()
	)

}

impl_benchmark_test_suite!(Control, crate::mock::new_test_ext(), crate::mock::Test);
