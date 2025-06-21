use frame_support::pallet_prelude::*;

#[derive(Encode, Decode, Clone, PartialEq, Eq, PartialOrd, Ord, TypeInfo, MaxEncodedLen)]
#[cfg_attr(feature = "std", derive(Debug))]
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

#[derive(Encode, Decode, Clone, PartialEq, Eq, PartialOrd, Ord, TypeInfo, MaxEncodedLen)]
#[cfg_attr(feature = "std", derive(Debug))]
#[repr(u8)]
pub enum CampaignState {
	Created = 0,	// waiting for start block
	Active = 1,	// contributions are allowed
	Paused = 2, 	// under discussion, pending council decision, can be unpaused or failed and therefore reverted
	Succeeded = 3,
	Failed = 4,
	Locked = 5,		// authority lock due to e.g. legal actions, community votes. similar to a circuit breaker
}

impl Default for CampaignState {
	fn default() -> Self {
		Self::Created
	}
}

#[derive(Encode, Decode, Clone, PartialEq, Eq, PartialOrd, Ord, TypeInfo, MaxEncodedLen)]
#[cfg_attr(feature = "std", derive(Debug))]
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

/// Simple index type for proposal counting.
pub type CampaignIndex = u32;

#[derive(Encode, Decode, Default, Clone, PartialEq, Eq, TypeInfo, MaxEncodedLen)]
#[cfg_attr(feature = "std", derive(Debug))]
pub struct Campaign<Hash, AccountId, Balance, BlockNumber, BoundedString> {
	// unique id to identify campaign
	pub index: CampaignIndex,
	// hash of the overarching body from module-control
	pub org_id: Hash,
	// name
	pub name: BoundedString,

	// controller account -> must match body controller
	// during campaing runtime controller change is not allowed
	// needs to be revised to avoid campaign attack by starting
	// a campagin when dao wants to remove controller for reasons
	pub owner: AccountId,

	// TODO: THIS NEEDS TO BE GAMEDAO COUNCIL
	/// admin account of the campaign (operator)
	pub admin: AccountId,

	// TODO: assets => GAME
	/// campaign owners deposit
	pub deposit: Balance,

	pub start: BlockNumber,
	// start: BlockNumber,
	/// block until campaign has to reach cap
	pub expiry: BlockNumber,
	/// minimum amount of token to become a successful campaign
	pub cap: Balance,

	/// protocol after successful raise
	pub protocol: FlowProtocol,
	/// governance after successful raise
	pub governance: FlowGovernance,

	/// content storage
	pub cid: BoundedString,

	// TODO: prepare for launchpad functionality
	// token cap
	// token_cap: u64,
	// token_price
	// token_price: u64,
	pub token_symbol: Option<BoundedString>,
	pub token_name: Option<BoundedString>,
	/// creation timestamp
	pub created: BlockNumber,
}

#[derive(Encode, Decode, PartialEq, Clone, TypeInfo, MaxEncodedLen)]
#[cfg_attr(feature = "std", derive(Debug))]
pub enum BlockType {
	Start = 0, 	// Campaign Init -> Active
	Expiry = 1,	// Campaign Active -> Approved | Rejected
}