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

.PHONY: help install clean build test deploy verify docs lint format setup-env all graph-node graph-deploy scaffold dev-reset

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
	@echo "  make graph-node       Start local Graph node"
	@echo "  make graph-deploy     Deploy subgraph to local Graph node"
	@echo "  make graph-full       Complete Graph setup (node + deploy)"
	@echo "  make graph-stop       Stop Graph services"
	@echo "  make graph-status     Check Graph services status"
	@echo ""
	@echo "$(GREEN)🔄 Development Workflows:$(NC)"
	@echo "  make dev              Start development environment"
	@echo "  make dev-reset        Reset development environment"
	@echo "  make dev-full         Full dev environment (contracts + graph + frontend)"
	@echo "  make dev-frontend     Start frontend development server"
	@echo "  make scaffold         Generate test data"
	@echo "  make scaffold-clean   Clean scaffold data"
	@echo "  make send-tokens      Send tokens to specific address"
	@echo ""
	@echo "$(GREEN)📚 Documentation & Quality:$(NC)"
	@echo "  make docs             Generate documentation"
	@echo "  make lint             Run linting"
	@echo "  make format           Format code"
	@echo "  make status           Show project status"
	@echo ""
	@echo "$(YELLOW)📝 Examples:$(NC)"
	@echo "  make deploy NETWORK=sepolia"
	@echo "  make dev-reset        # Clean restart of development environment"
	@echo "  make dev-full         # Start everything: contracts + graph + frontend"
	@echo "  make send-tokens RECIPIENT=0x123... ETH=2.0 GAME=20000 USDC=10000"

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
	@echo "$(BLUE)🚀 Deploying to testnet...$(NC)"
	@cd $(CONTRACTS_DIR) && pnpm run deploy:testnet
	@echo "$(GREEN)✅ Testnet deployment complete$(NC)"

deploy-mainnet:
	@echo "$(RED)🚨 MAINNET DEPLOYMENT - ARE YOU SURE? (y/N)$(NC)"
	@read -r REPLY; \
	if [ "$$REPLY" = "y" ] || [ "$$REPLY" = "Y" ]; then \
		echo "$(BLUE)🚀 Deploying to mainnet...$(NC)"; \
		cd $(CONTRACTS_DIR) && pnpm run deploy:mainnet; \
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
	@cd $(CONTRACTS_DIR) && pnpm run verify
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
	@docker compose -f docker-compose.graph.yml down
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
dev:
	@echo "$(BLUE)🔧 Starting development environment...$(NC)"
	@cd $(CONTRACTS_DIR) && pnpm run node &
	@echo "$(GREEN)✅ Hardhat node started$(NC)"
	@echo "$(CYAN)💡 Ready for development!$(NC)"
	@echo "  - Local node: http://localhost:8545"
	@echo "  - Chain ID: 31337"

dev-reset:
	@echo "$(BLUE)🔄 Resetting development environment...$(NC)"
	@echo "$(CYAN)1️⃣  Stopping existing processes...$(NC)"
	@-pkill -f "hardhat node" 2>/dev/null || true
	@-pkill -f "node.*hardhat.*node" 2>/dev/null || true
	@sleep 2
	@echo "$(CYAN)2️⃣  Stopping Graph services...$(NC)"
	@make graph-stop || true
	@sleep 2
	@echo "$(CYAN)3️⃣  Cleaning data...$(NC)"
	@rm -rf $(DATA_DIR)/postgres
	@make scaffold-clean
	@sleep 2
	@echo "$(CYAN)4️⃣  Starting Hardhat node...$(NC)"
	@cd $(CONTRACTS_DIR) && pnpm run node &
	@echo "$(YELLOW)⏳ Waiting for node to start...$(NC)"
	@sleep 5
	@echo "$(CYAN)5️⃣  Deploying contracts...$(NC)"
	@cd $(CONTRACTS_DIR) && pnpm run deploy:localhost
	@echo "$(CYAN)6️⃣  Starting Graph node...$(NC)"
	@make graph-node
	@echo "$(CYAN)7️⃣  Deploying subgraph...$(NC)"
	@make graph-deploy
	@echo "$(GREEN)✅ Development environment reset complete!$(NC)"
	@echo "$(CYAN)💡 Ready for development with fresh blockchain and subgraph!$(NC)"

