#[cfg(test)]
use super::{
	types::{Proposal, ProposalType, ProposalState, Majority},
	*,
};
use crate::mock::{
	BlockNumber, AccountId, Balance, Control, RuntimeEvent as Event, ExtBuilder, Tokens, BoundedString,
	RuntimeOrigin as Origin, Signal, System, Test, ALICE, BOB, CHARLIE, DOLLARS, DAYS,
	PROTOCOL_TOKEN_ID, PAYMENT_TOKEN_ID,
	ProposalDurationLimits, Flow, CurrencyId
};
use frame_system::RawOrigin;
use frame_support::{
	assert_noop, assert_ok,
	traits::Hooks
};
use sp_core::H256;
use gamedao_control::types::{AccessModel, FeeModel, OrgType, Org};
use gamedao_flow::{FlowGovernance, FlowProtocol};

pub fn create_org(members: &Vec<AccountId>) -> (H256, AccountId) {
	let bounded_str = BoundedVec::truncate_from(vec![1,2]);
	let index = Control::org_count();
	let now = frame_system::Pallet::<Test>::block_number();
	let org = Org {
		index, creator: ALICE, prime: ALICE, name: bounded_str.clone(), cid: bounded_str.clone(),
		org_type: OrgType::Individual, fee_model: FeeModel::NoFees, membership_fee: Some(1 * DOLLARS),
		gov_currency: PROTOCOL_TOKEN_ID, pay_currency: PAYMENT_TOKEN_ID, access_model: AccessModel::Open,
		member_limit: <Test as gamedao_control::Config>::MaxMembers::get(), created: now.clone(), mutated: now
	};
	let org_id = <Test as frame_system::Config>::Hashing::hash_of(&org);
	assert_ok!(
		Control::create_org(
			Origin::signed(ALICE), org.name, org.cid, org.org_type, org.access_model,
			org.fee_model, None, org.membership_fee, None, None, None
	));
	let treasury_id = Control::org_treasury_account(&org_id).unwrap();
	let init_balance = 100 * DOLLARS;
	assert_ok!(Tokens::set_balance(RawOrigin::Root.into(), treasury_id, PROTOCOL_TOKEN_ID, init_balance, 0));
	for x in members {
		assert_ok!(Control::add_member(Origin::signed(x.clone()), org_id, *x));
	}
	(org_id, treasury_id)
}

pub fn set_balance(accounts: &Vec<AccountId>, amount: Balance) {
	for x in accounts {
		assert_ok!(Tokens::set_balance(RawOrigin::Root.into(), *x, PROTOCOL_TOKEN_ID, amount, 0));
		assert_ok!(Tokens::set_balance(RawOrigin::Root.into(), *x, PAYMENT_TOKEN_ID, amount, 0));
	}
}

pub fn create_finalize_campaign(
	current_block: BlockNumber,
	org_id: H256,
	contributors: &Vec<AccountId>,
	contribution: Balance,
	expiry: BlockNumber,
	finalize: bool
) -> H256 {
	let index = Flow::campaign_count();
	let bounded_str = BoundedVec::truncate_from(vec![1, 2, 3]);
	let campaign = gamedao_flow::types::Campaign {
		index,
		org_id,
		name: bounded_str.clone(),
		owner: ALICE,
		admin: ALICE,
		deposit: 10 * DOLLARS,
		start: current_block,
		expiry,
		cap: 40 * DOLLARS, 
		protocol: FlowProtocol::default(),
		governance: FlowGovernance::default(),
		cid: bounded_str.clone(),
		token_symbol: None,
		token_name: None,
		created: current_block,
	};
	assert_ok!(Flow::create_campaign(
		Origin::signed(ALICE),
		org_id, campaign.admin, campaign.name.clone(), campaign.cap,
		campaign.deposit, campaign.expiry, campaign.protocol.clone(),
		campaign.governance.clone(), campaign.cid.clone(), None, None, None
	));
	let campaign_id = <Test as frame_system::Config>::Hashing::hash_of(&campaign);
	for x in contributors {
		assert_ok!(Flow::contribute(Origin::signed(*x), campaign_id, contribution));
	}
	// Finalize campaign
	if finalize {
		System::set_block_number(expiry);
		Flow::on_finalize(expiry);
		System::set_block_number(expiry + 1);
		Flow::on_initialize(expiry + 1);
		assert_eq!(Flow::is_campaign_succeeded(&campaign_id), true);
	}

	campaign_id
}

pub fn create_proposal(
	proposal_type: ProposalType, org_id: H256, start: BlockNumber, expiry: BlockNumber, deposit: Balance, campaign_id: Option<H256>,
	currency_id: Option<CurrencyId>, beneficiary: Option<AccountId>, amount: Option<Balance>
) -> (H256, Proposal<H256, BlockNumber, AccountId, Balance, CurrencyId, BoundedString>) {
	let bounded_str = BoundedVec::truncate_from(vec![1, 2, 3]);
	let proposal = Proposal {
		index: <ProposalCount<Test>>::get(), owner: ALICE, title: bounded_str.clone(),
		cid: bounded_str, slashing_rule: SlashingRule::Automated,
		start, expiry, org_id, deposit, campaign_id,
		amount, beneficiary, proposal_type, currency_id,
	};
	let proposal_id: H256 = <Test as frame_system::Config>::Hashing::hash_of(&proposal);
	(proposal_id, proposal)
}

// TODO: more tests for token weighted voting

