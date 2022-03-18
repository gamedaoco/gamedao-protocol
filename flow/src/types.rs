// use super::*;
// use frame_support::pallet_prelude::*;
use frame_support::pallet_prelude::{Encode, Decode};
use scale_info::TypeInfo;

#[derive(Encode, Decode, Clone, PartialEq, Eq, PartialOrd, Ord, TypeInfo, Debug)]
#[repr(u8)]
pub enum FlowProtocol {
	Grant = 0,
	Raise = 1,
	Lend = 2,
	Loan = 3,
	Share = 4,
	Pool = 5,
}

impl Default for FlowProtocol {
	fn default() -> Self {
		Self::Raise
	}
}

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

#[derive(Encode, Decode, Clone, PartialEq, Eq, PartialOrd, Ord, TypeInfo, Debug)]
#[repr(u8)]
pub enum FlowGovernance {
	No = 0,  // 100% unreserved upon completion
	Yes = 1, // withdrawal votings
}

impl Default for FlowGovernance {
	fn default() -> Self {
		Self::No
	}
}

// TODO: this can be decomposed to improve weight
#[derive(Encode, Decode, Default, Clone, PartialEq, Eq, TypeInfo)]
pub struct Campaign<Hash, AccountId, Balance, BlockNumber, Moment, FlowProtocol, FlowGovernance>
{
	// unique hash to identify campaign (generated)
	pub(super) id: Hash,
	// hash of the overarching body from module-control
	pub(super) org: Hash,
	// name
	pub(super) name: Vec<u8>,

	// controller account -> must match body controller
	// during campaing runtime controller change is not allowed
	// needs to be revised to avoid campaign attack by starting
	// a campagin when dao wants to remove controller for reasons
	pub(super) owner: AccountId,

	// TODO: THIS NEEDS TO BE GAMEDAO COUNCIL
	/// admin account of the campaign (operator)
	pub(super) admin: AccountId,

	// TODO: assets => GAME
	/// campaign owners deposit
	pub(super) deposit: Balance,

	// TODO: /// campaign start block
	// start: BlockNumber,
	/// block until campaign has to reach cap
	pub(super) expiry: BlockNumber,
	/// minimum amount of token to become a successful campaign
	pub(super) cap: Balance,

	/// protocol after successful raise
	pub(super) protocol: FlowProtocol,
	/// governance after successful raise
	pub(super) governance: FlowGovernance,

	/// content storage
	pub(super) cid: Vec<u8>,

	// TODO: prepare for launchpad functionality
	// token cap
	// token_cap: u64,
	// token_price
	// token_price: u64,
	// /// token symbol
	pub(super) token_symbol: Vec<u8>,
	// /// token name
	pub(super) token_name: Vec<u8>,

	/// creation timestamp
	pub(super) created: Moment,
}