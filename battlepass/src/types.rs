use frame_support::pallet_prelude::*;
use codec::MaxEncodedLen;

#[derive(Encode, Decode, Clone, Debug, PartialEq, Eq, PartialOrd, Ord, TypeInfo, MaxEncodedLen)]
pub enum BattlepassState {
	DRAFT,
	ACTIVE,
	ENDED,
}
impl Default for BattlepassState {
	fn default() -> Self {
		Self::DRAFT
	}
}

#[derive(Encode, Decode, Default, PartialEq, Eq, TypeInfo, MaxEncodedLen)]
/// Battlepass struct
///
/// `collection_id`: Collection that will store all claimed Battlepass-NFTs
pub struct Battlepass<Hash, AccountId, BoundedString> {
	pub creator: AccountId,
	pub org_id: Hash,
	pub name: BoundedString,
	pub cid: BoundedString,
	pub season: u32,
	pub price: u16,				// TODO: introduce currency
	pub collection_id: u32
}

#[derive(Encode, Decode, Default, Clone, PartialEq, Eq, TypeInfo, MaxEncodedLen)]
pub struct BattlepassInfo<Hash, AccountId> {
	/// Total number of battlepasses per organization.
	pub count: u32,
	/// Curent active battlepass
	pub active: Option<Hash>,
	/// Account of the authorized service which can update users' data
	pub bot: Option<AccountId>
}

#[derive(Encode, Decode, Default, PartialEq, Eq, TypeInfo, MaxEncodedLen)]
/// Reward struct
///
/// `collection_id`: Collection that will store all claimed Reward-NFTs
pub struct Reward<Hash, BoundedString> {
	pub battlepass_id: Hash,
	pub name: BoundedString,
	pub cid: BoundedString,
	pub level: u8,
	pub transferable: bool,
	pub collection_id: u32
}

#[derive(Encode, Decode, Clone, Debug, PartialEq, Eq, PartialOrd, Ord, TypeInfo, MaxEncodedLen)]
pub enum RewardState {
	ACTIVE,
	INACTIVE,
}
impl Default for RewardState {
	fn default() -> Self {
		Self::ACTIVE
	}
}