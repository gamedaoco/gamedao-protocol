#![cfg(test)]
use super::{
    mock::*,
};
use crate::{Event as SenseEvent, Entity, EntityProperty, Error, Config, SenseEntity, SenseREP, SenseTrust, SenseXP};
use frame_support::{assert_noop, assert_ok, BoundedVec};
use frame_system::RawOrigin;
use sp_runtime::traits::BadOrigin;

#[test]
fn sense_create_entity() {
	new_test_ext().execute_with(|| {
		let cid: BoundedVec<u8, <Test as Config>::StringLimit> = BoundedVec::truncate_from(vec![1,2,3]);

		let account = 1;
		let index = 0;
		let block_number = 3;

		System::set_block_number(block_number);

		assert_noop!(
			Sense::create_entity(RawOrigin::Root.into(), 1, BoundedVec::default()),
			Error::<Test>::InvalidParam
		);

		assert_ok!(Sense::create_entity(RawOrigin::Root.into(), account, cid.clone()));

		assert_eq!(
			Entity::new(account, block_number, index, cid.clone()),
			Sense::entity(account).unwrap()
		);
		assert_eq!(EntityProperty::new(0, block_number), Sense::xp(account).unwrap());
		assert_eq!(EntityProperty::new(0, block_number), Sense::rep(account).unwrap());
		assert_eq!(EntityProperty::new(0, block_number), Sense::trust(account).unwrap());

		System::assert_has_event(
			Event::Sense(SenseEvent::EntityInit(account, block_number))
		);

		// TODO: Check Nonce value increased in storage as a result of successful extrinsic call.
		assert_noop!(Sense::create_entity(Origin::signed(1), 1, cid.clone()), BadOrigin);

		assert_noop!(
			Sense::create_entity(RawOrigin::Root.into(), account, cid.clone()),
			Error::<Test>::EntityExists
		);
	});
}

// TODO: 1. Test: StorageMap value updated after calling extrinsic (SenseXP etc.)
// 2. Test: event is generated (EntityMutateXP etc.)
// 3. Add comments
macro_rules! sense_mod_tests {
    ($($name:ident: $storage:tt, $extrinsic:path,)*) => {
    $(
        #[test]
        fn $name() {
			new_test_ext().execute_with(|| {
				let account = 1;
				let block_number = 3;
				let cid: BoundedVec<u8, <Test as Config>::StringLimit> = BoundedVec::truncate_from(vec![1,2,3]);
				System::set_block_number(block_number);

				assert_noop!($extrinsic(Origin::signed(1), 1, 1), BadOrigin);
				assert_noop!(
					$extrinsic(RawOrigin::Root.into(), 1, 1),
					Error::<Test>::EntityUnknown
				);

				SenseEntity::<Test>::insert(
					account, Entity::new(account, block_number, 0, cid)
				);
				$storage::<Test>::insert(
					account, EntityProperty::new(account, block_number)
				);

				assert_ok!($extrinsic(
					RawOrigin::Root.into(), account, 125)
				);
			});
        }
    )*
    }
}

sense_mod_tests! {
	sense_mod_xp: SenseXP, Sense::mod_xp,
	sense_mod_rep: SenseREP, Sense::mod_rep,
	sense_mod_trust: SenseTrust, Sense::mod_trust,
}