/// Test 0.0
/// - Proposal validation Errors
#[test]
fn signal_0_0() {
	ExtBuilder::default().build().execute_with(|| {
		let members: Vec<AccountId> = (0..50).collect();
		let contributors: Vec<AccountId> = (51..100).collect();
		let (org_id, _) = create_org(&members);
		set_balance(&contributors, 100 * DOLLARS);
		set_balance(&members, 100 * DOLLARS);
		let contribution = 50 * DOLLARS;

		let now: BlockNumber = 3;
		System::set_block_number(now);
		let campaign_expiry = now + 2 * DAYS;
		let campaign_id = create_finalize_campaign(now, org_id, &contributors, contribution, campaign_expiry, true);

		let start: BlockNumber = campaign_expiry + 1;
		let expiry: BlockNumber = start + ProposalDurationLimits::get().0;
		let (_, proposal) = create_proposal(
			ProposalType::Withdrawal, org_id, start, expiry, 20 * DOLLARS,
			Some(campaign_id), Some(PAYMENT_TOKEN_ID), None, Some(10 * DOLLARS)
		);

		// OrgInactive
		let _ = Control::disable_org(RawOrigin::Root.into(), org_id);
		assert_noop!(
			Signal::proposal(
				Origin::signed(ALICE), proposal.proposal_type.clone(), proposal.org_id,
				proposal.title.clone(), proposal.cid.clone(), proposal.expiry,
				Majority::Relative,
				Unit::Account,
				Scale::Linear,
				None, // start
				None, // quorum
				None, // deposit
				proposal.campaign_id, proposal.amount, proposal.beneficiary, proposal.currency_id),
			Error::<Test>::OrgInactive
		);
		let _ = Control::enable_org(RawOrigin::Root.into(), org_id);

		// AuthorizationError: Org memeber not active or not a member
		let not_a_member = CHARLIE;
		assert_noop!(
			Signal::proposal(
				Origin::signed(not_a_member), proposal.proposal_type.clone(), proposal.org_id,
				proposal.title.clone(), proposal.cid.clone(), proposal.expiry,
				Majority::Relative, Unit::Account, Scale::Linear, None, None, None,
				proposal.campaign_id, proposal.amount, proposal.beneficiary, proposal.currency_id),
			Error::<Test>::AuthorizationError
		);

		// OutOfBounds: start < current block
		let start = 0;
		assert_noop!(
			Signal::proposal(
				Origin::signed(ALICE), proposal.proposal_type.clone(), proposal.org_id,
				proposal.title.clone(), proposal.cid.clone(), proposal.expiry,
				Majority::Relative, Unit::Account, Scale::Linear, Some(start), None, None,
				proposal.campaign_id, proposal.amount, proposal.beneficiary, proposal.currency_id),
			Error::<Test>::OutOfBounds
		);

		// OutOfBounds: expiry < current block
		let expiry = 0;
		assert_noop!(
			Signal::proposal(
				Origin::signed(ALICE), proposal.proposal_type.clone(), proposal.org_id,
				proposal.title.clone(), proposal.cid.clone(), expiry,
				Majority::Relative, Unit::Account, Scale::Linear, None, None, None,
				proposal.campaign_id, proposal.amount, proposal.beneficiary, proposal.currency_id),
			Error::<Test>::OutOfBounds
		);

		// DepositInsufficient: deposit < MinProposalDeposit
		assert_noop!(
			Signal::proposal(
				Origin::signed(ALICE), proposal.proposal_type.clone(), proposal.org_id,
				proposal.title.clone(), proposal.cid.clone(), proposal.expiry,
				Majority::Relative, Unit::Account, Scale::Linear, None, None, Some(1 * DOLLARS),
				proposal.campaign_id, proposal.amount, proposal.beneficiary, proposal.currency_id),
			Error::<Test>::DepositInsufficient
		);

		// WrongParameter: unit person and quadratic scale
		assert_noop!(
			Signal::proposal(
				Origin::signed(ALICE), proposal.proposal_type.clone(), proposal.org_id,
				proposal.title.clone(), proposal.cid.clone(), proposal.expiry,
				Majority::Relative, Unit::Account, Scale::Quadratic, None, None, None,
				proposal.campaign_id, proposal.amount, proposal.beneficiary, proposal.currency_id),
			Error::<Test>::WrongParameter
		);

		// WrongParameter: unit token and absolute majority
		assert_noop!(
			Signal::proposal(
				Origin::signed(ALICE), proposal.proposal_type.clone(), proposal.org_id,
				proposal.title.clone(), proposal.cid.clone(), proposal.expiry,
				Majority::Absolute, Unit::Token, Scale::Quadratic, None, None, None,
				proposal.campaign_id, proposal.amount, proposal.beneficiary, proposal.currency_id),
			Error::<Test>::WrongParameter
		);

		// BalanceLow: not enough balance for the deposit
		assert_noop!(
			Signal::proposal(
				Origin::signed(ALICE), proposal.proposal_type.clone(), proposal.org_id,
				proposal.title.clone(), proposal.cid.clone(), proposal.expiry,
				Majority::Relative, Unit::Account, Scale::Linear, None, None, Some(1000 * DOLLARS),
				proposal.campaign_id, proposal.amount, proposal.beneficiary, proposal.currency_id),
			Error::<Test>::BalanceLow
		);

		// TreasuryBalanceLow: not enough balance for the reserve before starting spending proposal
		assert_noop!(
			Signal::proposal(
				Origin::signed(ALICE), ProposalType::Spending, proposal.org_id,
				proposal.title.clone(), proposal.cid.clone(), proposal.expiry,
				Majority::Relative, Unit::Account, Scale::Linear, None, None, None,
				proposal.campaign_id, Some(1000 * DOLLARS), Some(1), proposal.currency_id),
			Error::<Test>::TreasuryBalanceLow
		);

		// TooManyProposals
		assert_ok!(Signal::proposal(
			Origin::signed(ALICE), proposal.proposal_type.clone(), proposal.org_id,
			proposal.title.clone(), proposal.cid.clone(), proposal.expiry,
			Majority::Relative, Unit::Account, Scale::Linear, None, None, None,
			proposal.campaign_id, proposal.amount, proposal.beneficiary, proposal.currency_id),
		);
		assert_ok!(Signal::proposal(
			Origin::signed(ALICE), proposal.proposal_type.clone(), proposal.org_id,
			proposal.title.clone(), proposal.cid.clone(), proposal.expiry,
			Majority::Relative, Unit::Account, Scale::Linear, None, None, None,
			proposal.campaign_id, proposal.amount, proposal.beneficiary, proposal.currency_id),
		);
		assert_noop!(
			Signal::proposal(
				Origin::signed(ALICE), proposal.proposal_type.clone(), proposal.org_id,
				proposal.title.clone(), proposal.cid.clone(), proposal.expiry,
				Majority::Relative, Unit::Account, Scale::Linear, None, None, None,
				proposal.campaign_id, proposal.amount, proposal.beneficiary, proposal.currency_id),
			Error::<Test>::TooManyProposals
		);
	});
}

