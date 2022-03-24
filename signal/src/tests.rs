#[cfg(test)]
use super::{
	mock::{
		AccountId, Balance, Control, Event, ExtBuilder, Flow, Origin, Signal, System, Test, ACC1, ACC2, ACC3, DOLLARS,
		TREASURY_ACC,
	},
	types::{Proposal, ProposalMetadata, ProposalState, ProposalType, VotingType},
	*,
};
use frame_support::pallet_prelude::Encode;
use frame_support::{
	assert_noop, assert_ok,
	traits::{Hooks, Randomness},
};
use orml_tokens::Event as TokensEvent;
use orml_traits::MultiReservableCurrency;
use sp_core::H256;
use sp_runtime::traits::BadOrigin;

use gamedao_control::{AccessModel, FeeModel, OrgType};
use gamedao_flow::{FlowGovernance, FlowProtocol, FlowState};

fn create_org() -> H256 {
	let nonce = Control::nonce().encode();
	assert_ok!(Control::create_org(
		Origin::signed(ACC1),
		ACC1,
		TREASURY_ACC,
		vec![1, 2, 3],
		vec![1, 2, 3],
		OrgType::Individual,
		AccessModel::Open,
		FeeModel::NoFees,
		0,
		1,
		1,
		100
	));
	<Test as gamedao_control::Config>::Randomness::random(&nonce).0
}

fn create_campaign(
	org: H256,
	contributions: Vec<(AccountId, Balance)>,
	new_state: Option<FlowState>,
	expiry: Option<u64>,
) -> H256 {
	let nonce = Flow::nonce().encode();
	assert_ok!(Flow::create_campaign(
		Origin::signed(ACC1),
		org,
		ACC1,
		vec![1, 2, 3],
		10 * DOLLARS,
		10 * DOLLARS,
		expiry.unwrap_or(100),
		FlowProtocol::default(),
		FlowGovernance::default(),
		vec![1, 2, 3],
		vec![1, 2, 3],
		vec![1, 2, 3],
	));
	let campaign_id = <Test as gamedao_flow::Config>::Randomness::random(&nonce).0;
	for (account_id, contribution) in contributions.iter() {
		assert_ok!(Flow::contribute(
			Origin::signed(*account_id),
			campaign_id,
			*contribution
		));
	}
	if new_state.is_some() {
		assert_ok!(Flow::update_state(
			Origin::signed(ACC1),
			campaign_id,
			new_state.unwrap()
		));
	}
	campaign_id
}

