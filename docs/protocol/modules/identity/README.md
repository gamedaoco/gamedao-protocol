# Identity Module Documentation

> **Profile management, name registry, and user verification system**

## Overview

The Identity module is a core component of GameDAO Protocol that handles user profiles, human-readable names, and identity verification. It provides a comprehensive system for managing user identities within the GameDAO ecosystem.

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        IDENTITY MODULE                          │
├─────────────────────────────────────────────────────────────────┤
│  Profile Management    │  Name Registry    │  Verification      │
│  - Profile Creation    │  - Name Claiming  │  - Basic Level     │
│  - Profile Updates     │  - Name Staking   │  - Enhanced Level  │
│  - GameId Integration  │  - Name Transfer  │  - Premium Level   │
│  - Organization Links  │  - Name Lookup    │  - Verification    │
└─────────────────────────────────────────────────────────────────┘
```

### Contract Information
- **Contract Size**: 13.144 KiB (55% of 24KB limit)
- **Gas Optimized**: Efficient storage patterns and batch operations
- **Security**: OpenZeppelin patterns with custom access controls

## Features

### 1. Profile Management

#### Profile Creation
```solidity
function createProfile(
    string memory name,
    string memory bio,
    string memory avatarUrl
) external returns (string memory profileId)
```

- **GameId Integration**: Generates hierarchical IDs (`GAMEDAO-U-USER001`)
- **Rich Profiles**: Name, bio, avatar, and metadata support
- **Organization Links**: Track user-organization relationships
- **Update Capabilities**: Modify profile information

#### Profile Structure
```solidity
struct Profile {
    string id;                    // Hierarchical GameId
    address owner;                // Profile owner address
    string name;                  // Display name
    string bio;                   // Profile description
    string avatarUrl;             // Avatar image URL
    uint256 createdAt;            // Creation timestamp
    uint256 updatedAt;            // Last update timestamp
    VerificationLevel verification; // Verification status
    bool isActive;                // Profile status
    string[] organizationIds;     // Associated organizations
    mapping(string => string) metadata; // Additional metadata
}
```

### 2. Name Registry System

#### Name Claiming
```solidity
function claimName(
    string memory name,
    uint256 stakeAmount
) external
```

- **Economic Model**: 1000 GAME token staking requirement
- **Uniqueness**: Globally unique namespace
- **Transferable**: Names can be transferred between profiles
- **Renewable**: Annual renewal system

#### Name Management
- **Availability Check**: Real-time name availability
- **Transfer System**: Secure name ownership transfer
- **Staking Mechanism**: Economic incentives for name ownership
- **Dispute Resolution**: Governance-based name disputes

### 3. Verification System

#### Three-Tier Verification
1. **Basic Verification**: Email and basic information
2. **Enhanced Verification**: KYC and additional documentation
3. **Premium Verification**: Full identity verification

#### Verification Process
```solidity
function verifyProfile(
    string memory profileId,
    VerificationLevel level
) external onlyVerifier
```

- **Role-Based**: Only authorized verifiers can verify profiles
- **Tiered System**: Progressive verification levels
- **Benefits**: Higher verification provides more privileges
- **Revocable**: Verification can be revoked if needed

## Integration Points

### With Other Modules

#### SenseSimplified Module
- **Profile Validation**: Ensures profiles exist before reputation operations
- **Reputation Queries**: Links reputation data to profiles
- **Trust Scoring**: Uses profile information for trust calculations

#### Control Module
- **Organization Membership**: Validates user profiles for organization access
- **Role Assignment**: Links profiles to organization roles
- **Governance Participation**: Enables profile-based governance

#### Signal Module
- **Voting Rights**: Validates voter profiles
- **Proposal Creation**: Links proposals to verified profiles
- **Reputation Weighting**: Uses profile verification for vote weighting

### Frontend Integration

#### React Hooks
```typescript
// Profile management
const { profile, createProfile, updateProfile } = useProfile();

// Name registry
const { claimName, checkAvailability } = useNameRegistry();

