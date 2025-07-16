# Control Module

## Overview

The `Control` module handles organization creation and management within the GameDAO ecosystem. It provides the core functionality for creating organizations, managing their basic properties, and coordinating with other modules like Membership and Treasury.

## Contract Details

- **File**: `contracts/modules/Control/Control.sol`
- **Size**: 17.056 KiB
- **Interface**: `IControl`
- **Inheritance**: `Module`, `IControl`

## Key Features

### Organization Management
- Create new organizations with unique alphanumeric IDs
- Manage organization metadata and configuration
- Handle organization lifecycle (active, paused, terminated)
- Integration with Treasury and Membership modules

### Alphanumeric ID System
- Generate unique, human-readable organization IDs
- Validate ID format and uniqueness
- Support for custom ID patterns
- Collision detection and resolution

### Access Control
- Role-based permissions for organization management
- Creator privileges and delegation
- Integration with Registry access control
- Granular permission system

## Core Functions

### Organization Creation

```solidity
function createOrganization(
    string memory name,
    string memory description,
    bytes32 orgType,
    address[] memory initialMembers,
    OrganizationConfig memory config
) external nonReentrant whenNotPaused returns (string memory orgId)
```

Creates a new organization with specified parameters.

**Parameters**:
- `name`: Organization display name
- `description`: Organization description
- `orgType`: Type of organization (DAO, Guild, etc.)
- `initialMembers`: Array of initial member addresses
- `config`: Organization configuration settings

**Returns**: Generated alphanumeric organization ID

**Access**: Public (with validation)

### Organization Management

```solidity
function updateOrganization(
    string memory orgId,
    string memory name,
    string memory description,
    OrganizationConfig memory config
) external onlyOrganizationAdmin(orgId)
```

Updates organization metadata and configuration.

**Parameters**:
- `orgId`: Organization identifier
- `name`: New organization name
- `description`: New organization description
- `config`: Updated configuration

**Access**: Organization admin only

```solidity
function pauseOrganization(
    string memory orgId
) external onlyOrganizationAdmin(orgId)
```

Pauses organization operations.

**Parameters**:
- `orgId`: Organization identifier

**Access**: Organization admin only

### Organization Queries

```solidity
function getOrganization(
    string memory orgId
) external view returns (OrganizationInfo memory)
```

Returns detailed information about an organization.

**Parameters**:
- `orgId`: Organization identifier

**Returns**: `OrganizationInfo` struct with organization details

```solidity
function getOrganizationsByCreator(
    address creator
) external view returns (string[] memory)
```

Returns all organizations created by a specific address.

**Parameters**:
- `creator`: Creator address

**Returns**: Array of organization IDs

## Data Structures

### OrganizationInfo

```solidity
struct OrganizationInfo {
    string id;                  // Alphanumeric ID
    string name;                // Display name
    string description;         // Description
    bytes32 orgType;            // Organization type
    address creator;            // Creator address
    uint256 createdAt;          // Creation timestamp
    uint256 memberCount;        // Current member count
    OrganizationConfig config;  // Configuration settings
    OrganizationState state;    // Current state
    address treasuryAddress;    // Treasury contract address
    address membershipAddress;  // Membership contract address
}
```

### OrganizationConfig

```solidity
struct OrganizationConfig {
    bool publicJoin;            // Allow public joining
    bool requireApproval;       // Require approval for joining
    uint256 membershipFee;      // Membership fee amount
    address feeToken;           // Fee token address
    uint256 maxMembers;         // Maximum member count
    uint256 votingPeriod;       // Default voting period
    uint256 quorum;             // Quorum requirement
    bytes32[] allowedRoles;     // Allowed member roles
}
```

### OrganizationState

```solidity
enum OrganizationState {
    Active,                     // Normal operation
    Paused,                     // Temporarily paused
    Terminated,                 // Permanently terminated
    Migrating                   // In migration process
}
```

## Events

### Organization Events

```solidity
event OrganizationCreated(
    string indexed orgId,
    string name,
    address indexed creator,
    bytes32 indexed orgType
);

event OrganizationUpdated(
    string indexed orgId,
    string name,
    string description
);

event OrganizationStateChanged(
    string indexed orgId,
    OrganizationState indexed oldState,
    OrganizationState indexed newState
);
```

### Configuration Events

```solidity
event OrganizationConfigUpdated(
    string indexed orgId,
    OrganizationConfig config
);

event MembershipFeeUpdated(
    string indexed orgId,
    uint256 oldFee,
    uint256 newFee,
    address feeToken
);
```

## Access Control

### Roles

```solidity
bytes32 public constant ORGANIZATION_ADMIN_ROLE = keccak256("ORGANIZATION_ADMIN_ROLE");
bytes32 public constant ORGANIZATION_MANAGER_ROLE = keccak256("ORGANIZATION_MANAGER_ROLE");
bytes32 public constant ORGANIZATION_CREATOR_ROLE = keccak256("ORGANIZATION_CREATOR_ROLE");
```

### Modifiers

