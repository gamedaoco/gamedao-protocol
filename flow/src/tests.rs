#![cfg(test)]

use super::*;
use mock::{Event, *};
use frame_support::traits::Hooks;
use frame_support::{assert_noop, assert_ok};
use frame_system::RawOrigin;
use sp_core::H256;
use sp_runtime::traits::{Hash, AccountIdConversion};

use gamedao_control::{AccessModel, FeeModel, OrgType};

fn create_org_treasury() -> (H256, AccountId, Balance) {
	let nonce = Control::nonce();
	assert_ok!(Control::create_org(
		Origin::signed(BOB), BOB,
		BoundedVec::truncate_from(vec![1, 2]), BoundedVec::truncate_from(vec![1, 2]),
		OrgType::default(), AccessModel::default(), FeeModel::default(),
		0, 0, 0, 0, Some(1 * DOLLARS)
	));
	let treasury_id = <Test as gamedao_control::Config>::PalletId::get().into_sub_account_truncating(nonce as i32);
    let org_id = <Test as frame_system::Config>::Hashing::hash_of(&treasury_id);
	assert_eq!(treasury_id, Control::org_treasury_account(&org_id).unwrap());
	let tbalance = 30 * DOLLARS;
    let _ = Tokens::set_balance(RawOrigin::Root.into(), treasury_id, PROTOCOL_TOKEN_ID, tbalance, 0);

    (org_id, treasury_id, tbalance)
}

#[test]
fn flow_create_errors() {
	new_test_ext().execute_with(|| {
		let (org, _, _) = create_org_treasury();
		let current_block = 3;
		let empty_vec = BoundedVec::truncate_from(vec![]);
		let name = BoundedVec::truncate_from(vec![1, 2]);
		System::set_block_number(current_block);

		// Check if creator is the controller of organization
		// Error: AuthorizationError
		let not_creator = ALICE;
		assert_noop!(
			Flow::create_campaign(
				Origin::signed(not_creator), org, not_creator,
				name.clone(), 0, 0, 0,
				FlowProtocol::Raise, FlowGovernance::No,
				empty_vec.clone(),
				empty_vec.clone(),
				empty_vec.clone(),
			),
			Error::<Test>::AuthorizationError
		);
		// Check if organization's treasury has enough deposit
		// Error: TreasuryBalanceTooLow
		let deposit_more_than_treasury = 1000 * DOLLARS;
		assert_noop!(
			Flow::create_campaign(
				Origin::signed(BOB), org, BOB,
				name.clone(), 0, deposit_more_than_treasury, 0,
				FlowProtocol::Raise, FlowGovernance::No,
				empty_vec.clone(),
				empty_vec.clone(),
				empty_vec.clone(),
			),
			Error::<Test>::TreasuryBalanceTooLow
		);
		// Check if deposit is not too high
		// Error: DepositTooHigh
		let target = 10 * DOLLARS;
		let deposit_more_than_target = 20 * DOLLARS;
		assert_noop!(
			Flow::create_campaign(
				Origin::signed(BOB), org, BOB,
				name.clone(), target, deposit_more_than_target, 0,
				FlowProtocol::Raise, FlowGovernance::No,
				empty_vec.clone(),
				empty_vec.clone(),
				empty_vec.clone(),
			),
			Error::<Test>::DepositTooHigh
		);
		// Check Campaign name length
		// Error: NameTooShort
		let short_name = BoundedVec::truncate_from(vec![1]);
		assert_noop!(
			Flow::create_campaign(
				Origin::signed(BOB), org, BOB, short_name, 20 * DOLLARS, 10 * DOLLARS, 0,
				FlowProtocol::Raise, FlowGovernance::No,
				empty_vec.clone(),
				empty_vec.clone(),
				empty_vec.clone(),
			),
			Error::<Test>::NameTooShort
		);
		// Ensure campaign expires after the current block
		// Error: EndTooEarly
		let expiration_block = current_block - 1;
		assert_noop!(
			Flow::create_campaign(
				Origin::signed(BOB), org, BOB, name.clone(), 20 * DOLLARS, 10 * DOLLARS,
				expiration_block, FlowProtocol::Raise, FlowGovernance::No,
				empty_vec.clone(),
				empty_vec.clone(),
				empty_vec.clone(),
			),
			Error::<Test>::EndTooEarly
		);
		// Ensure campaign expires before expiration limit
		// Error: EndTooLate
		let expiration_block = MaxCampaignDuration::get() + current_block + 1;
		assert_noop!(
			Flow::create_campaign(
				Origin::signed(BOB), org, BOB, name.clone(),
				20 * DOLLARS, 10 * DOLLARS, expiration_block,
				FlowProtocol::Raise, FlowGovernance::No,
				empty_vec.clone(),
				empty_vec.clone(),
				empty_vec.clone(),
			),
			Error::<Test>::EndTooLate
		);
		// Check campaigns limit per block
		// Error: CampaignsPerBlockExceeded
		assert_ok!(CampaignsByBlock::<Test>::try_mutate(
			current_block + 1,
			|campaigns| -> Result<(), Error::<Test>> {
				campaigns.try_push(H256::random()).map_err(|_| Error::<Test>::TooManyCampaigns)?;
				Ok(())
			}
		));
		let block_campaigns_cnt = CampaignsByBlock::<Test>::get(current_block+1).len() as u32;
		println!("Current limit is {:?} and max is {:?}", block_campaigns_cnt, <Test as Config>::MaxCampaignsPerBlock::get());
		assert_noop!(
			Flow::create_campaign(
				Origin::signed(BOB), org, BOB, name.clone(), 20 * DOLLARS, 10 * DOLLARS,
				current_block + 1, FlowProtocol::Raise, FlowGovernance::No,
				empty_vec.clone(),
				empty_vec.clone(),
				empty_vec.clone(),
			),
			Error::<Test>::CampaignsPerBlockExceeded
		);
	});
}

