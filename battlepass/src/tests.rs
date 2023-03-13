#![cfg(test)]

use frame_support::{assert_noop, assert_ok};
use frame_support::traits::tokens::nonfungibles::{Inspect, InspectEnumerable, Mutate, Transfer};
use sp_core::H256;

use crate::mock::{
    new_test_ext, RuntimeOrigin as Origin, Test,
    //System, 
    Battlepass, Control, Uniques,
    ALICE, BOB, EVA, TOM, BOT, PROTOCOL_TOKEN_ID, PAYMENT_TOKEN_ID, DOLLARS, 
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
    let collection_id = CollectionIndex::<Test>::get();
    
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
    BoundedVec::truncate_from(b"string".to_vec())
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
        let creator = ALICE;
        let not_creator = BOB;
        let not_member = EVA;
        let battlepass_id_1 = get_battlepass_hash(creator, org_id, 1, 10, 0);
        let battlepass_id_2 = get_battlepass_hash(creator, org_id, 2, 10, 1);
        let battlepass_id_3 = get_battlepass_hash(creator, org_id, 3, 10, 2);

        // Should not create for non existing Org
        assert_noop!(
            Battlepass::create_battlepass(Origin::signed(creator), wrong_org_id, string(), string(), 10),
            Error::<Test>::OrgUnknownOrInactive
        );

        // Should not create for inactive Org
        assert_ok!(
            Control::disable_org(Origin::signed(creator), org_id)
        );
        assert_noop!(
            Battlepass::create_battlepass(Origin::signed(creator), org_id, string(), string(), 10),
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
            Battlepass::create_battlepass(Origin::signed(not_creator), org_id, string(), string(), 10),
            Error::<Test>::AuthorizationError
        );
        assert_noop!(
            Battlepass::create_battlepass(Origin::signed(not_member), org_id, string(), string(), 10),
            Error::<Test>::AuthorizationError
        );

        // Should create new Battlepass
        assert_ok!(
            Battlepass::create_battlepass(Origin::signed(creator), org_id, string(), string(), 10)
        );
        // Check if NFT collection created
        assert_eq!(<Uniques as InspectEnumerable<AccountId>>::collections().any(|x| x == 0), true);
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
            Battlepass::create_battlepass(Origin::signed(creator), org_id, string(), string(), 10)
        );
        // Check if NFT collection created
        assert_eq!(<Uniques as InspectEnumerable<AccountId>>::collections().any(|x| x == 1), true);
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

        // Should create another Battlepass (even if there is an ACTIVE one)
        assert_ok!(
            Battlepass::activate_battlepass(Origin::signed(creator), battlepass_id_1)
        );
        assert_ok!(
            Battlepass::create_battlepass(Origin::signed(creator), org_id, string(), string(), 10)
        );
        // Check if NFT collection created
        assert_eq!(<Uniques as InspectEnumerable<AccountId>>::collections().any(|x| x == 1), true);
        // Check if Battlepass created
        let battlepass = Battlepasses::<Test>::get(battlepass_id_3);
        assert_eq!(battlepass.is_some(), true);
        assert_eq!(battlepass.unwrap().season, 3);
        assert_eq!(Battlepasses::<Test>::contains_key(battlepass_id_3), true);
        // Check if BattlepassState is DRAFT
        assert_eq!(Battlepass::get_battlepass_state(battlepass_id_3), Some(types::BattlepassState::DRAFT));
        // Check if BattlepassInfo created (count = 3, active = battlepass_id_1)
        let bp_info = BattlepassInfoByOrg::<Test>::get(org_id);
        assert_eq!(bp_info.is_some(), true);
        assert_eq!(bp_info.clone().unwrap().count, 3);
        assert_eq!(bp_info.clone().unwrap().active, Some(battlepass_id_1));
    })
}

