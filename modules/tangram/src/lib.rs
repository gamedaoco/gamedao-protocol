#![allow(warnings)]
#![allow(dead_code)]
#![allow(unused_imports)]
#![allow(unused_variables)]

#![cfg_attr(not(feature = "std"), no_std)]

use codec::{Decode, Encode};
use frame_support::{
	decl_error, decl_event, decl_module, decl_storage,
	dispatch::DispatchResult,
	traits::{
		Currency,
		Get,
		LockIdentifier,
		LockableCurrency,
		Randomness,
		Time,
		WithdrawReasons
	},
};
use frame_system::ensure_signed;
use sp_core::RuntimeDebug;
use sp_std::vec::Vec;

// nft interface

pub mod nft;
pub use crate::nft::NFTItem;

// #[cfg(test)]
// mod mock;

// #[cfg(test)]
// mod tests;

const MODULE_ID: LockIdentifier = *b"creature";

//

/// TangramRealm
/// RealmId, Controller Org, Index
#[derive(Encode, Decode, Default, PartialEq, Eq)]
#[cfg_attr(feature = "std", derive(Debug))]
pub struct TangramRealm<Hash> {
	id: Hash,
	org: Hash,
	index: u128,
}

/// TangramRealmMetadata
#[derive(Encode, Decode, Default, PartialEq, Eq)]
#[cfg_attr(feature = "std", derive(Debug))]
pub struct TangramRealmMetadata<Hash,BlockNumber> {
	id: Hash,
	name: Vec<u8>,
	cid: Vec<u8>,
	created: BlockNumber,
	mutated: BlockNumber,
}

/// TangramClass
#[derive(Encode, Decode, Default, PartialEq, Eq)]
#[cfg_attr(feature = "std", derive(Debug))]
pub struct TangramClass<Hash> {
	id: Hash,
	realm: Hash,
	org: Hash,
	index: u128,
	cid: Vec<u8>,
}

/// TangramClassMetadata
#[derive(Encode, Decode, Default, PartialEq, Eq)]
#[cfg_attr(feature = "std", derive(Debug))]
pub struct TangramClassMetadata<Hash, BlockNumber> {
	id: Hash,
	name: Vec<u8>,
	cid: Vec<u8>,
	created: BlockNumber,
	mutated: BlockNumber,
}

/// Tangram Immutable + Unique
#[derive(Clone, Eq, PartialEq, Ord, PartialOrd, Encode, Decode, Default, RuntimeDebug)]
pub struct Tangram<Hash, Moment> {
	dob: Moment,
	dna: Hash,
}

/// Tangram Mutable
#[derive(Clone, Eq, PartialEq, Ord, PartialOrd, Encode, Decode, Default, RuntimeDebug)]
pub struct TangramMetadata<AccountId> {
	name: Vec<u8>,
	owner: AccountId,
	cid: Vec<u8>,
}

//
//
//

type BalanceOf<T> =
	<<T as Config>::Currency as Currency<<T as frame_system::Config>::AccountId>>::Balance;

type TangramOf<T> =
	Tangram<<T as frame_system::Config>::Hash, <<T as Config>::Time as Time>::Moment>;

pub trait Config: frame_system::Config {
	type Time: frame_support::traits::Time;
	type Randomness: frame_support::traits::Randomness<Self::Hash>;
	type Currency: frame_support::traits::LockableCurrency<Self::AccountId>;
	type Event: From<Event<Self>> + Into<<Self as frame_system::Config>::Event>;
    type CreateRealmDeposit: Get<BalanceOf<Self>>;
    type CreateClassDeposit: Get<BalanceOf<Self>>;
    type CreateTokenDeposit: Get<BalanceOf<Self>>;
}

// creatures < classes < realms
decl_storage! {
	trait Store for Module<T: Config> as Tangram1 {

		/// The next Realm Id
		NextRealmId: u64 = 0;
		/// Tangram Realm
		ItemRealm get(fn item_realm): map hasher(blake2_128_concat) T::Hash => TangramRealm<T::Hash>;
		// OwnerForRealm
		// RealmsForOwner
		// ClassesForRealm

		NextClassId: u64 = 0;
		/// Tangram Realm
		ItemClass get(fn item_class): map hasher(blake2_128_concat) T::Hash => TangramClass<T::Hash>;
		// OwnerForClass
		// ClassesForOwner
		// RealmForClass
		// ItemsForClass

		NextItemId: u64 = 0;
		/// Tangram Item
		// Item get(fn item): map hasher(blake2_128_concat) T::Hash => Tangram<T::Hash, Moment>;
		ItemById get(fn item_by_id): map hasher(blake2_128_concat) u64 => T::Hash;
		// OwnerForCreature
		// CreaturesForOwner
		ItemMetadata get(fn item_metadata): map hasher(identity) T::Hash => TangramMetadata<T::Hash>;

	}
}

decl_event!(
	pub enum Event<T>
	where
		ItemId = <T as frame_system::Config>::Hash,
		AccountId = <T as frame_system::Config>::AccountId,
	{
		RealmCreated(u64),
		ClassCreated(u64),
		ItemSpawned( ItemId, AccountId ),
	}
);

decl_error! {
	pub enum Error for Module<T: Config> {
		/// Spawning a Creature failed.
		SpawnFailed,
		/// Item Exists
		ItemExists,
		/// Item Unknown
		ItemUnknown,
		/// Guru Meditation
		GuruMeditation,
	}
}

decl_module! {
	pub struct Module<T: Config> for enum Call where origin: T::Origin {

		type Error = Error<T>;
		fn deposit_event() = default;

		#[weight = 50_000]
		fn create_realm( origin, org: T::Hash, name: Vec<u8> ) -> DispatchResult {
			// TODO: ensure org exists
			// TODO: ensure origin == org controller
			let id = NextRealmId::get();
			// TODO: create realm with name
			NextRealmId::mutate(|n| *n += 1);
			Self::deposit_event(RawEvent::RealmCreated(id));
			Ok(())
		}

		#[weight = 50_000]
		fn create_class( origin, id: u64, name: Vec<u8> ) -> DispatchResult {
			// TODO: ensure realm exists ( id < nextrealmid )
			// TODO: ensure origin == realm controller
			// TODO: create class with name
			Self::deposit_event(RawEvent::ClassCreated(id));
			Ok(())
		}

		#[weight = 50_000]
		fn create_token( origin, class: T::Hash, name: Vec<u8> ) -> DispatchResult {
			Ok(())
		}


		// Reserve funds from the sender's account before spawning a collectible.
		//
		// The dispatch origin for this call must be Signed.
		#[weight = 10_000]
		pub fn spawn( origin, name: Vec<u8>, cid: Vec<u8> ) -> DispatchResult {
			let who = ensure_signed(origin)?;
			// T::Currency::set_lock(
			// 	MODULE_ID,
			// 	&who,
			// 	CreateTokenDeposit::get(),
			// 	WithdrawReasons::Fee | WithdrawReasons::Reserve
			// );
			// match T::Item::mint(
			// 	&who,
			// 	Tangram{
			// 		dob: T::Time::now(),
			// 		dna: T::Randomness::random(&MODULE_ID)
			// 	}
			// ) {
			// 	Ok(id) => {
			// 		// ItemMetadata::<T>::insert(id, TangramMetadata{
			// 		// 	name: name.clone(),
			// 		// 	cid: cid.clone(),
			// 		// 	owner: who
			// 		// });
			// 		Self::deposit_event(RawEvent::ItemSpawned(id, who));
			// 	},
			// 	Err(err) => Err(err)?
			// }
		    Ok(())
		}

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
