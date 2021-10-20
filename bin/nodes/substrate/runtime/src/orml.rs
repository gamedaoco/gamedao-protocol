//
//	orml
//


// use orml_currencies::{BasicCurrencyAdapter, Currency};
// use orml_tokens::CurrencyAdapter;
// use orml_traits::{create_median_value_data_provider, DataFeeder, DataProviderExtended};

//
//	orml module config
//

// impl orml_tokens::Trait for Runtime {
// 	type Event = Event;
// 	type Balance = Balance;
// 	type Amount = Amount;
// 	type CurrencyId = CurrencyId;
// 	type OnReceived = module_accounts::Module<Runtime>;
// 	type WeightInfo = ();
// }

// parameter_types! {
// 	pub const GetNativeCurrencyId: CurrencyId = CurrencyId::Token(TokenSymbol::ACA);
// 	pub const GetStableCurrencyId: CurrencyId = CurrencyId::Token(TokenSymbol::AUSD);
// 	pub const GetLDOTCurrencyId: CurrencyId = CurrencyId::Token(TokenSymbol::LDOT);
// }

// impl orml_currencies::Trait for Runtime {
// 	type Event = Event;
// 	type MultiCurrency = Tokens;
// 	type NativeCurrency = BasicCurrencyAdapter<Runtime, Balances, Amount, BlockNumber>;
// 	type GetNativeCurrencyId = GetNativeCurrencyId;
// 	type WeightInfo = ();
// }

// parameter_types! {
// 	pub const MinVestedTransfer: Balance = 100 * DOLLARS;
// }

// impl orml_vesting::Trait for Runtime {
// 	type Event = Event;
// 	type Currency = pallet_balances::Module<Runtime>;
// 	type MinVestedTransfer = MinVestedTransfer;
// 	type VestedTransferOrigin = EnsureRootOrAcalaTreasury;
// 	type WeightInfo = ();
// }

// parameter_types! {
// 	pub const UpdateFrequency: BlockNumber = 10;
// }

// impl orml_gradually_update::Trait for Runtime {
// 	type Event = Event;
// 	type UpdateFrequency = UpdateFrequency;
// 	type DispatchOrigin = EnsureRoot<AccountId>;
// 	type WeightInfo = ();
// }

//
// evm
//

// parameter_types! {
// 	pub const ChainId: u64 = 42;
// }

// impl pallet_evm::Trait for Runtime {
// 	type FeeCalculator = FixedGasPrice;
// 	type CallOrigin = EnsureAddressTruncated;
// 	type WithdrawOrigin = EnsureAddressTruncated;
// 	type AddressMapping = EvmAddressMapping<Runtime>;
// 	type Currency = Balances;
// 	type Event = Event;
// 	type Precompiles = ();
// 	type ChainId = ChainId;
// }

//
//
//
