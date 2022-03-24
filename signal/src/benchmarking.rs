#![cfg(feature = "runtime-benchmarks")]

use frame_benchmarking::{account, benchmarks, whitelisted_caller};
use frame_system::RawOrigin;

use crate::{ Pallet as Signal, Event, Config };
use pallet_control::{ Pallet as Control, Config as ControlConfig, Event as ControlEvent, OrgType, AccessModel, FeeModel };
use pallet_flow::Pallet as Flow;
use frame_support::{ assert_ok };
use zero_primitives::{ AccountId };

benchmarks! {

	general_proposal {
		let caller = whitelisted_caller();
		let origin = RawOrigin::Signed(caller);
		let controller: T::AccountId = account("controller", 1, 0);
		let treasury: T::AccountId = account("treasury", 1, 0);
		Control::create(
			origin,
			controller,
			treasury,
			vec![1,2,3],
			vec![1,2,3],
			OrgType::Individual,
			AccessModel::Open,
			FeeModel::NoFees,
			0, 1, 2, 100
		)?;
		let bn = frame_system::Pallet::block_number();
		let org_event: ControlEvent = <frame_system::Pallet<T>>::events().pop()
			.expect("No event generated").event.into();
		// let Event::Control(ControlEvent::OrgCreated {sender_id, org_id, ..}) = org_event;
		if let Event::Control(ControlEvent::OrgCreated {org_id, ..}) = org_event {
			println!("Okay!");
		} else {
			println!("Fail");
		}
		// }

	}: _(caller, org_id.unwrap(), vec![1,2,3], vec![1,2,3], bn, bn + 10)
	// verify {
	// 	let proposal_event = System::events().pop()
	// 		.expect("No event generated").event;
	// 	// assert!(proposal_event as SignalEvent).proposal_id.len();
	// }

	impl_benchmark_test_suite!(Signal, crate::tests::new_test_ext(), crate::tests::Test)
}
