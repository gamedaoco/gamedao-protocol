//	LootDrop
//	Let users Loot your treasury:

//	[ ] let users get token drops and register them
//	[ ] set time limits
//	[ ] set quantities
//	[ ] create bags with randomized asset types and quantities
//	[ ] generate unique assets upon loot

// pallet

// storage

		/// accounts register
		Accounts: u64 => Accountid

		/// last drop block per account
		AccountDropBlock: map AccountId => Block
		/// drop count per account
		AccountDropCount: map AccountId => u64
		/// drop quantity per account, currency
		AccountDropQty: map AccountId, CurrencyId => Balance 

		/// total accounts using the faucet
		TotalAccounts: u64
		/// total drops initiated
		TotalDropCount: u64
		/// drop quantities per currency
		DropCount: map CurrencyId => u64

		/// drop quantities per currency
		DropQty: map CurrencyId => Balance
		/// drop waiting period in blocks
		/// 28800 blocks = 1d
		DropTimer: u64
		/// drop admin account
		DropAdmin: AccountId
		/// drop treasury account
		DropTreasury: AccountId

		/// next loot crate,
		/// will be regenerated after a drop
		LootCrate: u64 => Loot

// events

		LootDropped ( TotalDrops, AccountId )

// module

		// a drop is an individual item
		type Drop = [CurrencyId||Hash, Quantity];
		// loot is a bundle of items
		type Loot = Vec<Drop>;

		// set drop quantity for a currency
		set_drop_qty ( origin, currency, quantity)
			ensure root
			set DropQuantities currency, quantity

		// set the drop admin allowed to drop the loot
		set_admin ( origin, accountid )
			ensure root
			set DropAdmin = accountid

		// set the account holding drop assets
		// required if they are not minted on the fly
		set_treasury ( origin, accountid )
			ensure root
			set DropTreasury = accountid

		// drop a bag of currencies to an account
		loot ( origin, account )
			ensure signed

		// drop currency to an account
		// volume will be randomized max DropQty(currency)
		drop ( origin, account, currency )
			// permission?
			ensure admin
			// time?
			now = block
			last = DropBlock(accountid)
			ensure( now - last > DropTimer::get() )
			if currency = 0 = native currency
				send balance from treasury
				inc 
			currency > 0 = asset (offset -1)
				send asset from treasury




// error

		faucet looted
		unknown currency
		time limit