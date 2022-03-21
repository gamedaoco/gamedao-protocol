#![cfg(test)]

use crate as pallet_control;
use frame_system;
use frame_support::traits::GenesisBuild;
use frame_support_test::TestRandomness;
use primitives::{Amount, Balance, CurrencyId, Hash, TokenSymbol};
use sp_runtime::{
	testing::Header,
	traits::{IdentityLookup},
};

type UncheckedExtrinsic = frame_system::mocking::MockUncheckedExtrinsic<Test>;
type Block = frame_system::mocking::MockBlock<Test>;
type AccountId = u64;
type BlockNumber = u32;
const GAME_CURRENCY_ID: u32 = TokenSymbol::GAME as u32;

pub const TREASURY_ACCOUNT: AccountId = 3;
pub const CONTROLLER_ACCOUNT: AccountId = 4;
pub const USER_ACCOUNT: AccountId = 5;

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
	pub const MaxMembersPerDAO: u32 = 2;
	pub const MaxCreationsPerBlock: u32 = 2;
	pub const NetworkCurrencyId: u32 = GAME_CURRENCY_ID;
	pub const FundingCurrencyId: u32 = GAME_CURRENCY_ID;
	pub const DepositCurrencyId: u32 = GAME_CURRENCY_ID;
	pub const CreationFee: Balance = 25_000_000_000_000;
	pub const GameDAOTreasury: AccountId = TREASURY_ACCOUNT;
}
impl pallet_control::Config for Test {
	type WeightInfo = ();
	type Event = Event;
	type Currency = Currencies;
	// type UnixTime = PalletTimestamp;
	type Randomness = TestRandomness<Self>;

	// type GameDAOAdminOrigin: EnsureOrigin<Self::Origin>;
	type GameDAOTreasury = GameDAOTreasury;

	type ForceOrigin = frame_system::EnsureRoot<Self::AccountId>;

	type MaxDAOsPerAccount = MaxDAOsPerAccount;
	type MaxMembersPerDAO = MaxMembersPerDAO;
	type MaxCreationsPerBlock = MaxCreationsPerBlock;
	type FundingCurrencyId = FundingCurrencyId;
	type DepositCurrencyId = DepositCurrencyId;
	type CreationFee = CreationFee;
}

// Build genesis storage according to the mock runtime.
pub fn new_test_ext() -> sp_io::TestExternalities {
	let mut t = frame_system::GenesisConfig::default().build_storage::<Test>().unwrap();
	let cent = 1_000_000_000_000;
	orml_tokens::GenesisConfig::<Test> {
		balances: vec![
			(TREASURY_ACCOUNT, GAME_CURRENCY_ID, 100 * 100 * cent),
			(CONTROLLER_ACCOUNT, GAME_CURRENCY_ID, 100 * 100 * cent),
			(USER_ACCOUNT, GAME_CURRENCY_ID, 100 * 100 * cent),
		],
	}.assimilate_storage(&mut t).unwrap();
	t.into()
}
