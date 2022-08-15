#![cfg(test)]

use frame_support::traits::Hooks;
use frame_support::{assert_noop, assert_ok};
use frame_system::RawOrigin;
use sp_core::H256;
use sp_runtime::traits::{Hash, AccountIdConversion};

use gamedao_control::{AccessModel, FeeModel, OrgType};
use super::{
	types::{FlowProtocol, FlowGovernance},
	mock::{
		BlockNumber, AccountId, Balance, Control, Event, Tokens, INIT_BALANCE,
		Flow, Origin, System, Test, ALICE, BOB, DOLLARS, DAYS, new_test_ext,
		PROTOCOL_TOKEN_ID, PAYMENT_TOKEN_ID, CampaignDurationLimits, MaxContributorsProcessing,
	},
	*
};

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
	let tbalance = 200 * DOLLARS;
    let _ = Tokens::set_balance(RawOrigin::Root.into(), treasury_id, PROTOCOL_TOKEN_ID, tbalance, 0);

    (org_id, treasury_id, tbalance)
}

pub fn create_campaign(
	index: u32, org_id: H256, creator: AccountId, start: BlockNumber, expiry: BlockNumber, current_block: BlockNumber, deposit: Balance, target: Balance
) -> (H256, types::Campaign<mock::Hash, AccountId, Balance, BlockNumber, BoundedVec<u8, <Test as crate::Config>::StringLimit>>) {
	let bounded_str = BoundedVec::truncate_from(vec![1, 2, 3]);
	let campaign = types::Campaign {
		index,
		org_id,
		name: bounded_str.clone(),
		owner: creator.clone(),
		admin: creator.clone(),
		deposit,
		start,
		expiry,
		cap: target, 
		protocol: FlowProtocol::default(),
		governance: FlowGovernance::default(),
		cid: bounded_str.clone(),
		token_symbol: None,
		token_name: None,
		created: current_block,
	};
	let campaign_id: H256 = <Test as frame_system::Config>::Hashing::hash_of(&campaign);
	(campaign_id, campaign)
}

// TODO: error ContributionInsufficient

