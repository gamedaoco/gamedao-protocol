// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "../interfaces/IGameDAORegistry.sol";
import "../interfaces/IGameDAOModule.sol";

/**
 * @title GameDAORegistry
 * @dev Central registry for managing all GameDAO protocol modules
 * @author GameDAO AG
 */
contract GameDAORegistry is IGameDAORegistry, AccessControl, Pausable, ReentrancyGuard {
    using EnumerableSet for EnumerableSet.Bytes32Set;

    // Role definitions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MODULE_MANAGER_ROLE = keccak256("MODULE_MANAGER_ROLE");

    // Module information
    struct ModuleInfo {
        address moduleAddress;
        string version;
        bool isEnabled;
        uint256 registeredAt;
        uint256 enabledAt;
    }

    // Storage
    mapping(bytes32 => ModuleInfo) private _modules;
    EnumerableSet.Bytes32Set private _allModules;
    EnumerableSet.Bytes32Set private _enabledModules;

    // Events (others inherited from IGameDAORegistry)
    event RegistryInitialized(address indexed admin);

    // Errors
    error ModuleNotRegistered(bytes32 moduleId);
    error ModuleAlreadyRegistered(bytes32 moduleId);
    error ModuleAlreadyEnabled(bytes32 moduleId);
    error ModuleNotEnabled(bytes32 moduleId);
    error InvalidModuleAddress();
    error ModuleInitializationFailed();

    /**
     * @dev Constructor
     * @param admin The address that will be granted the admin role
     */
    constructor(address admin) {
        require(admin != address(0), "Invalid admin address");

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(MODULE_MANAGER_ROLE, admin);

        emit RegistryInitialized(admin);
    }

    /**
     * @dev Registers a new module
     * @param moduleAddress The address of the module contract
     */
    function registerModule(address moduleAddress)
        external
        onlyRole(MODULE_MANAGER_ROLE)
        whenNotPaused
        nonReentrant
    {
        if (moduleAddress == address(0)) revert InvalidModuleAddress();

        // Get module info from the contract
        IGameDAOModule module = IGameDAOModule(moduleAddress);
        bytes32 moduleId = module.moduleId();
        string memory version = module.version();

        if (_modules[moduleId].moduleAddress != address(0)) {
            revert ModuleAlreadyRegistered(moduleId);
        }

        // Initialize the module
        try module.initialize(address(this)) {
            // Registration successful
        } catch {
            revert ModuleInitializationFailed();
        }

        // Store module information
        _modules[moduleId] = ModuleInfo({
            moduleAddress: moduleAddress,
            version: version,
            isEnabled: false,
            registeredAt: block.timestamp,
            enabledAt: 0
        });

        _allModules.add(moduleId);

        emit ModuleRegistered(moduleId, moduleAddress, version);
    }

    /**
     * @dev Enables a module
     * @param moduleId The unique identifier of the module
     */
    function enableModule(bytes32 moduleId)
        external
        onlyRole(MODULE_MANAGER_ROLE)
        whenNotPaused
        nonReentrant
    {
        ModuleInfo storage moduleInfo = _modules[moduleId];
        if (moduleInfo.moduleAddress == address(0)) revert ModuleNotRegistered(moduleId);
        if (moduleInfo.isEnabled) revert ModuleAlreadyEnabled(moduleId);

        moduleInfo.isEnabled = true;
        moduleInfo.enabledAt = block.timestamp;
        _enabledModules.add(moduleId);

        // Notify the module
        IGameDAOModule(moduleInfo.moduleAddress).onModuleEnabled();

        emit ModuleEnabled(moduleId);
    }

    /**
     * @dev Disables a module
     * @param moduleId The unique identifier of the module
     */
    function disableModule(bytes32 moduleId)
        external
        onlyRole(MODULE_MANAGER_ROLE)
        whenNotPaused
        nonReentrant
    {
        ModuleInfo storage moduleInfo = _modules[moduleId];
        if (moduleInfo.moduleAddress == address(0)) revert ModuleNotRegistered(moduleId);
        if (!moduleInfo.isEnabled) revert ModuleNotEnabled(moduleId);

        moduleInfo.isEnabled = false;
        moduleInfo.enabledAt = 0;
        _enabledModules.remove(moduleId);

        // Notify the module
        IGameDAOModule(moduleInfo.moduleAddress).onModuleDisabled();

        emit ModuleDisabled(moduleId);
    }

    /**
     * @dev Upgrades a module to a new implementation
     * @param moduleId The unique identifier of the module
     * @param newModuleAddress The address of the new module implementation
     */
    function upgradeModule(bytes32 moduleId, address newModuleAddress)
        external
        onlyRole(ADMIN_ROLE)
        whenNotPaused
        nonReentrant
    {
        if (newModuleAddress == address(0)) revert InvalidModuleAddress();

        ModuleInfo storage moduleInfo = _modules[moduleId];
        if (moduleInfo.moduleAddress == address(0)) revert ModuleNotRegistered(moduleId);

        address oldAddress = moduleInfo.moduleAddress;

        // Get new module info
        IGameDAOModule newModule = IGameDAOModule(newModuleAddress);
        require(newModule.moduleId() == moduleId, "Module ID mismatch");
        string memory newVersion = newModule.version();

        // Disable old module if enabled
        bool wasEnabled = moduleInfo.isEnabled;
        if (wasEnabled) {
            moduleInfo.isEnabled = false;
            _enabledModules.remove(moduleId);
            IGameDAOModule(oldAddress).onModuleDisabled();
        }

        // Initialize new module
        try newModule.initialize(address(this)) {
            // Initialization successful
        } catch {
            revert ModuleInitializationFailed();
        }

        // Update module info
        moduleInfo.moduleAddress = newModuleAddress;
        moduleInfo.version = newVersion;

        // Re-enable if it was enabled before
        if (wasEnabled) {
            moduleInfo.isEnabled = true;
            moduleInfo.enabledAt = block.timestamp;
            _enabledModules.add(moduleId);
            newModule.onModuleEnabled();
        }

        emit ModuleUpgraded(moduleId, oldAddress, newModuleAddress, newVersion);
    }

    /**
     * @dev Returns the address of a module
     * @param moduleId The unique identifier of the module
     * @return address The module address
     */
    function getModule(bytes32 moduleId) external view returns (address) {
        return _modules[moduleId].moduleAddress;
    }

    /**
     * @dev Returns whether a module is enabled
     * @param moduleId The unique identifier of the module
     * @return bool True if the module is enabled
     */
    function isModuleEnabled(bytes32 moduleId) external view returns (bool) {
        return _modules[moduleId].isEnabled;
    }

    /**
     * @dev Returns the version of a module
     * @param moduleId The unique identifier of the module
     * @return string The module version
     */
    function getModuleVersion(bytes32 moduleId) external view returns (string memory) {
        return _modules[moduleId].version;
    }

    /**
     * @dev Returns detailed information about a module
     * @param moduleId The unique identifier of the module
     * @return moduleInfo The complete module information
     */
    function getModuleInfo(bytes32 moduleId) external view returns (ModuleInfo memory) {
        return _modules[moduleId];
    }

    /**
     * @dev Returns all registered module IDs
     * @return bytes32[] Array of module IDs
     */
    function getAllModules() external view returns (bytes32[] memory) {
        return _allModules.values();
    }

    /**
     * @dev Returns all enabled module IDs
     * @return bytes32[] Array of enabled module IDs
     */
    function getEnabledModules() external view returns (bytes32[] memory) {
        return _enabledModules.values();
    }

    /**
     * @dev Returns the number of registered modules
     * @return uint256 The number of registered modules
     */
    function getModuleCount() external view returns (uint256) {
        return _allModules.length();
    }

    /**
     * @dev Returns the number of enabled modules
     * @return uint256 The number of enabled modules
     */
    function getEnabledModuleCount() external view returns (uint256) {
        return _enabledModules.length();
    }

    /**
     * @dev Pauses the registry (admin only)
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Unpauses the registry (admin only)
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @dev Emergency function to disable all modules (admin only)
     */
    function emergencyDisableAllModules() external onlyRole(ADMIN_ROLE) {
        bytes32[] memory enabledModules = _enabledModules.values();

        for (uint256 i = 0; i < enabledModules.length; i++) {
            bytes32 moduleId = enabledModules[i];
            ModuleInfo storage moduleInfo = _modules[moduleId];

            moduleInfo.isEnabled = false;
            moduleInfo.enabledAt = 0;
            _enabledModules.remove(moduleId);

            // Notify the module
            try IGameDAOModule(moduleInfo.moduleAddress).onModuleDisabled() {
                // Module notified successfully
            } catch {
                // Continue with other modules even if one fails
            }

            emit ModuleDisabled(moduleId);
        }
    }
}
