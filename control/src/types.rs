use super::*;
use frame_support::pallet_prelude::*;
use codec::MaxEncodedLen;

pub type MemberLimit = u32;

#[derive(Encode, Decode, PartialEq, Clone, Eq, PartialOrd, Ord, TypeInfo, MaxEncodedLen)]
#[cfg_attr(feature = "std", derive(Serialize, Deserialize, Debug))]
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

#[derive(Encode, Decode, PartialEq, Clone, Eq, PartialOrd, Ord, TypeInfo, MaxEncodedLen)]
#[cfg_attr(feature = "std", derive(Serialize, Deserialize, Debug))]
#[repr(u8)]
pub enum MemberState {
	Inactive = 0, // eg inactive after threshold period
	Active = 1,
	Pending = 2, // application voting pending
	Kicked = 3,
	Banned = 4,
	Exited = 5,
}

impl Default for MemberState {
	fn default() -> Self {
		Self::Inactive
	}
}

#[derive(Encode, Decode, PartialEq, Clone, Eq, PartialOrd, Ord, TypeInfo, MaxEncodedLen)]
#[cfg_attr(feature = "std", derive(Serialize, Deserialize, Debug))]
#[repr(u8)]
pub enum OrgState {
	Inactive = 0,
	Active = 1,
	Locked = 2,
}

impl Default for OrgState {
	fn default() -> Self {
		Self::Inactive
	}
}

#[derive(Encode, Decode, Clone, PartialEq, Eq, PartialOrd, Ord, TypeInfo, MaxEncodedLen)]
#[cfg_attr(feature = "std", derive(Serialize, Deserialize, Debug))]
pub enum FeeModel {
	NoFees = 0,   // feeless
	Reserve = 1,  // amount is reserved in user account
	Transfer = 2, // amount is transfered to Org treasury
}
impl Default for FeeModel {
	fn default() -> Self {
		Self::NoFees
	}
}

#[derive(Encode, Decode, Clone, PartialEq, Eq, PartialOrd, Ord, TypeInfo, MaxEncodedLen)]
#[cfg_attr(feature = "std", derive(Serialize, Deserialize, Debug))]
pub enum AccessModel {
	Open = 0,       // anyDAO can join
	Voting = 1,     // application creates membership voting
	Prime = 2, 		// prime invites
}
impl Default for AccessModel {
	fn default() -> Self {
		Self::Open
	}
}

/// Organization
#[derive(Encode, Decode, Default, PartialEq, Eq, TypeInfo, MaxEncodedLen)]
#[cfg_attr(feature = "std", derive(Serialize, Deserialize, Debug))]
pub struct Org<AccountId, Balance, CurrencyId, BlockNumber, BoundedString> {
	pub index: u32,
	pub creator: AccountId,
	pub prime: AccountId,
	pub name: BoundedString,
	pub cid: BoundedString,
	pub org_type: OrgType,
	pub fee_model: FeeModel,
	pub membership_fee: Option<Balance>,
	pub gov_currency: CurrencyId,
	pub pay_currency: CurrencyId,
	pub access_model: AccessModel,
	pub member_limit: MemberLimit,
	pub created: BlockNumber,
	pub mutated: BlockNumber,
}