#[test]
fn update_battlepass_test() {
    new_test_ext().execute_with(|| {
        let org_id = create_org();
        let battlepass_id = create_battlepass(org_id);
        let wrong_battlepass_id = <Test as frame_system::Config>::Hashing::hash_of(&"123");
        let creator = ALICE;
        let not_creator = BOB;
        let not_member = EVA;
        let new_name = BoundedVec::truncate_from(b"new name".to_vec());
        let new_cid = BoundedVec::truncate_from(b"new cid".to_vec());
        let new_price = 20;

        // Should not update unknown Battlepass
        assert_noop!(
            Battlepass::update_battlepass(Origin::signed(creator), wrong_battlepass_id, Some(string()), Some(string()), Some(10)),
            Error::<Test>::BattlepassUnknown
        );

        // Should not update if no arguments provided
        assert_noop!(
            Battlepass::update_battlepass(Origin::signed(creator), battlepass_id, None, None, None),
            Error::<Test>::NoChangesProvided
        );

        // Should not update if values are the same
        assert_noop!(
            Battlepass::update_battlepass(Origin::signed(creator), battlepass_id, Some(string()), Some(string()), Some(10)),
            Error::<Test>::NoChangesProvided
        );

        // Should not update if Org is inactive
        assert_ok!(
            Control::disable_org(Origin::signed(creator), org_id)
        );
        assert_noop!(
            Battlepass::update_battlepass(Origin::signed(creator), battlepass_id, Some(new_name.clone()), Some(new_cid.clone()), Some(new_price.clone())),
            Error::<Test>::OrgUnknownOrInactive
        );
        assert_ok!(
            Control::enable_org(Origin::signed(creator), org_id)
        );

        // Should not update if origin is not a Prime
        assert_ok!(
            Control::add_member(Origin::signed(not_creator), org_id, not_creator)
        );
        assert_noop!(
            Battlepass::update_battlepass(Origin::signed(not_creator), battlepass_id, Some(new_name.clone()), Some(new_cid.clone()), Some(new_price.clone())),
            Error::<Test>::AuthorizationError
        );
        assert_noop!(
            Battlepass::update_battlepass(Origin::signed(not_member), battlepass_id, Some(new_name.clone()), Some(new_cid.clone()), Some(new_price.clone())),
            Error::<Test>::AuthorizationError
        );

        // Should update battlepass
        assert_ok!(
            Battlepass::update_battlepass(Origin::signed(creator), battlepass_id, Some(new_name.clone()), Some(new_cid.clone()), Some(new_price.clone())),
        );
        // Check if Battlepass updated
        let updated = Battlepass::get_battlepass(battlepass_id).unwrap();
        assert_eq!(updated.name, new_name.clone());
        assert_eq!(updated.cid, new_cid.clone());
        assert_eq!(updated.price, new_price.clone());

        // Should update some fields in battlepass
        assert_ok!(
            Battlepass::update_battlepass(Origin::signed(creator), battlepass_id, None, None, Some(100)),
        );
        // Check if Battlepass updated
        let updated = Battlepass::get_battlepass(battlepass_id).unwrap();
        assert_eq!(updated.name, new_name.clone());
        assert_eq!(updated.cid, new_cid.clone());
        assert_eq!(updated.price, 100);

        // Should not update if Battlepass state is ENDED
        assert_ok!(
            Battlepass::activate_battlepass(Origin::signed(creator), battlepass_id)
        );
        assert_ok!(
            Battlepass::conclude_battlepass(Origin::signed(creator), battlepass_id)
        );
        assert_noop!(
            Battlepass::update_battlepass(Origin::signed(creator), battlepass_id, Some(new_name), Some(new_cid), Some(30)),
            Error::<Test>::BattlepassStateWrong
        );

        // Check events (battlepass updated)
    })
}

