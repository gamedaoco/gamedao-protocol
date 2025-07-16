# Module Base Contract

## Overview

The `Module` contract serves as the base contract for all GameDAO modules, providing common functionality including access control, pausable operations, reentrancy protection, and registry integration.

## Contract Details

- **File**: `contracts/core/Module.sol`
- **Size**: 6.3 KiB
- **Interface**: `IModule`
- **Inheritance**: `IModule`, `AccessControl`, `Pausable`, `ReentrancyGuard`

## Key Features

### Common Module Functionality
- Standardized initialization patterns
- Registry integration for module discovery
- Version management and compatibility
- Emergency pause capabilities

### Security Features
- Role-based access control (RBAC)
- Reentrancy protection for all functions
- Pausable operations for emergency stops
- Input validation and sanitization

### Lifecycle Management
- Initialization hooks for module setup
- Upgrade support with version tracking
- Deactivation and cleanup procedures
- Health check capabilities

## Core Functions

### Initialization

```solidity
constructor(string memory _version) {
    _version = _version;
    _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    _setupRole(MODULE_ADMIN_ROLE, msg.sender);
}

function initialize(address _registry) external onlyRole(MODULE_ADMIN_ROLE) {
    require(address(registry) == address(0), "Already initialized");
    registry = IRegistry(_registry);
    _onInitialize();
}
```

Initializes the module with registry connection and calls internal initialization hook.

**Parameters**:
- `_registry`: Address of the Registry contract

**Access**: `MODULE_ADMIN_ROLE`

### Registry Integration

```solidity
function registry() external view returns (IRegistry) {
    return registry;
}

function getModule(string memory name) internal view returns (address) {
    return registry.getModule(name);
}
```

Provides access to the registry and helper functions for module discovery.

### Version Management

```solidity
function version() external view returns (string memory) {
    return _version;
}

function isCompatible(string memory requiredVersion) external view returns (bool) {
    return _compareVersions(_version, requiredVersion) >= 0;
}
```

Version tracking and compatibility checking for upgrades.

### Emergency Controls

```solidity
function pause() external onlyRole(MODULE_ADMIN_ROLE) {
    _pause();
}

function unpause() external onlyRole(MODULE_ADMIN_ROLE) {
    _unpause();
}
```

Emergency pause functionality for critical situations.

## Abstract Functions

### Initialization Hook

```solidity
function _onInitialize() internal virtual;
```

Called during module initialization. Modules should override this to perform specific setup.

**Implementation Example**:
```solidity
function _onInitialize() internal override {
    // Grant roles to registry
    _grantRole(ORGANIZATION_MANAGER_ROLE, address(registry));

    // Initialize module-specific state
    _initializeModuleState();
}
```

## Data Structures

### ModuleMetadata

```solidity
struct ModuleMetadata {
    string name;            // Module name
    string version;         // Version string
    uint256 deployedAt;     // Deployment timestamp
    bool active;            // Active status
    address deployer;       // Deployer address
}
```

## Events

### Lifecycle Events

```solidity
event ModuleInitialized(
    address indexed registry,
    string version
);

event ModuleUpgraded(
    string indexed oldVersion,
    string indexed newVersion
);

event ModulePaused(
    address indexed admin
);

event ModuleUnpaused(
    address indexed admin
);
```

## Access Control

### Standard Roles

```solidity
bytes32 public constant MODULE_ADMIN_ROLE = keccak256("MODULE_ADMIN_ROLE");
bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
```

### Role Hierarchy
- `DEFAULT_ADMIN_ROLE`: Full module control
- `MODULE_ADMIN_ROLE`: Module administration
- `PAUSER_ROLE`: Emergency pause permissions
- `UPGRADER_ROLE`: Upgrade management

## Security Features

### Reentrancy Protection
All external functions that modify state should use the `nonReentrant` modifier:

```solidity
function externalFunction() external nonReentrant whenNotPaused {
    // Function implementation
}
```

### Access Control Patterns

