# Treasury Contract

## Overview

The `Treasury` contract manages organization treasuries and financial operations within the GameDAO ecosystem. It handles multi-token support, payment processing, fee collection, and provides secure fund management for organizations.

## Contract Details

- **File**: `contracts/core/Treasury.sol`
- **Size**: ~10 KiB
- **Interface**: `ITreasury`
- **Inheritance**: `Module`, `ITreasury`

## Key Features

### Multi-Token Support
- Support for ERC20 tokens and native ETH
- Token whitelisting and management
- Balance tracking per organization
- Token transfer and approval handling

### Payment Processing
- Secure payment collection and distribution
- Fee calculation and collection
- Batch payment processing
- Payment verification and receipts

### Organization Finance
- Individual treasury per organization
- Budget allocation and tracking
- Financial reporting and analytics
- Spending limits and controls

### Security Features
- Multi-signature support for large transactions
- Time-locked operations for security
- Emergency withdrawal procedures
- Audit trail for all transactions

## Core Functions

### Treasury Management

```solidity
function createTreasury(
    string memory orgId,
    address[] memory allowedTokens
) external onlyRole(TREASURY_ADMIN_ROLE) returns (bytes32 treasuryId)
```

Creates a new treasury for an organization.

**Parameters**:
- `orgId`: Organization identifier
- `allowedTokens`: Array of allowed token addresses

**Returns**: Unique treasury identifier

**Access**: `TREASURY_ADMIN_ROLE`

### Token Operations

```solidity
function deposit(
    bytes32 treasuryId,
    address token,
    uint256 amount
) external nonReentrant whenNotPaused
```

Deposits tokens into an organization's treasury.

**Parameters**:
- `treasuryId`: Treasury identifier
- `token`: Token contract address (address(0) for ETH)
- `amount`: Amount to deposit

**Access**: Public (with proper validation)

```solidity
function withdraw(
    bytes32 treasuryId,
    address token,
    uint256 amount,
    address recipient
) external onlyRole(TREASURY_MANAGER_ROLE) nonReentrant
```

Withdraws tokens from an organization's treasury.

**Parameters**:
- `treasuryId`: Treasury identifier
- `token`: Token contract address
- `amount`: Amount to withdraw
- `recipient`: Recipient address

**Access**: `TREASURY_MANAGER_ROLE`

### Payment Processing

```solidity
function processPayment(
    bytes32 treasuryId,
    address token,
    uint256 amount,
    address recipient,
    bytes32 paymentId
) external onlyRole(PAYMENT_PROCESSOR_ROLE) nonReentrant
```

Processes a payment from the treasury.

**Parameters**:
- `treasuryId`: Source treasury
- `token`: Payment token
- `amount`: Payment amount
- `recipient`: Payment recipient
- `paymentId`: Unique payment identifier

**Access**: `PAYMENT_PROCESSOR_ROLE`

### Balance Queries

```solidity
function getBalance(
    bytes32 treasuryId,
    address token
) external view returns (uint256)
```

Returns the balance of a specific token in a treasury.

**Parameters**:
- `treasuryId`: Treasury identifier
- `token`: Token contract address

**Returns**: Token balance

```solidity
function getTotalValue(
    bytes32 treasuryId,
    address priceOracle
) external view returns (uint256)
```

Returns the total USD value of all tokens in a treasury.

**Parameters**:
- `treasuryId`: Treasury identifier
- `priceOracle`: Price oracle contract address

**Returns**: Total value in USD

## Data Structures

### TreasuryInfo

```solidity
struct TreasuryInfo {
    string orgId;               // Organization ID
    address[] allowedTokens;    // Allowed token addresses
    mapping(address => uint256) balances;  // Token balances
    uint256 createdAt;          // Creation timestamp
    bool active;                // Active status
    address manager;            // Treasury manager
    uint256 spendingLimit;      // Daily spending limit
    uint256 lastSpendingReset;  // Last spending limit reset
    uint256 dailySpent;         // Amount spent today
}
```

### PaymentRecord

```solidity
struct PaymentRecord {
    bytes32 treasuryId;         // Source treasury
    address token;              // Payment token
    uint256 amount;             // Payment amount
    address recipient;          // Payment recipient
    uint256 timestamp;          // Payment timestamp
    bytes32 paymentId;          // Unique payment ID
    string purpose;             // Payment purpose
    address processor;          // Payment processor
}
```

### TokenInfo

```solidity
struct TokenInfo {
    address tokenAddress;       // Token contract address
    string symbol;              // Token symbol
    uint8 decimals;             // Token decimals
    bool whitelisted;           // Whitelist status
    uint256 minBalance;         // Minimum balance required
    uint256 maxBalance;         // Maximum balance allowed
    bool transferEnabled;       // Transfer enabled status
}
```

## Events

### Treasury Events

```solidity
event TreasuryCreated(
    bytes32 indexed treasuryId,
    string indexed orgId,
    address indexed manager
);

event TreasuryUpdated(
    bytes32 indexed treasuryId,
    address indexed manager,
    uint256 spendingLimit
);

event TreasuryDeactivated(
    bytes32 indexed treasuryId,
    address indexed admin
);
```

### Transaction Events

```solidity
event Deposit(
    bytes32 indexed treasuryId,
    address indexed token,
    uint256 amount,
    address indexed depositor
);

event Withdrawal(
    bytes32 indexed treasuryId,
    address indexed token,
    uint256 amount,
    address indexed recipient
);

event PaymentProcessed(
    bytes32 indexed treasuryId,
    bytes32 indexed paymentId,
    address indexed token,
    uint256 amount,
    address recipient
);
```

