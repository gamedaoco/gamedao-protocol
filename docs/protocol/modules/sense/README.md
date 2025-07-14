# SenseSimplified Module Documentation

> **Reputation scoring, experience points, and trust metrics system**

## Overview

The SenseSimplified module is a streamlined reputation system for GameDAO Protocol that focuses on core reputation functionality: reputation scoring, experience points (XP), and trust metrics. This module has been optimized for contract size and performance while maintaining comprehensive reputation tracking capabilities.

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    SENSESIMPLIFIED MODULE                       │
├─────────────────────────────────────────────────────────────────┤
│  Reputation System │  Experience Points │  Trust Scoring       │
│  - Score Tracking  │  - XP Awarding     │  - Trust Interactions│
│  - Multipliers     │  - Reason Tracking │  - Positive/Negative │
│  - Batch Updates   │  - Category XP     │  - Trust Validation  │
│  - Voting Weight   │  - XP History      │  - Score Calculation │
└─────────────────────────────────────────────────────────────────┘
```

### Contract Information
- **Contract Size**: 9.826 KiB (41% of 24KB limit)
- **Gas Optimized**: 1000-scale multipliers for efficient calculations
- **Security**: OpenZeppelin patterns with role-based access

## Features

### 1. Reputation System

#### Reputation Scoring
```solidity
function updateReputation(
    string memory profileId,
    int256 change,
    string memory reason
) external onlyAuthorized
```

- **Scale**: 1000-point multiplier system for precision
- **Bidirectional**: Supports both positive and negative changes
- **Reason Tracking**: All reputation changes include explanatory reasons
- **Batch Operations**: Efficient bulk reputation updates

#### Reputation Structure
```solidity
struct ReputationData {
    uint256 score;                    // Current reputation score
    uint256 totalEarned;              // Total reputation earned
    uint256 totalLost;                // Total reputation lost
    uint256 lastUpdated;              // Last update timestamp
    mapping(string => int256) history; // Reputation change history
}
```

### 2. Experience Points (XP) System

#### XP Awarding
```solidity
function awardXP(
    string memory profileId,
    uint256 amount,
    string memory reason
) external onlyAuthorized
```

- **Flexible Awarding**: Support for various XP amounts
- **Reason Tracking**: All XP awards include explanatory reasons
- **Category Support**: XP can be awarded for different activities
- **History Tracking**: Complete XP earning history

#### XP Categories
- **Governance**: Participation in voting and proposals
- **Contribution**: Code contributions and community help
- **Social**: Community engagement and interactions
- **Achievement**: Completing specific milestones

### 3. Trust Scoring System

#### Trust Interactions
```solidity
function recordTrustInteraction(
    string memory fromProfile,
    string memory toProfile,
    bool isPositive
) external onlyAuthorized
```

- **Peer-to-Peer**: User-to-user trust interactions
- **Binary System**: Positive or negative trust indicators
- **Validation**: Ensures profiles exist before recording
- **Score Calculation**: Automated trust score computation

#### Trust Metrics
- **Positive Interactions**: Count of positive trust interactions
- **Negative Interactions**: Count of negative trust interactions
- **Trust Ratio**: Percentage of positive interactions
- **Trust Score**: Calculated trust score (0-1000 scale)

### 4. Voting Weight Calculation

#### Reputation-Based Voting
```solidity
function getVotingWeight(string memory profileId) external view returns (uint256)
```

- **Multi-Factor**: Combines reputation, XP, and trust scores
- **Weighted Formula**: Balanced calculation for fair voting power
- **Minimum Threshold**: Prevents spam voting
- **Maximum Cap**: Prevents excessive concentration of power

## Integration Points

### With Other Modules

#### Identity Module
- **Profile Validation**: Ensures profiles exist before reputation operations
- **Name Resolution**: Links reputation to human-readable names
- **Verification Status**: Uses verification level in calculations

#### Signal Module
- **Voting Power**: Provides reputation-based voting weights
- **Proposal Validation**: Validates proposer reputation
- **Governance Participation**: Tracks governance-related XP

#### Control Module
- **Member Reputation**: Tracks organization member reputation
- **Role Assignment**: Uses reputation for role eligibility
- **Treasury Access**: Reputation-based treasury permissions

### Frontend Integration

#### React Hooks
```typescript
// Reputation management
const { reputation, updateReputation } = useReputation();

