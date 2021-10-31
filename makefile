
reset:
	cargo clean

test:
	cargo +nightly test
test-mod:
	cargo +nightly test -p $(mod)

# release

build:
	cargo build --release
run:
	./target/release/subzero --tmp --name local-node
purge:
	./target/release/subzero purge-chain -y

# dev

dev-build:
	cargo +nightly build
dev-run:
	./target/release/subzero --tmp --dev --name local-dev-node
dev-purge:
	./target/release/subzero purge-chain -y --dev

# docker

docker-build:
	docker build -t playzero/subzero:local .

docker-run:
	docker run \
	-p 9933:9933 \
	-p 9944:9944 \
	-p 30333:30333 \
	playzero/subzero:local \
	/usr/local/bin/subzero \
	--dev --name hello-joy \
	--ws-external \
	--rpc-external \
	--rpc-cors all \
	--rpc-methods unsafe

docker-release:
	# 	TODO:
	# 	1 bump versions of
	# 		cli
	# 		runtime
	# 		node
	# 	2 build local
	# 	3 build docker
	# 	4 tag docker
	# 	5 push docker tag + latest

docker-run-local:
	docker run \
	-p 9933:9933 \
	-p 9944:9944 \
	-p 30333:30333 \
	playzero/subzero:local \
	/usr/local/bin/subzero \
	--dev \
	--name hello-joy \
	--ws-external \
	--rpc-external \
	--rpc-cors all \
	--rpc-methods unsafe

docker-run-latest:
	docker run \
	-p 9933:9933 \
	-p 9944:9944 \
	-p 30333:30333 \
	playzero/subzero:latest \
	/usr/local/bin/subzero \
	--dev \
	--name hello-joy \
	--ws-external \
	--rpc-external \
	--rpc-cors all \
	--rpc-methods unsafe
