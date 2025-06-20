// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title IGameToken
 * @dev Interface for the GAME token with staking functionality
 * @author GameDAO AG
 */
interface IGameToken is IERC20 {
    // Events
    event Staked(
        address indexed user,
        bytes32 indexed purpose,
        uint256 amount,
        uint256 timestamp
    );

    event Unstaked(
        address indexed user,
        bytes32 indexed purpose,
        uint256 amount,
        uint256 timestamp
    );

    event StakeSlashed(
        address indexed user,
        bytes32 indexed purpose,
        uint256 amount,
        address indexed slasher,
        string reason,
        uint256 timestamp
    );

    // Staking Functions
    function stake(bytes32 purpose, uint256 amount) external;

    function unstake(bytes32 purpose, uint256 amount) external;

    function unstakeAll(bytes32 purpose) external;

    function slash(
        address user,
        bytes32 purpose,
        uint256 amount,
        string memory reason
    ) external;

    // View Functions
    function getStakedAmount(address user, bytes32 purpose)
        external
        view
        returns (uint256);

    function getTotalStaked(address user) external view returns (uint256);

    function getTotalStakedForPurpose(bytes32 purpose)
        external
        view
        returns (uint256);

    function getAvailableBalance(address user) external view returns (uint256);

    function canUnstake(
        address user,
        bytes32 purpose,
        uint256 amount
    ) external view returns (bool);

    function isSlasher(address account) external view returns (bool);

    // Admin Functions
    function addSlasher(address slasher) external;

    function removeSlasher(address slasher) external;

    function setUnstakingDelay(bytes32 purpose, uint256 delay) external;

    function getUnstakingDelay(bytes32 purpose) external view returns (uint256);
}