/// Test 0.1
/// - Withdrawal and Spending proposal validation Errors
#[test]
fn signal_0_1() {
	ExtBuilder::default().build().execute_with(|| {
		let members: Vec<AccountId> = (0..50).collect();
		let contributors: Vec<AccountId> = (51..100).collect();
		let (org_id, _) = create_org(&members);
		set_balance(&contributors, 100 * DOLLARS);
		let contribution = 50 * DOLLARS;
		let now: BlockNumber = 3;

		System::set_block_number(now);
		let campaign_expiry = now + 2 * DAYS;
		let campaign_id = create_finalize_campaign(now, org_id, &contributors, contribution, campaign_expiry, true);

		let start: BlockNumber = campaign_expiry + 1;
		let expiry: BlockNumber = start + ProposalDurationLimits::get().0;
		let (_, proposal) = create_proposal(
			ProposalType::Withdrawal, org_id, start, expiry, 20 * DOLLARS,
			Some(campaign_id), Some(PAYMENT_TOKEN_ID), None, Some(10 * DOLLARS)
		);

		// Spending proposal:
		// MissingParameter: beneficiary is None
		assert_noop!(
			Signal::proposal(
				Origin::signed(ALICE), ProposalType::Spending, proposal.org_id,
				proposal.title.clone(), proposal.cid.clone(), proposal.expiry,
				Majority::Relative, Unit::Account, Scale::Linear, None, None, None,
				proposal.campaign_id, proposal.amount, None, proposal.currency_id),
			Error::<Test>::MissingParameter
		);

		// Withdrawal and Spending proposal:
		// MissingParameter: currency is None
		assert_noop!(
			Signal::proposal(
				Origin::signed(ALICE), proposal.proposal_type.clone(), proposal.org_id,
				proposal.title.clone(), proposal.cid.clone(), proposal.expiry,
				Majority::Relative, Unit::Account, Scale::Linear, None, None, None,
				proposal.campaign_id, proposal.amount, proposal.beneficiary, None),
			Error::<Test>::MissingParameter
		);

		// MissingParameter: amount is None
		assert_noop!(
			Signal::proposal(
				Origin::signed(ALICE), proposal.proposal_type.clone(), proposal.org_id,
				proposal.title.clone(), proposal.cid.clone(), proposal.expiry,
				Majority::Relative, Unit::Account, Scale::Linear, None, None, None,
				proposal.campaign_id, None, proposal.beneficiary, proposal.currency_id),
			Error::<Test>::MissingParameter
		);

		// MissingParameter: campaign_id is None
		assert_noop!(
			Signal::proposal(
				Origin::signed(ALICE), proposal.proposal_type.clone(), proposal.org_id,
				proposal.title.clone(), proposal.cid.clone(), proposal.expiry,
				Majority::Relative, Unit::Account, Scale::Linear, None, None, None,
				None, proposal.amount, proposal.beneficiary, proposal.currency_id),
			Error::<Test>::MissingParameter
		);

		// AuthorizationError: proposer is not a campaign owner
		assert_noop!(
			Signal::proposal(
				Origin::signed(BOB), proposal.proposal_type.clone(), proposal.org_id,
				proposal.title.clone(), proposal.cid.clone(), proposal.expiry,
				Majority::Relative, Unit::Account, Scale::Linear, None, None, None,
				proposal.campaign_id, proposal.amount, proposal.beneficiary, proposal.currency_id),
			Error::<Test>::AuthorizationError
		);

		// BalanceLow: amount > campaign balance
		let insufficient_amount = 100000000000000 * DOLLARS;
		assert_noop!(
			Signal::proposal(
				Origin::signed(ALICE), proposal.proposal_type.clone(), proposal.org_id,
				proposal.title.clone(), proposal.cid.clone(), proposal.expiry,
				Majority::Relative, Unit::Account, Scale::Linear, None, None, None,
				proposal.campaign_id, Some(insufficient_amount), proposal.beneficiary, proposal.currency_id),
			Error::<Test>::BalanceLow
		);

		// CampaignUnsucceeded
		let now = campaign_expiry + 1;
		System::set_block_number(now);
		let campaign_expiry = now + 2 * DAYS;
		let proposal_expiry = campaign_expiry + 1 + ProposalDurationLimits::get().0;
		let campaign_id = create_finalize_campaign(now, org_id, &(51..52).collect(), 5 * DOLLARS, campaign_expiry, false);
		System::set_block_number(campaign_expiry);
		Flow::on_finalize(campaign_expiry);
		System::set_block_number(campaign_expiry + 1);
		Flow::on_initialize(campaign_expiry + 1);
		assert_eq!(Flow::is_campaign_succeeded(&campaign_id), false);
		assert_noop!(
			Signal::proposal(
				Origin::signed(ALICE), proposal.proposal_type.clone(), proposal.org_id,
				proposal.title.clone(), proposal.cid.clone(), proposal_expiry,
				Majority::Relative, Unit::Account, Scale::Linear, None, None, None,
				Some(campaign_id), proposal.amount, proposal.beneficiary, proposal.currency_id),
			Error::<Test>::CampaignUnsucceeded
		);
	});
}

/// Test 0.2
/// - Voting validation errors:
/// 	- ProposalNotActive
/// 	- AuthorizationError: not a member (General proposal)
/// 	- AuthorizationError: not a contributor (Withdrawal proposal)
///     - BalanceLow: not enough balance for token weighted voting
/// 	- MissingParameter: Unit::Token and deposit not provided
/// 	- WrongParameter: Unit::Account and deposit provided
#[test]
fn signal_0_2() {
	ExtBuilder::default().build().execute_with(|| {
		// General proposal
		let members: Vec<AccountId> = (0..50).collect();
		let (org_id, _) = create_org(&members);
		set_balance(&members, 100 * DOLLARS);
		let now: BlockNumber = 3;
		System::set_block_number(now);
		let start: BlockNumber = now + 1;
		let expiry: BlockNumber = now + 1 + ProposalDurationLimits::get().0;
		let (proposal_id, proposal) = create_proposal(
			ProposalType::General, org_id, start, expiry, 20 * DOLLARS, None, None, None, None);

		assert_ok!(Signal::proposal(
			Origin::signed(ALICE), proposal.proposal_type.clone(), proposal.org_id,
			proposal.title.clone(), proposal.cid.clone(), proposal.expiry,
			Majority::Relative, Unit::Account, Scale::Linear, Some(proposal.start), None, Some(proposal.deposit),
			proposal.campaign_id, proposal.amount, proposal.beneficiary, proposal.currency_id,
		));
		// ProposalNotActive
		assert_noop!(
			Signal::vote(Origin::signed(ALICE), proposal_id, true, None),
			Error::<Test>::ProposalNotActive
		);
		// Activate proposal
		System::set_block_number(start);
		Signal::on_initialize(start);

		// AuthorizationError: not an org member
		assert_noop!(
			Signal::vote(Origin::signed(BOB), proposal_id, true, None),
			Error::<Test>::AuthorizationError
		);

		// Withdrawal proposal
		let contributors: Vec<AccountId> = (51..100).collect();
		set_balance(&contributors, 100 * DOLLARS);
		let withdrawal_amount = 10 * DOLLARS;
		let campaign_expiry = start + 2 * DAYS;
		let campaign_id = create_finalize_campaign(start, org_id, &contributors, 50 * DOLLARS, campaign_expiry, true);
		let start: BlockNumber = campaign_expiry + 1;
		let expiry: BlockNumber = start + ProposalDurationLimits::get().0;
		let (proposal_id, proposal) = create_proposal(
			ProposalType::Withdrawal, org_id, start, expiry, 20 * DOLLARS,
			Some(campaign_id), Some(PAYMENT_TOKEN_ID), None, Some(withdrawal_amount)
		);
		assert_ok!(Signal::proposal(
			Origin::signed(ALICE), proposal.proposal_type.clone(), proposal.org_id,
			proposal.title.clone(), proposal.cid.clone(), proposal.expiry,
			Majority::Relative, Unit::Token, Scale::Linear, Some(proposal.start), None, Some(proposal.deposit),
			proposal.campaign_id, proposal.amount, proposal.beneficiary, proposal.currency_id,
		));

		// AuthorizationError: an org member, but not a contributor
		let not_a_contributor = ALICE;
		assert_noop!(
			Signal::vote(Origin::signed(not_a_contributor), proposal_id, true, Some(10 * DOLLARS)),
			Error::<Test>::AuthorizationError
		);

		// MissingParameter: Unit::Token and deposit not provided
		assert_noop!(
			Signal::vote(Origin::signed(not_a_contributor), proposal_id, true, None),
			Error::<Test>::MissingParameter
		);

		// BalanceLow: not enough ProtocolCurrency balance to perform a vote
		assert_noop!(
			Signal::vote(Origin::signed(51), proposal_id, true, Some(1000 * DOLLARS)),
			Error::<Test>::BalanceLow
		);

		let (proposal_id, proposal) = create_proposal(
			ProposalType::Withdrawal, org_id, start, expiry, 20 * DOLLARS,
			Some(campaign_id), Some(PAYMENT_TOKEN_ID), None, Some(withdrawal_amount)
		);
		assert_ok!(Signal::proposal(
			Origin::signed(ALICE), proposal.proposal_type.clone(), proposal.org_id,
			proposal.title.clone(), proposal.cid.clone(), proposal.expiry,
			Majority::Relative, Unit::Account, Scale::Linear, Some(proposal.start), None, Some(proposal.deposit),
			proposal.campaign_id, proposal.amount, proposal.beneficiary, proposal.currency_id,
		));

		// WrongParameter: Unit::Account and deposit provided
		assert_noop!(
			Signal::vote(Origin::signed(not_a_contributor), proposal_id, true, Some(100 * DOLLARS)),
			Error::<Test>::WrongParameter
		);

	});
}

