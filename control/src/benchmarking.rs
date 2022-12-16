#![cfg(feature = "runtime-benchmarks")]

use crate::*;
use frame_benchmarking::{account, benchmarks, whitelisted_caller};
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
		let text = BoundedVec::truncate_from((0..255).collect());
		let count = OrgCount::<T>::get();
	}: 	_(
		RawOrigin::Signed(caller), text.clone(), text.clone(),
		OrgType::Individual, AccessModel::Open, FeeModel::NoFees,
		None, None, None, None, None
	)
	verify {
		assert!(OrgCount::<T>::get() == count + 1);
	}

	update_org {
		let caller: T::AccountId = whitelisted_caller();
		fund_account::<T>(&caller)?;

		let org_id = <Pallet::<T> as ControlBenchmarkingTrait<T::AccountId, T::Hash>>::create_org(caller.clone()).unwrap();
		let prime_id = Some(caller.clone());
		let org_type = Some(OrgType::Individual);
		let access_model = Some(AccessModel::Voting);
		let member_limit = Some(100 as MemberLimit);
		let fee_model = Some(FeeModel::NoFees);
		let membership_fee: Option<T::Balance> = Some(99_u32.saturated_into());
	}: _(
		RawOrigin::Signed(caller), org_id, prime_id, org_type, access_model.clone(),
		member_limit, fee_model.clone(), membership_fee
	)
	
	verify {
		let org = Orgs::<T>::get(org_id).unwrap();
		assert_eq!(org.membership_fee, membership_fee);
	}

	disable_org {
		let caller: T::AccountId = whitelisted_caller();
		fund_account::<T>(&caller)?;
		let org_id = <Pallet::<T> as ControlBenchmarkingTrait<T::AccountId, T::Hash>>::create_org(caller.clone()).unwrap();

	}: _(RawOrigin::Root, org_id)

	verify {
		assert!(OrgStates::<T>::get(org_id) == OrgState::Inactive);
	}

	enable_org {
		let caller: T::AccountId = whitelisted_caller();
		fund_account::<T>(&caller)?;
		let org_id = <Pallet::<T> as ControlBenchmarkingTrait<T::AccountId, T::Hash>>::create_org(caller.clone()).unwrap();
		Pallet::<T>::disable_org(RawOrigin::Root.into(), org_id)?;

	}: _(RawOrigin::Root, org_id)

	verify {
		assert!(OrgStates::<T>::get(org_id) == OrgState::Active);
	}

	add_member {
		let r in 1 .. T::MaxMembers::get()-1;

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
		Pallet::<T>::fill_org_with_members(&org_id, accounts)?;

	}: _(RawOrigin::Signed(creator), org_id, member.clone())

	verify {
		assert!(Members::<T>::get(&org_id).contains(&member));
	}

	update_member_state {
		// Prepare org creator and members
		let creator: T::AccountId = whitelisted_caller();
		fund_account::<T>(&creator)?;
		let org_id = <Pallet::<T> as ControlBenchmarkingTrait<T::AccountId, T::Hash>>::create_org(creator.clone()).unwrap();
		let member: T::AccountId = account("member", 0, SEED);
		fund_account::<T>(&member)?;

		// Add member to org
		Pallet::<T>::fill_org_with_members(&org_id, vec![member.clone()])?;
	}: _(RawOrigin::Signed(creator), org_id, member.clone(), MemberState::Active)

	verify {
		assert!(MemberStates::<T>::get(org_id.clone(), member.clone()) == MemberState::Active);
	}

	remove_member {
		let r in 1 .. T::MaxMembers::get()-1;

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
		Pallet::<T>::fill_org_with_members(&org_id, accounts.clone())?;

	}: _(RawOrigin::Signed(creator), org_id, accounts[0].clone())

	verify {
		assert!(!Members::<T>::get(&org_id).contains(&accounts[0]));
	}

	spend_funds {
		let caller: T::AccountId = whitelisted_caller();
		let beneficiary: T::AccountId = account("beneficiary", 1, SEED);
		fund_account::<T>(&caller)?;
		let org_id = <Pallet::<T> as ControlBenchmarkingTrait<T::AccountId, T::Hash>>::create_org(caller.clone()).unwrap();
		let treasury_id = OrgTreasury::<T>::get(&org_id).unwrap();
		let currency_id = T::PaymentTokenId::get();
		let amount: T::Balance = 300_000_000_000_00_u128.saturated_into();
		fund_account::<T>(&treasury_id)?;
		
	}: _(RawOrigin::Signed(caller), org_id, currency_id, beneficiary.clone(), amount)

	verify {
		assert!(T::Currency::free_balance(currency_id, &beneficiary) == amount);
	}

	impl_benchmark_test_suite!(Control, crate::mock::new_test_ext(), crate::mock::Test);
}
