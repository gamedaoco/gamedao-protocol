// TODO: Tangram storage
// TODO: Tangram functions: do_mint_nft, do_create_collection, do_create_realm


		/// Mints an NFT in the specified collection
		/// Sets metadata and the royalty attribute
		///
		/// Parameters:
		/// - `collection_id`: The class of the asset to be minted.
		/// - `nft_id`: The nft value of the asset to be minted.
		/// - `recipient`: Receiver of the royalty
		/// - `royalty`: Permillage reward from each trade for the Recipient
		/// - `metadata`: Arbitrary data about an nft, e.g. IPFS hash
		#[pallet::weight(10_000 + T::DbWeight::get().reads_writes(1,1))]
		#[transactional]
		pub fn mint_nft(
			origin: OriginFor<T>,
			owner: T::AccountId,
			collection_id: CollectionId,
			recipient: Option<T::AccountId>,
			royalty: Option<Permill>,
			metadata: BoundedVec<u8, T::StringLimit>,
		) -> DispatchResult {

			let sender = ensure_signed(origin.clone())?;
			if let Some(collection_issuer) =
				pallet_uniques::Pallet::<T>::class_owner(&collection_id)
			{
				ensure!(collection_issuer == sender, Error::<T>::NoPermission);
			} else {
				return Err(Error::<T>::CollectionUnknown.into())
			}

			// RMRK NFT mint
			let (collection_id, nft_id) =
				pallet_rmrk::Pallet::<T>::nft_mint(sender.clone(), owner, collection_id, recipient, royalty, metadata)?;

			// Uniques NFT mint
			pallet_uniques::Pallet::<T>::do_mint(
				collection_id,
				nft_id,
				sender.clone(),
				|_details| Ok(()),
			)?;
			
			// TODO: Tangram NFT mint
			// Self::do_mint_nft()

			// TODO: Emit Tangram Event

			Ok(())
		}

		/// Create a collection
		#[pallet::weight(10_000 + T::DbWeight::get().reads_writes(1,1))]
		#[transactional]
		pub fn create_collection(
			origin: OriginFor<T>,
			metadata: BoundedVec<u8, T::StringLimit>,
			max: Option<u32>,
			symbol: BoundedCollectionSymbolOf<T>,
		) -> DispatchResult {
			let sender = ensure_signed(origin.clone())?;

			// RMRK Collection create
			let collection_id = pallet_rmrk::Pallet::<T>::collection_create(sender.clone(), metadata, max, symbol)?;
			
			// Uniques Collection create
			pallet_uniques::Pallet::<T>::do_create_class(
				collection_id,
				sender.clone(),
				sender.clone(),
				T::ClassDeposit::get(),
				false,
				pallet_uniques::Event::Created {
					class: collection_id,
					creator: sender.clone(),
					owner: sender.clone(),
				},
			)?;

			// TODO: Tangram Collection create
			// Self::do_create_collection()

			// TODO: Emit Tangram Event
			
			Ok(())
		}

		/// Create a realm
		#[pallet::weight(10_000 + T::DbWeight::get().reads_writes(1,1))]
		#[transactional]
		pub fn create_realm(
			origin: OriginFor<T>,
			metadata: BoundedVec<u8, T::StringLimit>,
			max: Option<u32>,
			symbol: BoundedCollectionSymbolOf<T>,
		) -> DispatchResult {
			let sender = ensure_signed(origin.clone())?;

			let realm_id = Self::do_create_realm(sender.clone(), metadata, max, symbol)?;

			// TODO: Tangram Realm create
			// Self::do_create_realm()

			// TODO: Emit Tangram Event
			Ok(())
		}