### Token Events

```solidity
event TokenWhitelisted(
    address indexed token,
    string symbol,
    uint8 decimals
);

event TokenBlacklisted(
    address indexed token,
    string symbol
);

event TokenConfigUpdated(
    address indexed token,
    uint256 minBalance,
    uint256 maxBalance
);
```

## Access Control

### Roles

```solidity
bytes32 public constant TREASURY_ADMIN_ROLE = keccak256("TREASURY_ADMIN_ROLE");
bytes32 public constant TREASURY_MANAGER_ROLE = keccak256("TREASURY_MANAGER_ROLE");
bytes32 public constant PAYMENT_PROCESSOR_ROLE = keccak256("PAYMENT_PROCESSOR_ROLE");
bytes32 public constant TOKEN_ADMIN_ROLE = keccak256("TOKEN_ADMIN_ROLE");
```

### Role Hierarchy
- `TREASURY_ADMIN_ROLE`: Full treasury system control
- `TREASURY_MANAGER_ROLE`: Treasury management operations
- `PAYMENT_PROCESSOR_ROLE`: Payment processing permissions
- `TOKEN_ADMIN_ROLE`: Token whitelist management

## Security Features

### Multi-Signature Support

```solidity
function requestWithdrawal(
    bytes32 treasuryId,
    address token,
    uint256 amount,
    address recipient
) external returns (bytes32 requestId)
```

Initiates a withdrawal request that requires multiple signatures.

### Time-Locked Operations

```solidity
function scheduleWithdrawal(
    bytes32 treasuryId,
    address token,
    uint256 amount,
    address recipient,
    uint256 executeAfter
) external returns (bytes32 scheduleId)
```

Schedules a withdrawal to be executed after a time delay.

### Emergency Procedures

```solidity
function emergencyWithdraw(
    bytes32 treasuryId,
    address token
) external onlyRole(TREASURY_ADMIN_ROLE)
```

Emergency withdrawal function for critical situations.

## Integration Patterns

### Organization Integration

```solidity
// In Control contract
function createOrganization(string memory orgId) external {
    // Create organization
    _createOrganization(orgId);

    // Create treasury
    ITreasury treasury = ITreasury(registry.getModule("Treasury"));
    treasury.createTreasury(orgId, allowedTokens);
}
```

### Payment Integration

```solidity
// In Flow contract (campaigns)
function contributeToCampaign(
    string memory campaignId,
    address token,
    uint256 amount
) external {
    // Transfer tokens to treasury
    ITreasury treasury = ITreasury(registry.getModule("Treasury"));
    treasury.deposit(campaignTreasuryId, token, amount);
}
```

## Fee Management

### Fee Structure

```solidity
struct FeeConfig {
    uint256 platformFee;        // Platform fee percentage (basis points)
    uint256 organizationFee;    // Organization fee percentage
    address feeRecipient;       // Fee recipient address
    bool feeEnabled;            // Fee collection enabled
}
```

### Fee Collection

```solidity
function collectFees(
    bytes32 treasuryId,
    address token,
    uint256 amount
) internal returns (uint256 netAmount)
```

Automatically collects fees from transactions.

## Reporting and Analytics

### Financial Reports

```solidity
function generateReport(
    bytes32 treasuryId,
    uint256 fromTimestamp,
    uint256 toTimestamp
) external view returns (FinancialReport memory)
```

Generates financial reports for a treasury.

### Analytics Functions

```solidity
function getTransactionHistory(
    bytes32 treasuryId,
    uint256 limit,
    uint256 offset
) external view returns (PaymentRecord[] memory)
```

Returns transaction history for analytics.

## Gas Optimization

### Batch Operations

```solidity
function batchDeposit(
    bytes32[] memory treasuryIds,
    address[] memory tokens,
    uint256[] memory amounts
) external nonReentrant
```

Processes multiple deposits in a single transaction.

### Efficient Storage

```solidity
// Packed struct for gas optimization
struct PackedBalance {
    uint128 amount;             // Token amount
    uint128 lastUpdated;        // Last update timestamp
}
```

## Testing

### Unit Tests
- Treasury creation and management
- Token deposit and withdrawal
- Payment processing
- Fee collection
- Access control

### Integration Tests
- Organization treasury integration
- Cross-module payment flows
- Emergency procedures
- Multi-signature workflows

## Deployment

### Prerequisites
- Deploy Registry contract
- Configure token whitelist
- Set up fee structure
- Initialize access roles

### Deployment Steps
1. Deploy Treasury contract
2. Initialize with registry
3. Configure token whitelist
4. Set up fee structure
5. Grant necessary roles
6. Test integration

## Monitoring

### Key Metrics
- Total value locked (TVL)
- Transaction volume
- Fee collection
- Error rates

### Health Checks
- Balance consistency
- Token transfer success rates
- Payment processing times
- Security incident detection

## Best Practices

### Development
- Validate all token addresses
- Implement proper error handling
- Use reentrancy protection
- Test with various tokens

### Security
- Audit all financial operations
- Implement proper access control
- Use time delays for large operations
- Monitor for suspicious activity

### Operations
- Regular balance reconciliation
- Fee structure optimization
- Performance monitoring
- Backup and recovery procedures
