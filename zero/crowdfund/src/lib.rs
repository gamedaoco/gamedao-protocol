//! Simple CrowdCampaign
//!
//! This pallet demonstrates a simple on-chain crowdCampaigning mechanism.
//! It is based on Polkadot's crowdCampaign pallet, but is simplified and decoupled
//! from the parachain logic.

#![cfg_attr(not(feature = "std"), no_std)]

use frame_support::{
	decl_error, decl_event, decl_module, decl_storage, ensure,
	storage::child,
	traits::{
		Currency, ExistenceRequirement, Get, ReservableCurrency, WithdrawReason, WithdrawReasons,
	},
};
use frame_system::{self as system, ensure_signed};
use parity_scale_codec::{Decode, Encode};
use sp_core::Hasher;
use sp_runtime::{
	traits::{AccountIdConversion, Saturating, Zero},
	ModuleId,
};
use sp_std::prelude::*;

#[cfg(test)]
mod tests;

const PALLET_ID: ModuleId = ModuleId(*b"ex/Crowd");

/// The pallet's configuration trait
pub trait Trait: system::Trait {
	/// The ubiquious Event type
	type Event: From<Event<Self>> + Into<<Self as system::Trait>::Event>;

	/// The currency in which the crowdCampaigns will be denominated
	type Currency: ReservableCurrency<Self::AccountId>;

	/// The amount to be held on deposit by the owner of a crowdCampaign
	type SubmissionDeposit: Get<BalanceOf<Self>>;

	/// The minimum amount that may be contributed into a crowdCampaign. Should almost certainly be at
	/// least ExistentialDeposit.
	type MinContribution: Get<BalanceOf<Self>>;

	/// The period of time (in blocks) after an unsuccessful crowdCampaign ending during which
	/// contributors are able to withdraw their Campaigns. After this period, their Campaigns are lost.
	type RetirementPeriod: Get<Self::BlockNumber>;
}

/// Simple index for identifying a Campaign.
pub type CampaignIndex = u32;

type AccountIdOf<T> = <T as system::Trait>::AccountId;
type BalanceOf<T> = <<T as Trait>::Currency as Currency<AccountIdOf<T>>>::Balance;
type CampaignInfoOf<T> = CampaignInfo<AccountIdOf<T>, BalanceOf<T>, <T as system::Trait>::BlockNumber>;

#[derive(Encode, Decode, Default, PartialEq, Eq)]
#[cfg_attr(feature = "std", derive(Debug))]
pub struct CampaignInfo<AccountId, Balance, BlockNumber> {
	/// The account that will recieve the Campaigns if the campaign is successful
	beneficiary: AccountId,
	/// The amount of deposit placed
	deposit: Balance,
	/// The total amount raised
	raised: Balance,
	/// Block number after which Campaigning must have succeeded
	end: BlockNumber,
	/// Upper bound on `raised`
	goal: Balance,
}

decl_storage! {
	trait Store for Module<T: Trait> as ChildTrie {
		/// Info on all of the Campaigns.
		Campaigns get(fn campaigns):
			map hasher(blake2_128_concat) CampaignIndex => Option<CampaignInfoOf<T>>;

		/// The total number of Campaigns that have so far been allocated.
		CampaignCount get(fn campaign_count): CampaignIndex;

		// Additional information is stored i na child trie. See the helper
		// functions in the impl<T: Trait> Module<T> block below
	}
}

decl_event! {
	pub enum Event<T> where
		Balance = BalanceOf<T>,
		<T as system::Trait>::AccountId,
		<T as system::Trait>::BlockNumber,
	{
		Created(CampaignIndex, BlockNumber),
		Contributed(AccountId, CampaignIndex, Balance, BlockNumber),
		Withdrew(AccountId, CampaignIndex, Balance, BlockNumber),
		Retiring(CampaignIndex, BlockNumber),
		Dissolved(CampaignIndex, BlockNumber, AccountId),
		Dispensed(CampaignIndex, BlockNumber, AccountId),
	}
}

