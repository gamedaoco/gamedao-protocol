use frame_support::pallet_prelude::{Encode, Decode};
use sp_std::vec::Vec;
use scale_info::TypeInfo;


#[derive(Encode, Decode, Default, Clone, PartialEq, TypeInfo)]
pub struct Proposal<Hash, BlockNumber, ProposalType, VotingType> {
	pub proposal_id: Hash,
	pub context_id: Hash,
	pub proposal_type: ProposalType,
	pub voting_type: VotingType,
	pub start: BlockNumber,
	pub expiry: BlockNumber
}

#[derive(Encode, Decode, Default, Clone, PartialEq, TypeInfo)]
pub struct ProposalMetadata<Balance> {
	pub title: Vec<u8>,
	pub cid: Vec<u8>,
	pub amount: Balance,
}