use frame_support::pallet_prelude::*;
use codec::MaxEncodedLen;

#[derive(Encode, Decode, Clone, PartialEq, Eq, PartialOrd, Ord, TypeInfo, MaxEncodedLen)]
pub enum BattlepassState {
	Draft = 0,
	Active = 1,
	Closed = 2,
}
impl Default for BattlepassState {
	fn default() -> Self {
		Self::Draft
	}
}

#[derive(Encode, Decode, Default, PartialEq, Eq, TypeInfo, MaxEncodedLen)]
pub struct Battlepass<Hash, AccountId, BlockNumber, BoundedString> {
	pub creator: AccountId,
	pub org_id: Hash,
	pub name: BoundedString,
	pub cid: BoundedString,
    pub season: u32,
    pub price: u16,				// TODO: introduce currency
	/// Collection that will store all claimed Battlepass-NFTs
	pub collection_id: u32,
	pub created: BlockNumber,
	pub mutated: BlockNumber,
}

#[derive(Encode, Decode, Default, PartialEq, Eq, TypeInfo, MaxEncodedLen)]
pub struct BattlepassNft {
	pub collection_id: u32,
	pub nft_id: u32,
}