#[test]
fn signal_general_proposal_success() {
	ExtBuilder::default().build().execute_with(|| {
		let nonce = vec![0];
		let (proposal_id, _): (H256, _) = <Test as Config>::Randomness::random(&nonce);
		let org_id = create_org();

		System::set_block_number(3);
		assert_ok!(Signal::general_proposal(
			Origin::signed(ACC1),
			org_id,        // context id
			vec![1, 2, 3], // title
			vec![1, 2, 3], // cid
			3,             // start
			15             // expiry
		));
		let event = System::events().pop().expect("No event generated").event;
		assert_eq!(
			event,
			Event::Signal(crate::Event::Proposal {
				sender_id: ACC1,
				proposal_id: proposal_id
			})
		);
		assert_eq!(
			<Proposals<Test>>::get(&proposal_id),
			Some(Proposal {
				proposal_id,
				context_id: org_id,
				proposal_type: ProposalType::General,
				voting_type: VotingType::Simple,
				start: 3,
				expiry: 15
			})
		);
		assert_eq!(
			<Metadata<Test>>::get(&proposal_id),
			ProposalMetadata {
				title: vec![1, 2, 3],
				cid: vec![1, 2, 3],
				amount: 0
			}
		);
		assert_eq!(<Owners<Test>>::get(&proposal_id), Some(ACC1));
		assert_eq!(<ProposalStates<Test>>::get(&proposal_id), ProposalState::Active);
		assert_eq!(<ProposalsByBlock<Test>>::get(15), vec![proposal_id.clone()]);
		assert_eq!(<ProposalsArray<Test>>::get(0), proposal_id);
		assert_eq!(<ProposalsCount<Test>>::get(), 1);
		assert_eq!(<ProposalsIndex<Test>>::get(&proposal_id), 0);
		assert_eq!(<ProposalsByContextArray<Test>>::get((org_id.clone(), 0)), proposal_id);
		assert_eq!(<ProposalsByContextCount<Test>>::get(org_id), 1);
		assert_eq!(<ProposalsByContextIndex<Test>>::get((org_id, proposal_id)), 0);
		assert_eq!(<ProposalsByOwnerArray<Test>>::get((ACC1, 0)), proposal_id);
		assert_eq!(<ProposalsByOwnerCount<Test>>::get(ACC1), 1);
		assert_eq!(<ProposalsByOwnerIndex<Test>>::get((ACC1, proposal_id)), 0);
		assert_eq!(<ProposalsByContext<Test>>::get(org_id), vec![proposal_id.clone()]);
		assert_eq!(<Nonce<Test>>::get(), 1);

		let nonce = vec![1];
		let (new_proposal_id, _): (H256, _) = <Test as Config>::Randomness::random(&nonce);
		assert_ok!(Signal::general_proposal(
			Origin::signed(ACC1),
			org_id,        // context id
			vec![2, 3, 4], // title
			vec![2, 3, 4], // cid
			3,             // start
			15             // expiry
		));
		assert_eq!(
			<ProposalsByBlock<Test>>::get(15),
			vec![proposal_id.clone(), new_proposal_id.clone()]
		);
		assert_eq!(<ProposalsArray<Test>>::get(1), new_proposal_id);
		assert_eq!(<ProposalsCount<Test>>::get(), 2);
		assert_eq!(<ProposalsIndex<Test>>::get(&new_proposal_id), 1);
		assert_eq!(
			<ProposalsByContextArray<Test>>::get((org_id.clone(), 1)),
			new_proposal_id
		);
		assert_eq!(<ProposalsByContextCount<Test>>::get(org_id), 2);
		assert_eq!(<ProposalsByContextIndex<Test>>::get((org_id, new_proposal_id)), 1);
		assert_eq!(<ProposalsByOwnerArray<Test>>::get((ACC1, 1)), new_proposal_id);
		assert_eq!(<ProposalsByOwnerCount<Test>>::get(ACC1), 2);
		assert_eq!(<ProposalsByOwnerIndex<Test>>::get((ACC1, new_proposal_id)), 1);
		assert_eq!(
			<ProposalsByContext<Test>>::get(org_id),
			vec![proposal_id.clone(), new_proposal_id.clone()]
		);
		assert_eq!(<Nonce<Test>>::get(), 2);
	});
}

#[test]
fn signal_general_proposal_error() {
	ExtBuilder::default().build().execute_with(|| {
		System::set_block_number(3);
		let nonce = vec![0];
		let (proposal_id, _): (H256, _) = <Test as Config>::Randomness::random(&nonce);
		let campaign_id = create_org();

		<Proposals<Test>>::insert(
			campaign_id,
			Proposal {
				proposal_id: proposal_id,
				context_id: campaign_id,
				proposal_type: ProposalType::General,
				voting_type: VotingType::Simple,
				start: 2,
				expiry: 13,
			},
		);
		assert_noop!(
			Signal::general_proposal(
				Origin::signed(ACC1),
				campaign_id,   // context id
				vec![1, 2, 3], // title
				vec![1, 2, 3], // cid
				3,             // start
				15             // expiry
			),
			Error::<Test>::ProposalExists
		);

		let proposal_ids = vec![H256::random(), H256::random()];
		<ProposalsByBlock<Test>>::insert(15, proposal_ids);
		assert_noop!(
			Signal::general_proposal(
				Origin::signed(ACC1),
				campaign_id,   // context id
				vec![1, 2, 3], // title
				vec![1, 2, 3], // cid
				3,             // start
				15             // expiry
			),
			Error::<Test>::TooManyProposals
		);

		assert_noop!(
			Signal::general_proposal(
				Origin::signed(ACC1),
				campaign_id,   // context id
				vec![1, 2, 3], // title
				vec![1, 2, 3], // cid
				3,             // start
				System::block_number() + <ProposalTimeLimit::<Test>>::get() + 1
			),
			Error::<Test>::OutOfBounds
		);
		assert_noop!(
			Signal::general_proposal(
				Origin::signed(ACC1),
				campaign_id,            // context id
				vec![1, 2, 3],          // title
				vec![1, 2, 3],          // cid
				System::block_number(), // start
				System::block_number()  // expiry
			),
			Error::<Test>::OutOfBounds
		);

		assert_ok!(Control::remove_member(Origin::signed(ACC1), campaign_id, ACC1));
		assert_noop!(
			Signal::general_proposal(
				Origin::signed(ACC1),
				campaign_id,   // context id
				vec![1, 2, 3], // title
				vec![1, 2, 3], // cid
				3,             // start
				15             // expiry
			),
			Error::<Test>::AuthorizationError
		);

		assert_ok!(Control::disable(Origin::root(), campaign_id));
		assert_noop!(
			Signal::general_proposal(Origin::signed(ACC1), campaign_id, vec![1, 2, 3], vec![1, 2, 3], 3, 15),
			Error::<Test>::DAOInactive
		);

		assert_noop!(
			Signal::general_proposal(
				Origin::none(),
				campaign_id,   // context id
				vec![1, 2, 3], // title
				vec![1, 2, 3], // cid
				3,             // start
				15             // expiry
			),
			BadOrigin
		);
	});
}

