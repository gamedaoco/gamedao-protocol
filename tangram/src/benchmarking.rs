//! Benchmarking setup for pallet-template
//! Benchmarks for Template Pallet
#![cfg(feature = "runtime-benchmarks")]

use super::*;


#[allow(unused)]
use crate::Pallet as Tangram;
use frame_benchmarking::{benchmarks, whitelisted_caller, impl_benchmark_test_suite, account, Vec};
use frame_system::RawOrigin;
use sp_std::*;
use sp_core::H256;
use frame_support::sp_runtime::traits::Hash;

// use sp_std::if_std;
// use sp_runtime::traits::Printable;
// use sp_runtime::print;
// use frame_benchmarking::Vec;


const SEED: u32 = 0;

fn setup_hash<T: Config>(length: u32) -> (Vec<u8>, T::AccountId) {
	let reason = vec![0; length as usize];
	let awesome_person = account("awesome", 0, SEED);
	(reason, awesome_person)
}

benchmarks! {
	create_realm {
		// let s in 0 .. 100;
		let (reason, awesome_person) = setup_hash::<T>(32);
		let reason_hash = T::Hashing::hash(&reason[..]);
		let index = NextRealmIndex::<T>::get();
		// if_std!{
		// 	println!("index:");
		// }
		
		let hash = T::Hashing::hash_of(&(&reason_hash, &awesome_person));
		let caller: T::AccountId = whitelisted_caller();
	}: _(RawOrigin::Signed(caller), hash)

	create_class {
		let caller: T::AccountId = whitelisted_caller();
		let index = NextRealmIndex::<T>::get();

		let (reason, awesome_person) = setup_hash::<T>(32);
		let reason_hash = T::Hashing::hash(&reason[..]);
		let hash = T::Hashing::hash_of(&(&reason_hash, &awesome_person));
		//let realm = 
		Tangram::<T>::create_realm(RawOrigin::Signed(caller.clone()).into(), hash);

	}: _(RawOrigin::Signed(caller), index, "Gov".as_bytes().to_vec(), 100, 100)


	// pub fn create_item(
	// 	origin: OriginFor<T>,
	// 	realm: RealmIndex, 	// associated realm
	// 	class: ClassIndex,	// associated class
	// 	name: Vec<u8>,		// token name
	// 	cid: Vec<u8>,		// ipfs cid
	// 	who: T::AccountId
	// ) -> DispatchResult {

		create_item {
			let caller: T::AccountId = whitelisted_caller();
			let realm_index = NextRealmIndex::<T>::get();
			
	
			let (reason, awesome_person) = setup_hash::<T>(32);
			let reason_hash = T::Hashing::hash(&reason[..]);
			let hash = T::Hashing::hash_of(&(&reason_hash, &awesome_person));

			Tangram::<T>::create_realm(RawOrigin::Signed(caller.clone()).into(), hash);

			let class_index = NextClassIndex::<T>::get(realm_index);

			Tangram::<T>::create_class(RawOrigin::Signed(caller.clone()).into(), realm_index, "Gov".as_bytes().to_vec(), 100, 100);

		}: _(RawOrigin::Signed(caller.clone()), realm_index, class_index, "Gov".as_bytes().to_vec(), "Gov".as_bytes().to_vec(), caller.clone())

	// verify {
	// 	assert_eq!(Something::<T>::get(), Some(s));
	// }


impl_benchmark_test_suite!(
	Tangram, 
	crate::mock::new_test_ext(), 
	crate::mock::Test
);

}

