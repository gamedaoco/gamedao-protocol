//
//           _______________________________ ________
//           \____    /\_   _____/\______   \\_____  \
//             /     /  |    __)_  |       _/ /   |   \
//            /     /_  |        \ |    |   \/    |    \
//           /_______ \/_______  / |____|_  /\_______  /
//                   \/        \/         \/         \/
//           Z  E  R  O  .  I  O     N  E  T  W  O  R  K
//           © C O P Y R I O T   2 0 7 5 @ Z E R O . I O

// This file is part of ZERO Network.
// Copyright (C) 2010-2020 ZERO Technologies.
// SPDX-License-Identifier: Apache-2.0

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// 	http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

//! # Crowdfunding Factory
//!
//! Run `cargo doc --package crowdfunding-factory --open` to view this pallet's documentation.
//!
//! ## Overview
//!
//! This pallet provides a simple on-chain crowdfunding mechanism
//! using the networks native currency PLAY.

#![cfg_attr(not(feature = "std"), no_std)]

// TODO: harden checks on completion
#![feature(const_fn_fn_ptr_basics)]
#![allow(dead_code)]
#![allow(unused_imports)]
#![allow(unused_variables)]

use frame_system::{ self as system, ensure_signed };
use frame_support::storage::child::exists;
use frame_support::{
	decl_error, decl_event, decl_module, decl_storage,
	ensure,

	dispatch::DispatchResult,
	traits::{
		Randomness,
		// Currency,
		// EnsureOrigin,
		ReservableCurrency,
		Get
	}
};
use sp_core::{ Hasher, H256 };
use sp_runtime::{
	traits::{ Hash, TrailingZeroInput },
	ModuleId,
};
use sp_std::prelude::*;
use codec::{ Encode, Decode };

// TODO: tests
// #[cfg(test)]
// mod tests;

// TODO: pallet benchmarking
// mod benchmarking;

// TODO: weights
// mod default_weights;

// global identification
const PALLET_ID: ModuleId = ModuleId(*b"zerocrwd");
const PALLET_VERSION: &str = "1.0";
// limit simultanous campaign initiation
const MAX_CONTRIBUTIONS_PER_BLOCK: usize = 5;
// max campaign duration
const MAX_CAMPAIGN_LENGTH: u64 = 777600;

pub trait Trait: system::Trait + balances::Trait {
	type Event: From<Event<Self>> + Into<<Self as system::Trait>::Event>;
	type Currency: ReservableCurrency<Self::AccountId>;
	type Randomness: Randomness<Self::Hash>;
	type MinLength: Get<usize>;
	type MaxLength: Get<usize>;
	type Nonce: Get<u64>;
	// type CreationFee: Get<T::Balance<Self>>;
	// type ContributionFee: Get<T::Balance<Self>>;
}

#[derive(Encode, Decode, Default, Clone, PartialEq, Eq)]
pub struct Campaign<Hash, AccountId, Balance, BlockNumber> {
	/// unique hash to identify campaign
	id: Hash,
	/// controller account of the campaign
	manager: AccountId,
	/// campaign owners deposit
	deposit: Balance,
	/// blocknumber until campaign has to reach cap
	expiry: BlockNumber,
	/// minimum amount of token to become a successful campaign
	cap: Balance,
	/// name
	// TODO: replace with ipfs hash
	name: Vec<u8>,
	/// protocol: 0 grant, 1 prepaid, 2 loan, 3 security, 4 dao
	protocol: u8,
	/// status: 0 not started, 1 in progress, 2 success, 3 fail
	status: u8,
}

