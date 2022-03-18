#![cfg(test)]

use super::*;
use codec::Encode;
use frame_support::{assert_noop, assert_ok};
use frame_support::traits::Hooks;
use frame_system::{EventRecord, Phase};
use mock::{Event, *};
use sp_core::H256;

use gamedao_control::{OrgType, AccessModel, FeeModel};


fn create_org() -> H256 {
	let nonce = Control::nonce().encode();
	assert_ok!(Control::create(
		Origin::signed(BOB), BOB, TREASURY, vec![1, 2], vec![1, 2], 
		OrgType::default(), AccessModel::default(), FeeModel::default(), 0, 0, 0, 0
	));
	<Test as gamedao_control::Config>::Randomness::random(&nonce).0
}

impl Campaign<Hash, AccountId, Balance, BlockNumber, Timestamp, FlowProtocol, FlowGovernance> {
	pub fn new(campaign_id: Hash, expiry: BlockNumber) -> Campaign<Hash, AccountId, Balance, BlockNumber, Timestamp, FlowProtocol, FlowGovernance> {
		Campaign {
			id: campaign_id,
			org: H256::random(),
			name: vec![1, 2],
			owner: BOB,
			admin: BOB,
			deposit: 10,
			expiry: expiry,
			cap: 110,
			protocol: FlowProtocol::Raise,
			governance: FlowGovernance::No,
			cid: vec![1, 2],
			token_symbol: vec![1, 2],
			token_name: vec![1, 2],
			created: PalletTimestamp::now(),
		}
	}
}


#[test]
fn flow_create_errors() {
	new_test_ext().execute_with(|| {
		let org = create_org();
		let current_block = 3;
		System::set_block_number(current_block);

		// Check if creator is the controller of organization
		// Error: AuthorizationError
		let not_creator = ALICE;
		assert_noop!(
			Flow::create(
				Origin::signed(not_creator), org, not_creator, vec![1, 2], 0, 0, 0, 
				FlowProtocol::Raise, FlowGovernance::No, vec![], vec![], vec![]),
			Error::<Test>::AuthorizationError
		);
		// Check if organization's treasury has enough deposit
		// Error: TreasuryBalanceTooLow
		let deposit_more_than_treasury = 1000;
		assert_noop!(
			Flow::create(
				Origin::signed(BOB), org, BOB, vec![1, 2], 0, deposit_more_than_treasury, 0, 
				FlowProtocol::Raise, FlowGovernance::No, vec![], vec![], vec![]),
			Error::<Test>::TreasuryBalanceTooLow
		);
		// Check if deposit is not too high
		// Error: DepositTooHigh
		let target = 10;
		let deposit_more_than_target = 20;
		assert_noop!(
			Flow::create(
				Origin::signed(BOB), org, BOB, vec![1, 2], target, deposit_more_than_target, 0, 
				FlowProtocol::Raise, FlowGovernance::No, vec![], vec![], vec![]),
			Error::<Test>::DepositTooHigh
		);
		// Check Campaign name length
		// Error: NameTooShort
		let short_name = vec![1];
		assert_noop!(
			Flow::create(
				Origin::signed(BOB), org, BOB, short_name, 20, 10, 0, 
				FlowProtocol::Raise, FlowGovernance::No, vec![], vec![], vec![]),
			Error::<Test>::NameTooShort
		);
		// Error: NameTooLong
		let long_name = vec![1, 2, 3, 4, 5];
		assert_noop!(
			Flow::create(
				Origin::signed(BOB), org, BOB, long_name, 20, 10, 0, 
				FlowProtocol::Raise, FlowGovernance::No, vec![], vec![], vec![]),
			Error::<Test>::NameTooLong
		);
		// Ensure campaign expires after the current block
		// Error: EndTooEarly
		let expiration_block = current_block - 1;
		assert_noop!(
			Flow::create(
				Origin::signed(BOB), org, BOB, vec![1, 2], 20, 10, expiration_block, 
				FlowProtocol::Raise, FlowGovernance::No, vec![], vec![], vec![]),
			Error::<Test>::EndTooEarly
		);
		// Ensure campaign expires before expiration limit
		// Error: EndTooLate
		let expiration_block = MaxCampaignDuration::get() + current_block + 1;
		assert_noop!(
			Flow::create(
				Origin::signed(BOB), org, BOB, vec![1, 2], 20, 10, expiration_block, 
				FlowProtocol::Raise, FlowGovernance::No, vec![], vec![], vec![]),
			Error::<Test>::EndTooLate
		);
		// Check contribution limit per block
		// Error: ContributionsPerBlockExceeded
		CampaignsByBlock::<Test>::mutate(current_block + 1, |campaigns| {
			campaigns.push(H256::random())
		});
		assert_noop!(
			Flow::create(
				Origin::signed(BOB), org, BOB, vec![1, 2], 20, 10, current_block + 1, 
				FlowProtocol::Raise, FlowGovernance::No, vec![1, 2], vec![], vec![]),
			Error::<Test>::ContributionsPerBlockExceeded
		);

	});
}