// Verification
const { verifyProfile, getVerificationStatus } = useVerification();
```

#### Key Components
- **ProfileCard**: Display user profile information
- **NameClaimingModal**: Interface for claiming names
- **VerificationBadge**: Show verification status
- **ProfileEditor**: Edit profile information

## Economic Model

### Name Registry Economics
- **Initial Stake**: 1000 GAME tokens per name
- **Renewal Fee**: 100 GAME tokens annually
- **Transfer Fee**: 50 GAME tokens per transfer
- **Revenue Distribution**: 50% burned, 30% treasury, 20% stakers

### Verification Costs
- **Basic**: Free with email verification
- **Enhanced**: 100 GAME tokens
- **Premium**: 500 GAME tokens

## Security Features

### Access Controls
- **Profile Ownership**: Only profile owners can modify their profiles
- **Verifier Roles**: Only authorized addresses can verify profiles
- **Name Transfers**: Secure transfer mechanisms with proper validation

### Security Patterns
- **Reentrancy Protection**: Guards against reentrancy attacks
- **Input Validation**: Comprehensive parameter validation
- **Event Logging**: Complete audit trail for all operations

## API Reference

### Core Functions

#### Profile Management
```solidity
// Create new profile
function createProfile(string memory name, string memory bio, string memory avatarUrl) external returns (string memory);

// Update existing profile
function updateProfile(string memory profileId, string memory name, string memory bio, string memory avatarUrl) external;

// Get profile by ID
function getProfile(string memory profileId) external view returns (Profile memory);

// Get profile by name
function getProfileByName(string memory name) external view returns (Profile memory);

// Check if profile exists
function profileExists(string memory profileId) external view returns (bool);
```

#### Name Registry
```solidity
// Claim a name
function claimName(string memory name, uint256 stakeAmount) external;

// Transfer name ownership
function transferName(string memory name, string memory newProfileId) external;

// Check name availability
function isNameAvailable(string memory name) external view returns (bool);

// Get profile ID by name
function getProfileIdByName(string memory name) external view returns (string memory);
```

#### Verification
```solidity
// Verify a profile
function verifyProfile(string memory profileId, VerificationLevel level) external;

// Get verification status
function getVerificationLevel(string memory profileId) external view returns (VerificationLevel);

// Check if profile is verified
function isVerified(string memory profileId) external view returns (bool);
```

### Events

```solidity
// Profile events
event ProfileCreated(string indexed profileId, address indexed owner, string name);
event ProfileUpdated(string indexed profileId, string name, string bio);
event ProfileDeactivated(string indexed profileId);

// Name registry events
event NameClaimed(string indexed name, string indexed profileId, uint256 stakeAmount);
event NameTransferred(string indexed name, string indexed fromProfileId, string indexed toProfileId);
event NameRenewed(string indexed name, string indexed profileId, uint256 fee);

// Verification events
event ProfileVerified(string indexed profileId, VerificationLevel level, address indexed verifier);
event VerificationRevoked(string indexed profileId, VerificationLevel previousLevel);
```

## Testing

### Unit Tests
- Profile creation and management
- Name claiming and transfer
- Verification system
- Access control validation

### Integration Tests
- Cross-module interactions
- Frontend integration
- Economic model validation
- Security pattern testing

## Deployment

### Contract Deployment
```bash
# Deploy Identity module
npx hardhat run scripts/deploy-identity.ts --network sepolia

# Verify deployment
npx hardhat run scripts/verify-identity.ts --network sepolia
```

### Configuration
```typescript
// Identity module configuration
const identityConfig = {
  nameStakeAmount: ethers.utils.parseEther("1000"), // 1000 GAME
  renewalFee: ethers.utils.parseEther("100"),       // 100 GAME
  transferFee: ethers.utils.parseEther("50"),       // 50 GAME
  verificationFees: {
    basic: 0,
    enhanced: ethers.utils.parseEther("100"),
    premium: ethers.utils.parseEther("500")
  }
};
```

## Future Enhancements

### Planned Features
1. **Social Integration**: Connect with Social module for enhanced profiles
2. **Achievement Display**: Show achievements on profiles
3. **Reputation Integration**: Display reputation scores
4. **Cross-Chain Profiles**: Multi-chain identity support

### Extensibility
- **Plugin System**: Support for profile plugins
- **Custom Metadata**: Extensible metadata system
- **Third-Party Verification**: External verification providers
- **API Integrations**: Connect with external identity services

## Troubleshooting

### Common Issues
1. **Name Already Taken**: Check name availability before claiming
2. **Insufficient Stake**: Ensure enough GAME tokens for name claiming
3. **Profile Not Found**: Verify profile ID format and existence
4. **Verification Failed**: Check verifier permissions and requirements

### Error Codes
- `PROFILE_NOT_FOUND`: Profile does not exist
- `NAME_ALREADY_TAKEN`: Name is already claimed
- `INSUFFICIENT_STAKE`: Not enough tokens for operation
- `UNAUTHORIZED_VERIFIER`: Caller is not authorized to verify
- `INVALID_PROFILE_ID`: Profile ID format is invalid

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
**Contract Size**: 13.144 KiB
**Last Updated**: January 2025
**Status**: Production Ready
