# GameDAO Protocol Tokenomics Analysis & Optimization

## Current Implementation vs Intended Design

### 🎯 **Intended Tokenomics Design**
Based on the analysis, the GameDAO protocol should implement:

1. **GAME Token for Protocol Access**
   - Creating DAOs requires GAME token staking
   - Joining DAOs requires GAME token staking
   - Governance voting power derived from GAME stakes

2. **Stablecoins for Fundraising**
   - USDC as primary fundraising token
   - Stable value for predictable funding goals
   - No volatile token exposure for campaigns

3. **No ETH/Volatile Tokens**
   - Avoid price volatility in fundraising
   - Stable, predictable funding targets
   - Professional treasury management

### ❌ **Current Implementation Issues**

#### 1. ETH-Centric Fundraising
```solidity
// Current: Using ETH for campaigns
ethers.ZeroAddress, // ETH payments ❌
ethers.parseEther("10"), // Target: 10 ETH ❌
```

#### 2. Missing GAME Token Integration
```solidity
// Current: gameStakeRequired set to 0 in scaffolding
gameStakeRequired: 0 // No GAME staking required ❌
```

#### 3. Incomplete Token Validation
```solidity
// Current: No enforcement of USDC-only campaigns
if (campaign.paymentToken == address(0)) {
    // Allows ETH contributions ❌
}
```

## 🔧 **Proposed Optimizations**

### 1. GAME Token Integration

#### A. Deploy Mock GAME Token for Testing
```solidity
// contracts/mocks/MockGameToken.sol
contract MockGameToken is ERC20, IGameToken {
    mapping(address => mapping(bytes32 => uint256)) private _stakes;
    mapping(address => uint256) private _totalStaked;

    constructor() ERC20("GameDAO Token", "GAME") {
        _mint(msg.sender, 1000000 * 10**18); // 1M tokens
    }

    function stake(bytes32 purpose, uint256 amount) external override {
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        _transfer(msg.sender, address(this), amount);
        _stakes[msg.sender][purpose] += amount;
        _totalStaked[msg.sender] += amount;
        emit Staked(msg.sender, purpose, amount, block.timestamp);
    }

    function unstake(bytes32 purpose, uint256 amount) external override {
        require(_stakes[msg.sender][purpose] >= amount, "Insufficient stake");
        _stakes[msg.sender][purpose] -= amount;
        _totalStaked[msg.sender] -= amount;
        _transfer(address(this), msg.sender, amount);
        emit Unstaked(msg.sender, purpose, amount, block.timestamp);
    }

    function getStakedAmount(address user, bytes32 purpose)
        external view override returns (uint256) {
        return _stakes[user][purpose];
    }

    function getTotalStaked(address user)
        external view override returns (uint256) {
        return _totalStaked[user];
    }
}
```

#### B. Deploy Mock USDC for Testing
```solidity
// contracts/mocks/MockUSDC.sol
contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {
        _mint(msg.sender, 1000000 * 10**6); // 1M USDC (6 decimals)
    }

    function decimals() public pure override returns (uint8) {
        return 6; // USDC uses 6 decimals
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
```

### 2. Protocol Configuration Updates

#### A. Update Control Module for GAME Staking
```solidity
// Enforce minimum GAME staking for DAO creation
uint256 constant MIN_DAO_STAKE = 1000 * 10**18; // 1000 GAME tokens
uint256 constant MIN_MEMBER_STAKE = 100 * 10**18; // 100 GAME tokens

function createOrganization(...) external {
    // Require minimum GAME stake for DAO creation
    require(gameStakeRequired >= MIN_DAO_STAKE, "Insufficient stake required");

    // Stake GAME tokens
    gameToken.stake(GAME_STAKE_PURPOSE, gameStakeRequired);

    // Rest of function...
}

function addMember(bytes32 orgId, address member) external {
    // Require GAME staking for membership
    uint256 memberStake = _getRequiredMemberStake(orgId);
    gameToken.stake(keccak256(abi.encodePacked("MEMBER", orgId)), memberStake);

    // Rest of function...
}
```

