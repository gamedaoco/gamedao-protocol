#![cfg(test)]

use frame_support::{assert_noop, assert_ok};
use sp_runtime::traits::BadOrigin;
use sp_core::H256;
use super::*;
use mock::{new_test_ext, System, Test, RuntimeEvent as Event, Control, RuntimeOrigin as Origin, Tokens, CurrencyId, Balance, AccountId,
	ALICE, BOB, CHARLIE, PAYMENT_TOKEN_ID, PROTOCOL_TOKEN_ID, DOLLARS};


fn create_org(access_model: AccessModel) -> H256 {
	let bounded_str = BoundedVec::truncate_from(vec![1,2]);
	let index = OrgCount::<Test>::get();
	let now = frame_system::Pallet::<Test>::block_number();
	let org = types::Org {
		index, creator: ALICE, prime: ALICE, name: bounded_str.clone(), cid: bounded_str.clone(),
		org_type: OrgType::Individual, fee_model: FeeModel::NoFees, membership_fee: Some(1 * DOLLARS),
		gov_currency: PROTOCOL_TOKEN_ID, pay_currency: PAYMENT_TOKEN_ID, access_model,
		member_limit: <Test as Config>::MaxMembers::get(), created: now.clone(), mutated: now
	};
	let org_id = <Test as frame_system::Config>::Hashing::hash_of(&org);

	assert_ok!(
		Control::create_org(
			Origin::signed(ALICE), org.name, org.cid, org.org_type, org.access_model,
			org.fee_model, None, org.membership_fee, None, None, None
	));
	org_id
}


#[test]
fn control_create_org() {
	new_test_ext().execute_with(|| {
		let current_block = 3;
		System::set_block_number(current_block);
		let bounded_str = BoundedVec::truncate_from(vec![1,2]);

		// Create org with org type Company
		// Error: WrongOrganizationType
		assert_noop!(Control::create_org(
			Origin::signed(ALICE), bounded_str.clone(), bounded_str.clone(), OrgType::Company,
			AccessModel::Prime, FeeModel::NoFees, None, None, None, None, None),
			Error::<Test>::WrongOrganizationType);

		// Create org with org type Hybrid
		// Error: WrongOrganizationType
		assert_noop!(Control::create_org(
			Origin::signed(ALICE), bounded_str.clone(), bounded_str.clone(), OrgType::Hybrid,
			AccessModel::Prime, FeeModel::NoFees, None, None, None, None, None),
			Error::<Test>::WrongOrganizationType);

		// Deposit into Org treasury less than MinDeposit
		// Error: MinimumDepositTooLow
		assert_noop!(Control::create_org(
			Origin::signed(ALICE), bounded_str.clone(), bounded_str.clone(), OrgType::Individual,
			AccessModel::Prime, FeeModel::NoFees, None, None, None, None, Some(1 * DOLLARS)),
			Error::<Test>::MinimumDepositTooLow);

		// No membership_fee set for FeeModel::Transfer
		// Error: MissingParameter
		assert_noop!(Control::create_org(
			Origin::signed(ALICE), bounded_str.clone(), bounded_str.clone(), OrgType::Individual,
			AccessModel::Prime, FeeModel::Transfer, None, None, None, None, None),
			Error::<Test>::MissingParameter);

		// Check if creator (sender) has enough protocol token free balance
		// to make a deposit into org's treasury
		// Error: BalanceLow
		assert_noop!(Control::create_org(
			Origin::signed(ALICE), bounded_str.clone(), bounded_str.clone(), OrgType::Individual,
			AccessModel::Prime, FeeModel::NoFees, None, None, None, None, Some(1000 * DOLLARS)),
			Error::<Test>::BalanceLow);

		// Create org Success, check event
		let org_id = create_org(AccessModel::Prime);
		System::assert_has_event(
			Event::Control(
				crate::Event::OrgCreated {
					org_id,
					creator: ALICE,
					treasury_id: OrgTreasury::<Test>::get(org_id).unwrap(),
					created_at: current_block,
					realm_index: 0
				}
			)
		);

	})
}

