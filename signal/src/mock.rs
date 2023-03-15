#[cfg(test)]
use crate as gamedao_signal;
use frame_support::{
	parameter_types,
	pallet_prelude::*,
	traits::{GenesisBuild, Nothing},
	PalletId
};
use frame_system;
use orml_traits::parameter_type_with_key;
use sp_core::H256;
use sp_runtime::{
	testing::Header,
	traits::{BlakeTwo256, IdentityLookup},
	Permill,
};
use sp_std::convert::{TryFrom, TryInto};

pub type AccountId = u64;
pub type Amount = i128;
pub type Balance = u128;
pub type BlockNumber = u64;
pub type CurrencyId = u32;
pub type Hash = H256;
pub type Moment = u64;
pub type BoundedString = BoundedVec<u8, <Test as gamedao_signal::Config>::StringLimit>;

pub const MILLICENTS: Balance = 1_000_000_000;
pub const CENTS: Balance = 1_000 * MILLICENTS;
pub const DOLLARS: Balance = 100 * CENTS;
pub const MAX_DURATION: BlockNumber = DAYS * 100;
pub const MILLISECS_PER_BLOCK: u64 = 6000;
pub const MINUTES: BlockNumber = 60_000 / (MILLISECS_PER_BLOCK as BlockNumber);
pub const HOURS: BlockNumber = MINUTES * 60;
pub const DAYS: BlockNumber = HOURS * 24;
pub const ALICE: AccountId = 101;
pub const BOB: AccountId = 102;
pub const CHARLIE: AccountId = 103;
pub const TREASURY_ACC: AccountId = 104;
pub const GAME3_TREASURY: AccountId = 105;
pub const GAMEDAO_TREASURY: AccountId = 106;
pub const PROTOCOL_TOKEN_ID: CurrencyId = 1;
pub const PAYMENT_TOKEN_ID: CurrencyId = 2;

type UncheckedExtrinsic = frame_system::mocking::MockUncheckedExtrinsic<Test>;
type Block = frame_system::mocking::MockBlock<Test>;

#[derive(Encode, Decode, Eq, PartialEq, Copy, Clone, RuntimeDebug, PartialOrd, Ord, MaxEncodedLen, TypeInfo)]
#[repr(u8)]
pub enum ReserveIdentifier {
	CollatorSelection,
	Nft,
	TransactionPayment,
	TransactionPaymentDeposit,

	// always the last, indicate number of variants
	Count,
}

// Configure a mock runtime to test the pallet.
frame_support::construct_runtime!(
	pub enum Test where
		Block = Block,
		NodeBlock = Block,
		UncheckedExtrinsic = UncheckedExtrinsic,
	{
		System: frame_system::{Pallet, Call, Config, Storage, Event<T>},
		Currencies: orml_currencies::{Pallet, Call},
		Tokens: orml_tokens::{Pallet, Storage, Event<T>, Config<T>},
		PalletBalances: pallet_balances::{Pallet, Call, Storage, Event<T>},
		PalletTimestamp: pallet_timestamp::{Pallet, Call, Storage, Inherent},
		Flow: gamedao_flow,
		Control: gamedao_control,
		Signal: gamedao_signal,
	}
);

frame_support::parameter_types! {
	pub const MaxReserves: u32 = ReserveIdentifier::Count as u32;
}
parameter_type_with_key! {
	pub ExistentialDeposits: |_currency_id: CurrencyId| -> Balance {
		Default::default()
	};
}
impl orml_tokens::Config for Test {
	type RuntimeEvent = RuntimeEvent;
	type Balance = Balance;
	type Amount = Amount;
	type CurrencyId = CurrencyId;
	type WeightInfo = ();
	type ExistentialDeposits = ExistentialDeposits;
	type CurrencyHooks = ();
	type MaxLocks = ();
	type MaxReserves = MaxReserves;
	type ReserveIdentifier = ReserveIdentifier;
	type DustRemovalWhitelist = Nothing;
}

impl pallet_balances::Config for Test {
	type Balance = Balance;
	type DustRemoval = ();
	type RuntimeEvent = RuntimeEvent;
	type ExistentialDeposit = ExistentialDeposit;
	type AccountStore = frame_system::Pallet<Test>;
	type MaxLocks = ();
	type MaxReserves = ();
	type ReserveIdentifier = ReserveIdentifier;
	type WeightInfo = ();
}
pub type AdaptedBasicCurrency = orml_currencies::BasicCurrencyAdapter<Test, PalletBalances, Amount, BlockNumber>;

impl orml_currencies::Config for Test {
	type MultiCurrency = Tokens;
	type NativeCurrency = AdaptedBasicCurrency;
	type GetNativeCurrencyId = ();
	type WeightInfo = ();
}

