#[cfg(test)]

use crate as pallet_signal;
use frame_support::parameter_types;
use frame_system as system;
use frame_support_test::TestRandomness;
use sp_std::cell::RefCell;
use sp_runtime::{
    testing::Header,
    traits::{BlakeTwo256, IdentityLookup},
    // BuildStorage,
};
// use orml_currencies::{Currency};
use crate::traits::{Flow, FlowState};
use support::{ControlPalletStorage, ControlState, ControlMemberState};
use primitives::{Balance, CurrencyId, Hash, TokenSymbol};

type AccountId = u64;
pub const ACC1: AccountId = 1;
pub const ACC2: AccountId = 2;

pub struct ControlFixture {
	pub body_controller: AccountId,
	pub body_treasury: AccountId,
	pub body_member_state: ControlMemberState,
	pub body_state: ControlState
}
impl ControlFixture {
	pub fn body_controller(&mut self, value: AccountId) {
		self.body_controller = value;
	}
	pub fn body_state(&mut self, value: ControlState) {
		self.body_state = value;
	}
	pub fn body_member_state(&mut self, value: ControlMemberState) {
		self.body_member_state = value;
	}
}
thread_local!(
	pub static control_fixture: RefCell<ControlFixture> = RefCell::new(ControlFixture {
		body_controller: ACC1,
		body_treasury: ACC2,
		body_member_state: ControlMemberState::Active,
		body_state: ControlState::Active
	});
);


pub struct ControlMock;
impl ControlPalletStorage<AccountId, Hash> for ControlMock {

	fn body_controller(_org: &Hash) -> AccountId { control_fixture.with(|v| v.borrow().body_controller.clone()) }
	fn body_treasury(_org: &Hash) -> AccountId { control_fixture.with(|v| v.borrow().body_treasury.clone()) }
	fn body_member_state(_hash: &Hash, _account_id: &AccountId) -> ControlMemberState { control_fixture.with(|v| v.borrow().body_member_state.clone()) }
	fn body_state(_hash: &Hash) -> ControlState { control_fixture.with(|v| v.borrow().body_state.clone()) }
}
// impl ControlPalletStorage<AccountId, Hash> for ControlMock {

// 	fn body_controller(_org: &Hash) -> AccountId { ACC1 }
// 	fn body_treasury(_org: &Hash) -> AccountId { ACC2 }
// 	fn body_member_state(_hash: &Hash, _account_id: &AccountId) -> ControlMemberState { ControlMemberState::Active }
// 	fn body_state(_hash: &Hash) -> ControlState { ControlState::Active }
// }

pub struct FlowMock;
impl Flow<Hash, Balance> for FlowMock {
	fn campaign_balance(_hash: &Hash) -> Balance { Default::default() }
    fn campaign_state(_hash: &Hash) -> FlowState { FlowState::Active }
    fn campaign_contributors_count(_hash: &Hash) -> u64 { 0 }
    fn campaign_org(_hash: &Hash) -> Hash { Default::default() }
}

type UncheckedExtrinsic = frame_system::mocking::MockUncheckedExtrinsic<Test>;
type Block = frame_system::mocking::MockBlock<Test>;

// Configure a mock runtime to test the pallet.
frame_support::construct_runtime!(
    pub enum Test where
        Block = Block,
        NodeBlock = Block,
        UncheckedExtrinsic = UncheckedExtrinsic,
    {
        System: frame_system::{Pallet, Call, Config, Storage, Event<T>},
        Signal: pallet_signal::{Pallet, Call, Storage, Event<T>},
    }
);

parameter_types! {
    pub const BlockHashCount: u64 = 250;
    pub const SS58Prefix: u8 = 42;
    pub BlockWeights: frame_system::limits::BlockWeights =
        frame_system::limits::BlockWeights::simple_max(1024);
    pub static ExistentialDeposit: u64 = 0;

    pub const MaxProposalsPerBlock: u32 = 2;
    pub const MaxProposalDuration: u32 = 20;
    pub const FundingCurrencyId: CurrencyId = TokenSymbol::GAME as u32;
}

// impl pallet_randomness_collective_flip::Config for Test {}

impl system::Config for Test {
    type BaseCallFilter = frame_support::traits::Everything;
    type BlockWeights = ();
    type BlockLength = ();
    type DbWeight = ();
    type Origin = Origin;
    type Call = Call;
    type Index = u64;
    type BlockNumber = u64;
    type Hash = Hash;
    type Hashing = BlakeTwo256;
    type AccountId = AccountId;
    type Lookup = IdentityLookup<Self::AccountId>;
    type Header = Header;
    type Event = Event;
    type BlockHashCount = BlockHashCount;
    type Version = ();
    type PalletInfo = PalletInfo;
    type AccountData = ();
    type OnNewAccount = ();
    type OnKilledAccount = ();
    type SystemWeightInfo = ();
    type SS58Prefix = SS58Prefix;
    type OnSetCode = ();
}

impl pallet_signal::Config for Test {
    type Event = Event;
    type ForceOrigin = frame_system::EnsureRoot<Self::AccountId>;
    type WeightInfo = ();
    type Control = ControlMock;
    type Flow = FlowMock;
    type MaxProposalsPerBlock = MaxProposalsPerBlock;
	type MaxProposalDuration = MaxProposalDuration;
	type FundingCurrencyId = FundingCurrencyId;
	type Randomness = TestRandomness<Self>;
	// type Currency = Currency<Config, AccountId>;
}

#[derive(Default)]
pub struct ExtBuilder;
impl ExtBuilder {
    pub fn build(self) -> sp_io::TestExternalities {
        let t = system::GenesisConfig::default().build_storage::<Test>().unwrap();
        let mut ext = sp_io::TestExternalities::new(t);
        ext.execute_with(|| System::set_block_number(1));
        ext
    }
}
