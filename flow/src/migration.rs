use frame_support::{
	traits::{Get, GetStorageVersion, PalletInfoAccess, StorageVersion},
	Blake2_128Concat,
	BoundedVec
};
use sp_std::prelude::*;
use crate::{
	// CampaignsByState as CampaignsByStateNew,
	// CampaignOrg,
	Config,
	// FlowState,
	Pallet,
	Weight
};


pub fn migrate<T: Config, P: GetStorageVersion + PalletInfoAccess>() -> Weight {

	let version = StorageVersion::get::<Pallet<T>>();
	let mut weight: Weight = 0;

	if version < 2 {
		weight = weight.saturating_add(v2::migrate::<T, P>());
		StorageVersion::new(2).put::<Pallet<T>>();
	}

	weight
}

mod v2 {
	use super::*;
	use sp_io::hashing::twox_128;

	pub fn migrate<T: Config, P: GetStorageVersion + PalletInfoAccess>() -> Weight {
		let _ = frame_support::storage::unhashed::clear_prefix(
			&twox_128(<Pallet<T>>::name().as_bytes()), None, None
		);

		T::DbWeight::get().writes(1)
	}
}
