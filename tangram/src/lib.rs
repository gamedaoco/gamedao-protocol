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
// Copyright (C) 2010-2022 ZERO Labs.
// SPDX-License-Identifier: Apache-2.0

//! Tangram
//!
//! This pallet aggregates datapoints to reflect user experience and behaviour.
#![cfg_attr(not(feature = "std"), no_std)]

// pub use weights::WeightInfo;
pub use pallet::*;
use codec::HasCompact;

#[cfg(test)]
mod mock;

#[cfg(test)]
mod tests;

pub mod weights;
pub use weights::WeightInfo;

#[cfg(feature = "runtime-benchmarks")]
mod benchmarking;


#[frame_support::pallet]
pub mod pallet {

	use frame_support::pallet_prelude::*;
	use frame_system::pallet_prelude::*;
	use frame_support::sp_runtime::traits::Hash;
	use sp_core::H256;

	
	use frame_support::inherent::Vec;

	use frame_support::{
		dispatch::DispatchResult, 
		pallet_prelude::*,
		traits::{
			Currency,
			Get,
			LockIdentifier,
			// LockableCurrency,
			Randomness,
			Time,
			WithdrawReasons,
		},	
		transactional,	
	};
	use frame_system::pallet_prelude::*;
	// use sp_std::vec::Vec;
	use scale_info::TypeInfo;
	use super::*;

	use sp_runtime::traits::{AtLeast32BitUnsigned, CheckedAdd, One, StaticLookup, Zero};
	
	// use sp_runtime::{
	// 	traits::{CheckedSub, Dispatchable, Hash, Saturating},
	// 	ArithmeticError, DispatchError, Either, RuntimeDebug,
	// };
	// use sp_std::prelude::*;
	


	pub const MAX_STRING_FIELD_LENGTH: usize = 256;
	

	const MODULE_ID: LockIdentifier = *b"tangram ";

	
	pub type RealmIndex = u64;
	pub type ClassIndex = u64;
	pub type ItemIndex = u64;
	pub type TotalIndex = u128;
	pub type BurnedIndex = u128;
	
	

	// pub type BalanceOf<T> = <<T as Config>::StakeCurrency as Currency<<T as frame_system::Config>::AccountId>>::Balance;
	pub type MomentOf<T> = <<T as Config>::Time as Time>::Moment;
	pub type TangramId<T> = <T as frame_system::Config>::Hash;
	pub type TangramItemOf<T> = TangramItem< TangramId<T>, MomentOf<T> >;
	pub type Tangram<T> = ( TangramId<T>, TangramItemOf<T>);
	

	#[pallet::config]
	pub trait Config: frame_system::Config + pallet_rmrk_core::Config{
		type Event: From<Event<Self>> + IsType<<Self as frame_system::Config>::Event> + Into<<Self as frame_system::Config>::Event>;
		type WeightInfo: WeightInfo;
		type Time: Time;
		type Randomness: Randomness<Self::Hash, Self::BlockNumber>;
		// type StakeCurrency: LockableCurrency<Self::AccountId, Moment = Self::BlockNumber>;
	
		
		#[pallet::constant]
		type MaxRealmsPerOrg: Get<u64>;
		
        #[pallet::constant]
		type MaxClassesPerRealm: Get<u64>;
		
		#[pallet::constant]
		type MaxTokenPerClass: Get<u128>;
		
		#[pallet::constant]
		type MaxTotalToken: Get<u128>;

		type NextRealmIndex;
		type NextClassIndex;
		type NextItemIndex;
		type TotalIndex;
		type BurnedIndex;

	}


	// ------------===[Palletes Artifacts]===-------------------


	/// TangramRealm
	/// RealmId, Controller Org, Index
	#[derive(Encode, Decode, Default, PartialEq, Eq, TypeInfo)]
	#[cfg_attr(feature = "std", derive(Debug))]
	pub struct TangramRealm<Hash> {
		/// unique hash to indentify the realm
		id: Hash,
		/// hash identifying the authority
		org: Hash, // ext.
		/// realm index
		index: u64,
	}


