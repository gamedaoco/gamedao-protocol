//! Benchmarking setup for gamedao-control
use super::*;

#[allow(unused)]
use crate::Pallet as Control;
use frame_benchmarking::{account, benchmarks, impl_benchmark_test_suite};
use frame_system::RawOrigin;
use sp_std::vec;

benchmarks! {

	simple_benchmark {}: {}

}

impl_benchmark_test_suite!(Control, crate::mock::new_test_ext(), crate::mock::Test);
