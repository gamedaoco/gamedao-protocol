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
// Copyright (C) 2010-2020 ZERO Labs.
// SPDX-License-Identifier: Apache-2.0

// Proposals and voting space for organizations and campaigns.
// This pallet provides next features:
//  * Allow members of organisations to generate proposals under campaign.
//    Each proposal has a lifitime, expiration, details and number of votes.
//    Specific type of proposal is withdrawal one.
//    It allows (if approved) to release locked campaign balance for further usage.
//  * Vote on those proposals.
//  * Manage proposal lifetime, close and finalize those proposals once expired.

#![cfg_attr(not(feature = "std"), no_std)]

pub use pallet::*;

pub mod voting_enums;
pub mod voting_structs;

#[cfg(test)]
pub mod mock;
#[cfg(test)]
mod tests;
// #[cfg(feature = "runtime-benchmarks")]  // todo
// mod benchmarking;


#[frame_support::pallet]
pub mod pallet {
    use frame_system::{
        ensure_signed,
        pallet_prelude::{OriginFor, BlockNumberFor},
        WeightInfo
    };
    use frame_support::{
        dispatch::DispatchResult,
        traits::{Randomness},
        pallet_prelude::*,
        transactional
    };
    use sp_std::vec::Vec;
    use orml_traits::{MultiCurrency, MultiReservableCurrency};

    use zero_primitives::{Balance, CurrencyId};
    use support::{
    	ControlPalletStorage, ControlState, ControlMemberState,
    	FlowPalletStorage, FlowState
    };

    use super::*;
    use voting_enums::{ProposalState, ProposalType, VotingType};
    use voting_structs::{Proposal, ProposalMetadata};


    #[pallet::config]
    pub trait Config: frame_system::Config {
        type Event: From<Event<Self>> + IsType<<Self as frame_system::Config>::Event> + Into<<Self as frame_system::Config>::Event>;
        type Currency: MultiCurrency<Self::AccountId, CurrencyId = CurrencyId, Balance = Balance>
            + MultiReservableCurrency<Self::AccountId>;
        type Randomness: Randomness<Self::Hash, Self::BlockNumber>;
        type Control: ControlPalletStorage<Self::AccountId, Self::Hash>;
        type Flow: FlowPalletStorage<Self::Hash, Balance>;
        type ForceOrigin: EnsureOrigin<Self::Origin>;
        type WeightInfo: WeightInfo;

        #[pallet::constant]
        type MaxProposalsPerBlock: Get<u32>;  // 3

        #[pallet::constant]
        type MaxProposalDuration: Get<u32>;  // 864000, 60 * 60 * 24 * 30 / 3

        #[pallet::constant]
        type FundingCurrencyId: Get<CurrencyId>;
    }


    #[pallet::pallet]
    #[pallet::generate_store(pub(super) trait Store)]
    pub struct Pallet<T>(_);


    /// Global status
    #[pallet::storage]
    pub(super) type Proposals<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, Proposal<T::Hash, T::BlockNumber, ProposalType, VotingType>, ValueQuery>;

    #[pallet::storage]
    pub(super) type Metadata<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, ProposalMetadata<Balance>, ValueQuery>;

    #[pallet::storage]
    pub(super) type Owners<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, T::AccountId, OptionQuery>;

    #[pallet::storage]
    pub(super) type ProposalStates<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, ProposalState, ValueQuery, GetDefault>;

    /// Maximum time limit for a proposal
    #[pallet::type_value]
    pub(super) fn ProposalTimeLimitDefault<T: Config>() -> T::BlockNumber { T::BlockNumber::from(T::MaxProposalDuration::get()) }
    #[pallet::storage]
    pub(super) type ProposalTimeLimit<T: Config> = StorageValue <_, T::BlockNumber, ValueQuery, ProposalTimeLimitDefault<T>>;

    /// All proposals
    #[pallet::storage]
    pub(super) type ProposalsArray<T: Config> = StorageMap<_, Blake2_128Concat, u64, T::Hash, ValueQuery>;

