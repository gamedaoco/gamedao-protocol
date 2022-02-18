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

//! # Crowdfunding Campaign Factory + Treasury
//!
//! Run `cargo doc --package module-crowdfunding --open` to view this pallet's documentation.
//!
//! ## Overview
//!
//! This pallet provides a simple on-chain crowdfunding mechanism:
//!
//! - creator can create a campaign with individual length and
//! amount of funds in PLAY to raise
//!
//! - investor can invest his funds into one of the running campaigns
//! and become an investor
//!
//! Upon finalization:
//!
//! - creator can request allocation of funds
//! - investors can collectively approve allocation of funds
//!
//! TODO:
//! - supervisor can lock, cancel campaigns
//!

// 1. create campaigns with custom funding goal and runtime
// 2. invest into open campaigns
#![cfg_attr(not(feature = "std"), no_std)]
#[warn(unused_imports)]
// pub use weights::WeightInfo;
pub use pallet::*;

use frame_support::{
    codec::{Decode, Encode},
    dispatch::DispatchResult,
    traits::{Randomness, UnixTime},
};
use scale_info::TypeInfo;
use sp_std::{fmt::Debug, vec::Vec};

use codec::FullCodec;
use frame_support::traits::Get;
use sp_runtime::traits::AtLeast32BitUnsigned;

use orml_traits::{MultiCurrency, MultiReservableCurrency};
use primitives::{Balance, CurrencyId, Moment};
use support::ControlPalletStorage;

// TODO: tests

// TODO: pallet benchmarking
// mod benchmarking;

// TODO: weights
// mod default_weights;

// TODO: externalise error messages
// mod errors;

#[derive(Encode, Decode, Clone, PartialEq, Eq, PartialOrd, Ord, TypeInfo, Debug)]
#[repr(u8)]
pub enum FlowProtocol {
    Grant = 0,
    Raise = 1,
    Lend = 2,
    Loan = 3,
    Share = 4,
    Pool = 5,
}

impl Default for FlowProtocol {
    fn default() -> Self {
        Self::Raise
    }
}

#[derive(Encode, Decode, Clone, PartialEq, Eq, PartialOrd, Ord, TypeInfo, Debug)]
#[repr(u8)]
pub enum FlowGovernance {
    No = 0,  // 100% unreserved upon completion
    Yes = 1, // withdrawal votings
}

impl Default for FlowGovernance {
    fn default() -> Self {
        Self::No
    }
}

#[derive(Encode, Decode, Clone, PartialEq, Eq, PartialOrd, Ord, TypeInfo, Debug)]
#[repr(u8)]
pub enum FlowState {
    Init = 0,
    Active = 1,
    Paused = 2,
    Success = 3,
    Failed = 4,
    Locked = 5,
}

impl Default for FlowState {
    fn default() -> Self {
        Self::Init
    }
}

// TODO: this can be decomposed to improve weight
#[derive(Encode, Decode, Default, Clone, PartialEq, Eq, TypeInfo)]
pub struct Campaign<Hash, AccountId, Balance, BlockNumber, Timestamp, FlowProtocol, FlowGovernance>
{
    // unique hash to identify campaign (generated)
    id: Hash,
    // hash of the overarching body from module-control
    org: Hash,
    // name
    name: Vec<u8>,

    // controller account -> must match body controller
    // during campaing runtime controller change is not allowed
    // needs to be revised to avoid campaign attack by starting
    // a campagin when dao wants to remove controller for reasons
    owner: AccountId,

    // TODO: THIS NEEDS TO BE GAMEDAO COUNCIL
    /// admin account of the campaign (operator)
    admin: AccountId,

    // TODO: assets => GAME
    /// campaign owners deposit
    deposit: Balance,

    // TODO: /// campaign start block
    // start: BlockNumber,
    /// block until campaign has to reach cap
    expiry: BlockNumber,
    /// minimum amount of token to become a successful campaign
    cap: Balance,

    /// protocol after successful raise
    protocol: FlowProtocol,
    /// governance after successful raise
    governance: FlowGovernance,

