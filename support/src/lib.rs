#![cfg_attr(not(feature = "std"), no_std)]
use frame_support::codec::{Decode, Encode};
use scale_info::TypeInfo;
use sp_std::fmt::Debug;

// TODO: discussion: where to store enums

#[derive(Encode, Decode, Clone, PartialEq, Eq, PartialOrd, Ord, TypeInfo, Debug)]
#[repr(u8)]
pub enum FlowState {
    Init = 0,
    Active = 1,
    Paused = 2,
    Success = 3,
    Failed = 4,
    Locked = 5,
}

impl Default for FlowState {
    fn default() -> Self {
        Self::Init
    }
}

#[derive(Encode, Decode, PartialEq, Clone, Eq, PartialOrd, Ord, TypeInfo, Debug)]
#[repr(u8)]
pub enum ControlMemberState {
    Inactive = 0, // eg inactive after threshold period
    Active = 1,
    Pending = 2,  // application voting pending
    Kicked = 3,
    Banned = 4,
    Exited = 5,
}

#[derive(Encode, Decode, PartialEq, Clone, Eq, PartialOrd, Ord, TypeInfo, Debug)]
#[repr(u8)]
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

pub trait FlowPalletStorage<Hash, Balance> {
    fn campaign_balance(hash: &Hash) -> Balance;
    fn campaign_state(hash: &Hash) -> FlowState;
    fn campaign_contributors_count(hash: &Hash) -> u64;
    fn campaign_org(hash: &Hash) -> Hash;
}
