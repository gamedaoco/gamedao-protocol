#![cfg(test)]

pub use super::*;
use frame_support::{
	construct_runtime, parameter_types,
	traits::{Everything, Nothing, GenesisBuild}
};
use frame_support_test::TestRandomness;
use frame_system::EnsureRoot;
use sp_core::H256;
use sp_runtime::traits::IdentityLookup;

use orml_traits::parameter_type_with_key;
use gamedao_protocol_support::{ControlPalletStorage, ControlMemberState, ControlState};
use zero_primitives::{Amount, CurrencyId, TokenSymbol, Header};

pub type AccountId = u64;
pub type BlockNumber = u32;
pub type Hash = H256;

// TODO: move it to constants-------
pub const MILLICENTS: Balance = 1_000_000_000;
pub const CENTS: Balance = 1_000 * MILLICENTS;
pub const DOLLARS: Balance = 100 * CENTS;

pub const MILLISECS_PER_BLOCK: u64 = 6000;

pub const MINUTES: BlockNumber = 60_000 / (MILLISECS_PER_BLOCK as BlockNumber);
pub const HOURS: BlockNumber = MINUTES * 60;
pub const DAYS: BlockNumber = HOURS * 24;
// ---------------------------------

pub const ALICE: AccountId = 1;
pub const BOB: AccountId = 2;
pub const GAME: CurrencyId = TokenSymbol::GAME as u32;
pub const MAX_DURATION: BlockNumber = DAYS * 100;


mod pallet_flow {
	pub use super::super::*;
}

parameter_types! {
	pub const BlockHashCount: u32 = 250;
}

impl frame_system::Config for Test {
	type Origin = Origin;
	type Index = u64;
	type BlockNumber = BlockNumber;
	type Call = Call;
	type Hash = H256;
	type Hashing = ::sp_runtime::traits::BlakeTwo256;
	type AccountId = AccountId;
	type Lookup = IdentityLookup<Self::AccountId>;
	type Header = Header;
	type Event = Event;
	type BlockHashCount = BlockHashCount;
	type BlockWeights = ();
	type BlockLength = ();
	type Version = ();
	type PalletInfo = PalletInfo;
	type AccountData = pallet_balances::AccountData<Balance>;
	type OnNewAccount = ();
	type OnKilledAccount = ();
	type DbWeight = ();
	type BaseCallFilter = Everything;
	type SystemWeightInfo = ();
	type SS58Prefix = ();
	type OnSetCode = ();
}

parameter_type_with_key! {
	pub ExistentialDeposits: |_currency_id: CurrencyId| -> Balance {
		Default::default()
	};
}

impl orml_tokens::Config for Test {
	type Event = Event;
	type Balance = Balance;
	type Amount = Amount;
	type CurrencyId = CurrencyId;
	type WeightInfo = ();
	type ExistentialDeposits = ExistentialDeposits;
	type OnDust = ();
	type MaxLocks = ();
	type DustRemovalWhitelist = Nothing;
}

parameter_types! {
	pub const ExistentialDeposit: Balance = 1;
}

impl pallet_balances::Config for Test {
	type Balance = Balance;
	type DustRemoval = ();
	type Event = Event;
	type ExistentialDeposit = ExistentialDeposit;
	type AccountStore = frame_system::Pallet<Test>;
	type MaxLocks = ();
	type MaxReserves = ();
	type ReserveIdentifier = [u8; 8];
	type WeightInfo = ();
}
pub type AdaptedBasicCurrency = orml_currencies::BasicCurrencyAdapter<Test, PalletBalances, Amount, BlockNumber>;

impl orml_currencies::Config for Test {
	type Event = Event;
	type MultiCurrency = Tokens;
	type NativeCurrency = AdaptedBasicCurrency;
	type GetNativeCurrencyId = ();
	type WeightInfo = ();
}

parameter_types! {
	pub const MinimumPeriod: Moment = 1000;
}

impl pallet_timestamp::Config for Test {
	type Moment = Moment;
	type OnTimestampSet = ();
	type MinimumPeriod = MinimumPeriod;
	type WeightInfo = ();
}

pub struct ControlPalletMock<AccountId, Hash> {
	a: AccountId,
	h: Hash,
}

impl ControlPalletStorage<AccountId, Hash> for ControlPalletMock<AccountId, Hash> {
	fn body_controller(org: Hash) -> AccountId { BOB }
	fn body_treasury(org: Hash) -> AccountId { BOB }
	fn body_member_state(_hash: Hash, _account_id: AccountId) -> ControlMemberState { ControlMemberState::Active }
    fn body_state(_hash: Hash) -> ControlState { ControlState::Active }
}

parameter_types! {
	pub const MinLength: u32 = 2;
	pub const MaxLength: u32 = 4;

	pub const MaxCampaignsPerAddress: u32 = 3;
	pub const MaxCampaignsPerBlock: u32 = 3;
	pub const MaxContributionsPerBlock: u32 = 3;

	pub const MinDuration: BlockNumber = 1 * DAYS;
	pub const MaxDuration: BlockNumber = MAX_DURATION;

	pub const MinCreatorDeposit: Balance = 1 * DOLLARS;
	pub const MinContribution: Balance = 1 * DOLLARS;

	pub const CampaignFee: Balance = 25 * CENTS;

	pub const GAMECurrencyId: CurrencyId = TokenSymbol::GAME as u32;
    pub const GameDAOTreasury: AccountId = BOB;
}

impl Config for Test {
    type WeightInfo = ();
	type Event = Event;
	type Currency = Currencies;
	type FundingCurrencyId = GAMECurrencyId;
	type UnixTime = Timestamp;
	type Randomness = TestRandomness<Self>;

	type Control = ControlPalletMock<AccountId, Hash>;

    // TODO: type GameDAOAdminOrigin = EnsureRootOrHalfCouncil
	type GameDAOAdminOrigin = EnsureRoot<Self::AccountId>;
	type GameDAOTreasury = GameDAOTreasury;

	type MinLength = MinLength;
	type MaxLength = MaxLength;

	type MaxCampaignsPerAddress = MaxCampaignsPerAddress;
	type MaxCampaignsPerBlock = MaxCampaignsPerBlock;
	type MaxContributionsPerBlock = MaxContributionsPerBlock;

	type MinDuration = MinDuration;
	type MaxDuration = MaxDuration;
	type MinCreatorDeposit = MinCreatorDeposit;
	type MinContribution = MinContribution;

	type CampaignFee = CampaignFee;
}

type UncheckedExtrinsic = frame_system::mocking::MockUncheckedExtrinsic<Test>;
type Block = frame_system::mocking::MockBlock<Test>;

construct_runtime!(
	pub enum Test where
		Block = Block,
		NodeBlock = Block,
		UncheckedExtrinsic = UncheckedExtrinsic,
	{
		System: frame_system::{Pallet, Call, Storage, Config, Event<T>},
		Currencies: orml_currencies::{Pallet, Call, Event<T>},
		Tokens: orml_tokens::{Pallet, Storage, Event<T>, Config<T>},
		PalletBalances: pallet_balances::{Pallet, Call, Storage, Event<T>},
		Timestamp: pallet_timestamp::{Pallet, Call, Storage, Inherent},
        Flow: pallet_flow,
	}
);

pub fn new_test_ext() -> sp_io::TestExternalities {
	let mut t = frame_system::GenesisConfig::default().build_storage::<Test>().unwrap();
	orml_tokens::GenesisConfig::<Test> {
		balances: vec![
			(ALICE, GAME, 100),
			(BOB, GAME, 100),
		],
	}.assimilate_storage(&mut t).unwrap();
	t.into()
}