```solidity
// Role-based access
function adminFunction() external onlyRole(MODULE_ADMIN_ROLE) {
    // Admin-only functionality
}

// Pausable operations
function normalOperation() external whenNotPaused {
    // Normal functionality that can be paused
}

// Combined security
function secureOperation()
    external
    nonReentrant
    whenNotPaused
    onlyRole(OPERATOR_ROLE)
{
    // Secure operation with multiple protections
}
```

### Input Validation

```solidity
modifier validAddress(address addr) {
    require(addr != address(0), "Invalid address");
    _;
}

modifier validString(string memory str) {
    require(bytes(str).length > 0, "Empty string");
    _;
}
```

## Integration Patterns

### Module Communication

```solidity
// Get another module's address
function getControlModule() internal view returns (IControl) {
    address controlAddr = registry.getModule("Control");
    return IControl(controlAddr);
}

// Cross-module function call
function callControlFunction(string memory orgId) internal {
    IControl control = getControlModule();
    control.someFunction(orgId);
}
```

### Registry Integration

```solidity
// Register with registry during initialization
function _onInitialize() internal override {
    // Self-register with registry
    registry.registerModule("MyModule", address(this), version());
}
```

## Inheritance Patterns

### Extending Module

```solidity
contract MyModule is Module, IMyModule {
    constructor() Module("1.0.0") {
        // Module-specific initialization
    }

    function _onInitialize() internal override {
        // Module-specific setup
        _setupModuleRoles();
        _initializeModuleState();
    }

    function myFunction() external nonReentrant whenNotPaused {
        // Module functionality
    }
}
```

### Common Patterns

```solidity
// Standard function pattern
function standardFunction(
    uint256 param1,
    string memory param2
)
    external
    nonReentrant
    whenNotPaused
    validAddress(msg.sender)
    returns (bool success)
{
    // Implementation
    return true;
}

// Admin function pattern
function adminFunction(
    address target
)
    external
    onlyRole(MODULE_ADMIN_ROLE)
    validAddress(target)
{
    // Admin implementation
}
```

## Testing Patterns

### Mock Module

```solidity
contract MockModule is Module {
    constructor() Module("1.0.0") {}

    function _onInitialize() internal override {
        // Test-specific initialization
    }

    function testFunction() external view returns (bool) {
        return true;
    }
}
```

### Test Helpers

```solidity
// Test base contract
contract ModuleTest is Test {
    Module module;
    Registry registry;

    function setUp() public {
        registry = new Registry();
        module = new MockModule();
        module.initialize(address(registry));
    }

    function testInitialization() public {
        assertEq(address(module.registry()), address(registry));
        assertEq(module.version(), "1.0.0");
    }
}
```

## Upgrade Procedures

### Module Upgrades

1. Deploy new module version
2. Test compatibility with existing registry
3. Update registry with new module address
4. Verify module functionality
5. Update dependent modules if needed

### Breaking Changes

1. Update interface version
2. Implement migration logic
3. Coordinate with all dependent modules
4. Test upgrade procedures thoroughly
5. Plan rollback procedures

## Gas Optimization

### Efficient Modifiers
- Use view functions where possible
- Minimize storage reads in modifiers
- Cache frequently accessed data

### Storage Patterns
- Pack related data into structs
- Use appropriate data types
- Minimize storage operations

## Best Practices

### Development
- Always extend Module for new modules
- Use standard security modifiers
- Implement proper error handling
- Write comprehensive tests

### Security
- Validate all inputs
- Use reentrancy protection
- Implement proper access control
- Plan for emergency scenarios

### Performance
- Optimize for common use cases
- Use efficient data structures
- Minimize external calls
- Cache frequently accessed data

## Common Pitfalls

### Initialization
- Don't forget to call parent constructors
- Always implement `_onInitialize()` hook
- Validate registry address

### Access Control
- Grant roles carefully
- Use role hierarchy appropriately
- Don't bypass access control in internal functions

### Upgrades
- Test compatibility thoroughly
- Plan migration procedures
- Coordinate with dependent systems
- Maintain backward compatibility when possible