    #[pallet::storage]
    pub(super) type ProposalsCount<T: Config> = StorageValue<_, u64, ValueQuery>;

    #[pallet::storage]
    pub(super) type ProposalsIndex<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, u64, ValueQuery>;

    /// Proposals by campaign / org
    #[pallet::storage]
    pub(super) type ProposalsByContextArray<T: Config> = StorageMap<_, Blake2_128Concat, (T::Hash, u64), T::Hash, ValueQuery>;

    #[pallet::storage]
    pub(super) type ProposalsByContextCount<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, u64, ValueQuery>;

    #[pallet::storage]
    pub(super) type ProposalsByContextIndex<T: Config> = StorageMap<_, Blake2_128Concat, (T::Hash, T::Hash), u64, ValueQuery>;

    /// all proposals for a given context
    #[pallet::storage]
    pub(super) type ProposalsByContext<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, Vec<T::Hash>, ValueQuery>;

    /// Proposals by owner
    #[pallet::storage]
    pub(super) type ProposalsByOwnerArray<T: Config> = StorageMap<_, Blake2_128Concat, (T::AccountId, u64), T::Hash, ValueQuery>;

    #[pallet::storage]
    pub(super) type ProposalsByOwnerCount<T: Config> = StorageMap<_, Blake2_128Concat, T::AccountId, u64, ValueQuery>;

    #[pallet::storage]
    pub(super) type ProposalsByOwnerIndex<T: Config> = StorageMap<_, Blake2_128Concat, (T::AccountId, T::Hash), u64, ValueQuery>;

    /// Proposals where voter participated
    #[pallet::storage]
    pub(super) type ProposalsByVoter<T: Config> = StorageMap<_, Blake2_128Concat, T::AccountId, Vec<(T::Hash, bool)>, ValueQuery>;

    /// Proposal voters and votes by proposal
    #[pallet::storage]
    pub(super) type ProposalVotesByVoters<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, Vec<(T::AccountId, bool)>, ValueQuery>;
    
    /// Total proposals voted on by voter
    #[pallet::storage]
    pub(super) type ProposalsByVoterCount<T: Config> = StorageMap<_, Blake2_128Concat, T::AccountId, u64, ValueQuery>;

    /// Proposals ending in a block
    #[pallet::storage]
    pub(super) type ProposalsByBlock<T: Config> = StorageMap<_, Blake2_128Concat, T::BlockNumber, Vec<T::Hash>, ValueQuery>;

    /// The amount of currency that a project has used
    #[pallet::storage]
    pub(super) type CampaignBalanceUsed<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, Balance, ValueQuery>;

    /// The number of people who approve a proposal
    #[pallet::storage]
    pub(super) type ProposalApprovers<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, u64, ValueQuery, GetDefault>;

    /// The number of people who deny a proposal
    #[pallet::storage]
    pub(super) type ProposalDeniers<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, u64, ValueQuery, GetDefault>;

    /// Voters per proposal
    #[pallet::storage]
    pub(super) type ProposalVoters<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, Vec<T::AccountId>, ValueQuery>;

    /// Voter count per proposal
    #[pallet::storage]
    pub(super) type ProposalVotes<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, u64, ValueQuery, GetDefault>;

    /// Ack vs Nack
    #[pallet::storage]
    pub(super) type ProposalSimpleVotes<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, (u64, u64), ValueQuery, GetDefault>;
    
    /// User has voted on a proposal
    #[pallet::storage]
    pub(super) type VotedBefore<T: Config> = StorageMap<_, Blake2_128Concat, (T::AccountId, T::Hash), bool, ValueQuery, GetDefault>;
    
    // TODO: ProposalTotalEligibleVoters
    // TODO: ProposalApproversWeight
    // TODO: ProposalDeniersWeight
    // TODO: ProposalTotalEligibleWeight

    /// The total number of proposals
    #[pallet::storage]
    pub(super) type Nonce<T: Config> = StorageValue<_, u128, ValueQuery>;


