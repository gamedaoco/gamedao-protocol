# GameDAO v3 Governance Settings Architecture

## Overview

GameDAO v3 implements a comprehensive governance system where all organization settings require community approval through voting. This ensures democratic control over critical parameters that affect the organization's operation.

## Architecture

### Core Components

1. **OrganizationSettings Contract**: Central registry for all organization settings
2. **Signal Contract**: Governance voting mechanism with settings proposal support
3. **Control Contract**: Organization management with settings integration
4. **GameDAOMembership Contract**: Membership management with settings-based parameters

### Settings Categories

#### 1. Voting Parameters
- **Voting Delay**: Time before voting starts after proposal creation
- **Voting Period**: Duration of the voting window
- **Execution Delay**: Time between vote completion and execution
- **Quorum Threshold**: Minimum participation required (basis points)
- **Proposal Threshold**: Minimum tokens required to create proposals
- **Require Membership**: Whether only members can vote

#### 2. Membership Configuration
- **Membership Fee**: Cost to join the organization
- **Member Limit**: Maximum number of members
- **Access Model**: How new members are admitted (Open/Voting/Invite)
- **Fee Model**: How membership fees are handled (NoFees/Reserve/Transfer)
- **Minimum Stake**: Required stake for membership

#### 3. Treasury Configuration
- **Spending Limit**: Maximum spending without governance approval
- **Proposal Bond**: Bond required for treasury proposals
- **Authorized Spenders**: Addresses with direct spending authority
- **Emergency Fund**: Allocation for emergency situations

#### 4. Staking Requirements
- **Organization Stake**: Stake required to create organization
- **Member Stake**: Stake required for membership
- **Lock Period**: Duration stakes are locked
- **Slashing Rate**: Penalty rate for violations

#### 5. Reputation Configuration
- **Base Reputation**: Starting reputation for new members
- **Max Reputation**: Maximum reputation possible
- **Reputation Decay**: Daily decay rate
- **Proposal Reward**: Reputation gained for creating proposals
- **Voting Reward**: Reputation gained for voting

#### 6. Governance Configuration
- **Emergency Voting Period**: Voting period for emergency proposals
- **Constitutional Threshold**: Threshold for constitutional changes
- **Admin Action Delay**: Delay for administrative actions
- **Enable Conviction Voting**: Whether conviction voting is enabled

## Governance Process

### 1. Proposal Creation

Members can create settings proposals through the Signal contract:

```solidity
function createSettingsProposal(
    bytes8 organizationId,
    string memory title,
    string memory description,
    SettingProposalType settingType,
    bytes memory settingData,
    string memory reason
) external returns (string memory hierarchicalId)
```

### 2. Voting Process

1. **Proposal Created**: Setting change is proposed in OrganizationSettings
2. **Voting Delay**: Configurable delay before voting starts
3. **Active Voting**: Members cast votes (For/Against/Abstain)
4. **Vote Calculation**: Checks quorum and voting type requirements
5. **Execution Delay**: Time for review before execution
6. **Execution**: Approved changes are applied to settings

### 3. Execution

Successful proposals trigger:
1. **Approval**: OrganizationSettings marks change as approved
2. **Execution**: Settings are updated in the contract
3. **Events**: Relevant events are emitted
4. **History**: Change is recorded in history

## Settings Proposal Types

### Voting Parameters Example

```typescript
const newVotingParams = {
    votingDelay: 172800, // 2 days
    votingPeriod: 1209600, // 14 days
    executionDelay: 259200, // 3 days
    quorumThreshold: 2000, // 20%
    proposalThreshold: 200, // 2%
    requireMembership: true,
    lastUpdated: 0
};

const encodedData = ethers.utils.defaultAbiCoder.encode(
    ["tuple(uint256,uint256,uint256,uint256,uint256,bool,uint256)"],
    [Object.values(newVotingParams)]
);

await signal.createSettingsProposal(
    organizationId,
    "Update Voting Parameters",
    "Increase voting period for better participation",
    SettingProposalType.VOTING_PARAMETERS,
    encodedData,
    "Improve governance participation"
);
```

