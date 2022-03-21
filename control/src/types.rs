use super::*;
use frame_support::pallet_prelude::*;

#[derive(Encode, Decode, PartialEq, Clone, Eq, PartialOrd, Ord, TypeInfo)]
#[cfg_attr(feature = "std", derive(Debug))]
pub enum OrgType {
	Individual = 0,
	Company = 1,
	Dao = 2,
	Hybrid = 3,
}
impl Default for OrgType {
	fn default() -> Self {
		Self::Individual
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

impl Default for ControlMemberState {
	fn default() -> Self {
		Self::Inactive
	}
}

#[derive(Encode, Decode, PartialEq, Clone, Eq, PartialOrd, Ord, TypeInfo, Debug)]
#[repr(u8)]
pub enum ControlState {
	Inactive = 0,
	Active = 1,
	Locked = 2,
}

impl Default for ControlState {
	fn default() -> Self {
		Self::Inactive
	}
}

#[derive(Encode, Decode, Clone, PartialEq, Eq, PartialOrd, Ord, TypeInfo)]
#[cfg_attr(feature = "std", derive(Debug))]
pub enum FeeModel {
	NoFees = 0,		// feeless
	Reserve = 1,	// amount is reserved in user account
	Transfer = 2,	// amount is transfered to Org treasury
}
impl Default for FeeModel {
	fn default() -> Self {
		Self::NoFees
	}
}

#[derive(Encode, Decode, Clone, PartialEq, Eq, PartialOrd, Ord, TypeInfo)]
#[cfg_attr(feature = "std", derive(Debug))]
pub enum AccessModel {
	Open = 0,		// anyDAO can join
	Voting = 1,		// application creates membership voting
	Controller = 2,	// controller invites
}
impl Default for AccessModel {
	fn default() -> Self {
		Self::Open
	}
}


/// Organization
#[derive(Encode, Decode, Default, PartialEq, Eq, TypeInfo)]
#[cfg_attr(feature = "std", derive(Debug))]
pub struct Org<Hash, AccountId, BlockNumber, OrgType> {
	/// Org Hash
	pub(super) id: Hash,
	/// Org global index
	pub(super) index: u128,
	/// Org Creator
	pub(super) creator: AccountId,
	/// Org Name
	pub(super) name: Vec<u8>,
	/// IPFS Hash
	pub(super) cid: Vec<u8>,
	/// Organization Type
	pub(super) org_type: OrgType,
	/// Creation Block
	pub(super) created: BlockNumber,
	/// Last Mutation Block
	pub(super) mutated: BlockNumber,
}

/// Organization Config
// TODO: refactor to bit flags
#[derive(Encode, Decode, PartialEq, Eq, TypeInfo)]
#[cfg_attr(feature = "std", derive(Debug))]
pub struct OrgConfig<Balance, FeeModel, AccessModel> {
	/// Fee Model: TX only | Reserve | Transfer
	pub(super) fee_model: FeeModel,
	/// Fee amount
	pub(super) fee: Balance,
	/// Governance Asset
	pub(super) gov_asset: u8,
	/// Payment Asset
	pub(super) pay_asset: u8,
	/// Access Model
	pub(super) access: AccessModel,
	/// Max Member Limit
	pub(super) member_limit: u64,
}