#### B. Update Flow Module for USDC-Only Campaigns
```solidity
// Add approved stablecoins mapping
mapping(address => bool) private _approvedStablecoins;
address public constant USDC_ADDRESS = 0x...; // Set in constructor

function createCampaign(
    bytes32 organizationId,
    string memory title,
    string memory description,
    string memory metadataURI,
    FlowType flowType,
    address paymentToken, // Must be approved stablecoin
    uint256 target,
    uint256 min,
    uint256 max,
    uint256 duration,
    bool autoFinalize
) external returns (bytes32 campaignId) {
    // Validate payment token
    require(_approvedStablecoins[paymentToken], "Only stablecoins allowed");
    require(paymentToken != address(0), "ETH not supported");

    // Rest of function...
}

function addApprovedStablecoin(address token) external onlyRole(FLOW_ADMIN_ROLE) {
    _approvedStablecoins[token] = true;
}
```

### 3. Scaffolding Script Updates

#### A. Deploy Test Tokens
```typescript
// Add to deploy.ts
async function deployTestTokens() {
    console.log("🪙 Deploying test tokens...");

    // Deploy GAME token
    const GameTokenFactory = await ethers.getContractFactory("MockGameToken");
    const gameToken = await GameTokenFactory.deploy();
    await gameToken.waitForDeployment();
    console.log("✅ GAME Token deployed to:", await gameToken.getAddress());

    // Deploy USDC token
    const USDCFactory = await ethers.getContractFactory("MockUSDC");
    const usdc = await USDCFactory.deploy();
    await usdc.waitForDeployment();
    console.log("✅ USDC Token deployed to:", await usdc.getAddress());

    // Distribute tokens to test accounts
    const [deployer, ...accounts] = await ethers.getSigners();

    for (const account of accounts.slice(0, 12)) {
        // Give each account 10,000 GAME tokens
        await gameToken.transfer(account.address, ethers.parseEther("10000"));

        // Give each account 10,000 USDC
        await usdc.transfer(account.address, ethers.parseUnits("10000", 6));
    }

    return { gameToken, usdc };
}
```

#### B. Update Scaffolding for Proper Tokenomics
```typescript
// Update scaffold.ts
async function createDAOsWithStaking(gameToken: any, usdc: any) {
    for (let i = 0; i < CONFIG.daos; i++) {
        const template = DAO_TEMPLATES[i];
        const creator = userAccounts[i % userAccounts.length];

        // Approve and stake GAME tokens for DAO creation
        const stakeAmount = ethers.parseEther("1000"); // 1000 GAME
        await gameToken.connect(creator).approve(controlAddress, stakeAmount);

        const tx = await control.connect(creator).createOrganization(
            template.name,
            template.desc,
            0, // orgType
            2, // accessModel: Voting
            0, // feeModel
            20, // memberLimit
            0, // membershipFee
            stakeAmount // gameStakeRequired ✅
        );

        // Add members with GAME staking
        for (const memberAddr of selectedMembers) {
            const member = userAccounts.find(u => u.address === memberAddr);
            if (member) {
                const memberStake = ethers.parseEther("100"); // 100 GAME
                await gameToken.connect(member).approve(controlAddress, memberStake);
                await control.connect(creator).addMember(orgId, member.address);
            }
        }
    }
}

async function createUSDCCampaigns(usdc: any) {
    for (let i = 0; i < CONFIG.campaigns; i++) {
        const template = CAMPAIGN_TEMPLATES[i];
        const dao = result.daos[Math.floor(Math.random() * result.daos.length)];
        const creator = userAccounts.find(u => dao.members.includes(u.address));

        // Create USDC-based campaign
        const targetAmount = ethers.parseUnits(template.target, 6); // USDC has 6 decimals
        const minAmount = ethers.parseUnits("100", 6); // 100 USDC
        const maxAmount = targetAmount * 2n;

        const tx = await flow.connect(creator).createCampaign(
            dao.id,
            template.title,
            `Description for ${template.title}`,
            `ipfs://QmHash${i}`,
            1, // flowType: Raise
            await usdc.getAddress(), // USDC token ✅
            targetAmount,
            minAmount,
            maxAmount,
            60 * 60 * 24 * 30, // 30 days
            false
        );

        // Make USDC contributions
        for (const contributorAddress of uniqueContributors) {
            const contributor = userAccounts.find(u => u.address === contributorAddress);
            if (contributor) {
                const amount = ethers.parseUnits((Math.random() * 500 + 100).toFixed(0), 6);
                await usdc.connect(contributor).approve(flowAddress, amount);
                await flow.connect(contributor).contribute(campaignId, amount, "");
            }
        }
    }
}
```

### 4. Frontend Integration Updates

#### A. Token Configuration
```typescript
// src/lib/tokens.ts
export const TOKENS = {
    GAME: {
        address: process.env.NEXT_PUBLIC_GAME_TOKEN_ADDRESS,
        symbol: 'GAME',
        decimals: 18,
        name: 'GameDAO Token'
    },
    USDC: {
        address: process.env.NEXT_PUBLIC_USDC_ADDRESS,
        symbol: 'USDC',
        decimals: 6,
        name: 'USD Coin'
    }
} as const;