### Membership Configuration Example

```typescript
const newMembershipConfig = {
    membershipFee: ethers.utils.parseEther("200"),
    memberLimit: 2000,
    accessModel: 1, // Voting
    feeModel: 2, // Transfer
    minimumStake: ethers.utils.parseEther("50"),
    lastUpdated: 0
};

const encodedData = ethers.utils.defaultAbiCoder.encode(
    ["tuple(uint256,uint256,uint8,uint8,uint256,uint256)"],
    [Object.values(newMembershipConfig)]
);

await signal.createSettingsProposal(
    organizationId,
    "Update Membership Config",
    "Increase membership fee and change access model",
    SettingProposalType.MEMBERSHIP_CONFIG,
    encodedData,
    "Better member quality control"
);
```

## Emergency Settings

### Emergency Updates

Authorized emergency roles can make immediate settings changes:

```solidity
function emergencyUpdateSetting(
    bytes8 organizationId,
    SettingType settingType,
    bytes memory settingData,
    string memory reason
) external onlyRole(EMERGENCY_ROLE)
```

### Emergency Limitations

- **Daily Limit**: Maximum 5 emergency actions per day per organization
- **Audit Trail**: All emergency actions are logged
- **Temporary**: Emergency changes should be ratified through governance

### Pause/Unpause

Organizations can be paused to prevent setting changes:

```solidity
function pauseOrganizationSettings(bytes8 organizationId) external onlyRole(EMERGENCY_ROLE)
function unpauseOrganizationSettings(bytes8 organizationId) external onlyRole(EMERGENCY_ROLE)
```

## Integration Points

### Control Contract Integration

The Control contract uses OrganizationSettings for:
- Membership fee validation
- Member limit enforcement
- Access model checking
- Staking requirement validation

```solidity
function addMember(bytes8 organizationId, address member) external {
    IOrganizationSettings.MembershipConfig memory config =
        organizationSettings.getMembershipConfig(organizationId);

    // Validate against settings
    require(currentMemberCount < config.memberLimit, "Member limit reached");
    // ... additional validation
}
```

### Signal Contract Integration

The Signal contract uses OrganizationSettings for:
- Voting parameter retrieval
- Proposal execution
- Settings change approval

```solidity
function _getVotingParameters(bytes8 organizationId) internal view returns (VotingParameters memory) {
    if (address(organizationSettings) != address(0)) {
        IOrganizationSettings.VotingParameters memory orgParams =
            organizationSettings.getVotingParameters(organizationId);
        return convertToSignalParams(orgParams);
    }
    return defaultParams;
}
```

### Membership Contract Integration

The GameDAOMembership contract uses OrganizationSettings for:
- Reputation calculations
- Voting power adjustments
- Membership validation

```solidity
function getVotingPower(bytes8 organizationId, address member) external view returns (uint256) {
    IOrganizationSettings.ReputationConfig memory config =
        organizationSettings.getReputationConfig(organizationId);

    uint256 reputationMultiplier = (memberReputation * 10000) / config.maxReputation;
    return basePower + (basePower * reputationMultiplier) / 10000;
}
```

## Settings History and Tracking

### Change History

All settings changes are tracked:

```solidity
function getSettingChangeHistory(bytes8 organizationId, SettingType settingType)
    external view returns (SettingChange[] memory)
```

### Pending Changes

View pending governance proposals:

```solidity
function getPendingSettingChanges(bytes8 organizationId)
    external view returns (SettingChange[] memory)
```

### Setting Change Structure

```solidity
struct SettingChange {
    bytes8 organizationId;
    SettingType settingType;
    bytes settingData;
    string proposalId;
    SettingStatus status;
    address proposer;
    uint256 proposedAt;
    uint256 executedAt;
    string reason;
}
```

## Security Considerations

### Access Control

- **Role-Based**: Different roles for different actions
- **Multi-Signature**: Critical operations require multiple signatures
- **Time Delays**: Execution delays prevent immediate changes

