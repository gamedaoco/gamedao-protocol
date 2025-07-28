# GIP-008: Dockerized Development Environment

| Field | Value |
|-------|-------|
| **GIP** | 008 |
| **Title** | Dockerized Development Environment for Smart Contracts |
| **Author** | GameDAO Development Team |
| **Status** | Draft |
| **Type** | Technical |
| **Category** | Development Infrastructure |
| **Created** | 2025-07-28 |
| **Requires** | - |

## Summary

This GIP proposes a comprehensive dockerization of the GameDAO smart contract development environment, creating isolated, reproducible, and easily resettable development containers for Hardhat node and associated services.

## Abstract

Currently, the GameDAO protocol development relies on host-based Hardhat nodes and a mix of containerized (Graph services) and host-based services. This creates inconsistencies, makes environment reset difficult, and complicates onboarding for new developers. This proposal establishes a fully containerized development environment with unified data management and simplified reset capabilities.

## Motivation

### Current Challenges

1. **Environment Inconsistency**: Mix of containerized and host-based services
2. **Difficult Reset**: Development data scattered across multiple locations
3. **Complex Setup**: New developers face multiple setup steps and potential environment conflicts
4. **Data Management**: Build artifacts, deployment addresses, and blockchain data not centrally managed
5. **Network Dependencies**: Host network requirements complicate Docker networking

### Benefits of Dockerization

1. **Isolation**: Complete environment isolation prevents conflicts
2. **Reproducibility**: Identical environments across all development machines
3. **Easy Reset**: Single command to reset entire development state
4. **Simplified Onboarding**: Docker Compose handles all service coordination
5. **Centralized Data**: All development data in predictable locations

## Specification

### Architecture Overview

```
gamedao-protocol/
├── local-dev/                    # New: Centralized development data
│   ├── hardhat-node/            # Node data and blockchain state
│   ├── contracts/               # Build artifacts and deployment addresses
│   ├── graph/                   # Graph node data
│   ├── ipfs/                    # IPFS data
│   └── postgres/                # PostgreSQL data
├── docker/                      # New: Docker configuration
│   ├── hardhat-node/
│   │   └── Dockerfile
│   └── scripts/
│       └── init-node.sh
└── docker-compose.yml           # Enhanced: Unified development services (includes Hardhat + Graph)
```

### Container Services

#### 1. Hardhat Node Container

**Image**: Custom Debian-based container with Node.js and Hardhat
**Ports**: 8545:8545 (JSON-RPC)
**Volumes**:
- `./local-dev/hardhat-node:/app/data`
- `./local-dev/contracts:/app/contracts-output`

#### 2. Graph Services (Updated)

**Updated networking** to communicate with containerized Hardhat node
**Consistent volume mounting** under local-dev/

#### 3. Service Dependencies

```yaml
services:
  hardhat-node:
    # Custom Hardhat container

  graph-node:
    depends_on:
      - hardhat-node
      - postgres
      - ipfs

  postgres:
    # Graph database

  ipfs:
    # IPFS for Graph
```

### Directory Structure

#### New `local-dev/` Directory

```
local-dev/
├── hardhat-node/
│   ├── data/                    # Blockchain state
│   └── logs/                    # Node logs
├── contracts/
│   ├── artifacts/               # Compiled contracts
│   ├── cache/                   # Hardhat cache
│   ├── typechain-types/         # Generated types
│   └── deployment-addresses.json
├── graph/
│   └── data/                    # Graph node data
├── ipfs/
│   └── data/                    # IPFS data
└── postgres/
    └── data/                    # PostgreSQL data
```

### Makefile Integration

#### New Commands

```makefile
# Docker-based development
docker-dev:              # Start dockerized development environment
docker-dev-reset:        # Complete environment reset
docker-dev-stop:         # Stop all development containers
docker-deploy:           # Deploy contracts to dockerized node
docker-status:           # Check container and service status

# Migration helpers
migrate-to-docker:       # Migrate existing dev data to docker structure
```

#### Updated Commands

- `make dev` → Use Docker containers by default
- `make dev-reset` → Reset Docker volumes and containers
- `make deploy-local` → Deploy to containerized Hardhat node

### Configuration Changes

#### Environment Variables

```bash
# Docker Development
DOCKER_DEV_MODE=true
HARDHAT_DOCKER_PORT=8545
GRAPH_DOCKER_PORT=8000

# Data Directories
LOCAL_DEV_DIR=./local-dev
HARDHAT_DATA_DIR=./local-dev/hardhat-node
CONTRACTS_DATA_DIR=./local-dev/contracts
```

#### Hardhat Configuration Updates

```typescript
// Conditional configuration for Docker
const dockerMode = process.env.DOCKER_DEV_MODE === 'true';

const config: HardhatUserConfig = {
  // ...
  networks: {
    localhost: {
      url: dockerMode ? "http://hardhat-node:8545" : "http://127.0.0.1:8545",
      chainId: 31337,
    },
  },
  paths: {
    artifacts: dockerMode ? "./local-dev/contracts/artifacts" : "./artifacts",
    cache: dockerMode ? "./local-dev/contracts/cache" : "./cache",
  },
};
```

## Implementation Plan

### Phase 1: Docker Infrastructure (Week 1)

1. **Create Docker configuration**
   - Hardhat node Dockerfile
   - Enhanced docker-compose.yml with Hardhat node
   - Initialization scripts