```solidity
modifier onlyOrganizationAdmin(string memory orgId) {
    require(
        hasRole(ORGANIZATION_ADMIN_ROLE, msg.sender) ||
        isOrganizationCreator(orgId, msg.sender),
        "Not organization admin"
    );
    _;
}

modifier organizationExists(string memory orgId) {
    require(organizations[orgId].createdAt != 0, "Organization not found");
    _;
}

modifier organizationActive(string memory orgId) {
    require(
        organizations[orgId].state == OrganizationState.Active,
        "Organization not active"
    );
    _;
}
```

## Alphanumeric ID System

### ID Generation

```solidity
function generateOrganizationId(
    string memory name,
    address creator
) internal returns (string memory)
```

Generates a unique alphanumeric ID based on organization name and creator.

**Algorithm**:
1. Extract alphanumeric characters from name
2. Append creator address hash
3. Ensure uniqueness with counter
4. Validate format and length

### ID Validation

```solidity
function isValidOrganizationId(
    string memory orgId
) public pure returns (bool)
```

Validates organization ID format and requirements.

**Requirements**:
- 3-12 characters long
- Only alphanumeric characters
- Must start with a letter
- Case insensitive

## Integration Patterns

### Treasury Integration

```solidity
function _createTreasury(
    string memory orgId,
    address[] memory allowedTokens
) internal returns (address treasuryAddress)
```

Creates a treasury for the organization during creation.

### Membership Integration

```solidity
function _setupMembership(
    string memory orgId,
    address[] memory initialMembers
) internal returns (address membershipAddress)
```

Sets up membership management for the organization.

### Registry Integration

```solidity
function _registerOrganization(
    string memory orgId,
    address orgAddress,
    bytes32 orgType
) internal
```

Registers the organization with the central registry.

## Security Features

### Input Validation

```solidity
modifier validOrganizationName(string memory name) {
    require(bytes(name).length >= 3 && bytes(name).length <= 50, "Invalid name length");
    require(bytes(name)[0] != 0x20, "Name cannot start with space");
    _;
}

modifier validOrganizationType(bytes32 orgType) {
    require(orgType != bytes32(0), "Invalid organization type");
    _;
}
```

### Access Control

```solidity
function _checkOrganizationPermission(
    string memory orgId,
    address account,
    bytes32 permission
) internal view returns (bool)
```

Checks if an account has specific permissions for an organization.

### State Management

```solidity
function _validateStateTransition(
    OrganizationState current,
    OrganizationState next
) internal pure returns (bool)
```

Validates allowed state transitions for organizations.

## Gas Optimization

### Efficient Storage

```solidity
// Packed struct for gas optimization
struct PackedOrganizationInfo {
    uint128 createdAt;          // Creation timestamp
    uint64 memberCount;         // Member count
    uint32 configVersion;       // Configuration version
    OrganizationState state;    // Current state
}
```

### Batch Operations

```solidity
function batchCreateOrganizations(
    OrganizationCreateRequest[] memory requests
) external returns (string[] memory orgIds)
```

Creates multiple organizations in a single transaction.

## Testing

### Unit Tests
- Organization creation with various parameters
- ID generation and validation
- Access control enforcement
- State management
- Configuration updates

### Integration Tests
- Treasury integration during creation
- Membership setup and management
- Registry registration
- Cross-module communication

## Deployment

### Prerequisites
- Deploy Registry contract
- Deploy Treasury contract
- Deploy Membership contract
- Configure access roles

### Deployment Steps
1. Deploy Control contract
2. Initialize with registry
3. Configure organization types
4. Set up access permissions
5. Test organization creation
6. Verify integrations

## Monitoring

### Key Metrics
- Number of organizations created
- Organization creation rate
- Active vs paused organizations
- Member growth per organization

### Health Checks
- ID generation uniqueness
- Treasury integration status
- Membership setup success
- Registry synchronization

## Best Practices

### Development
- Validate all inputs thoroughly
- Use consistent error messages
- Implement proper event emission
- Test edge cases extensively

### Security
- Validate organization permissions
- Implement proper access control
- Monitor for suspicious activity
- Use secure ID generation

### Performance
- Optimize for common queries
- Use efficient data structures
- Minimize storage operations
- Cache frequently accessed data

## Common Use Cases

### DAO Creation

```solidity
// Create a DAO with governance features
OrganizationConfig memory daoConfig = OrganizationConfig({
    publicJoin: false,
    requireApproval: true,
    membershipFee: 100 * 10**18,
    feeToken: address(gameToken),
    maxMembers: 1000,
    votingPeriod: 7 days,
    quorum: 5000, // 50%
    allowedRoles: [MEMBER_ROLE, DELEGATE_ROLE, ADMIN_ROLE]
});

string memory daoId = control.createOrganization(
    "GameDAO Community",
    "A decentralized gaming community",
    DAO_TYPE,
    initialMembers,
    daoConfig
);
```

### Guild Creation

```solidity
// Create a gaming guild
OrganizationConfig memory guildConfig = OrganizationConfig({
    publicJoin: true,
    requireApproval: false,
    membershipFee: 0,
    feeToken: address(0),
    maxMembers: 50,
    votingPeriod: 3 days,
    quorum: 3000, // 30%
    allowedRoles: [MEMBER_ROLE, OFFICER_ROLE, LEADER_ROLE]
});

string memory guildId = control.createOrganization(
    "Elite Gamers Guild",
    "Competitive gaming guild",
    GUILD_TYPE,
    initialMembers,
    guildConfig
);
```