    #[pallet::event]
    #[pallet::generate_deposit(pub(super) fn deposit_event)]
    pub enum Event<T: Config> {
        Proposal {
            sender_id: T::AccountId,
            proposal_id: T::Hash
        },
        ProposalCreated {
        	sender_id: T::AccountId,
        	context_id: T::Hash,
        	proposal_id: T::Hash,
        	amount: Balance,
        	expiry: T::BlockNumber,
        },
        ProposalVoted {
        	sender_id: T::AccountId,
        	proposal_id: T::Hash,
        	vote: bool
        },
        // ProposalFinalized(T::Hash, u8),
        ProposalApproved {
        	proposal_id: T::Hash
        },
        ProposalRejected {
        	proposal_id: T::Hash
        },
        ProposalExpired {
        	proposal_id: T::Hash
        },
        // ProposalAborted(T::Hash),
        // ProposalError(T::Hash, Vec<u8>),
        WithdrawalGranted {
        	proposal_id: T::Hash,
        	context_id: T::Hash,
        	body_id: T::Hash
        },
    }

    #[pallet::error]
    pub enum Error<T> {
        /// Proposal Ended
        ProposalEnded,
        /// Proposal Exists
        ProposalExists,
        /// Proposal Expired
        ProposalExpired,
        /// Already Voted
        AlreadyVoted,
        /// Proposal Unknown
        ProposalUnknown,
        /// DAO Inactive
        DAOInactive,
        /// Authorization Error
        AuthorizationError,
        /// Tangram Creation Failed
        TangramCreationError,
        /// Out Of Bounds Error
        OutOfBounds,
        /// Unknown Error
        UnknownError,
        ///MemberExists
        MemberExists,
        /// Unknown Campaign
        CampaignUnknown,
        /// Campaign Failed
        CampaignFailed,
        /// Balance Too Low
        BalanceInsufficient,
        /// Hash Collision
        HashCollision,
        /// Unknown Account
        UnknownAccount,
        /// Too Many Proposals for block
        TooManyProposals,
        /// Overflow Error
        OverflowError,
        /// Division Error
        DivisionError
    }

    #[pallet::call]
    impl<T: Config> Pallet<T> {


