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
// Bot
pub const BOT: AccountId = 333;
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

parameter_types! {
	pub CollectionDeposit: Balance = 0;
	pub ItemDeposit: Balance = 0;
	pub const KeyLimit: u32 = 32;	// Max 32 bytes per key
	pub const ValueLimit: u32 = 64;	// Max 64 bytes per value
	pub MetadataDepositBase: Balance = 0;
	pub MetadataDepositPerByte: Balance = 0;
	
}

impl pallet_uniques::Config for Test {
	type RuntimeEvent = RuntimeEvent;
	type CollectionId = u32;
	type ItemId = u32;
	type Currency = PalletBalances;
	type ForceOrigin = EnsureRoot<AccountId>;
	type CreateOrigin = AsEnsureOriginWithArg<EnsureSigned<AccountId>>;
	type Locker = pallet_rmrk_core::Pallet<Test>;
	type CollectionDeposit = CollectionDeposit;
	type ItemDeposit = ItemDeposit;
	type MetadataDepositBase = MetadataDepositBase;
	type AttributeDepositBase = MetadataDepositBase;
	type DepositPerByte = MetadataDepositPerByte;
	type StringLimit = StringLimit;
	type KeyLimit = KeyLimit;
	type ValueLimit = ValueLimit;
	type WeightInfo = ();
}

parameter_types! {
	pub const ResourceSymbolLimit: u32 = 10;
	pub const PartsLimit: u32 = 25;
	pub const CollectionSymbolLimit: u32 = 100;
	pub const MaxPriorities: u32 = 25;
	pub const NestingBudget: u32 = 3;
	pub const MaxResourcesOnMint: u32 = 100;
    pub const StringLimit: u32 = 64;
}

impl pallet_rmrk_core::Config for Test {
	type RuntimeEvent = RuntimeEvent;
	type ProtocolOrigin = EnsureRoot<AccountId>;
	type ResourceSymbolLimit = ResourceSymbolLimit;
	type PartsLimit = PartsLimit;
	type MaxPriorities = MaxPriorities;
	type CollectionSymbolLimit = CollectionSymbolLimit;
	type MaxResourcesOnMint = MaxResourcesOnMint;
	type NestingBudget = NestingBudget;
	type WeightInfo = pallet_rmrk_core::weights::SubstrateWeight<Test>;
	type TransferHooks = ();
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
	type RuntimeEvent = RuntimeEvent;
	type Currency = Currencies;
	type MaxMembers = MaxMembers;
	type ProtocolTokenId = ProtocolTokenId;
	type PaymentTokenId = PaymentTokenId;
	type MinimumDeposit = MinimumDeposit;
	type PalletId = ControlPalletId;
	type StringLimit = ConstU32<256>;
}

impl gamedao_battlepass::Config for Test {
	type RuntimeEvent = RuntimeEvent;
	type Balance = Balance;
	type CurrencyId = CurrencyId;
	type Currency = Currencies;
	type Control = Control;
	#[cfg(feature = "runtime-benchmarks")]
	type ControlBenchmarkHelper = Control;
	type Rmrk = RmrkCore;
	type BattlepassHelper = gamedao_battlepass::BpHelper;
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