use frame_support::pallet_prelude::*;
use codec::MaxEncodedLen;

#[derive(Encode, Decode, Clone, PartialEq, Eq, PartialOrd, Ord, TypeInfo, MaxEncodedLen)]
pub enum BattlepassState {
	DRAFT = 0,
	ACTIVE = 1,
	CLOSED = 2,
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
	/// Collection that will store all claimed Battlepass-NFTs
	pub collection_id: u32
}

#[derive(Encode, Decode, Default, PartialEq, Eq, TypeInfo, MaxEncodedLen)]
pub struct BattlepassInfo<Hash> {
	/// Total number of battlepasses per organization.
	pub count: u32,
	/// Curent active battlepass
	pub active: Option<Hash>
}