decl_storage! {
	trait Store for Module<T: Trait> as CrowdfundingFactory {

		/// Campaigns
		Campaigns get(fn campaign_by_id): map hasher(blake2_128_concat) T::Hash => Campaign<T::Hash, T::AccountId, T::Balance, T::BlockNumber>;

		/// Campaign owner by campaign id
		CampaignOwner get(fn owner_of): map hasher(blake2_128_concat) T::Hash => Option<T::AccountId>;

		// TODO: fix BlockNumbe sa
		/// Max campaign time limit
		// CampaignMaxDurationLimit
		// get(fn campaign_max_duration_limit) config():
		// T::BlockNumber = T::BlockNumber::sa(MAX_CAMPAIGN_LENGTH);

		/// Campaigns ending in a block
		CampaignsByBlockNumber get(fn campaign_expire_at): map hasher(blake2_128_concat) T::BlockNumber => Vec<T::Hash>;

		/// Campaign state
		CampaignState get(fn campaign_state): map hasher(blake2_128_concat) u8 => T::Hash;

		// all campaigns
		AllCampaignsArray get(fn campaigns_by_index): map hasher(blake2_128_concat) u64 => T::Hash;
		AllCampaignsCount get(fn all_campaigns_count): u64;
		AllCampaignsIndex: map hasher(blake2_128_concat) T::Hash => u64;

		// owned campaigns
		OwnedCampaignsArray get(fn owned_camapigns_by_index): map hasher(blake2_128_concat) (T::AccountId, u64) => T::Hash;
		OwnedCampaignsCount get(fn owned_campaigns_count): map hasher(blake2_128_concat) T::AccountId => u64;
		OwnedCampaignsIndex: map hasher(blake2_128_concat) (T::AccountId, T::Hash) => u64;

		// contributed campaigns
		ContributedCampaignsArray get(fn contributed_campaigns_by_index): map hasher(blake2_128_concat) (T::AccountId, u64) => T::Hash;
		ContributedCampaignsCount get(fn contributed_campaigns_count): map hasher(blake2_128_concat) T::AccountId => u64;
		ContributedCampaignsIndex: map hasher(blake2_128_concat) (T::AccountId, T::Hash) => u64;

		// Investment per project
		ContributedAmount get(fn contributed_amount): map hasher(blake2_128_concat) (T::Hash, T::AccountId) => T::Balance;

		// Contributor Accounts
		ContributorAccounts get(fn contributor_accounts): map hasher(blake2_128_concat) T::Hash => Vec<T::AccountId>;
		ContributorAccountsCount get(fn contributor_accounts_count): map hasher(blake2_128_concat) T::Hash => u64;

		// Campaign nonce
		Nonce: u64;
	}
}

decl_event! {
	pub enum Event<T> where
		<T as system::Trait>::Hash,
		<T as system::Trait>::AccountId,
		<T as balances::Trait>::Balance,
		<T as system::Trait>::BlockNumber
	{
		Create(Hash, AccountId, Balance, Balance, BlockNumber, Vec<u8>),
		Contribute(Hash, AccountId, Balance, BlockNumber),
		Complete(Hash, Balance, BlockNumber, bool),
		Update(Hash, u8),
	}
}

decl_error! {
	pub enum Error for Module<T: Trait> {

		//
		//	general
		//
		/// Must contribute at least the minimum amount of Campaigns
		ContributionTooSmall,
		/// The Campaign id specified does not exist
		InvalidId,
		/// The Campaign's contribution period has ended; no more contributions will be accepted
		ContributionPeriodOver,
		/// You may not withdraw or dispense Campaigns while the Campaign is still active
		CampaignStillActive,
		/// You cannot withdraw Campaigns because you have not contributed any
		NoContribution,
		/// You cannot dissolve a Campaign that has not yet completed its retirement period
		CampaignNotRetired,
		/// Cannot dispense Campaigns from an unsuccessful Campaign
		UnsuccessfulCampaign,

		//
		//	create
		//
		/// Campaign must end after it starts
		EndTooEarly,
		/// Campaign expiry has be lower than the block number limit
		EndTooLate,
		/// Max contributions per block exceeded
		ContributionsPerBlockExceeded,
		/// Name too long
		NameTooLong,
		/// Name too short
		NameTooShort,
		/// Deposit exceeds the campaign target
		DepositTooHigh,
		/// Campaign id exists
		IdExists,

		//
		//	mint
		//
		/// Overflow adding a new campaign to total fundings
		AddCampaignOverflow,
		/// Overflow adding a new contribution to account balance
		/// Overflow adding the total number of investors of a camapaign
		AddInvestorsOverflow,

		/// Guru Meditation
		GuruMeditation,

	}
}