    /// content storage
    cid: Vec<u8>,

    // TODO: prepare for launchpad functionality
    // token cap
    // token_cap: u64,
    // token_price
    // token_price: u64,
    // /// token symbol
    token_symbol: Vec<u8>,
    // /// token name
    token_name: Vec<u8>,

    /// creation timestamp
    created: Timestamp,
}

#[frame_support::pallet]
pub mod pallet {
    use super::*;
    use frame_support::pallet_prelude::*;
    use frame_system::pallet_prelude::*;

    #[pallet::pallet]
    #[pallet::generate_store(pub(super) trait Store)]
    pub struct Pallet<T>(_);

    #[pallet::config]
    pub trait Config: frame_system::Config {
        type WeightInfo: frame_system::weights::WeightInfo;
        type Event: From<Event<Self>>
            + IsType<<Self as frame_system::Config>::Event>
            + Into<<Self as frame_system::Config>::Event>;

        type Currency: MultiCurrency<Self::AccountId, CurrencyId = CurrencyId, Balance = Balance>
            + MultiReservableCurrency<Self::AccountId>;
        type UnixTime: UnixTime;
        type Randomness: Randomness<Self::Hash, Self::BlockNumber>;
        type Control: ControlPalletStorage<Self::AccountId, Self::Hash>;

        /// The origin that is allowed to make judgements.
        type GameDAOAdminOrigin: EnsureOrigin<Self::Origin>;
        type GameDAOTreasury: Get<Self::AccountId>;

        #[pallet::constant]
        type MinLength: Get<u32>;
        #[pallet::constant]
        type MaxLength: Get<u32>;

        #[pallet::constant]
        type MaxCampaignsPerAddress: Get<u32>;
        #[pallet::constant]
        type MaxCampaignsPerBlock: Get<u32>;
        #[pallet::constant]
        type MaxContributionsPerBlock: Get<u32>;

        #[pallet::constant]
        type MinDuration: Get<Self::BlockNumber>;
        #[pallet::constant]
        type MaxDuration: Get<Self::BlockNumber>;
        #[pallet::constant]
        type MinCreatorDeposit: Get<Balance>;
        #[pallet::constant]
        type MinContribution: Get<Balance>;

        #[pallet::constant]
        type FundingCurrencyId: Get<CurrencyId>;

        // TODO: collect fees for treasury
        // type CreationFee: Get<Balance<Self>>;
        #[pallet::constant]
        type CampaignFee: Get<Balance>;
    }

    /// Campaign
    #[pallet::storage]
    #[pallet::getter(fn campaign_by_id)]
    pub(super) type Campaigns<T: Config> = StorageMap<
        _,
        Blake2_128Concat,
        T::Hash,
        Campaign<
            T::Hash,
            T::AccountId,
            Balance,
            T::BlockNumber,
            Moment,
            FlowProtocol,
            FlowGovernance,
        >,
        ValueQuery,
    >;

    /// Associated Body
    #[pallet::storage]
    #[pallet::getter(fn campaign_org)]
    pub(super) type CampaignOrg<T: Config> =
        StorageMap<_, Blake2_128Concat, T::Hash, T::Hash, ValueQuery>;

    /// Get Campaign Owner (body controller) by campaign id
    #[pallet::storage]
    #[pallet::getter(fn campaign_owner)]
    pub(super) type CampaignOwner<T: Config> =
        StorageMap<_, Blake2_128Concat, T::Hash, T::AccountId, OptionQuery>;

    /// Get Campaign Admin (supervision) by campaign id
    #[pallet::storage]
    #[pallet::getter(fn campaign_admin)]
    pub(super) type CampaignAdmin<T: Config> =
        StorageMap<_, Blake2_128Concat, T::Hash, T::AccountId, OptionQuery>;

    /// Campaign state
    /// 0 init, 1 active, 2 paused, 3 complete success, 4 complete failed, 5 authority lock
    #[pallet::storage]
    #[pallet::getter(fn campaign_state)]
    pub(super) type CampaignState<T: Config> =
        StorageMap<_, Blake2_128Concat, T::Hash, FlowState, ValueQuery, GetDefault>;

