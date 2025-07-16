# Membership Module

## Overview

The `Membership` module provides comprehensive membership management for GameDAO organizations. It handles member states, tiers, voting power, reputation, and delegation in a unified system that integrates with all other GameDAO modules.

## Contract Details

- **File**: `contracts/modules/Membership/Membership.sol`
- **Size**: 17.329 KiB
- **Interface**: `IMembership`
- **Inheritance**: `Module`, `IMembership`

## Key Features

### Member State Management
- Five distinct member states: Inactive, Active, Paused, Kicked, Banned
- State transition validation and enforcement
- Automatic state management based on conditions
- Batch state operations for efficiency

### Membership Tiers
- Four membership tiers: Basic, Premium, VIP, Founder
- Tier-based privileges and access control
- Automatic tier progression based on criteria
- Custom tier configuration per organization

### Voting Power System
- Dynamic voting power calculation
- Delegation support with recursive delegation
- Voting power history tracking
- Integration with governance modules

### Reputation System
- Comprehensive reputation scoring
- Reward and slashing mechanisms
- Reputation-based access control
- Historical reputation tracking

## Core Functions

### Member Management

```solidity
function addMember(
    string memory orgId,
    address member,
    MembershipTier tier,
    uint256 votingPower
) external onlyRole(MEMBERSHIP_ADMIN_ROLE) nonReentrant
```

Adds a new member to an organization.

**Parameters**:
- `orgId`: Organization identifier
- `member`: Member address
- `tier`: Initial membership tier
- `votingPower`: Initial voting power

**Access**: `MEMBERSHIP_ADMIN_ROLE`

```solidity
function removeMember(
    string memory orgId,
    address member,
    string memory reason
) external onlyRole(MEMBERSHIP_ADMIN_ROLE) nonReentrant
```

Removes a member from an organization.

**Parameters**:
- `orgId`: Organization identifier
- `member`: Member address to remove
- `reason`: Reason for removal

**Access**: `MEMBERSHIP_ADMIN_ROLE`

### State Management

```solidity
function updateMemberState(
    string memory orgId,
    address member,
    MemberState newState,
    string memory reason
) external onlyRole(ORGANIZATION_MANAGER_ROLE) nonReentrant
```

Updates a member's state with validation.

**Parameters**:
- `orgId`: Organization identifier
- `member`: Member address
- `newState`: New member state
- `reason`: Reason for state change

**Access**: `ORGANIZATION_MANAGER_ROLE`

### Tier Management

```solidity
function updateMemberTier(
    string memory orgId,
    address member,
    MembershipTier newTier
) external onlyRole(MEMBERSHIP_ADMIN_ROLE) nonReentrant
```

Updates a member's tier.

**Parameters**:
- `orgId`: Organization identifier
- `member`: Member address
- `newTier`: New membership tier

**Access**: `MEMBERSHIP_ADMIN_ROLE`

### Voting Power

```solidity
function updateVotingPower(
    string memory orgId,
    address member,
    uint256 newVotingPower
) external onlyRole(ORGANIZATION_MANAGER_ROLE) nonReentrant
```

Updates a member's voting power.

**Parameters**:
- `orgId`: Organization identifier
- `member`: Member address
- `newVotingPower`: New voting power amount

**Access**: `ORGANIZATION_MANAGER_ROLE`

```solidity
function delegateVotingPower(
    string memory orgId,
    address delegate,
    uint256 amount
) external nonReentrant
```

Delegates voting power to another member.

**Parameters**:
- `orgId`: Organization identifier
- `delegate`: Address to delegate to
- `amount`: Amount of voting power to delegate

**Access**: Member only

### Reputation Management

```solidity
function updateReputation(
    string memory orgId,
    address member,
    int256 reputationChange,
    string memory reason
) external onlyRole(REPUTATION_MANAGER_ROLE) nonReentrant
```

Updates a member's reputation score.

**Parameters**:
- `orgId`: Organization identifier
- `member`: Member address
- `reputationChange`: Reputation change (positive or negative)
- `reason`: Reason for reputation change

**Access**: `REPUTATION_MANAGER_ROLE`

## Data Structures

### MemberInfo

```solidity
struct MemberInfo {
    address memberAddress;      // Member address
    MemberState state;          // Current state
    MembershipTier tier;        // Membership tier
    uint256 joinedAt;           // Join timestamp
    uint256 votingPower;        // Current voting power
    uint256 delegatedPower;     // Delegated voting power
    address delegatedTo;        // Delegation target
    int256 reputation;          // Reputation score
    uint256 lastActivity;       // Last activity timestamp
    bytes32[] roles;            // Assigned roles
    mapping(string => uint256) achievements; // Achievements
}
```