#[test]
fn signal_withdraw_proposal_success() {
	ExtBuilder::default().build().execute_with(|| {
		let org_id = create_org();
		let campaign_id = create_campaign(org_id, vec![(ACC2, 15 * DOLLARS)], Some(FlowState::Success), None);
		System::set_block_number(3);

		let nonce = vec![0];
		let (proposal_id, _): (H256, _) = <Test as Config>::Randomness::random(&nonce);
		<CampaignBalanceUsed<Test>>::insert(campaign_id, 5 * DOLLARS);

		assert_ok!(Signal::withdraw_proposal(
			Origin::signed(ACC1), // origin
			campaign_id,          // context id
			vec![1, 2, 3],        // title
			vec![1, 2, 3],        // cid
			10 * DOLLARS,         // amount
			3,                    // start
			15                    // expiry
		));
		let event = System::events().pop().expect("No event generated").event;
		assert_eq!(
			event,
			Event::Signal(crate::Event::ProposalCreated {
				sender_id: ACC1,
				context_id: campaign_id,
				proposal_id,
				amount: 10 * DOLLARS,
				expiry: 15
			})
		);
		assert_eq!(
			<Proposals<Test>>::get(&proposal_id),
			Some(Proposal {
				proposal_id,
				context_id: campaign_id,
				proposal_type: ProposalType::Withdrawal,
				voting_type: VotingType::Simple,
				start: 3,
				expiry: 15
			})
		);
		assert_eq!(
			<Metadata<Test>>::get(&proposal_id),
			ProposalMetadata {
				title: vec![1, 2, 3],
				cid: vec![1, 2, 3],
				amount: 10 * DOLLARS
			}
		);
		assert_eq!(<Owners<Test>>::get(&proposal_id), Some(ACC1));
		assert_eq!(<ProposalStates<Test>>::get(&proposal_id), ProposalState::Active);
		assert_eq!(<ProposalsByBlock<Test>>::get(15), vec![proposal_id.clone()]);
		assert_eq!(<ProposalsArray<Test>>::get(0), proposal_id);
		assert_eq!(<ProposalsCount<Test>>::get(), 1);
		assert_eq!(<ProposalsIndex<Test>>::get(&proposal_id), 0);
		assert_eq!(
			<ProposalsByContextArray<Test>>::get((campaign_id.clone(), 0)),
			proposal_id
		);
		assert_eq!(<ProposalsByContextCount<Test>>::get(campaign_id), 1);
		assert_eq!(<ProposalsByContextIndex<Test>>::get((campaign_id, proposal_id)), 0);
		assert_eq!(<ProposalsByOwnerArray<Test>>::get((ACC1, 0)), proposal_id);
		assert_eq!(<ProposalsByOwnerCount<Test>>::get(ACC1), 1);
		assert_eq!(<ProposalsByOwnerIndex<Test>>::get((ACC1, proposal_id)), 0);
		assert_eq!(<ProposalsByContext<Test>>::get(campaign_id), vec![proposal_id.clone()]);
		assert_eq!(<Nonce<Test>>::get(), 1);

		let nonce = vec![1];
		let (new_proposal_id, _): (H256, _) = <Test as Config>::Randomness::random(&nonce);
		assert_ok!(Signal::general_proposal(
			Origin::signed(ACC1),
			campaign_id,   // context id
			vec![2, 3, 4], // title
			vec![2, 3, 4], // cid
			3,             // start
			15             // expiry
		));
		assert_eq!(
			<ProposalsByBlock<Test>>::get(15),
			vec![proposal_id.clone(), new_proposal_id.clone()]
		);
		assert_eq!(<ProposalsArray<Test>>::get(1), new_proposal_id);
		assert_eq!(<ProposalsCount<Test>>::get(), 2);
		assert_eq!(<ProposalsIndex<Test>>::get(&new_proposal_id), 1);
		assert_eq!(
			<ProposalsByContextArray<Test>>::get((campaign_id.clone(), 1)),
			new_proposal_id
		);
		assert_eq!(<ProposalsByContextCount<Test>>::get(campaign_id), 2);
		assert_eq!(<ProposalsByContextIndex<Test>>::get((campaign_id, new_proposal_id)), 1);
		assert_eq!(<ProposalsByOwnerArray<Test>>::get((ACC1, 1)), new_proposal_id);
		assert_eq!(<ProposalsByOwnerCount<Test>>::get(ACC1), 2);
		assert_eq!(<ProposalsByOwnerIndex<Test>>::get((ACC1, new_proposal_id)), 1);
		assert_eq!(
			<ProposalsByContext<Test>>::get(campaign_id),
			vec![proposal_id.clone(), new_proposal_id.clone()]
		);
		assert_eq!(<Nonce<Test>>::get(), 2);
	});
}