/// Test 1.0
/// - General proposal
/// - Proposal deposit reserved
/// - Events
/// - Quorum reached
/// - Activation (on_initialize)
/// - Relative majority
/// - Result -> Accepted
/// - Deposit unreserved
#[test]
fn signal_1_0() {
	ExtBuilder::default().build().execute_with(|| {
		let members: Vec<AccountId> = (0..50).collect();
		let (org_id, _) = create_org(&members);
		set_balance(&members, 100 * DOLLARS);
		let now: BlockNumber = 3;
		System::set_block_number(now);
		let start: BlockNumber = now + 1;
		let expiry: BlockNumber = now + 1 + ProposalDurationLimits::get().0;
		let total_balance = 100 * DOLLARS - 1 * DOLLARS; // org creation fee
		let deposit = 20 * DOLLARS;
		let (proposal_id, proposal) = create_proposal(
			ProposalType::General, org_id, start, expiry, deposit, None, None, None, None
		);

		assert_ok!(Signal::proposal(
			Origin::signed(ALICE), proposal.proposal_type, proposal.org_id,
			proposal.title, proposal.cid, proposal.expiry,
			Majority::Relative, Unit::Account, Scale::Linear,
			Some(proposal.start),
			Some(Permill::from_rational(1u32, 3u32)), // quorum 1/3
			Some(proposal.deposit),
			proposal.campaign_id, proposal.amount, proposal.beneficiary, proposal.currency_id,
		));
		// Check if deposit was reserved
		assert_eq!(<Test as Config>::Currency::total_balance(PROTOCOL_TOKEN_ID, &ALICE), total_balance);
		assert_eq!(<Test as Config>::Currency::free_balance(PROTOCOL_TOKEN_ID, &ALICE), total_balance - deposit);

		System::assert_has_event(Event::Signal(crate::Event::Created {
			account: ALICE,
			proposal_id: proposal_id.clone(),
			org_id: org_id.clone(),
			campaign_id: None,
			amount: None,
			start,
			expiry,
		}));
		assert_eq!(ProposalStates::<Test>::get(&proposal_id), ProposalState::Created);

		// Hop to the proposal's start block and check if the proposal activated
		System::set_block_number(start);
		Signal::on_initialize(start);
		System::assert_has_event(Event::Signal(crate::Event::Activated {
			proposal_id: proposal_id.clone(),
		}));
		assert_eq!(ProposalStates::<Test>::get(&proposal_id), ProposalState::Active);

		// Every org member votes "YES"
		for x in &members {
			assert_ok!(Signal::vote(Origin::signed(*x), proposal_id, true, None));
		}
		// Proposal creator votes "NO"
		assert_ok!(Signal::vote(Origin::signed(ALICE), proposal_id, false, None));
		System::assert_has_event(Event::Signal(crate::Event::Voted {
			account: ALICE,
			proposal_id: proposal_id.clone(),
			voted: false,
			vote_power: 1,
			yes: members.len().saturated_into(),
			no: 1,
		}));

		// Hop to the proposal's expiry block and check proposal finalized
		System::set_block_number(expiry);
		Signal::on_finalize(expiry);

		System::assert_has_event(Event::Signal(crate::Event::Accepted {
			proposal_id: proposal_id.clone(),
		}));
		assert_eq!(ProposalStates::<Test>::get(&proposal_id), ProposalState::Accepted);
		// Check if deposit was unreserved
		assert_eq!(<Test as Config>::Currency::free_balance(PROTOCOL_TOKEN_ID, &ALICE), total_balance);
	});
}

/// Test 1.1
/// - General proposal
/// - Start default now
/// - Relative majority
/// - Result -> Rejected
/// - Deposit was slashed (Automated) -> Org treasury balance, GameDAO balance
#[test]
fn signal_1_1() {
	ExtBuilder::default().build().execute_with(|| {
		let members: Vec<AccountId> = (0..50).collect();
		let (org_id, _) = create_org(&members);
		set_balance(&members, 100 * DOLLARS);
		let now: BlockNumber = 3;
		let start: BlockNumber = now;
		let expiry: BlockNumber = now + ProposalDurationLimits::get().0;
		let total_balance = 100 * DOLLARS - 1 * DOLLARS; // org creation fee
		let deposit = 20 * DOLLARS;
		System::set_block_number(now);
		let (proposal_id, proposal) = create_proposal(
			ProposalType::General, org_id, start, expiry, deposit, None, None, None, None
		);

		assert_ok!(Signal::proposal(
			Origin::signed(ALICE), proposal.proposal_type, proposal.org_id,
			proposal.title, proposal.cid, proposal.expiry,
			Majority::Relative, Unit::Account, Scale::Linear, None, None, Some(proposal.deposit),
			proposal.campaign_id, proposal.amount, proposal.beneficiary, proposal.currency_id,
		));

		// Every org member votes "NO"
		for x in &members {
			assert_ok!(Signal::vote(Origin::signed(*x), proposal_id, false, None));
		}
		// Proposal creator votes "NO"
		assert_ok!(Signal::vote(Origin::signed(ALICE), proposal_id, false, None));

		System::assert_has_event(Event::Signal(crate::Event::Voted {
			account: ALICE,
			proposal_id: proposal_id.clone(),
			voted: false,
			vote_power: 1,
			yes: 0,
			no: (members.len() + 1).saturated_into(),
		}));

		// Hop to the proposal's expiry block and check proposal finalized
		System::set_block_number(expiry);
		Signal::on_finalize(expiry);

		System::assert_has_event(Event::Signal(crate::Event::Rejected {
			proposal_id: proposal_id.clone(),
		}));
		assert_eq!(ProposalStates::<Test>::get(&proposal_id), ProposalState::Rejected);

		// Check if deposit was slashed
		assert_eq!(<Test as Config>::Currency::free_balance(PROTOCOL_TOKEN_ID, &ALICE), total_balance - deposit);

		// TODO: check balances of GameDAO and Org treasury

	});
}

