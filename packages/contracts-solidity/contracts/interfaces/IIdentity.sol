// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.20;

/**
 * @title IIdentity
 * @dev Interface for GameDAO Identity Module - User Identity & Profile Management
 * @notice Provides user identity management, profile creation, name claiming, and verification
 */
interface IIdentity {
    // =============================================================
    // STRUCTS
    // =============================================================

    /**
     * @dev User profile structure
     */
    struct Profile {
        bytes8 profileId;           // 8-byte alphanumeric profile ID (e.g., "ALICE123")
        address owner;              // Profile owner address
        bytes8 organizationId;      // Organization the profile belongs to
        string metadata;            // IPFS hash for extended profile data
        uint256 createdAt;          // Creation timestamp
        uint256 updatedAt;          // Last update timestamp
        bool active;                // Profile active status
        bool verified;              // Profile verification status
    }

    /**
     * @dev Name claim structure for 8-byte names
     */
    struct NameClaim {
        bytes8 name;                // 8-byte name (e.g., "ALICE123")
        address owner;              // Name owner
        uint256 stakeAmount;        // GAME tokens staked
        uint256 stakeDuration;      // Stake duration in seconds
        uint256 claimedAt;          // Claim timestamp
        uint256 expiresAt;          // Expiration timestamp
        bool isActive;              // Claim active status
        NameType nameType;          // Type of name claimed
    }

    /**
     * @dev Name type enumeration
     */
    enum NameType {
        USER,           // User name
        ORGANIZATION,   // Organization name
        PROJECT,        // Project name
        RESERVED        // Reserved name
    }

    /**
     * @dev Verification level enumeration
     */
    enum VerificationLevel {
        NONE,           // No verification
        BASIC,          // Basic verification (email, etc.)
        ENHANCED,       // Enhanced verification (KYC-lite)
        PREMIUM         // Premium verification (full KYC)
    }

    // =============================================================
    // EVENTS
    // =============================================================

    /**
     * @dev Emitted when a profile is created
     */
    event ProfileCreated(
        bytes8 indexed profileId,
        address indexed owner,
        bytes8 indexed organizationId,
        string metadata,
        uint256 timestamp
    );

    /**
     * @dev Emitted when a profile is updated
     */
    event ProfileUpdated(
        bytes8 indexed profileId,
        string metadata,
        uint256 timestamp
    );

    /**
     * @dev Emitted when a profile is verified
     */
    event ProfileVerified(
        bytes8 indexed profileId,
        VerificationLevel level,
        address indexed verifier,
        uint256 timestamp
    );

    /**
     * @dev Emitted when a name is claimed
     */
    event NameClaimed(
        bytes8 indexed name,
        address indexed owner,
        uint256 stakeAmount,
        uint256 stakeDuration,
        NameType nameType,
        uint256 timestamp
    );

    /**
     * @dev Emitted when a name is released
     */
    event NameReleased(
        bytes8 indexed name,
        address indexed owner,
        uint256 stakeAmount,
        uint256 timestamp
    );

    // =============================================================
    // ERRORS
    // =============================================================

    error ProfileNotFound(bytes8 profileId);
    error ProfileAlreadyExists(address owner, bytes8 organizationId);
    error UnauthorizedProfileAccess(bytes8 profileId, address caller);
    error OrganizationNotFound(bytes8 organizationId);
    error InvalidNameFormat(bytes8 name);
    error NameAlreadyClaimed(bytes8 name);
    error NameNotClaimed(bytes8 name);
    error NameNotExpired(bytes8 name);
    error UnauthorizedNameAccess(bytes8 name, address caller);
    error InvalidStakeAmount(uint256 amount);
    error InvalidStakeDuration(uint256 duration);
    error InsufficientTokenBalance(address token, uint256 required, uint256 available);

    // =============================================================
    // PROFILE MANAGEMENT
    // =============================================================

    /**
     * @dev Create a new user profile
     */
    function createProfile(bytes8 organizationId, string memory metadata)
        external
        returns (bytes8 profileId);

    /**
     * @dev Update an existing profile
     */
    function updateProfile(bytes8 profileId, string memory metadata) external;

    /**
     * @dev Get profile information
     */
    function getProfile(bytes8 profileId) external view returns (Profile memory profile);

    /**
     * @dev Get profile by owner and organization
     */
    function getProfileByOwner(address owner, bytes8 organizationId)
        external
        view
        returns (Profile memory profile);

    /**
     * @dev Check if a profile exists
     */
    function profileExists(bytes8 profileId) external view returns (bool exists);

    /**
     * @dev Get profiles by organization
     */
    function getProfilesByOrganization(bytes8 organizationId)
        external
        view
        returns (bytes8[] memory profileIds);

    /**
     * @dev Get total number of profiles
     */
    function getProfileCount() external view returns (uint256 count);

    // =============================================================
    // VERIFICATION SYSTEM
    // =============================================================

    /**
     * @dev Verify a profile
     */
    function verifyProfile(bytes8 profileId, VerificationLevel level) external;

    /**
     * @dev Get verification level for a profile
     */
    function getVerificationLevel(bytes8 profileId) external view returns (VerificationLevel level);

    // =============================================================
    // NAME CLAIMING SYSTEM
    // =============================================================

    /**
     * @dev Claim an 8-byte name with GAME token staking
     * @param name 8-byte name to claim
     * @param stakeAmount GAME tokens to stake
     * @param stakeDuration Stake duration in seconds
     * @param nameType Type of name being claimed
     * @return success True if claim successful
     */
    function claimName(
        bytes8 name,
        uint256 stakeAmount,
        uint256 stakeDuration,
        NameType nameType
    ) external returns (bool success);

    /**
     * @dev Release a claimed name and recover staked tokens
     * @param name 8-byte name to release
     * @return stakeAmount Amount of tokens recovered
     */
    function releaseName(bytes8 name) external returns (uint256 stakeAmount);

    /**
     * @dev Check if a name is available for claiming
     * @param name 8-byte name to check
     * @return available True if name is available
     */
    function isNameAvailable(bytes8 name) external view returns (bool available);

    /**
     * @dev Get name claim details
     * @param name 8-byte name to query
     * @return claim Name claim data
     */
    function getNameClaim(bytes8 name) external view returns (NameClaim memory claim);

    /**
     * @dev Get names owned by an address
     * @param owner Address to query
     * @return names Array of owned names
     */
    function getNamesOwnedBy(address owner) external view returns (bytes8[] memory names);

    /**
     * @dev Validate name format (8 characters, alphanumeric)
     * @param name 8-byte name to validate
     * @return valid True if name format is valid
     */
    function validateNameFormat(bytes8 name) external pure returns (bool valid);
}
