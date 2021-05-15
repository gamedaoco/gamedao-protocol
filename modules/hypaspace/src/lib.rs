#![allow(warnings)]
#![allow(dead_code)]
#![allow(unused_imports)]
#![allow(unused_variables)]

#![cfg_attr(not(feature = "std"), no_std)]

use codec::{Decode, Encode};
use frame_support::{
    decl_error, decl_event, decl_module, decl_storage, dispatch,
    traits::{Currency, Get, LockIdentifier, LockableCurrency, Randomness, Time, WithdrawReasons},
};
use frame_system::ensure_signed;
use sp_core::RuntimeDebug;
use sp_std::vec::Vec;

use module_item::nft::UniqueItems;

//
//
//

#[cfg(test)]
mod mock;

#[cfg(test)]
mod tests;

//
//
//

const MODULE_ID: LockIdentifier = *b"hypaspce";

//
//
//

/// unique properties
#[derive(Clone, Eq, PartialEq, Ord, PartialOrd, Encode, Decode, Default, RuntimeDebug)]
pub struct HypaspaceInfo<Hash, Moment> {
    dob: Moment,
    dna: Hash,
}

/// properties
#[derive(Clone, Eq, PartialEq, Ord, PartialOrd, Encode, Decode, Default, RuntimeDebug)]
pub struct HypaspaceMetadata {
    name: Vec<u8>,
}

//
//
//

type BalanceOf<T> =
    <<T as Config>::Currency as Currency<<T as frame_system::Config>::AccountId>>::Balance;
type HypaspaceInfoOf<T> =
    HypaspaceInfo<<T as frame_system::Config>::Hash, <<T as Config>::Time as Time>::Moment>;

pub trait Config: frame_system::Config {

    type Spaces: UniqueItems<
        Self::AccountId,
        ItemId = Self::Hash,
        ItemInfo = HypaspaceInfoOf<Self>,
    >;
    type BasePrice: Get<BalanceOf<Self>>;
    type Time: frame_support::traits::Time;
    type Randomness: frame_support::traits::Randomness<Self::Hash>;
    type Currency: frame_support::traits::LockableCurrency<Self::AccountId>;
    type Event: From<Event<Self>> + Into<<Self as frame_system::Config>::Event>;

}

//
//
//

decl_storage! {
    trait Store for Module<T: Config> as Hypaspace {

        MetadataForSpace get(fn metadata_for_space): map hasher(identity) T::Hash => HypaspaceMetadata;

    }
}

//
//
//

decl_event!(
    pub enum Event<T>
    where
        SpaceId = <T as frame_system::Config>::Hash,
        AccountId = <T as frame_system::Config>::AccountId,
    {
        Materialize(SpaceId, AccountId),
    }
);

//
//
//

decl_error! {
	pub enum Error for Module<T: Config> {
		/// Materialization of Space failed.
		MaterializationFailed,
		/// Entity Exists
		SpaceExists,
		/// Entity Unknown
		SpaceUnknown,
		/// Guru Meditation
		GuruMeditation,
	}
}

//
//
//

decl_module! {
    pub struct Module<T: Config> for enum Call where origin: T::Origin {

        type Error = Error<T>;
        fn deposit_event() = default;

        // / Reserve funds from the sender's account before conjuring them a collectible.
        // /
        // / The dispatch origin for this call must be Signed.
        // #[weight = 10_000]
        // pub fn materialize(origin, name: Vec<u8>) -> dispatch::DispatchResult {
        //     let who = ensure_signed(origin)?;
        //     T::Currency::set_lock(MODULE_ID, &who, T::BasePrice::get(), WithdrawReasons::Fee | WithdrawReasons::Reserve);
        //     match T::Spaces::mint(&who, HypaspaceInfo{dob: T::Time::now(), dna: T::Randomness::random(&MODULE_ID)}) {
        //         Ok(id) => {
        //             MetadataForSpace::<T>::insert(id, HypaspaceMetadata{name: name});
        //             Self::deposit_event(RawEvent::Conjured(id, who));
        //         },
        //         Err(err) => Err(err)?
        //     }

        //     // TODO: allow senders to supply extra funds to lock, which will serve as a power boost

        //     Ok(())
        // }

        // TODO: BOOST
        // power up a collectible by locking more funds
        // increases power without altering DNA
        // store as metadata in this pallet

        // TODO: RECOUP
        // remove boost and associated lock

        // TODO: FLIRT
        // post intent to breed, must have power boost

        // TODO: BREED
        // respond to intent to breed, must have power boost
        // DNA and power derived from parents
        // each parent randomly contributes power from boost
        // offspring owner randomly assigned between parent owners

        // TODO: SELL
        // post intent to sell including price

        // TODO: BUY
        // respond to intent to sell
        // transfer funds to seller and transfer collectible ownership

        // TODO: RELEASE
        // burn collectible and unlock funds
    }
}
