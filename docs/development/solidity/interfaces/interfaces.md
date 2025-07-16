# GameDAO Interfaces Documentation

## Overview

GameDAO v3 uses a comprehensive interface system to ensure consistency, enable upgradability, and provide clear contracts between modules. All interfaces follow consistent patterns and provide complete functionality definitions.

## Interface Architecture

### Design Principles
- **Consistency**: All interfaces follow the same naming and structure patterns
- **Completeness**: Interfaces define all public functionality
- **Upgradability**: Interfaces enable module replacement without breaking dependencies
- **Documentation**: All functions are fully documented with NatSpec

### Interface Categories

#### Core Interfaces
- `IRegistry`: Central registry for modules and organizations
- `IModule`: Base interface for all GameDAO modules
- `ITreasury`: Treasury and financial operations

#### Module Interfaces
- `IControl`: Organization creation and management
- `IMembership`: Comprehensive membership management
- `IFlow`: Crowdfunding and campaign management
- `ISignal`: Voting and governance system
- `ISense`: Reputation and achievement system
- `IIdentity`: User identity and profile management
- `IStaking`: Token staking and rewards

#### Token Interfaces
- `IGameToken`: ERC20 token interface for GameDAO tokens

## Core Interfaces

### IRegistry

**Purpose**: Central registry for all GameDAO modules and organizations

**Key Functions**:
```solidity
function registerModule(string memory name, address moduleAddress, string memory version) external;
function getModule(string memory name) external view returns (address);
function registerOrganization(string memory orgId, address orgAddress, bytes32 orgType) external;
function getOrganization(string memory orgId) external view returns (OrganizationInfo memory);
```

**Events**:
```solidity
event ModuleRegistered(string indexed name, address indexed moduleAddress, string version);
event OrganizationRegistered(string indexed orgId, address indexed orgAddress, bytes32 indexed orgType);
```

### IModule

**Purpose**: Base interface for all GameDAO modules

**Key Functions**:
```solidity
function initialize(address _registry) external;
function registry() external view returns (IRegistry);
function version() external view returns (string memory);
function pause() external;
function unpause() external;
```

**Events**:
```solidity
event ModuleInitialized(address indexed registry, string version);
event ModulePaused(address indexed admin);
event ModuleUnpaused(address indexed admin);
```

## Module Interfaces

### IControl

**Purpose**: Organization creation and management

**Key Functions**:
```solidity
function createOrganization(
    string memory name,
    string memory description,
    bytes32 orgType,
    address[] memory initialMembers,
    OrganizationConfig memory config
) external returns (string memory orgId);

function updateOrganization(
    string memory orgId,
    string memory name,
    string memory description,
    OrganizationConfig memory config
) external;

function getOrganization(string memory orgId) external view returns (OrganizationInfo memory);
```

**Structs**:
```solidity
struct OrganizationInfo {
    string id;
    string name;
    string description;
    bytes32 orgType;
    address creator;
    uint256 createdAt;
    uint256 memberCount;
    OrganizationConfig config;
    OrganizationState state;
}

struct OrganizationConfig {
    bool publicJoin;
    bool requireApproval;
    uint256 membershipFee;
    address feeToken;
    uint256 maxMembers;
    uint256 votingPeriod;
    uint256 quorum;
    bytes32[] allowedRoles;
}
```

### IMembership

**Purpose**: Comprehensive membership management system

**Key Functions**:
```solidity
function addMember(string memory orgId, address member, MembershipTier tier, uint256 votingPower) external;
function removeMember(string memory orgId, address member, string memory reason) external;
function updateMemberState(string memory orgId, address member, MemberState newState, string memory reason) external;
function updateVotingPower(string memory orgId, address member, uint256 newVotingPower) external;
function delegateVotingPower(string memory orgId, address delegate, uint256 amount) external;
function updateReputation(string memory orgId, address member, int256 reputationChange, string memory reason) external;
```

**Enums**:
```solidity
enum MemberState { Inactive, Active, Paused, Kicked, Banned }
enum MembershipTier { Basic, Premium, VIP, Founder }
```

