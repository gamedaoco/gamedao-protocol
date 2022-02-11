//! Benchmarking setup for pallet-sense
use super::*;

#[allow(unused)]
use crate::Pallet as ZeroSense;
use frame_benchmarking::{benchmarks, impl_benchmark_test_suite, account};
use frame_system::RawOrigin;
use sp_std::vec;


benchmarks!{

    create_entity {}: _(RawOrigin::Root, account("1", 0, 0), vec![1; 256])

    mod_xp {
        let caller_origin = <T as frame_system::Config>::Origin::from(RawOrigin::Root);
        ZeroSense::<T>::create_entity(caller_origin, account("1", 0, 0), vec![1; 1])?;
	}: _(RawOrigin::Root, account("1", 0, 0), 255)

    mod_rep {
        let caller_origin = <T as frame_system::Config>::Origin::from(RawOrigin::Root);
        ZeroSense::<T>::create_entity(caller_origin, account("1", 0, 0), vec![1; 1])?;
	}: _(RawOrigin::Root, account("1", 0, 0), 255)

    mod_trust {
        let caller_origin = <T as frame_system::Config>::Origin::from(RawOrigin::Root);
        ZeroSense::<T>::create_entity(caller_origin, account("1", 0, 0), vec![1; 1])?;
	}: _(RawOrigin::Root, account("1", 0, 0), 255)

}

impl_benchmark_test_suite!(ZeroSense, crate::mock::new_test_ext(), crate::mock::Test);
