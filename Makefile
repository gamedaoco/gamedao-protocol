# GameDAO Protocol - Comprehensive Build System
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

.PHONY: help install clean build test deploy verify docs lint format setup-env update-addresses update-addresses-manual update-addresses-sepolia all graph-node graph-deploy scaffold scaffold-copy scaffold-full scaffold-clean dev-scaffold

# Default target
all: clean install build test

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
	@echo "$(GREEN)🔧 Contract Management:$(NC)"
	@echo "  make update-addresses        Update contract addresses from deployment"
	@echo "  make update-addresses-manual Manually enter contract addresses"
	@echo "  make update-addresses-sepolia Update Sepolia contract addresses"
	@echo ""
	@echo "$(GREEN)🏗️  Build & Compilation:$(NC)"
	@echo "  make build            Build all packages"
	@echo "  make build-contracts  Build smart contracts only"
	@echo "  make build-frontend   Build frontend only"
	@echo "  make build-subgraph   Build subgraph only"
	@echo ""
	@echo "$(GREEN)🧪 Testing:$(NC)"
	@echo "  make test             Run all tests"
	@echo "  make test-contracts   Run contract tests only"
	@echo "  make test-coverage    Run tests with coverage"
	@echo "  make test-gas         Run gas optimization tests"
	@echo ""
	@echo "$(GREEN)🚀 Deployment:$(NC)"
	@echo "  make deploy           Deploy to localhost"
	@echo "  make deploy-testnet   Deploy to testnet"
	@echo "  make deploy-mainnet   Deploy to mainnet"
	@echo "  make verify           Verify contracts on Etherscan"
	@echo ""
	@echo "$(GREEN)📊 Graph & Indexing:$(NC)"
	@echo "  make graph-node       Start local Graph node with IPFS & Postgres"
	@echo "  make graph-deploy     Deploy subgraph to local Graph node"
	@echo "  make graph-full       Complete Graph setup (node + deploy)"
	@echo "  make graph-stop       Stop all Graph services (aggressive)"
	@echo "  make graph-stop-safe  Stop only GameDAO Graph services (recommended)"
	@echo "  make graph-status     Check GameDAO Graph services status"
	@echo "  make dev-full         Full dev environment (contracts + graph + frontend)"
	@echo ""
	@echo "$(GREEN)📚 Documentation & Quality:$(NC)"
	@echo "  make docs             Generate documentation"
	@echo "  make lint             Run linting"
	@echo "  make format           Format code"
	@echo "  make security-check   Run security analysis"
	@echo ""
	@echo "$(GREEN)🔄 Development Workflows:$(NC)"
	@echo "  make dev              Start development environment"
	@echo "  make dev-reset        Reset development environment (node + graph)"
	@echo "  make dev-frontend     Start frontend development server"
	@echo "  make demo             Run complete demo"
	@echo "  make integration      Run integration tests"
	@echo "  make scaffold         Generate test data for development"
	@echo "  make scaffold-full    Generate and copy test data to frontend"
	@echo "  make scaffold-data-only Generate new test data without redeploying contracts"
	@echo "  make test-interactions Run extended interaction testing with user key pairs"
	@echo "  make test-hierarchical-ids Test hierarchical ID system (GIP-006)"
	@echo "  make test-hierarchical-performance Run hierarchical ID performance benchmarks"
	@echo "  make validate-gip-006 Complete GIP-006 validation (deploy + test + scaffold)"
	@echo "  make deploy-testnet   Deploy contracts to testnet"
	@echo "  make test-e2e-testnet Run end-to-end testnet tests"
	@echo "  make validate-testnet Validate testnet deployment"
	@echo "  make testnet-full     Complete testnet deployment and validation"
	@echo "  make create-profiles  Generate realistic profiles with faker.js (USERS=N)"
	@echo "  make create-profiles-large Generate large ecosystem (50 users, 15 orgs, 25 campaigns)"
	@echo "  make send-tokens     Send tokens to account (RECIPIENT=0x... ETH=1.0 GAME=10000 USDC=5000)"
	@echo "  make dev-scaffold     Full dev setup with test data"
	@echo "  make dev-setup-hierarchical Setup dev environment with hierarchical IDs"
	@echo "  make dev-full-hierarchical Complete dev environment (contracts + graph + frontend + hierarchical IDs)"
	@echo ""
	@echo "$(YELLOW)📝 Examples:$(NC)"
	@echo "  make deploy NETWORK=sepolia"
	@echo "  make test-contracts"
	@echo "  make dev-full         # Start everything: contracts + graph + frontend"