    /// Get Campaigns for a certain state
    #[pallet::storage]
    #[pallet::getter(fn campaigns_by_state)]
    pub(super) type CampaignsByState<T: Config> =
        StorageMap<_, Blake2_128Concat, FlowState, Vec<T::Hash>, ValueQuery>;

    /// Campaigns ending in block x
    #[pallet::storage]
    #[pallet::getter(fn campaigns_by_block)]
    pub(super) type CampaignsByBlock<T: Config> =
        StorageMap<_, Blake2_128Concat, T::BlockNumber, Vec<T::Hash>, ValueQuery>;

    /// Total number of campaigns -> all campaigns
    #[pallet::storage]
    #[pallet::getter(fn campaigns_index)]
    pub(super) type CampaignsArray<T: Config> =
        StorageMap<_, Blake2_128Concat, u64, T::Hash, ValueQuery>;
    #[pallet::storage]
    #[pallet::getter(fn campaigns_count)]
    pub type CampaignsCount<T: Config> = StorageValue<_, u64, ValueQuery>;
    #[pallet::storage]
    pub(super) type CampaignsIndex<T: Config> =
        StorageMap<_, Blake2_128Concat, T::Hash, u64, ValueQuery>;

    // caller owned campaigns -> my campaigns
    #[pallet::storage]
    #[pallet::getter(fn campaigns_owned_index)]
    pub(super) type CampaignsOwnedArray<T: Config> =
        StorageMap<_, Blake2_128Concat, T::Hash, T::Hash, ValueQuery>;
    #[pallet::storage]
    #[pallet::getter(fn campaigns_owned_count)]
    pub(super) type CampaignsOwnedCount<T: Config> =
        StorageMap<_, Blake2_128Concat, T::Hash, u64, ValueQuery>;
    #[pallet::storage]
    pub(super) type CampaignsOwnedIndex<T: Config> =
        StorageMap<_, Blake2_128Concat, (T::Hash, T::Hash), u64, ValueQuery>;

    /// campaigns contributed by accountid
    #[pallet::storage]
    #[pallet::getter(fn campaigns_contributed)]
    pub(super) type CampaignsContributed<T: Config> =
        StorageMap<_, Blake2_128Concat, T::AccountId, Vec<T::Hash>, ValueQuery>;

    /// campaigns related to an organisation
    #[pallet::storage]
    #[pallet::getter(fn campaigns_by_body)]
    pub(super) type CampaignsByBody<T: Config> =
        StorageMap<_, Blake2_128Concat, T::Hash, Vec<T::Hash>, ValueQuery>;

    // caller contributed campaigns -> contributed campaigns
    #[pallet::storage]
    #[pallet::getter(fn campaigns_contributed_index)]
    pub(super) type CampaignsContributedArray<T: Config> =
        StorageMap<_, Blake2_128Concat, (T::AccountId, u64), T::Hash, ValueQuery>;
    #[pallet::storage]
    #[pallet::getter(fn campaigns_contributed_count)]
    pub(super) type CampaignsContributedCount<T: Config> =
        StorageMap<_, Blake2_128Concat, T::AccountId, u64, ValueQuery>;
    #[pallet::storage]
    pub(super) type CampaignsContributedIndex<T: Config> =
        StorageMap<_, Blake2_128Concat, (T::AccountId, T::Hash), u64, ValueQuery>;

    // Total contributions balance per campaign
    #[pallet::storage]
    #[pallet::getter(fn campaign_balance)]
    pub(super) type CampaignBalance<T: Config> =
        StorageMap<_, Blake2_128Concat, T::Hash, Balance, ValueQuery>;

    // Contributions per user
    #[pallet::storage]
    #[pallet::getter(fn campaign_contribution)]
    pub(super) type CampaignContribution<T: Config> =
        StorageMap<_, Blake2_128Concat, (T::Hash, T::AccountId), Balance, ValueQuery>;