parameter_types! {
	pub const BlockHashCount: u64 = 250;
	pub const SS58Prefix: u8 = 42;
	// pub BlockWeights: frame_system::limits::BlockWeights =
	// 	frame_system::limits::BlockWeights::simple_max(1024);
	pub const ExistentialDeposit: Balance = 1;
}
impl frame_system::Config for Test {
	type BaseCallFilter = frame_support::traits::Everything;
	type BlockWeights = ();
	type BlockLength = ();
	type DbWeight = ();
	type RuntimeOrigin = RuntimeOrigin;
	type RuntimeCall = RuntimeCall;
	type Index = u64;
	type BlockNumber = u64;
	type Hash = Hash;
	type Hashing = BlakeTwo256;
	type AccountId = AccountId;
	type Lookup = IdentityLookup<Self::AccountId>;
	type Header = Header;
	type RuntimeEvent = RuntimeEvent;
	type BlockHashCount = BlockHashCount;
	type Version = ();
	type PalletInfo = PalletInfo;
	type AccountData = pallet_balances::AccountData<Balance>;
	type OnNewAccount = ();
	type OnKilledAccount = ();
	type SystemWeightInfo = ();
	type SS58Prefix = SS58Prefix;
	type OnSetCode = ();
	type MaxConsumers = ConstU32<128>;
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

frame_support::parameter_types! {
	pub const ProtocolTokenId: u32 = PROTOCOL_TOKEN_ID;
	pub const PaymentTokenId: CurrencyId = PAYMENT_TOKEN_ID;
	pub const MinimumDeposit: Balance = 1 * DOLLARS;
	pub const ControlPalletId: PalletId = PalletId(*b"gd/cntrl");
	pub const MaxMembers: u32 = 1000;
}
impl gamedao_control::Config for Test {
	type Balance = Balance;
	type CurrencyId = CurrencyId;
	type WeightInfo = ();
	type RuntimeEvent = RuntimeEvent;
	type Currency = Currencies;
	type MaxMembers = MaxMembers;
	type ProtocolTokenId = ProtocolTokenId;
	type PaymentTokenId = PaymentTokenId;
	type MinimumDeposit = MinimumDeposit;
	type PalletId = ControlPalletId;
	type StringLimit = ConstU32<256>;
}

parameter_types! {
	pub const MinNameLength: u32 = 2;
	pub const MaxCampaignsPerBlock: u32 = 2;
	pub const MaxContributorsProcessing: u32 = 100;
	pub const MinContribution: Balance = 1 * DOLLARS;
	pub CampaignFee: Permill = Permill::from_rational(1u32, 10u32); // 10%
	pub const CampaignDurationLimits: (BlockNumber, BlockNumber) = (1 * DAYS, 100 * DAYS);
	pub MinCampaignDeposit: Permill = Permill::from_rational(1u32, 10u32); // 10%
	pub const GameDAOTreasury: AccountId = TREASURY_ACC;
}

impl gamedao_flow::Config for Test {
	type RuntimeEvent = RuntimeEvent;
	type Balance = Balance;
	type CurrencyId = CurrencyId;
	type WeightInfo = ();
	type Currency = Currencies;
	type Control = Control;
	#[cfg(feature = "runtime-benchmarks")]
	type ControlBenchmarkHelper = Control;
	type GameDAOTreasury = GameDAOTreasury;
	type MinNameLength = MinNameLength;
	type MaxCampaignsPerBlock = MaxCampaignsPerBlock;
	type MaxCampaignContributors = ConstU32<1000>;
	type MaxContributorsProcessing = MaxContributorsProcessing;
	type MinCampaignDeposit = MinCampaignDeposit;
	type MinContribution = MinContribution;
	type ProtocolTokenId = ProtocolTokenId;
	type PaymentTokenId = PaymentTokenId;
	type CampaignFee = CampaignFee;
	type StringLimit = ConstU32<256>;
	type CampaignDurationLimits = CampaignDurationLimits;
}

parameter_types! {
	pub const MaxProposalsPerBlock: u32 = 2;
	pub const MinProposalDeposit: Balance = 10 * DOLLARS;
	pub SlashingMajority: Permill = Permill::from_rational(2u32, 3u32);
	pub GameDAOGetsFromSlashing: Permill = Permill::from_rational(1u32, 10u32);
	pub const ProposalDurationLimits: (BlockNumber, BlockNumber) = (100, 864000);
}
impl gamedao_signal::Config for Test {
	type RuntimeEvent = RuntimeEvent;
	type Balance = Balance;
	type CurrencyId = CurrencyId;
	type Currency = Currencies;
	type Control = Control;
	type Flow = Flow;
	#[cfg(feature = "runtime-benchmarks")]
	type ControlBenchmarkHelper = Control;
	#[cfg(feature = "runtime-benchmarks")]
	type FlowBenchmarkHelper = Flow;
	type WeightInfo = ();
	type ProtocolTokenId = ProtocolTokenId;
	type PaymentTokenId = PaymentTokenId;
	type MinProposalDeposit = MinProposalDeposit;
	type ProposalDurationLimits = ProposalDurationLimits;
	type GameDAOTreasury = GameDAOTreasury;
	type SlashingMajority = SlashingMajority;
	type GameDAOGetsFromSlashing = GameDAOGetsFromSlashing;
	type MaxMembers = MaxMembers;
	type MaxProposalsPerBlock = MaxProposalsPerBlock;
	type StringLimit = ConstU32<256>;	
}

#[derive(Default)]
pub struct ExtBuilder;
impl ExtBuilder {
	pub fn build(self) -> sp_io::TestExternalities {
		let mut t = frame_system::GenesisConfig::default().build_storage::<Test>().unwrap();
		orml_tokens::GenesisConfig::<Test> {
			balances: vec![
				(ALICE, PAYMENT_TOKEN_ID, 100 * DOLLARS),
				(ALICE, PROTOCOL_TOKEN_ID, 100 * DOLLARS),
				(BOB, PAYMENT_TOKEN_ID, 100 * DOLLARS),
				(BOB, PROTOCOL_TOKEN_ID, 100 * DOLLARS),
				(CHARLIE, PAYMENT_TOKEN_ID, 0 * DOLLARS),
				(CHARLIE, PROTOCOL_TOKEN_ID, 0 * DOLLARS),
			],
		}
		.assimilate_storage(&mut t)
		.unwrap();
		let mut ext = sp_io::TestExternalities::new(t);
		ext.execute_with(|| System::set_block_number(1));
		ext
	}
}