// XP tracking
const { xp, awardXP, getXPHistory } = useXP();

// Trust scoring
const { trustScore, recordTrust } = useTrust();
```

#### Key Components
- **ReputationCard**: Display user reputation information
- **XPProgressBar**: Show XP progress and levels
- **TrustBadge**: Display trust score and indicators
- **ReputationHistory**: Show reputation change history

## Reputation Formulas

### Reputation Score Calculation
```solidity
// Base reputation with 1000x multiplier
uint256 baseScore = reputationData.score;

// Adjusted for recent activity (last 30 days)
uint256 recentActivity = getRecentActivity(profileId);
uint256 adjustedScore = baseScore + (recentActivity * 100);

return adjustedScore;
```

### Trust Score Calculation
```solidity
// Trust ratio calculation
uint256 totalInteractions = positiveCount + negativeCount;
if (totalInteractions == 0) return 500; // Neutral score

uint256 trustRatio = (positiveCount * 1000) / totalInteractions;
return trustRatio;
```

### Voting Weight Formula
```solidity
// Multi-factor voting weight
uint256 repWeight = getReputationScore(profileId) / 10;  // 10% of reputation
uint256 xpWeight = getTotalXP(profileId) / 100;          // 1% of XP
uint256 trustWeight = getTrustScore(profileId) / 5;      // 20% of trust

uint256 totalWeight = repWeight + xpWeight + trustWeight;
return Math.min(totalWeight, 10000); // Cap at 10,000
```

## Economic Model

### XP Rewards
- **Governance Participation**: 10-100 XP per vote
- **Proposal Creation**: 50-500 XP per proposal
- **Community Contribution**: 25-250 XP per contribution
- **Achievement Completion**: 100-1000 XP per achievement

### Reputation Changes
- **Positive Contributions**: +10 to +100 reputation
- **Negative Behavior**: -5 to -50 reputation
- **Governance Participation**: +5 to +25 reputation
- **Trust Interactions**: +1 to +10 reputation

## Security Features

### Access Controls
- **Role-Based**: Only authorized contracts can update scores
- **Profile Validation**: Ensures profiles exist before operations
- **Rate Limiting**: Prevents spam reputation updates

### Security Patterns
- **Reentrancy Protection**: Guards against reentrancy attacks
- **Input Validation**: Comprehensive parameter validation
- **Event Logging**: Complete audit trail for all operations

## API Reference

### Core Functions

#### Reputation Management
```solidity
// Update reputation score
function updateReputation(string memory profileId, int256 change, string memory reason) external;

// Get reputation score
function getReputationScore(string memory profileId) external view returns (uint256);

// Get reputation history
function getReputationHistory(string memory profileId) external view returns (ReputationData memory);

// Batch reputation updates
function batchUpdateReputation(string[] memory profileIds, int256[] memory changes, string[] memory reasons) external;
```

#### Experience Points
```solidity
// Award XP
function awardXP(string memory profileId, uint256 amount, string memory reason) external;

// Get total XP
function getTotalXP(string memory profileId) external view returns (uint256);

// Get XP by category
function getXPByCategory(string memory profileId, string memory category) external view returns (uint256);

// Get XP history
function getXPHistory(string memory profileId) external view returns (XPRecord[] memory);
```

#### Trust Scoring
```solidity
// Record trust interaction
function recordTrustInteraction(string memory fromProfile, string memory toProfile, bool isPositive) external;

// Get trust score
function getTrustScore(string memory profileId) external view returns (uint256);

// Get trust statistics
function getTrustStats(string memory profileId) external view returns (uint256 positive, uint256 negative, uint256 ratio);

// Validate trust interaction
function canRecordTrust(string memory fromProfile, string memory toProfile) external view returns (bool);
```

#### Voting Weight
```solidity
// Get voting weight
function getVotingWeight(string memory profileId) external view returns (uint256);

