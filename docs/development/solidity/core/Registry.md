# Registry Contract

## Overview

The `Registry` contract serves as the central registry for all GameDAO modules and organizations. It acts as the system's backbone, managing module addresses, organization lifecycle, and providing access control for system-wide operations.

## Contract Details

- **File**: `contracts/core/Registry.sol`
- **Size**: 7.761 KiB
- **Interface**: `IRegistry`
- **Inheritance**: `Module`, `IRegistry`

## Key Features

### Module Management
- Register and manage all GameDAO modules
- Handle module upgrades and replacements
- Provide module address resolution
- Version management for compatibility

### Organization Registry
- Maintain registry of all organizations
- Track organization metadata and status
- Provide organization lookup capabilities
- Handle organization lifecycle events

### Access Control
- System-wide role management
- Permission delegation to modules
- Security controls for critical operations
- Emergency pause functionality

## Core Functions

### Module Registration

```solidity
function registerModule(
    string memory name,
    address moduleAddress,
    string memory version
) external onlyRole(MODULE_ADMIN_ROLE)
```

Registers a new module or updates an existing one.

**Parameters**:
- `name`: Module name (e.g., "Control", "Flow")
- `moduleAddress`: Address of the deployed module
- `version`: Version string for compatibility tracking

**Access**: `MODULE_ADMIN_ROLE`

### Organization Management

```solidity
function registerOrganization(
    string memory orgId,
    address orgAddress,
    bytes32 orgType
) external onlyRole(ORGANIZATION_MANAGER_ROLE)
```

Registers a new organization in the system.

**Parameters**:
- `orgId`: Unique alphanumeric organization identifier
- `orgAddress`: Address of the organization (Control contract)
- `orgType`: Type of organization (DAO, Guild, etc.)

**Access**: `ORGANIZATION_MANAGER_ROLE`

### Module Resolution

```solidity
function getModule(string memory name) external view returns (address)
```

Returns the current address of a registered module.

**Parameters**:
- `name`: Module name to lookup

**Returns**: Current module address

### Organization Lookup

```solidity
function getOrganization(string memory orgId) external view returns (OrganizationInfo memory)
```

Returns information about a registered organization.

**Parameters**:
- `orgId`: Organization identifier

**Returns**: `OrganizationInfo` struct with organization details

## Data Structures

### OrganizationInfo

```solidity
struct OrganizationInfo {
    string id;              // Alphanumeric ID
    address orgAddress;     // Control contract address
    bytes32 orgType;        // Organization type
    uint256 createdAt;      // Creation timestamp
    bool active;            // Active status
    address creator;        // Creator address
}
```

### ModuleInfo

```solidity
struct ModuleInfo {
    string name;            // Module name
    address moduleAddress;  // Current module address
    string version;         // Version string
    uint256 registeredAt;   // Registration timestamp
    bool active;            // Active status
}
```

## Events

### Module Events

```solidity
event ModuleRegistered(
    string indexed name,
    address indexed moduleAddress,
    string version
);

event ModuleUpdated(
    string indexed name,
    address indexed oldAddress,
    address indexed newAddress,
    string version
);

event ModuleDeactivated(
    string indexed name,
    address indexed moduleAddress
);
```

### Organization Events

```solidity
event OrganizationRegistered(
    string indexed orgId,
    address indexed orgAddress,
    bytes32 indexed orgType,
    address creator
);

event OrganizationUpdated(
    string indexed orgId,
    address indexed oldAddress,
    address indexed newAddress
);

event OrganizationDeactivated(
    string indexed orgId,
    address indexed orgAddress
);
```

## Access Control

### Roles

```solidity
bytes32 public constant MODULE_ADMIN_ROLE = keccak256("MODULE_ADMIN_ROLE");
bytes32 public constant ORGANIZATION_MANAGER_ROLE = keccak256("ORGANIZATION_MANAGER_ROLE");
bytes32 public constant REGISTRY_ADMIN_ROLE = keccak256("REGISTRY_ADMIN_ROLE");
```

### Role Hierarchy
- `ADMIN_ROLE`: Full system control
- `MODULE_ADMIN_ROLE`: Module registration and management
- `ORGANIZATION_MANAGER_ROLE`: Organization lifecycle management
- `REGISTRY_ADMIN_ROLE`: Registry configuration and emergency controls

## Security Features

### Input Validation
- Alphanumeric ID format validation
- Address zero checks
- Duplicate registration prevention
- Version format validation

### Access Control
- Role-based permissions for all operations
- Multi-signature support for critical functions
- Emergency pause functionality
- Upgrade protection mechanisms

### Audit Trail
- All operations emit events
- Indexed parameters for efficient querying
- Historical data preservation
- Change tracking and versioning

## Integration Patterns

### Module Integration

```solidity
// In module contracts
IRegistry public registry;

constructor(address _registry) {
    registry = IRegistry(_registry);
}

function getControlModule() internal view returns (address) {
    return registry.getModule("Control");
}
```

### Organization Integration

```solidity
// In frontend/backend
const registryContract = new ethers.Contract(registryAddress, registryABI, provider);

// Get module address
const controlAddress = await registryContract.getModule("Control");

// Get organization info
const orgInfo = await registryContract.getOrganization("GAME001");
```

## Upgrade Procedures

### Module Upgrades

1. Deploy new module version
2. Test thoroughly on staging
3. Call `registerModule()` with new address
4. Verify module functionality
5. Update frontend configurations

### Registry Upgrades

1. Deploy new registry version
2. Migrate organization data
3. Update all module references
4. Test system integration
5. Coordinate frontend updates

## Gas Optimization

### Efficient Lookups
- Mapping-based storage for O(1) lookups
- Packed structs to minimize storage slots
- Cached frequently accessed data

### Batch Operations
- Batch module registration
- Bulk organization updates
- Efficient event emission

## Testing

### Unit Tests
- Module registration and deregistration
- Organization lifecycle management
- Access control enforcement
- Input validation

### Integration Tests
- Module interaction flows
- Organization creation workflows
- Upgrade procedures
- Emergency scenarios

## Deployment

### Prerequisites
- Deploy base Module contract
- Configure initial admin roles
- Set up monitoring infrastructure

### Deployment Steps
1. Deploy Registry contract
2. Initialize with admin roles
3. Register initial modules
4. Configure access permissions
5. Verify system integration

## Monitoring

### Key Metrics
- Number of registered modules
- Number of active organizations
- Module upgrade frequency
- Error rates and failures

### Health Checks
- Module address resolution
- Organization lookup performance
- Access control validation
- Event emission verification

## Best Practices

### Development
- Always validate inputs
- Use events for state changes
- Implement proper access control
- Test upgrade procedures thoroughly

### Operations
- Monitor module health
- Backup organization data
- Plan upgrade procedures
- Maintain audit trails

### Security
- Regular security audits
- Access control reviews
- Emergency response procedures
- Incident response planning