dev-full:
	@echo "$(BLUE)🚀 Starting complete development environment...$(NC)"
	@make dev-reset
	@echo "$(CYAN)8️⃣  Starting frontend...$(NC)"
	@if [ -d "$(FRONTEND_DIR)" ]; then \
		cd $(FRONTEND_DIR) && pnpm run dev & \
	fi
	@echo "$(GREEN)🎉 Complete development environment ready!$(NC)"
	@echo "$(CYAN)📋 Services available:$(NC)"
	@echo "  - Hardhat Node: http://localhost:8545"
	@echo "  - Graph Node: http://localhost:8020"
	@echo "  - Subgraph: http://localhost:8000/subgraphs/name/gamedao/protocol"
	@echo "  - Frontend: http://localhost:3000"

dev-frontend:
	@echo "$(BLUE)🌐 Starting frontend development server...$(NC)"
	@if [ -d "$(FRONTEND_DIR)" ]; then \
		echo "$(CYAN)🚀 Starting Next.js development server...$(NC)"; \
		cd $(FRONTEND_DIR) && pnpm run dev; \
	else \
		echo "$(RED)❌ Frontend directory not found: $(FRONTEND_DIR)$(NC)"; \
		exit 1; \
	fi

# Scaffolding targets
scaffold:
	@echo "$(BLUE)🏗️  Generating test data...$(NC)"
	@echo "$(YELLOW)⚠️  Ensure local node is running and contracts are deployed$(NC)"
	@cd $(CONTRACTS_DIR) && pnpm run scaffold
	@echo "$(GREEN)✅ Test data generated successfully$(NC)"

scaffold-clean:
	@echo "$(BLUE)🧹 Cleaning scaffold data...$(NC)"
	@rm -f $(CONTRACTS_DIR)/scaffold-output.json
	@rm -f $(CONTRACTS_DIR)/extended-interactions-output.json
	@rm -f $(CONTRACTS_DIR)/generated-profiles.json
	@rm -f $(CONTRACTS_DIR)/deployment-addresses.json
	@rm -f $(FRONTEND_DIR)/public/scaffold-data.json
	@rm -f $(FRONTEND_DIR)/src/lib/scaffold-data.ts
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
	@echo "$(CYAN)📊 GameDAO Protocol Status$(NC)"
	@echo ""
	@echo "$(YELLOW)📈 Implementation Progress:$(NC)"
	@echo "  ✅ Control Module: Complete"
	@echo "  ✅ Flow Module: Complete"
	@echo "  ✅ Signal Module: Complete"
	@echo "  ✅ Identity Module: Complete (13.144 KiB)"
	@echo "  ✅ SenseSimplified Module: Complete (9.826 KiB)"
	@echo "  ✅ GameId Library: Complete"
	@echo "  🔄 Frontend Development: 70% Complete"
	@echo "  🔄 Subgraph Integration: 80% Complete"
	@echo ""
	@echo "$(YELLOW)🏗️  Architecture Status:$(NC)"
	@echo "  ✅ Modular Architecture: Implemented"
	@echo "  ✅ Contract Size Optimization: Complete"
	@echo "  ✅ Hierarchical ID System: Complete"
	@echo "  ✅ GameDAO Registry: Complete"
	@echo "  ✅ Treasury: Complete"
	@echo ""
	@echo "$(YELLOW)🔒 Security Status:$(NC)"
	@echo "  ✅ OpenZeppelin Integration: Complete"
	@echo "  ✅ Access Control: Implemented"
	@echo "  ✅ Reentrancy Protection: Implemented"
	@echo "  ✅ Modular Security: Implemented"

# Error handling
.ONESHELL:
.SHELLFLAGS = -e
.DELETE_ON_ERROR:
