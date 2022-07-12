#![cfg(test)]

pub use super::*;
use frame_support::{
	construct_runtime, parameter_types, PalletId,
	traits::{Everything, GenesisBuild, Nothing},
	pallet_prelude::*,
};
use sp_core::H256;
use sp_runtime::{traits::IdentityLookup, Permill};

use orml_traits::parameter_type_with_key;

impl Campaign<Hash, AccountId, Balance, BlockNumber, Moment, BoundedVec<u8, <Test as Config>::StringLimit>> {
	pub fn new(campaign_id: Hash, expiry: BlockNumber) -> Campaign<Hash, AccountId, Balance, BlockNumber, Moment, BoundedVec<u8, <Test as Config>::StringLimit>> {
		Campaign {
			id: campaign_id,
			org: H256::random(),
			name: BoundedVec::truncate_from(vec![1, 2]),
			owner: BOB,
			admin: BOB,
			deposit: 10 * DOLLARS,
			expiry: expiry,
			cap: 110 * DOLLARS,
			protocol: FlowProtocol::Raise,
			governance: FlowGovernance::No,
			cid: BoundedVec::truncate_from(vec![1, 2]),
			token_symbol: BoundedVec::truncate_from(vec![1, 2]),
			token_name: BoundedVec::truncate_from(vec![1, 2]),
			created: PalletTimestamp::now(),
		}
	}
}

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
pub type Moment = u64;
pub type Balance = u128;
pub type Amount = i128;
pub type CurrencyId = u32;
// pub type Header = generic::Header<BlockNumber, BlakeTwo256>;
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
pub const ACC_1: AccountId = 1;
pub const ACC_2: AccountId = 2;
pub const ACC_3: AccountId = 3;
pub const ACC_4: AccountId = 4;
pub const ACC_5: AccountId = 5;
pub const ACC_6: AccountId = 6;
pub const ACC_7: AccountId = 7;
pub const ACC_8: AccountId = 8;
pub const ACC_9: AccountId = 9;
pub const ACC_10: AccountId = 10;
pub const ALICE: AccountId = 11;
// Org creator:
pub const BOB: AccountId = 12;

pub const GAMEDAO_TREASURY: AccountId = 13;
pub const GAME3_TREASURY: AccountId = 14;

mod gamedao_flow {
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
	type Header = sp_runtime::testing::Header;
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
	pub const MinimumPeriod: Moment = 1000;
}

impl pallet_timestamp::Config for Test {
	type Moment = Moment;
	type OnTimestampSet = ();
	type MinimumPeriod = MinimumPeriod;
	type WeightInfo = ();
}

frame_support::parameter_types! {
	pub const MaxOrgsPerAccount: u32 = 2;
	pub const MaxMembersPerOrg: u32 = 2;
	pub const MaxCreationsPerBlock: u32 = 2;
	pub const MaxCreationsPerAccount: u32 = 1000;
	pub const MaxOrgsPerController: u32 = 100;
	pub const ProtocolTokenId: u32 = PROTOCOL_TOKEN_ID;
	pub const PaymentTokenId: CurrencyId = PAYMENT_TOKEN_ID;
	pub const MinimumDeposit: Balance = 1 * DOLLARS;
	pub const ControlPalletId: PalletId = PalletId(*b"gd/cntrl");
	pub const Game3FoundationTreasuryAccountId: AccountId = GAME3_TREASURY;
	pub const GameDAOTreasuryAccountId: AccountId = GAMEDAO_TREASURY;
}

impl gamedao_control::Config for Test {
	type Balance = Balance;
	type CurrencyId = CurrencyId;
	type WeightInfo = ();
	type Event = Event;
	type Currency = Currencies;
	type MaxOrgsPerAccount = MaxOrgsPerAccount;
	type MaxMembersPerOrg = MaxMembersPerOrg;
	type MaxCreationsPerAccount = MaxCreationsPerAccount;
	type MaxOrgsPerController = MaxOrgsPerController;
	type MaxCreationsPerBlock = MaxCreationsPerBlock;
	type ProtocolTokenId = ProtocolTokenId;
	type PaymentTokenId = ProtocolTokenId;
	type MinimumDeposit = MinimumDeposit;
	type PalletId = ControlPalletId;
	type Game3FoundationTreasury = Game3FoundationTreasuryAccountId;
	type GameDAOTreasury = GameDAOTreasuryAccountId;
	type StringLimit = ConstU32<256>;
}

