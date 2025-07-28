# GameDAO Development Data

This directory contains all development data for the GameDAO protocol when using the dockerized development environment.

## Directory Structure

```
data/
├── hardhat-node/           # Hardhat blockchain node data
├── contracts/              # Smart contract build artifacts
│   ├── artifacts/          # Compiled contract artifacts
│   ├── cache/              # Hardhat compilation cache
│   ├── typechain-types/    # Generated TypeScript types
│   └── deployment-addresses.json  # Contract deployment addresses
├── graph/                  # Graph Protocol indexing data
├── ipfs/                   # IPFS storage for Graph Protocol
├── postgres/               # PostgreSQL database data
└── logs/                   # Hardhat node operation logs
```

## Purpose

This directory structure isolates all development data from your workspace, providing:

### 🔒 **Isolation**
- All blockchain state, databases, and build artifacts are contained here
- Your main workspace stays clean and focused on source code
- Easy to distinguish between source code and generated data

### 🗑️ **Easy Reset**
- Complete reset: `make docker-dev-reset`
- Individual cleanup: `rm -rf data/hardhat-node/` for blockchain only
- Selective cleanup: Keep some data while resetting others

### 🚀 **Performance**
- Local SSD storage for optimal container performance
- Persistent volumes maintain state between container restarts
- Quick startup times when data already exists

### 📊 **Monitoring**
- Use `make docker-status` to see data directory sizes
- Monitor growth of blockchain and database data
- Identify storage usage patterns

## Volume Mounts

The Docker containers mount these directories as follows:

| Container | Host Path | Container Path | Purpose |
|-----------|-----------|----------------|---------|
| hardhat-node | `./data/hardhat-node` | `/app/data` | Blockchain state |
| hardhat-node | `./data/contracts` | `/app/contracts-output` | Build artifacts |
| hardhat-node | `./data/logs` | `/app/logs` | Node logs |
| graph-node | `./data/graph` | `/data` | Graph indexing |
| ipfs | `./data/ipfs` | `/data/ipfs` | IPFS storage |
| postgres | `./data/postgres` | `/var/lib/postgresql/data` | Database |

## Backup & Migration

Since all development data is in this single directory:

```bash
# Backup complete development environment
tar -czf gamedao-dev-backup-$(date +%Y%m%d).tar.gz data/

# Restore from backup
tar -xzf gamedao-dev-backup-YYYYMMDD.tar.gz

# Copy environment to another developer
rsync -av data/ other-developer@machine:/path/to/gamedao-protocol/data/
```

## Storage Requirements

Typical storage usage after extended development:

- **Hardhat Node**: 1-50MB (depends on transaction volume)
- **Contracts**: 10-100MB (build artifacts and types)
- **Graph Data**: 100MB-1GB (indexed blockchain data)
- **IPFS**: 10-500MB (metadata and file storage)
- **PostgreSQL**: 50-200MB (graph node database)
- **Logs**: 1-10MB (rotation recommended)

## Troubleshooting

### Permission Issues
```bash
# Fix ownership if containers can't write
sudo chown -R $USER:$USER data/
```

### Disk Space Issues
```bash
# Check usage
du -sh data/*

# Clean old blockchain data (keeps contracts)
rm -rf data/hardhat-node/*
rm -rf data/logs/*
```

### Reset Specific Components
```bash
# Reset blockchain only
rm -rf data/hardhat-node/* data/logs/*

# Reset graph data only
rm -rf data/graph/* data/ipfs/*

# Reset database only
rm -rf data/postgres/*
```
