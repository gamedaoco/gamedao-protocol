use frame_support::{
	traits::{Get, GetStorageVersion, PalletInfoAccess, StorageVersion},
	Blake2_128Concat,
	BoundedVec
};
use sp_std::prelude::*;
use crate::{
	CampaignsByState as CampaignsByStateNew,
	CampaignOrg,
	Config,
	FlowState,
	Pallet,
	Weight
};


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

	#[frame_support::storage_alias]
	type CampaignsByState<T: Config> = StorageMap<
		Pallet<T>,
		Blake2_128Concat,
		FlowState,
		BoundedVec<<T as frame_system::Config>::Hash, <T as Config>::MaxCampaignsPerStatus>
	>;

	pub fn migrate<T: Config, P: GetStorageVersion + PalletInfoAccess>() -> Weight {
		let mut weight: Weight = 0;

		let old_records: Vec<(FlowState, BoundedVec<T::Hash, T::MaxCampaignsPerStatus>)> = CampaignsByState::<T>::drain().collect();
		for (state, campaign_ids) in old_records {
			for campaign_id in campaign_ids {
				let org_id = CampaignOrg::<T>::get(&campaign_id);
				let updated = CampaignsByStateNew::<T>::try_mutate(
					&state, &org_id,
					|campaigns| -> Result<(), ()> {
						campaigns.try_push(campaign_id)?;
						Ok(())
					}
				);
				if updated.is_ok() {
					weight = weight.saturating_add(T::DbWeight::get().reads_writes(1, 1));
				}
			}
		}

		weight
	}
}