### Validation

- **Parameter Bounds**: All settings have minimum/maximum values
- **Data Integrity**: Settings data is validated before execution
- **Consistency**: Settings are checked for internal consistency

### Emergency Procedures

- **Circuit Breakers**: Ability to pause settings changes
- **Emergency Roles**: Designated emergency responders
- **Audit Logging**: All emergency actions are logged

## Frontend Integration

### Settings Proposals

```typescript
// Create a settings proposal
const proposalTx = await signal.createSettingsProposal(
    organizationId,
    title,
    description,
    settingType,
    encodedData,
    reason
);

// Monitor proposal status
const proposal = await signal.getProposal(proposalId);
console.log("Proposal state:", proposal.state);
```

### Settings Retrieval

```typescript
// Get current settings
const votingParams = await organizationSettings.getVotingParameters(organizationId);
const membershipConfig = await organizationSettings.getMembershipConfig(organizationId);
const reputationConfig = await organizationSettings.getReputationConfig(organizationId);
```

### Change Tracking

```typescript
// Get pending changes
const pendingChanges = await organizationSettings.getPendingSettingChanges(organizationId);

// Get change history
const history = await organizationSettings.getSettingChangeHistory(
    organizationId,
    SettingType.VOTING_PARAMETERS
);
```

## Events

### Settings Events

```solidity
event SettingChangeProposed(bytes8 indexed organizationId, SettingType indexed settingType, string indexed proposalId, address proposer, uint256 timestamp);
event SettingChangeApproved(bytes8 indexed organizationId, SettingType indexed settingType, string indexed proposalId, uint256 timestamp);
event SettingChangeExecuted(bytes8 indexed organizationId, SettingType indexed settingType, string indexed proposalId, uint256 timestamp);
event SettingChangeRejected(bytes8 indexed organizationId, SettingType indexed settingType, string indexed proposalId, uint256 timestamp);
```

### Configuration Events

```solidity
event VotingParametersUpdated(bytes8 indexed organizationId, VotingParameters parameters, uint256 timestamp);
event MembershipConfigUpdated(bytes8 indexed organizationId, MembershipConfig config, uint256 timestamp);
event ReputationConfigUpdated(bytes8 indexed organizationId, ReputationConfig config, uint256 timestamp);
```

## Testing

### Unit Tests

Run the comprehensive test suite:

```bash
npx hardhat test test/OrganizationSettings.test.ts
```

### Integration Tests

Test the complete governance flow:

```bash
npx hardhat test test/GovernanceIntegration.test.ts
```

### Deployment Tests

Test deployment and initialization:

```bash
npx hardhat run scripts/deploy-with-governance-settings.ts --network localhost
```

## Best Practices

### Proposal Creation

1. **Clear Titles**: Use descriptive titles for proposals
2. **Detailed Descriptions**: Explain the rationale for changes
3. **Reasonable Values**: Propose sensible parameter values
4. **Community Input**: Gather feedback before proposing

### Voting

1. **Informed Decisions**: Research proposals thoroughly
2. **Participation**: Vote on important governance matters
3. **Delegation**: Consider delegating voting power if inactive
4. **Conviction**: Use conviction voting for strong preferences

### Settings Management

1. **Regular Reviews**: Periodically review organization settings
2. **Gradual Changes**: Make incremental adjustments
3. **Testing**: Test settings changes in development environments
4. **Documentation**: Document the rationale for changes

## Conclusion

The GameDAO v3 governance settings system provides a robust, democratic framework for managing organization parameters. By requiring community approval for all significant changes, it ensures that organizations evolve according to their members' collective will while maintaining security and operational integrity.

The system is designed to be:
- **Democratic**: All members can participate in governance
- **Transparent**: All changes are publicly visible
- **Secure**: Multiple safeguards prevent abuse
- **Flexible**: Emergency procedures for urgent situations
- **Auditable**: Complete history of all changes

This architecture establishes a foundation for truly decentralized autonomous organizations where governance is not just theoretical but practical and effective.