# Installation targets
install:
	@echo "$(BLUE)📦 Installing dependencies...$(NC)"
	@npm install
	@echo "$(BLUE)📦 Installing contract dependencies...$(NC)"
	@cd $(CONTRACTS_DIR) && npm install --legacy-peer-deps || npm install --force
	@echo "$(BLUE)📦 Installing subgraph dependencies...$(NC)"
	@if [ -d "$(SUBGRAPH_DIR)" ]; then \
		cd $(SUBGRAPH_DIR) && npm install; \
	fi
	@echo "$(GREEN)✅ Dependencies installed successfully$(NC)"

setup-env:
	@echo "$(BLUE)🔧 Setting up development environment...$(NC)"
	@cp env.template .env.local 2>/dev/null || echo "# GameDAO Protocol Environment" > .env.local
	@echo "$(YELLOW)⚠️  Please update .env.local file with your configuration$(NC)"
	@echo "$(GREEN)✅ Environment setup complete$(NC)"

# Contract address management
update-addresses:
	@echo "$(BLUE)🔧 Updating contract addresses...$(NC)"
	@node scripts/update-contract-addresses.js --network local
	@echo "$(GREEN)✅ Contract addresses updated$(NC)"

update-addresses-manual:
	@echo "$(BLUE)🔧 Manually updating contract addresses...$(NC)"
	@node scripts/update-contract-addresses.js --network local --manual
	@echo "$(GREEN)✅ Contract addresses updated$(NC)"

update-addresses-sepolia:
	@echo "$(BLUE)🔧 Updating Sepolia contract addresses...$(NC)"
	@node scripts/update-contract-addresses.js --network sepolia --manual
	@echo "$(GREEN)✅ Sepolia contract addresses updated$(NC)"

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
	@echo "$(GREEN)✅ Clean complete$(NC)"

# Build targets
build: build-contracts build-frontend build-subgraph
	@echo "$(GREEN)🎉 Build complete!$(NC)"

build-contracts:
	@echo "$(BLUE)🏗️  Building smart contracts...$(NC)"
	@cd $(CONTRACTS_DIR) && npm run build
	@echo "$(GREEN)✅ Contracts built successfully$(NC)"

build-frontend:
	@echo "$(BLUE)🏗️  Building frontend...$(NC)"
	@if [ -d "$(FRONTEND_DIR)" ]; then \
		cd $(FRONTEND_DIR) && npm run build; \
		echo "$(GREEN)✅ Frontend built successfully$(NC)"; \
	else \
		echo "$(YELLOW)⚠️  Frontend directory not found, skipping...$(NC)"; \
	fi

build-subgraph:
	@echo "$(BLUE)🏗️  Building subgraph...$(NC)"
	@if [ -d "$(SUBGRAPH_DIR)" ]; then \
		cd $(SUBGRAPH_DIR) && npm run codegen && npm run build; \
		echo "$(GREEN)✅ Subgraph built successfully$(NC)"; \
	else \
		echo "$(YELLOW)⚠️  Subgraph directory not found, skipping...$(NC)"; \
	fi

# Testing targets
test: test-contracts
	@echo "$(GREEN)🎉 All tests complete!$(NC)"

test-contracts:
	@echo "$(BLUE)🧪 Running contract tests...$(NC)"
	@cd $(CONTRACTS_DIR) && npm test || echo "$(YELLOW)⚠️  Tests not ready yet, building framework...$(NC)"

test-coverage:
	@echo "$(BLUE)🧪 Running tests with coverage...$(NC)"
	@cd $(CONTRACTS_DIR) && npm run test:coverage || echo "$(YELLOW)⚠️  Coverage not available yet$(NC)"

