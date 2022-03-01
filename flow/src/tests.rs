#![cfg(test)]

use super::*;
use codec::{Decode, Encode};
use frame_support::{assert_noop, assert_ok};
use mock::{
	new_test_ext, Flow, FlowProtocol, FlowGovernance, Event, Origin, Test, System, GAME, ALICE, BOB, MAX_DURATION
};
use sp_core::H256;


#[test]
fn flow_create() {
    new_test_ext().execute_with(|| {
        let current_block = 3;
        System::set_block_number(current_block);

        // Check Errors

        // Check if creator is the controller of organization
        // Error: AuthorizationError
        let not_creator = ALICE;
        assert_noop!(
			Flow::create(
                Origin::signed(not_creator), H256::random(), not_creator, vec![1, 2], 0, 0, 0, 
                FlowProtocol::Raise, FlowGovernance::No, vec![], vec![], vec![]),
			Error::<Test>::AuthorizationError
		);
        // Check if organization's treasury has enough deposit
        // Error: TreasuryBalanceTooLow
        let deposit_more_than_treasury = 1000;
        assert_noop!(
			Flow::create(
                Origin::signed(BOB), H256::random(), BOB, vec![1, 2], 0, deposit_more_than_treasury, 0, 
                FlowProtocol::Raise, FlowGovernance::No, vec![], vec![], vec![]),
			Error::<Test>::TreasuryBalanceTooLow
		);
        // Check if deposit is not too high
        // Error: DepositTooHigh
        let target = 10;
        let deposit_more_than_target = 20;
        assert_noop!(
			Flow::create(
                Origin::signed(BOB), H256::random(), BOB, vec![1, 2], target, deposit_more_than_target, 0, 
                FlowProtocol::Raise, FlowGovernance::No, vec![], vec![], vec![]),
			Error::<Test>::DepositTooHigh
		);
        // Check Campaign name length
        // Error: NameTooShort
        let short_name = vec![1];
        assert_noop!(
			Flow::create(
                Origin::signed(BOB), H256::random(), BOB, short_name, 20, 10, 0, 
                FlowProtocol::Raise, FlowGovernance::No, vec![], vec![], vec![]),
			Error::<Test>::NameTooShort
		);
        // Error: NameTooLong
        let long_name = vec![1, 2, 3, 4, 5];
        assert_noop!(
			Flow::create(
                Origin::signed(BOB), H256::random(), BOB, long_name, 20, 10, 0, 
                FlowProtocol::Raise, FlowGovernance::No, vec![], vec![], vec![]),
			Error::<Test>::NameTooLong
		);
        // Ensure campaign expires after the current block
        // Error: EndTooEarly
        let expiration_block = current_block - 1;
        assert_noop!(
			Flow::create(
                Origin::signed(BOB), H256::random(), BOB, vec![1, 2], 20, 10, expiration_block, 
                FlowProtocol::Raise, FlowGovernance::No, vec![], vec![], vec![]),
			Error::<Test>::EndTooEarly
		);
        // Ensure campaign expires before expiration limit
        // Error: EndTooLate
        let expiration_block = MAX_DURATION + current_block + 1;
        assert_noop!(
			Flow::create(
                Origin::signed(BOB), H256::random(), BOB, vec![1, 2], 20, 10, expiration_block, 
                FlowProtocol::Raise, FlowGovernance::No, vec![], vec![], vec![]),
			Error::<Test>::EndTooLate
		);
        // Check contribution limit per block
        // Error: ContributionsPerBlockExceeded

        // Success

        assert_ok!(
			Flow::create(
                Origin::signed(BOB), H256::random(), BOB, vec![1, 2], 20, 10,  current_block + 1, 
                FlowProtocol::Raise, FlowGovernance::No, vec![1, 2], vec![], vec![])
		);

        let campaign_id: H256 = <Test as Config>::Randomness::random(b"crowdfunding_campaign").0;
        

        // Campaigns
        let campaign = Flow::campaign_by_id(campaign_id);
        // assert_eq!()

        // CampaignOrg
        // CampaignOwner
        // CampaignAdmin
        // CampaignsByBody
        // CampaignsByBlock
        // CampaignsCount
        // CampaignsArray
        // CampaignsIndex
        // CampaignsOwnedArray
        // CampaignsOwnedCount
        // CampaignsOwnedIndex
        // Nonce
        // CampaignsByState
        // CampaignState

        // Check if deposit was reserved from the Organization's treasury

        // Event::CampaignUpdated

    });
}