parameter_types! {
	pub const MinNameLength: u32 = 2;
	pub const MaxCampaignsPerAddress: u32 = 3;
	pub const MaxCampaignsPerBlock: u32 = 1;
	pub const MaxCampaignsPerOrg: u32 = 64;
	pub const MaxContributionsPerBlock: u32 = 3;
	pub const MaxContributorsProcessing: u32 = 4;
	pub const MinCampaignDuration: BlockNumber = 1 * DAYS;
	pub const MaxCampaignDuration: BlockNumber = 100 * DAYS;
	pub const MinContribution: Balance = 1 * DOLLARS;
	pub CampaignFee: Permill = Permill::from_rational(1u32, 10u32); // 10%
	// pub const CampaignFee: Balance = 25 * CENTS;
	pub const GameDAOTreasury: AccountId = GAMEDAO_TREASURY;
}

impl Config for Test {
	type Balance = Balance;
	type CurrencyId = CurrencyId;
	type WeightInfo = ();
	type Event = Event;
	type Currency = Currencies;
	type ProtocolTokenId = ProtocolTokenId;
	type PaymentTokenId = PaymentTokenId;
	type UnixTime = PalletTimestamp;
	type Control = Control;
	type GameDAOTreasury = GameDAOTreasury;
	type MaxContributorsProcessing = MaxContributorsProcessing;
	type MinNameLength = MinNameLength;
	type MaxCampaignsPerAddress = MaxCampaignsPerAddress;
	type MaxCampaignsPerBlock = MaxCampaignsPerBlock;
	type MaxCampaignsPerOrg = MaxCampaignsPerOrg;
	type MaxContributionsPerBlock = MaxContributionsPerBlock;
	type MaxCampaignContributions = ConstU32<1000>;
	type MaxCampaignsPerStatus = ConstU32<10000>;
	type MinCampaignDuration = MinCampaignDuration;
	type MaxCampaignDuration = MaxCampaignDuration;
	type MinContribution = MinContribution;
	type CampaignFee = CampaignFee;
	type StringLimit = ConstU32<256>;
}

construct_runtime!(
	pub enum Test where
		Block = Block,
		NodeBlock = Block,
		UncheckedExtrinsic = UncheckedExtrinsic,
	{
		System: frame_system::{Pallet, Call, Storage, Config, Event<T>},
		Currencies: orml_currencies::{Pallet, Call},
		Tokens: orml_tokens::{Pallet, Storage, Event<T>, Config<T>},
		PalletBalances: pallet_balances::{Pallet, Call, Storage, Event<T>},
		PalletTimestamp: pallet_timestamp::{Pallet, Call, Storage, Inherent},
		Flow: gamedao_flow,
		Control: gamedao_control,
	}
);

pub fn new_test_ext() -> sp_io::TestExternalities {
	let mut t = frame_system::GenesisConfig::default().build_storage::<Test>().unwrap();
	orml_tokens::GenesisConfig::<Test> {
		balances: vec![
			// BOB org creator
			(BOB, PROTOCOL_TOKEN_ID, 100 * DOLLARS),
			(BOB, PAYMENT_TOKEN_ID, 100 * DOLLARS),
			
			// Contributors
			(ALICE, PAYMENT_TOKEN_ID, 100 * DOLLARS),
			(ACC_1, PAYMENT_TOKEN_ID, 100 * DOLLARS),
			(ACC_2, PAYMENT_TOKEN_ID, 100 * DOLLARS),
			(ACC_3, PAYMENT_TOKEN_ID, 100 * DOLLARS),
			(ACC_4, PAYMENT_TOKEN_ID, 100 * DOLLARS),
			(ACC_5, PAYMENT_TOKEN_ID, 100 * DOLLARS),
			(ACC_6, PAYMENT_TOKEN_ID, 100 * DOLLARS),
			(ACC_7, PAYMENT_TOKEN_ID, 100 * DOLLARS),
			(ACC_8, PAYMENT_TOKEN_ID, 100 * DOLLARS),
			(ACC_9, PAYMENT_TOKEN_ID, 100 * DOLLARS),
			(ACC_10, PAYMENT_TOKEN_ID, 100 * DOLLARS),

			(GAMEDAO_TREASURY, PROTOCOL_TOKEN_ID, 0),
			(GAMEDAO_TREASURY, PAYMENT_TOKEN_ID, 0),
		],
	}
	.assimilate_storage(&mut t)
	.unwrap();
	t.into()
}