#[test]
fn flow_create_success() {
	new_test_ext().execute_with(|| {
		let (org, _treasury, _) = create_org_treasury();
		let current_block = 3;
		System::set_block_number(current_block);

		let nonce = Nonce::<Test>::get();
		let id: H256 = <Test as frame_system::Config>::Hashing::hash_of(&nonce);
		let expiry = current_block + 1;
		let deposit = 10 * DOLLARS;
		let target = 20 * DOLLARS;
		let name = BoundedVec::truncate_from(vec![1, 2]);

		assert_ok!(Flow::create_campaign(
			Origin::signed(BOB), org, BOB, name.clone(), target, deposit, expiry,
			FlowProtocol::Raise, FlowGovernance::No,
			BoundedVec::truncate_from(vec![1, 2]),
			BoundedVec::truncate_from(vec![]),
			BoundedVec::truncate_from(vec![]),
		));

		assert_eq!(Campaigns::<Test>::get(id).unwrap().id, id);
		assert_eq!(CampaignOrg::<Test>::get(id), org);
		assert_eq!(CampaignOwner::<Test>::get(id), Some(BOB));
		assert_eq!(CampaignAdmin::<Test>::get(id), Some(BOB));
		assert_eq!(CampaignsByOrg::<Test>::get(org), vec![id]);
		assert_eq!(CampaignsByBlock::<Test>::get(expiry), vec![id]);
		assert_eq!(CampaignsCount::<Test>::get(), 1);
		assert_eq!(CampaignsArray::<Test>::get(0), id);
		assert_eq!(CampaignsIndex::<Test>::get(id), 0);
		assert_eq!(CampaignsOwnedArray::<Test>::get(org), id);
		assert_eq!(CampaignsOwnedCount::<Test>::get(org), 1);
		assert_eq!(CampaignsOwnedIndex::<Test>::get((org, id)), 0);
		assert_eq!(Nonce::<Test>::get(), 1);
		assert_eq!(CampaignsByState::<Test>::get(FlowState::Active, &org), vec![id]);
		assert_eq!(CampaignState::<Test>::get(id), FlowState::Active);

		System::assert_has_event(Event::Flow(crate::Event::CampaignCreated {
			campaign_id: id,
			creator: BOB,
			admin: BOB,
			target,
			deposit,
			expiry,
			name
		}));

	});
}