decl_error! {
	pub enum Error for Module<T: Trait> {
		/// CrowdCampaign must end after it starts
		EndTooEarly,
		/// Must contribute at least the minimum amount of Campaigns
		ContributionTooSmall,
		/// The Campaign index specified does not exist
		InvalidIndex,
		/// The crowdCampaign's contribution period has ended; no more contributions will be accepted
		ContributionPeriodOver,
		/// You may not withdraw or dispense Campaigns while the Campaign is still active
		CampaignStillActive,
		/// You cannot withdraw Campaigns because you have not contributed any
		NoContribution,
		/// You cannot dissolve a Campaign that has not yet completed its retirement period
		CampaignNotRetired,
		/// Cannot dispense Campaigns from an unsuccessful Campaign
		UnsuccessfulCampaign,
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
			beneficiary: AccountIdOf<T>,
			goal: BalanceOf<T>,
			end: T::BlockNumber,
		) {
			let creator = ensure_signed(origin)?;
			let now = <system::Module<T>>::block_number();

			ensure!(end > now, Error::<T>::EndTooEarly);

			let deposit = T::SubmissionDeposit::get();
			let imb = T::Currency::withdraw(
				&creator,
				deposit,
				WithdrawReasons::from(WithdrawReason::Transfer),
				ExistenceRequirement::AllowDeath,
			)?;

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

		/// Contribute Campaigns to an existing Campaign
		#[weight = 10_000]
		fn contribute(origin, index: CampaignIndex, value: BalanceOf<T>) {
			let who = ensure_signed(origin)?;

			ensure!(value >= T::MinContribution::get(), Error::<T>::ContributionTooSmall);
			let mut campaign = Self::campaigns(index).ok_or(Error::<T>::InvalidIndex)?;

			// Make sure crowdCampaign has not ended
			let now = <system::Module<T>>::block_number();
			ensure!(campaign.end > now, Error::<T>::ContributionPeriodOver);

			// Add contribution to the campaign
			T::Currency::transfer(
				&who,
				&Self::campaign_account_id(index),
				value,
				ExistenceRequirement::AllowDeath
			)?;
			campaign.raised += value;
			Campaigns::<T>::insert(index, &campaign);

			let balance = Self::contribution_get(index, &who);
			let balance = balance.saturating_add(value);
			Self::contribution_put(index, &who, &balance);

			Self::deposit_event(RawEvent::Contributed(who, index, balance, now));
		}

		/// Withdraw full balance of a contributor to a Campaign
		#[weight = 10_000]
		fn withdraw(origin, #[compact] index: CampaignIndex) {
			let who = ensure_signed(origin)?;

			let mut campaign = Self::campaigns(index).ok_or(Error::<T>::InvalidIndex)?;
			let now = <system::Module<T>>::block_number();
			ensure!(campaign.end < now, Error::<T>::CampaignStillActive);

			let balance = Self::contribution_get(index, &who);
			ensure!(balance > Zero::zero(), Error::<T>::NoContribution);

			// Return Campaigns to caller without charging a transfer fee
			let _ = T::Currency::resolve_into_existing(&who, T::Currency::withdraw(
				&Self::campaign_account_id(index),
				balance,
				WithdrawReasons::from(WithdrawReason::Transfer),
				ExistenceRequirement::AllowDeath
			)?);

			// Update storage
			Self::contribution_kill(index, &who);
			campaign.raised = campaign.raised.saturating_sub(balance);
			<Campaigns<T>>::insert(index, &campaign);

			Self::deposit_event(RawEvent::Withdrew(who, index, balance, now));
		}

		/// Dissolve an entire crowdCampaign after its retirement period has expired.
		/// Anyone can call this function, and they are incentivized to do so because
		/// they inherit the deposit.
		#[weight = 10_000]
		fn dissolve(origin, index: CampaignIndex) {
			let reporter = ensure_signed(origin)?;

			let campaign = Self::campaigns(index).ok_or(Error::<T>::InvalidIndex)?;

			// Check that enough time has passed to remove from storage
			let now = <system::Module<T>>::block_number();
			ensure!(now >= campaign.end + T::RetirementPeriod::get(), Error::<T>::CampaignNotRetired);

			let account = Self::campaign_account_id(index);

			// Dissolver collects the deposit and any remaining Campaigns
			let _ = T::Currency::resolve_creating(&reporter, T::Currency::withdraw(
				&account,
				campaign.deposit + campaign.raised,
				WithdrawReasons::from(WithdrawReason::Transfer),
				ExistenceRequirement::AllowDeath,
			)?);

			// Remove the campaign info from storage
			<Campaigns<T>>::remove(index);
			// Remove all the contributor info from storage in a single write.
			// This is possible thanks to the use of a child tree.
			Self::campaign_kill(index);

			Self::deposit_event(RawEvent::Dissolved(index, now, reporter));
		}

		/// Dispense a payment to the beneficiary of a successful crowdCampaign.
		/// The beneficiary receives the contributed Campaigns and the caller receives
		/// the deposit as a reward to incentivize clearing settled crowdCampaigns out of storage.
		#[weight = 10_000]
		fn dispense(origin, index: CampaignIndex) {
			let caller = ensure_signed(origin)?;

			let campaign = Self::campaigns(index).ok_or(Error::<T>::InvalidIndex)?;

			// Check that enough time has passed to remove from storage
			let now = <system::Module<T>>::block_number();

			ensure!(now >= campaign.end, Error::<T>::CampaignStillActive);

			// Check that the Campaign was actually successful
			ensure!(campaign.raised >= campaign.goal, Error::<T>::UnsuccessfulCampaign);

			let account = Self::campaign_account_id(index);

			// Beneficiary collects the contributed Campaigns
			let _ = T::Currency::resolve_creating(&campaign.beneficiary, T::Currency::withdraw(
				&account,
				campaign.raised,
				WithdrawReasons::from(WithdrawReason::Transfer),
				ExistenceRequirement::AllowDeath,
			)?);

			// Caller collects the deposit
			let _ = T::Currency::resolve_creating(&caller, T::Currency::withdraw(
				&account,
				campaign.deposit,
				WithdrawReasons::from(WithdrawReason::Transfer),
				ExistenceRequirement::AllowDeath,
			)?);

			// Remove the campaign info from storage
			<Campaigns<T>>::remove(index);
			// Remove all the contributor info from storage in a single write.
			// This is possible thanks to the use of a child tree.
			Self::campaign_kill(index);

			Self::deposit_event(RawEvent::Dispensed(index, now, caller));
		}
	}
}