        // TODO: general proposal for a DAO
        #[pallet::weight(5_000_000)]
        #[transactional]
        pub fn general_proposal(
            origin: OriginFor<T>,
            context_id: T::Hash,
            title: Vec<u8>,
            cid: Vec<u8>,
            start: T::BlockNumber,
            expiry: T::BlockNumber
        ) -> DispatchResult {

            let sender = ensure_signed(origin)?;

            // active/existing dao?
            ensure!(T::Control::body_state(&context_id) == ControlState::Active, Error::<T>::DAOInactive);

            // member of body?
            let member = T::Control::body_member_state(&context_id, &sender);
            ensure!(member == ControlMemberState::Active, Error::<T>::AuthorizationError);

            // ensure that start and expiry are in bounds
            let current_block = <frame_system::Pallet<T>>::block_number();
            // ensure!(start > current_block, Error::<T>::OutOfBounds );
            ensure!(expiry > current_block, Error::<T>::OutOfBounds );
            ensure!(expiry <= current_block + <ProposalTimeLimit::<T>>::get(), Error::<T>::OutOfBounds );

            // ensure that number of proposals
            // ending in target block
            // do not exceed the maximum
            let proposals = <ProposalsByBlock::<T>>::get(expiry);
            // ensure!(proposals.len() as u32 < T::MaxProposalsPerBlock::get(), "Maximum number of proposals is reached for the target block, try another block");
            ensure!((proposals.len() as u32) < T::MaxProposalsPerBlock::get(), Error::<T>::TooManyProposals);  // todo: was error generated manually on purpose?

            let proposal_type = ProposalType::General;
            let proposal_state = ProposalState::Active;
            let voting_type = VotingType::Simple;
            // ensure!(!<Proposals<T>>::contains_key(&context_id), "Proposal id already exists");
            ensure!(!<Proposals<T>>::contains_key(&context_id), Error::<T>::ProposalExists);  // todo: was error generated manually on purpose?


            // check add
            let proposals_count = <ProposalsCount::<T>>::get();
            let updated_proposals_count = proposals_count.checked_add(1).ok_or( Error::<T>::OverflowError)?;
            let proposals_by_campaign_count = <ProposalsByContextCount::<T>>::get(&context_id);
            let updated_proposals_by_campaign_count = proposals_by_campaign_count.checked_add(1).ok_or( Error::<T>::OverflowError )?;
            let proposals_by_owner_count = <ProposalsByOwnerCount::<T>>::get(&sender);
            let updated_proposals_by_owner_count = proposals_by_owner_count.checked_add(1).ok_or( Error::<T>::OverflowError )?;

            // proposal

            let nonce = Self::get_and_increment_nonce();
            let (proposal_id, _) = <T::Randomness>::random(&nonce);
            let new_proposal = Proposal {
                proposal_id: proposal_id.clone(),
                context_id: context_id.clone(),
                proposal_type,
                voting_type,
                start,
                expiry,
            };

            // metadata

            let metadata = ProposalMetadata {
                title: title,
                cid: cid,
                amount: 0
            };

            //
            //
            //

            // insert proposals
            <Proposals::<T>>::insert(proposal_id.clone(), new_proposal.clone());
            <Metadata::<T>>::insert(proposal_id.clone(), metadata.clone());
            <Owners::<T>>::insert(proposal_id.clone(), sender.clone());
            <ProposalStates::<T>>::insert(proposal_id.clone(), proposal_state);
            // update max per block
            <ProposalsByBlock::<T>>::mutate(expiry, |proposals| proposals.push(proposal_id.clone()));
            // update proposal map
            <ProposalsArray::<T>>::insert(&proposals_count, proposal_id.clone());
            <ProposalsCount::<T>>::put(updated_proposals_count);
            <ProposalsIndex::<T>>::insert(proposal_id.clone(), proposals_count);
            // update campaign map
            <ProposalsByContextArray::<T>>::insert((context_id.clone(), proposals_by_campaign_count.clone()), proposal_id.clone());
            <ProposalsByContextCount::<T>>::insert(context_id.clone(), updated_proposals_by_campaign_count);
            <ProposalsByContextIndex::<T>>::insert((context_id.clone(), proposal_id.clone()), proposals_by_campaign_count);
            <ProposalsByContext::<T>>::mutate( context_id.clone(), |proposals| proposals.push(proposal_id.clone()) );
            // update owner map
            <ProposalsByOwnerArray::<T>>::insert((sender.clone(), proposals_by_owner_count.clone()), proposal_id.clone());
            <ProposalsByOwnerCount::<T>>::insert(sender.clone(), updated_proposals_by_owner_count);
            <ProposalsByOwnerIndex::<T>>::insert((sender.clone(), proposal_id.clone()), proposals_by_owner_count);
            // init votes
            <ProposalSimpleVotes::<T>>::insert(context_id, (0,0));

            // deposit event
            Self::deposit_event(
            	Event::<T>::Proposal{sender_id: sender, proposal_id}
        	);
            Ok(())
        }


        // TODO: membership proposal for a DAO

        #[pallet::weight(5_000_000)]
        pub fn membership_proposal(
            origin: OriginFor<T>,
            context: T::Hash,
            _member: T::Hash,
            _action: u8,
            _start: T::BlockNumber,
            _expiry: T::BlockNumber
        ) -> DispatchResult {
            let sender = ensure_signed(origin)?;
            // ensure active
            // ensure member
            // match action
            // action
            // deposit event
            Self::deposit_event(Event::<T>::Proposal{sender_id: sender, proposal_id: context});
            Ok(())
        }


        //  create a withdrawal proposal
        //  origin must be controller of the campaign == controller of the dao
        //  beneficiary must be the treasury of the dao