decl_module! {
	pub struct Module<T: Trait> for enum Call where origin: T::Origin {

		type Error = Error<T>;
		fn deposit_event() = default;

		#[weight = 10_000]
		fn create(
			origin,
			name: Vec<u8>,
			target: T::Balance,
			deposit: T::Balance,
			expiry: T::BlockNumber,
		) {

			// get the creator
			let creator = ensure_signed(origin)?;

			// check name length boundary
			ensure!(
				name.len() >= T::MinLength::get(),
				Error::<T>::NameTooShort
			);
			ensure!(
				name.len() <= T::MaxLength::get(),
				Error::<T>::NameTooLong
			);

			// get the nonce to help generate unique id
			let nonce = T::Nonce::get();

			let now = <system::Module<T>>::block_number();

			// ensure campaign expires after now
			ensure!(
				expiry > now,
				Error::<T>::EndTooEarly
			);

			// TODO: fix BlockNumber sa
			// ensure!(
			// 	expiry <= <system::Module<T>>::block_number() + Self::campaign_max_duration_limit(),
			// 	Error::<T>::EndTooLate
			// );

			// generate the unique campaign id
			// hall of shame —— failed attempts
			// <system::Module<T>>::random_seed(),
			// let id = ( sp_io::offchain::random_seed(), &creator, nonce ); //.using_encoded(sp_runtime::traits::Hash::hash);
			// let id = ( <frame_support::traits::Randomness<T>>::random_seed(), &creator, nonce ); //.using_encoded(sp_runtime::traits::Hash::hash);
			// let mut id = Hasher<Out = Hash, StdHasher = blake2_128_concat>::new();
			// let id = hasher(blake2_128_concat) (&creator,nonce);
			let phrase = b"crowdfunding_campaign";
			let id = T::Randomness::random(phrase);

			// TODO: maybe check for correct padding
			// let seed = <[u8; 32]>::decode(&mut TrailingZeroInput::new(seed.as_ref()))
			// 	.expect("input is padded with zeroes; qed");
			// let id = seed.clone();

			// ensure unique id
			// ensure!(
			// 	!<CampaignOwner<T>>::exists(&id),
			// 	Error::<T>::CampaignIdExists
			// );

			// ensure deposit <= target
			// ensure!(
			// 	deposit <= target,
			// 	Error::<T>::CampaignDepositTooHigh
			// );

			// check contribution limit per block
			// let contributions = Self::campaign_expire_at(expiry);
			// ensure!(
			// 	contributions.len() < MAX_CONTRIBUTIONS_PER_BLOCK,
			// 	Error::<T>::ContributionsPerBlockExceeded
			// );

			let protocol :u8 = 0;

			// create a new campaign
			// id: Hash,
			// name: Vec<u8>,
			// manager: AccountId,
			// deposit: Balance,
			// expiry: BlockNumber,
			// cap: Balance,
			// status: u8,
			let new_campaign = Campaign {
				id: id.clone(),
				// name: name,
				manager: creator.clone(),
				deposit: deposit.clone(),
				expiry: expiry,
				cap: target,
				name: name.clone(),
				protocol: protocol,
				status: 0,
			};

			// mint the campaign
			Self::mint(
				creator.clone(),
				id.clone(),
				expiry.clone(),
				deposit.clone(),
				protocol.clone(),
				new_campaign
			)?;

			// deposit the event
			Self::deposit_event(
				RawEvent::Create(
					id,
					creator,
					target,
					deposit,
					expiry,
					name
				)
			);

			// No fees are paid here if we need to create this account;
			// that's why we don't just use the stock `transfer`.
			// T::Currency::resolve_creating(&Self::campaign_account_id(index), imb);

		}

		#[weight = 10_000]
		/// contribute to project
		fn contribute (
			origin,
			campaign: T::Hash,
			contribution: T::Balance
		) -> DispatchResult {

			let sender = ensure_signed(origin)?;

			let owner =
				Self::owner_of(campaign)
				.ok_or("Campaign owner unknown.")?;

			ensure!(
				owner != sender,
				"Cannot contribute to owned campaign."
			);

			// if !<ContributedAmount<T>>::exists((campaign.clone(), sender.clone())) {
				// Self::new_contribution(sender.clone(), campaign.clone(), contribution.clone())?;
			// } else {
				// Self::update_contribution(sender.clone(), campaign.clone(), contribution.clone())?;
			// }

			// Self::deposit_event(
			// 	RawEvent::Contribute(
			// 		campaign_id,
			// 		sender,
			// 		investment_amount
			// 	)
			// );

			Ok(())
		}
 	}
}

impl<T: Trait> Module<T> {

