#![cfg(test)]

use frame_support::{assert_noop, assert_ok};
use pallet_rmrk_core::Nfts;
use rmrk_traits::AccountIdOrCollectionNftTuple;
use sp_core::H256;

use crate::mock::{
    new_test_ext, Origin, Test,
    //System, 
    Battlepass, Control, RmrkCore,
    ALICE, BOB, EVA, TOM, PROTOCOL_TOKEN_ID, PAYMENT_TOKEN_ID, DOLLARS, 
    AccountId, StringLimit, //Event
};
use gamedao_control::types::{AccessModel, FeeModel, OrgType, Org};

use super::*;

fn create_org() -> H256 {
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

    org_id
}

fn get_battlepass_hash(creator: AccountId, org_id: H256, season: u32, price: u16, collection_id: u32) -> H256 {
    let battlepass = types::Battlepass {
        creator,
        org_id,
        name: string(),
        cid: string(),
        season,
        price,
        collection_id
    };
    
    <Test as frame_system::Config>::Hashing::hash_of(&battlepass)
}

fn create_battlepass(org_id: H256) -> H256 {
    let creator = ALICE;
    let season = Battlepass::get_battlepass_info(&org_id).0 + 1;
    let price = 10;
    let collection_id = pallet_rmrk_core::CollectionIndex::<Test>::get();
    
    assert_ok!(
        Battlepass::create_battlepass(Origin::signed(creator), org_id, string(), string(), price)
    );
    
    get_battlepass_hash(creator, org_id, season, price, collection_id)
}

fn get_reward_hash(battlepass_id: H256, level: u8, transferable: bool, collection_id: u32) -> H256 {
    let reward = Reward{
        battlepass_id,
        name: string(),
        cid: string(),
        level,
        transferable,
        collection_id
    };
    
    <Test as frame_system::Config>::Hashing::hash_of(&reward)
}

fn create_reward(battlepass_id: H256) -> H256 {
    let creator = ALICE;
    let level = 1;
    let max = 1;
    let transferable = true;
    let collection_id = (Rewards::<Test>::iter().count() + 1) as u32;

    assert_ok!(
        Battlepass::create_reward(Origin::signed(creator), battlepass_id, string(), string(), Some(max), level, transferable)
    );

    get_reward_hash(battlepass_id, level, transferable, collection_id)
}

fn add_member(org_id: H256, account: AccountId) {
    assert_ok!(
        Control::add_member(Origin::signed(account), org_id, account)
    );
}

fn string() -> BoundedVec<u8, StringLimit>{
    BoundedVec::truncate_from(vec![1,2])
}

#[test]
fn should_be_prime() {
    new_test_ext().execute_with(|| {
        let org_id = create_org();
        let prime = Battlepass::is_prime(&org_id, ALICE);
        assert_eq!(prime.is_ok(), true);
        assert_eq!(prime.unwrap(), true);
    })
}

