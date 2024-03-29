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
use gamedao_traits::FlowTrait;

pub type AccountId = u64;
pub type Amount = i128;
pub type Balance = u128;
pub type BlockNumber = u64;
pub type CurrencyId = u32;
pub type Hash = H256;
pub type Moment = u64;
// pub type BoundedString = BoundedVec<u8, <Test as Config>::StringLimit>;

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
	type Event = Event;
	type Balance = Balance;
	type Amount = Amount;
	type CurrencyId = CurrencyId;
	type WeightInfo = ();
	type ExistentialDeposits = ExistentialDeposits;
	type OnDust = ();
	type OnNewTokenAccount = ();
	type OnKilledTokenAccount = ();
	type MaxLocks = ();
	type DustRemovalWhitelist = Nothing;
	type ReserveIdentifier = ReserveIdentifier;
	type MaxReserves = MaxReserves;
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
	type Event = Event;
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
	type Event = Event;
	type Balance = Balance;
	type CurrencyId = CurrencyId;
	type WeightInfo = ();
	type Currency = Currencies;
	type Control = Control;
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
	pub const ProposalDurationLimits: (BlockNumber, BlockNumber) = (10, 100);
}
impl gamedao_signal::Config for Test {
	type Event = Event;
	type Balance = Balance;
	type CurrencyId = CurrencyId;
	type Currency = Currencies;
	type Control = Control;
	type Flow = Flow;
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

use sp_runtime::traits::{Hash as HashTrait, AccountIdConversion};
use gamedao_traits::ControlTrait;
use crate::ProposalCount;
use gamedao_control::types::{AccessModel, FeeModel, OrgType, Org};
use gamedao_flow::{FlowGovernance, FlowProtocol};
use super::types::{Proposal, ProposalType, SlashingRule};
use frame_support::assert_ok;
use frame_system::RawOrigin;

pub fn create_org(members: &Vec<AccountId>) -> (H256, AccountId) {
	let bounded_str = BoundedVec::truncate_from(vec![1,2]);
	let index = Control::org_count();
	let now = frame_system::Pallet::<Test>::block_number();
	let org = Org {
		index, creator: ALICE, prime: ALICE, name: bounded_str.clone(), cid: bounded_str.clone(),
		org_type: OrgType::Individual, fee_model: FeeModel::NoFees, membership_fee: Some(1 * DOLLARS),
		gov_currency: PROTOCOL_TOKEN_ID, pay_currency: PAYMENT_TOKEN_ID, access_model: AccessModel::Open,
		member_limit: <Test as gamedao_control::Config>::MaxMembers::get(), created: now.clone(), mutated: now
	};
	let org_id = <Test as frame_system::Config>::Hashing::hash_of(&org);
	assert_ok!(
		Control::create_org(
			Origin::signed(ALICE), org.name, org.cid, org.org_type, org.access_model,
			org.fee_model, None, org.membership_fee, None, None, None
	));
	let treasury_id = Control::org_treasury_account(&org_id).unwrap();
	let init_balance = 100 * DOLLARS;
	assert_ok!(Tokens::set_balance(RawOrigin::Root.into(), treasury_id, PROTOCOL_TOKEN_ID, init_balance, 0));
	for x in members {
		assert_ok!(Control::add_member(Origin::signed(ALICE), org_id, *x));
	}
	(org_id, treasury_id)
}

pub fn set_balance(accounts: &Vec<AccountId>, amount: Balance) {
	for x in accounts {
		assert_ok!(Tokens::set_balance(RawOrigin::Root.into(), *x, PROTOCOL_TOKEN_ID, amount, 0));
		assert_ok!(Tokens::set_balance(RawOrigin::Root.into(), *x, PAYMENT_TOKEN_ID, amount, 0));
	}
}

pub fn create_finalize_campaign(
	current_block: BlockNumber,
	org_id: H256,
	contributors: &Vec<AccountId>,
	contribution: Balance,
	expiry: BlockNumber,
	finalize: bool
) -> H256 {
	let index = Flow::campaign_count();
	let bounded_str = BoundedVec::truncate_from(vec![1, 2, 3]);
	let campaign = gamedao_flow::types::Campaign {
		index,
		org_id,
		name: bounded_str.clone(),
		owner: ALICE,
		admin: ALICE,
		deposit: 10 * DOLLARS,
		start: current_block,
		expiry,
		cap: 40 * DOLLARS, 
		protocol: FlowProtocol::default(),
		governance: FlowGovernance::default(),
		cid: bounded_str.clone(),
		token_symbol: None,
		token_name: None,
		created: current_block,
	};
	assert_ok!(Flow::create_campaign(
		Origin::signed(ALICE),
		org_id, campaign.admin, campaign.name.clone(), campaign.cap,
		campaign.deposit, campaign.expiry, campaign.protocol.clone(),
		campaign.governance.clone(), campaign.cid.clone(), None, None, None
	));
	let campaign_id = <Test as frame_system::Config>::Hashing::hash_of(&campaign);
	for x in contributors {
		assert_ok!(Flow::contribute(Origin::signed(*x), campaign_id, contribution));
	}
	// Finalize campaign
	if finalize {
		System::set_block_number(expiry);
		Flow::on_finalize(expiry);
		System::set_block_number(expiry + 1);
		Flow::on_initialize(expiry + 1);
		assert_eq!(Flow::is_campaign_succeeded(&campaign_id), true);
	}

	campaign_id
}

pub fn create_proposal(
	proposal_type: ProposalType, org_id: H256, start: BlockNumber, expiry: BlockNumber, deposit: Balance, campaign_id: Option<H256>,
	currency_id: Option<CurrencyId>, beneficiary: Option<AccountId>, amount: Option<Balance>
) -> (H256, Proposal<Hash, BlockNumber, AccountId, Balance, CurrencyId, BoundedVec<u8, <Test as gamedao_signal::Config>::StringLimit>>) {
	let bounded_str = BoundedVec::truncate_from(vec![1, 2, 3]);
	let proposal = Proposal {
		index: <ProposalCount<Test>>::get(), owner: ALICE, title: bounded_str.clone(),
		cid: bounded_str, slashing_rule: SlashingRule::Automated,
		start, expiry, org_id, deposit, campaign_id,
		amount, beneficiary, proposal_type, currency_id,
	};
	let proposal_id: H256 = <Test as frame_system::Config>::Hashing::hash_of(&proposal);
	(proposal_id, proposal)
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