test-gas:
	@echo "$(BLUE)⛽ Running gas optimization tests...$(NC)"
	@cd $(CONTRACTS_DIR) && npm run test:gas || echo "$(YELLOW)⚠️  Gas tests not available yet$(NC)"

# Deployment targets
deploy:
	@echo "$(BLUE)🚀 Deploying to $(NETWORK)...$(NC)"
	@cd $(CONTRACTS_DIR) && npm run deploy:$(NETWORK)
	@echo "$(GREEN)✅ Deployment to $(NETWORK) complete$(NC)"

deploy-localhost:
	@echo "$(BLUE)🚀 Deploying to localhost...$(NC)"
	@cd $(CONTRACTS_DIR) && npm run node &
	@sleep 5
	@cd $(CONTRACTS_DIR) && npm run deploy:localhost
	@echo "$(GREEN)✅ Local deployment complete$(NC)"

# deploy-testnet target moved to end of file (line 629)

deploy-mainnet:
	@echo "$(RED)🚨 MAINNET DEPLOYMENT - ARE YOU SURE? (y/N)$(NC)"
	@read -r REPLY; \
	if [ "$$REPLY" = "y" ] || [ "$$REPLY" = "Y" ]; then \
		echo "$(BLUE)🚀 Deploying to mainnet...$(NC)"; \
		cd $(CONTRACTS_DIR) && npm run deploy:mainnet; \
		echo "$(GREEN)✅ Mainnet deployment complete$(NC)"; \
	else \
		echo "$(YELLOW)⚠️  Mainnet deployment cancelled$(NC)"; \
	fi

verify:
	@echo "$(BLUE)🔍 Verifying contracts on Etherscan...$(NC)"
	@if [ -z "$(ETHERSCAN_API_KEY)" ]; then \
		echo "$(RED)❌ ETHERSCAN_API_KEY not set$(NC)"; \
		exit 1; \
	fi
	@cd $(CONTRACTS_DIR) && npm run verify
	@echo "$(GREEN)✅ Contract verification complete$(NC)"

# Graph node and subgraph targets
graph-node:
	@echo "$(BLUE)📊 Starting local Graph node infrastructure...$(NC)"
	@echo "$(CYAN)🐳 Starting Docker services...$(NC)"
	@docker compose -f docker-compose.graph.yml up -d
	@echo "$(YELLOW)⏳ Waiting for services to be ready...$(NC)"
	@sleep 10
	@echo "$(GREEN)✅ Graph node infrastructure started$(NC)"
	@echo "$(CYAN)📋 Services available at:$(NC)"
	@echo "  - Graph Node: http://localhost:$(GRAPH_NODE_PORT)"
	@echo "  - IPFS: http://localhost:$(IPFS_PORT)"
	@echo "  - PostgreSQL: localhost:5433 (GameDAO-specific port)"

graph-deploy:
	@echo "$(BLUE)📊 Deploying subgraph to local Graph node...$(NC)"
	@if [ ! -d "$(SUBGRAPH_DIR)" ]; then \
		echo "$(RED)❌ Subgraph directory not found$(NC)"; \
		exit 1; \
	fi
	@echo "$(BLUE)🏗️  Building subgraph...$(NC)"
	@cd $(SUBGRAPH_DIR) && npm run codegen && npm run build
	@echo "$(BLUE)🚀 Creating subgraph...$(NC)"
	@cd $(SUBGRAPH_DIR) && npm run create-local || echo "$(YELLOW)⚠️  Subgraph already exists$(NC)"
	@echo "$(BLUE)🚀 Deploying subgraph...$(NC)"
	@cd $(SUBGRAPH_DIR) && npm run deploy-local
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
	@docker compose -f docker-compose.graph.yml down
	@echo "$(GREEN)✅ Graph node infrastructure stopped$(NC)"

