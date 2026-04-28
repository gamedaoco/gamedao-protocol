# GameDAO Protocol - Build System
# Author: GameDAO AG
# Description: End-to-end build, test, and deployment automation

# Colors for output
RED=\033[0;31m
GREEN=\033[0;32m
YELLOW=\033[1;33m
BLUE=\033[0;34m
PURPLE=\033[0;35m
CYAN=\033[0;36m
NC=\033[0m # No Color

# Project configuration
PROJECT_NAME=GameDAO Protocol
CONTRACTS_DIR=packages/contracts-solidity
FRONTEND_DIR=packages/frontend
SUBGRAPH_DIR=packages/subgraph
SHARED_DIR=packages/shared
DATA_DIR=data/

# Network configuration
NETWORK?=localhost
DEPLOYER_PRIVATE_KEY?=""
ETHERSCAN_API_KEY?=""

# Graph node configuration
GRAPH_NODE_PORT?=8020
IPFS_PORT?=5001
POSTGRES_PORT?=5432

.PHONY: help install clean build test deploy verify docs lint format setup-env all graph-node graph-deploy scaffold scaffold-copy scaffold-full scaffold-with-deploy scaffold-clean generate-abis module-list module-enable module-disable grant-admin seed-account frontier-builder frontier-build frontier-rebuild frontier-up frontier-down frontier-logs

# Default target
# all: clean install build test

# Help target
help:
	@echo "$(CYAN)🎮 $(PROJECT_NAME) - Build System$(NC)"
	@echo ""
	@echo "$(YELLOW)📋 Available Commands:$(NC)"
	@echo ""
	  @echo "$(GREEN)🔧 Setup & Installation:$(NC)"
	@echo "  make install          Install all dependencies"
	@echo "  make setup-env        Setup development environment"
	@echo "  make clean            Clean all build artifacts"
	@echo ""
	@echo "$(GREEN)🐳 Docker Development:$(NC)"
	@echo "  make docker-dev       Start dockerized development environment"
	@echo "  make docker-dev-reset Complete Docker environment reset"
	@echo "  make docker-dev-stop  Stop Docker development environment"
	@echo "  make docker-deploy    Deploy contracts to Docker environment"
	@echo "  make docker-scaffold  Generate test data in Docker environment"
	@echo "  make docker-status    Check Docker services status"
	@echo "  make reset-node       Reset Hardhat node (clear pending txs/nonces)"
	@echo "  make migrate-to-docker Migrate existing data to Docker structure"
	@echo ""
	@echo "$(GREEN)🔨 Frontier Node Build:$(NC)"
	@echo "  make frontier-builder Build Frontier builder image (one-time, ~5-10 min)"
	@echo "  make frontier-build    Build Frontier node image (uses cached builder)"
	@echo "  make frontier-rebuild  Rebuild both builder and node from scratch"
	@echo "  make frontier-up       Start Frontier node service"
	@echo "  make frontier-down     Stop Frontier node service"
	@echo "  make frontier-logs     View Frontier node logs"
	@echo ""
	@echo "$(GREEN)🏗️  Build & Compilation:$(NC)"
	@echo "  make build            Build all packages"
	@echo "  make build-contracts  Build smart contracts only"
	@echo "  make build-frontend   Build frontend only"
	@echo "  make build-subgraph   Build subgraph only"
	@echo "  make generate-abis    Compile contracts and regenerate shared ABIs"
	@echo ""
	@echo "$(GREEN)🧪 Testing:$(NC)"
	@echo "  make test             Run all tests"
	@echo "  make test-contracts   Run contract tests only"
	@echo "  make test-coverage    Run tests with coverage"
	@echo "  make test-gas         Run gas optimization tests"
	@echo ""
	@echo "$(GREEN)🚀 Deployment:$(NC)"
	@echo "  make deploy              Deploy to localhost"
	@echo "  make deploy-local        Deploy to localhost (Hardhat, unified)"
	@echo "  make deploy-local-frontier Deploy to Frontier node (opt-in)"
	@echo "  make deploy-testnet     Deploy to testnet"
	@echo "  make deploy-mainnet     Deploy to mainnet"
	@echo "  make verify             Verify contracts on Etherscan"
	@echo ""
	@echo "$(GREEN)📊 Graph & Indexing:$(NC)"
	@echo "  make graph-node       Start local Graph node"
	@echo "  make graph-deploy     Deploy subgraph to local Graph node"
	@echo "  make graph-full       Complete Graph setup (node + deploy)"
	@echo "  make graph-stop       Stop Graph services"
	@echo "  make graph-status     Check Graph services status"
	@echo ""
	@echo "$(GREEN)🔄 Development Workflows:$(NC)"
	@echo "  make scaffold         Generate test data (contracts must be deployed)"
	@echo "  make scaffold-copy    Copy scaffold data to frontend"
	@echo "  make scaffold-full    Generate test data + copy to frontend"
	@echo "  make scaffold-with-deploy  Full deployment + scaffold (fresh setup)"
	@echo "  make scaffold-clean   Clean scaffold data"
	@echo "  make send-tokens      Send tokens to specific address"
	@echo ""
	@echo "$(GREEN)🔐 Protocol Admin & Modules:$(NC)"
	@echo "  make module-list      List all modules and their status"
	@echo "  make module-enable MODULE=CONTROL   Enable a module (or MODULE=all)"
	@echo "  make module-disable MODULE=SIGNAL   Disable a module (or MODULE=all)"
	@echo "  make grant-admin ACCOUNT=0x...      Grant admin roles to account"
	@echo "  make seed-account ACCOUNT=0x...     Seed account with ETH/GAME/USDC"
	@echo ""
	@echo "$(GREEN)📚 Documentation & Quality:$(NC)"
	@echo "  make docs             Generate documentation"
	@echo "  make lint             Run linting"
	@echo "  make format           Format code"
	@echo "  make status           Show project status"
	@echo ""
	@echo "$(YELLOW)📝 Examples:$(NC)"
	@echo "  make docker-deploy-all          # One-shot: reset, deploy, enable, fund, scaffold"
	@echo "  make docker-deploy-all SCAFFOLD=0  # Same, but skip scaffold step"
	@echo "  make deploy NETWORK=amoy"
	@echo "  make send-tokens RECIPIENT=0x123... ETH=2.0 GAME=20000 USDC=10000"
	@echo "  make module-enable MODULE=all     # Enable all modules after deploy"
	@echo "  make module-disable MODULE=FLOW   # Disable a single module"
	@echo "  make grant-admin ACCOUNT=0x123... # Grant admin to external account"
	@echo "  make seed-account ACCOUNT=0x123...  ETH=5 GAME=50000 USDC=5000"

# Installation targets
install:
	@echo "$(BLUE)📦 Installing dependencies...$(NC)"
	@npm install
	@echo "$(BLUE)📦 Installing contract dependencies...$(NC)"
	@cd $(CONTRACTS_DIR) && pnpm install --legacy-peer-deps || pnpm install --force
	@echo "$(BLUE)📦 Installing frontend dependencies...$(NC)"
	@if [ -d "$(FRONTEND_DIR)" ]; then \
		cd $(FRONTEND_DIR) && pnpm install; \
	fi
	@echo "$(BLUE)📦 Installing subgraph dependencies...$(NC)"
	@if [ -d "$(SUBGRAPH_DIR)" ]; then \
		cd $(SUBGRAPH_DIR) && pnpm install; \
	fi
	@echo "$(GREEN)✅ Dependencies installed successfully$(NC)"

setup-env:
	@echo "$(BLUE)🔧 Setting up development environment...$(NC)"
	@cp env.template .env.local 2>/dev/null || echo "# GameDAO Protocol Environment" > .env.local
	@echo "$(YELLOW)⚠️  Please update .env.local file with your configuration$(NC)"
	@echo "$(GREEN)✅ Environment setup complete$(NC)"

# Clean targets
clean:
	@echo "$(BLUE)🧹 Cleaning build artifacts...$(NC)"
	@rm -rf node_modules
	@rm -rf $(CONTRACTS_DIR)/node_modules
	@rm -rf $(CONTRACTS_DIR)/artifacts
	@rm -rf $(CONTRACTS_DIR)/cache
	@rm -rf $(CONTRACTS_DIR)/typechain-types
	@rm -rf $(FRONTEND_DIR)/node_modules
	@rm -rf $(FRONTEND_DIR)/.next
	@rm -rf $(SUBGRAPH_DIR)/node_modules
	@rm -rf $(SUBGRAPH_DIR)/build
	@rm -rf $(SUBGRAPH_DIR)/generated
	@make scaffold-clean
	@echo "$(GREEN)✅ Clean complete$(NC)"

# Build targets
build: build-contracts build-frontend build-subgraph
	@echo "$(GREEN)🎉 Build complete!$(NC)"

build-contracts:
	@echo "$(BLUE)🏗️  Building smart contracts...$(NC)"
	@cd $(CONTRACTS_DIR) && pnpm run build
	@echo "$(GREEN)✅ Contracts built successfully$(NC)"

build-frontend:
	@echo "$(BLUE)🏗️  Building frontend...$(NC)"
	@if [ -d "$(FRONTEND_DIR)" ]; then \
		cd $(FRONTEND_DIR) && pnpm run build; \
		echo "$(GREEN)✅ Frontend built successfully$(NC)"; \
	else \
		echo "$(YELLOW)⚠️  Frontend directory not found, skipping...$(NC)"; \
	fi

build-subgraph:
	@echo "$(BLUE)🏗️  Building subgraph...$(NC)"
	@if [ -d "$(SUBGRAPH_DIR)" ]; then \
		cd $(SUBGRAPH_DIR) && pnpm run codegen && pnpm run build; \
		echo "$(GREEN)✅ Subgraph built successfully$(NC)"; \
	else \
		echo "$(YELLOW)⚠️  Subgraph directory not found, skipping...$(NC)"; \
	fi

# Compile contracts and rebuild the shared package (regenerates abis.ts +
# deployments.ts and emits dist/).
generate-abis:
	@echo "$(BLUE)📋 Compiling contracts and rebuilding shared package...$(NC)"
	@cd $(CONTRACTS_DIR) && pnpm exec hardhat compile
	@cd $(SHARED_DIR) && pnpm run build
	@echo "$(GREEN)✅ ABIs generated and shared package updated$(NC)"

# Testing targets
test: test-contracts
	@echo "$(GREEN)🎉 All tests complete!$(NC)"

test-contracts:
	@echo "$(BLUE)🧪 Running contract tests...$(NC)"
	@cd $(CONTRACTS_DIR) && pnpm test

test-coverage:
	@echo "$(BLUE)🧪 Running tests with coverage...$(NC)"
	@cd $(CONTRACTS_DIR) && pnpm run test:coverage

test-gas:
	@echo "$(BLUE)⛽ Running gas optimization tests...$(NC)"
	@cd $(CONTRACTS_DIR) && pnpm run test:gas

# Deployment targets
deploy:
	@echo "$(BLUE)🚀 Deploying to $(NETWORK)...$(NC)"
	@cd $(CONTRACTS_DIR) && pnpm run deploy:$(NETWORK)
	@echo "$(GREEN)✅ Deployment to $(NETWORK) complete$(NC)"

deploy-localhost:
	@echo "$(BLUE)🚀 Deploying to localhost...$(NC)"
	@cd $(CONTRACTS_DIR) && pnpm run node &
	@sleep 5
	@cd $(CONTRACTS_DIR) && pnpm run deploy:localhost
	@echo "$(GREEN)✅ Local deployment complete$(NC)"

deploy-testnet:
	@echo "$(BLUE)🚀 Deploying to Polygon Amoy...$(NC)"
	@cd $(CONTRACTS_DIR) && pnpm run deploy:amoy
	@echo "$(GREEN)✅ Amoy deployment complete$(NC)"

deploy-mainnet:
	@echo "$(RED)🚨 POLYGON MAINNET DEPLOYMENT - ARE YOU SURE? (y/N)$(NC)"
	@read -r REPLY; \
	if [ "$$REPLY" = "y" ] || [ "$$REPLY" = "Y" ]; then \
		echo "$(BLUE)🚀 Deploying to Polygon mainnet...$(NC)"; \
		cd $(CONTRACTS_DIR) && pnpm run deploy:polygon; \
		echo "$(GREEN)✅ Polygon mainnet deployment complete$(NC)"; \
	else \
		echo "$(YELLOW)⚠️  Mainnet deployment cancelled$(NC)"; \
	fi

verify:
	@echo "$(BLUE)🔍 Verifying contracts on Etherscan...$(NC)"
	@if [ -z "$(ETHERSCAN_API_KEY)" ]; then \
		echo "$(RED)❌ ETHERSCAN_API_KEY not set$(NC)"; \
		exit 1; \
	fi
	@cd $(CONTRACTS_DIR) && pnpm run verify
	@echo "$(GREEN)✅ Contract verification complete$(NC)"

# Graph node and subgraph targets
graph-node:
	@echo "$(BLUE)📊 Starting local Graph node infrastructure...$(NC)"
	@echo "$(CYAN)🐳 Starting Docker services...$(NC)"
	@docker compose up -d
	@echo "$(YELLOW)⏳ Waiting for services to be ready...$(NC)"
	@sleep 10
	@echo "$(GREEN)✅ Graph node infrastructure started$(NC)"
	@echo "$(CYAN)📋 Services available at:$(NC)"
	@echo "  - Graph Node: http://localhost:$(GRAPH_NODE_PORT)"
	@echo "  - IPFS: http://localhost:$(IPFS_PORT)"
	@echo "  - PostgreSQL: localhost:5433"

graph-deploy:
	@echo "$(BLUE)📊 Deploying subgraph to local Graph node...$(NC)"
	@if [ ! -d "$(SUBGRAPH_DIR)" ]; then \
		echo "$(RED)❌ Subgraph directory not found$(NC)"; \
		exit 1; \
	fi
	@echo "$(BLUE)🏗️  Building subgraph...$(NC)"
	@cd $(SUBGRAPH_DIR) && pnpm run codegen && pnpm run build
	@echo "$(BLUE)🚀 Creating subgraph...$(NC)"
	@cd $(SUBGRAPH_DIR) && pnpm run create-local || echo "$(YELLOW)⚠️  Subgraph already exists$(NC)"
	@echo "$(BLUE)🚀 Deploying subgraph...$(NC)"
	@cd $(SUBGRAPH_DIR) && pnpm run deploy-local
	@echo "$(GREEN)✅ Subgraph deployed successfully$(NC)"
	@echo "$(CYAN)📋 Subgraph available at:$(NC)"
	@echo "  - GraphQL Playground: http://localhost:8000/subgraphs/name/gamedao/protocol"

graph-full: graph-node
	@echo "$(BLUE)📊 Setting up complete Graph environment...$(NC)"
	@sleep 5
	@make graph-deploy
	@echo "$(GREEN)🎉 Complete Graph environment ready!$(NC)"

graph-stop:
	@echo "$(BLUE)🛑 Stopping Graph node infrastructure...$(NC)"
	@docker compose down
	@echo "$(GREEN)✅ Graph node infrastructure stopped$(NC)"

graph-status:
	@echo "$(BLUE)📊 GameDAO Graph Services Status$(NC)"
	@echo "$(CYAN)🐳 GameDAO Containers:$(NC)"
	@docker ps -a --filter "name=gamedao-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "$(YELLOW)⚠️  No GameDAO containers found$(NC)"
	@echo ""
	@echo "$(CYAN)🔌 Port Usage:$(NC)"
	@echo "  - 8000: Graph Node GraphQL"
	@echo "  - 8020: Graph Node JSON-RPC"
	@echo "  - 5001: IPFS API"
	@echo "  - 5433: PostgreSQL"

# Development workflow targets
# dev:
# 	@echo "$(BLUE)🔧 Starting development environment...$(NC)"
# 	@cd $(CONTRACTS_DIR) && pnpm run node &
# 	@echo "$(GREEN)✅ Hardhat node started$(NC)"
# 	@echo "$(CYAN)💡 Ready for development!$(NC)"
# 	@echo "  - Local node: http://localhost:8545"
# 	@echo "  - Chain ID: 31337"

# === DOCKER DEVELOPMENT ENVIRONMENT ===

.PHONY: docker-dev docker-dev-stop docker-dev-reset docker-deploy docker-deploy-all docker-scaffold docker-status migrate-to-docker reset-node

# Reset Hardhat node state (clears pending txs and nonces)
reset-node:
	@echo "$(BLUE)🔄 Resetting Hardhat node state...$(NC)"
	@curl -s -X POST -H "Content-Type: application/json" \
		--data '{"jsonrpc":"2.0","method":"hardhat_reset","params":[],"id":1}' \
		http://localhost:8545 > /dev/null && \
		echo "$(GREEN)✅ Hardhat node reset successfully$(NC)" || \
		echo "$(RED)❌ Failed to reset — is the node running?$(NC)"

# Start dockerized development environment
docker-dev:
	@echo "$(BLUE)🐳 Starting dockerized development environment...$(NC)"
	@echo "$(CYAN)📋 Phase 1: Building and starting services...$(NC)"
	@docker compose up -d --build
	@echo "$(YELLOW)⏳ Waiting for services to be ready...$(NC)"
	@sleep 15
	@echo "$(CYAN)📋 Phase 2: Checking service health...$(NC)"
	@make docker-status
	@echo "$(GREEN)✅ Dockerized development environment ready!$(NC)"
	@echo "$(CYAN)🎯 Services available:$(NC)"
	@echo "  - Hardhat Node: http://localhost:8545"
	@echo "  - Graph Node: http://localhost:8000"
	@echo "  - Graph Node JSON-RPC: http://localhost:8020"
	@echo "  - IPFS API: http://localhost:5001"
	@echo "  - IPFS Gateway: http://localhost:8080"
	@echo "  - PostgreSQL: localhost:5433"

# Stop dockerized development environment
docker-dev-stop:
	@echo "$(BLUE)🛑 Stopping dockerized development environment...$(NC)"
	@docker compose down
	@echo "$(GREEN)✅ Docker development environment stopped$(NC)"

# Complete reset of dockerized Hardhat development environment.
# Does not touch Frontier state — Frontier is opt-in (see frontier-* targets).
docker-dev-reset:
	@echo "$(BLUE)🔄 Resetting dockerized development environment...$(NC)"
	@echo "$(CYAN)1️⃣  Stopping and removing containers...$(NC)"
	@docker compose down -v --remove-orphans || true
	@sleep 3
	@echo "$(CYAN)2️⃣  Cleaning up data directories and lock files...$(NC)"
	@rm -rf data/hardhat-node/data/* data/hardhat-node/logs/*
	@rm -rf data/contracts
	@rm -rf data/graph
	@rm -rf data/postgres
	@rm -rf data/logs
	@echo "$(CYAN)3️⃣  Recreating directory structure...$(NC)"
	@mkdir -p data/{hardhat-node/{data,logs},contracts/{artifacts,cache,typechain-types},graph/data,ipfs/data,postgres}
	@echo "$(CYAN)4️⃣  Starting fresh environment...$(NC)"
	@make docker-dev
	@echo "$(GREEN)✅ Docker development environment reset complete!$(NC)"

# Deploy contracts to dockerized environment
docker-deploy:
	@echo "$(BLUE)🚀 Deploying contracts to dockerized environment...$(NC)"
	@echo "$(YELLOW)⚠️  Ensuring Docker environment is running...$(NC)"
	@docker compose ps | grep -q "gamedao-node.*Up" || { \
		echo "$(RED)❌ Docker environment not running. Starting now...$(NC)"; \
		make docker-dev; \
		sleep 5; \
	}
	@echo "$(CYAN)📋 Deploying contracts...$(NC)"
	@cd $(CONTRACTS_DIR) && DOCKER_DEV_MODE=true pnpm run deploy:localhost
	@echo "$(CYAN)📋 Updating shared package...$(NC)"
	@cd $(SHARED_DIR) && npm run build
	@echo "$(GREEN)✅ Docker deployment complete!$(NC)"
	@echo "$(CYAN)💡 Contract addresses available in: data/contracts/deployment-addresses.json$(NC)"

# Run scaffold against dockerized environment
docker-scaffold:
	@echo "$(BLUE)🏗️  Generating test data (Docker)...$(NC)"
	@cd $(CONTRACTS_DIR) && DOCKER_DEV_MODE=true pnpm run scaffold
	@echo "$(GREEN)✅ Test data generated successfully$(NC)"

# One-line full redeploy: reset env, deploy + auto-enable modules, grant admin,
# fund default account, and scaffold dev data (DAOs, campaigns, proposals, etc.).
# All inputs are overridable: ACCOUNT, RECIPIENT, ETH, GAME, USDC. Set
# SCAFFOLD=0 to skip the scaffold step (e.g. for fast unit-test iteration).
docker-deploy-all: docker-dev-reset deploy-local
	@echo "🏗️ Running full docker redeploy (deploy-local, grant-admin, send-tokens, scaffold)..."
	@$(MAKE) grant-admin ACCOUNT=$(or $(ACCOUNT),0xf0fe780c76ce610fc8df330971b99ba6f4429001)
	@$(MAKE) send-tokens RECIPIENT=$(or $(RECIPIENT),0xf0fe780c76ce610fc8df330971b99ba6f4429001) ETH=$(or $(ETH),10.0) GAME=$(or $(GAME),100000) USDC=$(or $(USDC),10000)
	@if [ "$(SCAFFOLD)" != "0" ]; then $(MAKE) scaffold; else echo "⏭  Skipping scaffold (SCAFFOLD=0)"; fi

# Check status of dockerized development environment
docker-status:
	@echo "$(BLUE)📊 Docker Development Environment Status$(NC)"
	@echo "$(CYAN)🐳 Container Status:$(NC)"
	@docker compose ps 2>/dev/null || echo "$(YELLOW)⚠️  Docker Compose not running$(NC)"
	@echo ""
	@echo "$(CYAN)🔍 Service Health Checks:$(NC)"
	@echo -n "  Hardhat Node: "
	@curl -s -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' http://localhost:8545 >/dev/null 2>&1 && echo "$(GREEN)✅ Running$(NC)" || echo "$(RED)❌ Not responding$(NC)"
	@echo -n "  Graph Node: "
	@curl -s http://localhost:8000 >/dev/null 2>&1 && echo "$(GREEN)✅ Running$(NC)" || echo "$(RED)❌ Not responding$(NC)"
	@echo -n "  IPFS: "
	@curl -s http://localhost:5001/api/v0/version >/dev/null 2>&1 && echo "$(GREEN)✅ Running$(NC)" || echo "$(RED)❌ Not responding$(NC)"
	@echo -n "  PostgreSQL: "
	@docker exec gamedao-db pg_isready -U graph-node >/dev/null 2>&1 && echo "$(GREEN)✅ Running$(NC)" || echo "$(RED)❌ Not responding$(NC)"
	@echo ""
	@echo "$(CYAN)📁 Data Directories:$(NC)"
	@echo "  - Hardhat Node: $(shell du -sh data/hardhat-node 2>/dev/null | cut -f1 || echo "0B")"
	@echo "  - Contracts: $(shell du -sh data/contracts 2>/dev/null | cut -f1 || echo "0B")"
	@echo "  - Graph Data: $(shell du -sh data/graph 2>/dev/null | cut -f1 || echo "0B")"
	@echo "  - IPFS Data: $(shell du -sh data/ipfs 2>/dev/null | cut -f1 || echo "0B")"
	@echo "  - PostgreSQL: $(shell du -sh data/postgres 2>/dev/null | cut -f1 || echo "0B")"
	@echo "  - Frontier Node: $(shell du -sh data/frontier-node 2>/dev/null | cut -f1 || echo "0B")"

# Frontier Node Build Targets
frontier-builder:
	@echo "$(CYAN)🔨 Building Frontier Builder Image$(NC)"
	@echo "$(YELLOW)⏳ This may take 5-10 minutes (one-time setup)$(NC)"
	@docker compose build frontier-builder
	@echo "$(GREEN)✅ Frontier builder image ready!$(NC)"
	@echo "$(CYAN)💡 Next: Run 'make frontier-build' to build the node$(NC)"

frontier-build:
	@echo "$(CYAN)🔨 Building Frontier Node Image$(NC)"
	@if ! docker images --format '{{.Repository}}:{{.Tag}}' | grep -q "^gamedao-frontier-builder:latest$$"; then \
		echo "$(YELLOW)⚠️  Builder image not found. Building it first...$(NC)"; \
		$(MAKE) frontier-builder; \
	fi
	@echo "$(YELLOW)⏳ Building node (uses cached builder - much faster)$(NC)"
	@docker compose build frontier-node
	@echo "$(GREEN)✅ Frontier node image ready!$(NC)"
	@echo "$(CYAN)💡 Run 'make frontier-up' to start the node$(NC)"

frontier-rebuild:
	@echo "$(CYAN)🔨 Rebuilding Frontier (Builder + Node) from Scratch$(NC)"
	@echo "$(YELLOW)⏳ This will take 35-70 minutes...$(NC)"
	@docker compose build --no-cache frontier-builder frontier-node
	@echo "$(GREEN)✅ Frontier rebuild complete!$(NC)"

frontier-up:
	@echo "$(CYAN)🚀 Starting Frontier Node$(NC)"
	@docker compose up -d frontier-node
	@echo "$(GREEN)✅ Frontier node starting...$(NC)"
	@echo "$(CYAN)💡 RPC available at http://localhost:8545$(NC)"
	@echo "$(CYAN)💡 Run 'make frontier-logs' to view logs$(NC)"

frontier-down:
	@echo "$(CYAN)🛑 Stopping Frontier Node$(NC)"
	@docker compose stop frontier-node
	@echo "$(GREEN)✅ Frontier node stopped$(NC)"

frontier-logs:
	@echo "$(CYAN)📋 Frontier Node Logs (Ctrl+C to exit)$(NC)"
	@docker compose logs -f frontier-node

# Migrate existing development data to Docker structure
migrate-to-docker:
	@echo "$(BLUE)📦 Migrating existing development data to Docker structure...$(NC)"
	@echo "$(CYAN)1️⃣  Creating data directories...$(NC)"
	@mkdir -p data/{hardhat-node/{data,logs},contracts/{artifacts,cache,typechain-types},graph/data,ipfs/data,postgres/data}
	@echo "$(CYAN)2️⃣  Migrating contract artifacts...$(NC)"
	@if [ -d "$(CONTRACTS_DIR)/artifacts" ]; then \
		cp -r $(CONTRACTS_DIR)/artifacts/* data/contracts/artifacts/ 2>/dev/null || true; \
		echo "  ✅ Artifacts migrated"; \
	fi
	@if [ -d "$(CONTRACTS_DIR)/cache" ]; then \
		cp -r $(CONTRACTS_DIR)/cache/* data/contracts/cache/ 2>/dev/null || true; \
		echo "  ✅ Cache migrated"; \
	fi
	@if [ -d "$(CONTRACTS_DIR)/typechain-types" ]; then \
		cp -r $(CONTRACTS_DIR)/typechain-types/* data/contracts/typechain-types/ 2>/dev/null || true; \
		echo "  ✅ TypeChain types migrated"; \
	fi
	@if [ -f "$(CONTRACTS_DIR)/deployment-addresses.json" ]; then \
		cp $(CONTRACTS_DIR)/deployment-addresses.json data/contracts/; \
		echo "  ✅ Deployment addresses migrated"; \
	fi
	@echo "$(CYAN)3️⃣  Migrating Graph data...$(NC)"
	@if [ -d "data/graph-node" ]; then \
		mkdir -p data/graph; \
		cp -r data/graph-node/* data/graph/ 2>/dev/null || true; \
		echo "  ✅ Graph data migrated"; \
	fi
	@echo "  ℹ️  IPFS and PostgreSQL data already in correct location"
	@echo "$(GREEN)✅ Migration to Docker structure complete!$(NC)"
	@echo "$(YELLOW)💡 You can now use 'make docker-dev' to start the dockerized environment$(NC)"

# Scaffolding targets
scaffold:
	@echo "$(BLUE)🏗️  Generating test data...$(NC)"
	@echo "$(YELLOW)⚠️  Ensure local node is running and contracts are deployed$(NC)"
	@cd $(CONTRACTS_DIR) && pnpm run scaffold
	@echo "$(GREEN)✅ Test data generated successfully$(NC)"


scaffold-copy:
	@echo "$(BLUE)📋 Copying scaffold data to frontend...$(NC)"
	@cd $(CONTRACTS_DIR) && node scripts/copy-scaffold-data.js
	@echo "$(GREEN)✅ Scaffold data copied to frontend$(NC)"

scaffold-full: scaffold scaffold-copy
	@echo "$(GREEN)✅ Full scaffold workflow complete (generate + copy)$(NC)"

scaffold-clean:
	@echo "$(BLUE)🧹 Cleaning scaffold data...$(NC)"
	@rm -f $(CONTRACTS_DIR)/scaffold-output.json
	@rm -f $(CONTRACTS_DIR)/extended-interactions-output.json
	@rm -f $(CONTRACTS_DIR)/generated-profiles.json
	@rm -f $(CONTRACTS_DIR)/deployment-addresses.json
	@rm -f $(FRONTEND_DIR)/public/scaffold-data.json
	@rm -f $(FRONTEND_DIR)/src/lib/scaffold-data.ts
	@echo "$(YELLOW)ℹ️  per-network manifests under packages/shared/src/deployments/ are not touched.$(NC)"
	@echo "$(GREEN)✅ Scaffold data cleaned$(NC)"

# Token transfer targets
send-tokens:
	@echo "$(BLUE)💰 Sending tokens...$(NC)"
	@if [ -z "$(RECIPIENT)" ]; then \
		echo "$(RED)❌ Error: RECIPIENT address is required$(NC)"; \
		echo "$(YELLOW)Usage: make send-tokens RECIPIENT=0x123... [ETH=1.0] [GAME=10000] [USDC=5000]$(NC)"; \
		echo "$(CYAN)Alternative: npx hardhat send-tokens --recipient 0x123... --eth 1.0 --game 10000 --usdc 5000$(NC)"; \
		exit 1; \
	fi
	@echo "$(CYAN)📋 Transfer Details:$(NC)"
	@echo "  Recipient: $(RECIPIENT)"
	@echo "  ETH: $(or $(ETH),1.0)"
	@echo "  GAME: $(or $(GAME),10000)"
	@echo "  USDC: $(or $(USDC),5000)"
	@echo "$(YELLOW)⚠️  Ensure local node is running and contracts are deployed$(NC)"
	@cd $(CONTRACTS_DIR) && RECIPIENT=$(RECIPIENT) ETH=$(or $(ETH),1.0) GAME=$(or $(GAME),10000) USDC=$(or $(USDC),5000) pnpm run send-tokens
	@echo "$(GREEN)✅ Token transfer completed$(NC)"

# === PROTOCOL ADMIN & MODULE MANAGEMENT ===

# Docker-aware network flag
DOCKER_ENV=$(if $(filter true,$(DOCKER)),DOCKER_DEV_MODE=true,)
HH_NETWORK?=localhost

# List all modules and their enabled/disabled status
module-list:
	@cd $(CONTRACTS_DIR) && $(DOCKER_ENV) pnpm exec hardhat module-list --network $(HH_NETWORK)

# Enable a module: make module-enable MODULE=CONTROL  (or MODULE=all)
module-enable:
	@if [ -z "$(MODULE)" ]; then \
		echo "$(RED)❌ MODULE is required$(NC)"; \
		echo "$(YELLOW)Usage: make module-enable MODULE=CONTROL$(NC)"; \
		echo "$(YELLOW)       make module-enable MODULE=all$(NC)"; \
		echo "$(CYAN)Valid modules: CONTROL, FLOW, IDENTITY, MEMBERSHIP, SENSE, SIGNAL$(NC)"; \
		exit 1; \
	fi
	@cd $(CONTRACTS_DIR) && $(DOCKER_ENV) pnpm exec hardhat module-enable $(MODULE) --network $(HH_NETWORK)

# Disable a module: make module-disable MODULE=SIGNAL  (or MODULE=all)
module-disable:
	@if [ -z "$(MODULE)" ]; then \
		echo "$(RED)❌ MODULE is required$(NC)"; \
		echo "$(YELLOW)Usage: make module-disable MODULE=SIGNAL$(NC)"; \
		echo "$(YELLOW)       make module-disable MODULE=all$(NC)"; \
		echo "$(CYAN)Valid modules: CONTROL, FLOW, IDENTITY, MEMBERSHIP, SENSE, SIGNAL$(NC)"; \
		exit 1; \
	fi
	@cd $(CONTRACTS_DIR) && $(DOCKER_ENV) pnpm exec hardhat module-disable $(MODULE) --network $(HH_NETWORK)

# Grant protocol admin roles to an account
grant-admin:
	@if [ -z "$(ACCOUNT)" ]; then \
		echo "$(RED)❌ ACCOUNT is required$(NC)"; \
		echo "$(YELLOW)Usage: make grant-admin ACCOUNT=0x...$(NC)"; \
		exit 1; \
	fi
	@cd $(CONTRACTS_DIR) && $(DOCKER_ENV) pnpm exec hardhat grant-admin $(ACCOUNT) --network $(HH_NETWORK)

# Seed an account with ETH, GAME tokens, and USDC
seed-account:
	@if [ -z "$(ACCOUNT)" ]; then \
		echo "$(RED)❌ ACCOUNT is required$(NC)"; \
		echo "$(YELLOW)Usage: make seed-account ACCOUNT=0x... [ETH=10] [GAME=100000] [USDC=10000]$(NC)"; \
		exit 1; \
	fi
	@cd $(CONTRACTS_DIR) && $(DOCKER_ENV) pnpm exec hardhat seed-account $(ACCOUNT) \
		--eth $(or $(ETH),10.0) --game $(or $(GAME),100000) --usdc $(or $(USDC),10000) \
		--network $(HH_NETWORK)

# Documentation targets
docs:
	@echo "$(BLUE)📚 Available documentation:$(NC)"
	@echo "$(CYAN)📋 Protocol Documentation:$(NC)"
	@echo "  - GIP-006: docs/gips/active/GIP-006-unified-id-and-name-system.md"
	@echo "  - Protocol Overview: docs/protocol/README.md"
	@echo "  - Implementation Status: docs/IMPLEMENTATION_STATUS.md"
	@echo "$(CYAN)📋 Module Documentation:$(NC)"
	@echo "  - Identity Module: docs/protocol/modules/identity/README.md"
	@echo "  - SenseSimplified Module: docs/protocol/modules/sense/README.md"
	@echo "$(GREEN)✅ Documentation available$(NC)"

# Code quality targets
lint:
	@echo "$(BLUE)🔍 Running linting...$(NC)"
	@cd $(CONTRACTS_DIR) && pnpm run lint || echo "$(YELLOW)⚠️  Linting not configured yet$(NC)"

format:
	@echo "$(BLUE)💅 Formatting code...$(NC)"
	@cd $(CONTRACTS_DIR) && pnpm run format || echo "$(YELLOW)⚠️  Formatting not configured yet$(NC)"

# Status and information targets
status:
	@echo "📊 System Status:"
	@echo "🔗 Hardhat Network:"
	@curl -s -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' http://localhost:8545 | grep -o '"result":"[^"]*"' || echo "❌ Hardhat not running"
	@echo ""
	@echo "📈 Subgraph:"
	@curl -s -X POST -H "Content-Type: application/json" --data '{"query":"query{organizations{id}}"}' http://localhost:8000/subgraphs/name/gamedao/protocol | grep -o '"data"' > /dev/null && echo "✅ Subgraph running" || echo "❌ Subgraph not running"
	@echo ""
	@echo "🖥️ Frontend:"
	@curl -s http://localhost:3000 > /dev/null && echo "✅ Frontend running" || echo "❌ Frontend not running"

# === UNIFIED DEPLOYMENT STRATEGY ===

.PHONY: deploy-local deploy-local-frontier deploy-local-clean validate-addresses

# Unified local deployment (Hardhat node). For Frontier use deploy-local-frontier.
# deploy.ts writes the per-network manifest into @gamedao/evm; we then rebuild
# the shared package, sync ABIs into the subgraph workspace, regenerate
# subgraph.yaml from the manifest, and deploy the subgraph.
deploy-local:
	@echo "🚀 Starting unified deployment to Hardhat node..."
	@echo "📋 Phase 1: Deploying contracts to Hardhat localhost..."
	cd packages/contracts-solidity && pnpm run deploy:localhost
	@echo "📋 Phase 2: Syncing ABIs and rebuilding shared package..."
	@$(MAKE) sync-abis
	cd packages/shared && pnpm run build
	@echo "📋 Phase 3: Waiting for graph-node JSON-RPC at :8020..."
	@$(MAKE) wait-graph-node
	@echo "📋 Phase 3.1: Updating subgraph addresses and deploying..."
	cd packages/subgraph && HARDHAT_NETWORK=localhost pnpm run update-addresses && pnpm run build && pnpm run create-local || echo "⚠️  Subgraph may already exist, continuing to deploy"
	cd packages/subgraph && pnpm run deploy-local
	@echo "📋 Phase 4: Validating address consistency..."
	@$(MAKE) validate-addresses
	@echo "✅ Unified deployment to Hardhat complete!"

# Poll graph-node until JSON-RPC responds. Fresh-postgres docker-dev starts can
# take 30s+ for graph-node to come up; the docker-dev recipe's 15s sleep is not
# always enough.
.PHONY: wait-graph-node
wait-graph-node:
	@i=0; while ! curl -s -o /dev/null -X POST -H "Content-Type: application/json" \
	    --data '{"jsonrpc":"2.0","method":"subgraph_list","params":[],"id":1}' \
	    http://localhost:8020/ 2>/dev/null; do \
	    i=$$((i+1)); \
	    if [ $$i -gt 60 ]; then echo "$(RED)❌ graph-node never came up at :8020$(NC)"; exit 1; fi; \
	    sleep 2; \
	done; \
	echo "$(GREEN)✅ graph-node responsive$(NC)"

# Explicit Frontier deployment task. Writes the same localhost manifest entry
# (Frontier and Hardhat share the chain layout via the @gamedao/evm shim).
deploy-local-frontier:
	@echo "🚀 Deploying contracts to Frontier node..."
	cd packages/contracts-solidity && pnpm run deploy:frontier
	@$(MAKE) sync-abis
	cd packages/shared && pnpm run build
	cd packages/subgraph && HARDHAT_NETWORK=localhost pnpm run update-addresses && pnpm run build && pnpm run create-local || echo "⚠️  Subgraph may already exist, continuing to deploy"
	cd packages/subgraph && pnpm run deploy-local
	@$(MAKE) validate-addresses
	@echo "✅ Frontier deployment complete!"

# Clean deployment (stops services, redeploys everything)
deploy-local-clean: stop-services
	@echo "🧹 Clean deployment with fresh services..."
	@$(MAKE) dev
	@sleep 10  # Wait for services to start
	@$(MAKE) deploy-local
	@echo "✅ Clean deployment complete!"

# Validate that all components use consistent addresses
validate-addresses:
	@echo "🔍 Validating address consistency across components..."
	@node -e " \
		const fs = require('fs'); \
		const manifest = require('./packages/shared/src/deployments/localhost.json'); \
		const shared = require('./packages/shared/dist/index.js'); \
		const subgraphYaml = fs.readFileSync('./packages/subgraph/subgraph.yaml', 'utf8'); \
		const cfg = shared.getConfig(31337); \
		const registryAddr = manifest.contracts.Registry.address; \
		console.log('📍 Manifest contracts:', Object.keys(manifest.contracts).length); \
		console.log('📍 getConfig(31337) Registry:', cfg.deployment.contracts.Registry.address); \
		if (cfg.deployment.contracts.Registry.address !== registryAddr) { console.error('❌ shared dist out of sync with manifest'); process.exit(1); } \
		if (!subgraphYaml.includes(registryAddr)) { console.error('❌ subgraph.yaml does not contain Registry', registryAddr); process.exit(1); } \
		console.log('✅ Manifest, shared dist, and subgraph.yaml all reference the same Registry'); \
	"

# === DEVELOPMENT WORKFLOW IMPROVEMENTS ===

# Quick test cycle: deploy contracts + run tests
test-cycle:
	@echo "🧪 Running test cycle..."
	cd packages/contracts-solidity && pnpm run deploy:localhost
	cd packages/contracts-solidity && npm test
	@echo "✅ Test cycle complete!"

# === VERCEL DEPLOYMENT ===

.PHONY: deploy-vercel-check deploy-vercel-staging deploy-vercel-prod

# Pre-deployment validation
deploy-vercel-check:
	@echo "$(BLUE)🔍 Running Vercel deployment checklist...$(NC)"
	@node scripts/vercel-deployment-checklist.js
	@echo "$(GREEN)✅ Vercel deployment validation complete$(NC)"

# Deploy to Vercel staging/preview
deploy-vercel-staging: deploy-vercel-check
	@echo "$(BLUE)🚀 Deploying to Vercel staging...$(NC)"
	@vercel --yes
	@echo "$(GREEN)✅ Vercel staging deployment complete$(NC)"

# Deploy to Vercel production
deploy-vercel-prod: deploy-vercel-check
	@echo "$(RED)🚨 VERCEL PRODUCTION DEPLOYMENT - ARE YOU SURE? (y/N)$(NC)"
	@read -r REPLY; \
	if [ "$$REPLY" = "y" ] || [ "$$REPLY" = "Y" ]; then \
		echo "$(BLUE)🚀 Deploying to Vercel production...$(NC)"; \
		vercel --prod --yes; \
		echo "$(GREEN)✅ Vercel production deployment complete$(NC)"; \
	else \
		echo "$(YELLOW)⚠️  Vercel production deployment cancelled$(NC)"; \
	fi

# Error handling
.ONESHELL:
.SHELLFLAGS = -e
.DELETE_ON_ERROR:

# === ABI SYNC (Contracts → Subgraph) ===
.PHONY: sync-abis
sync-abis:
	@echo "📋 Syncing ABIs to subgraph/abis (copy only if newer)..."
	@src="packages/contracts-solidity/artifacts/contracts/modules/Control/Factory.sol/Factory.json"; \
	dst="packages/subgraph/abis/Factory.json"; \
	if [ -f "$$src" ]; then \
	  if [ ! -f "$$dst" ] || [ "$$src" -nt "$$dst" ]; then cp "$$src" "$$dst" && echo "  ✅ Factory.json"; else echo "  ↪ Factory.json up-to-date"; fi; \
	else echo "  ⚠️  Missing $$src"; fi
	@src="packages/contracts-solidity/artifacts/contracts/modules/Control/Control.sol/Control.json"; \
	dst="packages/subgraph/abis/Control.json"; \
	if [ -f "$$src" ]; then \
	  if [ ! -f "$$dst" ] || [ "$$src" -nt "$$dst" ]; then cp "$$src" "$$dst" && echo "  ✅ Control.json"; else echo "  ↪ Control.json up-to-date"; fi; \
	else echo "  ⚠️  Missing $$src"; fi
	@src="packages/contracts-solidity/artifacts/contracts/modules/Flow/Flow.sol/Flow.json"; \
	dst="packages/subgraph/abis/Flow.json"; \
	if [ -f "$$src" ]; then \
	  if [ ! -f "$$dst" ] || [ "$$src" -nt "$$dst" ]; then cp "$$src" "$$dst" && echo "  ✅ Flow.json"; else echo "  ↪ Flow.json up-to-date"; fi; \
	else echo "  ⚠️  Missing $$src"; fi
	@src="packages/contracts-solidity/artifacts/contracts/modules/Signal/Signal.sol/Signal.json"; \
	dst="packages/subgraph/abis/Signal.json"; \
	if [ -f "$$src" ]; then \
	  if [ ! -f "$$dst" ] || [ "$$src" -nt "$$dst" ]; then cp "$$src" "$$dst" && echo "  ✅ Signal.json"; else echo "  ↪ Signal.json up-to-date"; fi; \
	else echo "  ⚠️  Missing $$src"; fi
	@echo "✅ ABI sync complete"
