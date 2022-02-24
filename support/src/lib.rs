#![cfg_attr(not(feature = "std"), no_std)]

#[derive(PartialEq)]
pub enum ControlMemberState {
    Inactive = 0, // eg inactive after threshold period
    Active = 1,   // active
    Pending = 2,  // application voting pending
    Kicked = 3,
    Banned = 4,
    Exited = 5,
}

#[derive(PartialEq)]
pub enum ControlState {
    Inactive = 0,
    Active = 1,
    Locked = 2,
}

pub trait ControlPalletStorage<AccountId, Hash> {

    fn body_controller(org: &Hash) -> AccountId;
    fn body_treasury(org: &Hash) -> AccountId;
    fn body_member_state(hash: &Hash, account_id: &AccountId) -> ControlMemberState;
    fn body_state(hash: &Hash) -> ControlState;
}