#[test]
fn flow_create_errors() {
	new_test_ext().execute_with(|| {
		let (org_id, _, _) = create_org_treasury();
		let now = 3;
		let bounded_vec = BoundedVec::truncate_from(vec![1,2,3]);
		System::set_block_number(now);
		let target = 10 * DOLLARS;
		let deposit = 2 * DOLLARS;
		let expiry = now + 2 * DAYS;

		// Check if creator is the controller of organization
		// Error: AuthorizationError
		let not_creator = ALICE;
		assert_noop!(
			Flow::create_campaign(
				Origin::signed(not_creator), org_id, not_creator,
				bounded_vec.clone(), target, deposit, expiry,
				FlowProtocol::default(), FlowGovernance::default(),
				bounded_vec.clone(), None, None, None,
			),
			Error::<Test>::AuthorizationError
		);
		// Check if organization's treasury has enough deposit
		// Error: TreasuryBalanceLow

		let deposit_more_than_treasury = 1000 * DOLLARS;
		assert_noop!(
			Flow::create_campaign(
				Origin::signed(BOB), org_id, BOB,
				bounded_vec.clone(), deposit_more_than_treasury + 1, deposit_more_than_treasury, expiry,
				FlowProtocol::default(), FlowGovernance::default(),
				bounded_vec.clone(), None, None, None,
			),
			Error::<Test>::TreasuryBalanceLow
		);

		// Check if deposit is not too high
		// Error: DepositTooHigh
		assert_noop!(
			Flow::create_campaign(
				Origin::signed(BOB), org_id, BOB,
				bounded_vec.clone(), target, target + 1, expiry,
				FlowProtocol::default(), FlowGovernance::default(),
				bounded_vec.clone(), None, None, None,
			),
			Error::<Test>::DepositTooHigh
		);
		// Check if deposit is not too low
		// Error: DepositInsufficient
		assert_noop!(
			Flow::create_campaign(
				Origin::signed(BOB), org_id, BOB,
				bounded_vec.clone(), target, 0, expiry,
				FlowProtocol::default(), FlowGovernance::default(),
				bounded_vec.clone(), None, None, None,
			),
			Error::<Test>::DepositInsufficient
		);
		// Check Campaign name length
		// Error: NameTooShort
		let short_name = BoundedVec::truncate_from(vec![1]);
		assert_noop!(
			Flow::create_campaign(
				Origin::signed(BOB), org_id, BOB,
				short_name, target, deposit, expiry,
				FlowProtocol::default(), FlowGovernance::default(),
				bounded_vec.clone(), None, None, None,
			),
			Error::<Test>::NameTooShort
		);
		// Ensure campaign expires before the current block
		// Error: OutOfBounds
		let expiration_block = now - 1;
		assert_noop!(
			Flow::create_campaign(
				Origin::signed(BOB), org_id, BOB,
				bounded_vec.clone(), target, deposit, expiration_block,
				FlowProtocol::default(), FlowGovernance::default(),
				bounded_vec.clone(), None, None, None,
			),
			Error::<Test>::OutOfBounds
		);
		// Ensure campaign expires before expiration limit
		// Error: OutOfBounds
		let (min_duration, max_duration) = CampaignDurationLimits::get();
		let expiration_block = max_duration + now + 1;
		assert_noop!(
			Flow::create_campaign(
				Origin::signed(BOB), org_id, BOB,
				bounded_vec.clone(), target, deposit, expiration_block,
				FlowProtocol::default(), FlowGovernance::default(),
				bounded_vec.clone(), None, None, None,
			),
			Error::<Test>::OutOfBounds
		);
		// Check campaigns limit per block
		// Error: CampaignsPerBlockExceeded
		assert_ok!(CampaignsByBlock::<Test>::try_mutate(
			BlockType::Expiry, expiry,
			|campaigns| -> Result<(), Error::<Test>> {
				campaigns.try_push(H256::random()).map_err(|_| Error::<Test>::CampaignsPerBlockExceeded)?;
				Ok(())
			}
		));
	});
}

#[test]
fn flow_create_success() {
	new_test_ext().execute_with(|| {
		let (org_id, _, _) = create_org_treasury();
		let now = 3;
		System::set_block_number(now);

		let index = CampaignCount::<Test>::get();
		let expiry = now + 2 * DAYS;
		let deposit = 10 * DOLLARS;
		let target = 20 * DOLLARS;
		let (campaign_id, campaign) = create_campaign(
			index, org_id, BOB, now, expiry, now, deposit, target
		);

		assert_ok!(Flow::create_campaign(
			Origin::signed(campaign.owner), org_id, BOB, campaign.name.clone(), campaign.cap,
			campaign.deposit, campaign.expiry, campaign.protocol.clone(), campaign.governance.clone(),
			campaign.cid.clone(), None, None, None
		));
		CampaignOf::<Test>::get(&campaign_id);
		assert_eq!(CampaignOf::<Test>::get(&campaign_id).unwrap(), campaign);

		System::assert_has_event(Event::Flow(crate::Event::Created {
			campaign_id,
			creator: BOB,
			admin: BOB,
			target,
			deposit,
			expiry,
			name: campaign.name
		}));

	});
}

