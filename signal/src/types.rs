use frame_support::pallet_prelude::{Decode, Encode, MaxEncodedLen};
use scale_info::TypeInfo;

#[derive(Encode, Decode, PartialEq, Clone, TypeInfo, MaxEncodedLen)]
#[cfg_attr(feature = "std", derive(Debug))]
pub enum ProposalState {
	Init = 0,      // waiting for start block
	Active = 1,    // voting is active
	Accepted = 2,  // voters did approve
	Rejected = 3,  // voters did not approve
	Expired = 4,   // ended without votes
	Aborted = 5,   // sudo abort
	Finalized = 6, // accepted withdrawal proposal is processed
}
impl Default for ProposalState {
	fn default() -> Self {
		ProposalState::Init
	}
}

#[derive(Encode, Decode, PartialEq, Clone, TypeInfo, MaxEncodedLen)]
#[cfg_attr(feature = "std", derive(Debug))]
pub enum ProposalType {
	General = 0,
	Multiple = 1,
	Member = 2,
	Withdrawal = 3,
	Spending = 4,
}
impl Default for ProposalType {
	fn default() -> Self {
		ProposalType::General
	}
}

#[derive(Encode, Decode, PartialEq, Clone, TypeInfo, MaxEncodedLen)]
#[cfg_attr(feature = "std", derive(Debug))]
pub enum VotingType {
	Simple = 0,   // votes across participating votes
	Token = 1,    // weight across participating votes
	Absolute = 2, // votes vs all eligible voters
	Quadratic = 3,
	Ranked = 4,
	Conviction = 5,
}
impl Default for VotingType {
	fn default() -> Self {
		VotingType::Simple
	}
}

#[derive(Encode, Decode, Default, Clone, PartialEq, TypeInfo, MaxEncodedLen)]
#[cfg_attr(feature = "std", derive(Debug))]
pub struct Proposal<Hash, BlockNumber> {
	pub proposal_id: Hash,
	pub org_id: Hash,
	pub campaign_id: Option<Hash>,
	pub proposal_type: ProposalType,
	pub voting_type: VotingType,
	pub start: BlockNumber,
	pub expiry: BlockNumber,
}

#[derive(Encode, Decode, Default, Clone, PartialEq, TypeInfo, MaxEncodedLen)]
#[cfg_attr(feature = "std", derive(Debug))]
pub struct ProposalMetadata<Balance, BoundedString> {
	pub title: BoundedString,
	pub cid: BoundedString,
	pub amount: Balance,
}