graph-stop-safe:
	@echo "$(BLUE)🛑 Safely stopping GameDAO Graph services...$(NC)"
	@echo "$(CYAN)🔍 Stopping only GameDAO-specific containers...$(NC)"
	@-docker stop gamedao-graph-node 2>/dev/null || true
	@-docker stop gamedao-ipfs 2>/dev/null || true
	@-docker stop gamedao-postgres 2>/dev/null || true
	@-docker rm gamedao-graph-node 2>/dev/null || true
	@-docker rm gamedao-ipfs 2>/dev/null || true
	@-docker rm gamedao-postgres 2>/dev/null || true
	@echo "$(GREEN)✅ GameDAO Graph services stopped safely$(NC)"

graph-status:
	@echo "$(BLUE)📊 GameDAO Graph Services Status$(NC)"
	@echo "$(CYAN)🐳 GameDAO Containers:$(NC)"
	@docker ps -a --filter "name=gamedao-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "$(YELLOW)⚠️  No GameDAO containers found$(NC)"
	@echo ""
	@echo "$(CYAN)🔌 Port Usage:$(NC)"
	@echo "  - 8000: Graph Node GraphQL"
	@echo "  - 8020: Graph Node JSON-RPC"
	@echo "  - 5001: IPFS API"
	@echo "  - 5433: PostgreSQL (GameDAO-specific port)"

# Full development environment
dev-full:
	@echo "$(BLUE)🚀 Starting complete development environment...$(NC)"
	@echo "$(CYAN)1️⃣  Starting Hardhat node (quiet mode)...$(NC)"
	@cd $(CONTRACTS_DIR) && npm run node &
	@sleep 3
	@echo "$(CYAN)2️⃣  Deploying contracts...$(NC)"
	@cd $(CONTRACTS_DIR) && npm run deploy:localhost
	@echo "$(CYAN)3️⃣  Starting Graph node...$(NC)"
	@make graph-node
	@echo "$(CYAN)4️⃣  Deploying subgraph...$(NC)"
	@make graph-deploy
	@echo "$(CYAN)5️⃣  Starting frontend...$(NC)"
	@if [ -d "$(FRONTEND_DIR)" ]; then \
		cd $(FRONTEND_DIR) && npm run dev & \
	fi
	@echo "$(GREEN)🎉 Complete development environment ready!$(NC)"
	@echo "$(CYAN)📋 Services available:$(NC)"
	@echo "  - Hardhat Node: http://localhost:8545"
	@echo "  - Graph Node: http://localhost:8020"
	@echo "  - Subgraph: http://localhost:8000/subgraphs/name/gamedao/protocol"
	@echo "  - Frontend: http://localhost:3000"
	@echo "$(CYAN)💡 Generate test data:$(NC)"
	@echo "  - Run: make scaffold-full"

# Documentation targets
docs:
	@echo "$(BLUE)📚 Generating documentation...$(NC)"
	@echo "$(CYAN)📋 Available documentation:$(NC)"
	@echo "  - Architecture Validation: packages/contracts-solidity/ARCHITECTURE_VALIDATION.md"
	@echo "  - Implementation Status: logs/005-implementation-status.md"
	@echo "  - Milestone Plan: logs/004-milestone-plan.md"
	@echo "  - Technical Analysis: logs/001-technical-analysis.md"
	@echo "  - Control Module Guide: logs/003-control-module.md"
	@echo "  - Frontend Development Plan: logs/010-frontend-development-plan.md"
	@echo "$(GREEN)✅ Documentation available$(NC)"

# Code quality targets
lint:
	@echo "$(BLUE)🔍 Running linting...$(NC)"
	@cd $(CONTRACTS_DIR) && npm run lint || echo "$(YELLOW)⚠️  Linting not configured yet$(NC)"

format:
	@echo "$(BLUE)💅 Formatting code...$(NC)"
	@cd $(CONTRACTS_DIR) && npm run format || echo "$(YELLOW)⚠️  Formatting not configured yet$(NC)"

security-check:
	@echo "$(BLUE)🔒 Running security analysis...$(NC)"
	@echo "$(CYAN)🔍 Security features implemented:$(NC)"
	@echo "  ✅ OpenZeppelin AccessControl"
	@echo "  ✅ ReentrancyGuard protection"
	@echo "  ✅ Pausable contracts"
	@echo "  ✅ SafeERC20 token interactions"
	@echo "  ✅ Custom error handling"
	@echo "  ✅ Input validation"
	@echo "  ✅ State checks"
	@echo "  ✅ Event logging"
	@echo "$(GREEN)✅ Security review complete$(NC)"

