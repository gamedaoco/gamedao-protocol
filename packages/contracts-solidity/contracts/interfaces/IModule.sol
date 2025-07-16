// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.20;

/**
 * @title IModule
 * @dev Interface for all GameDAO modules
 * @author GameDAO AG
 */
interface IModule {
    /**
     * @dev Returns the module ID
     */
    function moduleId() external pure returns (bytes32);

    /**
     * @dev Returns the module version
     */
    function version() external view returns (string memory);

    /**
     * @dev Initialize the module with registry
     */
    function initialize(address registryAddress) external;

    /**
     * @dev Called when module is enabled
     */
    function onModuleEnabled() external;

    /**
     * @dev Called when module is disabled
     */
    function onModuleDisabled() external;

    /**
     * @dev Returns whether the module is initialized
     * @return bool True if initialized
     */
    function isInitialized() external view returns (bool);

    /**
     * @dev Returns the registry address
     * @return address The registry address
     */
    function registry() external view returns (address);
}
