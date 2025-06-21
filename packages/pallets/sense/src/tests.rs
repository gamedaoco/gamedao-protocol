#![cfg(test)]
use super::{Event as SenseEvent, Entity, EntityProperty, PropertyType, Error, Config, Entities, Properties};
use crate::mock::*;
use frame_support::{assert_noop, assert_ok, BoundedVec};
use frame_system::RawOrigin;
use sp_runtime::traits::BadOrigin;

#[test]
fn should_create_entity() {
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
			Sense::get_entity(account).unwrap()
		);
		assert_eq!(EntityProperty::new(0, block_number), Sense::get_property(PropertyType::Experience, account).unwrap());
		assert_eq!(EntityProperty::new(0, block_number), Sense::get_property(PropertyType::Reputation, account).unwrap());
		assert_eq!(EntityProperty::new(0, block_number), Sense::get_property(PropertyType::Trust, account).unwrap());
		assert_eq!(1, Sense::get_entity_count());

		System::assert_has_event(
			Event::Sense(SenseEvent::EntityCreated{account_id: account, block_number})
		);

		assert_noop!(Sense::create_entity(Origin::signed(1), 1, cid.clone()), BadOrigin);

		assert_noop!(
			Sense::create_entity(RawOrigin::Root.into(), account, cid.clone()),
			Error::<Test>::EntityExists
		);
	});
}


#[test]
fn should_update_properties() {
	new_test_ext().execute_with(|| {
		let account = 1;
		let block_number = 3;
		let cid: BoundedVec<u8, <Test as Config>::StringLimit> = BoundedVec::truncate_from(vec![1,2,3]);
		System::set_block_number(block_number);

		assert_noop!(Sense::update_property(Origin::signed(1), 1, PropertyType::Experience, 1), BadOrigin);
		assert_noop!(
			Sense::update_property(RawOrigin::Root.into(), 1, PropertyType::Experience, 1),
			Error::<Test>::EntityUnknown
		);

		Entities::<Test>::insert(account, Entity::new(account, block_number, 0, cid));

		assert_noop!(Sense::update_property(RawOrigin::Root.into(), account, PropertyType::Experience, 125), Error::<Test>::EntityPropertyUnknown);
		assert_noop!(Sense::update_property(RawOrigin::Root.into(), account, PropertyType::Reputation, 234), Error::<Test>::EntityPropertyUnknown);
		assert_noop!(Sense::update_property(RawOrigin::Root.into(), account, PropertyType::Trust, 250), Error::<Test>::EntityPropertyUnknown);
		
		Properties::<Test>::insert(PropertyType::Experience, account, EntityProperty::new(0, block_number));
		Properties::<Test>::insert(PropertyType::Reputation, account, EntityProperty::new(0, block_number));
		Properties::<Test>::insert(PropertyType::Trust, account, EntityProperty::new(0, block_number));

		assert_ok!(Sense::update_property(RawOrigin::Root.into(), account, PropertyType::Experience, 125));
		assert_ok!(Sense::update_property(RawOrigin::Root.into(), account, PropertyType::Reputation, 234));
		assert_ok!(Sense::update_property(RawOrigin::Root.into(), account, PropertyType::Trust, 250));
		assert_eq!(Sense::get_property(PropertyType::Experience, account).unwrap(), EntityProperty::new(125, block_number));
		assert_eq!(Sense::get_property(PropertyType::Reputation, account).unwrap(), EntityProperty::new(234, block_number));
		assert_eq!(Sense::get_property(PropertyType::Trust, account).unwrap(), EntityProperty::new(250, block_number));

		System::assert_has_event(Event::Sense(SenseEvent::PropertyUpdated { property_type: PropertyType::Experience, account_id: account, block_number }));
		System::assert_has_event(Event::Sense(SenseEvent::PropertyUpdated { property_type: PropertyType::Reputation, account_id: account, block_number }));
		System::assert_has_event(Event::Sense(SenseEvent::PropertyUpdated { property_type: PropertyType::Trust, account_id: account, block_number }));
	});
}