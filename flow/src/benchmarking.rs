//! Benchmarking setup for gamedao-flow
use super::*;

#[allow(unused)]
use crate::Pallet as Flow;
use frame_benchmarking::{account, benchmarks, impl_benchmark_test_suite};
use frame_system::RawOrigin;
use sp_std::vec;

benchmarks! {

	simple_benchmark {}: {}
    // <T as orml_tokens::Config>::Currency::set_balance(GameCurrencyId, &creator, 1000);

}

impl_benchmark_test_suite!(Flow, crate::mock::new_test_ext(), crate::mock::Test);
