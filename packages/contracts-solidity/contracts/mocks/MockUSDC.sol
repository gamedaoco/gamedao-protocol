// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title MockUSDC
 * @dev Mock implementation of USDC token for testing
 * @author GameDAO AG
 */
contract MockUSDC is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    constructor() ERC20("USD Coin", "USDC") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);

        // Mint initial supply (1M USDC)
        _mint(msg.sender, 1000000 * 10**6);
    }

    /**
     * @dev Returns 6 decimals like real USDC
     */
    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /**
     * @dev Mint tokens (for testing purposes)
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    /**
     * @dev Burn tokens (for testing purposes)
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }

    /**
     * @dev Burn tokens from specific address (with allowance)
     */
    function burnFrom(address from, uint256 amount) external {
        _spendAllowance(from, msg.sender, amount);
        _burn(from, amount);
    }

    /**
     * @dev Add minter role
     */
    function addMinter(address minter) external onlyRole(ADMIN_ROLE) {
        _grantRole(MINTER_ROLE, minter);
    }

    /**
     * @dev Remove minter role
     */
    function removeMinter(address minter) external onlyRole(ADMIN_ROLE) {
        _revokeRole(MINTER_ROLE, minter);
    }

    /**
     * @dev Check if address is a minter
     */
    function isMinter(address account) external view returns (bool) {
        return hasRole(MINTER_ROLE, account);
    }
}
