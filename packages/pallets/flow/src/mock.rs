#![cfg(test)]

use sp_std::{vec, vec::Vec, convert::{TryFrom, TryInto}};
use frame_support::{
	construct_runtime, parameter_types, PalletId,
	traits::{Everything, GenesisBuild, Nothing},
	pallet_prelude::*,
};
use sp_core::H256;
use sp_runtime::{traits::{IdentityLookup, BlakeTwo256}, Permill};
use frame_system;

use orml_traits::parameter_type_with_key;


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

// Types:
pub type AccountId = u32;
pub type BlockNumber = u64;
pub type Hash = H256;
pub type Balance = u128;
pub type Amount = i128;
pub type CurrencyId = u32;
type UncheckedExtrinsic = frame_system::mocking::MockUncheckedExtrinsic<Test>;
type Block = frame_system::mocking::MockBlock<Test>;

// Constants:
pub const MILLICENTS: Balance = 1_000_000_000;
pub const CENTS: Balance = 1_000 * MILLICENTS;
pub const DOLLARS: Balance = 100 * CENTS;
pub const MILLISECS_PER_BLOCK: u64 = 6000;
pub const MINUTES: BlockNumber = 60_000 / (MILLISECS_PER_BLOCK as BlockNumber);
pub const HOURS: BlockNumber = MINUTES * 60;
pub const DAYS: BlockNumber = HOURS * 24;
pub const PROTOCOL_TOKEN_ID: CurrencyId = 1;
pub const PAYMENT_TOKEN_ID: CurrencyId = 2;

// Contributors:
pub const ALICE: AccountId = 11;
// Org creator:
pub const BOB: AccountId = 12;

pub const GAMEDAO_TREASURY: AccountId = 13;

pub const INIT_BALANCE: Balance = 100 * DOLLARS;

mod gamedao_flow {
	pub use super::super::*;
}

parameter_types! {
	pub const BlockHashCount: u32 = 250;
}

impl frame_system::Config for Test {
	type RuntimeOrigin = RuntimeOrigin;
	type Index = u64;
	type BlockNumber = BlockNumber;
	type RuntimeCall = RuntimeCall;
	type Hash = Hash;
	type Hashing = BlakeTwo256;
	type AccountId = AccountId;
	type Lookup = IdentityLookup<Self::AccountId>;
	type Header = sp_runtime::testing::Header;
	type RuntimeEvent = RuntimeEvent;
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
	type MaxConsumers = ConstU32<128>;
}

parameter_type_with_key! {
	pub ExistentialDeposits: |_currency_id: CurrencyId| -> Balance {
		Default::default()
	};
}
parameter_types! {
	pub const MaxReserves: u32 = ReserveIdentifier::Count as u32;
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

parameter_types! {
	pub const ExistentialDeposit: Balance = 1;
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

frame_support::parameter_types! {
	pub const ProtocolTokenId: u32 = PROTOCOL_TOKEN_ID;
	pub const PaymentTokenId: CurrencyId = PAYMENT_TOKEN_ID;
	pub const MinimumDeposit: Balance = 5 * DOLLARS;
	pub const ControlPalletId: PalletId = PalletId(*b"gd/cntrl");
}
impl gamedao_control::Config for Test {
	type Balance = Balance;
	type CurrencyId = CurrencyId;
	type WeightInfo = ();
	type RuntimeEvent = RuntimeEvent;
	type Currency = Currencies;
	type MaxMembers = ConstU32<10000>;
	type ProtocolTokenId = ProtocolTokenId;
	type PaymentTokenId = PaymentTokenId;
	type MinimumDeposit = MinimumDeposit;
	type PalletId = ControlPalletId;
	type StringLimit = ConstU32<256>;
}

parameter_types! {
	pub const MinNameLength: u32 = 2;
	pub const MaxCampaignsPerBlock: u32 = 2;
	pub const MaxContributorsProcessing: u32 = 4;
	pub const MinContribution: Balance = 1 * DOLLARS;
	pub CampaignFee: Permill = Permill::from_rational(1u32, 15u32); // 15%
	pub const GameDAOTreasury: AccountId = GAMEDAO_TREASURY;
	pub const CampaignDurationLimits: (BlockNumber, BlockNumber) = (1 * DAYS, 100 * DAYS);
	pub MinCampaignDeposit: Permill = Permill::from_rational(1u32, 10u32); // 10%
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
	type MinContribution = MinContribution;
	type MinCampaignDeposit = MinCampaignDeposit;
	type ProtocolTokenId = ProtocolTokenId;
	type PaymentTokenId = PaymentTokenId;
	type CampaignFee = CampaignFee;
	type StringLimit = ConstU32<256>;
	type CampaignDurationLimits = CampaignDurationLimits;
}

construct_runtime!(
	pub enum Test where
		Block = Block,
		NodeBlock = Block,
		UncheckedExtrinsic = UncheckedExtrinsic,
	{
		System: frame_system::{Pallet, Call, Config, Storage, Event<T>},
		Currencies: orml_currencies::{Pallet, Call},
		Tokens: orml_tokens::{Pallet, Storage, Event<T>, Config<T>},
		PalletBalances: pallet_balances::{Pallet, Call, Storage, Event<T>},
		Flow: gamedao_flow,
		Control: gamedao_control,
	}
);

pub fn new_test_ext() -> sp_io::TestExternalities {
	let mut t = frame_system::GenesisConfig::default().build_storage::<Test>().unwrap();
	orml_tokens::GenesisConfig::<Test> {
		balances: vec![
			// BOB org creator
			(BOB, PROTOCOL_TOKEN_ID, INIT_BALANCE),
			(BOB, PAYMENT_TOKEN_ID, INIT_BALANCE),
			
			// Contributors
			(ALICE, PAYMENT_TOKEN_ID, INIT_BALANCE),
			(1, PAYMENT_TOKEN_ID, INIT_BALANCE),
			(2, PAYMENT_TOKEN_ID, INIT_BALANCE),
			(3, PAYMENT_TOKEN_ID, INIT_BALANCE),
			(4, PAYMENT_TOKEN_ID, INIT_BALANCE),
			(5, PAYMENT_TOKEN_ID, INIT_BALANCE),
			(6, PAYMENT_TOKEN_ID, INIT_BALANCE),
			(7, PAYMENT_TOKEN_ID, INIT_BALANCE),
			(8, PAYMENT_TOKEN_ID, INIT_BALANCE),
			(9, PAYMENT_TOKEN_ID, INIT_BALANCE),
			(10, PAYMENT_TOKEN_ID, INIT_BALANCE),

			(GAMEDAO_TREASURY, PROTOCOL_TOKEN_ID, 0),
			(GAMEDAO_TREASURY, PAYMENT_TOKEN_ID, 0),
		],
	}
	.assimilate_storage(&mut t)
	.unwrap();
	t.into()
}