#[test]
fn control_update_org() {
	new_test_ext().execute_with(|| {
		let current_block = 3;
		System::set_block_number(current_block);
		let org_id = create_org(AccessModel::Prime);

		// Check if no changes were provided
		// Error: NoChangesProvided
		assert_noop!(Control::update_org(
			Origin::signed(ALICE), org_id, None, None, None, None, None, None),
			Error::<Test>::NoChangesProvided);

		// FeeModel::Transfer and no membership_fee provided
		// Error: NoChangesProvided
		assert_noop!(Control::update_org(
			Origin::signed(ALICE), org_id, None, None, None, None, Some(FeeModel::Transfer), None),
			Error::<Test>::MissingParameter);

		// Check if prime can be not a member
		// Error: NotMember
		assert_noop!(Control::update_org(
			Origin::signed(ALICE), org_id, Some(BOB), None, None, None, None, None),
			Error::<Test>::NotMember);

		assert_ok!(Control::add_member(Origin::signed(ALICE), org_id, BOB));

		// Check if only prime can perform update_org
		// Error: BadOrigin
		assert_noop!(Control::update_org(
			Origin::signed(BOB), org_id, None, Some(OrgType::Dao), None, None, None, None),
			BadOrigin);

		// Check if root can update
		assert_ok!(Control::update_org(Origin::root(), org_id, None, None, None, None, None, Some(199 * DOLLARS)));

		// Check if update_org works as expected
		let prime_id = Some(BOB);
		let org_type = Some(OrgType::Dao);
		let access_model = Some(AccessModel::Voting);
		let member_limit = Some(100 as MemberLimit);
		let fee_model = Some(FeeModel::NoFees);
		let membership_fee = Some(99 * DOLLARS);

		assert_ok!(Control::update_org(
			Origin::signed(ALICE), org_id, prime_id, org_type.clone(), access_model.clone(), member_limit,
			fee_model.clone(), membership_fee));

		let org = Orgs::<Test>::get(org_id).unwrap();
		assert_eq!(org.prime, prime_id.clone().unwrap());
		assert_eq!(org.org_type, org_type.clone().unwrap());
		assert_eq!(org.access_model, access_model.clone().unwrap());
		assert_eq!(org.member_limit, member_limit.unwrap());
		assert_eq!(org.fee_model, fee_model.clone().unwrap());
		assert_eq!(org.membership_fee, membership_fee);
		System::assert_has_event(
			Event::Control(
				crate::Event::OrgUpdated {
					org_id, prime_id, org_type, access_model, member_limit,
					fee_model, membership_fee, block_number: current_block
				}
			)
		);

	})
}

#[test]
fn control_enable_deisable_org() {
	new_test_ext().execute_with(|| {
		let current_block = 3;
		System::set_block_number(current_block);
		let org_id = create_org(AccessModel::Prime);
		// Disable org root
		assert_noop!(Control::disable_org(Origin::signed(BOB), org_id), BadOrigin);
		assert_ok!(Control::disable_org(Origin::root(), org_id));
		assert_eq!(OrgStates::<Test>::get(org_id), OrgState::Inactive);
		System::assert_has_event(Event::Control(crate::Event::OrgDisabled(org_id)));
		// Enable org root
		assert_noop!(Control::enable_org(Origin::signed(BOB), org_id), BadOrigin);
		assert_ok!(Control::enable_org(Origin::root(), org_id));
		assert_eq!(OrgStates::<Test>::get(org_id), OrgState::Active);
		System::assert_has_event(Event::Control(crate::Event::OrgEnabled(org_id)));
		// Disable org prime
		assert_ok!(Control::disable_org(Origin::signed(ALICE), org_id));
		assert_eq!(OrgStates::<Test>::get(org_id), OrgState::Inactive);
		// Enable org prime
		assert_ok!(Control::enable_org(Origin::signed(ALICE), org_id));
		assert_eq!(OrgStates::<Test>::get(org_id), OrgState::Active);
	})
}

#[test]
fn control_add_remove_member_access_prime() {
	new_test_ext().execute_with(|| {
		let current_block = 3;
		System::set_block_number(current_block);
		let org_id = create_org(AccessModel::Prime);
		// Add member prime
		assert_noop!(Control::add_member(Origin::signed(BOB), org_id, CHARLIE), BadOrigin);
		assert_ok!(Control::add_member(Origin::signed(ALICE), org_id, CHARLIE));
		assert!(Members::<Test>::get(org_id).contains(&CHARLIE));
		assert_noop!(Control::add_member(Origin::signed(ALICE), org_id, CHARLIE), Error::<Test>::AlreadyMember);
		System::assert_has_event(
			Event::Control(crate::Event::MemberAdded{
				org_id, who: CHARLIE, block_number: current_block
			})
		);
		// Remove member prime
		assert_noop!(Control::remove_member(Origin::signed(BOB), org_id, CHARLIE), BadOrigin);
		assert_ok!(Control::remove_member(Origin::signed(ALICE), org_id, CHARLIE));
		assert!(!Members::<Test>::get(org_id).contains(&CHARLIE));
		assert_noop!(Control::remove_member(Origin::signed(ALICE), org_id, CHARLIE), Error::<Test>::NotMember);
		System::assert_has_event(
			Event::Control(crate::Event::MemberRemoved{
				org_id, who: CHARLIE, block_number: current_block
			})
		);

		// Add member root
		assert_ok!(Control::add_member(Origin::root(), org_id, CHARLIE));
		assert!(Members::<Test>::get(org_id).contains(&CHARLIE));
		// Remove member root
		assert_ok!(Control::remove_member(Origin::root(), org_id, CHARLIE));
		assert!(!Members::<Test>::get(org_id).contains(&CHARLIE));

		// Add member signed
		assert_ok!(Control::add_member(Origin::signed(CHARLIE), org_id, CHARLIE));
		assert!(Members::<Test>::get(org_id).contains(&CHARLIE));
		assert_eq!(MemberStates::<Test>::get(org_id, CHARLIE), MemberState::Pending);

		// TODO: since membership_fee logic is unclear for the moment, there is no tests for it yet
	})
}