/// Test 1.2
/// - General proposal
/// - Relative majority
/// - Result -> Expired
/// - Deposit unreserved
#[test]
fn signal_1_2() {
	ExtBuilder::default().build().execute_with(|| {
		let members: Vec<AccountId> = (0..50).collect();
		let (org_id, _) = create_org(&members);
		set_balance(&members, 100 * DOLLARS);
		let now: BlockNumber = 3;
		let start: BlockNumber = now;
		let expiry: BlockNumber = now + ProposalDurationLimits::get().0;
		let total_balance = 100 * DOLLARS - 1 * DOLLARS; // org creation fee
		let deposit = 20 * DOLLARS;
		System::set_block_number(now);
		let (proposal_id, proposal) = create_proposal(
			ProposalType::General, org_id, start, expiry, deposit, None, None, None, None);

		assert_ok!(Signal::proposal(
			Origin::signed(ALICE), proposal.proposal_type, proposal.org_id,
			proposal.title, proposal.cid, proposal.expiry,
			Majority::Relative, Unit::Account, Scale::Linear, None, None, Some(proposal.deposit),
			proposal.campaign_id, proposal.amount, proposal.beneficiary, proposal.currency_id,
		));
		// No voting
		// Hop to the proposal's expiry block and check proposal finalized
		System::set_block_number(expiry);
		Signal::on_finalize(expiry);

		System::assert_has_event(Event::Signal(crate::Event::Expired {
			proposal_id: proposal_id.clone(),
		}));
		assert_eq!(ProposalStates::<Test>::get(&proposal_id), ProposalState::Expired);

		// Check if deposit was unreserved
		assert_eq!(<Test as Config>::Currency::free_balance(PROTOCOL_TOKEN_ID, &ALICE), total_balance);
	});
}

/// Test 1.3
/// - General proposal
/// - Relative majority
/// - Quorum not reached
/// - Result -> Rejected
/// - Deposit unreserved
#[test]
fn signal_1_3() {
	ExtBuilder::default().build().execute_with(|| {
		let members: Vec<AccountId> = (0..50).collect();
		let (org_id, _) = create_org(&members);
		set_balance(&members, 100 * DOLLARS);
		let now: BlockNumber = 3;
		let start: BlockNumber = now;
		let expiry: BlockNumber = now + ProposalDurationLimits::get().0;
		let total_balance = 100 * DOLLARS - 1 * DOLLARS; // org creation fee
		let deposit = 20 * DOLLARS;
		System::set_block_number(now);
		let (proposal_id, proposal) = create_proposal(
			ProposalType::General, org_id, start, expiry, deposit, None, None, None, None);

		assert_ok!(Signal::proposal(
			Origin::signed(ALICE), proposal.proposal_type, proposal.org_id,
			proposal.title, proposal.cid, proposal.expiry,
			Majority::Relative, Unit::Account, Scale::Linear, None,
			Some(Permill::from_rational(1u32, 3u32)), // quorum 1/3,
			Some(proposal.deposit),
			proposal.campaign_id, proposal.amount, proposal.beneficiary, proposal.currency_id,
		));

		// Voting: less than 1/3 voted YES, nobody voted NO
		for x in &members[..members.len() / 3 - 1] {
			assert_ok!(Signal::vote(Origin::signed(*x), proposal_id, true, None));
		}
		// Hop to the proposal's expiry block and check proposal finalized
		System::set_block_number(expiry);
		Signal::on_finalize(expiry);

		System::assert_has_event(Event::Signal(crate::Event::Rejected {
			proposal_id: proposal_id.clone(),
		}));
		assert_eq!(ProposalStates::<Test>::get(&proposal_id), ProposalState::Rejected);

		// Check if deposit was unreserved
		assert_eq!(<Test as Config>::Currency::free_balance(PROTOCOL_TOKEN_ID, &ALICE), total_balance);
	});
}

/// Test 1.4
/// - General proposal
/// - Absolute majority
/// - Early finalization
/// - Result -> Accepted
#[test]
fn signal_1_4() {
	ExtBuilder::default().build().execute_with(|| {
		let members: Vec<AccountId> = (0..50).collect();
		let (org_id, _) = create_org(&members);
		set_balance(&members, 100 * DOLLARS);
		let now: BlockNumber = 3;
		let start: BlockNumber = now;
		let expiry: BlockNumber = now + ProposalDurationLimits::get().0;
		let total_balance = 100 * DOLLARS - 1 * DOLLARS; // org creation fee
		let deposit = 20 * DOLLARS;
		System::set_block_number(now);
		let (proposal_id, proposal) = create_proposal(
			ProposalType::General, org_id, start, expiry, deposit, None, None, None, None);

		assert_ok!(Signal::proposal(
			Origin::signed(ALICE), proposal.proposal_type, proposal.org_id,
			proposal.title, proposal.cid, proposal.expiry,
			Majority::Absolute, Unit::Account, Scale::Linear, None, None, Some(proposal.deposit),
			proposal.campaign_id, proposal.amount, proposal.beneficiary, proposal.currency_id,
		));

		// Voting: more than 50% voted "YES"
		for x in &members[..members.len() / 2] {
			assert_ok!(Signal::vote(Origin::signed(*x), proposal_id, true, None));
		}
		// Hop to the next block and check if proposal finalized earlier
		System::set_block_number(now + 1);
		Signal::on_finalize(now + 1);

		System::assert_has_event(Event::Signal(crate::Event::Accepted {
			proposal_id: proposal_id.clone(),
		}));
		assert_eq!(ProposalStates::<Test>::get(&proposal_id), ProposalState::Accepted);

		// Check if deposit was unreserved
		assert_eq!(<Test as Config>::Currency::free_balance(PROTOCOL_TOKEN_ID, &ALICE), total_balance);
	});
}

