event bus
instead of listening to events
modules create a subscriber id and listen to the store for anything propagated there

pallet

	type ChannelId: u64
	type SubscriberId: u64
	type ModuleId

	storage

		Channels:		map ChannelId => Vec<T::Event>
		ChannelNonce

		SubscribersForChannelId:	map ChannelId => Vec<T::SubscriberId>
		SubscriberNonce

		/// return a module id for a subscriber id
		ModuleIdForSubscriberId:	map SubscriberID => ModuleId

		/// return a subscriber id for a module id
		SubscriberIdForModuleId: => SubscriberId => ModuleId

		/// return the channel ids subscribed to by a subscriber id
		ChannelsForSubscriberId:

	events
		channel_created
		channel_deleted
		subscriber_created
		subscriber_deleted
		message_received

	module

		next channel id
		create_channel ( name )

		next subscriber id
		create_subscriber ( T::ModuleId ) -> T::SubscriberId

		push

		pull

	error

		unknown channel id
		unknown subscriber id
		unknown module id
		malformed message