#[test]
fn create_battlepass_test(){
    new_test_ext().execute_with(|| {
        let org_id = create_org();
        let wrong_org_id = <Test as frame_system::Config>::Hashing::hash_of(&"123");
        let bounded_str = BoundedVec::truncate_from(vec![1,2]);
        let creator = ALICE;
        let not_creator = BOB;
        let not_member = EVA;
        let battlepass_id_1 = get_battlepass_hash(creator, org_id, 1, 10, 0);
        let battlepass_id_2 = get_battlepass_hash(creator, org_id, 2, 10, 1);

        // Should not create for non existing Org
        assert_noop!(
            Battlepass::create_battlepass(Origin::signed(creator), wrong_org_id, bounded_str.clone(), bounded_str.clone(), 10),
            Error::<Test>::OrgUnknownOrInactive
        );

        // Should not create for inactive Org
        assert_ok!(
            Control::disable_org(Origin::signed(creator), org_id)
        );
        assert_noop!(
            Battlepass::create_battlepass(Origin::signed(creator), org_id, bounded_str.clone(), bounded_str.clone(), 10),
            Error::<Test>::OrgUnknownOrInactive
        );
        assert_ok!(
            Control::enable_org(Origin::signed(creator), org_id)
        );
        
        // Should not create if origin is not a Prime
        assert_ok!(
            Control::add_member(Origin::signed(not_creator), org_id, not_creator)
        );
        assert_noop!(
            Battlepass::create_battlepass(Origin::signed(not_creator), org_id, bounded_str.clone(), bounded_str.clone(), 10),
            Error::<Test>::AuthorizationError
        );
        assert_noop!(
            Battlepass::create_battlepass(Origin::signed(not_member), org_id, bounded_str.clone(), bounded_str.clone(), 10),
            Error::<Test>::AuthorizationError
        );

        // Should create new Battlepass
        assert_ok!(
            Battlepass::create_battlepass(Origin::signed(creator), org_id, bounded_str.clone(), bounded_str.clone(), 10)
        );
        // Check if NFT collection created
        assert_eq!(pallet_rmrk_core::Collections::<Test>::contains_key(0), true);
        // Check if Battlepass created
        let battlepass = Battlepasses::<Test>::get(battlepass_id_1);
        assert_eq!(battlepass.is_some(), true);
        assert_eq!(battlepass.unwrap().season, 1);
        assert_eq!(Battlepasses::<Test>::contains_key(battlepass_id_1), true);
        // Check if BattlepassState is DRAFT
        assert_eq!(Battlepass::get_battlepass_state(battlepass_id_1), Some(types::BattlepassState::DRAFT));
        // Check if BattlepassInfo created (count = 1, active = None)
        let bp_info = BattlepassInfoByOrg::<Test>::get(org_id);
        assert_eq!(bp_info.is_some(), true);
        assert_eq!(bp_info.clone().unwrap().count, 1);
        assert_eq!(bp_info.clone().unwrap().active, None);
        
        // Should create another Battlepass (may be multiple in DRAFT state)
        assert_ok!(
            Battlepass::create_battlepass(Origin::signed(creator), org_id, bounded_str.clone(), bounded_str.clone(), 10)
        );
        // Check if NFT collection created
        assert_eq!(pallet_rmrk_core::Collections::<Test>::contains_key(1), true);
        // Check if Battlepass created
        let battlepass = Battlepasses::<Test>::get(battlepass_id_2);
        assert_eq!(battlepass.is_some(), true);
        assert_eq!(battlepass.unwrap().season, 2);
        assert_eq!(Battlepasses::<Test>::contains_key(battlepass_id_2), true);
        // Check if BattlepassState is DRAFT
        assert_eq!(Battlepass::get_battlepass_state(battlepass_id_2), Some(types::BattlepassState::DRAFT));
        // Check if BattlepassInfo created (count = 2, active = None)
        let bp_info = BattlepassInfoByOrg::<Test>::get(org_id);
        assert_eq!(bp_info.is_some(), true);
        assert_eq!(bp_info.clone().unwrap().count, 2);
        assert_eq!(bp_info.clone().unwrap().active, None);

        // Check events (collection created, battlepass created)
        // println!("Events: {}", System::events().len());
        // System::assert_has_event(Event::Battlepass(crate::Event::BattlepassCreated { org_id, battlepass_id, season: 1 }));
        // System::assert_has_event(mock::Event::RmrkCore(pallet_rmrk_core::Event::CollectionCreated { issuer: creator, collection_id: 0 }));
    })
}

#[test]
fn activate_battlepass_test() {
    new_test_ext().execute_with(|| {
        let org_id = create_org();
        let battlepass_id = create_battlepass(org_id);
        let wrong_battlepass_id = <Test as frame_system::Config>::Hashing::hash_of(&"123");
        let creator = ALICE;
        let not_creator = BOB;
        let not_member = EVA;
        let bounded_str = BoundedVec::truncate_from(vec![1,2]);

        // Should not activate unknown Battlepass
        assert_noop!(
            Battlepass::activate_battlepass(Origin::signed(creator), wrong_battlepass_id),
            Error::<Test>::BattlepassUnknown
        );

        // Should not activate if Org is inactive
        assert_ok!(
            Control::disable_org(Origin::signed(creator), org_id)
        );
        assert_noop!(
            Battlepass::activate_battlepass(Origin::signed(creator), battlepass_id),
            Error::<Test>::OrgUnknownOrInactive
        );
        assert_ok!(
            Control::enable_org(Origin::signed(creator), org_id)
        );

        // Should not activate if origin is not a Prime
        assert_ok!(
            Control::add_member(Origin::signed(not_creator), org_id, not_creator)
        );
        assert_noop!(
            Battlepass::activate_battlepass(Origin::signed(not_creator), battlepass_id),
            Error::<Test>::AuthorizationError
        );
        assert_noop!(
            Battlepass::activate_battlepass(Origin::signed(not_member), battlepass_id),
            Error::<Test>::AuthorizationError
        );

        // Should activate battlepass
        assert_ok!(
            Battlepass::activate_battlepass(Origin::signed(creator), battlepass_id)
        );
        // Check if BattlepassState is ACTIVE
        assert_eq!(Battlepass::get_battlepass_state(battlepass_id), Some(types::BattlepassState::ACTIVE));
        // Check if BattlepassInfo changed (count = 1, active = battlepass_id)
        let bp_info = BattlepassInfoByOrg::<Test>::get(org_id);
        assert_eq!(bp_info.is_some(), true);
        assert_eq!(bp_info.clone().unwrap().count, 1);
        assert_eq!(bp_info.clone().unwrap().active, Some(battlepass_id));


        // Should not activate already active Battlepass
        assert_noop!(
            Battlepass::activate_battlepass(Origin::signed(creator), battlepass_id),
            Error::<Test>::BattlepassStateWrong
        );

        // Should not create if Org has an active battlepass
        assert_noop!(
            Battlepass::create_battlepass(Origin::signed(creator), org_id, bounded_str.clone(), bounded_str.clone(), 10),
            Error::<Test>::BattlepassExists
        );

        // Check events (battlepass activated)
        // println!("Events: {}", System::events().len());
        // System::assert_has_event(Event::Battlepass(crate::Event::BattlepassActivated { by_who: creator, org_id, battlepass_id } ));

    })
}