	/// TangramRealmMetadata
	#[derive(Encode, Decode, Default, PartialEq, Eq, TypeInfo)]
	#[cfg_attr(feature = "std", derive(Debug))]
	pub struct TangramRealmMetadata<Hash,BlockNumber> {
		realm_id: Hash,
		name: Vec<u8>,
		cid: Vec<u8>, // ipfs Content ID
		created: BlockNumber,
		mutated: BlockNumber,
	}	




	/// TangramClass
	#[derive(Encode, Decode, Default, PartialEq, Eq, TypeInfo)]
	#[cfg_attr(feature = "std", derive(Debug))]
	pub struct TangramClass<Hash, /*Balance*/> {
		id: Hash,	// unique class hash
		realm: RealmIndex,// auth realm
		index: u64,	// class index
		max: u64,	// max number of items in class
		// mint: Balance, // mint cost
		// burn: Balance, // burn cost
		strategy: u64, // cid to strategy //?
	}

	/// TangramClassMetadata
	#[derive(Encode, Decode, Default, PartialEq, Eq, TypeInfo)]
	#[cfg_attr(feature = "std", derive(Debug))]
	pub struct TangramClassMetadata<Hash, BlockNumber> {
		class_id: Hash,
		name: Vec<u8>,
		cid: Vec<u8>, //content id in ipfs
		created: BlockNumber,
		mutated: BlockNumber,
		f: Vec<u8> //?
	}

	/// Tangram Immutable + Unique
	#[derive(Clone, Eq, PartialEq, Ord, PartialOrd, Encode, Decode, Default, RuntimeDebug, TypeInfo)]
	pub struct TangramItem<Hash, MomentOf> {
		dna: Hash,
		dob: MomentOf,
	}

	/// Tangram Mutable
	#[derive(Clone, Eq, PartialEq, Ord, PartialOrd, Encode, Decode, Default, RuntimeDebug, TypeInfo)]
	pub struct TangramItemMetadata {
		realm: RealmIndex,
		class: ClassIndex,
		name: Vec<u8>,
		cid: Vec<u8>,
	}



	#[pallet::pallet]
	#[pallet::generate_store(pub(super) trait Store)]
	pub struct Pallet<T>(_);

	// Storage

	// Realms
	#[pallet::storage]
	#[pallet::getter(fn next_realm_index)]
	/// pub NextRealmIndex get(fn next_realm_index): RealmIndex = 0;
	pub type NextRealmIndex<T: Config> = StorageValue<_, u64, ValueQuery>; // <- todo check

	#[pallet::storage]
	#[pallet::getter(fn realm_by_hash)]
	/// pub Realm get(fn realm_by_hash): map hasher(blake2_128_concat) T::Hash => TangramRealm<T::Hash>;
	pub(super) type Realm<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, TangramRealm<T::Hash>, ValueQuery>;

	#[pallet::storage]
	#[pallet::getter(fn realm_by_index)]
	///pub RealmByIndex get(fn realm_by_index): map hasher(blake2_128_concat) RealmIndex => T::Hash;
	pub(super) type RealmByIndex<T: Config> = StorageMap<_, Blake2_128Concat, RealmIndex, T::Hash, ValueQuery>;

	#[pallet::storage]
	#[pallet::getter(fn owner_for_realm)]
	///pub OwnerRealm get(fn owner_for_realm): map hasher(blake2_128_concat) RealmIndex => T::Hash;
	pub(super) type OwnerRealm<T: Config> = StorageMap<_, Blake2_128Concat, RealmIndex, T::Hash, ValueQuery>;

	#[pallet::storage]
	#[pallet::getter(fn realms_for_owner)]
	/// pub RealmsForOwner get(fn realms_for_owner): map hasher(blake2_128_concat) T::Hash => Vec<T::Hash>;
	pub(super) type RealmsForOwner<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, Vec<T::Hash>, ValueQuery>;