/// Test 1.5
/// - General proposal
/// - Absolute majority
/// - No early finalization
/// - Result -> Rejected
#[test]
fn signal_1_5() {
	ExtBuilder::default().build().execute_with(|| {
		let members: Vec<AccountId> = (0..50).collect();
		let (org_id, _) = create_org(&members);
		set_balance(&members, 100 * DOLLARS);
		let now: BlockNumber = 3;
		let start: BlockNumber = now;
		let expiry: BlockNumber = now + ProposalDurationLimits::get().0;
		let total_balance = 100 * DOLLARS - 1 * DOLLARS; // org creation fee
		let deposit = 20 * DOLLARS;
		System::set_block_number(now);
		let (proposal_id, proposal) = create_proposal(
			ProposalType::General, org_id, start, expiry, deposit, None, None, None, None);

		assert_ok!(Signal::proposal(
			Origin::signed(ALICE), proposal.proposal_type, proposal.org_id,
			proposal.title, proposal.cid, proposal.expiry,
			Majority::Absolute, Unit::Account, Scale::Linear, None, None, Some(proposal.deposit),
			proposal.campaign_id, proposal.amount, proposal.beneficiary, proposal.currency_id,
		));

		// Voting: less than 50% voted "YES"
		for x in &members[..members.len() / 2 - 1] {
			assert_ok!(Signal::vote(Origin::signed(*x), proposal_id, true, None));
		}
		// Hop to the next block and check that proposal haven't finalized earlier
		System::set_block_number(now + 1);
		Signal::on_finalize(now + 1);
		assert_eq!(ProposalStates::<Test>::get(&proposal_id), ProposalState::Active);

		// Hop to the proposal's expiry block and check proposal finalized
		System::set_block_number(expiry);
		Signal::on_finalize(expiry);

		System::assert_has_event(Event::Signal(crate::Event::Rejected {
			proposal_id: proposal_id.clone(),
		}));
		assert_eq!(ProposalStates::<Test>::get(&proposal_id), ProposalState::Rejected);

		// Check if deposit was unreserved
		assert_eq!(<Test as Config>::Currency::free_balance(PROTOCOL_TOKEN_ID, &ALICE), total_balance);
	});
}

/// Test 1.6
/// - General proposal
/// - Unit token, scale quadratic
/// - Simple majority
/// - Result -> Accepted
#[test]
fn signal_1_6() {
	ExtBuilder::default().build().execute_with(|| {
		let members: Vec<AccountId> = (0..50).collect();
		let (org_id, _) = create_org(&members);
		set_balance(&members, 100 * DOLLARS);
		let now: BlockNumber = 3;
		let start: BlockNumber = now;
		let expiry: BlockNumber = now + ProposalDurationLimits::get().0;
		let total_balance = 100 * DOLLARS - 1 * DOLLARS; // org creation fee
		let deposit = 20 * DOLLARS;
		System::set_block_number(now);
		let (proposal_id, proposal) = create_proposal(
			ProposalType::General, org_id, start, expiry, deposit, None, None, None, None);

		assert_ok!(Signal::proposal(
			Origin::signed(ALICE), proposal.proposal_type, proposal.org_id,
			proposal.title, proposal.cid, proposal.expiry,
			Majority::Simple, Unit::Token, Scale::Quadratic, None, None, Some(proposal.deposit),
			proposal.campaign_id, proposal.amount, proposal.beneficiary, proposal.currency_id,
		));

		let voting_deposit = 10 * DOLLARS;

		// ~10% org member votes "YES"
		for x in &members[..members.len() / 10] {
			assert_ok!(Signal::vote(Origin::signed(*x), proposal_id, true, Some(voting_deposit)));
		}
		// Proposal creator votes "NO"
		assert_ok!(Signal::vote(Origin::signed(ALICE), proposal_id, false, Some(voting_deposit)));

		// Hop to the proposal's expiry block and check proposal finalized
		System::set_block_number(expiry);
		Signal::on_finalize(expiry);

		System::assert_has_event(Event::Signal(crate::Event::Accepted {
			proposal_id: proposal_id.clone(),
		}));
		assert_eq!(ProposalStates::<Test>::get(&proposal_id), ProposalState::Accepted);

		// Check if deposit was unreserved
		assert_eq!(<Test as Config>::Currency::free_balance(PROTOCOL_TOKEN_ID, &ALICE), total_balance);
	});
}

/// Test 1.7
/// - General proposal
/// - Simple majority
/// - Result -> Rejected
#[test]
fn signal_1_7() {
	ExtBuilder::default().build().execute_with(|| {
		let members: Vec<AccountId> = (0..50).collect();
		let (org_id, _) = create_org(&members);
		set_balance(&members, 100 * DOLLARS);
		let now: BlockNumber = 3;
		let start: BlockNumber = now;
		let expiry: BlockNumber = now + ProposalDurationLimits::get().0;
		let total_balance = 100 * DOLLARS - 1 * DOLLARS; // org creation fee
		let deposit = 20 * DOLLARS;
		System::set_block_number(now);
		let (proposal_id, proposal) = create_proposal(
			ProposalType::General, org_id, start, expiry, deposit, None, None, None, None);

		assert_ok!(Signal::proposal(
			Origin::signed(ALICE), proposal.proposal_type, proposal.org_id,
			proposal.title, proposal.cid, proposal.expiry,
			Majority::Simple, Unit::Account, Scale::Linear, None, None, Some(proposal.deposit),
			proposal.campaign_id, proposal.amount, proposal.beneficiary, proposal.currency_id,
		));

		// ~10% org member votes "NO"
		for x in &members[..members.len() / 10] {
			assert_ok!(Signal::vote(Origin::signed(*x), proposal_id, false, None));
		}
		// Proposal creator votes "YES"
		assert_ok!(Signal::vote(Origin::signed(ALICE), proposal_id, true, None));

		// Hop to the proposal's expiry block and check proposal finalized
		System::set_block_number(expiry);
		Signal::on_finalize(expiry);

		System::assert_has_event(Event::Signal(crate::Event::Rejected {
			proposal_id: proposal_id.clone(),
		}));
		assert_eq!(ProposalStates::<Test>::get(&proposal_id), ProposalState::Rejected);

		// Check if deposit was unreserved
		assert_eq!(<Test as Config>::Currency::free_balance(PROTOCOL_TOKEN_ID, &ALICE), total_balance);
	});
}

/// Test 1.8
/// - General proposal
/// - Relative majority
/// - 2 org members, equal votes
/// - Result -> Rejected
/// - Deposit slashed
#[test]
fn signal_1_8() {
	ExtBuilder::default().build().execute_with(|| {
		let members: Vec<AccountId> = (0..1).collect();
		let (org_id, _) = create_org(&members);
		set_balance(&members, 100 * DOLLARS);
		let now: BlockNumber = 3;
		let start: BlockNumber = now;
		let expiry: BlockNumber = now + ProposalDurationLimits::get().0;
		let total_balance = 100 * DOLLARS - 1 * DOLLARS; // org creation fee
		let deposit = 20 * DOLLARS;
		System::set_block_number(now);
		let (proposal_id, proposal) = create_proposal(
			ProposalType::General, org_id, start, expiry, deposit, None, None, None, None);

		assert_ok!(Signal::proposal(
			Origin::signed(ALICE), proposal.proposal_type, proposal.org_id,
			proposal.title, proposal.cid, proposal.expiry,
			Majority::Relative, Unit::Account, Scale::Linear, None, None, Some(proposal.deposit),
			proposal.campaign_id, proposal.amount, proposal.beneficiary, proposal.currency_id,
		));

		// One org member votes "NO"
		assert_ok!(Signal::vote(Origin::signed(0), proposal_id, false, None));
		// Proposal creator votes "YES"
		assert_ok!(Signal::vote(Origin::signed(ALICE), proposal_id, true, None));

		// Hop to the proposal's expiry block and check proposal finalized
		System::set_block_number(expiry);
		Signal::on_finalize(expiry);

		System::assert_has_event(Event::Signal(crate::Event::Rejected {
			proposal_id: proposal_id.clone(),
		}));
		assert_eq!(ProposalStates::<Test>::get(&proposal_id), ProposalState::Rejected);

		let voting = ProposalVoting::<Test>::get(&proposal_id).unwrap();
		assert_eq!(voting.eligible, 2);

		// Check if deposit was slashed
		assert_eq!(<Test as Config>::Currency::free_balance(PROTOCOL_TOKEN_ID, &ALICE), total_balance - deposit);
	});
}

