//      _______  ________  ________  ________   ______   _______   _______
//    ╱╱       ╲╱        ╲╱        ╲╱        ╲_╱      ╲╲╱       ╲╲╱       ╲╲
//   ╱╱      __╱         ╱         ╱         ╱        ╱╱        ╱╱        ╱╱
//  ╱       ╱ ╱         ╱         ╱        _╱         ╱         ╱         ╱
//  ╲________╱╲___╱____╱╲__╱__╱__╱╲________╱╲________╱╲___╱____╱╲________╱
//
// This file is part of GameDAO Protocol.
// Copyright (C) 2018-2022 GameDAO AG.
// SPDX-License-Identifier: Apache-2.0

// use frame_support::{
// 	traits::{Get, PalletInfoAccess, StorageVersion},
// };
// use crate::{Config, Pallet, Weight};


// pub fn migrate<T: Config, P: PalletInfoAccess>() -> Weight {

// 	let version = StorageVersion::get::<Pallet<T>>();
// 	let mut weight: Weight = 0;

// 	if version == 0 {
// 		weight = weight.saturating_add(v1::migrate::<T, P>());
// 		StorageVersion::new(1).put::<Pallet<T>>();
// 	}

// 	weight
// }

// mod v1 {
// 	use super::*;

// 	pub fn migrate<T: Config, P: PalletInfoAccess>() -> Weight {
// 		//
// 		// Migration logic should be placed here
// 		//
// 		T::DbWeight::get().writes(1)
// 	}
// }
