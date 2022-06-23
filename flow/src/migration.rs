use frame_support::{
	generate_storage_alias,
	traits::Get,
	Blake2_128Concat,
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


pub fn migrate<T: Config>() -> Weight {
	use frame_support::traits::StorageVersion;

	let version = StorageVersion::get::<Pallet<T>>();
	let mut weight: Weight = 0;

	if version < 1 {
		weight = weight.saturating_add(v1::migrate::<T>());
		StorageVersion::new(1).put::<Pallet<T>>();
	}

	weight
}

mod v1 {
	use super::*;

	generate_storage_alias!(
		Flow,
		CampaignsByState<T: Config> => Map<(Blake2_128Concat, FlowState), Vec<T::Hash>>
	);

	pub fn migrate<T: Config>() -> Weight {
		let mut weight: Weight = 0;

		let old_records: Vec<(FlowState, Vec<T::Hash>)> = CampaignsByState::<T>::drain().collect();
		for (state, campaign_ids) in old_records {
			for campaign_id in campaign_ids {
				let org_id = CampaignOrg::<T>::get(&campaign_id);
				CampaignsByStateNew::<T>::mutate(&state, &org_id, |campaigns| campaigns.push(campaign_id));
				weight = weight.saturating_add(T::DbWeight::get().reads_writes(1, 1));
			}
		}

		weight
	}
}