        #[pallet::weight(5_000_000)]
        pub fn withdraw_proposal(
            origin: OriginFor<T>,
            context_id: T::Hash,
            title: Vec<u8>,
            cid: Vec<u8>,
            amount: Balance,
            start: T::BlockNumber,
            expiry: T::BlockNumber,
        ) -> DispatchResult {

            let sender = ensure_signed(origin)?;

            //  A C C E S S

            // ensure!( T::Flow::campaign_by_id(&context_id), Error::<T>::CampaignUnknown );
            let state = T::Flow::campaign_state(&context_id);
            ensure!( state == FlowState::Success, Error::<T>::CampaignFailed );
            // todo: should this checks be performed?
            // let owner = T::Flow::campaign_owner(&context_id);
            // ensure!( sender == owner, Error::<T>::AuthorizationError );

            //  B O U N D S

            // todo: should this checks be performed or not?
            // let current_block = <frame_system::Pallet<T>>::block_number();
            // ensure!(start > current_block, Error::<T>::OutOfBounds );
            // ensure!(expiry > start, Error::<T>::OutOfBounds );
            // ensure!(expiry <= current_block + Self::proposal_time_limit(), Error::<T>::OutOfBounds );

            //  B A L A N C E

            let used_balance = <CampaignBalanceUsed<T>>::get(&context_id);
            let total_balance = T::Flow::campaign_balance(&context_id);
            let remaining_balance = total_balance.checked_sub(used_balance).ok_or(Error::<T>::BalanceInsufficient)? ;
            ensure!(remaining_balance >= amount, Error::<T>::BalanceInsufficient );

            //  T R A F F I C

            let proposals = <ProposalsByBlock<T>>::get(expiry);
            ensure!((proposals.len() as u32) < T::MaxProposalsPerBlock::get(), Error::<T>::TooManyProposals);
            ensure!(!<Proposals<T>>::contains_key(&context_id), Error::<T>::ProposalExists);

            //  C O U N T S

            let proposals_count = <ProposalsCount<T>>::get();
            let updated_proposals_count = proposals_count.checked_add(1).ok_or(Error::<T>::OverflowError)?;
            let proposals_by_campaign_count = <ProposalsByContextCount<T>>::get(&context_id);
            let updated_proposals_by_campaign_count = proposals_by_campaign_count.checked_add(1).ok_or(Error::<T>::OverflowError)?;
            let proposals_by_owner_count = <ProposalsByOwnerCount<T>>::get(&sender);
            let updated_proposals_by_owner_count = proposals_by_owner_count.checked_add(1).ok_or(Error::<T>::OverflowError)?;

            //  C O N F I G

            let proposal_type = ProposalType::Withdrawal; // treasury
            let voting_type = VotingType::Simple; // votes
            let nonce = Self::get_and_increment_nonce();

            let (proposal_id, _) = <T as Config>::Randomness::random(&nonce);

            let proposal = Proposal {
                proposal_id: proposal_id.clone(),
                context_id: context_id.clone(),
                proposal_type,
                voting_type,
                start,
                expiry
            };

            let metadata = ProposalMetadata {
                title,
                cid,
                amount,
            };

            //  W R I T E

            Proposals::<T>::insert(&proposal_id, proposal.clone());
            <Metadata<T>>::insert(&proposal_id, metadata.clone());
            <Owners<T>>::insert(&proposal_id, sender.clone());
            <ProposalStates<T>>::insert(proposal_id.clone(), ProposalState::Active);

            <ProposalsByBlock<T>>::mutate(expiry, |proposals| proposals.push(proposal_id.clone()));
            <ProposalsArray<T>>::insert(&proposals_count, proposal_id.clone());
            <ProposalsCount<T>>::put(updated_proposals_count);
            <ProposalsIndex<T>>::insert(proposal_id.clone(), proposals_count);
            <ProposalsByContextArray<T>>::insert((context_id.clone(), proposals_by_campaign_count.clone()), proposal_id.clone());
            <ProposalsByContextCount<T>>::insert(context_id.clone(), updated_proposals_by_campaign_count);
            <ProposalsByContextIndex<T>>::insert((context_id.clone(), proposal_id.clone()), proposals_by_campaign_count);
            <ProposalsByOwnerArray<T>>::insert((sender.clone(), proposals_by_owner_count.clone()), proposal_id.clone());
            <ProposalsByOwnerCount<T>>::insert(sender.clone(), updated_proposals_by_owner_count);
            <ProposalsByOwnerIndex<T>>::insert((sender.clone(), proposal_id.clone()), proposals_by_owner_count);
            <ProposalsByContext<T>>::mutate( context_id.clone(), |proposals| proposals.push(proposal_id.clone()) );

            //  E V E N T

            Self::deposit_event(
                Event::<T>::ProposalCreated {
                	sender_id: sender,
                	context_id,
                	proposal_id,
                	amount,
                	expiry
                }
            );
            Ok(())

        }

