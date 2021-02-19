build:
		cargo +nightly build --release
run:
	./target/release/subzero --dev
purge:
	./target/release/subzero purge-chain -y --dev

build-docker:
		docker build -t playzero/subzero:local .
run-docker:
		docker run playzero/subzero:local \
			/usr/local/bin/subzero \
			--dev \
			--rpc-cors=all \
			--ws-external \
			--rpc-external \
			--rpc-methods \
			unsafe