    // Contributors
    #[pallet::storage]
    #[pallet::getter(fn campaign_contributors)]
    pub(super) type CampaignContributors<T: Config> =
        StorageMap<_, Blake2_128Concat, T::Hash, Vec<T::AccountId>, ValueQuery>;
    #[pallet::storage]
    #[pallet::getter(fn campaign_contributors_count)]
    pub(super) type CampaignContributorsCount<T: Config> =
        StorageMap<_, Blake2_128Concat, T::Hash, u64, ValueQuery>;

    // Max campaign block limit
    // CampaignMaxDuration get(fn get_max_duration) config(): T::BlockNumber = T::BlockNumber::from(T::MaxDuration::get());

    // Campaign nonce, increases per created campaign

    #[pallet::storage]
    #[pallet::getter(fn nonce)]
    pub type Nonce<T: Config> = StorageValue<_, u128, ValueQuery>;

    #[pallet::event]
    #[pallet::generate_deposit(pub(super) fn deposit_event)]
    pub enum Event<T: Config> {
        CampaignDestroyed(T::Hash),
        CampaignCreated(
            T::Hash,
            T::AccountId,
            T::AccountId,
            Balance,
            Balance,
            T::BlockNumber,
            Vec<u8>,
        ),
        CampaignContributed(T::Hash, T::AccountId, Balance, T::BlockNumber),
        CampaignFinalized(T::Hash, Balance, T::BlockNumber, bool),
        CampaignFailed(T::Hash, Balance, T::BlockNumber, bool),
        CampaignUpdated(T::Hash, FlowState, T::BlockNumber),
        Message(Vec<u8>),
    }

    #[pallet::error]
    pub enum Error<T> {
        //
        //	general
        //
        /// Must contribute at least the minimum amount of Campaigns
        ContributionTooSmall,
        /// Balance too low.
        BalanceTooLow,
        /// Treasury Balance Too Low
        TreasuryBalanceTooLow,
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
        /// Campaign expired
        CampaignExpired,
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
        /// Overflow adding a new owner
        AddOwnedOverflow,
        /// Overflow adding to the total number of contributors of a camapaign
        UpdateContributorOverflow,
        /// Overflow adding to the total number of contributions of a camapaign
        AddContributionOverflow,
        /// Campaign owner unknown
        OwnerUnknown,
        /// Campaign admin unknown
        AdminUnknown,
        /// Cannot contribute to owned campaign
        NoContributionToOwnCampaign,
        /// Guru Meditation
        GuruMeditation,
        /// Zou are not authorized for this call
        AuthorizationError,
        /// Contributions not allowed
        NoContributionsAllowed,
        /// Id Unknown
        IdUnknown,
        /// Transfer Error
        TransferError,
    }

