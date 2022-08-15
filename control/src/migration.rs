use frame_support::{
	traits::{Get, GetStorageVersion, PalletInfoAccess, StorageVersion},
	Blake2_128Concat,
	BoundedVec
};
use sp_std::prelude::*;
use crate::{Config, Pallet, Weight};


pub fn migrate<T: Config, P: GetStorageVersion + PalletInfoAccess>() -> Weight {

	let version = StorageVersion::get::<Pallet<T>>();
	let mut weight: Weight = 0;

	if version < 1 {
		weight = weight.saturating_add(v1::migrate::<T, P>());
		StorageVersion::new(1).put::<Pallet<T>>();
	}

	weight
}

mod v1 {
	use super::*;
	use sp_io::hashing::twox_128;

	pub fn migrate<T: Config, P: GetStorageVersion + PalletInfoAccess>() -> Weight {
		let _ = frame_support::storage::unhashed::clear_prefix(
			&twox_128(<Pallet<T>>::name().as_bytes()), None, None
		);

		T::DbWeight::get().writes(1)
	}
}
