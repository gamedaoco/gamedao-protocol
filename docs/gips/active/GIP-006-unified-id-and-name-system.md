# GIP-006: Unified ID and Name System Architecture

**Status:** Active
**Type:** Core Protocol Enhancement
**Created:** 2025-01-03
**Authors:** GameDAO Core Team

## Abstract

This proposal introduces a unified identifier and human-readable name system for GameDAO protocol entities, replacing the current mixed ID system with a consistent 8-character alphanumeric approach and introducing a name registry with economic incentives.

## Motivation

The current GameDAO protocol uses inconsistent identifier systems:
- Organizations: 8-character alphanumeric IDs (bytes8)
- Proposals: 32-byte hashes (bytes32)
- Campaigns: 32-byte hashes (bytes32)
- Profiles: Not yet implemented

This inconsistency creates:
- Poor user experience with long, unmemorable identifiers
- Inconsistent URL structures
- Difficulty in cross-referencing entities
- No human-readable naming system

## Specification

### 1. Unified ID System

All entities will use 8-character alphanumeric identifiers (Base36 encoding):

#### ID Format Structure
- **Organizations**: `ABCD1234` (8 characters)
- **Proposals**: `ABCD1234-P-EFGH5678` (orgId + "-P-" + proposalId)
- **Campaigns**: `ABCD1234-C-IJKL9012` (orgId + "-C-" + campaignId)
- **Profiles**: `MNOP3456` (8 characters)

#### Technical Implementation
```solidity
// Base ID generation
function generateId(string memory context, uint256 nonce) internal pure returns (bytes8) {
    return bytes8(keccak256(abi.encodePacked(context, nonce, block.timestamp)));
}

// Hierarchical ID generation for proposals
function generateProposalId(bytes8 orgId, uint256 proposalNonce) internal pure returns (string memory) {
    return string(abi.encodePacked(
        orgId,
        "-P-",
        generateId("proposal", proposalNonce)
    ));
}
```

### 2. Name Registry System

#### Core Features
- **Unique Names**: 8-character maximum, globally unique namespace
- **Economic Model**: GAME token deposit required for name claims
- **Transferable**: Names can be transferred between entities
- **Revocable**: Protocol governance can revoke inappropriate names

#### Economic Parameters
- **Initial Deposit**: 1000 GAME tokens per name claim
- **Renewal**: Annual 100 GAME token fee
- **Transfer Fee**: 50 GAME tokens
- **Revenue Distribution**: 50% burned, 30% to treasury, 20% to stakers

#### Contract Interface
```solidity
interface INameRegistry {
    function claimName(string memory name, EntityType entityType, bytes8 entityId) external;
    function transferName(string memory name, bytes8 newEntityId) external;
    function renewName(string memory name) external;
    function revokeName(string memory name) external; // Governance only

    function isNameAvailable(string memory name) external view returns (bool);
    function getEntityByName(string memory name) external view returns (bytes8, EntityType);
    function getNameByEntity(bytes8 entityId, EntityType entityType) external view returns (string memory);
}

enum EntityType {
    Organization,
    Profile,
    Campaign,
    Proposal
}
```

### 3. URL Structure

#### Before
- Organizations: `/control/0x1234567890abcdef...`
- Proposals: `/signal/0x1234567890abcdef1234567890abcdef...`

#### After
- Organizations: `/control/GAMEDAO` or `/control/ABCD1234`
- Proposals: `/signal/GAMEDAO-P-PROP001` or `/signal/ABCD1234-P-EFGH5678`
- Campaigns: `/flow/GAMEDAO-C-CAMP001` or `/flow/ABCD1234-C-IJKL9012`
- Profiles: `/user/ALICE123` or `/user/MNOP3456`

### 4. Migration Strategy

#### Phase 1: ID System Standardization (Weeks 1-2)
1. Update all contracts to use bytes8 for base IDs
2. Implement hierarchical ID generation for proposals/campaigns
3. Update frontend to handle new ID formats
4. Migrate existing data with backward compatibility

#### Phase 2: Name Registry Implementation (Weeks 3-4)
1. Deploy NameRegistry contract
2. Implement GAME token integration
3. Add name claiming functionality to frontend
4. Create governance mechanisms for name disputes

#### Phase 3: Frontend Integration (Weeks 5-6)
1. Update all URL routing to support names
2. Add name search functionality
3. Implement name management UI
4. Add name availability checking

#### Phase 4: Optimization and Polish (Weeks 7-8)
1. Performance optimization
2. Enhanced name validation
3. Bulk operations support
4. Analytics and monitoring

## Implementation Details

### Contract Changes Required

#### 1. Core Contracts
- `GameDAORegistry.sol`: Update to use bytes8 for organization IDs
- `Signal.sol`: Update proposal ID generation to hierarchical format
- `Flow.sol`: Update campaign ID generation to hierarchical format
- `Sense.sol`: Update profile ID generation to bytes8

#### 2. New Contracts
- `NameRegistry.sol`: Core name registry functionality
- `NameRegistryGovernance.sol`: Governance for name disputes

#### 3. Frontend Changes
- Update all ID handling in hooks and components
- Add name resolution utilities
- Implement name management UI components
- Update routing system for name-based URLs

### Gas Optimization

The new system provides several gas optimizations:
- Smaller storage footprint (bytes8 vs bytes32)
- Efficient hierarchical ID generation
- Optimized name lookup using mapping structures

### Security Considerations

1. **Name Squatting Prevention**: Economic barriers prevent frivolous claims
2. **Governance Oversight**: Protocol governance can intervene in disputes
3. **Transfer Security**: Proper access controls for name transfers
4. **Collision Resistance**: Cryptographic ID generation prevents collisions

## Economic Impact

### Revenue Generation
- Name claims: 1000 GAME per name
- Renewals: 100 GAME per year
- Transfers: 50 GAME per transfer
- Estimated annual revenue: 50,000-100,000 GAME tokens

### Token Utility Enhancement
- Creates sustained demand for GAME tokens
- Provides deflationary mechanism through burning
- Enhances staking rewards through revenue sharing

## Testing Strategy

### Unit Tests
- ID generation collision testing
- Name registry functionality
- Economic model validation

### Integration Tests
- Cross-contract ID resolution
- Frontend name resolution
- Migration path validation

### Load Testing
- Name lookup performance
- Bulk operations testing
- Gas usage optimization

## Risks and Mitigation

### Technical Risks
- **Migration Complexity**: Phased approach with backward compatibility
- **Performance Impact**: Extensive testing and optimization
- **Smart Contract Bugs**: Comprehensive auditing required

### Economic Risks
- **Name Speculation**: Governance mechanisms for dispute resolution
- **Adoption Resistance**: Gradual rollout with incentives
- **Price Volatility**: Adjustable economic parameters

## Success Metrics

- 90% of organizations claim human-readable names within 6 months
- 50% reduction in support queries related to entity identification
- 25% increase in user engagement with improved UX
- 10,000+ GAME tokens locked in name deposits

## Conclusion

This unified ID and name system will significantly improve GameDAO's user experience while creating new economic value for the protocol. The hierarchical ID structure provides clarity and organization, while the name registry creates scarcity and utility for GAME tokens.

The implementation requires careful coordination across contracts, frontend, and subgraph components, but the long-term benefits justify the development effort.

## References

- [Current ID System Analysis](../architecture/current-id-system.md)
- [Name Registry Economic Model](../architecture/name-registry-economics.md)
- [Migration Strategy Details](../architecture/id-migration-strategy.md)