#[test]
fn flow_update_state_errors() {
	new_test_ext().execute_with(|| {
		let current_block = 3;
		System::set_block_number(current_block);
		let campaign_id: H256 = H256::random();

		// Check if campaign has an owner
		// Error: OwnerUnknown
		assert_noop!(
			Flow::update_state(Origin::signed(BOB), campaign_id, FlowState::Active),
			Error::<Test>::OwnerUnknown
		);
		// Check if caller is
		// Error: AdminUnknown
		CampaignOwner::<Test>::insert(campaign_id, BOB);
		assert_noop!(
			Flow::update_state(Origin::signed(BOB), campaign_id, FlowState::Active),
			Error::<Test>::AdminUnknown
		);
		// Check if caller is the controller of organization
		// Error: AuthorizationError
		CampaignAdmin::<Test>::insert(campaign_id, ALICE);
		assert_noop!(
			Flow::update_state(Origin::signed(BOB), campaign_id, FlowState::Active),
			Error::<Test>::AuthorizationError
		);
		// Check if campaign expires after the current block
		// Error: CampaignExpired
		let campaign = Campaign::new(campaign_id, current_block - 1);
		CampaignAdmin::<Test>::insert(&campaign_id, &BOB);
		Campaigns::<Test>::insert(&campaign_id, &campaign);
		assert_noop!(
			Flow::update_state(Origin::signed(BOB), campaign_id, FlowState::Active),
			Error::<Test>::CampaignExpired
		);
		// Ensure that campaign state is not Failed
		// Error: CampaignExpired
		let campaign = Campaign::new(campaign_id, current_block + 2);
		Campaigns::<Test>::insert(&campaign_id, &campaign);
		CampaignState::<Test>::insert(&campaign_id, FlowState::Failed);
		assert_noop!(
			Flow::update_state(Origin::signed(BOB), campaign_id, FlowState::Active),
			Error::<Test>::CampaignExpired
		);
	});
}

#[test]
fn flow_update_state_success() {
	new_test_ext().execute_with(|| {
		let current_block = 3;
		System::set_block_number(current_block);

		let campaign_id: H256 = H256::random();
		let campaign = Campaign::new(campaign_id, current_block + 1);

		Campaigns::<Test>::insert(&campaign_id, &campaign);
		CampaignOwner::<Test>::insert(campaign_id, BOB);
		CampaignAdmin::<Test>::insert(campaign_id, BOB);
		CampaignOrg::<Test>::insert(campaign_id, campaign.org);
		CampaignsByOrg::<Test>::insert(campaign.org, BoundedVec::truncate_from(vec![campaign_id]));

		assert_ok!(Flow::update_state(Origin::signed(BOB), campaign_id, FlowState::Paused));
		assert_eq!(CampaignsByState::<Test>::get(FlowState::Paused, &campaign.org), vec![campaign_id]);
		assert_eq!(CampaignState::<Test>::get(campaign_id), FlowState::Paused);
	});
}

#[test]
fn flow_contribute_errors() {
	new_test_ext().execute_with(|| {
		let current_block = 3;
		System::set_block_number(current_block);

		let campaign_id: H256 = H256::random();
		let campaign = Campaign::new(campaign_id, current_block + 2);
		Campaigns::<Test>::insert(&campaign_id, &campaign);

		// Check if contributor has enough balance
		// Error: BalanceTooLow
		let more_than_balance = 110 * DOLLARS;
		assert_noop!(
			Flow::contribute(Origin::signed(BOB), campaign_id, more_than_balance),
			Error::<Test>::BalanceTooLow
		);
		// Check if owner exists for the campaign
		// OwnerUnknown
		assert_noop!(
			Flow::contribute(Origin::signed(BOB), campaign_id, 50 * DOLLARS),
			Error::<Test>::OwnerUnknown
		);
		// Check that owner is not caller
		// NoContributionToOwnCampaign
		CampaignOwner::<Test>::insert(campaign_id, BOB);
		assert_noop!(
			Flow::contribute(Origin::signed(BOB), campaign_id, 50 * DOLLARS),
			Error::<Test>::NoContributionToOwnCampaign
		);
		// Check if campaign exists
		// InvalidId
		let new_campaign_id = H256::random();
		CampaignOwner::<Test>::insert(new_campaign_id, BOB);
		assert_noop!(
			Flow::contribute(Origin::signed(ALICE), new_campaign_id, 50 * DOLLARS),
			Error::<Test>::InvalidId
		);
		// Check if Campaign's state is Active
		// NoContributionsAllowed
		CampaignState::<Test>::insert(&campaign_id, FlowState::Paused);
		assert_noop!(
			Flow::contribute(Origin::signed(ALICE), campaign_id, 50 * DOLLARS),
			Error::<Test>::NoContributionsAllowed
		);
		// Check if campaign ends before the current block
		// CampaignExpired
		System::set_block_number(current_block + 2);
		CampaignState::<Test>::insert(&campaign_id, FlowState::Active);
		assert_noop!(
			Flow::contribute(Origin::signed(ALICE), campaign_id, 50 * DOLLARS),
			Error::<Test>::CampaignExpired
		);
	});
}