        // TODO:
        // voting vs staking, e.g.
        // 1. token weighted and democratic voting require yes/no
        // 2. conviction voting requires ongoing staking
        // 3. quadratic voting

        #[pallet::weight(5_000_000)]
        pub fn simple_vote(
            origin: OriginFor<T>,
            proposal_id: T::Hash,
            vote: bool
        ) -> DispatchResult {

            let sender = ensure_signed(origin)?;

            // Ensure the proposal exists
            ensure!(<Proposals<T>>::contains_key(&proposal_id), Error::<T>::ProposalUnknown);

            // Ensure the proposal has not ended
            let proposal_state = <ProposalStates<T>>::get(&proposal_id);
            ensure!(proposal_state == ProposalState::Active, Error::<T>::ProposalEnded);

            // Ensure the contributor did not vote before
            ensure!(!<VotedBefore<T>>::get((sender.clone(), proposal_id.clone())), Error::<T>::AlreadyVoted);

            // Get the proposal
            let proposal = <Proposals<T>>::get(&proposal_id);
            // Ensure the proposal is not expired
            ensure!(<frame_system::Pallet<T>>::block_number() < proposal.expiry, Error::<T>::ProposalExpired);

            // TODO:
            // ensure origin is one of:
            // a. member when the proposal is general
            // b. contributor when the proposal is a withdrawal request
            // let sender_balance = <campaign::Module<T>>::campaign_contribution(proposal.campaign_id, sender.clone());
            // ensure!( sender_balance > T::Balance::from(0), "You are not a contributor of this Campaign");

            match &proposal.proposal_type {
                // DAO Democratic Proposal
                // simply one member one vote yes / no,
                // TODO: ratio definable, now > 50% majority wins
                ProposalType::General => {

                    let (mut yes, mut no) = <ProposalSimpleVotes<T>>::get(&proposal_id);

                    match vote {
                        true => {
                            yes = yes.checked_add(1).ok_or(Error::<T>::OverflowError)?;
                            let proposal_approvers = <ProposalApprovers<T>>::get(&proposal_id);
                            let updated_proposal_approvers = proposal_approvers.checked_add(1).ok_or(Error::<T>::OverflowError)?;
                            <ProposalApprovers<T>>::insert(
                                proposal_id.clone(),
                                updated_proposal_approvers.clone()
                            );
                        },
                        false => {
                            no = no.checked_add(1).ok_or(Error::<T>::OverflowError)?;
                            let proposal_deniers = <ProposalDeniers<T>>::get(&proposal_id);
                            let updated_proposal_deniers = proposal_deniers.checked_add(1).ok_or(Error::<T>::OverflowError)?;
                            <ProposalDeniers<T>>::insert(
                                proposal_id.clone(),
                                updated_proposal_deniers.clone()
                            );
                        }
                    }

                    <ProposalSimpleVotes<T>>::insert(
                        proposal_id.clone(),
                        (yes,no)
                    );

                },
                // 50% majority over total number of campaign contributors
                ProposalType::Withdrawal => {

                    let (mut yes, mut no) = <ProposalSimpleVotes<T>>::get(&proposal_id);

                    match vote {
                        true => {
                            yes = yes.checked_add(1).ok_or(Error::<T>::OverflowError)?;

                            let current_approvers = <ProposalApprovers<T>>::get(&proposal_id);
                            let updated_approvers = current_approvers.checked_add(1).ok_or(Error::<T>::OverflowError)?;
                            <ProposalApprovers<T>>::insert(proposal_id.clone(), updated_approvers.clone());

                            // TODO: make this variable
                            let contributors = T::Flow::campaign_contributors_count(&proposal.context_id);
                            let threshold = contributors.checked_div(2).ok_or(Error::<T>::DivisionError)?;
                            if updated_approvers > threshold {
                            	// todo: should this be called on finalize?
                                Self::unlock_balance(proposal_id, updated_approvers)?;
                            }
                            // remove
                            let proposal_approvers = <ProposalApprovers<T>>::get(&proposal_id);
                            let updated_proposal_approvers = proposal_approvers.checked_add(1).ok_or(Error::<T>::OverflowError)?;
                            <ProposalApprovers<T>>::insert(
                                proposal_id.clone(),
                                updated_proposal_approvers.clone()
                            );

                        },
                        false => {
                            no = no.checked_add(1).ok_or(Error::<T>::OverflowError)?;
                            // remove
                            let proposal_deniers = <ProposalDeniers<T>>::get(&proposal_id);
                            let updated_proposal_deniers = proposal_deniers.checked_add(1).ok_or(Error::<T>::OverflowError)?;
                            <ProposalDeniers<T>>::insert(
                                proposal_id.clone(),
                                updated_proposal_deniers.clone()
                            );
                        }
                    }

                    ProposalSimpleVotes::<T>::insert(
                        proposal_id.clone(),
                        (yes,no)
                    );


                },

                // Campaign Token Weighted Proposal
                // total token balance yes vs no
                // TODO: ratio definable, now > 50% majority wins
                // ProposalType:: => {
                // },

                // Membership Voting
                // simply one token one vote yes / no,
                // TODO: ratio definable, now simple majority wins
                ProposalType::Member => {
                    // approve
                    // deny
                    // kick
                    // ban
                },
                // default
                _ => {
                },
            }

            VotedBefore::<T>::insert( ( &sender, proposal_id.clone() ), true );
            ProposalsByVoterCount::<T>::mutate( &sender, |v| *v +=1 );
            ProposalVotesByVoters::<T>::mutate(&proposal_id, |votings| votings.push(( sender.clone(), vote.clone() )) );
            ProposalsByVoter::<T>::mutate( &sender, |votings| votings.push((proposal_id.clone(), vote)));

            let mut voters = ProposalVoters::<T>::get(&proposal_id);
            match voters.binary_search(&sender) {
                Ok(_) => {}, // should never happen
                Err(index) => {
                    voters.insert(index, sender.clone());
                    ProposalVoters::<T>::insert( &proposal_id, voters );
                }
            }

            // dispatch vote event
            Self::deposit_event(
                Event::<T>::ProposalVoted {
                    sender_id: sender,
                    proposal_id:proposal_id.clone(),
                    vote
                }
            );
            Ok(())

        }

    }