#[test]
fn flow_contribute_errors() {
	new_test_ext().execute_with(|| {
		let (org_id, _, _) = create_org_treasury();
		let now = 3;
		System::set_block_number(now);

		let index = CampaignCount::<Test>::get();
		let expiry = now + 2 * DAYS;
		let deposit = 10 * DOLLARS;
		let target = 20 * DOLLARS;
		let (campaign_id, campaign) = create_campaign(
			index, org_id, BOB, now, expiry, now, deposit, target
		);

		assert_ok!(Flow::create_campaign(
			Origin::signed(campaign.owner), org_id, BOB, campaign.name.clone(), campaign.cap,
			campaign.deposit, campaign.expiry, campaign.protocol.clone(), campaign.governance.clone(),
			campaign.cid.clone(), None, None, None
		));

		// Check if contributor has enough balance
		// Error: BalanceLow
		let more_than_balance = 110 * DOLLARS;
		assert_noop!(
			Flow::contribute(Origin::signed(ALICE), campaign_id, more_than_balance),
			Error::<Test>::BalanceLow
		);

		// Check that owner is not caller
		// NoContributionToOwnCampaign
		assert_noop!(
			Flow::contribute(Origin::signed(BOB), campaign_id, 50 * DOLLARS),
			Error::<Test>::NoContributionToOwnCampaign
		);
		// Check if Campaign's state is Activated
		// NoContributionsAllowed
		CampaignStates::<Test>::insert(&campaign_id, CampaignState::Paused);
		assert_noop!(
			Flow::contribute(Origin::signed(ALICE), campaign_id, 50 * DOLLARS),
			Error::<Test>::NoContributionsAllowed
		);
		CampaignStates::<Test>::insert(&campaign_id, CampaignState::Activated);
		// Check if campaign ends before the current block
		// CampaignExpired
		System::set_block_number(expiry);
		assert_noop!(
			Flow::contribute(Origin::signed(ALICE), campaign_id, 50 * DOLLARS),
			Error::<Test>::CampaignExpired
		);
	});
}

#[test]
fn flow_contribute_success() {
	new_test_ext().execute_with(|| {
		let (org_id, _, _) = create_org_treasury();
		let now = 3;
		System::set_block_number(now);

		let index = CampaignCount::<Test>::get();
		let expiry = now + 2 * DAYS;
		let deposit = 10 * DOLLARS;
		let target = 20 * DOLLARS;
		let (campaign_id, campaign) = create_campaign(
			index, org_id, BOB, now, expiry, now, deposit, target
		);

		assert_ok!(Flow::create_campaign(
			Origin::signed(campaign.owner), org_id, BOB, campaign.name.clone(), campaign.cap,
			campaign.deposit, campaign.expiry, campaign.protocol.clone(), campaign.governance.clone(),
			campaign.cid.clone(), None, None, None
		));

		let contribution = 30 * DOLLARS;
		assert_ok!(Flow::contribute(Origin::signed(ALICE), campaign_id, contribution));
		assert_eq!(<Test as Config>::Currency::free_balance(PAYMENT_TOKEN_ID, &ALICE), INIT_BALANCE - contribution);
		assert_eq!(CampaignBalance::<Test>::get(&campaign_id), contribution);
		assert_eq!(CampaignContribution::<Test>::get(&campaign_id, ALICE), contribution);

		System::assert_has_event(Event::Flow(crate::Event::Contributed {
			campaign_id,
			sender: ALICE,
			contribution,
			block_number: now
		}));
	});
}