#[test]
fn flow_contribute_success() {
	new_test_ext().execute_with(|| {
		let current_block = 3;
		System::set_block_number(current_block);

		let campaign_id: H256 = H256::random();
		let campaign = Campaign::new(campaign_id, current_block + 2);
		let contribution = 30 * DOLLARS;
		Campaigns::<Test>::insert(&campaign_id, &campaign);
		CampaignOwner::<Test>::insert(campaign_id, BOB);
		CampaignState::<Test>::insert(&campaign_id, FlowState::Active);

		assert_ok!(Flow::contribute(Origin::signed(ALICE), campaign_id, contribution));

		assert_eq!(CampaignsContributedArray::<Test>::get((ALICE, 0)), campaign_id);
		assert_eq!(CampaignsContributedIndex::<Test>::get((ALICE, campaign_id)), 0);
		assert_eq!(CampaignsContributedCount::<Test>::get(ALICE), 1);
		assert_eq!(CampaignContributorsCount::<Test>::get(campaign_id), 1);
		assert_eq!(CampaignContribution::<Test>::get((campaign_id, ALICE)), contribution);
		assert_eq!(CampaignBalance::<Test>::get(campaign_id), contribution);

		System::assert_has_event(Event::Flow(crate::Event::CampaignContributed {
			campaign_id,
			sender: ALICE,
			contribution,
			block_number: current_block
		}));
	});
}

