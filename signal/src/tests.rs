#[cfg(test)]

use super::{
	Proposals,
	Metadata,
	Owners,
	ProposalsByBlock,
	ProposalStates,
	ProposalsCount,
	ProposalsIndex,
	ProposalsArray,
	ProposalsByContextArray,
	ProposalsByContextCount,
	ProposalsByContextIndex,
	ProposalsByOwnerArray,
	ProposalsByOwnerCount,
	ProposalsByOwnerIndex,
	ProposalsByContext,
	ProposalTimeLimit,
	ProposalSimpleVotes,
	ProposalApprovers,
	ProposalDeniers,
	VotedBefore,
	ProposalsByVoterCount,
	ProposalVotesByVoters,
	ProposalsByVoter,
	ProposalVoters,
	CampaignBalanceUsed,
	Nonce,
	Config,
	Error,
	voting_structs::{Proposal, ProposalMetadata},
	voting_enums::{VotingType, ProposalType, ProposalState},
	mock::{
		Test, ExtBuilder,
		ACC1, ACC2,
		System, Origin, Event, Signal,
		control_fixture, flow_fixture
	}
};
use support::{
	ControlState, ControlMemberState,
	FlowState
};
use sp_runtime::traits::BadOrigin;
use sp_core::H256;
use frame_support::{assert_ok, assert_noop, traits::{Randomness, Hooks}};
use frame_system;