#[test]
fn deactivate_battlepass_test() {
    new_test_ext().execute_with(|| {
        let org_id = create_org();
        let battlepass_id = create_battlepass(org_id);
        let wrong_battlepass_id = <Test as frame_system::Config>::Hashing::hash_of(&"123");
        let creator = ALICE;
        let not_creator = BOB;
        let not_member = EVA;

        // Should not deactivate unknown Battlepass
        assert_noop!(
            Battlepass::conclude_battlepass(Origin::signed(creator), wrong_battlepass_id),
            Error::<Test>::BattlepassUnknown
        );

        // Should not deactivate Battlepass in DRAFT state
        assert_noop!(
            Battlepass::conclude_battlepass(Origin::signed(creator), battlepass_id),
            Error::<Test>::BattlepassStateWrong
        );

        // Should not deactivate if origin is not a Prime
        assert_ok!(
            Battlepass::activate_battlepass(Origin::signed(creator), battlepass_id)
        );
        assert_ok!(
            Control::add_member(Origin::signed(not_creator), org_id, not_creator)
        );
        assert_noop!(
            Battlepass::conclude_battlepass(Origin::signed(not_creator), battlepass_id),
            Error::<Test>::AuthorizationError
        );
        assert_noop!(
            Battlepass::conclude_battlepass(Origin::signed(not_member), battlepass_id),
            Error::<Test>::AuthorizationError
        );

        // Should deactivate battlepass
        assert_ok!(
            Battlepass::conclude_battlepass(Origin::signed(creator), battlepass_id)
        );
        // Check if BattlepassState is ENDED
        assert_eq!(Battlepass::get_battlepass_state(battlepass_id), Some(types::BattlepassState::ENDED));
        // Check if BattlepassInfo changed (count = 1, active = None)
        let bp_info = BattlepassInfoByOrg::<Test>::get(org_id);
        assert_eq!(bp_info.is_some(), true);
        assert_eq!(bp_info.clone().unwrap().count, 1);
        assert_eq!(bp_info.clone().unwrap().active, None);

        // Should not activate already ended Battlepass
        assert_noop!(
            Battlepass::activate_battlepass(Origin::signed(creator), battlepass_id),
            Error::<Test>::BattlepassStateWrong
        );

        // Should not deactivate already ended Battlepass
        assert_noop!(
            Battlepass::conclude_battlepass(Origin::signed(creator), battlepass_id),
            Error::<Test>::BattlepassStateWrong
        );
     
        // Check events 

    })
}

#[test]
fn claim_battlepass_test() {
    new_test_ext().execute_with(|| {
        let org_id = create_org();
        let battlepass_id = create_battlepass(org_id);
        let wrong_battlepass_id = <Test as frame_system::Config>::Hashing::hash_of(&"123");
        let creator = ALICE;
        let not_creator = BOB;
        let not_creator_2 = TOM;
        let not_member = EVA;
        add_member(org_id, not_creator);
        add_member(org_id, not_creator_2);

        // Should not claim unknown Battlepass
        assert_noop!(
            Battlepass::claim_battlepass(Origin::signed(creator), wrong_battlepass_id, creator),
            Error::<Test>::BattlepassUnknown
        );

        // Should not claim Battlepass in DRAFT state
        assert_noop!(
            Battlepass::claim_battlepass(Origin::signed(creator), battlepass_id, creator),
            Error::<Test>::BattlepassStateWrong
        );
     
        // Should not claim if Org is inactive
        assert_ok!(
            Battlepass::activate_battlepass(Origin::signed(creator), battlepass_id)
        );
        assert_ok!(
            Control::disable_org(Origin::signed(creator), org_id)
        );
        assert_noop!(
            Battlepass::claim_battlepass(Origin::signed(creator), battlepass_id, creator),
            Error::<Test>::OrgUnknownOrInactive
        );
        assert_ok!(
            Control::enable_org(Origin::signed(creator), org_id)
        );

        // Should not claim for others if origin is not a Prime
        assert_noop!(
            Battlepass::claim_battlepass(Origin::signed(not_creator), battlepass_id, creator),
            Error::<Test>::AuthorizationError
        );
        assert_noop!(
            Battlepass::claim_battlepass(Origin::signed(not_member), battlepass_id, creator),
            Error::<Test>::AuthorizationError
        );

        // Should not claim for non members
        assert_noop!(
            Battlepass::claim_battlepass(Origin::signed(creator), battlepass_id, not_member),
            Error::<Test>::NotMember
        );
        
        // Should claim for others if origin is a Prime
        assert_ok!(
            Battlepass::claim_battlepass(Origin::signed(creator), battlepass_id, not_creator)
        );
        // Check if ClaimedBattlepasses record created
        let nft_id = ClaimedBattlepasses::<Test>::get(battlepass_id, not_creator);
        assert_eq!(nft_id.is_some(), true);
        assert_eq!(nft_id.unwrap(), 0);
        // Check if NFT minted
        assert_eq!(pallet_rmrk_core::Nfts::<Test>::contains_key(0, 0), true);

        // Should claim for self
        assert_ok!(
            Battlepass::claim_battlepass(Origin::signed(not_creator_2), battlepass_id, not_creator_2)
        );
        // Check if ClaimedBattlepasses record created
        let nft_id = ClaimedBattlepasses::<Test>::get(battlepass_id, not_creator_2);
        assert_eq!(nft_id.is_some(), true);
        assert_eq!(nft_id.unwrap(), 1);
        // Check if NFT minted
        assert_eq!(pallet_rmrk_core::Nfts::<Test>::contains_key(0, 1), true);

        // Should not claim if it was already claimed
        assert_noop!(
            Battlepass::claim_battlepass(Origin::signed(not_creator), battlepass_id, not_creator),
            Error::<Test>::BattlepassClaimed
        );

        // Should not claim Battlepass in ENDED state
        assert_ok!(
            Battlepass::conclude_battlepass(Origin::signed(creator), battlepass_id)
        );
        assert_noop!(
            Battlepass::claim_battlepass(Origin::signed(creator), battlepass_id, creator),
            Error::<Test>::BattlepassStateWrong
        );
        // Check events 

    })
}

