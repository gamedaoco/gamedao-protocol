#[cfg(test)]
mod tests {

	use super::*;

	use support::{impl_outer_origin, assert_ok, assert_noop};
	use runtime_io::{with_externalities, TestExternalities};
	use primitives::{H256, Blake2Hasher};
	use runtime_primitives::{
		BuildStorage,
		traits::{BlakeTwo256, IdentityLookup},
		testing::{Digest, DigestItem, Header}
	};

	impl_outer_origin! {
		pub enum Origin for CampaignTest {}
	}

	#[derive(Clone, Eq, PartialEq)]
	pub struct CampaignTest;

	impl system::Trait for CampaignTest {
		type Origin = Origin;
		type Index = u64;
		type BlockNumber = u64;
		type Hash = H256;
		type Hashing = BlakeTwo256;
		type Digest = Digest;
		type AccountId = u64;
		type Lookup = IdentityLookup<Self::AccountId>;
		type Header = Header;
		type Event = ();
		type Log = DigestItem;
	}

	impl balances::Trait for ControlTest {
		type Balance = u64;
		type OnFreeBalanceZero = ();
		type OnNewAccount = ();
		type Event = ();
		type TransactionPayment = ();
		type TransferPayment = ();
		type DustRemoval = ();
	}

	impl super::Trait for ControlTest {
		type Event = ();
	}

	type Control = super::Module<ControlTest>;

	fn build_ext() -> TestExternalities<Blake2Hasher> {
		let mut t = system::GenesisConfig::<ControlTest>::default().build_storage().unwrap().0;
		t.extend(balances::GenesisConfig::<ControlTest>::default().build_storage().unwrap().0);
		t.into()
	}

	#[test]
	fn create_campaign_should_work() {
		with_externalities(&mut build_ext(), {

			// create a DAO with account #5.
			assert_ok!(
				Control::create(
					Origin::signed(5),	// creator == account 5
					Origin::signed(4),	// controller == account 4
					Origin::signed(3),	// treasury == account 3
					vec![12,56],		// name
					vec![11,111],		// cid
					1,0,1,100,0,0,10
				)
			);

			// check that there are now 1 Control in storage
			assert_eq!(Control::nonce(), 1);

			// check that account #5 is creator
			let creator_hash = Control::body_by_hash(0);
			assert_eq!(Control::body_creator(creator_hash), 5);

			// check that account #4 is controller
			let controller_hash = Control::body_by_hash(0);
			assert_eq!(Control::body_controller(controller_hash), 4);

			// check that account #3 is treasury
			let treasury_hash = Control::body_by_hash(0);
			assert_eq!(Control::body_treasury(treasury_hash), 3);

			//

			// check that account #6 owns 1 Campaign
			assert_eq!(Control::campaigns_owned_count(5), 1);

			// check that some random account #3 does not own a Campaign
			assert_eq!(Control::campaigns_owned_count(3), 0);

			// check that this Campaign is specifically owned by account #6
			let owner_hash = Control::campaign_by_id(0);
			assert_eq!(Control::campaign_owner(owner_hash), Some(5));

			let other_hash = Control::campaigns_owned_index(5, 0);
			assert_eq!(hash, other_hash);

		})
	}

}