#[test]
fn signal_general_proposal_success() {
	ExtBuilder::default().build().execute_with(|| {
		System::set_block_number(3);
		let nonce = vec![0];
		let (proposal_id, _): (H256, _) = <Test as Config>::Randomness::random(&nonce);
		let ctx_id = H256::random();
		assert_ok!(
			Signal::general_proposal(
				Origin::signed(ACC1),
				ctx_id,  // context id
				vec![1,2,3],  // title
				vec![1,2,3],  // cid
				3,  // start
				15  // expiry
			)
		);
		let event = <frame_system::Pallet<Test>>::events().pop()
			.expect("No event generated").event;
		assert_eq!(
			event,
			Event::Signal(
				crate::Event::Proposal {
					sender_id: ACC1,
					proposal_id: proposal_id
				}
			)
		);
		assert_eq!(
			<Proposals<Test>>::get(&proposal_id),
			Proposal {
				proposal_id,
				context_id: ctx_id,
				proposal_type: ProposalType::General,
				voting_type: VotingType::Simple,
				start: 3,
				expiry: 15
			}
		);
		assert_eq!(
			<Metadata<Test>>::get(&proposal_id),
			ProposalMetadata {
				title: vec![1,2,3],
				cid: vec![1,2,3],
				amount: 0
			}
		);
		assert_eq!(<Owners<Test>>::get(&proposal_id), Some(ACC1));
		assert_eq!(<ProposalStates<Test>>::get(&proposal_id), ProposalState::Active);
		assert_eq!(<ProposalsByBlock<Test>>::get(15), vec![proposal_id.clone()]);
		assert_eq!(<ProposalsArray<Test>>::get(0), proposal_id);
		assert_eq!(<ProposalsCount<Test>>::get(), 1);
		assert_eq!(<ProposalsIndex<Test>>::get(&proposal_id), 0);
		assert_eq!(<ProposalsByContextArray<Test>>::get((ctx_id.clone(), 0)), proposal_id);
		assert_eq!(<ProposalsByContextCount<Test>>::get(ctx_id), 1);
		assert_eq!(<ProposalsByContextIndex<Test>>::get((ctx_id, proposal_id)), 0);
		assert_eq!(<ProposalsByOwnerArray<Test>>::get((ACC1, 0)), proposal_id);
		assert_eq!(<ProposalsByOwnerCount<Test>>::get(ACC1), 1);
		assert_eq!(<ProposalsByOwnerIndex<Test>>::get((ACC1, proposal_id)), 0);
		assert_eq!(<ProposalsByContext<Test>>::get(ctx_id), vec![proposal_id.clone()]);
		assert_eq!(<Nonce<Test>>::get(), 1);


		let nonce = vec![1];
		let (new_proposal_id, _): (H256, _) = <Test as Config>::Randomness::random(&nonce);
		assert_ok!(
			Signal::general_proposal(
				Origin::signed(ACC1),
				ctx_id,  // context id
				vec![2,3,4],  // title
				vec![2,3,4],  // cid
				3,  // start
				15  // expiry
			)
		);
		assert_eq!(
			<ProposalsByBlock<Test>>::get(15),
			vec![proposal_id.clone(), new_proposal_id.clone()]
		);
		assert_eq!(<ProposalsArray<Test>>::get(1), new_proposal_id);
		assert_eq!(<ProposalsCount<Test>>::get(), 2);
		assert_eq!(<ProposalsIndex<Test>>::get(&new_proposal_id), 1);
		assert_eq!(<ProposalsByContextArray<Test>>::get((ctx_id.clone(), 1)), new_proposal_id);
		assert_eq!(<ProposalsByContextCount<Test>>::get(ctx_id), 2);
		assert_eq!(<ProposalsByContextIndex<Test>>::get((ctx_id, new_proposal_id)), 1);
		assert_eq!(<ProposalsByOwnerArray<Test>>::get((ACC1, 1)), new_proposal_id);
		assert_eq!(<ProposalsByOwnerCount<Test>>::get(ACC1), 2);
		assert_eq!(<ProposalsByOwnerIndex<Test>>::get((ACC1, new_proposal_id)), 1);
		assert_eq!(
			<ProposalsByContext<Test>>::get(ctx_id),
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
		let ctx_id = H256::random();

		<Proposals<Test>>::insert(ctx_id, Proposal {
			proposal_id: proposal_id,
			context_id: ctx_id,
			proposal_type: ProposalType::General,
			voting_type: VotingType::Simple,
			start: 2,
			expiry: 13
		});
		assert_noop!(
			Signal::general_proposal(
				Origin::signed(ACC1),
				ctx_id,  // context id
				vec![1,2,3],  // title
				vec![1,2,3],  // cid
				3,  // start
				15  // expiry
			),
			Error::<Test>::ProposalExists
		);


		let proposal_ids = vec![H256::random(), H256::random()];
		<ProposalsByBlock<Test>>::insert(15, proposal_ids);
		assert_noop!(
			Signal::general_proposal(
				Origin::signed(ACC1),
				ctx_id,  // context id
				vec![1,2,3],  // title
				vec![1,2,3],  // cid
				3,  // start
				15  // expiry
			),
			Error::<Test>::TooManyProposals
		);

		assert_noop!(
			Signal::general_proposal(
				Origin::signed(ACC1),
				ctx_id,  // context id
				vec![1,2,3],  // title
				vec![1,2,3],  // cid
				3,  // start
				System::block_number() + <ProposalTimeLimit::<Test>>::get() + 1
			),
			Error::<Test>::OutOfBounds
		);
		assert_noop!(
			Signal::general_proposal(
				Origin::signed(ACC1),
				ctx_id,  // context id
				vec![1,2,3],  // title
				vec![1,2,3],  // cid
				System::block_number(),  // start
				System::block_number()  // expiry
			),
			Error::<Test>::OutOfBounds
		);

		control_fixture.with(|val|val.borrow_mut().body_member_state = ControlMemberState::Inactive);
		assert_noop!(
			Signal::general_proposal(
				Origin::signed(ACC1),
				ctx_id,  // context id
				vec![1,2,3],  // title
				vec![1,2,3],  // cid
				3,  // start
				15  // expiry
			),
			Error::<Test>::AuthorizationError
		);

		control_fixture.with(|val|val.borrow_mut().body_state = ControlState::Inactive);
		assert_noop!(
			Signal::general_proposal(
				Origin::signed(ACC1),
				ctx_id,
				vec![1,2,3],
				vec![1,2,3],
				3,
				15
			),
			Error::<Test>::DAOInactive
		);

		assert_noop!(
			Signal::general_proposal(
				Origin::none(),
				ctx_id,  // context id
				vec![1,2,3],  // title
				vec![1,2,3],  // cid
				3,  // start
				15  // expiry
			),
			BadOrigin
		);


	});
}


#[test]
fn signal_withdraw_proposal_success() {
	ExtBuilder::default().build().execute_with(|| {
		System::set_block_number(3);

		let nonce = vec![0];
		let (proposal_id, _): (H256, _) = <Test as Config>::Randomness::random(&nonce);
		let ctx_id = H256::random();
		<CampaignBalanceUsed<Test>>::insert(ctx_id, 5);

		assert_ok!(
			Signal::withdraw_proposal(
				Origin::signed(ACC1),  // origin
				ctx_id,  // context id
				vec![1,2,3],  // title
				vec![1,2,3],  // cid
				10,  // amount
				3,  // start
				15  // expiry
			)
		);
		let event = <frame_system::Pallet<Test>>::events().pop()
			.expect("No event generated").event;
		assert_eq!(
			event,
			Event::Signal(
				crate::Event::ProposalCreated {
					sender_id: ACC1,
					context_id: ctx_id,
					proposal_id,
					amount: 10,
					expiry: 15
				}
			)
		);
		assert_eq!(
			<Proposals<Test>>::get(&proposal_id),
			Proposal {
				proposal_id,
				context_id: ctx_id,
				proposal_type: ProposalType::Withdrawal,
				voting_type: VotingType::Simple,
				start: 3,
				expiry: 15
			}
		);
		assert_eq!(
			<Metadata<Test>>::get(&proposal_id),
			ProposalMetadata {
				title: vec![1,2,3],
				cid: vec![1,2,3],
				amount: 10
			}
		);
		assert_eq!(<Owners<Test>>::get(&proposal_id), Some(ACC1));
		assert_eq!(<ProposalStates<Test>>::get(&proposal_id), ProposalState::Active);
		assert_eq!(<ProposalsByBlock<Test>>::get(15), vec![proposal_id.clone()]);
		assert_eq!(<ProposalsArray<Test>>::get(0), proposal_id);
		assert_eq!(<ProposalsCount<Test>>::get(), 1);
		assert_eq!(<ProposalsIndex<Test>>::get(&proposal_id), 0);
		assert_eq!(<ProposalsByContextArray<Test>>::get((ctx_id.clone(), 0)), proposal_id);
		assert_eq!(<ProposalsByContextCount<Test>>::get(ctx_id), 1);
		assert_eq!(<ProposalsByContextIndex<Test>>::get((ctx_id, proposal_id)), 0);
		assert_eq!(<ProposalsByOwnerArray<Test>>::get((ACC1, 0)), proposal_id);
		assert_eq!(<ProposalsByOwnerCount<Test>>::get(ACC1), 1);
		assert_eq!(<ProposalsByOwnerIndex<Test>>::get((ACC1, proposal_id)), 0);
		assert_eq!(<ProposalsByContext<Test>>::get(ctx_id), vec![proposal_id.clone()]);
		assert_eq!(<Nonce<Test>>::get(), 1);

		let nonce = vec![1];
		let (new_proposal_id, _): (H256, _) = <Test as Config>::Randomness::random(&nonce);
		assert_ok!(
			Signal::general_proposal(
				Origin::signed(ACC1),
				ctx_id,  // context id
				vec![2,3,4],  // title
				vec![2,3,4],  // cid
				3,  // start
				15  // expiry
			)
		);
		assert_eq!(
			<ProposalsByBlock<Test>>::get(15),
			vec![proposal_id.clone(), new_proposal_id.clone()]
		);
		assert_eq!(<ProposalsArray<Test>>::get(1), new_proposal_id);
		assert_eq!(<ProposalsCount<Test>>::get(), 2);
		assert_eq!(<ProposalsIndex<Test>>::get(&new_proposal_id), 1);
		assert_eq!(<ProposalsByContextArray<Test>>::get((ctx_id.clone(), 1)), new_proposal_id);
		assert_eq!(<ProposalsByContextCount<Test>>::get(ctx_id), 2);
		assert_eq!(<ProposalsByContextIndex<Test>>::get((ctx_id, new_proposal_id)), 1);
		assert_eq!(<ProposalsByOwnerArray<Test>>::get((ACC1, 1)), new_proposal_id);
		assert_eq!(<ProposalsByOwnerCount<Test>>::get(ACC1), 2);
		assert_eq!(<ProposalsByOwnerIndex<Test>>::get((ACC1, new_proposal_id)), 1);
		assert_eq!(
			<ProposalsByContext<Test>>::get(ctx_id),
			vec![proposal_id.clone(), new_proposal_id.clone()]
		);
		assert_eq!(<Nonce<Test>>::get(), 2);

	});
}

#[test]
fn signal_withdraw_proposal_error() {
	ExtBuilder::default().build().execute_with(|| {
		System::set_block_number(3);

		let nonce = vec![0];
		let (proposal_id, _): (H256, _) = <Test as Config>::Randomness::random(&nonce);
		let ctx_id = H256::random();
		<CampaignBalanceUsed<Test>>::insert(ctx_id, 5);

		<Proposals<Test>>::insert(ctx_id, Proposal {
			proposal_id: proposal_id,
			context_id: ctx_id,
			proposal_type: ProposalType::Withdrawal,
			voting_type: VotingType::Simple,
			start: 2,
			expiry: 13
		});
		assert_noop!(
			Signal::withdraw_proposal(
				Origin::signed(ACC1),  // origin
				ctx_id,  // context id
				vec![1,2,3],  // title
				vec![1,2,3],  // cid
				10,  // amount
				3,  // start
				15  // expiry
			),
			Error::<Test>::ProposalExists
		);

		let proposal_ids = vec![H256::random(), H256::random()];
		<ProposalsByBlock<Test>>::insert(15, proposal_ids);
		assert_noop!(
			Signal::withdraw_proposal(
				Origin::signed(ACC1),  // origin
				ctx_id,  // context id
				vec![1,2,3],  // title
				vec![1,2,3],  // cid
				10,  // amount
				3,  // start
				15  // expiry
			),
			Error::<Test>::TooManyProposals
		);

		<CampaignBalanceUsed<Test>>::insert(ctx_id, 5);
		flow_fixture.with(|v| v.borrow_mut().campaign_balance = 10 );
		assert_noop!(
			Signal::withdraw_proposal(
				Origin::signed(ACC1),  // origin
				ctx_id,  // context id
				vec![1,2,3],  // title
				vec![1,2,3],  // cid
				10,  // amount
				3,  // start
				15  // expiry
			),
			Error::<Test>::BalanceInsufficient
		);

		<CampaignBalanceUsed<Test>>::insert(ctx_id, 11);
		assert_noop!(
			Signal::withdraw_proposal(
				Origin::signed(ACC1),  // origin
				ctx_id,  // context id
				vec![1,2,3],  // title
				vec![1,2,3],  // cid
				10,  // amount
				3,  // start
				15  // expiry
			),
			Error::<Test>::BalanceInsufficient
		);

		<CampaignBalanceUsed<Test>>::insert(ctx_id, 5);
		flow_fixture.with(|v| v.borrow_mut().campaign_state = FlowState::Failed );
		<CampaignBalanceUsed<Test>>::insert(ctx_id, 11);
		assert_noop!(
			Signal::withdraw_proposal(
				Origin::signed(ACC1),  // origin
				ctx_id,  // context id
				vec![1,2,3],  // title
				vec![1,2,3],  // cid
				10,  // amount
				3,  // start
				15  // expiry
			),
			Error::<Test>::CampaignFailed
		);

		assert_noop!(
			Signal::withdraw_proposal(
				Origin::none(),  // origin
				ctx_id,  // context id
				vec![1,2,3],  // title
				vec![1,2,3],  // cid
				10,  // amount
				3,  // start
				15  // expiry
			),
			BadOrigin
		);
	});
}

#[test]
fn signal_simple_vote_success() {
	ExtBuilder::default().build().execute_with(|| {
		System::set_block_number(3);

		let nonce = vec![0];
		let (proposal_id, _): (H256, _) = <Test as Config>::Randomness::random(&nonce);
		let ctx_id = H256::random();
		<Proposals<Test>>::insert(proposal_id, Proposal {
			proposal_id: proposal_id,
			context_id: ctx_id,
			proposal_type: ProposalType::General,
			voting_type: VotingType::Simple,
			start: 2,
			expiry: 13
		});
		<ProposalStates<Test>>::insert(proposal_id, ProposalState::Active);

		assert_ok!(
			Signal::simple_vote(Origin::signed(ACC2), proposal_id, true)
		);
		let event = <frame_system::Pallet<Test>>::events().pop()
			.expect("No event generated").event;
		assert_eq!(
			event,
			Event::Signal(
				crate::Event::ProposalVoted {
					sender_id: ACC2,
					proposal_id,
					vote: true
				}
			)
		);
		assert_eq!(<ProposalSimpleVotes<Test>>::get(&proposal_id), (1, 0));
		assert_eq!(<ProposalApprovers<Test>>::get(&proposal_id), 1);
		assert_eq!(<VotedBefore<Test>>::get((ACC2, proposal_id)), true);
		assert_eq!(<ProposalsByVoterCount<Test>>::get(ACC2), 1);
		assert_eq!(<ProposalVotesByVoters<Test>>::get(proposal_id), vec![(ACC2, true)]);
		assert_eq!(<ProposalsByVoter<Test>>::get(ACC2), vec![(proposal_id, true)]);
		assert_eq!(<ProposalVoters<Test>>::get(proposal_id), vec![ACC2]);

		assert_ok!(
			Signal::simple_vote(Origin::signed(ACC1), proposal_id, false)
		);
		let event = <frame_system::Pallet<Test>>::events().pop()
			.expect("No event generated").event;
		assert_eq!(
			event,
			Event::Signal(
				crate::Event::ProposalVoted {
					sender_id: ACC1,
					proposal_id,
					vote: false
				}
			)
		);
		assert_eq!(<ProposalSimpleVotes<Test>>::get(&proposal_id), (1, 1));
		assert_eq!(<ProposalApprovers<Test>>::get(&proposal_id), 1);
		assert_eq!(<ProposalDeniers<Test>>::get(&proposal_id), 1);
		assert_eq!(<VotedBefore<Test>>::get((ACC1, proposal_id)), true);
		assert_eq!(<ProposalsByVoterCount<Test>>::get(ACC1), 1);
		assert_eq!(<ProposalVotesByVoters<Test>>::get(proposal_id), vec![(ACC2, true), (ACC1, false)]);
		assert_eq!(<ProposalsByVoter<Test>>::get(ACC1), vec![(proposal_id, false)]);
		assert_eq!(<ProposalVoters<Test>>::get(proposal_id), vec![ACC1, ACC2]);


		let nonce = vec![1];
		let (proposal_id, _): (H256, _) = <Test as Config>::Randomness::random(&nonce);
		let ctx_id = H256::random();
		<Proposals<Test>>::insert(proposal_id, Proposal {
			proposal_id: proposal_id,
			context_id: ctx_id,
			proposal_type: ProposalType::Withdrawal,
			voting_type: VotingType::Simple,
			start: 2,
			expiry: 13
		});
		<ProposalStates<Test>>::insert(proposal_id, ProposalState::Active);
		flow_fixture.with(|v| v.borrow_mut().campaign_contributors_count = 1);

		assert_ok!(
			Signal::simple_vote(Origin::signed(ACC1), proposal_id, false)
		);
		let event = <frame_system::Pallet<Test>>::events().pop()
			.expect("No event generated").event;
		assert_eq!(
			event,
			Event::Signal(
				crate::Event::ProposalVoted {
					sender_id: ACC1,
					proposal_id,
					vote: false
				}
			)
		);
		assert_eq!(<ProposalSimpleVotes<Test>>::get(&proposal_id), (0, 1));
		assert_eq!(<ProposalApprovers<Test>>::get(&proposal_id), 0);
		assert_eq!(<ProposalDeniers<Test>>::get(&proposal_id), 1);

		// assert_ok!(
		// 	Signal::simple_vote(Origin::signed(ACC2), proposal_id, true)
		// );
		// let event = <frame_system::Pallet<Test>>::events().pop()
		// 	.expect("No event generated").event;
		// assert_eq!(
		// 	event,
		// 	Event::Signal(
		// 		crate::Event::ProposalVoted {
		// 			sender_id: ACC2,
		// 			proposal_id,
		// 			vote: true
		// 		}
		// 	)
		// );
		// assert_eq!(<ProposalSimpleVotes<Test>>::get(&proposal_id), (1, 0));
		// assert_eq!(<ProposalApprovers<Test>>::get(&proposal_id), 1);

	});
}


#[test]
fn signal_simple_vote_error() {
	ExtBuilder::default().build().execute_with(|| {
		System::set_block_number(3);

		let nonce = vec![0];
		let (proposal_id, _): (H256, _) = <Test as Config>::Randomness::random(&nonce);
		let ctx_id = H256::random();
		<Proposals<Test>>::insert(proposal_id, Proposal {
			proposal_id: proposal_id,
			context_id: ctx_id,
			proposal_type: ProposalType::General,
			voting_type: VotingType::Simple,
			start: 2,
			expiry: System::block_number()
		});
		<ProposalStates<Test>>::insert(proposal_id, ProposalState::Active);
		assert_noop!(
			Signal::simple_vote(
				Origin::signed(ACC1),
				proposal_id,
				true
			),
			Error::<Test>::ProposalExpired
		);

		<VotedBefore<Test>>::insert((ACC1, proposal_id), true);
		assert_noop!(
			Signal::simple_vote(
				Origin::signed(ACC1),
				proposal_id,
				true
			),
			Error::<Test>::AlreadyVoted
		);

		<ProposalStates<Test>>::insert(proposal_id, ProposalState::Expired);
		assert_noop!(
			Signal::simple_vote(
				Origin::signed(ACC1),
				proposal_id,
				true
			),
			Error::<Test>::ProposalEnded
		);

		assert_noop!(
			Signal::simple_vote(
				Origin::signed(ACC1),
				H256::random(),
				true
			),
			Error::<Test>::ProposalUnknown
		);

		assert_noop!(
			Signal::simple_vote(
				Origin::none(),
				proposal_id,
				true
			),
			BadOrigin
		);
	});
}

#[test]
fn signal_on_finalize_success() {
	ExtBuilder::default().build().execute_with(|| {
		let bn = 3;
		System::set_block_number(bn);

		// create 4 proposals
		// two general and two withdrawal, one expired and one not
		Signal::on_finalize(bn);
	});
}
