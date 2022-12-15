use frame_support::pallet_prelude::*;
use codec::MaxEncodedLen;

#[derive(Encode, Decode, Clone, PartialEq, Eq, PartialOrd, Ord, TypeInfo, MaxEncodedLen)]
// #[cfg_attr(feature = "std", derive(Serialize, Deserialize, Debug))]
pub enum BattlepassState {
	Inactive = 0,
	Active = 1,
}
impl Default for BattlepassState {
	fn default() -> Self {
		Self::Active
	}
}


#[derive(Encode, Decode, Default, PartialEq, Eq, TypeInfo, MaxEncodedLen)]
// #[cfg_attr(feature = "std", derive(Serialize, Deserialize, Debug))]
pub struct Battlepass<Hash, AccountId, BlockNumber, BoundedString> {
	pub creator: AccountId,
	pub org_id: Hash,
	pub name: BoundedString,
	pub cid: BoundedString,
    pub state: BattlepassState,
    pub season: u32,
    pub price: u16,
	pub created: BlockNumber,
	pub mutated: BlockNumber,
}