#[test]
fn set_points_test() {
    new_test_ext().execute_with(|| {
        let org_id = create_org();
        let battlepass_id = create_battlepass(org_id);
        let wrong_battlepass_id = <Test as frame_system::Config>::Hashing::hash_of(&"123");
        let creator = ALICE;
        let not_creator = BOB;
        let not_member = EVA;
        let bot = 333u32;

        // Should not set if Battlepass unknown
        assert_noop!(
            Battlepass::set_points(Origin::signed(creator), wrong_battlepass_id, creator, 10),
            Error::<Test>::BattlepassUnknown
        );

        // Should not set if Battlepass in DRAFT state
        assert_noop!(
            Battlepass::set_points(Origin::signed(creator), battlepass_id, creator, 10),
            Error::<Test>::BattlepassStateWrong
        );

        // Should not set if Org is inactive
        assert_ok!(
            Battlepass::activate_battlepass(Origin::signed(creator), battlepass_id)
        );
        assert_ok!(
            Control::disable_org(Origin::signed(creator), org_id)
        );
        assert_noop!(
            Battlepass::set_points(Origin::signed(creator), battlepass_id, creator, 10),
            Error::<Test>::OrgUnknownOrInactive
        );
        assert_ok!(
            Control::enable_org(Origin::signed(creator), org_id)
        );

        // Should not set if origin is not a Prime
        assert_ok!(
            Control::add_member(Origin::signed(not_creator), org_id, not_creator)
        );
        assert_noop!(
            Battlepass::set_points(Origin::signed(not_creator), battlepass_id, not_creator, 10),
            Error::<Test>::AuthorizationError
        );
        assert_noop!(
            Battlepass::set_points(Origin::signed(not_member), battlepass_id, creator, 10),
            Error::<Test>::AuthorizationError
        );

        // Should not set by Bot if Bot is not authorized
        assert_noop!(
            Battlepass::set_points(Origin::signed(bot), battlepass_id, creator, 10),
            Error::<Test>::AuthorizationError
        );
        
        // Should not set for non members
        assert_noop!(
            Battlepass::set_points(Origin::signed(creator), battlepass_id, not_member, 10),
            Error::<Test>::NotMember
        );

        // Should set points by Prime
        assert_ok!(
            Battlepass::set_points(Origin::signed(creator), battlepass_id, not_creator, 10)
        );
        // Check if Points record updated
        assert_eq!(Points::<Test>::get(battlepass_id, not_creator) == 10, true);

        // Should set points by Bot
        assert_ok!(
            Battlepass::add_bot(Origin::signed(creator), battlepass_id, bot)
        );
        assert_ok!(
            Battlepass::set_points(Origin::signed(bot), battlepass_id, not_creator, 20)
        );
        // Check if Points record updated
        assert_eq!(Points::<Test>::get(battlepass_id, not_creator) == 20, true);

        // Should not set if Battlepass in ENDED state
        assert_ok!(
            Battlepass::conclude_battlepass(Origin::signed(creator), battlepass_id)
        );
        assert_noop!(
            Battlepass::set_points(Origin::signed(creator), battlepass_id, creator, 10),
            Error::<Test>::BattlepassStateWrong
        );
    
        // Check events 

    })
}

