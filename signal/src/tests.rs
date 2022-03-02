#[cfg(test)]

use super::{
	Pallet as SignalPallet,
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
	Nonce,
	Config,
	Error,
	Event as SignalEvent,
	voting_structs::{Proposal, ProposalMetadata},
	voting_enums::{VotingType, ProposalType, ProposalState},
	mock::{ACC1, ACC2, ExtBuilder, System, Origin, Test, Event, control_fixture}
};
use support::{ControlPalletStorage, ControlState, ControlMemberState};
use sp_runtime::traits::BadOrigin;
use sp_core::H256;
use frame_support::{assert_ok, assert_noop, traits::{Randomness}};
use frame_system;



#[test]
fn general_proposal_success() {
	ExtBuilder::default().build().execute_with(|| {
		System::set_block_number(3);
		let nonce = vec![0];
		let (proposal_id, _): (H256, _) = <Test as Config>::Randomness::random(&nonce);
		let ctx_id = H256::random();
		assert_ok!(
			SignalPallet::<Test>::general_proposal(
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
			Event::from(
				SignalEvent::Proposal {
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
			SignalPallet::<Test>::general_proposal(
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
fn general_proposal_error() {
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
			SignalPallet::<Test>::general_proposal(
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
			SignalPallet::<Test>::general_proposal(
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
			SignalPallet::<Test>::general_proposal(
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
			SignalPallet::<Test>::general_proposal(
				Origin::signed(ACC1),
				ctx_id,  // context id
				vec![1,2,3],  // title
				vec![1,2,3],  // cid
				System::block_number(),  // start
				System::block_number()  // expiry
			),
			Error::<Test>::OutOfBounds
		);

		control_fixture.with(|val|val.borrow_mut().body_member_state(ControlMemberState::Inactive));
		assert_noop!(
			SignalPallet::<Test>::general_proposal(
				Origin::signed(ACC1),
				ctx_id,  // context id
				vec![1,2,3],  // title
				vec![1,2,3],  // cid
				3,  // start
				15  // expiry
			),
			Error::<Test>::AuthorizationError
		);

		control_fixture.with(|val|val.borrow_mut().body_state(ControlState::Inactive));
		assert_noop!(
			SignalPallet::<Test>::general_proposal(
				Origin::signed(ACC1),
				ctx_id,  // context id
				vec![1,2,3],  // title
				vec![1,2,3],  // cid
				3,  // start
				15  // expiry
			),
			Error::<Test>::DAOInactive
		);

		assert_noop!(
			SignalPallet::<Test>::general_proposal(
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
