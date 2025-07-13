# Development Documentation

This directory contains all technical documentation for GameDAO Protocol development.

## Organization

### Modules (`/modules/`)
Technical documentation for all protocol modules:

- **`battlepass.md`** - Original battlepass module specification (moved from `packages/pallets/battlepass/readme.md`)
- **`battlepass-analysis.md`** - Comprehensive analysis for Solidity conversion
- **`battlepass-enhanced-design.md`** - Enhanced design specification with vital information
- **`control.md`** - Control module documentation (moved from `packages/pallets/control/README.md`)
- **`flow.md`** - Flow module documentation (moved from `packages/pallets/flow/README.md`)
- **`sense.md`** - Sense module documentation (moved from `packages/pallets/sense/README.md`)
- **`signal.md`** - Signal module documentation (moved from `packages/pallets/signal/README.md`)

### Contracts (`/contracts/`)
Solidity contracts documentation:

- **`architecture-validation.md`** - Architecture validation documentation (moved from `packages/contracts-solidity/ARCHITECTURE_VALIDATION.md`)
- **`scaffolding.md`** - Scaffolding documentation (moved from `packages/contracts-solidity/SCAFFOLDING.md`)

### Frontend (`/frontend/`)
Frontend development documentation:

- **`README.md`** - Frontend development guide (moved from `packages/frontend/README.md`)
- **`alignment-plan.md`** - Frontend alignment plan (moved from `packages/frontend/FRONTEND_ALIGNMENT_PLAN.md`)

### Development Notes
- **`editor-notes.md`** - Editor notes and development reminders (moved from root `editor-notes.md`)

## Module Overview

The GameDAO Protocol consists of four main modules:

1. **CONTROL** - Organization management, membership, and access control
2. **FLOW** - Fundraising campaigns, treasury management, and reward distribution
3. **SIGNAL** - Governance proposals, voting mechanisms, and consensus building
4. **SENSE** - User profiles, reputation tracking, and achievement systems
5. **BATTLEPASS** - Subscription-based engagement protocol for gaming guilds

Each module has its own technical documentation detailing:
- Interface specifications
- Dispatchable functions
- Public functions
- Usage examples
- Related modules

## Migration Notes

This documentation structure was created on **2025-01-13** as part of the comprehensive documentation reorganization. All files have been moved from their original locations to create a unified documentation system while preserving all historical context and technical details.

For historical development logs, see [`docs/logs/`](../logs/).
For product feature proposals, see [`docs/gips/`](../gips/).
