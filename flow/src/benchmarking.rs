// //! Benchmarking setup for pallet-flow
// use super::*;

// #[allow(unused)]
// use crate::Pallet as Flow;
// use pallet_control::Pallet as Control;
// use frame_benchmarking::{account, benchmarks, impl_benchmark_test_suite};
// use frame_system::{RawOrigin, Origin};
// use sp_std::vec;
// use sp_core::H256;

// pub use zero_primitives::{TokenSymbol, CurrencyId};

// const SEED: u32 = 0;

// benchmarks! {

// 	create {
//         let controller = account::<T::AccountId>("controller", 0, SEED);
//         let treasury = account::<T::AccountId>("treasury", 0, SEED);
//         let creator = account::<T::AccountId>("creator", 0, SEED);

//         let GameCurrencyId: CurrencyId = TokenSymbol::GAME as u32;

//         // <T as orml_tokens::Config>::Currency::set_balance(GameCurrencyId, &creator, 1000);
//         // T::Currency::set_balance(GameCurrencyId, &treasury, 1000);
//         // T::Currency::set_balance(GameCurrencyId, &controller, 1000);

//         // pallet_control::<T>::create
//         // pallet_control::create
//         Control::create(
//             RawOrigin::Signed(creator), controller, treasury, vec![1,2], vec![3,4], 
//             Default::default(), Default::default(), Default::default(),
//             100, 0, 0, 10
//         )?;

//         // <pallet_control::Pallet<T>>::create(
//         //     RawOrigin::Signed(creator), controller, treasury, vec![1,2], vec![3,4], 
//         //     Default::default(), Default::default(), Default::default(),
//         //     100, 0, 0, 10
//         // )?;

//     }: _(RawOrigin::Signed(controller), H256::random(), controller, vec![1, 2], 20, 10, 4, 
//         FlowProtocol::Raise, FlowGovernance::No, vec![1, 2], vec![], vec![])

// }

// impl_benchmark_test_suite!(Flow, crate::mock::new_test_ext(), crate::mock::Test);
