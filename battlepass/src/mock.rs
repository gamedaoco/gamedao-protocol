#![cfg(test)]

use crate as gamedao_battlepass;
// use frame_support::traits::{ConstU16, ConstU64};
use frame_support::{construct_runtime, parameter_types, PalletId,
	traits::{AsEnsureOriginWithArg, Nothing, GenesisBuild},
	pallet_prelude::*,
};
use frame_system;
use frame_system::{EnsureRoot, EnsureSigned};
use sp_std::convert::{TryFrom, TryInto};
use sp_core::H256;
use sp_runtime::{
	testing::Header,
	traits::{BlakeTwo256, IdentityLookup},
};
use orml_traits::parameter_type_with_key;

type UncheckedExtrinsic = frame_system::mocking::MockUncheckedExtrinsic<Test>;
type Block = frame_system::mocking::MockBlock<Test>;

// types
pub type Hash = H256;
pub type Balance = u128;
pub type BlockNumber = u64;
pub type AccountId = u32;
pub type CurrencyId = u32;
pub type Amount = i128;

/// Constants:
pub const MILLICENTS: Balance = 1_000_000_000;
pub const CENTS: Balance = 1_000 * MILLICENTS;
pub const DOLLARS: Balance = 100 * CENTS;
pub const NATIVE_TOKEN_ID: CurrencyId = 0;
pub const PROTOCOL_TOKEN_ID: CurrencyId = 1;
pub const PAYMENT_TOKEN_ID: CurrencyId = 2;

// Org creator:
pub const ALICE: AccountId = 11;
// Contributors:
pub const BOB: AccountId = 12;
pub const EVA: AccountId = 13;
pub const TOM: AccountId = 14;

pub const INIT_BALANCE: Balance = 100 * DOLLARS;

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
construct_runtime!(
	pub enum Test where
		Block = Block,
		NodeBlock = Block,
		UncheckedExtrinsic = UncheckedExtrinsic,
	{
		System: frame_system::{Pallet, Call, Config, Storage, Event<T>},
		PalletBalances: pallet_balances::{Pallet, Call, Storage, Event<T>},
		Tokens: orml_tokens::{Pallet, Storage, Event<T>, Config<T>},
		Currencies: orml_currencies::{Pallet, Call},
        Uniques: pallet_uniques::{Pallet, Call, Storage, Event<T>},
        RmrkCore: pallet_rmrk_core::{Pallet, Call, Event<T>, Storage},
        Control: gamedao_control,
		Battlepass: gamedao_battlepass::{Pallet, Call, Event<T>, Storage},
	}
);

parameter_types! {
	pub const BlockHashCount: u32 = 250;
	pub const SS58Prefix: u8 = 42;
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
	type Event = Event;
	type Balance = Balance;
	type Amount = Amount;
	type CurrencyId = CurrencyId;
	type WeightInfo = ();
	type ExistentialDeposits = ExistentialDeposits;
	type OnDust = ();
	type MaxLocks = ();
	type MaxReserves = MaxReserves;
	type OnNewTokenAccount = ();
	type OnKilledTokenAccount = ();
	type DustRemovalWhitelist = Nothing;
	type ReserveIdentifier = ReserveIdentifier;
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
	pub CollectionDeposit: Balance = 0;
	pub ItemDeposit: Balance = 0;
	pub MetadataDepositBase: Balance = 0;
	pub MetadataDepositPerByte: Balance = 0;
	
}

impl pallet_uniques::Config for Test {
	type Event = Event;
	type CollectionId = u32;
	type ItemId = u32;
	type Currency = PalletBalances;
	type ForceOrigin = frame_system::EnsureRoot<AccountId>;
	type CollectionDeposit = CollectionDeposit;
	type ItemDeposit = ItemDeposit;
	type MetadataDepositBase = MetadataDepositBase;
	type AttributeDepositBase = MetadataDepositBase;
	type DepositPerByte = MetadataDepositPerByte;
	type StringLimit = StringLimit;
	type KeyLimit = ConstU32<32>;
	type ValueLimit = ConstU32<256>;
	type WeightInfo = ();
	type CreateOrigin = AsEnsureOriginWithArg<EnsureSigned<AccountId>>;
	type Locker = pallet_rmrk_core::Pallet<Test>;
}

