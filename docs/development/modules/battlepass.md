# BattlePass Beta



## Definitions + Dictionary

	- Guild -> A group of people gaming together.
				also Clan, Team, Crew, Squad, Party

	- BattlePass (BP) -> A subscription based engagement protocol for gaming guilds

	- Quest (Q) -> A group of tasks, bounties, etc on related games and media, like discord, twitter, twitch, Fortnite, CS, ... resulting in receiving points (XP,REP,TRUST,...) upon verifiable completion of its parts.

	- Quest Progress (QP) -> ( NonBinary / Float ) Fulfilled 0...1 of Quest Q

	- Points (P) -> Named individually in a guild, reference score based on the following

		- XP -> Experience Points based on tasks fulfilled in context of a Quest and BattlePass, may reset each season

		- REP -> Reputation Points based on street cred of a user on global level

		- TRUST -> Trust level based on verifiable credentials, e.g. connect twitter, discord, twitch, web3name, etc

	- Level (L) -> achieved by collecting points

	- Achievement ->
		1 NFT proof of achievement
		2 this enables account controller to redeem a reward
		3 to mint an achievement we use a template struct defining ->
			a. data struct for the immutable nft part / configuration
			b. data struct for the im/mutable payload part


## Overview

BattlePass is a subscription based engagement protocol for gaming guilds. It enables claiming and dropping rewards based on completing quests. These achievements are based on verifiable activity and contribute to xp, rep, trust in SENSE.


## BattlePass for DAOs

	1. It can be invoked by a DAO through staking (1000) GAME token on the protocol treasury.

	2. Staking automatically enables the BattlePass section in a DAO.

	3. The DAO invoking wishing to enable BattlePass needs verified credentials and be in good standing:
		- (XP) > (100)
		- (REP) > (100)
		- (TRUST) > (100)
		- MEMBERS > 10

BattlePass starts operating immediately when the staking deposit has been transferred. To make proper use of it, some defaults are in place to make it work:

	- By default a BattlePass utilizes xp,rep,trust in relation to a DAO

	- therefore a DAO specific map for xp,rep,trust has to be setup on DAO creation

	- a BP operates in seasons. a season is by default 100 days based on the respective blocktime of the host chain this results with 6s blocktime in in 10 * 60 * 24 = 14400 blocks per day and 144000 blocks per season.

	- after a season has finished, a new season starts, resetting the achieved score

	- a user subscribes for a BP over one to n seasons

	- a user collects points during the season based on their verifiable activity in games, on socials, etc

	- based on a score table, user is allowed to claim rewards from a level L and can use points P to claim rewards up to level L

	- P are calculated based on a formula like:

	*** DRAFT ***

		P =
			MAP *
			( 1 * subscription_mul ) +	-> local
			0 * (						-> activated?
				1 +
				XP( season ) *			-> local
				( 1 + REP / 100 ) *		-> global
				( 1 + TRUST * 100 )		-> global
			)

		- where MAP is the individual mapping for achievements / levels, etc

		everybody can play, but only with a subscription you get the multiplier to make real progress into the claimable scores

	*** DRAFT ***

	- rewards will be delivered as nft based collectable, like
		- proof of achievement
		- proof of participation
		- ticket
		- collectable
		...

	- DAO needs to create a reward map based on a
		score_threshold ST,
		a reward object R,
		a price in points P:

				{ ST ,  ( R , P ) }

example: 		1000, ( item_drop_dragonball_nft, 0 )

## BattlePass for gamers and creators

Battlepass provides the following functions:

	0. Signup with discord **and** wallet

	1. Connecting the following social accounts to start collecting points
		- discord						-> 1st poc e2e
		- twitter						-> 2nd due to relevance
		- twitch						-> tbd
		- polkadot compatible wallet	-> talisman preferred
		- suggestions welcome

	2. One-time or subscription payment for a Battlepass settled through PSP in FIAT or directly via stablecoin (USDT)

	3. Browsing the rewards showing
		- xp bar
		- cta to join if not joined
		- levels and/or required points to claim reward x
		- enabling claim button when score is sufficient

	4. Browsing Quests and Quest Progress


## Pallet

### Sense

	map global ( season, xp , rep, trust )
	map local ( season, xp , rep, trust )

### BattlePass

### Control



###

© 2022 GameDAO AG