/// Tests queue when two campaigns created
#[test]
fn flow_on_finalize_campaign_succeess() {
	new_test_ext().execute_with(|| {
		let (org_id, treasury_id, tbalance) = create_org_treasury();
		let now = 3;
		System::set_block_number(now);

		let expiry = now + 2 * DAYS;
		let deposit = 80 * DOLLARS;
		let target = 500 * DOLLARS;
		let contribution = 60 * DOLLARS;

		// Create first Campaign
		let index = CampaignCount::<Test>::get();
		let (campaign_id_rev, campaign_rev) = create_campaign(
			index, org_id, BOB, now, expiry, now, deposit, target
		);

		assert_ok!(Flow::create_campaign(
			Origin::signed(campaign_rev.owner), org_id, BOB, campaign_rev.name.clone(), campaign_rev.cap,
			campaign_rev.deposit, campaign_rev.expiry, campaign_rev.protocol.clone(), campaign_rev.governance.clone(),
			campaign_rev.cid.clone(), None, None, None
		));
		
		// Contribute (10/500)
		assert_ok!(Flow::contribute(Origin::signed(1), campaign_id_rev, 10 * DOLLARS));

		// Create second Campaign
		let index = CampaignCount::<Test>::get();
		let (campaign_id, campaign) = create_campaign(
			index, org_id, BOB, now, expiry, now, deposit, target
		);

		assert_ok!(Flow::create_campaign(
			Origin::signed(campaign.owner), org_id, BOB, campaign.name.clone(), campaign.cap,
			campaign.deposit, campaign.expiry, campaign.protocol.clone(), campaign.governance.clone(),
			campaign.cid.clone(), None, None, None
		));

		let mut contributors: Vec<AccountId> = (1..11).collect();
		let total_contributors: u128 = contributors.len().try_into().unwrap();
		// Contribute (600/500)
		for c in &contributors {
			assert_ok!(Flow::contribute(Origin::signed(*c), campaign_id, contribution));
		}

		// --------- Block 0 (expiry): Schedule settlements ---------
		System::set_block_number(expiry);
		Flow::on_finalize(expiry);

		// Ensure that campaign was scheduled to be finalized
		let (campaign_, campaign_balance_, campaign_state_, treasury_id_, mut contributors_) = CampaignFinalizationQueue::<Test>::get(&campaign_id).unwrap();
		assert_eq!(campaign, campaign_);
		assert_eq!(600 * DOLLARS, campaign_balance_);
		assert_eq!(CampaignState::Succeeded, campaign_state_);
		assert_eq!(treasury_id, treasury_id_);
		assert_eq!(contributors.sort(), contributors_.sort());
		// Ensure that campaign will be finalize in 3 blocks: 4 + 4 + 2
		let batch_size: u128 = 4;
		assert_eq!(MaxContributorsProcessing::get(), batch_size as u32);

		// --------- Block 1: process first 4 contributors ---------
		System::set_block_number(expiry + 1);
		Flow::on_initialize(expiry + 1);

		assert_eq!(
			<Test as Config>::Currency::total_balance(PAYMENT_TOKEN_ID, &treasury_id),
			batch_size * contribution
		);
		assert_eq!(
			<Test as Config>::Currency::free_balance(PAYMENT_TOKEN_ID, &treasury_id),
			0
		);

		// --------- Block 2: process next 4 contributors ---------
		System::set_block_number(expiry + 2);
		Flow::on_initialize(expiry + 2);

		assert_eq!(
			<Test as Config>::Currency::total_balance(PAYMENT_TOKEN_ID, &treasury_id),
			2 * batch_size * contribution
		);
		assert_eq!(
			<Test as Config>::Currency::free_balance(PAYMENT_TOKEN_ID, &treasury_id),
			0
		);
		assert_eq!(CampaignStates::<Test>::get(&campaign_id), CampaignState::Activated);
		assert_eq!(CampaignStates::<Test>::get(&campaign_id_rev), CampaignState::Activated);

		// --------- Block 3: process last 2 contributors and finalize Campaign1, process 1 contributor and revert Campaign2 ---------
		System::set_block_number(expiry + 3);
		Flow::on_initialize(expiry + 3);

		// Campaign finalized:
		let commission = <Test as Config>::CampaignFee::get().mul_floor(contribution * 10);
		// The balance was transfered and locked in the org treasury
		assert_eq!(
			<Test as Config>::Currency::total_balance(PAYMENT_TOKEN_ID, &treasury_id),
			total_contributors * contribution - commission
		);
		assert_eq!(
			<Test as Config>::Currency::free_balance(PAYMENT_TOKEN_ID, &treasury_id),
			0
		);
		assert_eq!(CampaignBalance::<Test>::get(campaign_id), total_contributors * contribution - commission);
		// Initial deposit is still locked
		assert_eq!(
			<Test as Config>::Currency::total_balance(PROTOCOL_TOKEN_ID, &treasury_id),
			tbalance
		);
		assert_eq!(
			<Test as Config>::Currency::free_balance(PROTOCOL_TOKEN_ID, &treasury_id),
			tbalance - deposit
		);
		// Ensure that one campaign succeeded, and the other failed
		assert_eq!(CampaignStates::<Test>::get(&campaign_id), CampaignState::Succeeded);
		assert_eq!(CampaignStates::<Test>::get(&campaign_id_rev), CampaignState::Failed);

		// Last event:
		let events = System::events().into_iter().map(|evt| evt.event).collect::<Vec<_>>();
		assert_eq!(
			events[events.len() - 4],
			Event::Flow(crate::Event::Succeeded {
				campaign_id,
				campaign_balance: CampaignBalance::<Test>::get(campaign_id),
				block_number: expiry + 3,
			})
		);
		assert_eq!(
			events[events.len() - 1],
			Event::Flow(crate::Event::Failed {
				campaign_id: campaign_id_rev,
				campaign_balance: CampaignBalance::<Test>::get(campaign_id_rev),
				block_number: expiry + 3,
			})
		);

	});
}

