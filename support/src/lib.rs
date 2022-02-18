#![cfg_attr(not(feature = "std"), no_std)]

pub trait ControlPalletStorage<AccountId, Hash> {

	fn body_controller(org: Hash) -> AccountId;

	fn body_treasury(org: Hash) -> AccountId;

}
