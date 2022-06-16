#![cfg(feature = "runtime-benchmarks")]

 use crate::*;
 use frame_benchmarking::{account, benchmarks, impl_benchmark_test_suite, whitelisted_caller};
 use frame_system::RawOrigin;
 use sp_runtime::{DispatchError, traits::{Saturating}};
 use sp_std::vec;

/// Fund accounts with tokens, needed for org interactions
fn fund_accounts<T: Config>(account_ids: &Vec<T::AccountId>) -> Result<(), DispatchError> {
	let multiplier: u32 = 2;
	let amount = T::MinimumDeposit::get().saturating_mul(multiplier.into());
	for account_id in account_ids {
		T::Currency::deposit(T::ProtocolTokenId::get(), account_id, amount)?;
		T::Currency::deposit(T::PaymentTokenId::get(), account_id, amount)?;
	}
	Ok(())
}


benchmarks! {

	create_org {
		let caller: T::AccountId = whitelisted_caller();
		fund_accounts::<T>(&vec![caller.clone()])?;
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
		T::CurrencyId::default(),
		T::CurrencyId::default(),
		100,
		None
	)
	verify {
		assert!(OrgByNonce::<T>::get(org_nonce).is_some());
	}

	disable_org {
		let caller: T::AccountId = whitelisted_caller();
		fund_accounts::<T>(&vec![caller.clone()])?;
		let org_id = <Pallet::<T> as ControlBenchmarkingTrait<T::AccountId, T::Hash>>::create_org(caller.clone()).unwrap();
	}: _(RawOrigin::Root, org_id)
	verify {
		assert!(OrgState::<T>::get(org_id) == ControlState::Inactive);
	}

	enable_org {
		let caller: T::AccountId = whitelisted_caller();
		fund_accounts::<T>(&vec![caller.clone()])?;
		let org_id = <Pallet::<T> as ControlBenchmarkingTrait<T::AccountId, T::Hash>>::create_org(caller.clone()).unwrap();
	}: _(RawOrigin::Root, org_id)
	verify {
		assert!(OrgState::<T>::get(org_id) == ControlState::Active);
	}

	add_member {
		let r in 1 .. T::MaxMembersPerDAO::get()-1;

		let creator: T::AccountId = whitelisted_caller();
		let member: T::AccountId = account("member", 0 as u32, 0 as u32);
		let accounts: Vec<T::AccountId> = (1..r)
			.collect::<Vec<u32>>()
			.iter()
			.map(|i| account("member", *i, *i))
			.collect();
		fund_accounts::<T>(&vec![creator.clone(), member.clone()])?;
		fund_accounts::<T>(&accounts)?;
		let org_id = <Pallet::<T> as ControlBenchmarkingTrait<T::AccountId, T::Hash>>::create_org(creator.clone()).unwrap();
		Pallet::<T>::fill_org_with_members(&org_id, &accounts)?;
	}: _(RawOrigin::Signed(creator), org_id, member.clone())
	verify {
		assert!(OrgMembers::<T>::get(&org_id).contains(&member));
	}

	remove_member {
		let r in 1 .. T::MaxMembersPerDAO::get();
		let creator: T::AccountId = whitelisted_caller();
		fund_accounts::<T>(&vec![creator.clone()])?;
		let org_id = <Pallet::<T> as ControlBenchmarkingTrait<T::AccountId, T::Hash>>::create_org(creator.clone()).unwrap();
		let origin = RawOrigin::Signed(creator.clone());
		let accounts: Vec<T::AccountId> = (1..r+1)
			.collect::<Vec<u32>>()
			.iter()
			.map(|i| account("member", *i, *i))
			.collect();
		fund_accounts::<T>(&accounts)?;
		Pallet::<T>::fill_org_with_members(&org_id, &accounts)?;
	}: _(origin, org_id, accounts[0].clone())
	verify {
		assert!(!OrgMembers::<T>::get(&org_id).contains(&accounts[0]));
	}

	check_membership {
		let caller: T::AccountId = whitelisted_caller();
		fund_accounts::<T>(&vec![caller.clone()])?;
		let org_id = <Pallet::<T> as ControlBenchmarkingTrait<T::AccountId, T::Hash>>::create_org(caller.clone()).unwrap();
	}: _(RawOrigin::Signed(caller), org_id)


}

impl_benchmark_test_suite!(Control, crate::mock::new_test_ext(), crate::mock::Test);
