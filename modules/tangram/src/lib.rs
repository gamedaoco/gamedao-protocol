#![allow(warnings)]
#![allow(dead_code)]
#![allow(unused_imports)]
#![allow(unused_variables)]

#![cfg_attr(not(feature = "std"), no_std)]

use codec::{Decode, Encode};
use frame_support::{
	decl_error, decl_event, decl_module, decl_storage,
	ensure, dispatch,
	dispatch::{
		result::Result,
		DispatchError,
		DispatchResult
	},
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
use frame_system::{ self as system, ensure_root, ensure_signed };
use sp_runtime::traits::{Hash, Member};
use sp_core::RuntimeDebug;
use sp_std::vec::Vec;
use primitives::{ Balance };

// use control;
// use governance;
// use crowdfunding;

// nft interface

pub mod nft;
pub use crate::nft::NFTItems;

// #[cfg(test)]
// mod mock;

// #[cfg(test)]
// mod tests;

const MODULE_ID: LockIdentifier = *b"tangram ";

//

pub type RealmIndex = u64;
pub type ClassIndex = u64;
pub type ItemIndex = u64;
pub type TotalIndex = u128;
pub type BurnedIndex = u128;
// pub type ItemId = T::Hash;

pub type BalanceOf<T> = <<T as Config>::Currency as Currency<<T as frame_system::Config>::AccountId>>::Balance;
pub type HashOf<T> = <T as frame_system::Config>::Hash;
pub type MomentOf<T> = <<T as Config>::Time as Time>::Moment;
pub type TangramItemOf<T> = TangramItem< HashOf<T>, MomentOf<T> >;
pub type TangramId<T> = HashOf<T>;
pub type Tangram<T> = ( TangramId<T>, TangramItemOf<T>);

/// TangramRealm
/// RealmId, Controller Org, Index
#[derive(Encode, Decode, Default, PartialEq, Eq)]
#[cfg_attr(feature = "std", derive(Debug))]
pub struct TangramRealm<Hash> {
	/// unique hash to indentify the realm
	id: Hash,
	/// hash identifying the authority
	org: Hash,
	/// realm index
	index: u64,
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
pub struct TangramClass<Hash, /*Balance*/> {
	id: Hash,	// unique class hash
	realm: RealmIndex,// auth realm
	index: u64,	// class index
	max: u64,	// max number of items in class
	// mint: Balance,	// mint cost
	// burn: Balance,	// burn cost
	// strategy: u16,	// cid to strategy
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
pub struct TangramItem<Hash, Moment> {
	dna: Hash,
	dob: Moment,
}

/// Tangram Mutable
#[derive(Clone, Eq, PartialEq, Ord, PartialOrd, Encode, Decode, Default, RuntimeDebug)]
pub struct TangramMetadata<AccountId> {
	name: Vec<u8>,
	owner: AccountId,
	cid: Vec<u8>,
	realm: RealmIndex,
	class: ClassIndex
}

//
//
//

pub trait Config: frame_system::Config + balances::Config {

	type Time: frame_support::traits::Time;
	type Randomness: frame_support::traits::Randomness<Self::Hash>;
	type Currency: frame_support::traits::LockableCurrency<Self::AccountId>;
	type Event: From<Event<Self>> + Into<<Self as frame_system::Config>::Event>;

	type CreateRealmDeposit: Get<BalanceOf<Self>>;
	type CreateClassDeposit: Get<BalanceOf<Self>>;
	type CreateTokenDeposit: Get<BalanceOf<Self>>;

	type MaxRealmsPerOrg: Get<u64>;
	type MaxClassesPerRealm: Get<u64>;
	type MaxTokenPerClass: Get<u128>;
	type MaxTotalToken: Get<u128>;

	type NextRealmIndex;
	type NextClassIndex;
	type NextItemIndex;
	type TotalIndex;
	type BurnedIndex;

}

decl_storage! {
	trait Store for Module<T: Config> as Tangram {

		// realm

		/// Current Realm Index
		pub NextRealmIndex get(fn next_realm_index): RealmIndex = 0;
		/// Get a Realm by its hash
		pub Realm get(fn realm_by_hash): map hasher(blake2_128_concat) T::Hash => TangramRealm<T::Hash>;
		/// Get a Realm by its index
		pub RealmByIndex get(fn realm_by_index): map hasher(blake2_128_concat) RealmIndex => T::Hash;
		// OwnerForRealm = organisation hash
		pub OwnerRealm get(fn owner_for_realm): map hasher(blake2_128_concat) RealmIndex => T::Hash;
		// RealmsForOwner
		pub RealmsForOwner get(fn realms_for_owner): map hasher(blake2_128_concat) T::Hash => Vec<T::Hash>;
		pub RealmsForOwnerCount get(fn realms_for_owner): map hasher(blake2_128_concat) T::Hash => u64;
		// ClassesForRealm

		// class

		/// Current Class Index, individual per Realm
		pub NextClassIndex get(fn next_class_index): map hasher(blake2_128_concat) RealmIndex => ClassIndex = 0;
		/// Tangram Class
		pub ItemClass get(fn tangram_class): map hasher(blake2_128_concat) T::Hash => TangramClass<T::Hash, /*T::Balance*/>;
		// ItemClassByIndex get(fn tangram_class_by_index): map hasher(blake2_128_concat) (RealmId,ClassIndex) => T::Hash;
		// OwnerForClass
		// ClassesForOwner
		// RealmForClass
		// ItemsForClass
		// MaxItemsForClass(fn)

		// item

		/// Current Item Index, individual per Class in its respective Realm
		pub NextItemIndex get(fn next_item_index): map hasher(blake2_128_concat) (RealmIndex, ClassIndex) => ItemIndex;
		/// Max Items for respective Class
		pub MaxItems get(fn max_items): map hasher(blake2_128_concat) (RealmIndex, ClassIndex) => u64;

		/// Tangram Item
		pub Item get(fn item): map hasher(blake2_128_concat) T::Hash => TangramItemOf<T>;
		/// All Items associated with an account
		pub ItemsForAccount get(fn items_for_account): map hasher(blake2_128_concat) T::AccountId => Vec<Tangram<T>>;

		/// Owner of an Item
		pub AccountForItem get(fn account_for_item): map hasher(blake2_128_concat) T::Hash => T::AccountId;

		/// Retrieve an Item Hash by its indexes
		pub ItemByIndex get(fn item_by_index): map hasher(blake2_128_concat) (RealmIndex,ClassIndex,ItemIndex) => T::Hash;
		/// Metadata for an Item
		pub ItemMetadata get(fn item_metadata): map hasher(identity) T::Hash => TangramMetadata<T::Hash>;

		pub TotalForAccount get(fn total_for_account): map hasher(blake2_128_concat) T::AccountId => u64;

		// global

		/// Total Token in system
		pub Total get(fn total_items): TotalIndex;
		/// Burned Token in system
		pub Burned get(fn burend_items): BurnedIndex;

	}
}

decl_module! {
	pub struct Module<T: Config> for enum Call where origin: T::Origin {

		type Error = Error<T>;
		fn deposit_event() = default;

		// const CreateRealmDeposit: Currency<T> = T::CreateRealmDeposit::get();
		// const CreateClassDeposit: Currency<T> = T::CreateClassDeposit::get();
		// const CreateTokenDeposit: Currency<T> = T::CreateTokenDeposit::get();

		const MaxRealmsPerOrg: u64 = T::MaxRealmsPerOrg::get();
		const MaxClassesPerRealm: u64 = T::MaxClassesPerRealm::get();
		const MaxTokenPerClass: u128 = T::MaxTokenPerClass::get();
		const MaxTotalToken: u128 = T::MaxTotalToken::get();

		#[weight = 50_000]
		pub fn bootstrap(
			origin,
			org: T::Hash
		) {

			// ensure caller is controller of org
			ensure!( <control::Module<T>>::body_controller(origin.clone()) = origin, Error::<T>::Unauthorized );
			// ensure does not have a realm assigned yet
			ensure!( )

			let realm_creation_fee = T::CreateRealmDeposit::get();
			let class_creation_fee = T::CreateClassDeposit::get();
			let item_creation_fee = T::CreateItemDeposit::get();
			let creation_fee = realm_creation_fee + class_creation_fee + item_creation_fee;

			// ensure creator can pay fees
			ensure!( <balances::Module<T>>::free_balance(origin.clone()) >= creation_fee, Error::<T>::BalanceTooLow );

			// take next realm
			let realm = NextRealmIndex::get();
			Self::create_realm( origin.clone(), org );
			// take next class in realm (should be 0 on init anyway)
			let class = NextClassIndex::get(realm);
			Self::create_class( origin.clone(), realm, ("my_name_is").as_bytes().to_vec(), 1337 );
			// the creator nft
			// TODO: take creator nft from gamedao realm (0,0)
			Self::create_item( origin, 0, 0, ("kreataww").as_bytes().to_vec(), ("0xb00b5").as_bytes().to_vec() );
			// mint the member nft
			// TODO: get the actual member hashes
			Self::create_item( origin, realm, class, ("my_nft===dollah").as_bytes().to_vec(), ("0xb00b5").as_bytes().to_vec() );

		}

		#[weight = 50_000]
		pub fn create_realm(
			origin,
			org: T::Hash
		) -> DispatchResult {
			// TODO: ensure origin == controller
			// TODO: ensure org exists
			// TODO: ensure org does not have a realm yet
			let index = NextRealmIndex::get();
			let hash = <T as Config>::Randomness::random(b"rndrealm");
			let realm = TangramRealm { id: hash.clone(), org: org, index: index.clone() };
			Realm::<T>::insert( hash.clone(), realm );
			RealmByIndex::<T>::insert( index.clone(), hash );
			// unsafe add
			NextRealmIndex::mutate(|i| *i += 1);
			Self::deposit_event( RawEvent::RealmCreated( index.clone() ) );
			Ok(())
		}

		#[weight = 50_000]
		pub fn create_class(
			origin,
			realm: RealmIndex,	// associated realm
			name: Vec<u8>,		// class name
			max: u64,			// max items
			// mint: T::Balance,	// mint cost
			// burn: T::Balance,	// burn cost
			// strategy: u16		// cid for strategy
		) -> DispatchResult {
			// TODO: ensure origin == realm controller

			// valid realm
			let realm_index = NextRealmIndex::get();
			ensure!( realm < realm_index, Error::<T>::UnknownRealm );

			// max items
			ensure!( max > 0, Error::<T>::MaxItemsTooSmall );
			let index = Self::next_class_index(&realm);
			MaxItems::insert((&realm,&index),max.clone());

			// class
			let hash = <T as Config>::Randomness::random(b"rndclass ");
			let new_class = TangramClass {
				id: hash.clone(),
				realm: realm.clone(),
				index: index.clone(),
				max: max.clone(),
				// mint: 1,
				// burn: 1,
				// strategy: 1
			};
			ItemClass::<T>::insert( hash.clone(), new_class );
			// ClassByIndex::<T>::insert( index.clone(), hash );

			NextItemIndex::insert((&realm,&index),0);

			// ++ class index
			let mut next_index = index.checked_add(1).ok_or(Error::<T>::Overflow)?;
			NextClassIndex::insert(&realm,next_index.clone());

			Self::deposit_event(RawEvent::ClassCreated(realm, index, max));
			Ok(())
		}

		#[weight = 50_000]
		pub fn create_item(
			origin,
			realm: RealmIndex, 	// associated realm
			class: ClassIndex,	// associated class
			name: Vec<u8>,		// token name
			cid: Vec<u8>		// ipfs cid
		) -> DispatchResult {

			let who = ensure_signed(origin)?;
			// TODO: ensure origin == realm controller
			// T::ItemAdmin::ensure_origin(origin)?;

			ensure!( realm < NextRealmIndex::get(), Error::<T>::UnknownRealm );
			ensure!( class < Self::next_class_index(&realm), Error::<T>::UnknownClass );
			ensure!( Self::next_item_index((&realm,&class)) < Self::max_items((&realm,&class) ), Error::<T>::MaxItemsReached );

			// 1. lock
			// T::Currency::set_lock(
			// 	MODULE_ID,
			// 	&who,
			// 	T::CreateTokenDeposit,
			// 	WithdrawReasons::Fee | WithdrawReasons::Reserve
			// );

			// 2. generate based on rarity levels
			// epic mega rare common
			// 0000+0000+0000+00000000 = 24 bytes

			// let epic = "0000";
			// let mega = "0000";
			// let rare = "0000";
			// let high = "0000";
			// let low  = "0000";
			// let mut stream = [
			// 		epic,
			// 		mega,
			// 		rare,
			// 		high,
			// 		low,
			// 	].concat();
			//let bytes: [u8] = stream.iter().map(|c| *c as u8).collect::<Vec<_>>();
			// let bytes: &str = str::from_utf8(&stream).unwrap();

			let hash = <T as Config>::Randomness::random( &MODULE_ID );

			// 3. mint
			match Self::mint(
				&who,	// caller == owner
				TangramItem {
					dob: T::Time::now(),
					dna: hash
				}
			) {
				Ok(id) => {
					// 4. store metadata
					// ItemMetadata::<T>::insert(
					// 	id,
					// 	TangramMetadata {
					//		id: id.clone(),		// hash
					// 		name: name.clone(), // name
					// 		cid: cid.clone(),	// content
					// 		owner: who,			// owner
					// 		realm: realm,		// ref realm
					// 		class: class,		// ref class
					// 	}
					// );

					let itemIndex = Self::next_item_index((&realm,&class));
					let nextItemIndex = itemIndex.checked_add(1).ok_or(Error::<T>::Overflow)?;
					NextItemIndex::insert((&realm,&class), nextItemIndex);
					Self::deposit_event( RawEvent::Minted( id, hash, who ) );
				},
				Err(err) => Err(err)?
			}
			Ok(())
		}

	}
}

impl<T: Config> Module<T> {

	// type ItemId;

	// / return the total number of items per class
	// fn total( class_id: u64 ) -> u128 {
	//     Self::total()
	// }

	// /// get the total number of items burned per class
	// fn burned( class_id: u64 ) -> u128 {
	//     Self::burned()
	// }

	// fn total_for_account( class_id: u64, account: &T::AccountId) -> u64 {
	//     Self::total_for_account(account)
	// }

	// /// retrieve all items for an account in a class
	// fn items_for_account( class_id: u64, account: &T::AccountId) -> Vec<Item<T>> {
	//     Self::items_for_account(account)
	// }

	// /// retrieve the owner of an item ( in a class, otherwise search to heavy )
	// fn owner_of( class_id: u64, item_id: &ItemId<T>) -> T::AccountId {
	//     Self::account_for_item(item_id)
	// }

	fn mint(
	    owner_account: &T::AccountId,
	    item_info: TangramItemOf<T>,
	) -> dispatch::result::Result< T::Hash, dispatch::DispatchError> {

		let item_id = T::Hashing::hash_of(&item_info);

		//     ensure!(
		//         !AccountForItem::<T, I>::contains_key(&item_id),
		//         Error::<T, I>::ItemExists
		//     );

		//     ensure!(
		//         Self::total_for_account(owner_account) < T::UserItemLimit::get(),
		//         Error::<T, I>::TooManyItemsForAccount
		//     );

		//     ensure!(
		//         Self::total() < T::ItemLimit::get(),
		//         Error::<T, I>::TooManyItems
		//     );

		let new_item = (item_id, item_info);

		AccountForItem::<T>::insert( item_id, &owner_account );
		Total::mutate(|i| *i += 1);
		TotalForAccount::<T>::mutate( owner_account, |total| *total += 1 );
		ItemsForAccount::<T>::mutate( owner_account, |items| {
			match items.binary_search(&new_item) {
				Ok(_pos) => {} // should never happen
				Err(pos) => items.insert(pos, new_item),
			}
		});

		// TODO:
		// item by index
		// TODO:
		// items for account
		//

		Ok(item_id)

	}

	// fn burn(item_id: &Item<T>) -> dispatch::DispatchResult {
	//     let owner = Self::owner_of(item_id);
	//     ensure!(
	//         owner != T::AccountId::default(),
	//         Error::<T, I>::NonexistentItem
	//     );

	//     let burn_item = (*item_id, <T as Config<T>>::ItemInfo::default());

	//     Total::<T>::mutate(|total| *total -= 1);
	//     Burned::<T>::mutate(|total| *total += 1);
	//     TotalForAccount::<T, T>::mutate(&owner, |total| *total -= 1);
	//     ItemsForAccount::<T, T>::mutate(owner, |items| {
	//         let pos = items
	//             .binary_search(&burn_item)
	//             .expect("We already checked that we have the correct owner; qed");
	//         items.remove(pos);
	//     });
	//     AccountForItem::<T, T>::remove(&item_id);

	//     Ok(())
	// }

	// fn transfer(
	//     dest_account: &T::AccountId,
	//     item_id: &Item<T>,
	// ) -> dispatch::DispatchResult {
	//     let owner = Self::owner_of(&item_id);
	//     ensure!(
	//         owner != T::AccountId::default(),
	//         Error::<T, I>::NonexistentItem
	//     );

	//     ensure!(
	//         Self::total_for_account(dest_account) < T::UserItemLimit::get(),
	//         Error::<T, I>::TooManyItemsForAccount
	//     );

	//     let xfer_item = (*item_id, <T as Config<T>>::ItemInfo::default());

	//     TotalForAccount::<T, T>::mutate(&owner, |total| *total -= 1);
	//     TotalForAccount::<T, T>::mutate(dest_account, |total| *total += 1);
	//     let item = ItemsForAccount::<T, T>::mutate(owner, |items| {
	//         let pos = items
	//             .binary_search(&xfer_item)
	//             .expect("We already checked that we have the correct owner; qed");
	//         items.remove(pos)
	//     });
	//     ItemsForAccount::<T, T>::mutate(dest_account, |items| {
	//         match items.binary_search(&item) {
	//             Ok(_pos) => {} // should never happen
	//             Err(pos) => items.insert(pos, item),
	//         }
	//     });
	//     AccountForItem::<T, T>::insert(&item_id, &dest_account);

	//     Ok(())
	// }

}

decl_event!(
	pub enum Event<T>
	where
		Hash = <T as frame_system::Config>::Hash,
		AccountId = <T as frame_system::Config>::AccountId,
	{
		RealmCreated( u64 ),
		ClassCreated( u64, u64, u64 ),
		Minted( Hash, Hash, AccountId ),
		Burned( Hash ),
		Transferred( Hash, AccountId ),
	}
);

decl_error! {
	pub enum Error for Module<T: Config> {
		/// Unknown Realm
		UnknownRealm,
		/// Unknown Class
		UnknownClass,
		/// Unknown Item
		UnknownItem,
		/// Maximum Items for Class reached
		MaxItemsReached,
		/// Spawning an item failed
		SpawnFailed,
		/// Item Exists
		ItemExists,
		/// Account Limit Exceeded
		TooManyItemsForAccount,
		/// Realm Limit Exceeded
		TooManyItems,
		/// Overflow
		Overflow,
		/// Guru Meditation
		GuruMeditation,
		/// MaxItems too small
		MaxItemsTooSmall,
		/// Not enough funds to complete transaction.
		BalanceTooLow,
		/// Authorization Error
		Unauthorized
	}
}