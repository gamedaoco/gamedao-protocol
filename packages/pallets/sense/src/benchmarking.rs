//! Benchmarking setup for pallet-sense
use super::*;

#[allow(unused)]
use crate::Pallet as Sense;
use frame_benchmarking::{account, benchmarks, impl_benchmark_test_suite};
use frame_system::RawOrigin;
use sp_std::vec;

benchmarks! {

	create_entity {}: _(RawOrigin::Root, account("1", 0, 0), BoundedVec::truncate_from(vec![1; 256]))

	update_property {
		let caller_origin = <T as frame_system::Config>::RuntimeOrigin::from(RawOrigin::Root);
		let property_type = PropertyType::Experience;
		Sense::<T>::create_entity(caller_origin, account("1", 0, 0), BoundedVec::truncate_from(vec![1; 1]))?;
	}: _(RawOrigin::Root, account("1", 0, 0), property_type, 255)

	impl_benchmark_test_suite!(Sense, crate::mock::new_test_ext(), crate::mock::Test);
}