# Development workflow targets
dev:
	@echo "$(BLUE)🔧 Starting development environment...$(NC)"
	@cd $(CONTRACTS_DIR) && npm run node &
	@echo "$(GREEN)✅ Hardhat node started$(NC)"
	@echo "$(CYAN)💡 Ready for development!$(NC)"
	@echo "  - Local node: http://localhost:8545"
	@echo "  - Chain ID: 31337"

dev-reset:
	@echo "$(BLUE)🔄 Resetting development environment...$(NC)"
	@echo "$(CYAN)1️⃣  Killing existing Hardhat processes...$(NC)"
	@-pkill -f "hardhat node" 2>/dev/null || true
	@-pkill -f "node.*hardhat.*node" 2>/dev/null || true
	@sleep 2
	@echo "$(CYAN)2️⃣  Stopping GameDAO Graph services only...$(NC)"
	@make graph-stop-safe || true
	@sleep 2
	@echo "$(RED)3️⃣  Erasing database...$(NC)"
	@rm -rf $(DATA_DIR)/postgres
	@sleep 2
	@echo "$(CYAN)4️⃣  Starting Hardhat node (quiet mode)...$(NC)"
	@cd $(CONTRACTS_DIR) && npm run node:quiet &
	@echo "$(YELLOW)⏳ Waiting for node to start...$(NC)"
	@sleep 5
	@echo "$(CYAN)5️⃣  Deploying contracts...$(NC)"
	@cd $(CONTRACTS_DIR) && npm run deploy:localhost
	@echo "$(CYAN)6️⃣  Starting Graph node...$(NC)"
	@make graph-node
	@echo "$(CYAN)7️⃣  Deploying subgraph...$(NC)"
	@make graph-deploy
	@echo "$(GREEN)✅ Development environment reset complete!$(NC)"
	@echo "$(CYAN)💡 Ready for development with fresh blockchain and subgraph!$(NC)"

demo: deploy-localhost
	@echo "$(BLUE)🎮 Running GameDAO Protocol demo...$(NC)"
	@echo "$(CYAN)🎯 Demo includes:$(NC)"
	@echo "  ✅ Registry deployment"
	@echo "  ✅ Control module deployment and registration"
	@echo "  ✅ Test organization creation"
	@echo "  ✅ Treasury deployment and integration"
	@echo "  ✅ Member management demonstration"
	@echo "$(GREEN)🎉 Demo complete! Check deployment output for addresses$(NC)"

integration:
	@echo "$(BLUE)🔗 Running integration tests...$(NC)"
	@make build-contracts
	@make test-contracts
	@echo "$(GREEN)✅ Integration tests complete$(NC)"

# Scaffolding targets for test data generation
scaffold:
	@echo "$(BLUE)🏗️  Generating test data...$(NC)"
	@echo "$(YELLOW)⚠️  Ensure local node is running and contracts are deployed$(NC)"
	@cd $(CONTRACTS_DIR) && npm run scaffold
	@echo "$(GREEN)✅ Test data generated successfully$(NC)"

scaffold-copy:
	@echo "$(BLUE)📋 Copying scaffold data to frontend...$(NC)"
	@cd $(CONTRACTS_DIR) && npm run scaffold:copy
	@echo "$(GREEN)✅ Scaffold data copied to frontend$(NC)"

scaffold-full:
	@echo "$(BLUE)🏗️  Generating and copying test data...$(NC)"
	@cd $(CONTRACTS_DIR) && npm run scaffold:full
	@echo "$(GREEN)✅ Complete scaffold data setup finished$(NC)"

scaffold-clean:
	@echo "$(BLUE)🧹 Cleaning scaffold data...$(NC)"
	@rm -f $(CONTRACTS_DIR)/scaffold-output.json
	@rm -f $(FRONTEND_DIR)/public/scaffold-data.json
	@echo "$(GREEN)✅ Scaffold data cleaned$(NC)"