#[test]
fn activate_battlepass_test() {
    new_test_ext().execute_with(|| {
        let org_id = create_org();
        let battlepass_id = create_battlepass(org_id);
        let battlepass_id_2 = create_battlepass(org_id);
        let wrong_battlepass_id = <Test as frame_system::Config>::Hashing::hash_of(&"123");
        let creator = ALICE;
        let not_creator = BOB;
        let not_member = EVA;

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
        assert_eq!(bp_info.clone().unwrap().count, 2);
        assert_eq!(bp_info.clone().unwrap().active, Some(battlepass_id));


        // Should not activate already active Battlepass
        assert_noop!(
            Battlepass::activate_battlepass(Origin::signed(creator), battlepass_id),
            Error::<Test>::BattlepassStateWrong
        );

        // Should not activate if Org has an active battlepass
        assert_noop!(
            Battlepass::activate_battlepass(Origin::signed(creator), battlepass_id_2),
            Error::<Test>::BattlepassExists
        );

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
        let not_creator_3 = 22u32;
        let not_member = EVA;
        let not_member_2 = 40;
        add_member(org_id, not_creator);
        add_member(org_id, not_creator_2);
        add_member(org_id, not_creator_3);

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

        // Should not claim by Bot if Bot account was not added
        assert_noop!(
            Battlepass::claim_battlepass(Origin::signed(BOT), battlepass_id, creator),
            Error::<Test>::AuthorizationError
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
        // Should not claim for self
        assert_noop!(
            Battlepass::claim_battlepass(Origin::signed(not_creator), battlepass_id, not_creator),
            Error::<Test>::AuthorizationError
        );
        
        // Should claim for others by Prime
        assert_ok!(
            Battlepass::claim_battlepass(Origin::signed(creator), battlepass_id, not_creator)
        );
        // Check if NFT minted
        assert_eq!(<Uniques as InspectEnumerable<AccountId>>::items(&0).any(|x| x == 0) , true);
        
        // Should not claim if it was already claimed
        assert_noop!(
            Battlepass::claim_battlepass(Origin::signed(creator), battlepass_id, not_creator),
            Error::<Test>::BattlepassOwnershipExists
        );

        // Should claim again after transferring Battlepass NFT to someone else
        assert_ok!(
            Uniques::thaw_collection(Origin::signed(creator), 0)
        );
        assert_ok!(
            <Uniques as Transfer<AccountId>>::transfer(&0, &0, &not_member_2)
        );
        assert_ok!(
            Battlepass::claim_battlepass(Origin::signed(creator), battlepass_id, not_creator)
        );
        // Check if NFT minted
        assert_eq!(<Uniques as InspectEnumerable<AccountId>>::items(&0).any(|x| x == 1) , true);

        // Should not claim if user received Battlepass NFT from someone else
        assert_noop!(
            Battlepass::claim_battlepass(Origin::signed(creator), battlepass_id, not_member_2),
            Error::<Test>::BattlepassOwnershipExists
        );

        // Should claim for others by Bot
        assert_ok!(
            Battlepass::add_bot(Origin::signed(creator), battlepass_id, BOT)
        );
        assert_ok!(
            Battlepass::claim_battlepass(Origin::signed(BOT), battlepass_id, not_creator_3)
        );
        // Check if NFT minted
        assert_eq!(<Uniques as InspectEnumerable<AccountId>>::items(&0).any(|x| x == 2) , true);

        // Should claim for accounts outside of org
        assert_ok!(
            Battlepass::claim_battlepass(Origin::signed(creator), battlepass_id, not_member),
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
            Battlepass::set_points(Origin::signed(BOT), battlepass_id, creator, 10),
            Error::<Test>::AuthorizationError
        );
        
        // Should not set if user does not have access to Battlepass
        assert_noop!(
            Battlepass::set_points(Origin::signed(creator), battlepass_id, not_member, 10),
            Error::<Test>::BattlepassOwnershipDoesntExist
        );

        // Should set points by Prime
        assert_ok!(
            Battlepass::claim_battlepass(Origin::signed(creator), battlepass_id, not_creator)
        );
        assert_ok!(
            Battlepass::set_points(Origin::signed(creator), battlepass_id, not_creator, 10)
        );
        // Check if Points record updated
        assert_eq!(Points::<Test>::get(battlepass_id, not_creator) == 10, true);

        // Should set points by Bot
        assert_ok!(
            Battlepass::add_bot(Origin::signed(creator), battlepass_id, BOT)
        );
        assert_ok!(
            Battlepass::set_points(Origin::signed(BOT), battlepass_id, not_creator, 20)
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
        let creator = ALICE;
        let not_creator = BOB;
        let not_member = EVA;

        // Should not create if Battlepass unknown
        assert_noop!(
            Battlepass::create_reward(Origin::signed(creator), wrong_battlepass_id, string(), string(), Some(1), 1, true),
            Error::<Test>::BattlepassUnknown
        );

        // Should not create if Org is inactive
        assert_ok!(
            Control::disable_org(Origin::signed(creator), org_id)
        );
        assert_noop!(
            Battlepass::create_reward(Origin::signed(creator), battlepass_id, string(), string(), Some(1), 1, true),
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
            Battlepass::create_reward(Origin::signed(not_creator), battlepass_id, string(), string(), Some(1), 1, true),
            Error::<Test>::AuthorizationError
        );
        assert_noop!(
            Battlepass::create_reward(Origin::signed(not_member), battlepass_id, string(), string(), Some(1), 1, true),
            Error::<Test>::AuthorizationError
        );

        // Should create Reward if Battlepass state is DRAFT
        assert_ok!(
            Battlepass::create_reward(Origin::signed(creator), battlepass_id, string(), string(), Some(1), 1, true)
        );
        // Check if NFT collection created
        assert_eq!(<Uniques as InspectEnumerable<AccountId>>::collections().any(|x| x == 1) , true);
        // Check if collection owner is a Prime
        assert_eq!(<Uniques as Inspect<AccountId>>::collection_owner(&1).unwrap(), creator);
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
            Battlepass::create_reward(Origin::signed(creator), battlepass_id, string(), string(), Some(1), 1, true)
        );
        // Check if NFT collection created
        assert_eq!(<Uniques as InspectEnumerable<AccountId>>::collections().any(|x| x == 2) , true);
        // Check if collection owner is a Prime
        assert_eq!(<Uniques as Inspect<AccountId>>::collection_owner(&2).unwrap(), creator);
        // Check if Reward created
        let reward_id = get_reward_hash(battlepass_id, 1, true, 2);
        let reward = Rewards::<Test>::get(reward_id);
        assert_eq!(reward.is_some(), true);
        assert_eq!(reward.unwrap().collection_id, 2);
        // Check if RewardState is ACTIVE
        assert_eq!(RewardStates::<Test>::get(reward_id), Some(RewardState::ACTIVE));

        // Should not create if Bot is not added
        assert_noop!(
            Battlepass::create_reward(Origin::signed(BOT), battlepass_id, string(), string(), Some(1), 1, true),
            Error::<Test>::AuthorizationError
        );

        // Should create Reward by Bot
        assert_ok!(
            Battlepass::add_bot(Origin::signed(creator), battlepass_id, BOT)
        );
        assert_ok!(
            Battlepass::create_reward(Origin::signed(BOT), battlepass_id, string(), string(), Some(1), 1, true)
        );
        // Check if NFT collection created
        assert_eq!(<Uniques as InspectEnumerable<AccountId>>::collections().any(|x| x == 3) , true);
        // Check if collection owner is a Prime
        assert_eq!(<Uniques as Inspect<AccountId>>::collection_owner(&3).unwrap(), creator);
        // Check if Reward created
        let reward_id = get_reward_hash(battlepass_id, 1, true, 3);
        let reward = Rewards::<Test>::get(reward_id);
        assert_eq!(reward.is_some(), true);
        assert_eq!(reward.unwrap().collection_id, 3);
        // Check if RewardState is ACTIVE
        assert_eq!(RewardStates::<Test>::get(reward_id), Some(RewardState::ACTIVE));


        // Should not create Reward if Battlepass state is ENDED
        assert_ok!(
            Battlepass::conclude_battlepass(Origin::signed(creator), battlepass_id)
        );
        assert_noop!(
            Battlepass::create_reward(Origin::signed(creator), battlepass_id, string(), string(), Some(1), 1, true),
            Error::<Test>::BattlepassStateWrong
        );

    
        // Check events 

    })
}

#[test]
fn update_reward_test() {
    new_test_ext().execute_with(|| {
        let org_id = create_org();
        let battlepass_id = create_battlepass(org_id);
        let reward_id = create_reward(battlepass_id);
        let reward_id_2 = create_reward(battlepass_id);
        let wrong_id = <Test as frame_system::Config>::Hashing::hash_of(&"123");
        let creator = ALICE;
        let not_creator = BOB;
        let not_member = EVA;
        let new_name = BoundedVec::truncate_from(b"new name".to_vec());
        let new_cid = BoundedVec::truncate_from(b"new cid".to_vec());
        let new_transferable = false;

        // Should not update if Reward unknown
        assert_noop!(
            Battlepass::update_reward(Origin::signed(creator), wrong_id, Some(new_name.clone()), Some(new_cid.clone()), Some(new_transferable.clone())),
            Error::<Test>::RewardUnknown
        );

        // Should not update if no arguments provided
        assert_noop!(
            Battlepass::update_reward(Origin::signed(creator), reward_id, None, None, None),
            Error::<Test>::NoChangesProvided
        );

        // Should not update if values are the same
        assert_noop!(
            Battlepass::update_reward(Origin::signed(creator), reward_id, Some(string()), Some(string()), Some(true)),
            Error::<Test>::NoChangesProvided
        );

        // Should not update if Battlepass unknown
        Rewards::<Test>::mutate(reward_id_2, |reward| {
            if let Some(r) = reward {
                r.battlepass_id = wrong_id;
            }
        } );
        assert_noop!(
            Battlepass::update_reward(Origin::signed(creator), reward_id_2, Some(new_name.clone()), Some(new_cid.clone()), Some(new_transferable.clone())),
            Error::<Test>::BattlepassUnknown
        );

        // Should not update if Org is inactive
        assert_ok!(
            Control::disable_org(Origin::signed(creator), org_id)
        );
        assert_noop!(
            Battlepass::update_reward(Origin::signed(creator), reward_id, Some(new_name.clone()), Some(new_cid.clone()), Some(new_transferable.clone())),
            Error::<Test>::OrgUnknownOrInactive
        );
        assert_ok!(
            Control::enable_org(Origin::signed(creator), org_id)
        );

        // Should not update if origin is not a Prime
        assert_ok!(
            Control::add_member(Origin::signed(not_creator), org_id, not_creator)
        );
        assert_noop!(
            Battlepass::update_reward(Origin::signed(not_creator), reward_id, Some(new_name.clone()), Some(new_cid.clone()), Some(new_transferable.clone())),
            Error::<Test>::AuthorizationError
        );
        assert_noop!(
            Battlepass::update_reward(Origin::signed(not_member), reward_id, Some(new_name.clone()), Some(new_cid.clone()), Some(new_transferable.clone())),
            Error::<Test>::AuthorizationError
        );

        // Should update Reward
        assert_ok!(
            Battlepass::update_reward(Origin::signed(creator), reward_id, Some(new_name.clone()), Some(new_cid.clone()), Some(new_transferable.clone()))
        );
        // Check if Reward updated
        let updated = Battlepass::get_reward(reward_id).unwrap();
        assert_eq!(updated.name, new_name.clone());
        assert_eq!(updated.cid, new_cid.clone());
        assert_eq!(updated.transferable, new_transferable.clone());

        // Should update some fields in Reward
        assert_ok!(
            Battlepass::update_reward(Origin::signed(creator), reward_id, None, Some(new_name.clone()), None)
        );
        // Check if Reward updated
        let updated = Battlepass::get_reward(reward_id).unwrap();
        assert_eq!(updated.name, new_name.clone());
        assert_eq!(updated.cid, new_name.clone());
        assert_eq!(updated.transferable, new_transferable.clone());

        // Should not update if Bot is not added
        assert_noop!(
            Battlepass::update_reward(Origin::signed(BOT), reward_id, Some(new_name.clone()), Some(new_cid.clone()), Some(true)),
            Error::<Test>::AuthorizationError
        );

        // Should update Reward by Bot
        assert_ok!(
            Battlepass::add_bot(Origin::signed(creator), battlepass_id, BOT)
        );
        assert_ok!(
            Battlepass::update_reward(Origin::signed(BOT), reward_id, Some(new_name.clone()), Some(new_cid.clone()), Some(true))
        );
        // Check if Reward updated
        let updated = Battlepass::get_reward(reward_id).unwrap();
        assert_eq!(updated.name, new_name.clone());
        assert_eq!(updated.cid, new_cid.clone());
        assert_eq!(updated.transferable, true);

        // Should not update if Battlepass state is ENDED
        assert_ok!(
            Battlepass::activate_battlepass(Origin::signed(creator), battlepass_id)
        );
        assert_ok!(
            Battlepass::conclude_battlepass(Origin::signed(creator), battlepass_id)
        );
        assert_noop!(
            Battlepass::update_reward(Origin::signed(creator), reward_id, Some(new_name.clone()), Some(new_cid.clone()), Some(false)),
            Error::<Test>::BattlepassStateWrong
        );

        // Should not update if Reward inactive
        assert_ok!(
            Battlepass::disable_reward(Origin::signed(creator), reward_id)
        );
        assert_noop!(
            Battlepass::update_reward(Origin::signed(creator), reward_id, Some(new_name.clone()), Some(new_cid.clone()), Some(false)),
            Error::<Test>::RewardInactive
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
        let reward_id_3 = create_reward(battlepass_id);
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
    
        // Should not disable if Bot is not added
        assert_noop!(
            Battlepass::disable_reward(Origin::signed(BOT), reward_id_3),
            Error::<Test>::AuthorizationError
        );

        // Should disable Reward by Bot
        assert_ok!(
            Battlepass::add_bot(Origin::signed(creator), battlepass_id, BOT)
        );
        assert_ok!(
            Battlepass::disable_reward(Origin::signed(BOT), reward_id_3)
        );
        // Check if RewardState is INACTIVE
        assert_eq!(RewardStates::<Test>::get(reward_id_3), Some(RewardState::INACTIVE));

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
        let not_member_2 = 40;
        add_member(org_id, not_creator);
        add_member(org_id, not_creator_2);
        add_member(org_id, not_creator_3);
        add_member(org_id, not_creator_4);

        // Should not claim if Reward unknown
        assert_noop!(
            Battlepass::claim_reward(Origin::signed(creator), wrong_id, creator),
            Error::<Test>::RewardUnknown
        );

        // Should not claim if Reward is INACTIVE
        let reward_id = create_reward(battlepass_id);
        assert_ok!(
            Battlepass::disable_reward(Origin::signed(creator), reward_id)
        );
        assert_noop!(
            Battlepass::claim_reward(Origin::signed(creator), reward_id, creator),
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
            Battlepass::claim_reward(Origin::signed(creator), reward_id, creator),
            Error::<Test>::BattlepassUnknown
        );

        // Should not claim if Battlepass state is DRAFT
        let reward_id = create_reward(battlepass_id);
        assert_noop!(
            Battlepass::claim_reward(Origin::signed(creator), reward_id, creator),
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
            Battlepass::claim_reward(Origin::signed(creator), reward_id, creator),
            Error::<Test>::OrgUnknownOrInactive
        );
        assert_ok!(
            Control::enable_org(Origin::signed(creator), org_id)
        );

        // Should not claim by Bot if Bot account was not added
        assert_noop!(
            Battlepass::claim_reward(Origin::signed(BOT), reward_id, creator),
            Error::<Test>::AuthorizationError
        );

        // Should not claim for others if origin is not a Prime or Bot
        assert_noop!(
            Battlepass::claim_reward(Origin::signed(not_creator), reward_id, creator),
            Error::<Test>::AuthorizationError
        );
        assert_noop!(
            Battlepass::claim_reward(Origin::signed(not_member), reward_id, creator),
            Error::<Test>::AuthorizationError
        );

        // Should not claim Reward if user didn't claim Battlepass
        assert_noop!(
            Battlepass::claim_reward(Origin::signed(not_creator), reward_id, not_creator),
            Error::<Test>::BattlepassOwnershipDoesntExist
        );

        // Should not claim Reward if no NFT for claimed Battlepass
        assert_ok!(
            Battlepass::claim_battlepass(Origin::signed(creator), battlepass_id, not_creator)
        );
        assert_ok!(
            <Uniques as Mutate<AccountId>>::burn(&0, &0, None)
        );
        assert_noop!(
            Battlepass::claim_reward(Origin::signed(not_creator), reward_id, not_creator),
            Error::<Test>::BattlepassOwnershipDoesntExist
        );

        // Should not claim Reward if user lost ownership of Battlepass NFT
        assert_ok!(
            Battlepass::claim_battlepass(Origin::signed(creator), battlepass_id, creator)
        );
        assert_ok!(
            Uniques::thaw_collection(Origin::signed(creator), 0)
        );
        assert_ok!(
            <Uniques as Transfer<AccountId>>::transfer(&0, &1, &not_member_2)
        );
        assert_noop!(
            Battlepass::claim_reward(Origin::signed(creator), reward_id, creator),
            Error::<Test>::BattlepassOwnershipDoesntExist
        );

        // Should not claim if user's level is too low
        assert_ok!(
            Battlepass::claim_battlepass(Origin::signed(creator), battlepass_id, not_creator_3)
        );
        assert_noop!(
            Battlepass::claim_reward(Origin::signed(not_creator_3), reward_id, not_creator_3),
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
            Battlepass::claim_reward(Origin::signed(not_creator_3), reward_id, not_creator_3)
        );
        // Check if Reward claimed
        assert_eq!(ClaimedRewards::<Test>::contains_key(reward_id, not_creator_3), true);

        // Should not claim if Reward already claimed
        assert_noop!(
            Battlepass::claim_reward(Origin::signed(not_creator_3), reward_id, not_creator_3),
            Error::<Test>::RewardClaimed
        );

        // Should not claim if max limit reached
        assert_ok!(
            Battlepass::claim_battlepass(Origin::signed(creator), battlepass_id, not_creator_4)
        );
        assert_ok!(
            Battlepass::set_points(Origin::signed(creator), battlepass_id, not_creator_4, 10)
        );
        assert_noop!(
            Battlepass::claim_reward(Origin::signed(not_creator_4), reward_id, not_creator_4),
            pallet_uniques::Error::<Test>::MaxSupplyReached
        );

        // Should claim Reward by Bot
        let reward_id = create_reward(battlepass_id);
        assert_ok!(
            Battlepass::add_bot(Origin::signed(creator), battlepass_id, BOT)
        );
        assert_ok!(
            Battlepass::claim_reward(Origin::signed(BOT), reward_id, not_creator_4)
        );
        // Check if Reward claimed
        assert_eq!(ClaimedRewards::<Test>::contains_key(reward_id, not_creator_4), true);

        // Should claim Reward for non-member
        let reward_id = create_reward(battlepass_id);
        assert_ok!(
            Battlepass::claim_battlepass(Origin::signed(creator), battlepass_id, not_member)
        );
        assert_ok!(
            Battlepass::set_points(Origin::signed(creator), battlepass_id, not_member, 10)
        );
        assert_ok!(
            Battlepass::claim_reward(Origin::signed(not_member), reward_id, not_member)
        );
        // Check if Reward claimed
        assert_eq!(ClaimedRewards::<Test>::contains_key(reward_id, not_member), true);

        // Should claim Reward after receiving Battlepass NFT from elsewhere
        let reward_id = create_reward(battlepass_id);
        assert_ok!(
            Battlepass::set_points(Origin::signed(creator), battlepass_id, not_member_2, 10)
        );
        assert_ok!(
            Battlepass::claim_reward(Origin::signed(not_member_2), reward_id, not_member_2)
        );
        // Check if Reward claimed
        assert_eq!(ClaimedRewards::<Test>::contains_key(reward_id, not_member_2), true);

        // Should not claim if Battlepass state is ENDED
        assert_ok!(
            Battlepass::conclude_battlepass(Origin::signed(creator), battlepass_id)
        );
        assert_noop!(
            Battlepass::claim_reward(Origin::signed(not_creator_4), reward_id, not_creator_3),
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

        // Should not add Level by Bot if Bot account was not added
        assert_noop!(
            Battlepass::add_level(Origin::signed(BOT), battlepass_id, 3, 10),
            Error::<Test>::AuthorizationError
        );

        // Should add Level by Bot
        assert_ok!(
            Battlepass::add_bot(Origin::signed(creator), battlepass_id, BOT)
        );
        assert_ok!(
            Battlepass::add_level(Origin::signed(BOT), battlepass_id, 3, 10)
        );
        // Check if Level added
        assert_eq!(Levels::<Test>::contains_key(battlepass_id, 3), true);

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


        // Should not remove Level by Bot if Bot account was not added
        assert_noop!(
            Battlepass::remove_level(Origin::signed(BOT), battlepass_id, 3),
            Error::<Test>::AuthorizationError
        );

        // Should remove Level by Bot
        assert_ok!(
            Battlepass::add_bot(Origin::signed(creator), battlepass_id, BOT)
        );
        assert_ok!(
            Battlepass::add_level(Origin::signed(creator), battlepass_id, 3, 10)
        );
        assert_eq!(Levels::<Test>::contains_key(battlepass_id, 3), true);
        assert_ok!(
            Battlepass::remove_level(Origin::signed(BOT), battlepass_id, 3)
        );
        // Check if Level added
        assert_eq!(Levels::<Test>::contains_key(battlepass_id, 3), false);


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