    #[pallet::hooks]
    impl<T: Config> Hooks<BlockNumberFor<T>> for Pallet<T> {
        /// Block finalization
        fn on_finalize(_n: BlockNumberFor<T>) {
            // get all the campaigns ending in current block
            let block_number = <frame_system::Pallet<T>>::block_number();
            // which campaigns end in this block
            let campaign_hashes = Self::campaigns_by_block(block_number);

            // iterate over campaigns ending in this block
            for campaign_id in &campaign_hashes {
                // get campaign struct
                let campaign = Self::campaign_by_id(campaign_id);
                let campaign_balance = Self::campaign_balance(campaign_id);
                let dao = Self::campaign_org(&campaign_id);
                let dao_treasury = T::Control::body_treasury(dao);

                // check for cap reached
                if campaign_balance >= campaign.cap {
                    // get campaign owner
                    // should be controller --- test?
                    let _owner = Self::campaign_owner(campaign_id);

                    match _owner {
                        Some(owner) => {
                            // get all contributors
                            let contributors = Self::campaign_contributors(campaign_id);
                            let mut transaction_complete = true;

                            // 1 iterate over contributors
                            // 2 unreserve contribution
                            // 3 transfer contribution to campaign treasury
                            'inner: for contributor in &contributors {
                                // if contributor == campaign owner, skip
                                if contributor == &owner {
                                    continue;
                                }

                                // get amount from contributor
                                let contributor_balance = Self::campaign_contribution((
                                    *campaign_id,
                                    contributor.clone(),
                                ));

                                // unreserve the amount in contributor balance
                                let unreserve_amount = T::Currency::unreserve(
                                    T::FundingCurrencyId::get(),
                                    &contributor,
                                    contributor_balance.clone(),
                                );

                                // transfer from contributor
                                let transfer_amount = T::Currency::transfer(
                                    T::FundingCurrencyId::get(),
                                    &contributor,
                                    &dao_treasury,
                                    contributor_balance.clone(),
                                    // TODO: check how this impacts logic:
                                    // ExistenceRequirement::AllowDeath
                                );

                                // success?
                                match transfer_amount {
                                    Err(_e) => {
                                        transaction_complete = false;
                                        break 'inner;
                                    }
                                    Ok(_v) => {}
                                }
                            }

                            // If all transactions are settled
                            // 1. reserve campaign balance
                            // 2. unreserve and send the commission to operator treasury
                            if transaction_complete {
                                // reserve campaign volume
                                let reserve_campaign_amount = T::Currency::reserve(
                                    T::FundingCurrencyId::get(),
                                    &dao_treasury,
                                    campaign_balance.clone(),
                                );

                                //
                                //

                                // calculate commission

                                // -> pub const CampaignFee: Balance = 25 * CENTS;
                                // let fee = <T as Config>::CampaignFee::get();

                                // -> CampaignBalance get(fn campaign_balance): map hasher(blake2_128_concat) T::Hash => T::Balance;
                                // let bal = campaign_balance.clone();

                                // let commission = U256::from( bal.into() )
                                // .checked_div( U256::from( fee.into() ) );

                                // let commission = bal.checked_div(fee);
                                // let commission = U256::from(bal).checked_div(U256::from(fee));

                                //
                                //

                                // let unreserve_commission = <balances::Module<T>>::unreserve(
                                // 	&dao_treasury,
                                // 	commission.clone()
                                // );

                                // let transfer_commission = <balances::Module<T> as Currency<_>>::transfer(
                                // 	&dao_treasury,
                                // 	&<T as Config>::GameDAOTreasury::get(),
                                // 	commission,
                                // 	ExistenceRequirement::AllowDeath
                                // );
                                // match transfer_commission {
                                // 	Err(_e) => {   }, //(Error::<T>::TransferError)
                                // 	Ok(_v) => {}
                                // }

                                Self::set_state(campaign.id.clone(), FlowState::Success);

                                // finalized event
                                Self::deposit_event(Event::CampaignFinalized(
                                    *campaign_id,
                                    campaign_balance,
                                    block_number,
                                    true,
                                ));
                            }
                        }
                        None => continue,
                    }

                // campaign cap not reached
                } else {
                    // campaign failed, revert all contributions

                    let contributors = Self::campaign_contributors(campaign_id);
                    for account in contributors {
                        let contribution =
                            Self::campaign_contribution((*campaign_id, account.clone()));
                        T::Currency::unreserve(T::FundingCurrencyId::get(), &account, contribution);
                    }

                    // update campaign state to failed
                    Self::set_state(campaign.id, FlowState::Failed);

                    // unreserve DEPOSIT

                    let unreserve_deposit = T::Currency::unreserve(
                        T::FundingCurrencyId::get(),
                        &dao_treasury,
                        campaign.deposit,
                    );

                    // failed event
                    Self::deposit_event(Event::CampaignFailed(
                        *campaign_id,
                        campaign_balance,
                        block_number,
                        false,
                    ));
                }
            }
        }
    }

    #[pallet::call]
    impl<T: Config> Pallet<T> {
        #[pallet::weight(5_000_000)]
        pub fn create(
            origin: OriginFor<T>,
            org: T::Hash,
            admin: T::AccountId, // supervision, should be dao provided!
            name: Vec<u8>,
            target: Balance,
            deposit: Balance,
            expiry: T::BlockNumber,
            protocol: FlowProtocol,
            governance: FlowGovernance,
            cid: Vec<u8>,          // content cid
            token_symbol: Vec<u8>, // up to 5
            token_name: Vec<u8>,   // cleartext
                                   // token_curve_a: u8,      // preset
                                   // token_curve_b: Vec<u8>, // custom
        ) -> DispatchResult {
            let creator = ensure_signed(origin)?;

            let controller = T::Control::body_controller(org.clone());

            ensure!(creator == controller, Error::<T>::AuthorizationError);

            // Get Treasury account for deposits and fees

            let treasury = T::Control::body_treasury(org.clone());

            let free_balance = T::Currency::free_balance(T::FundingCurrencyId::get(), &treasury);
            ensure!(free_balance > deposit, Error::<T>::TreasuryBalanceTooLow);
            ensure!(deposit <= target, Error::<T>::DepositTooHigh);

            // check name length boundary
            ensure!(
                (name.len() as u32) >= T::MinLength::get(),
                Error::<T>::NameTooShort
            );
            ensure!(
                (name.len() as u32) <= T::MaxLength::get(),
                Error::<T>::NameTooLong
            );

            let now = <frame_system::Pallet<T>>::block_number();
            let timestamp = T::UnixTime::now().as_secs();

            // ensure campaign expires after now
            ensure!(expiry > now, Error::<T>::EndTooEarly);

            let max_length = T::MaxDuration::get();
            let max_end_block = now + max_length;
            ensure!(expiry <= max_end_block, Error::<T>::EndTooLate);

            // generate the unique campaign id + ensure uniqueness
            let phrase = b"crowdfunding_campaign"; // create from name?
            let id = T::Randomness::random(phrase).0;
            // ensure!(!<CampaignOwner<T>>::exists(&id), Error::<T>::IdExists ); // check for collision

            // check contribution limit per block
            let contributions = Self::campaigns_by_block(expiry);
            ensure!(
                (contributions.len() as u32) < T::MaxCampaignsPerBlock::get(),
                Error::<T>::ContributionsPerBlockExceeded
            );

            //
            //
            //

            let new_campaign = Campaign {
                id: id.clone(),
                org: org.clone(),
                name: name.clone(),
                owner: creator.clone(),
                admin: admin.clone(),
                deposit: deposit.clone(),
                expiry: expiry.clone(),
                cap: target.clone(),
                protocol: protocol.clone(),
                governance: governance.clone(),
                cid: cid.clone(),
                token_symbol: token_symbol.clone(),
                token_name: token_name.clone(),
                created: timestamp,
            };

            // mint the campaign
            Self::mint(new_campaign)?;

            // 0 init, 1 active, 2 paused, 3 complete success, 4 complete failed, 5 authority lock
            Self::set_state(id.clone(), FlowState::Active);

            // deposit the event
            Self::deposit_event(Event::CampaignCreated(
                id, creator, admin, target, deposit, expiry, name,
            ));
            Ok(())

            // No fees are paid here if we need to create this account;
            // that's why we don't just use the stock `transfer`.
            // T::Currency::resolve_creating(&Self::campaign_account_id(index), imb);
        }

        #[pallet::weight(1_000_000)]
        pub fn update_state(
            origin: OriginFor<T>,
            campaign_id: T::Hash,
            state: FlowState,
        ) -> DispatchResult {
            // access control
            let sender = ensure_signed(origin)?;

            let owner = Self::campaign_owner(campaign_id).ok_or(Error::<T>::OwnerUnknown)?;
            let admin = Self::campaign_admin(campaign_id).ok_or(Error::<T>::AdminUnknown)?;
            ensure!(sender == admin, Error::<T>::AuthorizationError);

            // expired?
            let campaign = Self::campaign_by_id(&campaign_id);
            let now = <frame_system::Pallet<T>>::block_number();
            ensure!(now < campaign.expiry, Error::<T>::CampaignExpired);

            // not finished or locked?
            let current_state = Self::campaign_state(campaign_id);
            ensure!(
                current_state < FlowState::Success,
                Error::<T>::CampaignExpired
            );

            // set
            Self::set_state(campaign_id.clone(), state.clone());

            // dispatch status update event
            Self::deposit_event(Event::CampaignUpdated(campaign_id, state, now));

            Ok(())
        }

        /// contribute to project
        #[pallet::weight(5_000_000)]
        pub fn contribute(
            origin: OriginFor<T>,
            campaign_id: T::Hash,
            contribution: Balance,
        ) -> DispatchResult {
            // check

            let sender = ensure_signed(origin)?;
            ensure!(
                T::Currency::free_balance(T::FundingCurrencyId::get(), &sender) >= contribution,
                Error::<T>::BalanceTooLow
            );
            let owner = Self::campaign_owner(campaign_id).ok_or(Error::<T>::OwnerUnknown)?;
            ensure!(owner != sender, Error::<T>::NoContributionToOwnCampaign);

            ensure!(
                Campaigns::<T>::contains_key(campaign_id),
                Error::<T>::InvalidId
            );
            let state = Self::campaign_state(campaign_id);
            ensure!(
                state == FlowState::Active,
                Error::<T>::NoContributionsAllowed
            );
            let campaign = Self::campaign_by_id(&campaign_id);
            ensure!(
                <frame_system::Pallet<T>>::block_number() < campaign.expiry,
                Error::<T>::CampaignExpired
            );

            // write

            Self::create_contribution(sender.clone(), campaign_id.clone(), contribution.clone())?;

            // event

            let now = <frame_system::Pallet<T>>::block_number();
            Self::deposit_event(Event::CampaignContributed(
                campaign_id,
                sender,
                contribution,
                now,
            ));

            Ok(())
        }
    }
}

