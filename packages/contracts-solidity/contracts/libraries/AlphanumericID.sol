// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.20;

/**
 * @title AlphanumericID
 * @dev Library for generating 8-character alphanumeric IDs as bytes8 for efficiency
 * @author GameDAO AG
 */
library AlphanumericID {
    // Base36 character set: 0-9, A-Z (36 characters total)
    bytes constant BASE36_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    uint256 private constant BASE36_BASE = 36;
    uint256 private constant ID_LENGTH = 8;

    // Error for collision detection
    error IDCollisionDetected(bytes8 id);

    /**
     * @dev Generate an 8-character alphanumeric ID as bytes8 from a bytes32 hash
     * @param hash The input hash to convert
     * @return id The 8-character alphanumeric ID as bytes8
     */
    function generateID(bytes32 hash) internal pure returns (bytes8) {
        // Convert hash to uint256 for manipulation
        uint256 value = uint256(hash);

        // Create bytes array for the result
        bytes memory result = new bytes(ID_LENGTH);

        // Convert to base36, taking 8 characters
        for (uint256 i = 0; i < ID_LENGTH; i++) {
            result[ID_LENGTH - 1 - i] = BASE36_CHARS[value % BASE36_BASE];
            value /= BASE36_BASE;
        }

        // Convert to bytes8
        bytes8 id;
        assembly {
            id := mload(add(result, 32))
        }
        return id;
    }

    /**
     * @dev Generate an 8-character alphanumeric ID as string from a bytes32 hash (for display)
     * @param hash The input hash to convert
     * @return id The 8-character alphanumeric ID as string
     */
    function generateIDString(bytes32 hash) internal pure returns (string memory) {
        // Convert hash to uint256 for manipulation
        uint256 value = uint256(hash);

        // Create bytes array for the result
        bytes memory result = new bytes(ID_LENGTH);

        // Convert to base36, taking 8 characters
        for (uint256 i = 0; i < ID_LENGTH; i++) {
            result[ID_LENGTH - 1 - i] = BASE36_CHARS[value % BASE36_BASE];
            value /= BASE36_BASE;
        }

        return string(result);
    }

    /**
     * @dev Generate an organization ID with collision resistance
     * @param moduleId The module identifier
     * @param index Sequential counter for uniqueness
     * @param creator Address of the creator
     * @param timestamp Block timestamp
     * @return id The 8-character organization ID as bytes8
     */
    function generateOrganizationID(
        bytes32 moduleId,
        uint256 index,
        address creator,
        uint256 timestamp
    ) internal pure returns (bytes8) {
        // Create hash from input parameters
        bytes32 hash = keccak256(abi.encodePacked(
            moduleId,
            index,
            creator,
            timestamp,
            "ORG" // Salt for organization IDs
        ));

        return generateID(hash);
    }

    /**
     * @dev Generate a campaign ID
     * @param organizationId The parent organization ID
     * @param creator Address of the creator
     * @param title Campaign title
     * @param timestamp Block timestamp
     * @param counter Campaign counter
     * @return id The 8-character campaign ID as bytes8
     */
    function generateCampaignID(
        bytes8 organizationId,
        address creator,
        string memory title,
        uint256 timestamp,
        uint256 counter
    ) internal pure returns (bytes8) {
        bytes32 hash = keccak256(abi.encodePacked(
            organizationId,
            creator,
            title,
            timestamp,
            counter,
            "CAMP" // Salt for campaign IDs
        ));

        return generateID(hash);
    }

    /**
     * @dev Generate a proposal ID
     * @param organizationId The parent organization ID
     * @param proposer Address of the proposer
     * @param title Proposal title
     * @param timestamp Block timestamp
     * @param counter Proposal counter
     * @return id The 8-character proposal ID as bytes8
     */
    function generateProposalID(
        bytes8 organizationId,
        address proposer,
        string memory title,
        uint256 timestamp,
        uint256 counter
    ) internal pure returns (bytes8) {
        bytes32 hash = keccak256(abi.encodePacked(
            organizationId,
            proposer,
            title,
            timestamp,
            counter,
            "PROP" // Salt for proposal IDs
        ));

        return generateID(hash);
    }

    /**
     * @dev Generate a profile ID
     * @param owner Address of the profile owner
     * @param organizationId The organization ID
     * @param timestamp Block timestamp
     * @param counter Profile counter
     * @return id The 8-character profile ID as bytes8
     */
    function generateProfileID(
        address owner,
        bytes8 organizationId,
        uint256 timestamp,
        uint256 counter
    ) internal pure returns (bytes8) {
        bytes32 hash = keccak256(abi.encodePacked(
            owner,
            organizationId,
            timestamp,
            counter,
            "PROF" // Salt for profile IDs
        ));

        return generateID(hash);
    }

    /**
     * @dev Convert bytes8 ID to string for display purposes
     * @param id The bytes8 ID
     * @return str The string representation
     */
    function toString(bytes8 id) internal pure returns (string memory) {
        bytes memory result = new bytes(ID_LENGTH);
        for (uint256 i = 0; i < ID_LENGTH; i++) {
            result[i] = id[i];
        }
        return string(result);
    }

    /**
     * @dev Convert string ID to bytes8 for storage
     * @param id The string ID
     * @return result The bytes8 representation
     */
    function fromString(string memory id) internal pure returns (bytes8) {
        bytes memory idBytes = bytes(id);
        require(idBytes.length == ID_LENGTH, "Invalid ID length");

        bytes8 result;
        assembly {
            result := mload(add(idBytes, 32))
        }
        return result;
    }

    /**
     * @dev Validate that an ID contains only alphanumeric characters
     * @param id The bytes8 ID to validate
     * @return valid True if valid, false otherwise
     */
    function validateID(bytes8 id) internal pure returns (bool) {
        for (uint256 i = 0; i < ID_LENGTH; i++) {
            bytes1 char = id[i];

            // Check if character is 0-9 or A-Z
            if (!((char >= 0x30 && char <= 0x39) || (char >= 0x41 && char <= 0x5A))) {
                return false;
            }
        }

        return true;
    }
}