    #[pallet::hooks]
    impl<T: Config> Hooks<BlockNumberFor<T>> for Pallet<T> {
        fn on_finalize(_n: T::BlockNumber) {

            // i'm still jenny from the block
            let block_number = _n.clone();
            let proposal_hashes = <ProposalsByBlock<T>>::get(block_number);

            for proposal_id in &proposal_hashes {

                let mut proposal_state = <ProposalStates<T>>::get(&proposal_id);
                if proposal_state != ProposalState::Active { continue };

                let proposal = <Proposals<T>>::get(&proposal_id);

                // TODO:
                // a. result( accepted, rejected )
                // b. result( accepted, rejected, total_allowed )
                // c. result( required_majority, staked_accept, staked_reject, slash_amount )
                // d. threshold reached
                // e. conviction

                match &proposal.proposal_type {
                    ProposalType::General => {
                        // simple vote
                        let (yes,no) = <ProposalSimpleVotes<T>>::get(&proposal_id);
                        if yes > no { proposal_state = ProposalState::Accepted; }
                        if yes < no { proposal_state = ProposalState::Rejected; }
                        if yes == 0 && no == 0 { proposal_state = ProposalState::Expired; }
                        // todo: if same amount of yes/no votes?
                    },
                    ProposalType::Withdrawal => {
                        // treasury
                        // 50% majority of eligible voters
                        let (yes,_no) = <ProposalSimpleVotes<T>>::get(&proposal_id);
                        let context = proposal.context_id.clone();
                        let contributors = T::Flow::campaign_contributors_count(&context);
                        // TODO: dynamic threshold
                        let threshold = contributors.checked_div(2).ok_or(Error::<T>::DivisionError);
                        match threshold {
                            Ok(t) => {
                                if yes > t {
                                    proposal_state = ProposalState::Accepted;
                                    Self::unlock_balance(proposal.proposal_id, yes);
                                } else {
                                    proposal_state = ProposalState::Rejected;
                                }
                            },
                            Err(_err) => {
                            	// todo: logic on error event
                            }
                        }
                    },
                    ProposalType::Member => {
                        // membership
                        //
                    },
                    _ => {
                        // no result - fail
                        proposal_state = ProposalState::Expired;
                    }
                }

                <ProposalStates<T>>::insert(&proposal_id, proposal_state.clone());

                match proposal_state {
                    ProposalState::Accepted => {
                        Self::deposit_event(
                            Event::<T>::ProposalApproved {proposal_id: proposal_id.clone()}
                        );
                    },
                    ProposalState::Rejected => {
                        Self::deposit_event(
                            Event::<T>::ProposalRejected {proposal_id: proposal_id.clone()}
                        );
                    },
                    ProposalState::Expired => {
                        Self::deposit_event(
                            Event::<T>::ProposalExpired {proposal_id: proposal_id.clone()}
                        );
                    },
                    _ => {}
                }

            }

        }
    }