#[test]
fn flow_create_success() {
	new_test_ext().execute_with(|| {
		let org = create_org();
		let current_block = 3;
		System::set_block_number(current_block);

		let nonce = Nonce::<Test>::get().encode();
		let id: H256 = <Test as Config>::Randomness::random(&nonce).0;
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
		assert_eq!(CampaignsByOrg::<Test>::get(org), vec![id]);
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
					event: Event::Tokens(orml_tokens::Event::Reserved(GAME_CURRENCY_ID, TREASURY, deposit)),
					topics: vec![],
				},
				EventRecord {
					phase: Phase::Initialization,
					event: Event::Flow(crate::Event::CampaignCreated{
						campaign_id: id, creator: BOB, admin: BOB, target, deposit, expiry, name
					}),
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

		assert_ok!(Flow::update_state(Origin::signed(BOB), campaign_id, FlowState::Paused));
		assert_eq!(CampaignsByState::<Test>::get(FlowState::Paused), vec![campaign_id]);
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
		let more_than_balance = 110;
		assert_noop!(
			Flow::contribute(Origin::signed(BOB), campaign_id, more_than_balance),
			Error::<Test>::BalanceTooLow
		);
		// Check if owner exists for the campaign
		// OwnerUnknown
		assert_noop!(
			Flow::contribute(Origin::signed(BOB), campaign_id, 50),
			Error::<Test>::OwnerUnknown
		);
		// Check that owner is not caller
		// NoContributionToOwnCampaign
		CampaignOwner::<Test>::insert(campaign_id, BOB);
		assert_noop!(
			Flow::contribute(Origin::signed(BOB), campaign_id, 50),
			Error::<Test>::NoContributionToOwnCampaign
		);
		// Check if campaign exists
		// InvalidId
		let new_campaign_id = H256::random();
		CampaignOwner::<Test>::insert(new_campaign_id, BOB);
		assert_noop!(
			Flow::contribute(Origin::signed(ALICE), new_campaign_id, 50),
			Error::<Test>::InvalidId
		);
		// Check if Campaign's state is Active
		// NoContributionsAllowed
		CampaignState::<Test>::insert(&campaign_id, FlowState::Paused);
		assert_noop!(
			Flow::contribute(Origin::signed(ALICE), campaign_id, 50),
			Error::<Test>::NoContributionsAllowed
		);
		// Check if campaign ends before the current block
		// CampaignExpired
		System::set_block_number(current_block + 2);
		CampaignState::<Test>::insert(&campaign_id, FlowState::Active);
		assert_noop!(
			Flow::contribute(Origin::signed(ALICE), campaign_id, 50),
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
		let contribution = 30;
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

		// Events
		assert_eq!(
			System::events(),
				vec![
					EventRecord {
						phase: Phase::Initialization,
						event: Event::Tokens(orml_tokens::Event::Reserved(GAME_CURRENCY_ID, ALICE, contribution)),
						topics: vec![],
					},
					EventRecord {
						phase: Phase::Initialization,
						event: Event::Flow(crate::Event::CampaignContributed{
							campaign_id, sender: ALICE, contribution, block_number: current_block
						}),
						topics: vec![],
					},
				]
		);
	});
}

#[test]
fn flow_on_finalize_campaign_succeess() {
	new_test_ext().execute_with(|| {
		let org = create_org();
		let current_block = 3;
		System::set_block_number(current_block);

		let expiry = current_block + 1;
		let deposit = 60;
		let target = 100;
		
		// Create Campaign
		let nonce = Nonce::<Test>::get().encode();
		let campaign_id: H256 = <Test as Config>::Randomness::random(&nonce).0;
		assert_ok!(
			Flow::create(
				Origin::signed(BOB), org, BOB, vec![1, 2], target, deposit,  expiry, 
				FlowProtocol::Raise, FlowGovernance::No, vec![1, 2], vec![], vec![])
		);
		// Contribute (60/100)
		assert_ok!(Flow::contribute(Origin::signed(ALICE), campaign_id, deposit));
		// Contribute (120/100)
		assert_ok!(Flow::contribute(Origin::signed(BOGDANA), campaign_id, deposit));

		// deposit > capacity
		System::set_block_number(expiry);
		Flow::on_finalize(expiry);
		
		let commission = <Test as Config>::CampaignFee::get().mul_floor(deposit * 2);
		assert_eq!(
			<Test as Config>::Currency::total_balance(GAME_CURRENCY_ID, &TREASURY),
			100 + deposit * 2 - commission
		);
		assert_eq!(
			<Test as Config>::Currency::free_balance(GAME_CURRENCY_ID, &TREASURY),
			100 - deposit
		);

		assert_eq!(
			// Skip events from create and contribute extrinsics
			System::events()[6..],
				vec![
					EventRecord {
						phase: Phase::Initialization,
						event: Event::Tokens(orml_tokens::Event::Unreserved(GAME_CURRENCY_ID, ALICE, deposit)),
						topics: vec![],
					},
					EventRecord {
						phase: Phase::Initialization,
						event: Event::Currencies(orml_currencies::Event::Transferred(GAME_CURRENCY_ID, ALICE, TREASURY, deposit)),
						topics: vec![],
					},
					EventRecord {
						phase: Phase::Initialization,
						event: Event::Tokens(orml_tokens::Event::Unreserved(GAME_CURRENCY_ID, BOGDANA, deposit)),
						topics: vec![],
					},
					EventRecord {
						phase: Phase::Initialization,
						event: Event::Currencies(orml_currencies::Event::Transferred(GAME_CURRENCY_ID, BOGDANA, TREASURY, deposit)),
						topics: vec![],
					},
					EventRecord {
						phase: Phase::Initialization,
						event: Event::Tokens(orml_tokens::Event::Reserved(GAME_CURRENCY_ID, TREASURY, deposit * 2)),
						topics: vec![],
					},
					EventRecord {
						phase: Phase::Initialization,
						event: Event::Tokens(orml_tokens::Event::Unreserved(GAME_CURRENCY_ID, TREASURY, commission)),
						topics: vec![],
					},
					EventRecord {
						phase: Phase::Initialization,
						event: Event::Currencies(orml_currencies::Event::Transferred(GAME_CURRENCY_ID, TREASURY, GAMEDAO_TREASURY, commission)),
						topics: vec![],
					},
					EventRecord {
						phase: Phase::Initialization,
						event: Event::Flow(crate::Event::CampaignFinalized{
							campaign_id, campaign_balance: deposit * 2, block_number: expiry, success: true
						}),
						topics: vec![],
					},
				]
		);

	});
}

#[test]
fn flow_on_finalize_campaign_failed() {
	new_test_ext().execute_with(|| {
		let org = create_org();
		let current_block = 3;
		System::set_block_number(current_block);

		let expiry = current_block + 1;
		let deposit = 60;
		let target = 100;
		
		// Create Campaign
		let nonce = Nonce::<Test>::get().encode();
		let campaign_id: H256 = <Test as Config>::Randomness::random(&nonce).0;
		assert_ok!(
			Flow::create(
				Origin::signed(BOB), org, BOB, vec![1, 2], target, deposit,  expiry, 
				FlowProtocol::Raise, FlowGovernance::No, vec![1, 2], vec![], vec![])
		);
		// Contribute (60/100)
		assert_ok!(Flow::contribute(Origin::signed(ALICE), campaign_id, deposit));

		// deposit < capacity
		System::set_block_number(expiry);
		Flow::on_finalize(expiry);
		
		assert_eq!(
			<Test as Config>::Currency::total_balance(GAME_CURRENCY_ID, &TREASURY),
			100
		);

		assert_eq!(
			<Test as Config>::Currency::free_balance(GAME_CURRENCY_ID, &TREASURY),
			100
		);

		assert_eq!(
			// Skip events from create and contribute extrinsics
			System::events()[4..],
				vec![
					EventRecord {
						phase: Phase::Initialization,
						event: Event::Tokens(orml_tokens::Event::Unreserved(GAME_CURRENCY_ID, ALICE, deposit)),
						topics: vec![],
					},
					EventRecord {
						phase: Phase::Initialization,
						event: Event::Tokens(orml_tokens::Event::Unreserved(GAME_CURRENCY_ID, TREASURY, deposit)),
						topics: vec![],
					},
					EventRecord {
						phase: Phase::Initialization,
						event: Event::Flow(crate::Event::CampaignFailed{
							campaign_id, campaign_balance: deposit, block_number: expiry, success: false
						}),
						topics: vec![],
					},
				]
		);
	});
}