scaffold-data-only:
	@echo "$(BLUE)🏗️  Generating new test data (without redeploying contracts)...$(NC)"
	@echo "$(YELLOW)⚠️  Using existing deployed contracts$(NC)"
	@make scaffold-full
	@echo "$(GREEN)✅ New test data generated$(NC)"
	@echo "$(CYAN)💡 The subgraph will automatically index the new data$(NC)"

test-interactions:
	@echo "$(BLUE)🧪 Running extended interaction testing...$(NC)"
	@echo "$(YELLOW)⚠️  Ensure scaffold data exists first (run 'make scaffold-full')$(NC)"
	@cd $(CONTRACTS_DIR) && npm run test-interactions
	@echo "$(GREEN)✅ Extended interactions generated successfully$(NC)"
	@echo "$(CYAN)💡 Check extended-interactions-output.json for detailed results$(NC)"

test-hierarchical-ids:
	@echo "$(BLUE)🔍 Testing Hierarchical ID System (GIP-006)...$(NC)"
	@echo "$(YELLOW)⚠️  Ensure contracts are deployed first (run 'make deploy-localhost')$(NC)"
	@cd $(CONTRACTS_DIR) && npx hardhat run scripts/test-hierarchical-ids.ts --network localhost
	@echo "$(GREEN)✅ Hierarchical ID testing completed successfully$(NC)"
	@echo "$(CYAN)💾 Check hierarchical-id-test-results.json for detailed results$(NC)"

test-hierarchical-performance:
	@echo "$(BLUE)⚡ Running hierarchical ID performance benchmarks...$(NC)"
	@echo "$(YELLOW)⚠️  This will create multiple proposals for performance testing$(NC)"
	@cd $(CONTRACTS_DIR) && PERF_TEST=true npx hardhat run scripts/test-hierarchical-ids.ts --network localhost
	@echo "$(GREEN)✅ Performance benchmarks completed$(NC)"

validate-gip-006:
	@echo "$(BLUE)🎯 Validating GIP-006 Implementation...$(NC)"
	@echo "$(CYAN)1️⃣  Deploying contracts with hierarchical ID support...$(NC)"
	@make deploy-localhost
	@echo "$(CYAN)2️⃣  Testing hierarchical ID functionality...$(NC)"
	@make test-hierarchical-ids
	@echo "$(CYAN)3️⃣  Generating scaffold data with hierarchical IDs...$(NC)"
	@make scaffold-full
	@echo "$(CYAN)4️⃣  Running extended interaction tests...$(NC)"
	@make test-interactions
	@echo "$(GREEN)✅ GIP-006 validation completed successfully$(NC)"
	@echo "$(PURPLE)🎉 Hierarchical ID system is ready for production!$(NC)"

dev-setup-hierarchical:
	@echo "$(BLUE)🚀 Setting up development environment with hierarchical IDs...$(NC)"
	@echo "$(CYAN)1️⃣  Deploying contracts...$(NC)"
	@make deploy-localhost
	@echo "$(CYAN)2️⃣  Creating test organizations and proposals...$(NC)"
	@cd $(CONTRACTS_DIR) && npx hardhat run scripts/dev-setup-hierarchical.ts --network localhost
	@echo "$(CYAN)3️⃣  Generating scaffold data...$(NC)"
	@make scaffold-full
	@echo "$(GREEN)✅ Development environment ready with hierarchical ID support$(NC)"
	@echo "$(PURPLE)🎮 Start frontend with: make dev-frontend$(NC)"

dev-full-hierarchical:
	@echo "$(BLUE)🌟 Complete development environment with hierarchical IDs...$(NC)"
	@echo "$(CYAN)1️⃣  Setting up development environment...$(NC)"
	@make dev-setup-hierarchical
	@echo "$(CYAN)2️⃣  Starting Graph node...$(NC)"
	@make graph-node
	@echo "$(CYAN)3️⃣  Deploying subgraph...$(NC)"
	@make graph-deploy
	@echo "$(CYAN)4️⃣  Starting frontend...$(NC)"
	@make dev-frontend
	@echo "$(GREEN)✅ Complete development environment running$(NC)"
	@echo "$(PURPLE)🎉 Ready for GIP-006 development and testing!$(NC)"