#[test]
fn create_reward_test() {
    new_test_ext().execute_with(|| {
        let org_id = create_org();
        let battlepass_id = create_battlepass(org_id);
        let wrong_battlepass_id = <Test as frame_system::Config>::Hashing::hash_of(&"123");
        let bounded_str = BoundedVec::truncate_from(vec![1,2]);
        let creator = ALICE;
        let not_creator = BOB;
        let not_member = EVA;
        

        // Should not create if Battlepass unknown
        assert_noop!(
            Battlepass::create_reward(Origin::signed(creator), wrong_battlepass_id, bounded_str.clone(), bounded_str.clone(), Some(1), 1, true),
            Error::<Test>::BattlepassUnknown
        );

        // Should not create if Org is inactive
        assert_ok!(
            Control::disable_org(Origin::signed(creator), org_id)
        );
        assert_noop!(
            Battlepass::create_reward(Origin::signed(creator), battlepass_id, bounded_str.clone(), bounded_str.clone(), Some(1), 1, true),
            Error::<Test>::OrgUnknownOrInactive
        );
        assert_ok!(
            Control::enable_org(Origin::signed(creator), org_id)
        );

        // Should not create if origin is not a Prime
        assert_ok!(
            Control::add_member(Origin::signed(not_creator), org_id, not_creator)
        );
        assert_noop!(
            Battlepass::create_reward(Origin::signed(not_creator), battlepass_id, bounded_str.clone(), bounded_str.clone(), Some(1), 1, true),
            Error::<Test>::AuthorizationError
        );
        assert_noop!(
            Battlepass::create_reward(Origin::signed(not_member), battlepass_id, bounded_str.clone(), bounded_str.clone(), Some(1), 1, true),
            Error::<Test>::AuthorizationError
        );

        // Should create Reward if Battlepass state is DRAFT
        assert_ok!(
            Battlepass::create_reward(Origin::signed(creator), battlepass_id, bounded_str.clone(), bounded_str.clone(), Some(1), 1, true)
        );
        // Check if NFT collection created
        assert_eq!(pallet_rmrk_core::Collections::<Test>::contains_key(1), true);
        // Check if Reward created
        let reward_id = get_reward_hash(battlepass_id, 1, true, 1);
        let reward = Rewards::<Test>::get(reward_id);
        assert_eq!(reward.is_some(), true);
        assert_eq!(reward.unwrap().collection_id, 1);
        // Check if RewardState is ACTIVE
        assert_eq!(RewardStates::<Test>::get(reward_id), Some(RewardState::ACTIVE));

        // Should create Reward if Battlepass state is ACTIVE
        assert_ok!(
            Battlepass::activate_battlepass(Origin::signed(creator), battlepass_id)
        );
        assert_ok!(
            Battlepass::create_reward(Origin::signed(creator), battlepass_id, bounded_str.clone(), bounded_str.clone(), Some(1), 1, true)
        );
        // Check if NFT collection created
        assert_eq!(pallet_rmrk_core::Collections::<Test>::contains_key(2), true);
        // Check if Reward created
        let reward_id = get_reward_hash(battlepass_id, 1, true, 2);
        let reward = Rewards::<Test>::get(reward_id);
        assert_eq!(reward.is_some(), true);
        assert_eq!(reward.unwrap().collection_id, 2);
        // Check if RewardState is ACTIVE
        assert_eq!(RewardStates::<Test>::get(reward_id), Some(RewardState::ACTIVE));


        // Should not create Reward if Battlepass state is ENDED
        assert_ok!(
            Battlepass::conclude_battlepass(Origin::signed(creator), battlepass_id)
        );
        assert_noop!(
            Battlepass::create_reward(Origin::signed(creator), battlepass_id, bounded_str.clone(), bounded_str.clone(), Some(1), 1, true),
            Error::<Test>::BattlepassStateWrong
        );

    
        // Check events 

    })
}

#[test]
fn disable_reward_test() {
    new_test_ext().execute_with(|| {
        let org_id = create_org();
        let battlepass_id = create_battlepass(org_id);
        let reward_id = create_reward(battlepass_id);
        let reward_id_2 = create_reward(battlepass_id);
        let wrong_id = <Test as frame_system::Config>::Hashing::hash_of(&"123");
        let creator = ALICE;
        let not_creator = BOB;
        let not_member = EVA;

        // Should not disable if Reward unknown
        assert_noop!(
            Battlepass::disable_reward(Origin::signed(creator), wrong_id),
            Error::<Test>::RewardUnknown
        );

        // Should not disable if Battlepass unknown
        Rewards::<Test>::mutate(reward_id_2, |reward| {
            if let Some(r) = reward {
                r.battlepass_id = wrong_id;
            }
        } );
        assert_noop!(
            Battlepass::disable_reward(Origin::signed(creator), reward_id_2),
            Error::<Test>::BattlepassUnknown
        );

        // Should not disable if origin is not a Prime
        assert_ok!(
            Control::add_member(Origin::signed(not_creator), org_id, not_creator)
        );
        assert_noop!(
            Battlepass::disable_reward(Origin::signed(not_creator), reward_id),
            Error::<Test>::AuthorizationError
        );
        assert_noop!(
            Battlepass::disable_reward(Origin::signed(not_member), reward_id),
            Error::<Test>::AuthorizationError
        );

        // Should disable Reward
        assert_ok!(
            Battlepass::disable_reward(Origin::signed(creator), reward_id)
        );
        // Check if RewardState is INACTIVE
        assert_eq!(RewardStates::<Test>::get(reward_id), Some(RewardState::INACTIVE));

        // Should not disable if Reward inactive
        assert_noop!(
            Battlepass::disable_reward(Origin::signed(creator), reward_id),
            Error::<Test>::RewardInactive
        );
    

        // Check events 

    })
}

