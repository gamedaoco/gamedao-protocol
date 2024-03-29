//      _______  ________  ________  ________   ______   _______   _______
//    ╱╱       ╲╱        ╲╱        ╲╱        ╲_╱      ╲╲╱       ╲╲╱       ╲╲
//   ╱╱      __╱         ╱         ╱         ╱        ╱╱        ╱╱        ╱╱
//  ╱       ╱ ╱         ╱         ╱        _╱         ╱         ╱         ╱
//  ╲________╱╲___╱____╱╲__╱__╱__╱╲________╱╲________╱╲___╱____╱╲________╱
//
// This file is part of GameDAO Protocol.
// Copyright (C) 2018-2022 GameDAO AG.
// SPDX-License-Identifier: Apache-2.0

use crate::{Config, Pallet, Weight};
use frame_support::{
	traits::{Get, PalletInfoAccess},
};

pub fn migrate<T: Config>() -> Weight {
	use frame_support::traits::StorageVersion;

	let version = StorageVersion::get::<Pallet<T>>();
	let mut weight: Weight = 0;

	if version < 1 {
		weight = weight.saturating_add(v1::migrate::<T>());
		StorageVersion::new(1).put::<Pallet<T>>();
	}
	if version < 2 {
		weight = weight.saturating_add(v1::migrate::<T>());
		StorageVersion::new(2).put::<Pallet<T>>();
	}

	weight
}

/// V1: Clean up pallet storage
mod v1 {
	use super::*;
	use sp_io::hashing::twox_128;

	pub fn migrate<T: Config>() -> Weight {

		let _ = frame_support::storage::unhashed::clear_prefix(
			&twox_128(<Pallet<T>>::name().as_bytes()), None, None
		);

		T::DbWeight::get().writes(1)
	}
}