#[test]
fn flow_on_finalize_campaign_succeess() {
	new_test_ext().execute_with(|| {
		let (org, treasury, tbalance) = create_org_treasury();
		let current_block = 3;
		System::set_block_number(current_block);

		let expiry = current_block + 1;
		let deposit = 10 * DOLLARS;
		let contribution = 60 * DOLLARS;
		let target = 500 * DOLLARS;

		// Create Campaign
		let nonce = Nonce::<Test>::get();
		let campaign_id: H256 = <Test as frame_system::Config>::Hashing::hash_of(&nonce);
		assert_ok!(Flow::create_campaign(
			Origin::signed(BOB), org.clone(), BOB,
			BoundedVec::truncate_from(vec![1, 2]),
			target, deposit, expiry,
			FlowProtocol::Raise, FlowGovernance::No,
			BoundedVec::truncate_from(vec![1, 2]),
			BoundedVec::truncate_from(vec![]),
			BoundedVec::truncate_from(vec![]),
		));

		let total_contributors: u128 = 10;
		// Contribute (60/500)
		assert_ok!(Flow::contribute(Origin::signed(ACC_1), campaign_id, contribution));
		assert_ok!(Flow::contribute(Origin::signed(ACC_2), campaign_id, contribution));
		assert_ok!(Flow::contribute(Origin::signed(ACC_3), campaign_id, contribution));
		assert_ok!(Flow::contribute(Origin::signed(ACC_4), campaign_id, contribution));
		assert_ok!(Flow::contribute(Origin::signed(ACC_5), campaign_id, contribution));
		assert_ok!(Flow::contribute(Origin::signed(ACC_6), campaign_id, contribution));
		assert_ok!(Flow::contribute(Origin::signed(ACC_7), campaign_id, contribution));
		assert_ok!(Flow::contribute(Origin::signed(ACC_8), campaign_id, contribution));
		assert_ok!(Flow::contribute(Origin::signed(ACC_9), campaign_id, contribution));
		// Contribute (600/500)
		assert_ok!(Flow::contribute(Origin::signed(ACC_10), campaign_id, contribution));

		// --------- Block 0 (expiry): Schedule settlements ---------
		System::set_block_number(expiry);
		Flow::on_finalize(expiry);

		System::assert_has_event(Event::Flow(crate::Event::CampaignFinalising {
			campaign_id,
			campaign_balance: CampaignBalance::<Test>::get(campaign_id),
			block_number: expiry,
		}));

		// Ensure that campaign was scheduled to be finalized
		assert_eq!(CampaignsByState::<Test>::get(&FlowState::Finalizing, &org), vec![campaign_id]);
		// Ensure that campaign will be finalize in 3 blocks: 4 + 4 + 2
		let batch_size: u128 = 4;
		assert_eq!(MaxContributorsProcessing::get(), batch_size as u32);

		// --------- Block 1: process first 4 contributors ---------
		System::set_block_number(expiry + 1);
		Flow::on_initialize(expiry + 1);

		assert_eq!(ContributorsFinalized::<Test>::get(campaign_id), batch_size as u32);
		assert_eq!(
			<Test as Config>::Currency::total_balance(PAYMENT_TOKEN_ID, &treasury),
			batch_size * contribution
		);
		assert_eq!(
			<Test as Config>::Currency::free_balance(PAYMENT_TOKEN_ID, &treasury),
			0
		);

		// --------- Block 2: process next 4 contributors ---------
		System::set_block_number(expiry + 2);
		Flow::on_initialize(expiry + 2);

		assert_eq!(ContributorsFinalized::<Test>::get(campaign_id), batch_size as u32 * 2);
		assert_eq!(
			<Test as Config>::Currency::total_balance(PAYMENT_TOKEN_ID, &treasury),
			2 * batch_size * contribution
		);
		assert_eq!(
			<Test as Config>::Currency::free_balance(PAYMENT_TOKEN_ID, &treasury),
			0
		);

		// --------- Block 3: process last 2 contributors and finalize Campaign ---------
		System::set_block_number(expiry + 3);
		Flow::on_initialize(expiry + 3);

		assert_eq!(ContributorsFinalized::<Test>::get(campaign_id), total_contributors as u32);
		let commission = <Test as Config>::CampaignFee::get().mul_floor(contribution * 10);
		// The balance was transfered and locked in the org treasury
		assert_eq!(
			<Test as Config>::Currency::total_balance(PAYMENT_TOKEN_ID, &treasury),
			total_contributors * contribution - commission
		);
		assert_eq!(
			<Test as Config>::Currency::free_balance(PAYMENT_TOKEN_ID, &treasury),
			0
		);
		// Initial deposit is still locked
		assert_eq!(
			<Test as Config>::Currency::total_balance(PROTOCOL_TOKEN_ID, &treasury),
			tbalance
		);
		assert_eq!(
			<Test as Config>::Currency::free_balance(PROTOCOL_TOKEN_ID, &treasury),
			tbalance - deposit
		);
		// Ensure that campaign succeeded
		assert_eq!(CampaignsByState::<Test>::get(&FlowState::Success, &org), vec![campaign_id]);
		System::assert_has_event(Event::Flow(crate::Event::CampaignFinalized {
			campaign_id,
			campaign_balance: CampaignBalance::<Test>::get(campaign_id),
			block_number: expiry + 3,
			success: true,
		}));

	});
}