/// Test 2.0
/// - Withdrawal proposal
/// - Early finalization if everyone voted (checks eligible contributors)
/// - Result -> Finalized
/// - Action -> Unreserve org's treasury funds
/// - Spending proposal
/// - Result -> Finalized
/// - Action -> funds sent to beneficiary account
#[test]
fn signal_2_0() {
	ExtBuilder::default().build().execute_with(|| {
		let members: Vec<AccountId> = (0..50).collect();
		let contributors: Vec<AccountId> = (51..100).collect();
		let (org_id, treasury_id) = create_org(&members);
		set_balance(&contributors, 100 * DOLLARS);

		let contribution = 50 * DOLLARS;
		let total_contribution = contribution * contributors.len() as Balance;
		let commission = <Test as gamedao_flow::Config>::CampaignFee::get().mul_floor(total_contribution);
		let currency = PAYMENT_TOKEN_ID;
		let now: BlockNumber = 3;
		System::set_block_number(now);
		let total_balance = 100 * DOLLARS - 1 * DOLLARS; // org creation fee
		let deposit = 20 * DOLLARS;
		let withdrawal_amount = 10 * DOLLARS;


		let campaign_expiry = now + 2 * DAYS;
		let campaign_id = create_finalize_campaign(now, org_id, &contributors, contribution, campaign_expiry, true);

		// Check if campaign was finalized and all treasury balance is reserved
		assert_eq!(<Test as Config>::Currency::total_balance(currency, &treasury_id), total_contribution - commission);
		assert_eq!(<Test as Config>::Currency::free_balance(currency, &treasury_id), 0);

		let start: BlockNumber = campaign_expiry + 1;
		let expiry: BlockNumber = start + ProposalDurationLimits::get().0;
		let (proposal_id, proposal) = create_proposal(
			ProposalType::Withdrawal, org_id, start, expiry, deposit,
			Some(campaign_id), Some(currency), None, Some(withdrawal_amount)
		);

		assert_ok!(Signal::proposal(
			Origin::signed(ALICE), proposal.proposal_type, proposal.org_id,
			proposal.title, proposal.cid, proposal.expiry,
			Majority::Relative, Unit::Account, Scale::Linear, None, None, Some(proposal.deposit),
			proposal.campaign_id, proposal.amount, proposal.beneficiary, proposal.currency_id,
		));

		// Every contributor votes "YES" and triggers an earlier finalization
		for x in &contributors {
			assert_ok!(Signal::vote(Origin::signed(*x), proposal_id, true, None));
		}

		// Check if proposal finalized earlier
		System::assert_has_event(Event::Signal(crate::Event::Finalized {
			proposal_id: proposal_id.clone(),
		}));
		assert_eq!(ProposalStates::<Test>::get(&proposal_id), ProposalState::Finalized);

		// Check if withdrawal amount was unreserved from the org treasury
		assert_eq!(<Test as Config>::Currency::free_balance(currency, &treasury_id), withdrawal_amount);

		// Check if proposal deposit was unreserved
		assert_eq!(<Test as Config>::Currency::free_balance(PROTOCOL_TOKEN_ID, &ALICE), total_balance);

		// Chech if CampaignBalanceUsed was updated
		assert_eq!(CampaignBalanceUsed::<Test>::get(&campaign_id), withdrawal_amount);

		// -------------------- Spending proposal --------------------

		let expiry: BlockNumber = expiry + 10;
		let beneficiary = CHARLIE;
		let spend_amount = withdrawal_amount;

		// Ensure beneficiary init balance is 0
		assert_eq!(<Test as Config>::Currency::total_balance(currency, &beneficiary), 0);

		let (proposal_id, proposal) = create_proposal(
			ProposalType::Spending, org_id, start, expiry, deposit,
			Some(campaign_id), Some(currency), Some(beneficiary), Some(spend_amount)
		);

		assert_ok!(Signal::proposal(
			Origin::signed(ALICE), proposal.proposal_type, proposal.org_id,
			proposal.title, proposal.cid, proposal.expiry,
			Majority::Relative, Unit::Account, Scale::Linear, None, None, Some(proposal.deposit),
			proposal.campaign_id, proposal.amount, proposal.beneficiary, proposal.currency_id,
		));

		// Ensure org treasury balance was reserved during proposal creation
		assert_eq!(<Test as Config>::Currency::free_balance(currency, &treasury_id), 0);

		// Every org member votes "YES"
		for x in &members {
			assert_ok!(Signal::vote(Origin::signed(*x), proposal_id, true, None));
		}

		// Hop to the proposal's expiry block and check proposal finalized
		System::set_block_number(expiry);
		Signal::on_finalize(expiry);

		System::assert_has_event(Event::Signal(crate::Event::Finalized {
			proposal_id: proposal_id.clone(),
		}));
		assert_eq!(ProposalStates::<Test>::get(&proposal_id), ProposalState::Finalized);

		// Check if spend amount was transfered out from the org treasury
		assert_eq!(<Test as Config>::Currency::free_balance(currency, &treasury_id), 0);
		// Ensure beneficiary received the amount to be spend
		assert_eq!(<Test as Config>::Currency::total_balance(currency, &beneficiary), spend_amount);
		// Check if proposal deposit was unreserved
		assert_eq!(<Test as Config>::Currency::free_balance(PROTOCOL_TOKEN_ID, &ALICE), total_balance);


	});
}


