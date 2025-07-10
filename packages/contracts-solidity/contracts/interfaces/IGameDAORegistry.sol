// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.20;

/**
 * @title IGameDAORegistry
 * @dev Interface for the central GameDAO registry that manages all modules
 * @author GameDAO AG
 */
interface IGameDAORegistry {
    /**
     * @dev Emitted when a module is registered
     * @param moduleId The unique identifier of the module
     * @param moduleAddress The address of the module contract
     * @param version The version of the module
     */
    event ModuleRegistered(bytes32 indexed moduleId, address indexed moduleAddress, string version);

    /**
     * @dev Emitted when a module is enabled
     * @param moduleId The unique identifier of the module
     */
    event ModuleEnabled(bytes32 indexed moduleId);

    /**
     * @dev Emitted when a module is disabled
     * @param moduleId The unique identifier of the module
     */
    event ModuleDisabled(bytes32 indexed moduleId);

    /**
     * @dev Emitted when a module is upgraded
     * @param moduleId The unique identifier of the module
     * @param oldAddress The old module address
     * @param newAddress The new module address
     * @param newVersion The new version
     */
    event ModuleUpgraded(
        bytes32 indexed moduleId,
        address indexed oldAddress,
        address indexed newAddress,
        string newVersion
    );

    /**
     * @dev Registers a new module
     * @param moduleAddress The address of the module contract
     */
    function registerModule(address moduleAddress) external;

    /**
     * @dev Enables a module
     * @param moduleId The unique identifier of the module
     */
    function enableModule(bytes32 moduleId) external;

    /**
     * @dev Disables a module
     * @param moduleId The unique identifier of the module
     */
    function disableModule(bytes32 moduleId) external;

    /**
     * @dev Upgrades a module to a new implementation
     * @param moduleId The unique identifier of the module
     * @param newModuleAddress The address of the new module implementation
     */
    function upgradeModule(bytes32 moduleId, address newModuleAddress) external;

    /**
     * @dev Returns the address of a module
     * @param moduleId The unique identifier of the module
     * @return address The module address
     */
    function getModule(bytes32 moduleId) external view returns (address);

    /**
     * @dev Returns whether a module is enabled
     * @param moduleId The unique identifier of the module
     * @return bool True if the module is enabled
     */
    function isModuleEnabled(bytes32 moduleId) external view returns (bool);

    /**
     * @dev Returns the version of a module
     * @param moduleId The unique identifier of the module
     * @return string The module version
     */
    function getModuleVersion(bytes32 moduleId) external view returns (string memory);

    /**
     * @dev Returns all registered module IDs
     * @return bytes32[] Array of module IDs
     */
    function getAllModules() external view returns (bytes32[] memory);

    /**
     * @dev Returns all enabled module IDs
     * @return bytes32[] Array of enabled module IDs
     */
    function getEnabledModules() external view returns (bytes32[] memory);
}
