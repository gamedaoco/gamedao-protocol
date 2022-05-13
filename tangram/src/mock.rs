#![cfg(test)]

pub use super::*;
use frame_support::{
	 parameter_types,
	traits::{Nothing, GenesisBuild}
};
use frame_support_test::TestRandomness;
use sp_core::H256;

use sp_runtime::{
	testing::Header,
	traits::{BlakeTwo256, IdentityLookup},
};

use frame_support::{
    dispatch::DispatchResult,
    traits::{Currency, LockIdentifier, LockableCurrency, WithdrawReasons},
};

use orml_traits::parameter_type_with_key;
use gamedao_protocol_support::{ControlPalletStorage, ControlMemberState, ControlState};
use zero_primitives::{Amount, CurrencyId, TokenSymbol, Balance, Index, Moment};

type UncheckedExtrinsic = frame_system::mocking::MockUncheckedExtrinsic<Test>;
type Block = frame_system::mocking::MockBlock<Test>;


mod pallet_tangram {
	pub use super::super::*;
}


// fn get_time() -> Mome { 99 }

pub type AccountId = u64;
pub type BlockNumber = u32;
pub type Hash = H256;
pub type MaxAmount = u64;


pub const ALICE: AccountId = 1;
pub const BOB: AccountId = 2;
pub const GAME: CurrencyId = TokenSymbol::GAME as u32;


// 

parameter_types! {
    pub const MaxRealmsPerOrg: u64 = 10;
    pub const MaxClassesPerRealm:u64 = 10;
    pub const MaxTokenPerClass:u128 = 5;
    pub const MaxTotalToken:u128 = 100;
}


parameter_types! {
	pub const BlockHashCount: u64 = 250;
	pub const SS58Prefix: u8 = 42;
	// pub const TTime: now();
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
	type Hash = H256;
	type Hashing = ::sp_runtime::traits::BlakeTwo256;
	type AccountId = u64;
	type Lookup = IdentityLookup<Self::AccountId>;
	type Header = Header;
	type Event = Event;
	type BlockHashCount = BlockHashCount;
	type Version = ();
	type PalletInfo = PalletInfo;
	type AccountData = ();
	type OnNewAccount = ();
	type OnKilledAccount = ();
	type SystemWeightInfo = ();
	type SS58Prefix = SS58Prefix;
	type OnSetCode = ();
}

impl Config for Test {
	type Event = Event;
	type Randomness = TestRandomness<Self>;
    type Time = Timestamp;
	type WeightInfo = ();
   
	type MaxRealmsPerOrg = MaxRealmsPerOrg;
    type MaxClassesPerRealm = MaxClassesPerRealm;
    type MaxTokenPerClass = MaxTokenPerClass;
    type MaxTotalToken = MaxTotalToken;
    
	type NextRealmIndex = Index;
    type NextClassIndex= Index;
    type NextItemIndex= Index;
    type TotalIndex= Index;
    type BurnedIndex= Index;
	// type StakeCurrency = Balances;	

}

parameter_types! {
	pub const ExistentialDeposit: Balance = 1;
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




// Configure a mock runtime to test the pallet.
frame_support::construct_runtime!(
	pub enum Test where
		Block = Block,
		NodeBlock = Block,
		UncheckedExtrinsic = UncheckedExtrinsic,
	{
		System: frame_system::{Pallet, Call, Config, Storage, Event<T>},
		Timestamp: pallet_timestamp::{Pallet, Call, Storage, Inherent},
		TangramModule: pallet_tangram,
	}
);


// Build genesis storage according to the mock runtime.
pub fn new_test_ext() -> sp_io::TestExternalities {
	let mut t = frame_system::GenesisConfig::default().build_storage::<Test>().unwrap();
	t.into()
	                    // 
}

