use scale_info::TypeInfo;
use frame_support::pallet_prelude::*;
use codec::MaxEncodedLen;

#[derive(Encode, Decode, Default, Eq, Copy, PartialEq, Clone, RuntimeDebug, TypeInfo, MaxEncodedLen)]
pub struct Entity<AccountId, BlockNumber, BoundedString> {
	account: AccountId,
	index: u128,
	cid: BoundedString,
	created: BlockNumber,
	mutated: BlockNumber,
}

impl<AccountId, BlockNumber, BoundedString> Entity<AccountId, BlockNumber, BoundedString> {
	pub fn new(
		account: AccountId,
		block_number: BlockNumber,
		index: u128,
		cid: BoundedString,
	) -> Entity<AccountId, BlockNumber, BoundedString>
	where
		BlockNumber: Clone,
	{
		Entity { account, index, cid, created: block_number.clone(), mutated: block_number }
	}
}

#[derive(Encode, Decode, Default, Eq, Copy, PartialEq, Clone, RuntimeDebug, TypeInfo, MaxEncodedLen)]
pub struct EntityProperty<BlockNumber> {
	value: u64,
	mutated: BlockNumber,
}

impl<BlockNumber> EntityProperty<BlockNumber> {
	pub fn new(value: u64, block_number: BlockNumber) -> EntityProperty<BlockNumber> {
		EntityProperty { value, mutated: block_number }
	}
	pub fn get_value(&self) -> &u64 { &self.value }
}

#[derive(Encode, Decode, Clone, PartialEq, Eq, PartialOrd, Ord, TypeInfo, MaxEncodedLen)]
#[cfg_attr(feature = "std", derive(Debug))]
pub enum PropertyType {
	Experience,
	Trust,
	Reputation
}
