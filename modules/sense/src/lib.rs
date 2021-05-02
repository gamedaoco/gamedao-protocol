//! SENSE
//!
//! This pallet aggregates datapoints to reflect user experience and behaviour.

#![cfg_attr(not(feature = "std"), no_std)]
#![allow(clippy::unused_unit)]

// TODO:
// mod default_weight;
// mod mock;
// mod tests;

pub use module::*;

pub mod module {

	use frame_support::{
		decl_error, decl_event, decl_module, decl_storage,
		ensure,
		dispatch::DispatchResult,
		traits::{
			Currency,
			EnsureOrigin,
			ReservableCurrency,
			Get
		},
		storage::child::exists,
	};
	use frame_system::{ self as system, ensure_signed, ensure_root };
	use codec::{ Encode, Decode };
	use sp_runtime::{
		ModuleId,
		traits::{ Hash, Zero }
	};

	use sp_runtime::{
		traits::{ Verify, BlakeTwo256, IdentifyAccount },
		MultiSignature
	};

	use sp_std::prelude::*;
	use pallet_balances::{ self as balances };
	use primitives::{
		Balance,
		AccountId,
		SenseProps
	};

	//
	//
	//

	pub const MODULE_ID: ModuleId = ModuleId(*b"modsense");
	pub const MODULE_VERSION: &str = "1.0";

	//
	//
	//

	pub trait Config: system::Config + balances::Config {
		/// the goode olde event
		type Event: From<Event<Self>> + Into<<Self as system::Config>::Event>;
		///
		type ForceOrigin: EnsureOrigin<Self::Origin>;
		//TODO:
		// Weight information for extrinsics in this module.
		// type WeightInfo: WeightInfo;
	}

	//
	//
	//

	type AccountOf<T> = <T as system::Config>::AccountId;

	#[derive(Encode, Decode, Default, PartialEq, Eq)]
	#[cfg_attr(feature = "std", derive(Debug))]
	pub struct Entity<AccountOf, BlockNumber> {
		account: AccountOf,
		index:   u128,
		cid:     Vec<u8>,
		created: BlockNumber,
		mutated: BlockNumber,
	}

	//
	//
	//

	decl_storage! {
		trait Store for Module<T: Config> as Sense {
			/// entity xp,rep,trust are public. metadata is private.
			Sense get(fn entity): map hasher(blake2_128_concat) T::AccountId => Entity<T::AccountId,T::BlockNumber>;
			SenseXP get(fn xp): map hasher(blake2_128_concat) T::AccountId => u64;
			SenseREP get(fn rep): map hasher(blake2_128_concat) T::AccountId => u64;
			SenseTrust get(fn trust): map hasher(blake2_128_concat) T::AccountId => u64;

			// propose judgements account, value, deposit
			// if judgement successful, value will be applied and deposit returned
			// SenseOpenJudgements get(fn judgements): map hasher(blake2_128_concat) => Vec<Judgement<T::AccountId, u64, T::Balance>>;

			/// the goode olde nonce
			Nonce: u128;
		}
	}

	//
	//
	//

	decl_event! {
		pub enum Event<T> where
			Account = AccountOf<T>,
			<T as system::Config>::BlockNumber,
		{
			EntityInit(Account, BlockNumber),
			EntityMutate(Account, BlockNumber),
		}
	}

	//
	//
	//

	decl_error! {
		pub enum Error for Module<T: Config> {
			/// Entity exists.
			EntityExists,
			/// Entity Unknown
			EntityUnknown,
			/// Guru Meditation
			GuruMeditation,
		}
	}

	//
	//
	//

	decl_module! {
		pub struct Module<T: Config> for enum Call where origin: T::Origin {

			fn deposit_event() = default;
			type Error = Error<T>;

			// Create Entity
			#[weight = 10_000]
			fn create_entity(
				origin,
				account: T::AccountId,
				cid:     Vec<u8>,
			) -> DispatchResult {

				let creator = ensure_signed(origin)?;
				let now = <system::Module<T>>::block_number();
				let index = Nonce::get();

				let data = Entity {
					account:  account.clone(),
					cid:      cid,
					index:    index.clone(),
					created:  now.clone(),
					mutated:  now.clone(),
				};

				<SenseXP<T>>::insert( account.clone(), 0 );
				<SenseREP<T>>::insert( account.clone(), 0 );
				<SenseTrust<T>>::insert( account.clone(), 0 );
				<Sense<T>>::insert( account.clone(), data );

				Nonce::mutate(|n| *n += 1);

				Self::deposit_event(
					RawEvent::EntityInit(account, now)
				);
				Ok(())

			}

			// mutation of values is restricted
			// certain roles are allowed to mutate values
			// xp:    realm
			// rep:   social
			// trust: id
			// all:   governance
			//        sudo ( until its removal )

			#[weight = 1_000]
			fn mod_xp(
				origin,
				account: T::AccountId,
				value:   u8, // allow for a maximum of u8 to change
			) -> DispatchResult {

				let creator = ensure_signed(origin)?;
				let now = <system::Module<T>>::block_number();

				let v = u64::from(value);
				let current_xp = Self::xp(&account);
				let updated_xp = current_xp.checked_add(v).ok_or(Error::<T>::GuruMeditation)?;
				<SenseXP<T>>::insert( account.clone(), updated_xp );

				Self::deposit_event(
					RawEvent::EntityMutate(account, now)
				);
				Ok(())

			}


			// TODO:
			// generic mod for all properties

			// #[weight = 1_000]
			// fn mod(
			// 	origin,
			// 	account: T::AccountId,
			// 	property: SenseProps,
			// 	value:   u8, // allow for a maximum of u8 to change
			// ) -> DispatchResult {

			// 	let creator = ensure_signed(origin)?;
			// 	let now = <system::Module<T>>::block_number();

			// 	let v = u64::from(v);
			// 	let current_xp = Self::xp(&account);
			// 	let updated_xp = current_xp.checked_add(v).ok_or(Error::<T>::GuruMeditation)?;
			// 	<SenseXP<T>>::insert( account.clone(), updated_xp );

			// 	Self::deposit_event(
			// 		RawEvent::EntityMutate(account, now)
			// 	);
			// 	Ok(())

			// }

		}
	}

	//
	//
	//

	impl<T: Config> Module<T> {
	}

}