#[test]
fn flow_on_finalize_campaign_failed() {
	new_test_ext().execute_with(|| {
		let (org_id, treasury_id, tbalance) = create_org_treasury();
		let now = 3;
		System::set_block_number(now);

		// Create Campaign
		let index = CampaignCount::<Test>::get();
		let expiry = now + 2 * DAYS;
		let deposit = 100 * DOLLARS;
		let target = 1000 * DOLLARS;
		let contribution = 60 * DOLLARS;
		let (campaign_id, campaign) = create_campaign(
			index, org_id, BOB, now, expiry, now, deposit, target
		);

		assert_ok!(Flow::create_campaign(
			Origin::signed(campaign.owner), org_id, BOB, campaign.name.clone(), campaign.cap,
			campaign.deposit, campaign.expiry, campaign.protocol.clone(), campaign.governance.clone(),
			campaign.cid.clone(), None, None, None
		));

		let mut contributors: Vec<AccountId> = (1..11).collect();
		// Contribute (600/1000)
		for c in &contributors {
			assert_ok!(Flow::contribute(Origin::signed(*c), campaign_id, contribution));
		}

		// --------- Block 0 (expiry): Schedule settlements ---------
		System::set_block_number(expiry);
		Flow::on_finalize(expiry);
		// Ensure that campaign will be reverted in 3 blocks: 4 + 4 + 2
		let batch_size: u128 = 4;
		assert_eq!(MaxContributorsProcessing::get(), batch_size as u32);

		let (_, _, _, _, c) = CampaignFinalizationQueue::<Test>::get(&campaign_id).unwrap();

		// --------- Block 1: process first 4 contributors ---------
		System::set_block_number(expiry + 1);
		Flow::on_initialize(expiry + 1);

		// Account's balance from the first batch was unlocked		
		assert_eq!(<Test as Config>::Currency::free_balance(PAYMENT_TOKEN_ID, &c[0]), INIT_BALANCE);
		assert_eq!(<Test as Config>::Currency::free_balance(PAYMENT_TOKEN_ID, &c[1]), INIT_BALANCE);
		assert_eq!(<Test as Config>::Currency::free_balance(PAYMENT_TOKEN_ID, &c[2]), INIT_BALANCE);
		assert_eq!(<Test as Config>::Currency::free_balance(PAYMENT_TOKEN_ID, &c[3]), INIT_BALANCE);
		assert_eq!(<Test as Config>::Currency::free_balance(PAYMENT_TOKEN_ID, &c[4]), INIT_BALANCE - contribution);
		assert_eq!(<Test as Config>::Currency::free_balance(PAYMENT_TOKEN_ID, &c[5]), INIT_BALANCE - contribution);
		assert_eq!(<Test as Config>::Currency::free_balance(PAYMENT_TOKEN_ID, &c[6]), INIT_BALANCE - contribution);
		assert_eq!(<Test as Config>::Currency::free_balance(PAYMENT_TOKEN_ID, &c[7]), INIT_BALANCE - contribution);
		assert_eq!(<Test as Config>::Currency::free_balance(PAYMENT_TOKEN_ID, &c[8]), INIT_BALANCE - contribution);
		assert_eq!(<Test as Config>::Currency::free_balance(PAYMENT_TOKEN_ID, &c[9]), INIT_BALANCE - contribution);

		// --------- Block 2: process next 4 contributors ---------
		System::set_block_number(expiry + 2);
		Flow::on_initialize(expiry + 2);

		// Account's balance from the second batch was unlocked
		assert_eq!(<Test as Config>::Currency::free_balance(PAYMENT_TOKEN_ID, &c[0]), INIT_BALANCE);
		assert_eq!(<Test as Config>::Currency::free_balance(PAYMENT_TOKEN_ID, &c[1]), INIT_BALANCE);
		assert_eq!(<Test as Config>::Currency::free_balance(PAYMENT_TOKEN_ID, &c[2]), INIT_BALANCE);
		assert_eq!(<Test as Config>::Currency::free_balance(PAYMENT_TOKEN_ID, &c[3]), INIT_BALANCE);
		assert_eq!(<Test as Config>::Currency::free_balance(PAYMENT_TOKEN_ID, &c[4]), INIT_BALANCE);
		assert_eq!(<Test as Config>::Currency::free_balance(PAYMENT_TOKEN_ID, &c[5]), INIT_BALANCE);
		assert_eq!(<Test as Config>::Currency::free_balance(PAYMENT_TOKEN_ID, &c[6]), INIT_BALANCE);
		assert_eq!(<Test as Config>::Currency::free_balance(PAYMENT_TOKEN_ID, &c[7]), INIT_BALANCE);
		assert_eq!(<Test as Config>::Currency::free_balance(PAYMENT_TOKEN_ID, &c[8]), INIT_BALANCE - contribution);
		assert_eq!(<Test as Config>::Currency::free_balance(PAYMENT_TOKEN_ID, &c[9]), INIT_BALANCE - contribution);

		// --------- Block 3: process last 2 contributors and set Campaign's status to FAILED ---------
		System::set_block_number(expiry + 3);
		Flow::on_initialize(expiry + 3);

		assert_eq!(<Test as Config>::Currency::free_balance(PAYMENT_TOKEN_ID, &c[0]), INIT_BALANCE);
		assert_eq!(<Test as Config>::Currency::free_balance(PAYMENT_TOKEN_ID, &c[1]), INIT_BALANCE);
		assert_eq!(<Test as Config>::Currency::free_balance(PAYMENT_TOKEN_ID, &c[2]), INIT_BALANCE);
		assert_eq!(<Test as Config>::Currency::free_balance(PAYMENT_TOKEN_ID, &c[3]), INIT_BALANCE);
		assert_eq!(<Test as Config>::Currency::free_balance(PAYMENT_TOKEN_ID, &c[4]), INIT_BALANCE);
		assert_eq!(<Test as Config>::Currency::free_balance(PAYMENT_TOKEN_ID, &c[5]), INIT_BALANCE);
		assert_eq!(<Test as Config>::Currency::free_balance(PAYMENT_TOKEN_ID, &c[6]), INIT_BALANCE);
		assert_eq!(<Test as Config>::Currency::free_balance(PAYMENT_TOKEN_ID, &c[7]), INIT_BALANCE);
		assert_eq!(<Test as Config>::Currency::free_balance(PAYMENT_TOKEN_ID, &c[8]), INIT_BALANCE);
		assert_eq!(<Test as Config>::Currency::free_balance(PAYMENT_TOKEN_ID, &c[9]), INIT_BALANCE);

		// Nothing transferred into the org treasury
		assert_eq!(<Test as Config>::Currency::free_balance(PAYMENT_TOKEN_ID, &treasury_id), 0);
		assert_eq!(<Test as Config>::Currency::total_balance(PAYMENT_TOKEN_ID, &treasury_id), 0);
		// Initial deposit was unlocked
		assert_eq!(
			<Test as Config>::Currency::free_balance(PROTOCOL_TOKEN_ID, &treasury_id),
			tbalance
		);
		assert_eq!(
			<Test as Config>::Currency::total_balance(PROTOCOL_TOKEN_ID, &treasury_id),
			tbalance
		);
		// Ensure that campaign failed
		assert_eq!(CampaignStates::<Test>::get(&campaign_id), CampaignState::Failed);

		System::assert_has_event(Event::Flow(crate::Event::Failed {
			campaign_id,
			campaign_balance: CampaignBalance::<Test>::get(campaign_id),
			block_number: expiry + 3,
		}));

	});
}
