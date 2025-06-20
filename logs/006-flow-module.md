# Flow Module Implementation Guide

## Overview
The Flow module is GameDAO's comprehensive crowdfunding and campaign management system, supporting multiple funding models and reward mechanisms for gaming communities.

## Architecture

### Core Components
- **Flow Contract (750+ lines)**: Main implementation with all crowdfunding features
- **IFlow Interface (252 lines)**: Complete API definition with events and functions
- **Campaign Management**: Full lifecycle from creation to finalization
- **Multi-token Support**: ETH and ERC20 token contributions
- **Reward Distribution**: Proportional token rewards for successful campaigns

### Flow Types
The Flow module supports 6 distinct campaign types:

1. **Grant (0)**: Grant funding with no return expected
2. **Raise (1)**: Fundraising with token/equity return
3. **Lend (2)**: Lending with interest
4. **Loan (3)**: Borrowing funds
5. **Share (4)**: Revenue sharing
6. **Pool (5)**: Liquidity pooling

### Campaign States
Campaigns progress through a defined lifecycle:

1. **Created (0)**: Campaign created but not started
2. **Active (1)**: Campaign is live and accepting contributions
3. **Paused (2)**: Campaign temporarily paused by admin
4. **Succeeded (3)**: Campaign reached its minimum goal
5. **Failed (4)**: Campaign failed to reach minimum
6. **Locked (5)**: Campaign locked by admin
7. **Finalized (6)**: Campaign completed and funds distributed

## Key Features

### Campaign Creation
```solidity
function createCampaign(
    bytes32 organizationId,
    string memory title,
    string memory description,
    string memory metadataURI,
    FlowType flowType,
    address paymentToken,
    uint256 target,
    uint256 min,
    uint256 max,
    uint256 duration,
    bool autoFinalize
) external returns (bytes32 campaignId)
```

**Parameters:**
- `organizationId`: Must be a valid organization from Control module
- `title`: Campaign title (required, non-empty)
- `description`: Detailed campaign description
- `metadataURI`: IPFS URI for additional metadata
- `flowType`: One of 6 supported flow types
- `paymentToken`: Address(0) for ETH, or ERC20 token address
- `target`: Target funding amount
- `min`: Minimum amount to consider campaign successful
- `max`: Maximum amount (0 for unlimited)
- `duration`: Campaign duration in seconds
- `autoFinalize`: Whether to auto-finalize when target is reached

### Contribution System
```solidity
function contribute(
    bytes32 campaignId,
    uint256 amount,
    string memory metadata
) external payable
```

**Features:**
- **ETH Contributions**: Send ETH directly with `msg.value`
- **ERC20 Contributions**: Automatic token transfer from contributor
- **Multiple Contributions**: Contributors can contribute multiple times
- **Contribution Tracking**: Complete history and metadata
- **Validation**: Amount limits, campaign state, and timing checks

### Protocol Fees
- **Default Rate**: 2.5% (250 basis points)
- **Maximum Rate**: 10% (1000 basis points)
- **Collection**: Automatic on campaign finalization
- **Recipient**: Configurable by admin
- **Calculation**: `(amount * feeRate) / 10000`

### Reward Distribution
```solidity
function distributeRewards(
    bytes32 campaignId,
    address rewardToken,
    uint256 totalRewardAmount
) external
```

**Features:**
- **Proportional Distribution**: Based on contribution amounts
- **Multiple Tokens**: Support for different reward tokens
- **Claim Mechanism**: Contributors claim their own rewards
- **Tracking**: Complete reward distribution analytics

### Access Control
- **FLOW_ADMIN_ROLE**: Protocol administration
- **CAMPAIGN_CREATOR_ROLE**: Campaign creation permissions
- **Creator Controls**: Campaign updates and management
- **Admin Override**: Emergency controls and state management

## Integration

### Control Module Integration
```solidity
function _validateOrganization(bytes32 organizationId) internal view {
    address controlModule = getModule(keccak256("CONTROL"));
    if (controlModule == address(0)) revert OrganizationNotFound(organizationId);

    IControl control = IControl(controlModule);
    if (!control.isOrganizationActive(organizationId)) {
        revert OrganizationNotFound(organizationId);
    }
}
```