// Get comprehensive scoring
function getComprehensiveScore(string memory profileId) external view returns (uint256 reputation, uint256 xp, uint256 trust, uint256 votingWeight);

// Batch voting weights
function getBatchVotingWeights(string[] memory profileIds) external view returns (uint256[] memory);
```

### Events

```solidity
// Reputation events
event ReputationUpdated(string indexed profileId, int256 change, string reason, uint256 newScore);
event ReputationBatchUpdated(string[] profileIds, int256[] changes, uint256 timestamp);

// XP events
event XPAwarded(string indexed profileId, uint256 amount, string reason, string category);
event XPMilestoneReached(string indexed profileId, uint256 totalXP, uint256 level);

// Trust events
event TrustInteractionRecorded(string indexed fromProfile, string indexed toProfile, bool isPositive);
event TrustScoreUpdated(string indexed profileId, uint256 newScore, uint256 totalInteractions);

// Voting events
event VotingWeightCalculated(string indexed profileId, uint256 weight, uint256 reputation, uint256 xp, uint256 trust);
```

## Testing

### Unit Tests
- Reputation scoring and updates
- XP awarding and tracking
- Trust interaction recording
- Voting weight calculation

### Integration Tests
- Cross-module interactions
- Frontend integration
- Performance benchmarking
- Security validation

## Deployment

### Contract Deployment
```bash
# Deploy SenseSimplified module
npx hardhat run scripts/deploy-sense-simplified.ts --network sepolia

# Verify deployment
npx hardhat run scripts/verify-sense-simplified.ts --network sepolia
```

### Configuration
```typescript
// SenseSimplified module configuration
const senseConfig = {
  maxReputationChange: 1000,      // Maximum reputation change per update
  minVotingWeight: 100,           // Minimum voting weight
  maxVotingWeight: 10000,         // Maximum voting weight
  trustDecayRate: 50,             // Trust score decay rate
  xpCategories: [
    "governance",
    "contribution",
    "social",
    "achievement"
  ]
};
```

## Performance Optimizations

### Gas Efficiency
- **1000x Multipliers**: Avoid floating-point calculations
- **Batch Operations**: Process multiple updates in single transaction
- **Efficient Storage**: Optimized data structures
- **View Functions**: Gas-free score calculations

### Scalability
- **Pagination**: Support for large data sets
- **Caching**: Frontend caching for frequently accessed data
- **Indexing**: Optimized database indexing for queries
- **Background Processing**: Async score calculations

## Future Enhancements

### Planned Features
1. **Advanced Analytics**: Detailed reputation analytics
2. **Decay Mechanisms**: Time-based reputation decay
3. **Category Weights**: Weighted reputation by category
4. **Reputation Staking**: Stake reputation for privileges

### Extensibility
- **Plugin System**: Support for custom reputation algorithms
- **External Integrations**: Connect with external reputation systems
- **AI Integration**: Machine learning for reputation prediction
- **Cross-Chain Support**: Multi-chain reputation tracking

## Troubleshooting

### Common Issues
1. **Profile Not Found**: Verify profile exists in Identity module
2. **Unauthorized Access**: Check contract permissions
3. **Invalid Score**: Verify score calculation parameters
4. **Trust Recording Failed**: Check profile validation

### Error Codes
- `PROFILE_NOT_FOUND`: Profile does not exist
- `UNAUTHORIZED_CALLER`: Caller not authorized for operation
- `INVALID_SCORE_CHANGE`: Score change exceeds limits
- `TRUST_SELF_INTERACTION`: Cannot record trust with self
- `REPUTATION_OVERFLOW`: Reputation calculation overflow

## Contributing

### Development Setup
```bash
# Install dependencies
npm install

# Run tests
npm test

# Deploy locally
npm run deploy:local
```

### Code Style
- Follow Solidity style guide
- Use NatSpec comments
- Implement comprehensive tests
- Follow security best practices

---

**Module Version**: 1.0.0
**Contract Size**: 9.826 KiB
**Last Updated**: January 2025
**Status**: Production Ready