impl<T: Trait> Module<T> {
	/// The account ID of the campaign pot.
	///
	/// This actually does computation. If you need to keep using it, then make sure you cache the
	/// value and only call this once.
	pub fn campaign_account_id(index: CampaignIndex) -> T::AccountId {
		PALLET_ID.into_sub_account(index)
	}

	/// Find the ID associated with the campaign
	///
	/// Each campaign stores information about its contributors and their contributions in a child trie
	/// This helper function calculates the id of the associated child trie.
	pub fn id_from_index(index: CampaignIndex) -> child::ChildInfo {
		let mut buf = Vec::new();
		buf.extend_from_slice(b"crowdfnd");
		buf.extend_from_slice(&index.to_le_bytes()[..]);

		child::ChildInfo::new_default(T::Hashing::hash(&buf[..]).as_ref())
	}

	/// Record a contribution in the associated child trie.
	pub fn contribution_put(index: CampaignIndex, who: &T::AccountId, balance: &BalanceOf<T>) {
		let id = Self::id_from_index(index);
		who.using_encoded(|b| child::put(&id, b, &balance));
	}

	/// Lookup a contribution in the associated child trie.
	pub fn contribution_get(index: CampaignIndex, who: &T::AccountId) -> BalanceOf<T> {
		let id = Self::id_from_index(index);
		who.using_encoded(|b| child::get_or_default::<BalanceOf<T>>(&id, b))
	}

	/// Remove a contribution from an associated child trie.
	pub fn contribution_kill(index: CampaignIndex, who: &T::AccountId) {
		let id = Self::id_from_index(index);
		who.using_encoded(|b| child::kill(&id, b));
	}

	/// Remove the entire record of contributions in the associated child trie in a single
	/// storage write.
	pub fn campaign_kill(index: CampaignIndex) {
		let id = Self::id_from_index(index);
		child::kill_storage(&id);
	}
}
