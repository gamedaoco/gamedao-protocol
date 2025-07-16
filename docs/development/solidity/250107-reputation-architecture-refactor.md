# Reputation System Architecture Refactor

## Current Problem

The reputation system is currently duplicated across two modules:

### Membership Module
- Stores `reputation` field in Member struct
- Has reputation management functions (`updateMemberReputation`, `rewardMemberReputation`, `slashMemberReputation`)
- Uses reputation for voting power calculation
- Has reputation constants and decay logic

### Sense Module
- Has comprehensive `ReputationData` struct (reputation, experience, trust)
- Has `updateReputation()` with different reputation types
- Provides reputation history tracking
- More sophisticated reputation system

## Architectural Issues

1. **Duplication**: Two different reputation systems
2. **Inconsistency**: Different scales and calculation methods
3. **Coupling**: Membership module doing reputation logic
4. **Single Responsibility**: Violates SRP - Membership should handle membership, Sense should handle reputation

## Proposed Solution

### 1. Centralize Reputation in Sense Module

**Sense Module becomes the single source of truth for:**
- All reputation data storage
- Reputation calculations
- Reputation history
- Experience and trust scoring

### 2. Membership Module References Sense

**Membership Module should:**
- Remove reputation storage
- Call Sense module for reputation queries
- Delegate reputation updates to Sense
- Use Sense reputation for voting power calculation

### 3. Clear Interface Separation

```solidity
// Sense Module - Reputation Authority
interface ISense {
    function getReputation(bytes8 profileId) external view returns (ReputationData memory);
    function updateReputation(bytes8 profileId, ReputationType repType, int256 delta, bytes32 reason) external;
    function getMemberReputation(string memory orgId, address member) external view returns (uint256);
    function calculateVotingWeight(bytes8 profileId, uint256 baseWeight) external view returns (uint256);
}

// Membership Module - Membership Authority
interface IMembership {
    function getMemberInfo(string memory orgId, address member) external view returns (MemberInfo memory);
    function updateMemberState(string memory orgId, address member, MemberState newState) external;
    // NO reputation functions - delegates to Sense
}
```

## Implementation Plan

### Phase 1: Update Sense Module

1. **Enhance Sense to handle organization context**
```solidity
// Map organization members to profile IDs
mapping(string => mapping(address => bytes8)) private _orgMemberProfiles;

function getMemberReputation(string memory orgId, address member) external view returns (uint256) {
    bytes8 profileId = _orgMemberProfiles[orgId][member];
    return _reputations[profileId].reputation;
}
```

2. **Add organization-specific reputation functions**
```solidity
function updateMemberReputation(string memory orgId, address member, int256 delta, bytes32 reason) external {
    bytes8 profileId = _getOrCreateProfile(orgId, member);
    updateReputation(profileId, ReputationType.REPUTATION, delta, reason);
}
```

### Phase 2: Update Membership Module

1. **Remove reputation storage and functions**
```solidity
struct Member {
    address memberAddress;
    MemberState state;
    MembershipTier tier;
    uint256 joinedAt;
    uint256 votingPower;        // Calculated, not stored
    uint256 delegatedPower;
    address delegatedTo;
    // REMOVE: uint256 reputation;
    uint256 lastActivity;
    bytes32[] roles;
}
```

2. **Add Sense module integration**
```solidity
ISense public senseModule;

function _calculateVotingPower(MembershipTier tier, string memory orgId, address member) internal view returns (uint256) {
    uint256 basePower = _getTierBasePower(tier);
    return senseModule.calculateVotingWeight(
        senseModule.getProfileId(orgId, member),
        basePower
    );
}
```

3. **Update reputation-related functions to delegate**
```solidity
function updateMemberReputation(string memory orgId, address member, uint256 newReputation, bytes32 reason) external {
    // Delegate to Sense module
    senseModule.updateMemberReputation(orgId, member, int256(newReputation), reason);

    // Recalculate voting power
    _updateVotingPower(orgId, member);
}
```

### Phase 3: Update Other Modules

1. **Signal Module** - Use Sense for reputation-based voting
2. **Flow Module** - Use Sense for creator reputation
3. **Identity Module** - Link profiles to Sense reputation

## Benefits

### 1. Single Source of Truth
- All reputation data in one place
- Consistent calculations across modules
- No data duplication

### 2. Better Separation of Concerns
- Membership: Member states, tiers, roles
- Sense: Reputation, experience, trust, achievements
- Signal: Voting and governance
- Flow: Campaigns and funding

### 3. Improved Maintainability
- Reputation logic centralized
- Easier to update reputation algorithms
- Clear module boundaries

### 4. Enhanced Functionality
- Cross-organization reputation tracking
- Comprehensive reputation history
- Multiple reputation types (reputation, experience, trust)

## Migration Strategy

### 1. Backward Compatibility
- Keep old reputation functions with deprecation warnings
- Gradually migrate data to Sense module
- Provide migration scripts

### 2. Data Migration
```solidity
function migrateReputationData(string memory orgId) external onlyRole(ADMIN_ROLE) {
    address[] memory members = getOrganizationMembers(orgId);

    for (uint i = 0; i < members.length; i++) {
        address member = members[i];
        uint256 oldReputation = _members[orgId][member].reputation;

        if (oldReputation > 0) {
            senseModule.setMemberReputation(orgId, member, oldReputation);
        }
    }
}
```

### 3. Testing Strategy
- Unit tests for Sense reputation functions
- Integration tests for cross-module reputation queries
- End-to-end tests for voting power calculations
- Migration tests for data consistency

## Updated Architecture Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Membership    │    │      Sense      │    │     Signal      │
│                 │    │                 │    │                 │
│ • Member States │    │ • Reputation    │    │ • Proposals     │
│ • Tiers & Roles │◄──►│ • Experience    │◄──►│ • Voting        │
│ • Delegations   │    │ • Trust Score   │    │ • Governance    │
│ • Voting Power  │    │ • Achievements  │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │    Registry     │
                    │                 │
                    │ • Module Refs   │
                    │ • Access Control│
                    │ • Coordination  │
                    └─────────────────┘
```

## Implementation Timeline

1. **Week 1**: Update Sense module with organization context
2. **Week 2**: Create migration scripts and test data transfer
3. **Week 3**: Update Membership module to use Sense
4. **Week 4**: Update other modules and test integration
5. **Week 5**: Deploy and migrate production data

This refactor will create a cleaner, more maintainable architecture that properly separates concerns and eliminates duplication.