#[test]
fn signal_withdraw_proposal_error() {
	ExtBuilder::default().build().execute_with(|| {
		let org_id = create_org();
		let campaign_id = create_campaign(org_id, vec![(ACC2, 15 * DOLLARS)], Some(FlowState::Success), None);
		System::set_block_number(3);

		let nonce = vec![0];
		let (proposal_id, _): (H256, _) = <Test as Config>::Randomness::random(&nonce);
		<CampaignBalanceUsed<Test>>::insert(campaign_id, 5 * DOLLARS);

		<Proposals<Test>>::insert(
			campaign_id,
			Proposal {
				proposal_id: proposal_id,
				context_id: campaign_id,
				proposal_type: ProposalType::Withdrawal,
				voting_type: VotingType::Simple,
				start: 2,
				expiry: 13,
			},
		);
		assert_noop!(
			Signal::withdraw_proposal(
				Origin::signed(ACC1), // origin
				campaign_id,          // context id
				vec![1, 2, 3],        // title
				vec![1, 2, 3],        // cid
				10 * DOLLARS,         // amount
				3,                    // start
				15                    // expiry
			),
			Error::<Test>::ProposalExists
		);

		let proposal_ids = vec![H256::random(), H256::random()];
		<ProposalsByBlock<Test>>::insert(15, proposal_ids);
		assert_noop!(
			Signal::withdraw_proposal(
				Origin::signed(ACC1), // origin
				campaign_id,          // context id
				vec![1, 2, 3],        // title
				vec![1, 2, 3],        // cid
				10 * DOLLARS,         // amount
				3,                    // start
				15                    // expiry
			),
			Error::<Test>::TooManyProposals
		);

		<CampaignBalanceUsed<Test>>::insert(campaign_id, 15 * DOLLARS);
		assert_noop!(
			Signal::withdraw_proposal(
				Origin::signed(ACC1), // origin
				campaign_id,          // context id
				vec![1, 2, 3],        // title
				vec![1, 2, 3],        // cid
				10 * DOLLARS,         // amount
				3,                    // start
				15                    // expiry
			),
			Error::<Test>::BalanceInsufficient
		);

		<CampaignBalanceUsed<Test>>::insert(campaign_id, 11 * DOLLARS);
		assert_noop!(
			Signal::withdraw_proposal(
				Origin::signed(ACC1), // origin
				campaign_id,          // context id
				vec![1, 2, 3],        // title
				vec![1, 2, 3],        // cid
				10 * DOLLARS,         // amount
				3,                    // start
				15                    // expiry
			),
			Error::<Test>::BalanceInsufficient
		);

		// CampaignState::<Test>::insert(campaign_id, FlowState::Failed);
		// System::set_block_number(4);
		let campaign_id = create_campaign(org_id, vec![], Some(FlowState::Failed), Some(101));
		<CampaignBalanceUsed<Test>>::insert(campaign_id, 11);
		assert_noop!(
			Signal::withdraw_proposal(
				Origin::signed(ACC1), // origin
				campaign_id,          // context id
				vec![1, 2, 3],        // title
				vec![1, 2, 3],        // cid
				10 * DOLLARS,         // amount
				4,                    // start
				16                    // expiry
			),
			Error::<Test>::CampaignFailed
		);

		assert_noop!(
			Signal::withdraw_proposal(
				Origin::none(), // origin
				campaign_id,    // context id
				vec![1, 2, 3],  // title
				vec![1, 2, 3],  // cid
				10 * DOLLARS,   // amount
				4,              // start
				16              // expiry
			),
			BadOrigin
		);
	});
}

