// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "../interfaces/IGameDAOModule.sol";
import "../interfaces/IGameDAORegistry.sol";

/**
 * @title GameDAOModule
 * @dev Base contract for all GameDAO modules
 * @author GameDAO AG
 */
abstract contract GameDAOModule is IGameDAOModule, AccessControl, Pausable, ReentrancyGuard {
    // Role definitions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    // State variables
    address private _registry;
    bool private _initialized;
    string private _version;

    // Events
    event ModuleInitialized(address indexed registry);
    event ModuleEnabled();
    event ModuleDisabled();

    // Errors
    error ModuleAlreadyInitialized();
    error ModuleNotInitialized();
    error OnlyRegistry();
    error InvalidRegistryAddress();

    /**
     * @dev Modifier to restrict access to the registry
     */
    modifier onlyRegistry() {
        if (_msgSender() != _registry) revert OnlyRegistry();
        _;
    }

    /**
     * @dev Modifier to ensure the module is initialized
     */
    modifier onlyInitialized() {
        if (!_initialized) revert ModuleNotInitialized();
        _;
    }

    /**
     * @dev Constructor
     * @param version_ The version of this module
     */
    constructor(string memory version_) {
        _version = version_;

        // Grant admin role to deployer initially
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _grantRole(ADMIN_ROLE, _msgSender());
    }

    /**
     * @dev Returns the unique identifier for this module
     * @return bytes32 The module identifier
     */
    function moduleId() external pure virtual returns (bytes32);

    /**
     * @dev Returns the version of this module
     * @return string The version string
     */
    function version() external view returns (string memory) {
        return _version;
    }

    /**
     * @dev Initializes the module with the registry address
     * @param registry The address of the GameDAO registry
     */
    function initialize(address registry) external {
        if (_initialized) revert ModuleAlreadyInitialized();
        if (registry == address(0)) revert InvalidRegistryAddress();

        _registry = registry;
        _initialized = true;

        // Grant registry admin permissions
        _grantRole(ADMIN_ROLE, registry);
        _grantRole(OPERATOR_ROLE, registry);

        // Call internal initialization hook
        _onInitialize();

        emit ModuleInitialized(registry);
    }

    /**
     * @dev Called when the module is enabled in the registry
     */
    function onModuleEnabled() external onlyRegistry onlyInitialized {
        _onModuleEnabled();
        emit ModuleEnabled();
    }

    /**
     * @dev Called when the module is disabled in the registry
     */
    function onModuleDisabled() external onlyRegistry onlyInitialized {
        _onModuleDisabled();
        emit ModuleDisabled();
    }

    /**
     * @dev Returns whether the module is initialized
     * @return bool True if initialized
     */
    function isInitialized() external view returns (bool) {
        return _initialized;
    }

    /**
     * @dev Returns the registry address
     * @return address The registry address
     */
    function registry() external view returns (address) {
        return _registry;
    }

    /**
     * @dev Returns the registry contract
     * @return IGameDAORegistry The registry contract
     */
    function getRegistry() internal view onlyInitialized returns (IGameDAORegistry) {
        return IGameDAORegistry(_registry);
    }

    /**
     * @dev Checks if another module is enabled
     * @param moduleId The module ID to check
     * @return bool True if the module is enabled
     */
    function isModuleEnabled(bytes32 moduleId) internal view onlyInitialized returns (bool) {
        return getRegistry().isModuleEnabled(moduleId);
    }

    /**
     * @dev Gets the address of another module
     * @param moduleId The module ID to get
     * @return address The module address
     */
    function getModule(bytes32 moduleId) internal view onlyInitialized returns (address) {
        return getRegistry().getModule(moduleId);
    }

    /**
     * @dev Pauses the module (admin only)
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Unpauses the module (admin only)
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @dev Internal hook called during initialization
     * Override this in derived contracts to add custom initialization logic
     */
    function _onInitialize() internal virtual {}

    /**
     * @dev Internal hook called when the module is enabled
     * Override this in derived contracts to add custom enable logic
     */
    function _onModuleEnabled() internal virtual {}

    /**
     * @dev Internal hook called when the module is disabled
     * Override this in derived contracts to add custom disable logic
     */
    function _onModuleDisabled() internal virtual {}

    /**
     * @dev Internal function to update the module version
     * @param newVersion The new version string
     */
    function _updateVersion(string memory newVersion) internal {
        _version = newVersion;
    }

    /**
     * @dev Emergency pause function that can be called by the registry
     */
    function emergencyPause() external onlyRegistry {
        _pause();
    }

    /**
     * @dev Emergency unpause function that can be called by the registry
     */
    function emergencyUnpause() external onlyRegistry {
        _unpause();
    }

    /**
     * @dev Override to ensure only initialized modules can be paused
     */
    function _pause() internal virtual override onlyInitialized {
        super._pause();
    }

    /**
     * @dev Override to ensure only initialized modules can be unpaused
     */
    function _unpause() internal virtual override onlyInitialized {
        super._unpause();
    }
}