export const APPROVED_FUNDRAISING_TOKENS = [TOKENS.USDC];
export const STAKING_TOKEN = TOKENS.GAME;
```

#### B. Updated Hooks
```typescript
// src/hooks/useGameToken.ts
export function useGameToken() {
    const { data: balance } = useBalance({
        address: userAddress,
        token: TOKENS.GAME.address
    });

    const { data: stakedAmount } = useContractRead({
        address: TOKENS.GAME.address,
        abi: gameTokenABI,
        functionName: 'getTotalStaked',
        args: [userAddress]
    });

    const stake = useContractWrite({
        address: TOKENS.GAME.address,
        abi: gameTokenABI,
        functionName: 'stake'
    });

    return { balance, stakedAmount, stake };
}

// src/hooks/useCampaigns.ts - Updated for USDC
export function useCampaigns() {
    const createCampaign = useContractWrite({
        address: FLOW_ADDRESS,
        abi: flowABI,
        functionName: 'createCampaign'
    });

    const contribute = useContractWrite({
        address: FLOW_ADDRESS,
        abi: flowABI,
        functionName: 'contribute'
    });

    const contributeUSDC = async (campaignId: string, amount: string) => {
        // Approve USDC first
        const usdcAmount = parseUnits(amount, TOKENS.USDC.decimals);
        await approveUSDC(usdcAmount);

        // Then contribute
        return contribute.writeAsync({
            args: [campaignId, usdcAmount, ""],
            value: 0n // No ETH needed
        });
    };

    return { createCampaign, contributeUSDC };
}
```

## 🎯 **Implementation Priority**

### Phase 1: Core Token Infrastructure
1. ✅ Deploy MockGameToken contract
2. ✅ Deploy MockUSDC contract
3. ✅ Update Control module for GAME staking requirements
4. ✅ Update Flow module for USDC-only campaigns
5. ✅ Update deployment script with token distribution

### Phase 2: Scaffolding Integration
1. ✅ Update scaffolding to use GAME staking for DAOs
2. ✅ Update scaffolding to use USDC for campaigns
3. ✅ Add proper token approvals and transfers
4. ✅ Generate realistic token balances and stakes

### Phase 3: Frontend Integration
1. ✅ Add GAME token balance and staking UI
2. ✅ Update campaign creation for USDC only
3. ✅ Add USDC contribution flows
4. ✅ Remove ETH-based funding options

### Phase 4: Advanced Features
1. ✅ Implement staking rewards for DAO participation
2. ✅ Add slashing mechanisms for bad actors
3. ✅ Implement multi-stablecoin support (USDT, DAI)
4. ✅ Add yield farming for staked GAME tokens

## 🚀 **Expected Benefits**

### Protocol Stability
- **Predictable Funding**: USDC campaigns have stable targets
- **Reduced Volatility**: No ETH price impact on fundraising
- **Professional Image**: Stablecoin-based appears more serious

### Token Utility
- **GAME Token Demand**: Required for all protocol participation
- **Staking Incentives**: Locked tokens reduce circulating supply
- **Governance Value**: Voting power tied to economic stake

### User Experience
- **Clear Requirements**: Users know exact GAME amounts needed
- **Stable Contributions**: USDC amounts don't fluctuate
- **Better Planning**: Predictable costs for DAO operations

## 📊 **Migration Strategy**

### Backward Compatibility
- Keep existing ETH support with deprecation warnings
- Allow gradual migration to USDC-only campaigns
- Provide token swap utilities for existing users

### Testing Approach
- Deploy on testnet with mock tokens first
- Comprehensive integration tests with real token flows
- User acceptance testing with stablecoin workflows

### Rollout Plan
1. **Week 1**: Deploy test tokens and update contracts
2. **Week 2**: Update scaffolding and test data generation
3. **Week 3**: Frontend integration and UI updates
4. **Week 4**: End-to-end testing and documentation

## ✅ **Success Metrics**

- All DAOs require GAME token staking
- All campaigns use USDC exclusively
- No ETH-based fundraising in production
- Realistic token economics in test environment
- Clean separation between governance (GAME) and funding (USDC)

This tokenomics optimization aligns the protocol with professional DeFi standards while maintaining the gaming-focused community aspects.