#[test]
fn signal_simple_vote_success() {
	ExtBuilder::default().build().execute_with(|| {
		let org_id = create_org();
		let campaign_id = create_campaign(org_id, vec![(ACC2, 5 * DOLLARS)], None, None);
		System::set_block_number(3);

		let nonce = vec![0];
		let (proposal_id, _): (H256, _) = <Test as Config>::Randomness::random(&nonce);
		<Proposals<Test>>::insert(
			proposal_id,
			Proposal {
				proposal_id: proposal_id,
				context_id: campaign_id,
				proposal_type: ProposalType::General,
				voting_type: VotingType::Simple,
				start: 2,
				expiry: 13,
			},
		);
		<ProposalStates<Test>>::insert(proposal_id, ProposalState::Active);

		assert_ok!(Signal::simple_vote(Origin::signed(ACC2), proposal_id, true));
		let event = System::events().pop().expect("No event generated").event;
		assert_eq!(
			event,
			Event::Signal(crate::Event::ProposalVoted {
				sender_id: ACC2,
				proposal_id,
				vote: true
			})
		);
		assert_eq!(<ProposalSimpleVotes<Test>>::get(&proposal_id), (1, 0));
		assert_eq!(<ProposalApprovers<Test>>::get(&proposal_id), 1);
		assert_eq!(<VotedBefore<Test>>::get((ACC2, proposal_id)), true);
		assert_eq!(<ProposalsByVoterCount<Test>>::get(ACC2), 1);
		assert_eq!(<ProposalVotesByVoters<Test>>::get(proposal_id), vec![(ACC2, true)]);
		assert_eq!(<ProposalsByVoter<Test>>::get(ACC2), vec![(proposal_id, true)]);
		assert_eq!(<ProposalVoters<Test>>::get(proposal_id), vec![ACC2]);

		assert_ok!(Signal::simple_vote(Origin::signed(ACC1), proposal_id, false));
		let event = System::events().pop().expect("No event generated").event;
		assert_eq!(
			event,
			Event::Signal(crate::Event::ProposalVoted {
				sender_id: ACC1,
				proposal_id,
				vote: false
			})
		);
		assert_eq!(<ProposalSimpleVotes<Test>>::get(&proposal_id), (1, 1));
		assert_eq!(<ProposalApprovers<Test>>::get(&proposal_id), 1);
		assert_eq!(<ProposalDeniers<Test>>::get(&proposal_id), 1);
		assert_eq!(<VotedBefore<Test>>::get((ACC1, proposal_id)), true);
		assert_eq!(<ProposalsByVoterCount<Test>>::get(ACC1), 1);
		assert_eq!(
			<ProposalVotesByVoters<Test>>::get(proposal_id),
			vec![(ACC2, true), (ACC1, false)]
		);
		assert_eq!(<ProposalsByVoter<Test>>::get(ACC1), vec![(proposal_id, false)]);
		assert_eq!(<ProposalVoters<Test>>::get(proposal_id), vec![ACC1, ACC2]);

		let nonce = vec![1];
		let (proposal_id, _): (H256, _) = <Test as Config>::Randomness::random(&nonce);
		let campaign_id = H256::random();
		<Proposals<Test>>::insert(
			proposal_id,
			Proposal {
				proposal_id: proposal_id,
				context_id: campaign_id,
				proposal_type: ProposalType::Withdrawal,
				voting_type: VotingType::Simple,
				start: 2,
				expiry: 13,
			},
		);
		<ProposalStates<Test>>::insert(proposal_id, ProposalState::Active);

		assert_ok!(Signal::simple_vote(Origin::signed(ACC1), proposal_id, false));
		let event = System::events().pop().expect("No event generated").event;
		assert_eq!(
			event,
			Event::Signal(crate::Event::ProposalVoted {
				sender_id: ACC1,
				proposal_id,
				vote: false
			})
		);
		assert_eq!(<ProposalSimpleVotes<Test>>::get(&proposal_id), (0, 1));
		assert_eq!(<ProposalApprovers<Test>>::get(&proposal_id), 0);
		assert_eq!(<ProposalDeniers<Test>>::get(&proposal_id), 1);

		let campaign_id = create_campaign(org_id, vec![(ACC2, 10), (ACC3, 10)], Some(FlowState::Active), Some(101));
		let nonce = vec![2];
		let (proposal_id, _): (H256, _) = <Test as Config>::Randomness::random(&nonce);
		<Proposals<Test>>::insert(
			proposal_id,
			Proposal {
				proposal_id: proposal_id,
				context_id: campaign_id,
				proposal_type: ProposalType::Withdrawal,
				voting_type: VotingType::Simple,
				start: 2,
				expiry: 14,
			},
		);
		ProposalStates::<Test>::insert(proposal_id.clone(), ProposalState::Active);
		Owners::<Test>::insert(proposal_id.clone(), ACC1.clone());
		assert_ok!(Signal::simple_vote(Origin::signed(ACC2), proposal_id, true));
		assert_ok!(Signal::simple_vote(Origin::signed(ACC3), proposal_id, true));
		let mut events = System::events();
		let event = events.pop().expect("No event generated").event;
		assert_eq!(
			event,
			Event::Signal(crate::Event::ProposalVoted {
				sender_id: ACC3,
				proposal_id,
				vote: true
			})
		);
		let event = events.pop().expect("No event generated").event;
		assert_eq!(
			event,
			Event::Signal(crate::Event::WithdrawalGranted {
				proposal_id,
				context_id: campaign_id,
				body_id: org_id
			})
		);
		assert_eq!(<ProposalSimpleVotes<Test>>::get(&proposal_id), (2, 0));
		assert_eq!(<ProposalApprovers<Test>>::get(&proposal_id), 2);
	});
}

