// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "../interfaces/IGameToken.sol";

/**
 * @title MockGameToken
 * @dev Mock implementation of the GAME token for testing
 * @author GameDAO AG
 */
contract MockGameToken is ERC20, AccessControl, IGameToken {
    bytes32 public constant SLASHER_ROLE = keccak256("SLASHER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // Staking data
    mapping(address => mapping(bytes32 => uint256)) private _stakes;
    mapping(address => uint256) private _totalStaked;
    mapping(bytes32 => uint256) private _totalStakedForPurpose;
    mapping(bytes32 => uint256) private _unstakingDelays;

    // Track staking timestamps for unstaking delays
    mapping(address => mapping(bytes32 => uint256)) private _stakeTimestamps;

    constructor() ERC20("GameDAO Token", "GAME") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);

        // Mint initial supply (1M tokens)
        _mint(msg.sender, 1000000 * 10**18);
    }

    /**
     * @dev Stake tokens for a specific purpose
     */
    function stake(bytes32 purpose, uint256 amount) external override {
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        require(amount > 0, "Amount must be greater than 0");

        // Transfer tokens to this contract
        _transfer(msg.sender, address(this), amount);

        // Update staking records
        _stakes[msg.sender][purpose] += amount;
        _totalStaked[msg.sender] += amount;
        _totalStakedForPurpose[purpose] += amount;
        _stakeTimestamps[msg.sender][purpose] = block.timestamp;

        emit Staked(msg.sender, purpose, amount, block.timestamp);
    }

    /**
     * @dev Stake tokens for a specific purpose on behalf of another user
     */
    function stakeFor(address user, bytes32 purpose, uint256 amount) external override {
        require(user != address(0), "Invalid user address");
        require(amount > 0, "Amount must be greater than 0");

        // Transfer tokens from user to this contract (requires approval)
        _transfer(user, address(this), amount);

        // Update staking records for the user
        _stakes[user][purpose] += amount;
        _totalStaked[user] += amount;
        _totalStakedForPurpose[purpose] += amount;
        _stakeTimestamps[user][purpose] = block.timestamp;

        emit Staked(user, purpose, amount, block.timestamp);
    }

    /**
     * @dev Unstake tokens from a specific purpose
     */
    function unstake(bytes32 purpose, uint256 amount) external override {
        require(_stakes[msg.sender][purpose] >= amount, "Insufficient stake");
        require(amount > 0, "Amount must be greater than 0");

        // Check unstaking delay
        uint256 delay = _unstakingDelays[purpose];
        if (delay > 0) {
            require(
                block.timestamp >= _stakeTimestamps[msg.sender][purpose] + delay,
                "Unstaking delay not met"
            );
        }

        // Update staking records
        _stakes[msg.sender][purpose] -= amount;
        _totalStaked[msg.sender] -= amount;
        _totalStakedForPurpose[purpose] -= amount;

        // Transfer tokens back to user
        _transfer(address(this), msg.sender, amount);

        emit Unstaked(msg.sender, purpose, amount, block.timestamp);
    }

    /**
     * @dev Unstake all tokens from a specific purpose
     */
    function unstakeAll(bytes32 purpose) external override {
        uint256 amount = _stakes[msg.sender][purpose];
        require(amount > 0, "No stake to unstake");

        // Check unstaking delay
        uint256 delay = _unstakingDelays[purpose];
        if (delay > 0) {
            require(
                block.timestamp >= _stakeTimestamps[msg.sender][purpose] + delay,
                "Unstaking delay not met"
            );
        }

        // Update staking records
        _stakes[msg.sender][purpose] = 0;
        _totalStaked[msg.sender] -= amount;
        _totalStakedForPurpose[purpose] -= amount;

        // Transfer tokens back to user
        _transfer(address(this), msg.sender, amount);

        emit Unstaked(msg.sender, purpose, amount, block.timestamp);
    }

    /**
     * @dev Slash staked tokens (only slashers)
     */
    function slash(
        address user,
        bytes32 purpose,
        uint256 amount,
        string memory reason
    ) external override onlyRole(SLASHER_ROLE) {
        require(_stakes[user][purpose] >= amount, "Insufficient stake to slash");
        require(amount > 0, "Amount must be greater than 0");

        // Update staking records
        _stakes[user][purpose] -= amount;
        _totalStaked[user] -= amount;
        _totalStakedForPurpose[purpose] -= amount;

        // Burn the slashed tokens
        _burn(address(this), amount);

        emit StakeSlashed(user, purpose, amount, msg.sender, reason, block.timestamp);
    }

    /**
     * @dev Get staked amount for a user and purpose
     */
    function getStakedAmount(address user, bytes32 purpose)
        external
        view
        override
        returns (uint256)
    {
        return _stakes[user][purpose];
    }

    /**
     * @dev Get total staked amount for a user
     */
    function getTotalStaked(address user) external view override returns (uint256) {
        return _totalStaked[user];
    }

    /**
     * @dev Get total staked amount for a specific purpose
     */
    function getTotalStakedForPurpose(bytes32 purpose)
        external
        view
        override
        returns (uint256)
    {
        return _totalStakedForPurpose[purpose];
    }

    /**
     * @dev Get available balance (total balance - staked)
     */
    function getAvailableBalance(address user) external view override returns (uint256) {
        uint256 balance = balanceOf(user);
        uint256 staked = _totalStaked[user];
        return balance > staked ? balance - staked : 0;
    }

    /**
     * @dev Check if user can unstake a specific amount
     */
    function canUnstake(
        address user,
        bytes32 purpose,
        uint256 amount
    ) external view override returns (bool) {
        if (_stakes[user][purpose] < amount) return false;

        uint256 delay = _unstakingDelays[purpose];
        if (delay > 0) {
            return block.timestamp >= _stakeTimestamps[user][purpose] + delay;
        }

        return true;
    }

    /**
     * @dev Check if address is a slasher
     */
    function isSlasher(address account) external view override returns (bool) {
        return hasRole(SLASHER_ROLE, account);
    }

    /**
     * @dev Add slasher role
     */
    function addSlasher(address slasher) external override onlyRole(ADMIN_ROLE) {
        _grantRole(SLASHER_ROLE, slasher);
    }

    /**
     * @dev Remove slasher role
     */
    function removeSlasher(address slasher) external override onlyRole(ADMIN_ROLE) {
        _revokeRole(SLASHER_ROLE, slasher);
    }

    /**
     * @dev Set unstaking delay for a purpose
     */
    function setUnstakingDelay(bytes32 purpose, uint256 delay)
        external
        override
        onlyRole(ADMIN_ROLE)
    {
        _unstakingDelays[purpose] = delay;
    }

    /**
     * @dev Get unstaking delay for a purpose
     */
    function getUnstakingDelay(bytes32 purpose) external view override returns (uint256) {
        return _unstakingDelays[purpose];
    }

    /**
     * @dev Mint tokens (for testing purposes)
     */
    function mint(address to, uint256 amount) external onlyRole(ADMIN_ROLE) {
        _mint(to, amount);
    }

            /**
     * @dev Override transfer to prevent transferring staked tokens
     */
    function _beforeTokenTransfer(address from, address to, uint256 amount) internal override {
        super._beforeTokenTransfer(from, to, amount);

        // Allow transfers to this contract (for staking) and from this contract (for unstaking)
        if (from != address(0) && from != address(this) && to != address(this)) {
            // Check if user has enough available balance for regular transfers
            uint256 availableBalance = balanceOf(from) - _totalStaked[from];
            require(availableBalance >= amount, "Cannot transfer staked tokens");
        }
    }
}