	#[pallet::storage]
	#[pallet::getter(fn realms_for_owner_count)]
	/// pub RealmsForOwnerCount get(fn realms_for_owner_count): map hasher(blake2_128_concat) T::Hash => u64;
	pub(super) type RealmsForOwnerCount<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, u64, ValueQuery>;


	// Class for Realm

	/// Current Class Index, individual per Realm
	/// pub NextClassIndex get(fn next_class_index): map hasher(blake2_128_concat) RealmIndex => ClassIndex = 0;
	#[pallet::storage]
	#[pallet::getter(fn next_class_index)]
	pub type NextClassIndex<T: Config> = StorageMap<_, Blake2_128Concat, RealmIndex, ClassIndex, ValueQuery>; // <- todo check = 0


	/// Tangram Class
	/// pub ItemClass get(fn tangram_class): map hasher(blake2_128_concat) T::Hash => TangramClass<T::Hash, /*T::Balance*/>;
	#[pallet::storage]
	#[pallet::getter(fn tangram_class)]
	pub(super) type ItemClass<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, TangramClass<T::Hash>, ValueQuery>;




	/// Current Item Index, individual per Class in its respective Realm
	// pub NextItemIndex get(fn next_item_index): map hasher(blake2_128_concat) (RealmIndex, ClassIndex) => ItemIndex;
	#[pallet::storage]
	#[pallet::getter(fn next_item_index)]
	pub(super) type NextItemIndex<T: Config> = StorageMap<_, Blake2_128Concat, (RealmIndex, ClassIndex), ItemIndex, ValueQuery>;

	/// Max Items for respective Class
	// pub MaxItems get(fn max_items): map hasher(blake2_128_concat) (RealmIndex, ClassIndex) => u64;
	#[pallet::storage]
	#[pallet::getter(fn max_items)]
	pub(super) type MaxItems<T: Config> = StorageMap<_, Blake2_128Concat, (RealmIndex, ClassIndex), u64, ValueQuery>;

	/// Tangram Item
	// pub Item get(fn item): map hasher(blake2_128_concat) T::Hash => TangramItem<T::Hash, MomentOf<T>>;	
	#[pallet::storage]
	#[pallet::getter(fn item)]
	pub(super) type Item<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, TangramItem<T::Hash, MomentOf<T>>, ValueQuery>;


	/// Metadata for an Item
	/// pub ItemMetadata get(fn item_metadata): map hasher(identity) T::Hash => TangramMetadata;
	#[pallet::storage]
	#[pallet::getter(fn item_metadata)]
	pub(super) type ItemMetadata<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, TangramItemMetadata, ValueQuery>; // Todo identity

	/// All Items associated with an account
	/// pub ItemsForAccount get(fn items_for_account): map hasher(blake2_128_concat) T::AccountId => Vec<T::Hash>;
	#[pallet::storage]
	#[pallet::getter(fn items_for_account)]
	pub(super) type ItemsForAccount<T: Config> = StorageMap<_, Blake2_128Concat, T::AccountId, Vec<T::Hash>, ValueQuery>; 

	/// Owner of an Item
	///	pub AccountForItem get(fn account_for_item): map hasher(blake2_128_concat) T::Hash => T::AccountId;
	#[pallet::storage]
	#[pallet::getter(fn account_for_item)]
	pub(super) type AccountForItem<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, T::AccountId, ValueQuery>; 


	/// Retrieve an Item Hash by its indexes
	/// pub ItemByIndex get(fn item_by_index): map hasher(blake2_128_concat) (RealmIndex,ClassIndex,ItemIndex) => T::Hash;
	#[pallet::storage]
	#[pallet::getter(fn item_by_index)]
	pub(super) type ItemByIndex<T: Config> = StorageMap<_, Blake2_128Concat, (RealmIndex,ClassIndex,ItemIndex), T::Hash, ValueQuery>; 



