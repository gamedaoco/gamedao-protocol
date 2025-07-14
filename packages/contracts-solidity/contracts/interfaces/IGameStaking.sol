// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.20;

/**
 * @title IGameStaking
 * @dev Interface for the GameStaking contract with organization-specific functionality
 * @author GameDAO AG
 */
interface IGameStaking {
    // Enums
    enum StakingPurpose {
        GOVERNANCE,
        DAO_CREATION,
        TREASURY_BOND,
        LIQUIDITY_MINING
    }

    enum UnstakingStrategy {
        RAGE_QUIT,
        STANDARD,
        PATIENT
    }

    // Structs
    struct OrganizationStake {
        bytes8 organizationId;
        address staker;
        uint256 amount;
        uint256 stakedAt;
        bool active;
    }

    // Events
    event OrganizationStaked(
        bytes8 indexed organizationId,
        address indexed staker,
        uint256 amount,
        uint256 timestamp
    );

    event OrganizationStakeWithdrawn(
        bytes8 indexed organizationId,
        address indexed staker,
        uint256 amount,
        uint256 timestamp
    );

    // Organization staking functions
    function stakeForOrganization(
        bytes8 organizationId,
        address staker,
        uint256 amount
    ) external;

    function withdrawOrganizationStake(
        bytes8 organizationId,
        address staker
    ) external;

    function getOrganizationStake(bytes8 organizationId)
        external
        view
        returns (OrganizationStake memory);

    function getUserOrganizationStakes(address user)
        external
        view
        returns (bytes8[] memory);

    function canWithdrawOrganizationStake(bytes8 organizationId)
        external
        view
        returns (bool);

    // Regular staking functions
    function stake(
        StakingPurpose purpose,
        uint256 amount,
        UnstakingStrategy preferredStrategy
    ) external;

    function requestUnstake(
        StakingPurpose purpose,
        uint256 amount,
        UnstakingStrategy strategy
    ) external;

    function processUnstake(uint256 requestId) external;

    function claimRewards(StakingPurpose purpose) external;

    // Admin functions
    function addOrganizationManager(address manager) external;
    function removeOrganizationManager(address manager) external;
}
