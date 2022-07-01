#![cfg(test)]

use crate as pallet_control;
use frame_support::{PalletId, {traits::GenesisBuild}};
use frame_system;
use sp_core::H256;
use sp_runtime::{testing::Header, traits::IdentityLookup};

// Types:
pub type AccountId = u32;
pub type BlockNumber = u64;
pub type Hash = H256;
pub type Timestamp = u64;
pub type Moment = u64;
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

// Accounts:
pub const TREASURY: AccountId = 1;
pub const GAME3_TREASURY: AccountId = 2;
pub const GAMEDAO_TREASURY: AccountId = 3;
pub const ALICE: AccountId = 4;
pub const BOB: AccountId = 5;
pub const CHARLIE: AccountId = 6;
pub const DAVE: AccountId = 7;

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
		Control: pallet_control::{Pallet, Call, Storage, Event<T>},
	}
);

frame_support::parameter_types! {
	pub const BlockHashCount: u32 = 250;
	pub const SS58Prefix: u8 = 42;
	pub BlockWeights: frame_system::limits::BlockWeights =
		frame_system::limits::BlockWeights::simple_max(1024);
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
	type Hashing = sp_runtime::traits::BlakeTwo256;
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

orml_traits::parameter_type_with_key! {
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
	type DustRemovalWhitelist = frame_support::traits::Nothing;
}

frame_support::parameter_types! {
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

frame_support::parameter_types! {
	pub const MaxDAOsPerAccount: u32 = 2;
	pub const MaxMembersPerOrg: u32 = 2;
	pub const MaxCreationsPerBlock: u32 = 2;
	pub const ProtocolTokenId: u32 = PROTOCOL_TOKEN_ID;
	pub const PaymentTokenId: CurrencyId = PAYMENT_TOKEN_ID;
	pub const MinimumDeposit: Balance = 5 * DOLLARS;
	pub const ControlPalletId: PalletId = PalletId(*b"gd/cntrl");
	pub const Game3FoundationTreasuryAccountId: AccountId = GAME3_TREASURY;
	pub const GameDAOTreasuryAccountId: AccountId = GAMEDAO_TREASURY;
}
impl pallet_control::Config for Test {
	type Balance = Balance;
	type CurrencyId = CurrencyId;
	type WeightInfo = ();
	type Event = Event;
	type Currency = Currencies;
	type MaxDAOsPerAccount = MaxDAOsPerAccount;
	type MaxMembersPerOrg = MaxMembersPerOrg;
	type MaxCreationsPerBlock = MaxCreationsPerBlock;
	type ProtocolTokenId = ProtocolTokenId;
	type PaymentTokenId = PaymentTokenId;
	type MinimumDeposit = MinimumDeposit;
	type PalletId = ControlPalletId;
	type Game3FoundationTreasury = Game3FoundationTreasuryAccountId;
	type GameDAOTreasury = GameDAOTreasuryAccountId;
}

pub fn new_test_ext() -> sp_io::TestExternalities {
	let mut t = frame_system::GenesisConfig::default().build_storage::<Test>().unwrap();
	orml_tokens::GenesisConfig::<Test> {
		balances: vec![
			(ALICE, PROTOCOL_TOKEN_ID, 100 * DOLLARS),
			(ALICE, PAYMENT_TOKEN_ID, 100 * DOLLARS),
			(BOB, PROTOCOL_TOKEN_ID, 2 * DOLLARS),
			(BOB, PAYMENT_TOKEN_ID, 2 * DOLLARS),
			(CHARLIE, PROTOCOL_TOKEN_ID, 2 * DOLLARS),
			(CHARLIE, PAYMENT_TOKEN_ID, 2 * DOLLARS),
			(TREASURY, PROTOCOL_TOKEN_ID, 100 * DOLLARS),
			(TREASURY, PAYMENT_TOKEN_ID, 100 * DOLLARS),
			(GAMEDAO_TREASURY, PROTOCOL_TOKEN_ID, 0),
			(GAMEDAO_TREASURY, PAYMENT_TOKEN_ID, 0),
		],
	}
	.assimilate_storage(&mut t)
	.unwrap();
	t.into()
}
