//! Benchmarking setup for pallet-sense
use super::*;

#[allow(unused)]
use crate::Pallet as Sense;
use frame_benchmarking::{account, benchmarks, impl_benchmark_test_suite};
use frame_system::RawOrigin;
use sp_std::vec;

benchmarks! {

	create_entity {}: _(RawOrigin::Root, account("1", 0, 0), vec![1; 256])

	mod_xp {
		let caller_origin = <T as frame_system::Config>::Origin::from(RawOrigin::Root);
		Sense::<T>::create_entity(caller_origin, account("1", 0, 0), vec![1; 1])?;
	}: _(RawOrigin::Root, account("1", 0, 0), 255)

	mod_rep {
		let caller_origin = <T as frame_system::Config>::Origin::from(RawOrigin::Root);
		Sense::<T>::create_entity(caller_origin, account("1", 0, 0), vec![1; 1])?;
	}: _(RawOrigin::Root, account("1", 0, 0), 255)

	mod_trust {
		let caller_origin = <T as frame_system::Config>::Origin::from(RawOrigin::Root);
		Sense::<T>::create_entity(caller_origin, account("1", 0, 0), vec![1; 1])?;
	}: _(RawOrigin::Root, account("1", 0, 0), 255)

}

impl_benchmark_test_suite!(Sense, crate::mock::new_test_ext(), crate::mock::Test);