2. **Create local-dev directory structure**
   - Set up volume mount points
   - Create .gitignore rules

### Phase 2: Service Integration (Week 1-2)

3. **Update Graph services**
   - Modify networking configuration
   - Update volume mounts

4. **Update Hardhat configuration**
   - Add Docker-aware paths
   - Environment-based URL configuration

### Phase 3: Makefile Integration (Week 2)

5. **Update Makefile commands**
   - Docker-based development workflows
   - Backward compatibility support

6. **Create migration utilities**
   - Data migration helpers
   - Environment validation

### Phase 4: Testing and Documentation (Week 2-3)

7. **Comprehensive testing**
   - All development workflows
   - Reset and recovery procedures

8. **Documentation updates**
   - Developer onboarding guide
   - Troubleshooting documentation

## Backward Compatibility

### Migration Strategy

1. **Gradual Migration**: Existing workflows continue to work
2. **Environment Detection**: Automatic detection of Docker vs. host mode
3. **Data Migration**: Utilities to migrate existing development data
4. **Documentation**: Clear migration guide for developers

### Legacy Support

- Enhanced existing `docker-compose.yml` to include Hardhat node (maintains all existing functionality)
- Maintain host-based development option for developers who prefer it
- Environment variables for mode selection

## Testing Strategy

### Development Workflow Testing

1. **Clean Environment Setup**
   ```bash
   make docker-dev          # Start fresh environment
   make docker-deploy       # Deploy contracts
   make test               # Run contract tests
   ```

2. **Reset Testing**
   ```bash
   make docker-dev-reset   # Complete reset
   make docker-dev         # Verify clean restart
   ```

3. **Integration Testing**
   ```bash
   make docker-dev         # Start services
   make graph-deploy       # Deploy subgraph
   make dev-frontend       # Start frontend
   ```

### Edge Case Testing

- Container restart scenarios
- Volume mount permissions
- Network connectivity issues
- Port conflicts

## Security Considerations

### Container Security

1. **Non-root User**: Run services as non-root user
2. **Volume Permissions**: Proper file permissions for mounted volumes
3. **Network Isolation**: Containers communicate via Docker networks
4. **Resource Limits**: Memory and CPU limits for containers

### Development Data

1. **Local Only**: All development data remains local
2. **Easy Cleanup**: Complete data removal with `make docker-dev-reset`
3. **No Sensitive Data**: No mainnet keys or sensitive data in containers

## Implementation Details

### Dockerfile for Hardhat Node

```dockerfile
FROM node:20-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Create data directories
RUN mkdir -p /app/data /app/contracts-output

# Expose Hardhat JSON-RPC port
EXPOSE 8545

# Start Hardhat node
CMD ["npm", "run", "node", "--", "--hostname", "0.0.0.0"]
```

### Docker Compose Configuration

```yaml
version: '3.8'

services:
  hardhat-node:
    build:
      context: ./packages/contracts-solidity
      dockerfile: ../../docker/hardhat-node/Dockerfile
    container_name: gamedao-hardhat-node
    ports:
      - "8545:8545"
    volumes:
      - ./local-dev/hardhat-node:/app/data
      - ./local-dev/contracts:/app/contracts-output
    networks:
      - gamedao-dev
    environment:
      - NODE_ENV=development
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8545"]
      interval: 30s
      timeout: 10s
      retries: 3

  graph-node:
    image: graphprotocol/graph-node:latest
    container_name: gamedao-graph-node
    depends_on:
      - hardhat-node
      - ipfs
      - postgres
    ports:
      - "8000:8000"
      - "8020:8020"
    environment:
      postgres_host: postgres
      postgres_user: graph-node
      postgres_pass: let-me-in
      postgres_db: graph-node
      ipfs: 'ipfs:5001'
      ethereum: 'localhost:http://hardhat-node:8545'
    volumes:
      - ./local-dev/graph:/data
    networks:
      - gamedao-dev

  # ... postgres and ipfs services
```

## Success Criteria

### Technical Success

1. **One Command Setup**: `make docker-dev` starts complete environment
2. **One Command Reset**: `make docker-dev-reset` resets everything
3. **Consistent Experience**: Identical behavior across all developer machines
4. **Fast Iteration**: Quick development cycles with containerized services

### Developer Experience

1. **Simplified Onboarding**: New developers productive in < 10 minutes
2. **Clear Documentation**: Step-by-step guides with troubleshooting
3. **Backward Compatibility**: Existing workflows continue to work
4. **Easy Debugging**: Clear container logs and status information

## Future Considerations

### Potential Enhancements

1. **Multi-Network Support**: Easy switching between different test networks
2. **Container Registry**: Pre-built images for faster setup
3. **Development Profiles**: Different configurations for different development needs
4. **Performance Optimization**: Container resource optimization
5. **Cloud Development**: Support for cloud-based development environments

### Integration Opportunities

1. **CI/CD Integration**: Use same containers in CI pipelines
2. **Testing Infrastructure**: Standardized testing environments
3. **Deployment Pipelines**: Container-based deployment workflows

## Conclusion

This GIP establishes a robust, containerized development environment that addresses current pain points while providing a foundation for future development infrastructure improvements. The implementation prioritizes developer experience, maintainability, and reproducibility while maintaining backward compatibility with existing workflows.

The proposed solution transforms GameDAO smart contract development from a complex, multi-step setup process into a simple, one-command operation that provides consistent, isolated, and easily resettable development environments.