	// All items?
	//pub TotalForAccount get(fn total_for_account): map hasher(blake2_128_concat) T::AccountId => u64;
	#[pallet::storage]
	#[pallet::getter(fn total_for_account)]
	pub(super) type TotalForAccount<T: Config> = StorageMap<_, Blake2_128Concat, T::AccountId, u64, ValueQuery>; 



	/// Total Token in system
	/// pub Total get(fn total_items): TotalIndex;
	#[pallet::storage]
	#[pallet::getter(fn total_items)]
	pub(super) type Total<T: Config> = StorageValue<_, TotalIndex, ValueQuery>; 



	/// Burned Token in system
	/// pub Burned get(fn burend_items): BurnedIndex;
	#[pallet::storage]
	#[pallet::getter(fn burned_items)]
	pub(super) type Burned<T: Config> = StorageValue<_, BurnedIndex, ValueQuery>; 






	#[pallet::event]
	#[pallet::generate_deposit(pub(super) fn deposit_event)]
	pub enum Event<T: Config> {
		RealmCreated( u64 ),
		ClassCreated( u64, u64, u64 ),
		Minted( T::Hash, T::Hash, T::AccountId ),
		Burned( T::Hash ),
		Transferred( T::Hash, T::AccountId ),
	}

	// Errors inform users that something went wrong.
	#[pallet::error]
	pub enum Error<T> {
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

	

//-----------------------------news 


	impl<Hash> TangramRealm <Hash> {
		pub fn new(id: Hash, org: Hash, index: u64) ->  TangramRealm<Hash> where Hash: Clone, {
			TangramRealm {
				id,
				org: org,
				index: index,
			}
		}
	}


	#[pallet::call]
	impl<T: Config> Pallet<T> {

	

		#[pallet::weight(<T as Config>::WeightInfo::create_realm())]
		pub fn create_realm(
			origin: OriginFor<T>,
			org: T::Hash
		) -> DispatchResult {
			// TODO: ensure origin == controller
			// ensure_root(origin)?;

			// TODO: ensure org exists : How???
			// TODO: ensure org does not have a realm yet : ? Can org have 2 realms???
			// ensure!(!<TangramRealm<T>>::contains_key(&account), Error::<T>::EntityExists);

			let index = <NextRealmIndex<T>>::get();
			let (hash, _blockNumber) = <T as Config>::Randomness::random(b"rndrealm");
			let realm = TangramRealm::new(hash.clone(), org, index.clone() );
			Realm::<T>::insert( hash.clone(), realm );
			RealmByIndex::<T>::insert( index.clone(), hash );
			// unsafe add
			NextRealmIndex::<T>::mutate(|i| *i += 1);
			Self::deposit_event( Event::RealmCreated( index.clone() ) );
			Ok(())
		}


		#[pallet::weight(<T as Config>::WeightInfo::create_class())]
		#[transactional]
		pub fn create_class(
			origin: OriginFor<T>,
			realm: RealmIndex,
			name: Vec<u8>,
			max: u64,
			strategy: u64
		) -> DispatchResult {
			// TODO: ensure origin == realm controller
			// ensure_root(origin)?;
	
			// valid realm
			let realm_index = <NextRealmIndex<T>>::get();
			ensure!( realm < realm_index, Error::<T>::UnknownRealm );
	
			// max items
			ensure!( max > 0, Error::<T>::MaxItemsTooSmall );
			let index = Self::next_class_index(&realm);
			<MaxItems<T>>::insert((&realm,&index),max.clone());
			//sj: do we have such limitation in RMRK?
	
			// class
			let (hash, _bn) = <T as Config>::Randomness::random(b"rndclass");

			let new_class = TangramClass {
				id: hash.clone(),
				realm: realm.clone(),
				index: index.clone(),
				max: max.clone(),
				strategy: 0 // (1,1,1)
			};

			ItemClass::<T>::insert( hash.clone(), new_class );
			// ClassByIndex::<T>::insert( index.clone(), hash );
	
			NextItemIndex::<T>::insert((&realm,&index),0);
	
			// ++ class index
			let mut next_index = index.checked_add(1).ok_or(Error::<T>::Overflow)?;
			NextClassIndex::<T>::insert(&realm,next_index.clone());

			pallet_rmrk_core::Pallet::<T>::create_collection(
				origin,
				name
			);

	
			Self::deposit_event(Event::ClassCreated(realm, index, max));
			Ok(())
		}


