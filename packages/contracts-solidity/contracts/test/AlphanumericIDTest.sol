// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.20;

import "../libraries/AlphanumericID.sol";

/**
 * @title AlphanumericIDTest
 * @dev Test contract to expose AlphanumericID library functions for testing
 */
contract AlphanumericIDTest {
    using AlphanumericID for bytes32;

    /**
     * @dev Test wrapper for generateID function
     */
    function testGenerateID(bytes32 hash) external pure returns (bytes8) {
        return AlphanumericID.generateID(hash);
    }

    /**
     * @dev Test wrapper for generateIDString function
     */
    function testGenerateIDString(bytes32 hash) external pure returns (string memory) {
        return AlphanumericID.generateIDString(hash);
    }

    /**
     * @dev Test wrapper for generateOrganizationID function
     */
    function testGenerateOrganizationID(
        bytes32 moduleId,
        uint256 index,
        address creator,
        uint256 timestamp
    ) external pure returns (bytes8) {
        return AlphanumericID.generateOrganizationID(moduleId, index, creator, timestamp);
    }

    /**
     * @dev Test wrapper for generateCampaignID function
     */
    function testGenerateCampaignID(
        bytes8 organizationId,
        address creator,
        string memory title,
        uint256 timestamp,
        uint256 counter
    ) external pure returns (bytes8) {
        return AlphanumericID.generateCampaignID(organizationId, creator, title, timestamp, counter);
    }

    /**
     * @dev Test wrapper for generateProposalID function
     */
    function testGenerateProposalID(
        bytes8 organizationId,
        address proposer,
        string memory title,
        uint256 timestamp,
        uint256 counter
    ) external pure returns (bytes8) {
        return AlphanumericID.generateProposalID(organizationId, proposer, title, timestamp, counter);
    }

    /**
     * @dev Test wrapper for generateProfileID function
     */
    function testGenerateProfileID(
        address owner,
        bytes8 organizationId,
        uint256 timestamp,
        uint256 counter
    ) external pure returns (bytes8) {
        return AlphanumericID.generateProfileID(owner, organizationId, timestamp, counter);
    }

    /**
     * @dev Test wrapper for toString function
     */
    function testToString(bytes8 id) external pure returns (string memory) {
        return AlphanumericID.toString(id);
    }

    /**
     * @dev Test wrapper for fromString function
     */
    function testFromString(string memory id) external pure returns (bytes8) {
        return AlphanumericID.fromString(id);
    }

    /**
     * @dev Test wrapper for validateID function
     */
    function testValidateID(bytes8 id) external pure returns (bool) {
        return AlphanumericID.validateID(id);
    }

    /**
     * @dev Test collision resistance by generating multiple IDs
     */
    function testCollisionResistance(uint256 count) external view returns (bytes8[] memory) {
        bytes8[] memory ids = new bytes8[](count);

        for (uint256 i = 0; i < count; i++) {
            bytes32 hash = keccak256(abi.encodePacked("test", i, block.timestamp));
            ids[i] = AlphanumericID.generateID(hash);
        }

        return ids;
    }

    /**
     * @dev Test ID generation with various inputs
     */
    function testVariousInputs() external view returns (bytes8[] memory) {
        bytes8[] memory ids = new bytes8[](5);

        // Test with different module IDs
        ids[0] = AlphanumericID.generateOrganizationID(
            keccak256("CONTROL"), 1, msg.sender, block.timestamp
        );
        ids[1] = AlphanumericID.generateOrganizationID(
            keccak256("FLOW"), 1, msg.sender, block.timestamp
        );
        ids[2] = AlphanumericID.generateOrganizationID(
            keccak256("SIGNAL"), 1, msg.sender, block.timestamp
        );
        ids[3] = AlphanumericID.generateOrganizationID(
            keccak256("SENSE"), 1, msg.sender, block.timestamp
        );

        // Test with different indices
        ids[4] = AlphanumericID.generateOrganizationID(
            keccak256("CONTROL"), 2, msg.sender, block.timestamp
        );

        return ids;
    }

    /**
     * @dev Benchmark ID generation performance
     */
    function benchmarkGeneration(uint256 iterations) external view returns (uint256 gasUsed) {
        uint256 startGas = gasleft();

        for (uint256 i = 0; i < iterations; i++) {
            bytes32 hash = keccak256(abi.encodePacked("benchmark", i));
            AlphanumericID.generateID(hash);
        }

        gasUsed = startGas - gasleft();
        return gasUsed;
    }

    /**
     * @dev Test string conversion edge cases
     */
    function testStringConversions() external pure returns (bool) {
        // Test round-trip conversion
        string memory original = "ABCD1234";
        bytes8 converted = AlphanumericID.fromString(original);
        string memory backToString = AlphanumericID.toString(converted);

        return keccak256(abi.encodePacked(original)) == keccak256(abi.encodePacked(backToString));
    }
}
