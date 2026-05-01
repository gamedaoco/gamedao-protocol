// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title FeeRegistry
 * @dev Admin-gated registry of protocol fees, keyed by function selector.
 *
 * The protocol replaces native-gas fees with in-token fees on
 * value-moving ops (per worklog/118). Gas is sponsored by a paymaster;
 * revenue is captured here. The registry is the single source of truth
 * so admins (and later DAO governance) can tune fees without redeploys.
 *
 * Fee currency follows the value being moved:
 *   - FLAT setup fees (createOrganization, createCampaign, createProposal)
 *     are denominated in the protocol's reference stable (USDC for v1).
 *     Stored amounts are in native token units (USDC = 6 decimals).
 *   - BPS fees (contribute) are basis points of the value being moved
 *     and therefore travel in whatever token the value is in. The
 *     caller multiplies; the registry just stores the rate.
 *
 * Caller responsibilities (the registry deliberately doesn't move
 * funds — modules differ in how they want to source the fee):
 *   1. Read the fee config via getFee(selector) or computeFee(selector, value).
 *   2. Pull the fee from the user (typically transferFrom of the
 *      configured token).
 *   3. Forward to treasury().
 */
contract FeeRegistry is AccessControl {
    bytes32 public constant FEE_ADMIN_ROLE = keccak256("FEE_ADMIN_ROLE");

    /// @dev Maximum BPS value (= 100%). Sanity bound, not a target.
    uint256 public constant BPS_DENOMINATOR = 10_000;

    enum FeeKind {
        FLAT,
        BPS
    }

    struct FeeConfig {
        FeeKind kind;
        uint256 amount;
    }

    address public treasury;
    mapping(bytes4 => FeeConfig) private _fees;

    event FeeSet(bytes4 indexed selector, FeeKind kind, uint256 amount);
    event FeeCleared(bytes4 indexed selector);
    event TreasuryUpdated(address indexed previousTreasury, address indexed newTreasury);

    /**
     * @param admin Address granted DEFAULT_ADMIN_ROLE + FEE_ADMIN_ROLE
     *              at deploy time (typically protocol sudo). Can be
     *              transferred / extended later.
     * @param treasury_ Initial fee recipient. Must be non-zero.
     */
    constructor(address admin, address treasury_) {
        require(admin != address(0), "FeeRegistry: admin = 0");
        require(treasury_ != address(0), "FeeRegistry: treasury = 0");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(FEE_ADMIN_ROLE, admin);
        treasury = treasury_;
    }

    /// @dev Set the fee configuration for `selector`. Pass amount = 0 to
    ///      disable a previously-set fee (use clearFee for clarity).
    function setFee(bytes4 selector, FeeKind kind, uint256 amount) external onlyRole(FEE_ADMIN_ROLE) {
        if (kind == FeeKind.BPS) {
            require(amount <= BPS_DENOMINATOR, "FeeRegistry: bps > 10000");
        }
        _fees[selector] = FeeConfig({kind: kind, amount: amount});
        emit FeeSet(selector, kind, amount);
    }

    /// @dev Remove fee config for `selector`. Equivalent to setFee(selector, FLAT, 0)
    ///      but emits a clearer event for indexers.
    function clearFee(bytes4 selector) external onlyRole(FEE_ADMIN_ROLE) {
        delete _fees[selector];
        emit FeeCleared(selector);
    }

    function setTreasury(address newTreasury) external onlyRole(FEE_ADMIN_ROLE) {
        require(newTreasury != address(0), "FeeRegistry: treasury = 0");
        emit TreasuryUpdated(treasury, newTreasury);
        treasury = newTreasury;
    }

    /// @dev Raw fee config lookup. Returns (FLAT, 0) for unset selectors.
    function getFee(bytes4 selector) external view returns (FeeKind kind, uint256 amount) {
        FeeConfig memory cfg = _fees[selector];
        return (cfg.kind, cfg.amount);
    }

    /**
     * @dev Compute the fee amount for a single op.
     *      - FLAT: returns the configured amount directly (caller-supplied
     *        `value` is ignored).
     *      - BPS: returns value * bps / 10_000.
     *      Returns 0 for selectors without a configured fee.
     */
    function computeFee(bytes4 selector, uint256 value) external view returns (uint256) {
        FeeConfig memory cfg = _fees[selector];
        if (cfg.amount == 0) return 0;
        if (cfg.kind == FeeKind.FLAT) return cfg.amount;
        return (value * cfg.amount) / BPS_DENOMINATOR;
    }
}