#[test]
fn control_add_remove_member_access_open() {
	new_test_ext().execute_with(|| {
		let current_block = 3;
		System::set_block_number(current_block);
		let org_id = create_org(AccessModel::Open);
		// Add member
		assert_noop!(Control::add_member(Origin::signed(BOB), org_id, CHARLIE), BadOrigin);
		assert_ok!(Control::add_member(Origin::signed(BOB), org_id, BOB));
		assert!(Members::<Test>::get(org_id).contains(&BOB));
		assert_noop!(Control::add_member(Origin::signed(BOB), org_id, BOB), Error::<Test>::AlreadyMember);
		// Remove member prime
		assert_noop!(Control::remove_member(Origin::signed(BOB), org_id, CHARLIE), BadOrigin);
		assert_ok!(Control::remove_member(Origin::signed(BOB), org_id, BOB));
		assert!(!Members::<Test>::get(org_id).contains(&BOB));
		assert_noop!(Control::remove_member(Origin::signed(BOB), org_id, BOB), Error::<Test>::NotMember);

		// Add member root
		assert_ok!(Control::add_member(Origin::root(), org_id, BOB));
		assert!(Members::<Test>::get(org_id).contains(&BOB));
		// Remove member root
		assert_ok!(Control::remove_member(Origin::root(), org_id, BOB));
		assert!(!Members::<Test>::get(org_id).contains(&BOB));
	})
}

#[test]
fn control_add_remove_member_access_voting() {
	new_test_ext().execute_with(|| {
		let current_block = 3;
		System::set_block_number(current_block);
		let org_id = create_org(AccessModel::Voting);
		// Add member prime / not member
		assert_noop!(Control::add_member(Origin::signed(ALICE), org_id, CHARLIE), BadOrigin);
		assert_noop!(Control::add_member(Origin::signed(BOB), org_id, CHARLIE), BadOrigin);
		// TODO: Not implemented yet

		// Remove member prime
		// TODO: Not implemented yet

		// Add member root
		assert_ok!(Control::add_member(Origin::root(), org_id, CHARLIE));
		assert!(Members::<Test>::get(org_id).contains(&CHARLIE));
		// Remove member root
		assert_ok!(Control::remove_member(Origin::root(), org_id, CHARLIE));
		assert!(!Members::<Test>::get(org_id).contains(&CHARLIE));
	})
}

fn set_balance(account_id: AccountId, currency_id: CurrencyId, balance: Balance) {
	let _ = Tokens::set_balance(RawOrigin::Root.into(), account_id, currency_id, balance, 0);
}

#[test]
fn control_spend_funds() {
	new_test_ext().execute_with(|| {
		let current_block = 3;
		System::set_block_number(current_block);
		let org_id = create_org(AccessModel::Prime);
		let treasury_id = OrgTreasury::<Test>::get(org_id).unwrap();
		set_balance(treasury_id.clone(), PROTOCOL_TOKEN_ID, 100 * DOLLARS);

		let beneficiary = BOB;
		let amount = 10 * DOLLARS;
		let currency_id = PROTOCOL_TOKEN_ID;
		assert_ok!(Control::spend_funds(Origin::signed(ALICE), org_id, currency_id, beneficiary, amount));
		assert_noop!(
			Control::spend_funds(Origin::signed(ALICE), org_id, PAYMENT_TOKEN_ID, beneficiary, amount),
			Error::<Test>::BalanceLow);
		assert_noop!(
			Control::spend_funds(Origin::signed(BOB), org_id, PAYMENT_TOKEN_ID, beneficiary, amount),
			BadOrigin);
		System::assert_has_event(
			Event::Control(crate::Event::FundsSpended{
				org_id, beneficiary, amount, currency_id, block_number: current_block
			})
		);
	})
}