		#[pallet::weight(<T as Config>::WeightInfo::create_item())]
		pub fn create_item(
			origin: OriginFor<T>, //1
			realm: RealmIndex, 	//+ associated realm 
			class: ClassIndex,	// associated class - collectionId
			name: Vec<u8>,		// token name
			cid: Vec<u8>,		// ipfs cid
			who: T::AccountId   // new owner?
		) -> DispatchResult {

			let sender = ensure_signed(origin.clone())?;
			// TODO: get realm controller
			// TODO: ensure origin == realm controller
			// T::ItemAdmin::ensure_origin(origin)?;

			ensure!( realm < <NextRealmIndex<T>>::get(), Error::<T>::UnknownRealm );
			ensure!( class < Self::next_class_index(&realm), Error::<T>::UnknownClass );
			ensure!( Self::next_item_index((&realm,&class)) < Self::max_items((&realm,&class) ), Error::<T>::MaxItemsReached );

			let dob = <T as Config>::Time::now();// we have block time? Why we need this?
			let (dna, _bn) = <T as Config>::Randomness::random( &name ); // for now

			let item = TangramItem { // what about name? unique hash?
				dob: dob, // this I guess extra
				dna: dna // Do we always need DNA???
			};

			let metadata = TangramItemMetadata {
				realm: realm.clone(),// This we might need
				class: class.clone(),// its inside collection so we dont need this.
				name: name.clone(), // attr
				cid: cid.clone(),   // attr
			};

			
			let coll_id:  <T as pallet_rmrk_core::Config>::CollectionId = (class as u32).into();


			let enc_meta = metadata.encode();
			//SJ: Target to push all metadata to RMRK.

			pallet_rmrk_core::Pallet::<T>::mint_nft(
				origin,
				who.clone(),
				coll_id,
				Some(who.clone()),
				Some(20),
				Some(enc_meta)
			);


			//3. mint
			// match Self::mint(&who, item) {
			// 	Ok(id) => {
			// 		// 4. store metadata
			// 		ItemMetadata::<T>::insert(id, metadata );

			// 		let itemIndex = Self::next_item_index((&realm,&class));
			// 		let nextItemIndex = itemIndex.checked_add(One::one()).ok_or(Error::<T>::Overflow)?;
			// 		NextItemIndex::<T>::insert((&realm,&class), nextItemIndex);
			// 		Self::deposit_event( Event::<T>::Minted( id, dna, who ) );
			// 	},
			// 	Err(err) => Err(err)?
			// }

			Ok(())

		}

	}


	impl<T: Config> Pallet<T> {
		fn mint(
			owner: &T::AccountId,
			item: TangramItem<T::Hash, MomentOf<T>>,
		) -> frame_support::dispatch::result::Result< T::Hash, frame_support::dispatch::DispatchError> {
	
			let id = T::Hashing::hash_of(&item);
	
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
	
			// create an item
			// on success write
			Item::<T>::insert( id.clone(), item.clone() );
	
			AccountForItem::<T>::insert( id.clone(), owner.clone() );
			ItemsForAccount::<T>::mutate( &owner, |items| {
				match items.binary_search(&id) {
					Ok(_pos) => {} // should never happen
					Err(pos) => items.insert(pos, id),
				}
			});
	
			// TODO:
			// item by index
			// TODO:
			// items for account
	
			<Total<T>>::mutate(|i| *i += 1);
			TotalForAccount::<T>::mutate( &owner, |total| *total += 1 );
			Ok(id)
	
		}
	}


}