### MemberState

```solidity
enum MemberState {
    Inactive,                   // Not active member
    Active,                     // Active member
    Paused,                     // Temporarily paused
    Kicked,                     // Kicked from organization
    Banned                      // Permanently banned
}
```

### MembershipTier

```solidity
enum MembershipTier {
    Basic,                      // Basic membership
    Premium,                    // Premium membership
    VIP,                        // VIP membership
    Founder                     // Founder membership
}
```

### VotingPowerHistory

```solidity
struct VotingPowerHistory {
    uint256 timestamp;          // Change timestamp
    uint256 previousPower;      // Previous voting power
    uint256 newPower;           // New voting power
    string reason;              // Reason for change
}
```

### ReputationHistory

```solidity
struct ReputationHistory {
    uint256 timestamp;          // Change timestamp
    int256 change;              // Reputation change
    int256 newTotal;            // New total reputation
    string reason;              // Reason for change
    address updatedBy;          // Who updated it
}
```

## Events

### Member Events

```solidity
event MemberAdded(
    string indexed orgId,
    address indexed member,
    MembershipTier indexed tier,
    uint256 votingPower
);

event MemberRemoved(
    string indexed orgId,
    address indexed member,
    string reason
);

event MemberStateChanged(
    string indexed orgId,
    address indexed member,
    MemberState indexed oldState,
    MemberState indexed newState,
    string reason
);
```

### Tier Events

```solidity
event MemberTierUpdated(
    string indexed orgId,
    address indexed member,
    MembershipTier indexed oldTier,
    MembershipTier indexed newTier
);

event TierConfigUpdated(
    string indexed orgId,
    MembershipTier indexed tier,
    TierConfig config
);
```

### Voting Power Events

```solidity
event VotingPowerUpdated(
    string indexed orgId,
    address indexed member,
    uint256 oldPower,
    uint256 newPower
);

event VotingPowerDelegated(
    string indexed orgId,
    address indexed delegator,
    address indexed delegate,
    uint256 amount
);

event VotingPowerRevoked(
    string indexed orgId,
    address indexed delegator,
    address indexed delegate,
    uint256 amount
);
```

### Reputation Events

```solidity
event ReputationUpdated(
    string indexed orgId,
    address indexed member,
    int256 change,
    int256 newTotal,
    string reason
);

event ReputationSlashed(
    string indexed orgId,
    address indexed member,
    int256 amount,
    string reason
);
```

## Access Control

### Roles

```solidity
bytes32 public constant MEMBERSHIP_ADMIN_ROLE = keccak256("MEMBERSHIP_ADMIN_ROLE");
bytes32 public constant ORGANIZATION_MANAGER_ROLE = keccak256("ORGANIZATION_MANAGER_ROLE");
bytes32 public constant REPUTATION_MANAGER_ROLE = keccak256("REPUTATION_MANAGER_ROLE");
bytes32 public constant TIER_MANAGER_ROLE = keccak256("TIER_MANAGER_ROLE");
```

### Modifiers

```solidity
modifier onlyActiveMember(string memory orgId) {
    require(
        getMemberState(orgId, msg.sender) == MemberState.Active,
        "Not an active member"
    );
    _;
}

modifier validMemberState(MemberState state) {
    require(
        state >= MemberState.Inactive && state <= MemberState.Banned,
        "Invalid member state"
    );
    _;
}

modifier validTier(MembershipTier tier) {
    require(
        tier >= MembershipTier.Basic && tier <= MembershipTier.Founder,
        "Invalid membership tier"
    );
    _;
}
```

## Batch Operations

### Batch Member Management

```solidity
function batchAddMembers(
    string memory orgId,
    address[] memory members,
    MembershipTier[] memory tiers,
    uint256[] memory votingPowers
) external onlyRole(MEMBERSHIP_ADMIN_ROLE) nonReentrant
```

Adds multiple members in a single transaction.

```solidity
function batchUpdateStates(
    string memory orgId,
    address[] memory members,
    MemberState[] memory newStates,
    string[] memory reasons
) external onlyRole(ORGANIZATION_MANAGER_ROLE) nonReentrant
```

Updates multiple member states in a single transaction.

### Batch Reputation Management

```solidity
function batchUpdateReputation(
    string memory orgId,
    address[] memory members,
    int256[] memory changes,
    string[] memory reasons
) external onlyRole(REPUTATION_MANAGER_ROLE) nonReentrant
```

Updates multiple member reputations in a single transaction.

## Query Functions

### Member Queries

```solidity
function getMemberInfo(
    string memory orgId,
    address member
) external view returns (MemberInfo memory)
```

Returns complete member information.

