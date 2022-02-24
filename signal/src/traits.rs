pub trait Flow<Hash, Balance> {
    fn campaign_balance(hash: &Hash) -> Balance;
    fn campaign_state(hash: &Hash) -> FlowState;
    fn campaign_contributors_count(hash: &Hash) -> u64;
    fn campaign_org(hash: &Hash) -> Hash;
}

#[derive(PartialEq)]
pub enum FlowState {
    Init = 0,
    Active = 1,
    Paused = 2,
    Success = 3,
    Failed = 4,
    Locked = 5,
}


pub struct ImplPlaceholder;

impl<Hash: Default, Balance: Default> Flow<Hash, Balance> for ImplPlaceholder {
	fn campaign_balance(_hash: &Hash) -> Balance { Default::default() }
	fn campaign_state(_hash: &Hash) -> FlowState { FlowState::Failed }
	fn campaign_contributors_count(_hash: &Hash) -> u64 { Default::default() }
	fn campaign_org(_hash: &Hash) -> Hash { Default::default() }
}