impl<T: Config> Pallet<T> {
    fn set_state(id: T::Hash, state: FlowState) {
        let current_state = Self::campaign_state(&id);

        // remove
        let mut current_state_members = Self::campaigns_by_state(&current_state);
        match current_state_members.binary_search(&id) {
            Ok(index) => {
                current_state_members.remove(index);
                CampaignsByState::<T>::insert(&current_state, current_state_members);
            }
            Err(_) => (), //(Error::<T>::IdUnknown)
        }

        // add
        CampaignsByState::<T>::mutate(&state, |campaigns| campaigns.push(id.clone()));
        CampaignState::<T>::insert(id, state);
    }

    // campaign creator
    // sender: T::AccountId,
    // generated campaign id
    // campaign_id: T::Hash,
    // expiration blocktime
    // example: desired lifetime == 30 days
    // 30 days * 24h * 60m / 5s avg blocktime ==
    // 2592000s / 5s == 518400 blocks from now.
    // expiry: T::BlockNumber,
    // campaign creator deposit to invoke the campaign
    // deposit: Balance,
    // funding protocol
    // 0 grant, 1 prepaid, 2 loan, 3 shares, 4 dao, 5 pool
    // proper assignment of funds into the instrument
    // happens after successful funding of the campaing
    // protocol: u8,
    // campaign object
    pub fn mint(
        campaign: Campaign<
            T::Hash,
            T::AccountId,
            Balance,
            T::BlockNumber,
            Moment,
            FlowProtocol,
            FlowGovernance,
        >,
    ) -> DispatchResult {
        // add campaign to campaigns
        Campaigns::<T>::insert(&campaign.id, campaign.clone());
        // add org to index
        CampaignOrg::<T>::insert(&campaign.id, campaign.org.clone());
        // Owner == DAO
        CampaignOwner::<T>::insert(&campaign.id, campaign.owner.clone());
        // TODO: Admin == Council
        CampaignAdmin::<T>::insert(&campaign.id, campaign.admin.clone());
        // add to campaigns by body
        CampaignsByBody::<T>::mutate(&campaign.org, |campaigns| campaigns.push(campaign.id));

        // expiration
        CampaignsByBlock::<T>::mutate(&campaign.expiry, |campaigns| {
            campaigns.push(campaign.id.clone())
        });

        // global campaigns count
        let campaigns_count = Self::campaigns_count();
        let update_campaigns_count = campaigns_count
            .checked_add(1)
            .ok_or(Error::<T>::AddCampaignOverflow)?;

        // update global campaign count
        CampaignsArray::<T>::insert(&campaigns_count, campaign.id.clone());
        CampaignsCount::<T>::put(update_campaigns_count);
        CampaignsIndex::<T>::insert(campaign.id.clone(), campaigns_count);

        // campaigns owned needs a refactor:
        // CampaignsCreated( dao => map )
        // owned campaigns count
        let campaigns_owned_count = Self::campaigns_owned_count(&campaign.org);
        let update_campaigns_owned_count = campaigns_owned_count
            .checked_add(1)
            .ok_or(Error::<T>::AddOwnedOverflow)?;

        // update owned campaigns for dao
        CampaignsOwnedArray::<T>::insert(&campaign.org, campaign.id.clone());
        CampaignsOwnedCount::<T>::insert(&campaign.org, update_campaigns_count);
        CampaignsOwnedIndex::<T>::insert((&campaign.org, &campaign.id), campaigns_owned_count);

        // TODO: this should be a proper mechanism
        // to reserve some of the staked GAME
        let treasury = T::Control::body_treasury(campaign.org.clone());

        // let fundingCurrency = T::FundingCurrencyId::get();
        T::Currency::reserve(
            T::FundingCurrencyId::get(),
            &treasury,
            campaign.deposit.clone(),
        )?;
        // let _ = <balances::Module<T>>::reserve(
        // 	&treasury,
        // 	campaign.deposit.clone()
        // );

        // nonce ++
        Nonce::<T>::mutate(|n| *n += 1);

        Ok(())
    }

