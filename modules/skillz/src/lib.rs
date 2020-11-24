//! Skill and Skore
//!
//! This pallet aggregates datapoints to reflect user experience and behaviour.

#![cfg_attr(not(feature = "std"), no_std)]

use frame_support::{
	decl_error, decl_event, decl_module, decl_storage,
	traits::{
		Currency,
		EnsureOrigin,
		ReservableCurrency,
	},
};
use frame_system::{self as system};
use codec::{Decode, Encode};
use sp_runtime::ModuleId;
use sp_std::prelude::*;

#[cfg(test)]
mod tests;

const PALLET_ID: ModuleId = ModuleId(*b"z/skillz");

pub trait Trait: system::Trait {
    // The runtime must supply this pallet with an Event type that satisfies the pallet's requirements.
	type Event: From<Event<Self>> + Into<<Self as system::Trait>::Event>;

    // The currency type that will be used to place deposits on nicks.
    // It must implement ReservableCurrency.
    // https://substrate.dev/rustdocs/v2.0.0/frame_support/traits/trait.ReservableCurrency.html
    type Currency: ReservableCurrency<Self::AccountId>;

    // Origins are used to identify network participants and control access.
    // This is used to identify the pallet's admin.
    type ForceOrigin: EnsureOrigin<Self::Origin>;

	// type MinRep: Get<usize>;
	// type MaxRep: Get<usize>;
	// type MinXP: Get<usize>;
	// type MaxXP: Get<usize>;
}

type AccountOf<T> = <T as system::Trait>::AccountId;
type BalanceOf<T> = <<T as Trait>::Currency as Currency<AccountOf<T>>>::Balance;
type XPOf = u64;
type REPOf = u64;

#[derive(Encode, Decode, Default, PartialEq, Eq)]
#[cfg_attr(feature = "std", derive(Debug))]
pub struct UserInfo<AccountId, Balance, XP, REP, BlockNumber> {
	user: AccountId,
	credit: Balance,
	xp: XP,
	rep: REP,
	updated: BlockNumber,
}

decl_storage! {
	trait Store for Module<T: Trait> as ChildTrie {

		Skillz get(fn user_get): UserInfo;
		Skillz get(fn users):
			map hasher(blake2_128_concat) UserInfo => Option<UserInfo>;


	}
}

decl_event! {
	pub enum Event<T> where
		<T as system::Trait>::AccountId,
		Balance = BalanceOf<T>,
		XP = XPOf,
		REP = REPOf,
		<T as system::Trait>::BlockNumber,
	{
		Update(AccountId, Balance, XP, REP, BlockNumber)
	}
}

decl_error! {
	pub enum Error for Module<T: Trait> {
		/// Guru Meditation
		UnknownError,
	}
}

decl_module! {
	pub struct Module<T: Trait> for enum Call where origin: T::Origin {

		fn deposit_event() = default;
		type Error = Error<T>;


		/// Create a new Campaign
		#[weight = 10_000]
		fn create(
			origin,
			user: AccountIdOf<T>,
			mod: u8,
		) {
			let creator = ensure_signed(origin)?;
			let now = <system::Module<T>>::block_number();

			let index = CampaignCount::get();
			// not protected against overflow, see safemath section
			CampaignCount::put(index + 1);

			// No fees are paid here if we need to create this account; that's why we don't just
			// use the stock `transfer`.
			T::Currency::resolve_creating(&Self::campaign_account_id(index), imb);

			<Campaigns<T>>::insert(index, CampaignInfo {
				beneficiary,
				deposit,
				raised: Zero::zero(),
				end,
				goal,
			});

			Self::deposit_event(RawEvent::Created(index, now));
		}
}

impl<T: Trait> Module<T> {
}