**Cross-Module Communication:**
- Organization validation through Control module
- Registry-based module discovery
- Shared access control patterns
- Event synchronization for subgraphs

### Registry Integration
- **Module ID**: `keccak256("FLOW")`
- **Automatic Initialization**: Registry calls `initialize()` on registration
- **Role Management**: Registry receives admin roles
- **Lifecycle Management**: Enable/disable through registry

## Security Features

### Access Control
- **OpenZeppelin AccessControl**: Role-based permissions
- **Custom Roles**: FLOW_ADMIN_ROLE, CAMPAIGN_CREATOR_ROLE
- **Creator Permissions**: Campaign creators can update their campaigns
- **Admin Override**: Protocol admins can manage any campaign

### Financial Security
- **ReentrancyGuard**: Protection against reentrancy attacks
- **SafeERC20**: Secure token transfers
- **Amount Validation**: Comprehensive input validation
- **State Checks**: Campaign state and timing validation

### Emergency Controls
- **Pausable**: Emergency pause functionality
- **Admin Controls**: Campaign state override
- **Emergency Withdrawal**: Admin can withdraw funds in emergencies
- **Protocol Fee Limits**: Maximum 10% fee protection

## Testing Coverage

### Test Suites (29 Test Cases)
1. **Campaign Creation (3 tests)**
   - Successful campaign creation
   - Invalid parameter rejection
   - Organization validation

2. **Campaign Management (4 tests)**
   - Campaign updates
   - Access control validation
   - State management
   - Admin controls

3. **Contributions (6 tests)**
   - ETH contributions
   - Multiple contributions
   - Multiple contributors
   - Contribution limits
   - Validation checks

4. **Campaign Finalization (4 tests)**
   - Successful campaigns
   - Failed campaigns
   - Auto-finalization
   - Access control

5. **Protocol Fees (4 tests)**
   - Fee calculation
   - Fee collection
   - Fee rate updates
   - Invalid fee rejection

6. **View Functions (6 tests)**
   - Campaign progress
   - Organization queries
   - State queries
   - Activity checks
   - Campaign counting

7. **Edge Cases (2 tests)**
   - Non-existent campaigns
   - Unlimited campaigns

### Integration Testing
- **Cross-Module**: Flow ↔ Control communication
- **Registry**: Module registration and initialization
- **Deployment**: End-to-end deployment testing
- **Live Testing**: Real campaign creation and contribution

## Deployment

### Contract Sizes
- **Flow Contract**: 16.383 KiB (optimized for production)
- **Gas Efficiency**: Custom errors and optimized storage
- **Deployment Cost**: Reasonable for mainnet deployment

### Deployment Script Integration
```typescript
// Deploy Flow Module
const FlowFactory = await ethers.getContractFactory("Flow");
const flow = await FlowFactory.deploy();
await flow.waitForDeployment();

// Register with Registry
await registry.registerModule(await flow.getAddress());
await registry.enableModule(ethers.keccak256(ethers.toUtf8Bytes("FLOW")));

// Test Campaign Creation
const campaignTx = await flow.createCampaign(
  orgId,
  "GameDAO Test Campaign",
  "A test crowdfunding campaign",
  "ipfs://metadata",
  0, // Grant type
  ethers.ZeroAddress, // ETH
  ethers.parseEther("10"), // Target
  ethers.parseEther("5"),  // Min
  ethers.parseEther("20"), // Max
  86400 * 30, // 30 days
  false // Manual finalization
);
```

## API Reference

### Core Functions
- `createCampaign()`: Create new campaign
- `updateCampaign()`: Update campaign parameters
- `setCampaignState()`: Admin state management
- `contribute()`: Make contributions
- `finalizeCampaign()`: Finalize campaign
- `refundContribution()`: Refund failed campaigns
- `distributeRewards()`: Distribute reward tokens
- `claimRewards()`: Claim contributor rewards
- `withdrawFunds()`: Withdraw campaign funds