#[test]
fn claim_reward_test() {
    new_test_ext().execute_with(|| {
        let org_id = create_org();
        let battlepass_id = create_battlepass(org_id);
        let wrong_id = <Test as frame_system::Config>::Hashing::hash_of(&"123");
        let creator = ALICE;
        let not_creator = BOB;
        let not_creator_2 = TOM;
        let not_creator_3 = 30;
        let not_creator_4 = 31;
        let not_member = EVA;
        add_member(org_id, not_creator);
        add_member(org_id, not_creator_2);
        add_member(org_id, not_creator_3);
        add_member(org_id, not_creator_4);

        // Should not claim if Reward unknown
        assert_noop!(
            Battlepass::claim_reward(Origin::signed(creator), wrong_id),
            Error::<Test>::RewardUnknown
        );

        // Should not claim if Reward is INACTIVE
        let reward_id = create_reward(battlepass_id);
        assert_ok!(
            Battlepass::disable_reward(Origin::signed(creator), reward_id)
        );
        assert_noop!(
            Battlepass::claim_reward(Origin::signed(creator), reward_id),
            Error::<Test>::RewardInactive
        );

        // Should not disable if Battlepass unknown
        let reward_id = create_reward(battlepass_id);
        Rewards::<Test>::mutate(reward_id, |reward| {
            if let Some(r) = reward {
                r.battlepass_id = wrong_id;
            }
        } );
        assert_noop!(
            Battlepass::claim_reward(Origin::signed(creator), reward_id),
            Error::<Test>::BattlepassUnknown
        );

        // Should not claim if Battlepass state is DRAFT
        let reward_id = create_reward(battlepass_id);
        assert_noop!(
            Battlepass::claim_reward(Origin::signed(creator), reward_id),
            Error::<Test>::BattlepassStateWrong
        );

        // Should not claim if Org is inactive
        assert_ok!(
            Battlepass::activate_battlepass(Origin::signed(creator), battlepass_id)
        );
        assert_ok!(
            Control::disable_org(Origin::signed(creator), org_id)
        );
        assert_noop!(
            Battlepass::claim_reward(Origin::signed(creator), reward_id),
            Error::<Test>::OrgUnknownOrInactive
        );
        assert_ok!(
            Control::enable_org(Origin::signed(creator), org_id)
        );

        // Should not claim for non members
        assert_noop!(
            Battlepass::claim_reward(Origin::signed(not_member), reward_id),
            Error::<Test>::NotMember
        );

        // Should not claim Reward if user didn't claim Battlepass
        assert_noop!(
            Battlepass::claim_reward(Origin::signed(not_creator), reward_id),
            Error::<Test>::BattlepassNotClaimed
        );

        // Should not claim Reward if no NFT for claimed Battlepass
        assert_ok!(
            Battlepass::claim_battlepass(Origin::signed(not_creator), battlepass_id, not_creator)
        );
        assert_ok!(
            RmrkCore::burn_nft(Origin::signed(not_creator), 0, 0, 5)
        );
        assert_noop!(
            Battlepass::claim_reward(Origin::signed(not_creator), reward_id),
            Error::<Test>::BattlepassNftUnknown
        );

        // Should not claim Reward if user lost ownership of Battlepass NFT
        assert_ok!(
            Battlepass::claim_battlepass(Origin::signed(creator), battlepass_id, creator)
        );
        Nfts::<Test>::mutate(0, 1, |nft| {
            if let Some(n) = nft {
                n.transferable = true
            }
        });
        assert_ok!(
            RmrkCore::send(Origin::signed(creator), 0, 1, AccountIdOrCollectionNftTuple::AccountId(not_member))
        );
        assert_noop!(
            Battlepass::claim_reward(Origin::signed(creator), reward_id),
            Error::<Test>::NotOwnNft
        );

        // Should not claim Reward if Battlepass NFT is not valid
        assert_ok!(
            Battlepass::claim_battlepass(Origin::signed(not_creator_2), battlepass_id, not_creator_2)
        );
        Nfts::<Test>::mutate(0, 2, |nft| {
            if let Some(n) = nft {
                n.metadata = BoundedVec::truncate_from(b"crap".to_vec())
            }
        });
        assert_noop!(
            Battlepass::claim_reward(Origin::signed(not_creator_2), reward_id),
            Error::<Test>::BattlepassNftInvalid
        );

        // Should not claim if user's level is too low
        assert_ok!(
            Battlepass::claim_battlepass(Origin::signed(not_creator_3), battlepass_id, not_creator_3)
        );
        assert_noop!(
            Battlepass::claim_reward(Origin::signed(not_creator_3), reward_id),
            Error::<Test>::LevelNotReached
        );

        // Should claim Reward
        assert_ok!(
            Battlepass::set_points(Origin::signed(creator), battlepass_id, not_creator_3, 10)
        );
        assert_ok!(
            Battlepass::add_level(Origin::signed(creator), battlepass_id, 1, 10)
        );
        assert_ok!(
            Battlepass::claim_reward(Origin::signed(not_creator_3), reward_id)
        );
        // Check if Reward claimed
        assert_eq!(ClaimedRewards::<Test>::contains_key(reward_id, not_creator_3), true);

        // Should not claim if Reward already claimed
        assert_noop!(
            Battlepass::claim_reward(Origin::signed(not_creator_3), reward_id),
            Error::<Test>::RewardClaimed
        );

        // Should claim Reward after receiving Battlepass NFT from elsewhere
        // TODO: need to 'apply' the received Battlepass NFT so it will appear in ClaimedBattlepasses

        // Should not claim if max limit reached
        assert_ok!(
            Battlepass::claim_battlepass(Origin::signed(not_creator_4), battlepass_id, not_creator_4)
        );
        assert_ok!(
            Battlepass::set_points(Origin::signed(creator), battlepass_id, not_creator_4, 10)
        );
        assert_noop!(
            Battlepass::claim_reward(Origin::signed(not_creator_4), reward_id),
            pallet_rmrk_core::Error::<Test>::CollectionFullOrLocked
        );

        // Should not claim if Battlepass state is ENDED
        assert_ok!(
            Battlepass::conclude_battlepass(Origin::signed(creator), battlepass_id)
        );
        assert_noop!(
            Battlepass::claim_reward(Origin::signed(not_creator_4), reward_id),
            Error::<Test>::BattlepassStateWrong
        );
    
        // Check events 

    })
}