    impl<T: Config> Pallet<T> {

        // TODO: DISCUSSION
        // withdrawal proposals are accepted
        // when the number of approvals is higher
        // than the number of rejections
        // accepted / denied >= 1
        fn unlock_balance(
            proposal_id: T::Hash,
            _supported_count: u64
        ) -> DispatchResult {

            // Get proposal and metadata
            let proposal = <Proposals<T>>::get(proposal_id.clone());
            let metadata = <Metadata<T>>::get(proposal_id.clone());

            // Ensure sufficient balance
            let proposal_balance = metadata.amount;
            let total_balance = T::Flow::campaign_balance(&proposal.context_id);

            // let used_balance = Self::balance_used(proposal.context_id);
            let used_balance = <CampaignBalanceUsed<T>>::get(proposal.context_id);
            let available_balance = total_balance - used_balance.clone();
            ensure!(available_balance >= proposal_balance, Error::<T>::BalanceInsufficient);

            // Get the owner of the campaign
            let _owner = <Owners<T>>::get(&proposal_id).ok_or("No owner for proposal")?;

            // get treasury account for related body and unlock balance
            let body = T::Flow::campaign_org(&proposal.context_id);
            let treasury_account = T::Control::body_treasury(&body);
            T::Currency::unreserve(
                T::FundingCurrencyId::get(),
                &treasury_account,
                proposal_balance.clone()
            );

            // Change the used amount
            let new_used_balance = used_balance + proposal_balance;
            <CampaignBalanceUsed<T>>::insert(proposal.context_id, new_used_balance);

            // proposal completed
            let proposal_state = ProposalState::Finalized;
            <ProposalStates<T>>::insert(proposal_id.clone(), proposal_state);

            <Proposals<T>>::insert(proposal_id.clone(), proposal.clone());

            Self::deposit_event(
                Event::<T>::WithdrawalGranted {proposal_id, context_id: proposal.context_id, body_id: body}
            );
            Ok(())

        }

        fn get_and_increment_nonce() -> Vec<u8> {
            let nonce = Nonce::<T>::get();
            Nonce::<T>::put(nonce.wrapping_add(1));
            nonce.encode()
        }
    }
}

// todo: Check storage fields and remove generices from those, who don't use Config trait
