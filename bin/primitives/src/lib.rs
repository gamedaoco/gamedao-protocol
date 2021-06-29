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
// Copyright (C) 2010-2020 ZERO Collective.
// SPDX-License-Identifier: Apache-2.0

//! Low-level types used throughout the Substrate code.

// #![warn(missing_docs)]

#![cfg_attr(not(feature = "std"), no_std)]

use sp_runtime::{
	generic,
	traits::{ Verify, BlakeTwo256, IdentifyAccount },
	OpaqueExtrinsic, MultiSignature, RuntimeDebug,
};

#[cfg(feature = "std")]
use serde::{ Deserialize, Serialize };
use codec::{ Encode, Decode };

// #[cfg(test)]
// mod tests;

// metadata
// pub type CID = sp_std::vec::Vec<u8>;

/// An index to a block.
pub type BlockNumber = u32;

/// Alias to 512-bit hash when used in the context of a transaction signature on the chain.
pub type Signature = MultiSignature;

/// Some way of identifying an account on the chain. We intentionally make it equivalent
/// to the public key of our transaction signing scheme.
pub type AccountId = <<Signature as Verify>::Signer as IdentifyAccount>::AccountId;

/// The type for looking up accounts. We don't expect more than 4 billion of them.
pub type AccountIndex = u32;

/// Balance of an account.
pub type Balance = u128;

/// Type used for expressing timestamp.
pub type Moment = u64;

/// Index of a transaction in the chain.
pub type Index = u32;

/// A hash of some data used by the chain.
pub type Hash = sp_core::H256;

/// A timestamp: milliseconds since the unix epoch.
/// `u64` is enough to represent a duration of half a billion years, when the
/// time scale is milliseconds.
pub type Timestamp = u64;

/// Digest item type.
pub type DigestItem = generic::DigestItem<Hash>;
/// Header type.
pub type Header = generic::Header<BlockNumber, BlakeTwo256>;
/// Block type.
pub type Block = generic::Block<Header, OpaqueExtrinsic>;
/// Block ID.
pub type BlockId = generic::BlockId<Block>;

/// App-specific crypto used for reporting equivocation/misbehavior in BABE and
/// GRANDPA. Any rewards for misbehavior reporting will be paid out to this
/// account.

// pub mod report {
// 	use super::{Signature, Verify};
// 	use frame_system::offchain::AppCrypto;
// 	use sp_core::crypto::{key_types, KeyTypeId};

// 	/// Key type for the reporting module. Used for reporting BABE and GRANDPA
// 	/// equivocations.
// 	pub const KEY_TYPE: KeyTypeId = key_types::REPORTING;

// 	mod app {
// 		use sp_application_crypto::{app_crypto, sr25519};
// 		app_crypto!(sr25519, super::KEY_TYPE);
// 	}

// 	/// Identity of the equivocation/misbehavior reporter.
// 	pub type ReporterId = app::Public;

// 	/// An `AppCrypto` type to allow submitting signed transactions using the reporting
// 	/// application key as signer.
// 	pub struct ReporterAppCrypto;

// 	impl AppCrypto<<Signature as Verify>::Signer, Signature> for ReporterAppCrypto {
// 		type RuntimeAppPublic = ReporterId;
// 		type GenericSignature = sp_core::sr25519::Signature;
// 		type GenericPublic = sp_core::sr25519::Public;
// 	}
// }

// /// Opaque, encoded, unchecked extrinsic.
// pub use sp_runtime::OpaqueExtrinsic as UncheckedExtrinsic;

//
// currencies
//

#[derive(Encode, Decode, Eq, PartialEq, Copy, Clone, RuntimeDebug, PartialOrd, Ord)]
#[cfg_attr(feature = "std", derive(Serialize, Deserialize))]
pub enum TokenSymbol {
	ZERO  = 0,
	PLAY  = 1,
	GAME  = 2,
	DOT   = 3,
	KSM   = 4,
	DAI   = 5,
	EUR   = 6,
}

#[derive(Encode, Decode, Eq, PartialEq, Copy, Clone, RuntimeDebug, PartialOrd, Ord)]
#[cfg_attr(feature = "std", derive(Serialize, Deserialize))]
pub enum AirDropCurrencyId {
	ZERO = 0,
	PLAY = 1,
	GAME = 2,
}

// bodies

// #[derive(Encode, Decode, Eq, PartialEq, Copy, Clone, RuntimeDebug, PartialOrd, Ord)]
// #[cfg_attr(feature = "std", derive(Serialize, Deserialize))]
// pub enum BodyType {
// 	INDIVIDUAL = 0, // individual address
// 	COMPANY = 1,    // ...with a legal body
// 	DAO = 2,        // ...governed by a dao
// }

// #[derive(Encode, Decode, Eq, PartialEq, Copy, Clone, RuntimeDebug, PartialOrd, Ord)]
// #[cfg_attr(feature = "std", derive(Serialize, Deserialize))]
// pub enum BodyState {
// 	INACTIVE = 0,
// 	ACTIVE = 1,
// 	LOCKED = 2,
// }

// roles

#[derive(Encode, Decode, Eq, PartialEq, Copy, Clone, RuntimeDebug, PartialOrd, Ord)]
#[cfg_attr(feature = "std", derive(Serialize, Deserialize))]
pub enum AuthoritysOriginId {
	Root,
	ZeroTreasury,
	GameDAOTreasury,
	SenseNet,
}

//
//	sense
//

#[derive(Encode, Decode, Eq, PartialEq, Copy, Clone, RuntimeDebug, PartialOrd, Ord)]
#[cfg_attr(feature = "std", derive(Serialize, Deserialize))]
pub enum SenseProps {
	XP    = 0,
	REP   = 1,
	TRUST = 2,
}

//
//
//

pub type NFTBalance = u128;