#[test]
fn flow_on_finalize_campaign_failed() {
	new_test_ext().execute_with(|| {
		let (org, treasury, tbalance) = create_org_treasury();
		let current_block = 3;
		System::set_block_number(current_block);

		let expiry = current_block + 1;
		let deposit = 10 * DOLLARS;
		let contribution = 60 * DOLLARS;
		let target = 1000 * DOLLARS;
		let init_acc_balance = 100 * DOLLARS;

		// Create Campaign
		let nonce = Nonce::<Test>::get();
		let campaign_id: H256 = <Test as frame_system::Config>::Hashing::hash_of(&nonce);
		assert_ok!(Flow::create_campaign(
			Origin::signed(BOB), org.clone(), BOB,
			BoundedVec::truncate_from(vec![1, 2]),
			target, deposit, expiry,
			FlowProtocol::Raise, FlowGovernance::No,
			BoundedVec::truncate_from(vec![1, 2]),
			BoundedVec::truncate_from(vec![]),
			BoundedVec::truncate_from(vec![]),
		));

		let total_contributors: u128 = 10;
		// Contribute (60/1000)
		assert_ok!(Flow::contribute(Origin::signed(ACC_1), campaign_id, contribution));
		assert_ok!(Flow::contribute(Origin::signed(ACC_2), campaign_id, contribution));
		assert_ok!(Flow::contribute(Origin::signed(ACC_3), campaign_id, contribution));
		assert_ok!(Flow::contribute(Origin::signed(ACC_4), campaign_id, contribution));
		assert_ok!(Flow::contribute(Origin::signed(ACC_5), campaign_id, contribution));
		assert_ok!(Flow::contribute(Origin::signed(ACC_6), campaign_id, contribution));
		assert_ok!(Flow::contribute(Origin::signed(ACC_7), campaign_id, contribution));
		assert_ok!(Flow::contribute(Origin::signed(ACC_8), campaign_id, contribution));
		assert_ok!(Flow::contribute(Origin::signed(ACC_9), campaign_id, contribution));
		// Contribute (600/1000)
		assert_ok!(Flow::contribute(Origin::signed(ACC_10), campaign_id, contribution));

		// --------- Block 0 (expiry): Schedule settlements ---------
		System::set_block_number(expiry);
		Flow::on_finalize(expiry);

		System::assert_has_event(Event::Flow(crate::Event::CampaignReverting {
			campaign_id,
			campaign_balance: CampaignBalance::<Test>::get(campaign_id),
			block_number: expiry,
		}));

		// Ensure that campaign was scheduled to be reverted
		assert_eq!(CampaignsByState::<Test>::get(&FlowState::Reverting, &org), vec![campaign_id]);
		// Ensure that campaign will be reverted in 3 blocks: 4 + 4 + 2
		let batch_size: u128 = 4;
		assert_eq!(MaxContributorsProcessing::get(), batch_size as u32);

		// --------- Block 1: process first 4 contributors ---------
		System::set_block_number(expiry + 1);
		Flow::on_initialize(expiry + 1);

		assert_eq!(ContributorsReverted::<Test>::get(campaign_id), batch_size as u32);

		// Account's balance from the first batch was unlocked
		assert_eq!(
			<Test as Config>::Currency::free_balance(PAYMENT_TOKEN_ID, &ACC_1),
			init_acc_balance
		);
		assert_eq!(
			<Test as Config>::Currency::free_balance(PAYMENT_TOKEN_ID, &ACC_5),
			init_acc_balance - contribution
		);

		// --------- Block 2: process next 4 contributors ---------
		System::set_block_number(expiry + 2);
		Flow::on_initialize(expiry + 2);

		assert_eq!(ContributorsReverted::<Test>::get(campaign_id), batch_size as u32 * 2);

		// Account's balance from the second batch was unlocked
		assert_eq!(
			<Test as Config>::Currency::free_balance(PAYMENT_TOKEN_ID, &ACC_5),
			init_acc_balance
		);
		assert_eq!(
			<Test as Config>::Currency::free_balance(PAYMENT_TOKEN_ID, &ACC_10),
			init_acc_balance - contribution
		);

		// --------- Block 3: process last 2 contributors and set Campaign's status to FAILED ---------
		System::set_block_number(expiry + 3);
		Flow::on_initialize(expiry + 3);

		assert_eq!(ContributorsReverted::<Test>::get(campaign_id), total_contributors as u32);
		assert_eq!(
			<Test as Config>::Currency::free_balance(PAYMENT_TOKEN_ID, &ACC_10),
			init_acc_balance
		);
		// Nothing transferred into the org treasury
		assert_eq!(<Test as Config>::Currency::free_balance(PAYMENT_TOKEN_ID, &treasury), 0);
		assert_eq!(<Test as Config>::Currency::total_balance(PAYMENT_TOKEN_ID, &treasury), 0);
		// Initial deposit was unlocked
		assert_eq!(
			<Test as Config>::Currency::free_balance(PROTOCOL_TOKEN_ID, &treasury),
			tbalance
		);
		assert_eq!(
			<Test as Config>::Currency::total_balance(PROTOCOL_TOKEN_ID, &treasury),
			tbalance
		);
		// Ensure that campaign failed
		assert_eq!(CampaignsByState::<Test>::get(&FlowState::Failed, &org), vec![campaign_id]);

		System::assert_has_event(Event::Flow(crate::Event::CampaignFailed {
			campaign_id,
			campaign_balance: CampaignBalance::<Test>::get(campaign_id),
			block_number: expiry + 3,
			success: false,
		}));

	});
}
