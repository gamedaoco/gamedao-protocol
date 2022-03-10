#![cfg(test)]

use super::*;
use mock::{Control, new_test_ext, Origin, Test, TREASURY_ACCOUNT, USER_ACCOUNT};

// use frame_support::{impl_outer_origin, assert_ok, assert_noop};
use frame_support::{assert_ok, assert_noop};

#[test]
fn control_create_campaign_success() {
	new_test_ext().execute_with(|| {

		// create a DAO with account #5.
		assert_ok!(
			Control::create(
				Origin::signed(USER_ACCOUNT),	// creator == account 5
				4,	// controller == account 4
				TREASURY_ACCOUNT,	// treasury == account 3
				vec![12,56],		// name
				vec![11,111],		// cid
				Default::default(),
				Default::default(),
				Default::default(),
				100,
				0,
				0,
				10
			)
		);

		// check that there are now 1 Control in storage
		assert_eq!(Control::nonce(), 1);

		// // check that account #5 is creator
		// let creator_hash = <OrgByHash<Test>>::get(0);
		// assert_eq!(Control::body_creator(creator_hash), 5);

		// // check that account #4 is controller
		// let controller_hash = <OrgByHash<Test>>::get(0);
		// assert_eq!(Control::body_controller(controller_hash), 4);

		// // check that account #3 is treasury
		// let treasury_hash = <OrgByHash<Test>>::get(0);
		// assert_eq!(Control::body_treasury(treasury_hash), 3);

		// //

		// // check that account #6 owns 1 Campaign
		// assert_eq!(Control::campaigns_owned_count(5), 1);

		// // check that some random account #3 does not own a Campaign
		// assert_eq!(Control::campaigns_owned_count(3), 0);

		// // check that this Campaign is specifically owned by account #6
		// let owner_hash = Control::campaign_by_id(0);
		// assert_eq!(Control::campaign_owner(owner_hash), Some(5));

		// // let other_hash = Control::campaigns_owned_index(5, 0);
		// // assert_eq!(hash, other_hash);

	})
}