### View Functions
- `getCampaign()`: Get campaign details
- `getContribution()`: Get contribution details
- `getCampaignContributors()`: List contributors
- `getCampaignsByOrganization()`: Organization campaigns
- `getCampaignsByState()`: Filter by state
- `isCampaignActive()`: Check if active
- `canContribute()`: Check contribution eligibility
- `getCampaignProgress()`: Progress analytics
- `getTimeRemaining()`: Time calculations
- `getCampaignCount()`: Total campaigns
- `getProtocolFeeRate()`: Current fee rate
- `calculateProtocolFee()`: Fee calculation
- `getRewardDistribution()`: Reward analytics

### Events
- `CampaignCreated`: New campaign created
- `CampaignUpdated`: Campaign parameters updated
- `CampaignStateChanged`: State transition
- `ContributionMade`: New contribution
- `ContributionRefunded`: Refund processed
- `CampaignFinalized`: Campaign completed
- `RewardsDistributed`: Rewards allocated
- `ProtocolFeeCollected`: Fee collected

## Usage Examples

### Basic Campaign Creation
```solidity
// Create a grant campaign for 10 ETH
bytes32 campaignId = flow.createCampaign(
    organizationId,
    "Community Grant",
    "Funding for community development",
    "ipfs://QmGrantMetadata",
    FlowType.Grant,
    address(0), // ETH
    10 ether,   // Target
    5 ether,    // Minimum
    20 ether,   // Maximum
    30 days,    // Duration
    true        // Auto-finalize
);
```

### Making Contributions
```solidity
// ETH contribution
flow.contribute{value: 2 ether}(
    campaignId,
    2 ether,
    "Supporting the community"
);

// ERC20 contribution
IERC20(token).approve(address(flow), amount);
flow.contribute(campaignId, amount, "Token contribution");
```

### Reward Distribution
```solidity
// Distribute reward tokens
IERC20(rewardToken).approve(address(flow), totalRewards);
flow.distributeRewards(campaignId, rewardToken, totalRewards);

// Contributors claim rewards
flow.claimRewards(campaignId, rewardToken);
```

## Best Practices

### Campaign Creation
1. **Validate Parameters**: Ensure min ≤ target ≤ max (if max > 0)
2. **Set Realistic Goals**: Balance ambition with achievability
3. **Choose Duration Wisely**: Consider community engagement patterns
4. **Metadata Quality**: Provide comprehensive IPFS metadata

### Contribution Security
1. **Amount Validation**: Check contribution limits
2. **State Verification**: Ensure campaign is active
3. **Token Approvals**: Set appropriate allowances for ERC20
4. **Gas Considerations**: Account for gas costs in contributions

### Integration Patterns
1. **Organization Validation**: Always validate through Control module
2. **Event Monitoring**: Subscribe to campaign events for real-time updates
3. **State Management**: Track campaign states for UI updates
4. **Error Handling**: Handle custom errors appropriately

## Performance Characteristics

### Gas Optimization
- **Custom Errors**: Reduced gas costs for error handling
- **Efficient Storage**: Optimized data structures
- **Batch Operations**: Minimize transaction costs
- **Event-Driven**: Minimal storage, maximum events

### Scalability
- **Unlimited Campaigns**: No artificial limits
- **Efficient Queries**: Optimized view functions
- **State Indexing**: EnumerableSet for efficient filtering
- **Modular Design**: Independent of other modules

## Future Enhancements

### Planned Features
1. **Advanced Reward Mechanisms**: Vesting schedules, milestone-based rewards
2. **Governance Integration**: Community voting on campaign parameters
3. **Cross-Chain Support**: Multi-chain campaign deployment
4. **Advanced Analytics**: Comprehensive campaign metrics

### Extension Points
1. **Custom Flow Types**: Additional campaign types
2. **Plugin Architecture**: Third-party integrations
3. **Oracle Integration**: External data feeds
4. **Automated Execution**: Smart contract automation

---

**Status**: ✅ Production Ready - Comprehensive crowdfunding system with 29 passing tests

**Next**: Ready for Signal Module (Governance) implementation
