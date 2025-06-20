// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

/**
 * @title IGameDAOModule
 * @dev Interface that all GameDAO modules must implement
 * @author GameDAO AG
 */
interface IGameDAOModule {
    /**
     * @dev Returns the unique identifier for this module
     * @return bytes32 The module identifier
     */
    function moduleId() external pure returns (bytes32);

    /**
     * @dev Returns the version of this module
     * @return string The version string
     */
    function version() external view returns (string memory);

    /**
     * @dev Initializes the module with the registry address
     * @param registry The address of the GameDAO registry
     */
    function initialize(address registry) external;

    /**
     * @dev Called when the module is enabled in the registry
     */
    function onModuleEnabled() external;

    /**
     * @dev Called when the module is disabled in the registry
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