**Structs**:
```solidity
struct MemberInfo {
    address memberAddress;
    MemberState state;
    MembershipTier tier;
    uint256 joinedAt;
    uint256 votingPower;
    uint256 delegatedPower;
    address delegatedTo;
    int256 reputation;
    uint256 lastActivity;
    bytes32[] roles;
}
```

### IFlow

**Purpose**: Crowdfunding and campaign management

**Key Functions**:
```solidity
function createCampaign(
    string memory orgId,
    string memory title,
    string memory description,
    uint256 target,
    uint256 deadline,
    address[] memory allowedTokens
) external returns (bytes32 campaignId);

function contributeToCampaign(bytes32 campaignId, address token, uint256 amount) external;
function withdrawFromCampaign(bytes32 campaignId, uint256 amount) external;
function finalizeCampaign(bytes32 campaignId) external;
```

**Structs**:
```solidity
struct CampaignInfo {
    bytes32 id;
    string orgId;
    string title;
    string description;
    address creator;
    uint256 target;
    uint256 raised;
    uint256 deadline;
    uint256 createdAt;
    CampaignState state;
    address[] allowedTokens;
    mapping(address => uint256) contributions;
}

enum CampaignState { Active, Paused, Successful, Failed, Cancelled }
```

### ISignal

**Purpose**: Voting and governance system

**Key Functions**:
```solidity
function createProposal(
    string memory orgId,
    string memory title,
    string memory description,
    bytes memory proposalData,
    uint256 votingPeriod
) external returns (bytes32 proposalId);

function vote(bytes32 proposalId, bool support, uint256 votingPower, string memory reason) external;
function executeProposal(bytes32 proposalId) external;
function cancelProposal(bytes32 proposalId) external;
```

**Structs**:
```solidity
struct ProposalInfo {
    bytes32 id;
    string orgId;
    string title;
    string description;
    address proposer;
    uint256 createdAt;
    uint256 votingDeadline;
    uint256 forVotes;
    uint256 againstVotes;
    uint256 abstainVotes;
    ProposalState state;
    bytes proposalData;
}

enum ProposalState { Pending, Active, Cancelled, Defeated, Succeeded, Queued, Expired, Executed }
```

### ISense

**Purpose**: Reputation and achievement system

**Key Functions**:
```solidity
function createAchievement(
    string memory orgId,
    string memory name,
    string memory description,
    uint256 reputationReward,
    bytes memory criteria
) external returns (bytes32 achievementId);

function awardAchievement(string memory orgId, address member, bytes32 achievementId) external;
function revokeAchievement(string memory orgId, address member, bytes32 achievementId) external;
function updateReputation(string memory orgId, address member, int256 change, string memory reason) external;
```

**Structs**:
```solidity
struct AchievementInfo {
    bytes32 id;
    string orgId;
    string name;
    string description;
    uint256 reputationReward;
    uint256 createdAt;
    address creator;
    bool active;
    bytes criteria;
}

struct ReputationInfo {
    int256 totalReputation;
    uint256 lastUpdated;
    mapping(bytes32 => uint256) achievements;
    ReputationHistory[] history;
}
```

### IIdentity

**Purpose**: User identity and profile management

**Key Functions**:
```solidity
function createProfile(
    string memory username,
    string memory displayName,
    string memory bio,
    string memory avatar
) external returns (bytes32 profileId);

function updateProfile(
    bytes32 profileId,
    string memory displayName,
    string memory bio,
    string memory avatar
) external;

function verifyIdentity(address user, bytes32 identityType, bytes memory proof) external;
function linkExternalAccount(bytes32 profileId, string memory platform, string memory accountId) external;
```

**Structs**:
```solidity
struct ProfileInfo {
    bytes32 id;
    address owner;
    string username;
    string displayName;
    string bio;
    string avatar;
    uint256 createdAt;
    uint256 lastUpdated;
    bool verified;
    mapping(string => string) externalAccounts;
}

struct IdentityVerification {
    bytes32 identityType;
    bool verified;
    uint256 verifiedAt;
    address verifier;
    bytes proof;
}
```

### IStaking

**Purpose**: Token staking and rewards

