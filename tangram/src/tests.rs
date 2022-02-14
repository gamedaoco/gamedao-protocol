// Tests to be written here

// use crate::{Error, mock::*};
// use frame_support::{assert_ok, assert_noop};

// #[test]
// fn it_works_for_default_value() {
// 	new_test_ext().execute_with(|| {
// 		// Just a dummy test for the dummy function `do_something`
// 		// calling the `do_something` function with a value 42
// 		assert_ok!(TemplateModule::do_something(Origin::signed(1), 42));
// 		// asserting that the stored value is equal to what we stored
// 		assert_eq!(TemplateModule::something(), Some(42));
// 	});
// }

// TODO:

// 1 create a realm for an organisation, next index should be 1

// 2 create another realm for an organisation, should throw

// 3 create a class for a realm, next index should be 1

// 4 create an item in a class in a realm, totalminted should be 1

// 5 burn an item by hash, totalburned should be 1, total should be 0

// 6 bootstrap an org, realm index should be +1

// - total items per class 0 should be max members of org

// - each member should have 1 tangram

// 7 bootstrap an org, with same org hash should throw
