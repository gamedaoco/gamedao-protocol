#![cfg(test)]

use super::*;
use codec::{Decode, Encode};
use frame_support::{assert_noop, assert_ok};
use frame_system::{EventRecord, Phase};
use mock::{
	new_test_ext, Flow, FlowProtocol, FlowGovernance, Event, Origin, Test, System, GAME, ALICE, BOB, MAX_DURATION, GAME_CURRENCY_ID
};
use gamedao_protocol_support::{FlowState};
use sp_core::H256;


#[test]
fn flow_create_errors() {
	new_test_ext().execute_with(|| {
		let current_block = 3;
		System::set_block_number(current_block);
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

		// TODO: make it work again!!

		// CampaignsByBlock::<Test>::mutate(current_block + 1, |campaigns| {
		//     campaigns.push(H256::random())
		// });
		// assert_noop!(
		//     Flow::create(
		//         Origin::signed(BOB), H256::random(), BOB, vec![1, 2], 20, 10, current_block + 1, 
		//         FlowProtocol::Raise, FlowGovernance::No, vec![1, 2], vec![], vec![]),
		//     Error::<Test>::ContributionsPerBlockExceeded
		// );

	});
}

#[test]
fn flow_create_success() {
	new_test_ext().execute_with(|| {
		let current_block = 3;
		System::set_block_number(current_block);

		let nonce = Nonce::<Test>::get().encode();
		let id: H256 = <Test as Config>::Randomness::random(&nonce).0;
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
					event: Event::Tokens(orml_tokens::Event::Reserved(GAME_CURRENCY_ID, BOB, deposit)),
					topics: vec![],
				},
				EventRecord {
					phase: Phase::Initialization,
					event: Event::Flow(crate::Event::CampaignCreated(id, BOB, BOB, target, deposit, expiry, name)),
					topics: vec![],
				},
			]
		);

	});
}


#[test]
fn flow_update_state_errors() {
	new_test_ext().execute_with(|| {
		let current_block = 3;
		System::set_block_number(current_block);
		let nonce = Nonce::<Test>::get().encode();
		let campaign_id: H256 = <Test as Config>::Randomness::random(&nonce).0;
		let org:H256 = H256::random();

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
		let expiry = current_block - 1;
		let mut campaign = Campaign {
			id: campaign_id,
			org: H256::random(),
			name: vec![1, 2],
			owner: BOB,
			admin: BOB,
			deposit: 10,
			expiry: expiry,
			cap: 20,
			protocol: FlowProtocol::Raise,
			governance: FlowGovernance::No,
			cid: vec![1, 2],
			token_symbol: vec![1, 2],
			token_name: vec![1, 2],
			created: 1,
		};
		CampaignAdmin::<Test>::insert(&campaign_id, &BOB);
		Campaigns::<Test>::insert(&campaign_id, &campaign);
		assert_noop!(
			Flow::update_state(Origin::signed(BOB), campaign_id, FlowState::Active),
			Error::<Test>::CampaignExpired
		);
		// Ensure that campaign state is not Failed
		// Error: CampaignExpired
		campaign.expiry = current_block + 2;
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

		let nonce = Nonce::<Test>::get().encode();
		let campaign_id: H256 = <Test as Config>::Randomness::random(&nonce).0;

		let expiry = current_block - 1;
		let mut campaign = Campaign {
			id: campaign_id,
			org: H256::random(),
			name: vec![1, 2],
			owner: BOB,
			admin: BOB,
			deposit: 10,
			expiry: current_block + 1,
			cap: 20,
			protocol: FlowProtocol::Raise,
			governance: FlowGovernance::No,
			cid: vec![1, 2],
			token_symbol: vec![1, 2],
			token_name: vec![1, 2],
			created: 1,
		};
		Campaigns::<Test>::insert(&campaign_id, &campaign);
		CampaignOwner::<Test>::insert(campaign_id, BOB);
		CampaignAdmin::<Test>::insert(campaign_id, BOB);

		assert_ok!(Flow::update_state(Origin::signed(BOB), campaign_id, FlowState::Paused));

		assert_eq!(CampaignsByState::<Test>::get(FlowState::Paused), vec![campaign_id]);
		assert_eq!(CampaignState::<Test>::get(campaign_id), FlowState::Paused);
	});
}