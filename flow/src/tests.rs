#![cfg(test)]

use super::*;
use codec::{Decode, Encode};
use frame_support::{assert_noop, assert_ok};
use frame_system::{EventRecord, Phase};
use gamedao_protocol_support::FlowState;
use mock::{
    new_test_ext, Event, Flow, FlowGovernance, FlowProtocol, Origin, System, Test, ALICE, BOB,
    GAME, MAX_DURATION,
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
        let id: H256 = <Test as Config>::Randomness::random(b"crowdfunding_campaign").0;
        let org = H256::random();
        let expiry = current_block + 1;
        let deposit = 10;
        let target = 20;
        let name = vec![1, 2];

        assert_ok!(
			Flow::create(
                Origin::signed(BOB), org, BOB, name.clone(), target, deposit,  expiry, 
                FlowProtocol::Raise, FlowGovernance::No, vec![1, 2], vec![], vec![])
		);
        
        assert_eq!(Campaigns::<Test>::get(id).id, id);
        assert_eq!(CampaignOrg::<Test>::get(id), org);
        assert_eq!(CampaignOwner::<Test>::get(id), Some(BOB));
        assert_eq!(CampaignAdmin::<Test>::get(id), Some(BOB));
        assert_eq!(CampaignsByBody::<Test>::get(org), vec![id]);
        assert_eq!(CampaignsByBlock::<Test>::get(expiry), vec![id]);
        assert_eq!(CampaignsCount::<Test>::get(), 1);
        assert_eq!(CampaignsArray::<Test>::get(0), id);
        assert_eq!(CampaignsIndex::<Test>::get(id), 0);
        assert_eq!(CampaignsOwnedArray::<Test>::get(org), id);
        assert_eq!(CampaignsOwnedCount::<Test>::get(org), 1);
        assert_eq!(CampaignsOwnedIndex::<Test>::get((org, id)), 0);
        assert_eq!(Nonce::<Test>::get(), 1);
        assert_eq!(CampaignsByState::<Test>::get(FlowState::Active), vec![id]);
        assert_eq!(CampaignState::<Test>::get(id), FlowState::Active);

        // Events
        assert_eq!(
            System::events(),
            vec![
                EventRecord {
                    phase: Phase::Initialization,
                    event: Event::Tokens(orml_tokens::Event::Reserved(2, BOB, deposit)),
                    topics: vec![],
                },
                EventRecord {
                    phase: Phase::Initialization,
                    event: Event::Flow(crate::Event::CampaignCreated(
                        id, BOB, BOB, target, deposit, expiry, name
                    )),
                    topics: vec![],
                },
            ]
        );
    });
}