	fn mint(
		sender: T::AccountId,
		id: T::Hash,
		expiry: T::BlockNumber,
		deposit: T::Balance,
		protocol: u8,
		new_campaign: Campaign<T::Hash, T::AccountId, T::Balance, T::BlockNumber>
	) -> DispatchResult {

		// global camapaigns index
		let all_campaigns_count = Self::all_campaigns_count();
		let update_all_campaigns_count = all_campaigns_count.checked_add(1).ok_or("Overflow adding a new campaign to total campaigns")?;

		// owned campaigns index
		let owned_campaigns_count = Self::owned_campaigns_count(&sender);
		let update_owned_campaigns_count = owned_campaigns_count.checked_add(1).ok_or("Overflow adding a new funding to account balance")?;

		// change the global states
		<Campaigns<T>>::insert(id.clone(), new_campaign.clone());
		<CampaignOwner<T>>::insert(id.clone(), sender.clone());
		<CampaignsByBlockNumber<T>>::mutate(expiry.clone(), |campaigns| campaigns.push(id.clone()));

		// update global campaigns
		<AllCampaignsArray<T>>::insert(&all_campaigns_count, id.clone());
		<AllCampaignsCount>::put(update_all_campaigns_count);
		<AllCampaignsIndex<T>>::insert(id.clone(), all_campaigns_count);

		// update own campaigns
		<OwnedCampaignsArray<T>>::insert((sender.clone(), owned_campaigns_count.clone()), id.clone());
		<OwnedCampaignsCount<T>>::insert(&sender, update_owned_campaigns_count);
		<OwnedCampaignsIndex<T>>::insert((sender.clone(), id.clone()), owned_campaigns_count);

		// when deposit exceeds available balance,
		// revert campaign
		// if deposit > Balance::sa(0) {
		// 	match Self::not_contributed_before(sender.clone(), id.clone(), deposit.clone()){
		// 		Err(_e) => {
		// 			<Campaigns<T>>::remove(id.clone());
		// 			<CampaignOwner<T>>::remove(id.clone());
		// 			<CampaignsByBlockNumber<T>>::mutate(expiry,|campaigns| campaigns.pop());
		// 			<AllCampaignsArray<T>>::remove(&all_campaigns_count);
		// 			<AllCampaignsCount>::put(all_campaigns_count.clone());
		// 			<AllCampaignsIndex<T>>::remove(id.clone());
		// 			<OwnedCampaignsArray<T>>::remove((sender.clone(), owned_campaigns_count.clone()));
		// 			<OwnedCampaignsCount<T>>::remove(&sender);
		// 			<OwnedCampaignsIndex<T>>::remove((sender.clone(), id.clone()));
		// 		},
		// 		Ok(_v) => {}
		// 	}
		// }

		// add the nonce
		Nonce::mutate(|n| *n += 1);

		Ok(())
	}

	// fn new_contribution(
	// 	sender: T::AccountId,
	// 	campaign: T::Hash,
	// 	contribution: T::Balance
	// ) -> DispatchResult {

	// 	// ensure campaign exists
	// 	ensure!(
	// 		<Campaigns<T>>::exists(campaign),
	// 		Error::<T>::CampaignDoesNotExist
	// 	);

	// 	// ensure investor has enough money
	// 	ensure!(
	// 		<balances::Module<T>>::free_balance(sender.clone()) >= contributed_amount,
	// 		"You don't have enough free balance for investing for the funding"
	// 	);

	// 	// increase the number of campaigns investor invested in
	// 	let invested_campaigns_count = Self::invested_campaigns_count(&sender);
	// 	let new_invested_campaigns_count = invested_campaigns_count.checked_add(1).ok_or("Overflow adding a new invested funding")?;

	// 	// increase the number of investors into the campaign
	// 	let contributor_count = <ContributorAccountsCount<T>>::get(&campaign);
	// 	let update_contributor_count = contributor_account.checked_add(1).ok_or("Overflow adding to the total number of investors of a campaign")?;

	// 	// get the funding
	// 	let campaign = Self::campaign_by_id(&campaign_id);
	// 	// ensure that the project is valid to invest
	// 	ensure!(<system::Module<T>>::block_number() < campaign.expiry, "This funding is expired.");

	// 	// reserve the amount of money
	// 	<balances::Module<T>>::reserve(&sender, invest_amount)?;

	// 	// change the state of invest related fields
	// 	<ContributionAmount<T>>::insert((campaign.clone(), sender.clone()), contribution_amount.clone());
	// 	<InvestAccounts<T>>::mutate(&campaign_id, |accounts| accounts.push(sender.clone()));

	// 	// add total supporter count
	// 	<InvestAccountsCount<T>>::insert(campaign.clone(), new_investor_count);

	// 	// change the state of invest related fields
	// 	<ContributedCampaignsArray<T>>::insert((sender.clone(), contributed_campaigns_count), campaign.clone());
	// 	<ContributedCampaignsCount<T>>::insert(&sender, update_contributed_campaigns_count);
	// 	<ContributedCampaignsIndex<T>>::insert((sender.clone(), campaign.clone()), contribtued_campaigns_count);

	// 	// get the total amount of the project and add invest_amount
	// 	let amount_of_funding = Self::total_amount_of_funding(&campaign_id);
	// 	let new_amount_of_funding = amount_of_funding + invest_amount;

	// 	// change the total amount of the project has collected
	// 	<CampaignContributionsAmount<T>>::insert(&campaign_id, new_amount_of_funding);

	// 	Ok(())
	// }

}