    fn create_contribution(
        sender: T::AccountId,
        campaign_id: T::Hash,
        contribution: Balance,
    ) -> DispatchResult {
        let campaign = Self::campaign_by_id(&campaign_id);
        let returning_contributor =
            CampaignContribution::<T>::contains_key((&campaign_id, &sender));

        // check if contributor exists
        // if not, update metadata
        if !returning_contributor {
            // increase the number of contributors
            let campaigns_contributed = Self::campaigns_contributed_count(&sender);
            CampaignsContributedArray::<T>::insert(
                (sender.clone(), campaigns_contributed),
                campaign_id,
            );
            CampaignsContributedIndex::<T>::insert(
                (sender.clone(), campaign_id.clone()),
                campaigns_contributed,
            );

            let update_campaigns_contributed = campaigns_contributed
                .checked_add(1)
                .ok_or(Error::<T>::AddContributionOverflow)?;
            CampaignsContributedCount::<T>::insert(&sender, update_campaigns_contributed);

            // increase the number of contributors of the campaign
            let contributors = CampaignContributorsCount::<T>::get(&campaign_id);
            let update_contributors = contributors
                .checked_add(1)
                .ok_or(Error::<T>::UpdateContributorOverflow)?;
            CampaignContributorsCount::<T>::insert(campaign_id.clone(), update_contributors);

            // add contibutor to campaign contributors
            CampaignContributors::<T>::mutate(&campaign_id, |accounts| {
                accounts.push(sender.clone())
            });
        }

        // check if campaign is in contributions map of contributor and add
        let mut campaigns_contributed = Self::campaigns_contributed(&sender);
        if !campaigns_contributed.contains(&campaign_id) {
            campaigns_contributed.push(campaign_id.clone());
            CampaignsContributed::<T>::insert(&sender, campaigns_contributed);
        }

        // reserve contributed amount
        T::Currency::reserve(T::FundingCurrencyId::get(), &sender, contribution)?;

        // update contributor balance for campaign
        let total_contribution = Self::campaign_contribution((&campaign_id, &sender));
        let update_total_contribution = total_contribution + contribution;
        CampaignContribution::<T>::insert((&campaign_id, &sender), update_total_contribution);

        // update campaign balance
        let total_campaign_balance = Self::campaign_balance(&campaign_id);
        let update_campaign_balance = total_campaign_balance + contribution;
        CampaignBalance::<T>::insert(&campaign_id, update_campaign_balance);

        Ok(())
    }
}