#[test]
fn add_level_test() {
    new_test_ext().execute_with(|| {
        let org_id = create_org();
        let battlepass_id = create_battlepass(org_id);
        let wrong_battlepass_id = <Test as frame_system::Config>::Hashing::hash_of(&"123");
        let creator = ALICE;
        let not_creator = BOB;
        let not_member = EVA;
        add_member(org_id, not_creator);

        // Should not add if Battlepass unknown
        assert_noop!(
            Battlepass::add_level(Origin::signed(creator), wrong_battlepass_id, 1, 10),
            Error::<Test>::BattlepassUnknown
        );

        // Should not add if Org is inactive
        assert_ok!(
            Control::disable_org(Origin::signed(creator), org_id)
        );
        assert_noop!(
            Battlepass::add_level(Origin::signed(creator), battlepass_id, 1, 10),
            Error::<Test>::OrgUnknownOrInactive
        );
        assert_ok!(
            Control::enable_org(Origin::signed(creator), org_id)
        );

        // Should not add if origin is not a Prime
        assert_noop!(
            Battlepass::add_level(Origin::signed(not_creator), battlepass_id, 1, 10),
            Error::<Test>::AuthorizationError
        );
        assert_noop!(
            Battlepass::add_level(Origin::signed(not_member), battlepass_id, 1, 10),
            Error::<Test>::AuthorizationError
        );

        // Should add Level for DRAFT Battlepass
        assert_ok!(
            Battlepass::add_level(Origin::signed(creator), battlepass_id, 1, 10)
        );
        // Check if Level added
        assert_eq!(Levels::<Test>::contains_key(battlepass_id, 1), true);

        // Should add Level for ACTIVE Battlepass
        assert_ok!(
            Battlepass::activate_battlepass(Origin::signed(creator), battlepass_id)
        );
        assert_ok!(
            Battlepass::add_level(Origin::signed(creator), battlepass_id, 2, 10)
        );
        // Check if Level added
        assert_eq!(Levels::<Test>::contains_key(battlepass_id, 2), true);

        // Should not add if Battlepass in ENDED state
        assert_ok!(
            Battlepass::conclude_battlepass(Origin::signed(creator), battlepass_id)
        );
        assert_noop!(
            Battlepass::add_level(Origin::signed(creator), battlepass_id, 1, 10),
            Error::<Test>::BattlepassStateWrong
        );
    
        // Check events 

    })
}