parameter_types! {
	pub const PartsLimit: u32 = 25;
	pub const CollectionSymbolLimit: u32 = 100;
	pub const MaxResourcesOnMint: u32 = 100;
    pub const StringLimit: u32 = 64;
}

impl pallet_rmrk_core::Config for Test {
	type Event = Event;
	type ProtocolOrigin = EnsureRoot<AccountId>;
	type MaxRecursions = ConstU32<10>;
	type ResourceSymbolLimit = ConstU32<10>;
	type PartsLimit = PartsLimit;
	type MaxPriorities = ConstU32<25>;
	type CollectionSymbolLimit = CollectionSymbolLimit;
	type MaxResourcesOnMint = MaxResourcesOnMint;
}

parameter_types! {
	pub const NativeTokenId: CurrencyId = NATIVE_TOKEN_ID;
	pub const ProtocolTokenId: CurrencyId = PROTOCOL_TOKEN_ID;
	pub const PaymentTokenId: CurrencyId = PAYMENT_TOKEN_ID;
	pub const MinimumDeposit: Balance = 5 * DOLLARS;
	pub const ControlPalletId: PalletId = PalletId(*b"gd/cntrl");
	pub const MaxMembers: u32 = 1000;
}
impl gamedao_control::Config for Test {
	type Balance = Balance;
	type CurrencyId = CurrencyId;
	type WeightInfo = ();
	type Event = Event;
	type Currency = Currencies;
	type MaxMembers = MaxMembers;
	type ProtocolTokenId = ProtocolTokenId;
	type PaymentTokenId = PaymentTokenId;
	type MinimumDeposit = MinimumDeposit;
	type PalletId = ControlPalletId;
	type StringLimit = ConstU32<256>;
}

impl gamedao_battlepass::Config for Test {
	type Event = Event;
	type Balance = Balance;
	type CurrencyId = CurrencyId;
	type Currency = Currencies;
	type Control = Control;
	#[cfg(feature = "runtime-benchmarks")]
	type ControlBenchmarkHelper = Control;
	type Rmrk = RmrkCore;
	type StringLimit = StringLimit;
	type SymbolLimit = CollectionSymbolLimit;
	type PartsLimit = PartsLimit;
	type MaxResourcesOnMint = MaxResourcesOnMint;
	type NativeTokenId = NativeTokenId;
	type ProtocolTokenId = ProtocolTokenId;
	type WeightInfo = ();
}

// Build genesis storage according to the mock runtime.
pub fn new_test_ext() -> sp_io::TestExternalities {
	let mut t = frame_system::GenesisConfig::default().build_storage::<Test>().unwrap();
	orml_tokens::GenesisConfig::<Test> {
		balances: vec![
			// ALICE org creator
			(ALICE, NATIVE_TOKEN_ID, INIT_BALANCE),
			(ALICE, PROTOCOL_TOKEN_ID, INIT_BALANCE),
			(ALICE, PAYMENT_TOKEN_ID, INIT_BALANCE),
			
			// Contributors
			(BOB, PAYMENT_TOKEN_ID, INIT_BALANCE),
			(EVA, PAYMENT_TOKEN_ID, INIT_BALANCE),
			(1, PAYMENT_TOKEN_ID, INIT_BALANCE),
			(2, PAYMENT_TOKEN_ID, INIT_BALANCE),
			(3, PAYMENT_TOKEN_ID, INIT_BALANCE),
			(4, PAYMENT_TOKEN_ID, INIT_BALANCE),
			(5, PAYMENT_TOKEN_ID, INIT_BALANCE),
		],
	}
	.assimilate_storage(&mut t)
	.unwrap();
	t.into()
}