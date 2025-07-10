// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title GameStaking
 * @dev Advanced staking contract with rewards, slashing, and flexible unstaking
 * @author GameDAO AG
 */
contract GameStaking is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    using Math for uint256;

    // Roles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant SLASHER_ROLE = keccak256("SLASHER_ROLE");
    bytes32 public constant REWARD_DISTRIBUTOR_ROLE = keccak256("REWARD_DISTRIBUTOR_ROLE");

    // Constants
    uint256 public constant PRECISION = 1e18;
    uint256 public constant MAX_REWARD_RATE = 1000; // 10% per year max
    uint256 public constant MIN_STAKE_AMOUNT = 1e18; // 1 GAME minimum
    uint256 public constant RAGE_QUIT_PENALTY = 2000; // 20% penalty for rage quit
    uint256 public constant BASIS_POINTS = 10000;

    // Staking purposes with different reward rates
    enum StakingPurpose {
        GOVERNANCE,      // Low risk, low reward
        DAO_CREATION,    // Medium risk, medium reward
        TREASURY_BOND,   // High commitment, high reward
        LIQUIDITY_MINING // Variable risk, variable reward
    }

    // Unstaking strategies
    enum UnstakingStrategy {
        RAGE_QUIT,    // Instant, penalty applied
        STANDARD,     // 7 days, normal rewards
        PATIENT       // 30 days, bonus rewards
    }

    struct StakingPool {
        uint256 totalStaked;
        uint256 rewardRate;           // Annual reward rate in basis points
        uint256 lastUpdateTime;
        uint256 rewardPerTokenStored;
        uint256 totalRewardsDistributed;
        bool active;
    }

    struct UserStake {
        uint256 amount;
        uint256 rewardPerTokenPaid;
        uint256 pendingRewards;
        uint256 stakedAt;
        uint256 lastClaimTime;
        UnstakingStrategy preferredStrategy;
    }

    struct UnstakeRequest {
        uint256 amount;
        uint256 requestTime;
        UnstakingStrategy strategy;
        bool processed;
    }

    // State variables
    IERC20 public immutable gameToken;
    address public treasury;

    // Staking pools by purpose
    mapping(StakingPurpose => StakingPool) public stakingPools;

    // User stakes: user => purpose => stake info
    mapping(address => mapping(StakingPurpose => UserStake)) public userStakes;

    // Unstake requests: user => request ID => request
    mapping(address => mapping(uint256 => UnstakeRequest)) public unstakeRequests;
    mapping(address => uint256) public userUnstakeRequestCount;

    // Reward tracking
    uint256 public totalRewardsPool;
    uint256 public protocolFeeShare; // Basis points of protocol fees for rewards

    // Slashing
    mapping(address => bool) public slashedUsers;
    uint256 public totalSlashed;

    // Events
    event Staked(
        address indexed user,
        StakingPurpose indexed purpose,
        uint256 amount,
        UnstakingStrategy strategy,
        uint256 timestamp
    );

    event UnstakeRequested(
        address indexed user,
        StakingPurpose indexed purpose,
        uint256 amount,
        UnstakingStrategy strategy,
        uint256 requestId,
        uint256 unlockTime
    );

    event Unstaked(
        address indexed user,
        StakingPurpose indexed purpose,
        uint256 amount,
        uint256 penalty,
        uint256 timestamp
    );

    event RewardsClaimed(
        address indexed user,
        StakingPurpose indexed purpose,
        uint256 amount,
        uint256 timestamp
    );

    event Slashed(
        address indexed user,
        StakingPurpose indexed purpose,
        uint256 amount,
        address indexed slasher,
        string reason,
        uint256 timestamp
    );

    event RewardsDistributed(
        StakingPurpose indexed purpose,
        uint256 amount,
        uint256 timestamp
    );

    event PoolUpdated(
        StakingPurpose indexed purpose,
        uint256 newRewardRate,
        bool active
    );

    constructor(
        address _gameToken,
        address _treasury,
        uint256 _protocolFeeShare
    ) {
        require(_gameToken != address(0), "Invalid game token");
        require(_treasury != address(0), "Invalid treasury");
        require(_protocolFeeShare <= BASIS_POINTS, "Invalid fee share");

        gameToken = IERC20(_gameToken);
        treasury = _treasury;
        protocolFeeShare = _protocolFeeShare;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(REWARD_DISTRIBUTOR_ROLE, msg.sender);

        // Initialize staking pools with different reward rates
        _initializePools();
    }

    /**
     * @dev Initialize staking pools with different reward rates
     */
    function _initializePools() internal {
        // Governance: 3% APY - Low commitment, participation rewards
        stakingPools[StakingPurpose.GOVERNANCE] = StakingPool({
            totalStaked: 0,
            rewardRate: 300, // 3% APY
            lastUpdateTime: block.timestamp,
            rewardPerTokenStored: 0,
            totalRewardsDistributed: 0,
            active: true
        });

        // DAO Creation: 8% APY - Medium commitment, ecosystem building
        stakingPools[StakingPurpose.DAO_CREATION] = StakingPool({
            totalStaked: 0,
            rewardRate: 800, // 8% APY
            lastUpdateTime: block.timestamp,
            rewardPerTokenStored: 0,
            totalRewardsDistributed: 0,
            active: true
        });

        // Treasury Bond: 12% APY - High commitment, long-term locking
        stakingPools[StakingPurpose.TREASURY_BOND] = StakingPool({
            totalStaked: 0,
            rewardRate: 1200, // 12% APY
            lastUpdateTime: block.timestamp,
            rewardPerTokenStored: 0,
            totalRewardsDistributed: 0,
            active: true
        });

        // Liquidity Mining: 6% APY - Variable based on market conditions
        stakingPools[StakingPurpose.LIQUIDITY_MINING] = StakingPool({
            totalStaked: 0,
            rewardRate: 600, // 6% APY
            lastUpdateTime: block.timestamp,
            rewardPerTokenStored: 0,
            totalRewardsDistributed: 0,
            active: true
        });
    }

    /**
     * @dev Stake tokens for a specific purpose
     */
    function stake(
        StakingPurpose purpose,
        uint256 amount,
        UnstakingStrategy preferredStrategy
    ) external nonReentrant whenNotPaused {
        require(amount >= MIN_STAKE_AMOUNT, "Amount too small");
        require(stakingPools[purpose].active, "Pool not active");
        require(!slashedUsers[msg.sender], "User is slashed");

        _updateRewards(purpose, msg.sender);

        // Transfer tokens
        gameToken.safeTransferFrom(msg.sender, address(this), amount);

        // Update user stake
        UserStake storage userStake = userStakes[msg.sender][purpose];
        userStake.amount += amount;
        userStake.stakedAt = block.timestamp;
        userStake.lastClaimTime = block.timestamp;
        userStake.preferredStrategy = preferredStrategy;

        // Update pool
        stakingPools[purpose].totalStaked += amount;

        emit Staked(msg.sender, purpose, amount, preferredStrategy, block.timestamp);
    }

    /**
     * @dev Request unstaking with chosen strategy
     */
    function requestUnstake(
        StakingPurpose purpose,
        uint256 amount,
        UnstakingStrategy strategy
    ) external nonReentrant whenNotPaused {
        UserStake storage userStake = userStakes[msg.sender][purpose];
        require(userStake.amount >= amount, "Insufficient stake");

        _updateRewards(purpose, msg.sender);

        uint256 requestId = userUnstakeRequestCount[msg.sender]++;
        uint256 unlockTime = _calculateUnlockTime(strategy);

        unstakeRequests[msg.sender][requestId] = UnstakeRequest({
            amount: amount,
            requestTime: block.timestamp,
            strategy: strategy,
            processed: false
        });

        emit UnstakeRequested(
            msg.sender,
            purpose,
            amount,
            strategy,
            requestId,
            unlockTime
        );
    }

    /**
     * @dev Process unstake request
     */
    function processUnstake(
        StakingPurpose purpose,
        uint256 requestId
    ) external nonReentrant whenNotPaused {
        UnstakeRequest storage request = unstakeRequests[msg.sender][requestId];
        require(!request.processed, "Already processed");
        require(_canProcessUnstake(request), "Cannot process yet");

        UserStake storage userStake = userStakes[msg.sender][purpose];
        require(userStake.amount >= request.amount, "Insufficient stake");

        _updateRewards(purpose, msg.sender);

        uint256 penalty = 0;
        uint256 finalAmount = request.amount;

        // Apply penalties/bonuses based on strategy
        if (request.strategy == UnstakingStrategy.RAGE_QUIT) {
            penalty = (request.amount * RAGE_QUIT_PENALTY) / BASIS_POINTS;
            finalAmount = request.amount - penalty;
        }

        // Update state
        userStake.amount -= request.amount;
        stakingPools[purpose].totalStaked -= request.amount;
        request.processed = true;

        // Transfer tokens (minus penalty)
        gameToken.safeTransfer(msg.sender, finalAmount);

        // Send penalty to treasury
        if (penalty > 0) {
            gameToken.safeTransfer(treasury, penalty);
        }

        emit Unstaked(msg.sender, purpose, finalAmount, penalty, block.timestamp);
    }

    /**
     * @dev Claim pending rewards
     */
    function claimRewards(StakingPurpose purpose) external nonReentrant whenNotPaused {
        _updateRewards(purpose, msg.sender);

        UserStake storage userStake = userStakes[msg.sender][purpose];
        uint256 rewards = userStake.pendingRewards;
        require(rewards > 0, "No rewards to claim");

        userStake.pendingRewards = 0;
        userStake.lastClaimTime = block.timestamp;

        // Apply strategy bonus
        uint256 bonus = _calculateStrategyBonus(userStake.preferredStrategy, rewards);
        uint256 totalReward = rewards + bonus;

        gameToken.safeTransfer(msg.sender, totalReward);

        emit RewardsClaimed(msg.sender, purpose, totalReward, block.timestamp);
    }

    /**
     * @dev Slash a user's stake (admin function)
     */
    function slash(
        address user,
        StakingPurpose purpose,
        uint256 amount,
        string memory reason
    ) external onlyRole(SLASHER_ROLE) {
        UserStake storage userStake = userStakes[user][purpose];
        require(userStake.amount >= amount, "Insufficient stake to slash");

        _updateRewards(purpose, user);

        userStake.amount -= amount;
        stakingPools[purpose].totalStaked -= amount;
        totalSlashed += amount;
        slashedUsers[user] = true;

        // Burn slashed tokens or send to treasury
        gameToken.safeTransfer(treasury, amount);

        emit Slashed(user, purpose, amount, msg.sender, reason, block.timestamp);
    }

    /**
     * @dev Distribute rewards to a pool
     */
    function distributeRewards(
        StakingPurpose purpose,
        uint256 amount
    ) external onlyRole(REWARD_DISTRIBUTOR_ROLE) {
        require(amount > 0, "Invalid amount");
        require(stakingPools[purpose].totalStaked > 0, "No stakers");

        gameToken.safeTransferFrom(msg.sender, address(this), amount);

        _updatePoolRewards(purpose);

        StakingPool storage pool = stakingPools[purpose];
        uint256 rewardPerToken = (amount * PRECISION) / pool.totalStaked;
        pool.rewardPerTokenStored += rewardPerToken;
        pool.totalRewardsDistributed += amount;
        totalRewardsPool += amount;

        emit RewardsDistributed(purpose, amount, block.timestamp);
    }

    /**
     * @dev Update pool configuration
     */
    function updatePool(
        StakingPurpose purpose,
        uint256 newRewardRate,
        bool active
    ) external onlyRole(ADMIN_ROLE) {
        require(newRewardRate <= MAX_REWARD_RATE, "Rate too high");

        _updatePoolRewards(purpose);

        StakingPool storage pool = stakingPools[purpose];
        pool.rewardRate = newRewardRate;
        pool.active = active;

        emit PoolUpdated(purpose, newRewardRate, active);
    }

    /**
     * @dev Update rewards for a user
     */
    function _updateRewards(StakingPurpose purpose, address user) internal {
        _updatePoolRewards(purpose);

        StakingPool storage pool = stakingPools[purpose];
        UserStake storage userStake = userStakes[user][purpose];

        if (userStake.amount > 0) {
            uint256 earned = (userStake.amount *
                (pool.rewardPerTokenStored - userStake.rewardPerTokenPaid)) / PRECISION;
            userStake.pendingRewards += earned;
        }

        userStake.rewardPerTokenPaid = pool.rewardPerTokenStored;
    }

    /**
     * @dev Update pool rewards based on time
     */
    function _updatePoolRewards(StakingPurpose purpose) internal {
        StakingPool storage pool = stakingPools[purpose];

        if (pool.totalStaked == 0) {
            pool.lastUpdateTime = block.timestamp;
            return;
        }

        uint256 timeElapsed = block.timestamp - pool.lastUpdateTime;
        uint256 annualReward = (pool.totalStaked * pool.rewardRate) / BASIS_POINTS;
        uint256 reward = (annualReward * timeElapsed) / 365 days;

        if (reward > 0) {
            uint256 rewardPerToken = (reward * PRECISION) / pool.totalStaked;
            pool.rewardPerTokenStored += rewardPerToken;
            pool.totalRewardsDistributed += reward;
        }

        pool.lastUpdateTime = block.timestamp;
    }

    /**
     * @dev Calculate unlock time based on strategy
     */
    function _calculateUnlockTime(UnstakingStrategy strategy) internal view returns (uint256) {
        if (strategy == UnstakingStrategy.RAGE_QUIT) {
            return block.timestamp; // Instant
        } else if (strategy == UnstakingStrategy.STANDARD) {
            return block.timestamp + 7 days;
        } else {
            return block.timestamp + 30 days; // PATIENT
        }
    }

    /**
     * @dev Check if unstake request can be processed
     */
    function _canProcessUnstake(UnstakeRequest memory request) internal view returns (bool) {
        uint256 unlockTime = request.requestTime + _getUnstakingDelay(request.strategy);
        return block.timestamp >= unlockTime;
    }

    /**
     * @dev Get unstaking delay in seconds
     */
    function _getUnstakingDelay(UnstakingStrategy strategy) internal pure returns (uint256) {
        if (strategy == UnstakingStrategy.RAGE_QUIT) {
            return 0;
        } else if (strategy == UnstakingStrategy.STANDARD) {
            return 7 days;
        } else {
            return 30 days; // PATIENT
        }
    }

    /**
     * @dev Calculate strategy bonus
     */
    function _calculateStrategyBonus(
        UnstakingStrategy strategy,
        uint256 baseReward
    ) internal pure returns (uint256) {
        if (strategy == UnstakingStrategy.PATIENT) {
            return (baseReward * 500) / BASIS_POINTS; // 5% bonus
        }
        return 0; // No bonus for other strategies
    }

    // View functions
    function getPendingRewards(
        address user,
        StakingPurpose purpose
    ) external view returns (uint256) {
        StakingPool memory pool = stakingPools[purpose];
        UserStake memory userStake = userStakes[user][purpose];

        if (userStake.amount == 0 || pool.totalStaked == 0) {
            return userStake.pendingRewards;
        }

        uint256 timeElapsed = block.timestamp - pool.lastUpdateTime;
        uint256 annualReward = (pool.totalStaked * pool.rewardRate) / BASIS_POINTS;
        uint256 reward = (annualReward * timeElapsed) / 365 days;
        uint256 rewardPerToken = (reward * PRECISION) / pool.totalStaked;
        uint256 updatedRewardPerToken = pool.rewardPerTokenStored + rewardPerToken;

        uint256 earned = (userStake.amount *
            (updatedRewardPerToken - userStake.rewardPerTokenPaid)) / PRECISION;

        return userStake.pendingRewards + earned;
    }

    function getStakeInfo(
        address user,
        StakingPurpose purpose
    ) external view returns (
        uint256 amount,
        uint256 pendingRewards,
        uint256 stakedAt,
        UnstakingStrategy strategy
    ) {
        UserStake memory userStake = userStakes[user][purpose];
        return (
            userStake.amount,
            userStake.pendingRewards,
            userStake.stakedAt,
            userStake.preferredStrategy
        );
    }

    function getPoolInfo(StakingPurpose purpose) external view returns (
        uint256 totalStaked,
        uint256 rewardRate,
        uint256 totalRewardsDistributed,
        bool active
    ) {
        StakingPool memory pool = stakingPools[purpose];
        return (
            pool.totalStaked,
            pool.rewardRate,
            pool.totalRewardsDistributed,
            pool.active
        );
    }

    // Admin functions
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    function setTreasury(address _treasury) external onlyRole(ADMIN_ROLE) {
        require(_treasury != address(0), "Invalid treasury");
        treasury = _treasury;
    }

    function setProtocolFeeShare(uint256 _protocolFeeShare) external onlyRole(ADMIN_ROLE) {
        require(_protocolFeeShare <= BASIS_POINTS, "Invalid fee share");
        protocolFeeShare = _protocolFeeShare;
    }

    function emergencyWithdraw(address token, uint256 amount) external onlyRole(ADMIN_ROLE) {
        IERC20(token).safeTransfer(treasury, amount);
    }
}