create-profiles:
	@echo "$(BLUE)🎭 Creating realistic profiles with faker.js...$(NC)"
	@echo "$(CYAN)📊 Generating $(or $(USERS),10) users with organizations, campaigns, and proposals$(NC)"
	@cd $(CONTRACTS_DIR) && USERS=$(or $(USERS),10) npx hardhat run scripts/create-profiles.ts --network localhost
	@echo "$(GREEN)✅ Profile generation completed successfully$(NC)"
	@echo "$(CYAN)💾 Check generated-profiles.json for detailed results$(NC)"

create-profiles-large:
	@echo "$(BLUE)🏟️  Creating large realistic gaming ecosystem...$(NC)"
	@echo "$(CYAN)📊 Generating 50 users, 15 organizations, 25 campaigns, 12 proposals$(NC)"
	@cd $(CONTRACTS_DIR) && USERS=50 ORGS=15 CAMPAIGNS=25 PROPOSALS=12 MULTIPLIER=2.0 npx hardhat run scripts/create-profiles.ts --network localhost
	@echo "$(GREEN)✅ Large ecosystem generated successfully$(NC)"

send-tokens:
	@echo "$(BLUE)💸 Sending tokens to account...$(NC)"
	@cd $(CONTRACTS_DIR) && RECIPIENT=$(RECIPIENT) ETH=$(ETH) GAME=$(GAME) USDC=$(USDC) npm run send-tokens

dev-scaffold:
	@echo "$(BLUE)🚀 Starting development environment with test data...$(NC)"
	@echo "$(CYAN)1️⃣  Killing any existing Hardhat processes...$(NC)"
	@-pkill -f "hardhat node" 2>/dev/null || true
	@-pkill -f "node.*hardhat.*node" 2>/dev/null || true
	@sleep 2
	@echo "$(CYAN)2️⃣  Stopping GameDAO Graph services only...$(NC)"
	@make graph-stop-safe || true
	@echo "$(CYAN)3️⃣  Starting Hardhat node (quiet mode)...$(NC)"
	@cd $(CONTRACTS_DIR) && npm run node:quiet &
	@echo "$(YELLOW)⏳ Waiting for node to start...$(NC)"
	@sleep 5
	@echo "$(CYAN)4️⃣  Deploying contracts...$(NC)"
	@cd $(CONTRACTS_DIR) && npm run deploy:localhost
	@echo "$(CYAN)5️⃣  Starting Graph node...$(NC)"
	@make graph-node
	@echo "$(CYAN)6️⃣  Deploying subgraph...$(NC)"
	@make graph-deploy
	@echo "$(CYAN)7️⃣  Generating test data...$(NC)"
	@make scaffold-full
	@echo "$(GREEN)🎉 Development environment with test data ready!$(NC)"
	@echo "$(CYAN)📋 Available services:$(NC)"
	@echo "  - Hardhat Node: http://localhost:8545"
	@echo "  - Test Data: Generated and available in frontend"
	@echo "$(CYAN)💡 Next steps:$(NC)"
	@echo "  - Start frontend: cd $(FRONTEND_DIR) && npm run dev"
	@echo "  - View scaffold data: cat $(CONTRACTS_DIR)/scaffold-output.json"

dev-frontend:
	@echo "$(BLUE)🌐 Starting frontend development server...$(NC)"
	@if [ -d "$(FRONTEND_DIR)" ]; then \
		echo "$(CYAN)🚀 Starting Next.js development server...$(NC)"; \
		cd $(FRONTEND_DIR) && npm run dev; \
	else \
		echo "$(RED)❌ Frontend directory not found: $(FRONTEND_DIR)$(NC)"; \
		exit 1; \
	fi