```solidity
function getMembersByState(
    string memory orgId,
    MemberState state
) external view returns (address[] memory)
```

Returns all members with a specific state.

```solidity
function getMembersByTier(
    string memory orgId,
    MembershipTier tier
) external view returns (address[] memory)
```

Returns all members with a specific tier.

### Voting Power Queries

```solidity
function getVotingPower(
    string memory orgId,
    address member
) external view returns (uint256)
```

Returns current voting power of a member.

```solidity
function getTotalVotingPower(
    string memory orgId
) external view returns (uint256)
```

Returns total voting power in an organization.

```solidity
function getDelegatedPower(
    string memory orgId,
    address member
) external view returns (uint256)
```

Returns voting power delegated to a member.

### Reputation Queries

```solidity
function getReputation(
    string memory orgId,
    address member
) external view returns (int256)
```

Returns current reputation score of a member.

```solidity
function getReputationHistory(
    string memory orgId,
    address member,
    uint256 limit
) external view returns (ReputationHistory[] memory)
```

Returns reputation change history for a member.

## Integration Patterns

### Control Module Integration

```solidity
// In Control contract
function createOrganization(string memory orgId) external {
    // Create organization
    _createOrganization(orgId);

    // Setup membership
    IMembership membership = IMembership(registry.getModule("Membership"));
    membership.setupOrganizationMembership(orgId, membershipConfig);
}
```

### Signal Module Integration

```solidity
// In Signal contract
function createProposal(string memory orgId, string memory proposalId) external {
    // Check if member can create proposals
    IMembership membership = IMembership(registry.getModule("Membership"));
    require(membership.getMemberState(orgId, msg.sender) == MemberState.Active, "Not active member");

    // Get voting power for proposal
    uint256 votingPower = membership.getVotingPower(orgId, msg.sender);
    require(votingPower >= minVotingPowerForProposal, "Insufficient voting power");
}
```

### Sense Module Integration

```solidity
// In Sense contract
function awardReputation(string memory orgId, address member, uint256 amount) external {
    // Award reputation through membership module
    IMembership membership = IMembership(registry.getModule("Membership"));
    membership.updateReputation(orgId, member, int256(amount), "Achievement reward");
}
```

## Security Features

### State Transition Validation

```solidity
function _validateStateTransition(
    MemberState current,
    MemberState next
) internal pure returns (bool)
```

Validates allowed state transitions.

### Delegation Security

```solidity
function _validateDelegation(
    string memory orgId,
    address delegator,
    address delegate,
    uint256 amount
) internal view returns (bool)
```

Validates delegation requests to prevent abuse.

### Reputation Bounds

```solidity
function _validateReputationChange(
    int256 currentReputation,
    int256 change
) internal pure returns (bool)
```

Validates reputation changes to prevent overflow/underflow.

## Gas Optimization

### Efficient Storage

```solidity
// Packed struct for gas optimization
struct PackedMemberInfo {
    uint64 joinedAt;            // Join timestamp
    uint64 lastActivity;        // Last activity
    uint32 votingPower;         // Voting power (scaled)
    uint32 delegatedPower;      // Delegated power (scaled)
    int32 reputation;           // Reputation (scaled)
    MemberState state;          // Member state
    MembershipTier tier;        // Membership tier
}
```

### Batch Processing

```solidity
function _batchProcessMembers(
    string memory orgId,
    address[] memory members,
    function(string memory, address) internal processor
) internal
```

Generic batch processing function for member operations.

## Testing

### Unit Tests
- Member addition and removal
- State transitions
- Tier management
- Voting power calculations
- Reputation updates
- Delegation mechanisms

### Integration Tests
- Cross-module communication
- Batch operations
- Complex delegation chains
- Reputation-based access control

## Deployment

### Prerequisites
- Deploy Registry contract
- Deploy Module base contract
- Configure access roles
- Set up tier configurations

### Deployment Steps
1. Deploy Membership contract
2. Initialize with registry
3. Configure tier settings
4. Set up access permissions
5. Test member operations
6. Verify integrations

## Monitoring

### Key Metrics
- Total members across organizations
- Member state distribution
- Voting power distribution
- Reputation score distribution
- Delegation activity

### Health Checks
- State transition validity
- Voting power consistency
- Reputation bounds
- Delegation chain integrity

## Best Practices

### Development
- Validate all state transitions
- Use batch operations for efficiency
- Implement proper access control
- Test delegation chains thoroughly

### Security
- Validate all inputs
- Prevent reputation manipulation
- Secure delegation mechanisms
- Monitor for abuse patterns

### Performance
- Use efficient data structures
- Optimize for common queries
- Minimize storage operations
- Cache frequently accessed data