#[test]
fn remove_level_test() {
    new_test_ext().execute_with(|| {
        let org_id = create_org();
        let battlepass_id = create_battlepass(org_id);
        let wrong_battlepass_id = <Test as frame_system::Config>::Hashing::hash_of(&"123");
        let creator = ALICE;
        let not_creator = BOB;
        let not_member = EVA;
        add_member(org_id, not_creator);

        // Should not remove if Battlepass unknown
        assert_noop!(
            Battlepass::remove_level(Origin::signed(creator), wrong_battlepass_id, 1),
            Error::<Test>::BattlepassUnknown
        );

        // Should not remove if Org is inactive
        assert_ok!(
            Control::disable_org(Origin::signed(creator), org_id)
        );
        assert_noop!(
            Battlepass::remove_level(Origin::signed(creator), battlepass_id, 1),
            Error::<Test>::OrgUnknownOrInactive
        );
        assert_ok!(
            Control::enable_org(Origin::signed(creator), org_id)
        );

        // Should not remove if origin is not a Prime
        assert_noop!(
            Battlepass::remove_level(Origin::signed(not_creator), battlepass_id, 1),
            Error::<Test>::AuthorizationError
        );
        assert_noop!(
            Battlepass::remove_level(Origin::signed(not_member), battlepass_id, 1),
            Error::<Test>::AuthorizationError
        );

        // Should not remove if no such Level
        assert_noop!(
            Battlepass::remove_level(Origin::signed(creator), battlepass_id, 1),
            Error::<Test>::LevelUnknown
        );

        // Should remove Level for DRAFT Battlepass
        assert_ok!(
            Battlepass::add_level(Origin::signed(creator), battlepass_id, 1, 10)
        );
        assert_eq!(Levels::<Test>::contains_key(battlepass_id, 1), true);
        assert_ok!(
            Battlepass::remove_level(Origin::signed(creator), battlepass_id, 1)
        );
        // Check if Level removed
        assert_eq!(Levels::<Test>::contains_key(battlepass_id, 1), false);

        // Should remove Level for ACTIVE Battlepass
        assert_ok!(
            Battlepass::activate_battlepass(Origin::signed(creator), battlepass_id)
        );
        assert_ok!(
            Battlepass::add_level(Origin::signed(creator), battlepass_id, 2, 10)
        );
        assert_eq!(Levels::<Test>::contains_key(battlepass_id, 2), true);
        assert_ok!(
            Battlepass::remove_level(Origin::signed(creator), battlepass_id, 2)
        );
        // Check if Level removed
        assert_eq!(Levels::<Test>::contains_key(battlepass_id, 2), false);

        // Should not remove if Battlepass in ENDED state
        assert_ok!(
            Battlepass::conclude_battlepass(Origin::signed(creator), battlepass_id)
        );
        assert_noop!(
            Battlepass::remove_level(Origin::signed(creator), battlepass_id, 1),
            Error::<Test>::BattlepassStateWrong
        );

    
        // Check events 

    })
}

#[test]
fn add_bot_test() {
    new_test_ext().execute_with(|| {
        let org_id = create_org();
        let battlepass_id = create_battlepass(org_id);
        let wrong_battlepass_id = <Test as frame_system::Config>::Hashing::hash_of(&"123");
        let creator = ALICE;
        let not_creator = BOB;
        let not_member = EVA;
        add_member(org_id, not_creator);

        // Should not add if Battlepass unknown
        assert_noop!(
            Battlepass::add_bot(Origin::signed(creator), wrong_battlepass_id, 1),
            Error::<Test>::BattlepassUnknown
        );

        // Should not add if Org is inactive
        assert_ok!(
            Control::disable_org(Origin::signed(creator), org_id)
        );
        assert_noop!(
            Battlepass::add_bot(Origin::signed(creator), battlepass_id, 1),
            Error::<Test>::OrgUnknownOrInactive
        );
        assert_ok!(
            Control::enable_org(Origin::signed(creator), org_id)
        );

        // Should not add if origin is not a Prime
        assert_noop!(
            Battlepass::add_bot(Origin::signed(not_creator), battlepass_id, 1),
            Error::<Test>::AuthorizationError
        );
        assert_noop!(
            Battlepass::add_bot(Origin::signed(not_member), battlepass_id, 1),
            Error::<Test>::AuthorizationError
        );

        // Should add Bot for DRAFT Battlepass
        assert_ok!(
            Battlepass::add_bot(Origin::signed(creator), battlepass_id, 1)
        );
        // Check if bot added
        let bp_info = BattlepassInfoByOrg::<Test>::get(org_id);
        assert_eq!(bp_info.is_some(), true);
        assert_eq!(bp_info.clone().unwrap().count, 1);
        assert_eq!(bp_info.clone().unwrap().active, None);
        assert_eq!(bp_info.clone().unwrap().bot, Some(1));

        // Should add Bot for ACTIVE Battlepass
        assert_ok!(
            Battlepass::activate_battlepass(Origin::signed(creator), battlepass_id)
        );
        assert_ok!(
            Battlepass::add_bot(Origin::signed(creator), battlepass_id, 2)
        );
        // Check if bot added
        let bp_info = BattlepassInfoByOrg::<Test>::get(org_id);
        assert_eq!(bp_info.is_some(), true);
        assert_eq!(bp_info.clone().unwrap().count, 1);
        assert_eq!(bp_info.clone().unwrap().active, Some(battlepass_id));
        assert_eq!(bp_info.clone().unwrap().bot, Some(2));

        // Should not add if Battlepass in ENDED state
        assert_ok!(
            Battlepass::conclude_battlepass(Origin::signed(creator), battlepass_id)
        );
        assert_noop!(
            Battlepass::add_bot(Origin::signed(creator), battlepass_id, 1),
            Error::<Test>::BattlepassStateWrong
        );

    
        // Check events 

    })
}