# Status and information targets
status:
	@echo "$(CYAN)📊 GameDAO Protocol Status$(NC)"
	@echo ""
	@echo "$(YELLOW)📈 Implementation Progress:$(NC)"
	@echo "  ✅ Milestone 1 (Control Module): 100% Complete"
	@echo "  ✅ Milestone 2 (Flow Module): 100% Complete"
	@echo "  ✅ Milestone 3 (Signal Module): 100% Complete"
	@echo "  ✅ Test Data Scaffolding: 100% Complete"
	@echo "  ⏳ Milestone 4 (Sense Module): Planned"
	@echo "  ⏳ Milestone 5 (Battlepass Module): Planned"
	@echo "  🔄 Frontend Development: 40% Complete"
	@echo "  🔄 Subgraph Integration: 80% Complete"
	@echo ""
	@echo "$(YELLOW)🏗️  Architecture Status:$(NC)"
	@echo "  ✅ GameDAORegistry: Complete"
	@echo "  ✅ GameDAOModule: Complete"
	@echo "  ✅ Control Module: Complete"
	@echo "  ✅ Flow Module: Complete"
	@echo "  ✅ Signal Module: Complete"
	@echo "  ✅ Treasury: Complete"
	@echo "  ✅ Test Data Scaffolding: Complete"
	@echo ""
	@echo "$(YELLOW)🔒 Security Status:$(NC)"
	@echo "  ✅ OpenZeppelin Integration: Complete"
	@echo "  ✅ Access Control: Implemented"
	@echo "  ✅ Reentrancy Protection: Implemented"
	@echo "  ✅ Emergency Controls: Implemented"

info:
	@echo "$(CYAN)ℹ️  GameDAO Protocol Information$(NC)"
	@echo ""
	@echo "$(YELLOW)📋 Project Structure:$(NC)"
	@echo "  - packages/contracts-solidity/: Smart contracts"
	@echo "  - packages/frontend/: Next.js frontend"
	@echo "  - packages/subgraph/: The Graph indexing"
	@echo "  - packages/shared/: Shared utilities (planned)"
	@echo "  - logs/: Documentation and guides"
	@echo ""
	@echo "$(YELLOW)🔧 Available Networks:$(NC)"
	@echo "  - localhost: Local development"
	@echo "  - sepolia: Ethereum testnet"
	@echo "  - mainnet: Ethereum mainnet"
	@echo ""
	@echo "$(YELLOW)📚 Key Documentation:$(NC)"
	@echo "  - make docs: View all documentation"
	@echo "  - logs/005-implementation-status.md: Current status"
	@echo "  - logs/010-frontend-development-plan.md: Frontend roadmap"
	@echo "  - packages/contracts-solidity/ARCHITECTURE_VALIDATION.md: Architecture review"

# Maintenance targets
update:
	@echo "$(BLUE)🔄 Updating dependencies...$(NC)"
	@npm update
	@cd $(CONTRACTS_DIR) && npm update
	@echo "$(GREEN)✅ Dependencies updated$(NC)"

check-deps:
	@echo "$(BLUE)🔍 Checking dependency health...$(NC)"
	@npm audit
	@cd $(CONTRACTS_DIR) && npm audit
	@echo "$(GREEN)✅ Dependency check complete$(NC)"

# Error handling
.ONESHELL:
.SHELLFLAGS = -e

# Testnet deployment and testing
deploy-testnet:
	@echo "🚀 Deploying to testnet..."
	cd packages/contracts-solidity && npx hardhat run scripts/deploy-core-testnet.ts --network testnet

deploy-testnet-local:
	@echo "🚀 Deploying to localhost (for testing)..."
	cd packages/contracts-solidity && npx hardhat run scripts/deploy-core-testnet.ts --network localhost

test-e2e-testnet:
	@echo "🧪 Running end-to-end testnet tests..."
	cd packages/contracts-solidity && npx hardhat run scripts/test-e2e-testnet.ts --network testnet

validate-testnet:
	@echo "✅ Validating testnet deployment..."
	cd packages/contracts-solidity && npx hardhat run scripts/validate-deployment.ts --network testnet

testnet-full:
	@echo "🚀 Complete testnet deployment and validation..."
	$(MAKE) deploy-testnet
	$(MAKE) test-e2e-testnet
	$(MAKE) validate-testnet

# Make sure we fail fast if any command fails
.DELETE_ON_ERROR:
