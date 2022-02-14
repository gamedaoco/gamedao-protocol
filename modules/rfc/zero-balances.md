




/// total balance for currency
fn total( origin, currency ) -> T::Balance;
/// reserved balance for balance
fn reserved( origin, currency ) -> T::Balance;
/// usable balance for currency
fn free( origin, currency ) -> T::Balance;

/// Total, Reserved, Free as Tuple
Balance AccountId => ( Balance, Balance, Balance )
/// Total per Account, Currency
TotalBalance (AccountId, CurrencyId) => Balance
/// Reserved per Account, Currency
ReservedBalance (AccountId, CurrencyId) => Balance
/// Free per Account, Currency
FreeBalance (AccountId, CurrencyId) => Balance

