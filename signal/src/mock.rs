#[cfg(test)]
use crate as gamedao_signal;
use frame_support::parameter_types;
use frame_support::traits::{GenesisBuild, Nothing};
use frame_support_test::TestRandomness;
use frame_system;
use orml_traits::parameter_type_with_key;
use sp_core::H256;
use sp_runtime::{
	testing::Header,
	traits::{BlakeTwo256, IdentityLookup},
	Permill,
};

pub type AccountId = u64;
pub type Amount = i128;
pub type Balance = u128;
pub type BlockNumber = u32;
pub type CurrencyId = u32;
pub type Hash = H256;
pub type Moment = u64;

pub const MILLICENTS: Balance = 1_000_000_000;
pub const CENTS: Balance = 1_000 * MILLICENTS;
pub const DOLLARS: Balance = 100 * CENTS;
pub const MAX_DURATION: BlockNumber = DAYS * 100;
pub const MILLISECS_PER_BLOCK: u64 = 6000;
pub const MINUTES: BlockNumber = 60_000 / (MILLISECS_PER_BLOCK as BlockNumber);
pub const HOURS: BlockNumber = MINUTES * 60;
pub const DAYS: BlockNumber = HOURS * 24;
pub const CURRENCY_ID: CurrencyId = 2; // TokenSymbol::GAME
pub const ACC1: AccountId = 1;
pub const ACC2: AccountId = 2;
pub const ACC3: AccountId = 3;
pub const TREASURY_ACC: AccountId = 4;

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
		Currencies: orml_currencies::{Pallet, Call, Event<T>},
		Tokens: orml_tokens::{Pallet, Storage, Event<T>, Config<T>},
		PalletBalances: pallet_balances::{Pallet, Call, Storage, Event<T>},
		PalletTimestamp: pallet_timestamp::{Pallet, Call, Storage, Inherent},
		Flow: gamedao_flow,
		Control: gamedao_control,
		Signal: gamedao_signal,
	}
);

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
	pub const BlockHashCount: u64 = 250;
	pub const SS58Prefix: u8 = 42;
	pub BlockWeights: frame_system::limits::BlockWeights =
		frame_system::limits::BlockWeights::simple_max(1024);
	pub const ExistentialDeposit: Balance = 1;
}
impl frame_system::Config for Test {
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
	type AccountData = pallet_balances::AccountData<Balance>;
	type OnNewAccount = ();
	type OnKilledAccount = ();
	type SystemWeightInfo = ();
	type SS58Prefix = SS58Prefix;
	type OnSetCode = ();
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

parameter_types! {
	pub const MaxDAOsPerAccount: u32 = 2;
	pub const MaxMembersPerDAO: u32 = 2;
	pub const MaxCreationsPerBlock: u32 = 2;
	// pub const NetworkCurrencyId: u32 = CURRENCY_ID;
	pub const ProtocolTokenId: u32 = CURRENCY_ID;
	pub const PaymentTokenId: u32 = CURRENCY_ID;
	pub const CreationFee: Balance = 25_000_000_000_000;
	pub const GameDAOTreasury: AccountId = TREASURY_ACC;
}
impl gamedao_control::Config for Test {
	type Balance = Balance;
	// type Moment = Moment;
	type CurrencyId = CurrencyId;
	type WeightInfo = ();
	type Event = Event;
	type Currency = Currencies;
	type Randomness = TestRandomness<Self>;

	type GameDAOTreasury = GameDAOTreasury;

	type ForceOrigin = frame_system::EnsureRoot<Self::AccountId>;

	type MaxDAOsPerAccount = MaxDAOsPerAccount;
	type MaxMembersPerDAO = MaxMembersPerDAO;
	type MaxCreationsPerBlock = MaxCreationsPerBlock;
	type ProtocolTokenId = ProtocolTokenId;
	type PaymentTokenId = PaymentTokenId;
	type CreationFee = CreationFee;
}

parameter_types! {
	pub const MinNameLength: u32 = 2;
	pub const MaxNameLength: u32 = 4;
	pub const MaxCampaignsPerAddress: u32 = 3;
	pub const MaxCampaignsPerBlock: u32 = 1;
	pub const MaxContributionsPerBlock: u32 = 3;
	pub const MinCampaignDuration: BlockNumber = 1 * DAYS;
	pub const MaxCampaignDuration: BlockNumber = 100 * DAYS;
	pub const MinCreatorDeposit: Balance = 1 * DOLLARS;
	pub const MinContribution: Balance = 1 * DOLLARS;
	pub CampaignFee: Permill = Permill::from_rational(1u32, 10u32); // 10%
	pub const GAMECurrencyId: CurrencyId = CURRENCY_ID;
	// pub const GameDAOTreasury: AccountId = TREASURY_ACC;
}
impl gamedao_flow::Config for Test {
	type Balance = Balance;
	// type Moment = Moment;
	type CurrencyId = CurrencyId;
	type WeightInfo = ();
	type Event = Event;
	type Currency = Currencies;
	type ProtocolTokenId = GAMECurrencyId;
	type UnixTime = PalletTimestamp;
	type Randomness = TestRandomness<Self>;
	type Control = Control;
	type GameDAOAdminOrigin = frame_system::EnsureRoot<Self::AccountId>;
	type GameDAOTreasury = GameDAOTreasury;
	type MinNameLength = MinNameLength;
	type MaxNameLength = MaxNameLength;
	type MaxCampaignsPerAddress = MaxCampaignsPerAddress;
	type MaxCampaignsPerBlock = MaxCampaignsPerBlock;
	type MaxContributionsPerBlock = MaxContributionsPerBlock;
	type MinCampaignDuration = MinCampaignDuration;
	type MaxCampaignDuration = MaxCampaignDuration;
	type MinCreatorDeposit = MinCreatorDeposit;
	type MinContribution = MinContribution;
	type CampaignFee = CampaignFee;
}

parameter_types! {
	pub const MaxProposalsPerBlock: u32 = 2;
	pub const MaxProposalDuration: u32 = 20;
}
impl gamedao_signal::Config for Test {
	type Event = Event;
	type ForceOrigin = frame_system::EnsureRoot<Self::AccountId>;
	type WeightInfo = ();
	type Control = Control;
	type Flow = Flow;
	type MaxProposalsPerBlock = MaxProposalsPerBlock;
	type MaxProposalDuration = MaxProposalDuration;
	type ProtocolTokenId = ProtocolTokenId;
	type Randomness = TestRandomness<Self>;
	type Currency = Currencies;
}

#[derive(Default)]
pub struct ExtBuilder;
impl ExtBuilder {
	pub fn build(self) -> sp_io::TestExternalities {
		let mut t = frame_system::GenesisConfig::default().build_storage::<Test>().unwrap();
		orml_tokens::GenesisConfig::<Test> {
			balances: vec![
				(ACC1, CURRENCY_ID, 100 * DOLLARS),
				(ACC2, CURRENCY_ID, 100 * DOLLARS),
				(ACC3, CURRENCY_ID, 100 * DOLLARS),
				(TREASURY_ACC, CURRENCY_ID, 25 * DOLLARS),
			],
		}
		.assimilate_storage(&mut t)
		.unwrap();
		let mut ext = sp_io::TestExternalities::new(t);
		ext.execute_with(|| System::set_block_number(1));
		ext
	}
}