**Key Functions**:
```solidity
function createStakingPool(
    string memory orgId,
    address stakingToken,
    address rewardToken,
    uint256 rewardRate,
    uint256 lockPeriod
) external returns (bytes32 poolId);

function stake(bytes32 poolId, uint256 amount) external;
function unstake(bytes32 poolId, uint256 amount) external;
function claimRewards(bytes32 poolId) external;
function delegate(bytes32 poolId, address delegate, uint256 amount) external;
```

**Structs**:
```solidity
struct StakingPoolInfo {
    bytes32 id;
    string orgId;
    address stakingToken;
    address rewardToken;
    uint256 rewardRate;
    uint256 lockPeriod;
    uint256 totalStaked;
    uint256 createdAt;
    address creator;
    bool active;
}

struct StakerInfo {
    uint256 stakedAmount;
    uint256 rewardDebt;
    uint256 lastStakeTime;
    uint256 delegatedAmount;
    address delegatedTo;
    mapping(bytes32 => uint256) poolStakes;
}
```

## Token Interfaces

### IGameToken

**Purpose**: ERC20 token interface for GameDAO tokens

**Key Functions**:
```solidity
function mint(address to, uint256 amount) external;
function burn(uint256 amount) external;
function burnFrom(address account, uint256 amount) external;
function pause() external;
function unpause() external;
```

**Inheritance**: Extends standard ERC20 interface with additional GameDAO-specific functionality.

## Interface Usage Patterns

### Module Discovery

```solidity
// Get module address from registry
IRegistry registry = IRegistry(registryAddress);
address controlAddress = registry.getModule("Control");
IControl control = IControl(controlAddress);
```

### Cross-Module Communication

```solidity
// In Signal module, check membership before voting
IMembership membership = IMembership(registry.getModule("Membership"));
require(membership.getMemberState(orgId, msg.sender) == MemberState.Active, "Not active member");
```

### Type Safety

```solidity
// Use interfaces for type safety
function processVote(ISignal signal, bytes32 proposalId, bool support) external {
    signal.vote(proposalId, support, votingPower, reason);
}
```

## Interface Versioning

### Version Management
- Interfaces include version information
- Breaking changes increment major version
- Backward compatibility maintained when possible
- Migration paths provided for major updates

### Compatibility Checking

```solidity
function checkCompatibility(address moduleAddress) external view returns (bool) {
    IModule module = IModule(moduleAddress);
    return module.isCompatible("1.0.0");
}
```

## Best Practices

### Interface Design
- Keep interfaces focused and cohesive
- Use consistent naming conventions
- Provide comprehensive documentation
- Include all necessary events and errors

### Implementation
- Always implement complete interfaces
- Use interface inheritance appropriately
- Validate interface compliance in tests
- Document implementation-specific behavior

### Usage
- Always use interfaces for external calls
- Check interface support before calling
- Handle interface changes gracefully
- Use type-safe patterns

## Testing Interfaces

### Interface Compliance Tests

```solidity
contract InterfaceComplianceTest {
    function testControlInterface() public {
        IControl control = IControl(controlAddress);

        // Test all interface functions
        assertTrue(control.supportsInterface(type(IControl).interfaceId));

        // Test function signatures
        bytes4 createOrgSig = IControl.createOrganization.selector;
        assertTrue(control.supportsInterface(createOrgSig));
    }
}
```

### Mock Implementations

```solidity
contract MockControl is IControl {
    function createOrganization(
        string memory name,
        string memory description,
        bytes32 orgType,
        address[] memory initialMembers,
        OrganizationConfig memory config
    ) external override returns (string memory) {
        return "TEST001";
    }

    // ... implement all interface functions
}
```

## Future Considerations

### Interface Evolution
- Plan for interface extensions
- Consider backward compatibility
- Design for modularity
- Prepare migration strategies

### Standards Compliance
- Follow ERC standards where applicable
- Contribute to standard development
- Ensure interoperability
- Maintain compliance documentation

This comprehensive interface system provides a solid foundation for GameDAO v3's modular architecture while ensuring consistency, upgradability, and clear contracts between all system components.
