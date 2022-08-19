use frame_support::pallet_prelude::{Decode, Encode, MaxEncodedLen};
use scale_info::TypeInfo;
use sp_runtime::Permill;
use frame_support::BoundedVec;
use frame_support::pallet_prelude::Get;


/// Simple index type for proposal counting.
pub type ProposalIndex = u32;

pub type VotingPower = u128;

#[derive(Encode, Decode, PartialEq, Clone, TypeInfo, MaxEncodedLen)]
#[cfg_attr(feature = "std", derive(Debug))]
pub enum BlockType {
	Start = 0, 	// Proposal Init -> Active
	Expiry = 1,	// Proposal Active -> Approved | Rejected
}

#[derive(Encode, Decode, PartialEq, Clone, TypeInfo, MaxEncodedLen)]
#[cfg_attr(feature = "std", derive(Debug))]
pub enum ProposalType {
	General = 0,
	Withdrawal = 1,
	Spending = 2,
}

#[derive(Encode, Decode, PartialEq, Clone, TypeInfo, MaxEncodedLen)]
#[cfg_attr(feature = "std", derive(Debug))]
pub enum SlashingRule {
	Automated = 0,
	Tribunal = 1,
}
impl Default for SlashingRule {
	fn default() -> Self {
		SlashingRule::Automated
	}
}

#[derive(Encode, Decode, PartialEq, Clone, TypeInfo, MaxEncodedLen)]
#[cfg_attr(feature = "std", derive(Debug))]
pub enum ProposalState {
	Created = 0,      // waiting for start block
	Active = 1,    // voting is active
	Accepted = 2,  // voters did approve
	Rejected = 3,  // voters did not approve
	Expired = 4,   // ended without votes
	// TODO: Aborted
	Aborted = 5,   // sudo abort
	Finalized = 6, // proposal's action applied
}
impl Default for ProposalState {
	fn default() -> Self {
		ProposalState::Created
	}
}

#[derive(Encode, Decode, Clone, PartialEq, TypeInfo, MaxEncodedLen)]
#[cfg_attr(feature = "std", derive(Debug))]
pub struct Proposal<Hash, BlockNumber, AccountId, Balance, CurrencyId, BoundedString> {
	pub index: ProposalIndex,
	pub owner: AccountId,
	pub title: BoundedString,
	pub cid: BoundedString,
	pub org_id: Hash,
	pub campaign_id: Option<Hash>,
	pub proposal_type: ProposalType,
	pub deposit: Balance,
	pub start: BlockNumber,
	pub expiry: BlockNumber,
	pub amount: Option<Balance>,
	pub currency_id: Option<CurrencyId>,
	pub beneficiary: Option<AccountId>,
	pub slashing_rule: SlashingRule,
}

#[derive(Encode, Decode, PartialEq, Clone, TypeInfo, MaxEncodedLen)]
#[cfg_attr(feature = "std", derive(Debug))]
pub enum Majority {
	Simple = 0,
	Relative = 1,
	Absolute = 2,
}

#[derive(Encode, Decode, PartialEq, Clone, TypeInfo, MaxEncodedLen)]
#[cfg_attr(feature = "std", derive(Debug))]
pub enum Unit {
	Account = 0,
	Token = 1,
}

#[derive(Encode, Decode, PartialEq, Clone, TypeInfo, MaxEncodedLen)]
#[cfg_attr(feature = "std", derive(Debug))]
pub enum Scale {
	Linear = 0,
	Quadratic = 1,
}

#[derive(Encode, Decode, Clone, TypeInfo, MaxEncodedLen)]
#[scale_info(skip_type_params(MaxMembersPerOrg))]
#[cfg_attr(feature = "std", derive(Debug))]
pub struct Voting<AccountId, Balance, MaxMembersPerOrg>
where
MaxMembersPerOrg: Get<u32>,
{
	pub index: ProposalIndex, // Nonce
	pub unit: Unit, // Account or Token
	// 1. Voting process:
	// Currently support only Yes/No voting type
	pub ayes: BoundedVec<(AccountId, VotingPower, Option<Balance>), MaxMembersPerOrg>,
	pub nays: BoundedVec<(AccountId, VotingPower, Option<Balance>), MaxMembersPerOrg>,
	// For multiple choice/options should be refactored, ex.:
	// 	pub votes: BoundedVec<(AccountId, Option, VotingPower, Option<Balance>), MaxMembersPerOrg>,
	// Transforms vote's weight during voting process
	pub scale: Scale, // Linear or Quadratic
	// 2. Voting finalization:
	// TODO: how to calculate "eligible" for token quadratic voting? (research needed)
	// Either total number of eligible members or total number of 
	//  eligible tokens, converted to Power
	pub eligible: VotingPower,
	pub participating: VotingPower, // yes power + no power
	pub yes: VotingPower,
	pub no: VotingPower,
	pub quorum: Option<Permill>, // Percent of eligible
	pub majority: Majority, // Simple, Relative, Absolute
}