#[test]
fn signal_simple_vote_error() {
	ExtBuilder::default().build().execute_with(|| {
		System::set_block_number(3);

		let nonce = vec![0];
		let (proposal_id, _): (H256, _) = <Test as Config>::Randomness::random(&nonce);
		let campaign_id = H256::random();
		<Proposals<Test>>::insert(
			proposal_id,
			Proposal {
				proposal_id: proposal_id,
				context_id: campaign_id,
				proposal_type: ProposalType::General,
				voting_type: VotingType::Simple,
				start: 2,
				expiry: System::block_number(),
			},
		);
		<ProposalStates<Test>>::insert(proposal_id, ProposalState::Active);
		assert_noop!(
			Signal::simple_vote(Origin::signed(ACC1), proposal_id, true),
			Error::<Test>::ProposalExpired
		);

		<VotedBefore<Test>>::insert((ACC1, proposal_id), true);
		assert_noop!(
			Signal::simple_vote(Origin::signed(ACC1), proposal_id, true),
			Error::<Test>::AlreadyVoted
		);

		<ProposalStates<Test>>::insert(proposal_id, ProposalState::Expired);
		assert_noop!(
			Signal::simple_vote(Origin::signed(ACC1), proposal_id, true),
			Error::<Test>::ProposalEnded
		);

		assert_noop!(
			Signal::simple_vote(Origin::signed(ACC1), H256::random(), true),
			Error::<Test>::ProposalUnknown
		);

		assert_noop!(Signal::simple_vote(Origin::none(), proposal_id, true), BadOrigin);
	});
}

