use super::{mock::*, Error, EntityProperty, Entity, Sense, SenseXP, SenseREP, SenseTrust, Event as ZeroEvent};
use frame_support::{assert_noop, assert_ok};
use frame_system::{EventRecord, Phase, RawOrigin};
use sp_runtime::traits::BadOrigin;


#[test]
fn sense_create_entity() {
	new_test_ext().execute_with(|| {

		let cid = vec![1,2,3];

		let account = 1;
		let index = 0;
		let block_number = 3;

		System::set_block_number(block_number);

		assert_noop!(ZeroSense::create_entity(
			RawOrigin::Root.into(), 1, vec![]),
			Error::<Test>::InvalidParam
		);
		assert_noop!(ZeroSense::create_entity(
			RawOrigin::Root.into(), 1, vec![1u8; 257]),
			Error::<Test>::ParamLimitExceed
		);

		assert_ok!(ZeroSense::create_entity(
			RawOrigin::Root.into(), account, cid.clone())
		);
		
		assert_eq!(
			Entity::new(account, block_number, index, cid.clone()),
			ZeroSense::entity(account)
		);
		assert_eq!(
			EntityProperty::new(0, block_number),
			ZeroSense::xp(account)
		);
		assert_eq!(
			EntityProperty::new(0, block_number),
			ZeroSense::rep(account)
		);
		assert_eq!(
			EntityProperty::new(0, block_number),
			ZeroSense::trust(account)
		);

		assert_eq!(
			System::events(),
			vec![EventRecord {
				phase: Phase::Initialization,
				event: Event::ZeroSense(ZeroEvent::EntityInit(account, block_number)),
				topics: vec![],
			}]
		);

		assert_noop!(ZeroSense::create_entity(Origin::signed(1), 1, vec![1u8]), BadOrigin);

		assert_noop!(ZeroSense::create_entity(
			RawOrigin::Root.into(), account, cid.clone()),
			Error::<Test>::EntityExists
		);

	});

}

// TODO: 1. Test: StorageMap value updated after calling extrinsic (SenseXP etc.)
// 2. Tese: event is generated (EntityMutateXP etc.)
// 3. Add comments
macro_rules! sense_mod_tests {
    ($($name:ident: $storage:tt, $extrinsic:path,)*) => {
    $(
        #[test]
        fn $name() {
			new_test_ext().execute_with(|| {
				let account = 1;
				let block_number = 3;
				System::set_block_number(block_number);
		
				assert_noop!($extrinsic(Origin::signed(1), 1, 1), BadOrigin);
				assert_noop!(
					$extrinsic(RawOrigin::Root.into(), 1, 1),
					Error::<Test>::EntityUnknown
				);
		
				Sense::<Test>::insert(
					account, Entity::new(account, block_number, 0, vec![1,2,3])
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
	sense_mod_xp: SenseXP, ZeroSense::mod_xp,
	sense_mod_rep: SenseREP, ZeroSense::mod_rep,
	sense_mod_trust: SenseTrust, ZeroSense::mod_trust,
}
