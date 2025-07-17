// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title IGameToken
 * @dev Clean interface for the GAME token (standard ERC20)
 * @author GameDAO AG
 */
interface IGameToken is IERC20 {
    // Events
    event TokensMinted(address indexed to, uint256 amount, uint256 timestamp);
    event TokensBurned(address indexed from, uint256 amount, uint256 timestamp);

    // Token management functions
    function mint(address to, uint256 amount) external;
    function burn(uint256 amount) external;
    function burnFrom(address from, uint256 amount) external;

    // Access control functions
    function addMinter(address minter) external;
    function removeMinter(address minter) external;

    // Pause functionality
    function pause() external;
    function unpause() external;

    // Constants
    function INITIAL_SUPPLY() external view returns (uint256);
    function MAX_SUPPLY() external view returns (uint256);
}