#[test]
fn signal_on_finalize_success() {
	ExtBuilder::default().build().execute_with(|| {
		let org_id = create_org();
		let campaign_id = create_campaign(
			org_id,
			vec![(ACC2, 15 * DOLLARS), (ACC3, 5 * DOLLARS)],
			Some(FlowState::Success),
			None,
		);
		let (start, expiry) = (3, 15);
		System::set_block_number(start);
		let (proposal_id1, _): (H256, _) = <Test as Config>::Randomness::random(&vec![0]);
		let (proposal_id2, _): (H256, _) = <Test as Config>::Randomness::random(&vec![1]);
		let (proposal_id3, _): (H256, _) = <Test as Config>::Randomness::random(&vec![2]);

		assert_ok!(Signal::general_proposal(
			Origin::signed(ACC1),
			campaign_id,   // context id
			vec![1, 2, 3], // title
			vec![1, 2, 3], // cid
			start,         // start
			expiry         // expiry
		));
		assert_ok!(Signal::withdraw_proposal(
			Origin::signed(ACC1), // origin
			campaign_id,          // context id
			vec![1, 2, 3],        // title
			vec![1, 2, 3],        // cid
			10,                   // amount
			start,                // start
			expiry                // expiry
		));
		for i in 1..5 {
			assert_ok!(Signal::simple_vote(Origin::signed(i), proposal_id1, i < 4));
		}
		for i in 1..5 {
			assert_ok!(Signal::simple_vote(Origin::signed(i), proposal_id2, i == 5));
		}

		let mut events_before = System::events().len();
		assert_eq!(events_before, 19);
		Signal::on_finalize(start);
		assert_eq!(System::events().len(), events_before);

		System::set_block_number(expiry);
		Signal::on_finalize(expiry);
		let mut events = System::events();
		assert_eq!(events.len(), events_before + 2);

		let withdrawal_event = events.pop().unwrap().event;
		let general_event = events.pop().unwrap().event;
		assert_eq!(
			withdrawal_event,
			Event::Signal(crate::Event::ProposalRejected {
				proposal_id: proposal_id2
			})
		);
		assert_eq!(<ProposalStates<Test>>::get(proposal_id2), ProposalState::Rejected);

		assert_eq!(
			general_event,
			Event::Signal(crate::Event::ProposalApproved {
				proposal_id: proposal_id1
			})
		);
		assert_eq!(<ProposalStates<Test>>::get(proposal_id1), ProposalState::Accepted);

		events_before = 21;
		assert_ok!(Signal::withdraw_proposal(
			Origin::signed(ACC1), // origin
			campaign_id,          // context id
			vec![1, 2, 3],        // title
			vec![1, 2, 3],        // cid
			10,                   // amount
			15,                   // start
			16                    // expiry
		));
		assert_eq!(System::events().len(), events_before + 1);

		<<Test as Config>::Currency as MultiReservableCurrency<AccountId>>::reserve(
			<Test as Config>::ProtocolTokenId::get(),
			&TREASURY_ACC,
			25,
		)
		.expect("Failed to reserve treasury balance");
		assert_ok!(Signal::simple_vote(Origin::signed(ACC1), proposal_id3, true));
		assert_ok!(Signal::simple_vote(Origin::signed(ACC2), proposal_id3, true));
		assert_eq!(System::events().len(), events_before + 6);
		System::set_block_number(16);
		Signal::on_finalize(16);
		let mut events = System::events();
		assert_eq!(events.len(), events_before + 6);
		assert_eq!(
			events.pop().unwrap().event,
			Event::Signal(crate::Event::ProposalVoted {
				sender_id: ACC2,
				proposal_id: proposal_id3,
				vote: true
			})
		);
		assert_eq!(
			events.pop().unwrap().event,
			Event::Signal(crate::Event::WithdrawalGranted {
				proposal_id: proposal_id3,
				context_id: campaign_id,
				body_id: org_id
			})
		);
        // TODO: Fix this test
		// assert_eq!(
		// 	events.pop().unwrap().event,
		// 	Event::Tokens(TokensEvent::Unreserved(
		// 		<Test as Config>::PaymentTokenId::get(),
		// 		TREASURY_ACC,
		// 		10
		// 	))
		// );
		assert_eq!(<CampaignBalanceUsed<Test>>::get(campaign_id), 10);
		assert_eq!(<ProposalStates<Test>>::get(proposal_id3), ProposalState::Finalized);
	});
}
