#![cfg(test)]

use frame_support::{assert_noop, assert_ok};
use sp_runtime::traits::BadOrigin;
use sp_core::H256;
use super::*;
use mock::*;


fn create_org() -> H256 {
	let nonce: u128 = Nonce::<Test>::get();
	assert_ok!(
		Control::create_org(Origin::signed(ALICE), BOB, vec![1, 2], vec![2, 3],
		Default::default(), Default::default(), Default::default(),
		1 * DOLLARS, PROTOCOL_TOKEN_ID, PAYMENT_TOKEN_ID, 10, None
	));
	OrgByNonce::<Test>::get(nonce).unwrap()
}


#[test]
fn control_create_org() {
	new_test_ext().execute_with(|| {
		let current_block = 3;
		System::set_block_number(current_block);
		let org_id = create_org();
		System::assert_has_event(
			mock::Event::Control(
				crate::Event::OrgCreated {
					sender_id: ALICE,
					org_id,
					treasury_id: OrgTreasury::<Test>::get(org_id),
					created_at: current_block,
					realm_index: 0
				}
			)
		);
		// Check if creator (sender) has enough protocol token free balance 
		// to make a deposit into org's treasury
		// Error: BalanceTooLow
		assert_noop!(
			Control::create_org(Origin::signed(BOB), BOB, vec![1, 2], vec![2, 3],
			Default::default(), Default::default(), Default::default(),
			1 * DOLLARS, PROTOCOL_TOKEN_ID, PAYMENT_TOKEN_ID, 10, None),
			
			Error::<Test>::BalanceTooLow
		);
		// Check if creator (sender) has enough protocol token free balance 
		// to make a deposit into org's treasury (custom deposit value)
		// Error: BalanceTooLow
		let deposit = 101 * DOLLARS;
		assert_noop!(
			Control::create_org(Origin::signed(BOB), BOB, vec![1, 2], vec![2, 3],
			Default::default(), Default::default(), Default::default(),
			1 * DOLLARS, PROTOCOL_TOKEN_ID, PAYMENT_TOKEN_ID, 10, Some(deposit)),
			
			Error::<Test>::BalanceTooLow
		);
	})
}

#[test]
fn control_enable_deisable_org() {
	new_test_ext().execute_with(|| {
		let current_block = 3;
		System::set_block_number(current_block);
		let org_id = create_org();
		// Disable org
		assert_noop!(Control::disable_org(Origin::signed(BOB), org_id), BadOrigin);
		assert_ok!(Control::disable_org(Origin::root(), org_id));
		assert_eq!(OrgState::<Test>::get(org_id), ControlState::Inactive);
		System::assert_has_event(
			mock::Event::Control(crate::Event::OrgDisabled(org_id))
		);
		// Enable org
		assert_noop!(Control::enable_org(Origin::signed(BOB), org_id), BadOrigin);
		assert_ok!(Control::enable_org(Origin::root(), org_id));
		assert_eq!(OrgState::<Test>::get(org_id), ControlState::Active);
		System::assert_has_event(
			mock::Event::Control(crate::Event::OrgEnabled(org_id))
		);

	})
}

#[test]
fn control_add_remove_member() {
	new_test_ext().execute_with(|| {
		let current_block = 3;
		System::set_block_number(current_block);
		let org_id = create_org();
		// Add member
		assert_ok!(Control::add_member(Origin::signed(BOB), org_id, CHARLIE));
		assert!(OrgMembers::<Test>::get(org_id).contains(&CHARLIE));
		System::assert_has_event(
			mock::Event::Control(crate::Event::AddMember{
				org_id, account_id: CHARLIE, added_at: current_block
			})
		);
		// Remove member
		assert_ok!(Control::remove_member(Origin::signed(BOB), org_id, CHARLIE));
		assert!(!OrgMembers::<Test>::get(org_id).contains(&CHARLIE));
		System::assert_has_event(
			mock::Event::Control(crate::Event::RemoveMember{
				org_id, account_id: CHARLIE, removed_at: current_block
			})
		);
	})
}

#[test]
fn control_add_remove_member_errors() {
	new_test_ext().execute_with(|| {
		let current_block = 3;
		System::set_block_number(current_block);
		let org_id = create_org();
		
		// Add member

		// Check if org already exists
		// Error: OrganizationUnknown
		assert_noop!(
			Control::add_member(Origin::signed(BOB), H256::random(), CHARLIE),
			Error::<Test>::OrganizationUnknown
		);
		// Check if member already exists
		// Error: MemberExists
		assert_noop!(
			Control::add_member(Origin::signed(BOB), org_id, BOB),
			Error::<Test>::MemberExists
		);
		// Check if member limit does not reached
		// Error: MembershipLimitReached
		assert_ok!(Control::add_member(Origin::signed(BOB), org_id, CHARLIE));
		assert_noop!(
			Control::add_member(Origin::signed(BOB), org_id, DAVE),
			Error::<Test>::MembershipLimitReached
		);

		// Remove member

		// Check if org already exists
		// Error: OrganizationUnknown
		assert_noop!(
			Control::remove_member(Origin::signed(BOB), H256::random(), CHARLIE),
			Error::<Test>::OrganizationUnknown
		);
		// Check if member exists
		// Error: MemberUnknown
		assert_noop!(
			Control::remove_member(Origin::signed(BOB), org_id, DAVE),
			Error::<Test>::MemberUnknown
		);
	})
}