/// Test 2.1
/// - Withdrawal proposal
/// - Early finalization if everyone voted (checks eligible contributors)
/// - Result -> Finalized
/// - Action -> Unreserve org's treasury funds
/// - Spending proposal
/// - Result -> Rejected
/// - Action -> no action, org treasury funds unreserved
#[test]
fn signal_2_1() {
	ExtBuilder::default().build().execute_with(|| {
		let members: Vec<AccountId> = (0..50).collect();
		let contributors: Vec<AccountId> = (51..100).collect();
		let (org_id, treasury_id) = create_org(&members);
		set_balance(&contributors, 100 * DOLLARS);

		let contribution = 50 * DOLLARS;
		let total_contribution = contribution * contributors.len() as Balance;
		let commission = <Test as gamedao_flow::Config>::CampaignFee::get().mul_floor(total_contribution);
		let currency = PAYMENT_TOKEN_ID;
		let now: BlockNumber = 3;
		System::set_block_number(now);
		let total_balance = 100 * DOLLARS - 1 * DOLLARS; // org creation fee
		let deposit = 20 * DOLLARS;
		let withdrawal_amount = 10 * DOLLARS;

		let campaign_expiry = now + 2 * DAYS;
		let campaign_id = create_finalize_campaign(now, org_id, &contributors, contribution, campaign_expiry, true);

		// Check if campaign was finalized and all treasury balance is reserved
		assert_eq!(<Test as Config>::Currency::total_balance(currency, &treasury_id), total_contribution - commission);
		assert_eq!(<Test as Config>::Currency::free_balance(currency, &treasury_id), 0);

		let start: BlockNumber = campaign_expiry + 1;
		let expiry: BlockNumber = start + ProposalDurationLimits::get().0;
		let (proposal_id, proposal) = create_proposal(
			ProposalType::Withdrawal, org_id, start, expiry, deposit,
			Some(campaign_id), Some(currency), None, Some(withdrawal_amount)
		);

		assert_ok!(Signal::proposal(
			Origin::signed(ALICE), proposal.proposal_type, proposal.org_id,
			proposal.title, proposal.cid, proposal.expiry,
			Majority::Relative, Unit::Account, Scale::Linear, None, None, Some(proposal.deposit),
			proposal.campaign_id, proposal.amount, proposal.beneficiary, proposal.currency_id,
		));

		// Every contributor votes "YES" and triggers an earlier finalization
		for x in &contributors {
			assert_ok!(Signal::vote(Origin::signed(*x), proposal_id, true, None));
		}

		// Check if proposal finalized earlier
		System::assert_has_event(Event::Signal(crate::Event::Finalized {
			proposal_id: proposal_id.clone(),
		}));
		assert_eq!(ProposalStates::<Test>::get(&proposal_id), ProposalState::Finalized);

		// Check if withdrawal amount was unreserved from the org treasury
		assert_eq!(<Test as Config>::Currency::free_balance(currency, &treasury_id), withdrawal_amount);

		// Check if proposal deposit was unreserved
		assert_eq!(<Test as Config>::Currency::free_balance(PROTOCOL_TOKEN_ID, &ALICE), total_balance);

		// -------------------- Spending proposal --------------------

		let expiry: BlockNumber = expiry + 10;
		let beneficiary = CHARLIE;
		let spend_amount = withdrawal_amount;

		// Ensure beneficiary init balance is 0
		assert_eq!(<Test as Config>::Currency::total_balance(currency, &beneficiary), 0);

		let (proposal_id, proposal) = create_proposal(
			ProposalType::Spending, org_id, start, expiry, deposit,
			Some(campaign_id), Some(currency), Some(beneficiary), Some(spend_amount)
		);

		assert_ok!(Signal::proposal(
			Origin::signed(ALICE), proposal.proposal_type, proposal.org_id,
			proposal.title, proposal.cid, proposal.expiry,
			Majority::Relative, Unit::Account, Scale::Linear, None, None, Some(proposal.deposit),
			proposal.campaign_id, proposal.amount, proposal.beneficiary, proposal.currency_id,
		));

		// Ensure org treasury balance was reserved during proposal creation
		assert_eq!(<Test as Config>::Currency::free_balance(currency, &treasury_id), 0);

		// Every org member votes "NO"
		for x in &members {
			assert_ok!(Signal::vote(Origin::signed(*x), proposal_id, false, None));
		}

		// Hop to the proposal's expiry block and check proposal finalized
		System::set_block_number(expiry);
		Signal::on_finalize(expiry);

		System::assert_has_event(Event::Signal(crate::Event::Rejected {
			proposal_id: proposal_id.clone(),
		}));
		assert_eq!(ProposalStates::<Test>::get(&proposal_id), ProposalState::Rejected);

		// Check if spend amount was unreserved from the org treasury
		assert_eq!(<Test as Config>::Currency::free_balance(currency, &treasury_id), spend_amount);
		// Ensure beneficiary received the amount to be spend
		assert_eq!(<Test as Config>::Currency::total_balance(currency, &beneficiary), 0);
	});
}



/// Test 2.2
/// - Withdrawal proposal
/// - Result -> Rejected
/// - Action -> Not unreserved
#[test]
fn signal_2_2() {
	ExtBuilder::default().build().execute_with(|| {
		let members: Vec<AccountId> = (0..50).collect();
		let contributors: Vec<AccountId> = (51..100).collect();
		let (org_id, treasury_id) = create_org(&members);
		set_balance(&contributors, 100 * DOLLARS);
		let contribution = 50 * DOLLARS;
		let total_contribution = contribution * contributors.len() as Balance;
		let commission = <Test as gamedao_flow::Config>::CampaignFee::get().mul_floor(total_contribution);
		let currency = PAYMENT_TOKEN_ID;
		let now: BlockNumber = 3;
		System::set_block_number(now);
		let total_balance = 100 * DOLLARS - 1 * DOLLARS; // org creation fee
		let deposit = 20 * DOLLARS;
		let withdrawal_amount = 10 * DOLLARS;
		let campaign_expiry = now + 2 * DAYS;
		let campaign_id = create_finalize_campaign(now, org_id, &contributors, contribution, campaign_expiry, true);

		// Check if campaign was finalized and all treasury balance is reserved
		assert_eq!(<Test as Config>::Currency::total_balance(currency, &treasury_id), total_contribution - commission);
		assert_eq!(<Test as Config>::Currency::free_balance(currency, &treasury_id), 0);

		let start: BlockNumber = campaign_expiry + 1;
		let expiry: BlockNumber = start + ProposalDurationLimits::get().0;
		let (proposal_id, proposal) = create_proposal(
			ProposalType::Withdrawal, org_id, start, expiry, deposit,
			Some(campaign_id), Some(currency), None, Some(withdrawal_amount)
		);

		assert_ok!(Signal::proposal(
			Origin::signed(ALICE), proposal.proposal_type, proposal.org_id,
			proposal.title, proposal.cid, proposal.expiry,
			Majority::Simple, Unit::Account, Scale::Linear, None, None, Some(proposal.deposit),
			proposal.campaign_id, proposal.amount, proposal.beneficiary, proposal.currency_id,
		));

		// Every contributor votes "NO"
		for x in &contributors {
			assert_ok!(Signal::vote(Origin::signed(*x), proposal_id, false, None));
		}

		// Hop to the proposal's expiry block and check proposal finalized
		System::set_block_number(expiry);
		Signal::on_finalize(expiry);

		System::assert_has_event(Event::Signal(crate::Event::Rejected {
			proposal_id: proposal_id.clone(),
		}));
		assert_eq!(ProposalStates::<Test>::get(&proposal_id), ProposalState::Rejected);

		// Check if withdrawal amount was not unreserved from the org treasury
		assert_eq!(<Test as Config>::Currency::free_balance(currency, &treasury_id), 0);

		// Check if proposal deposit was slashed
		assert_eq!(<Test as Config>::Currency::free_balance(PROTOCOL_TOKEN_ID, &ALICE), total_balance - deposit);
	});
}
