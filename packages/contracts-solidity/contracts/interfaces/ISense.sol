// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.20;

/**
 * @title ISense
 * @dev Interface for GameDAO Sense Module - Identity & Reputation System
 * @notice Provides comprehensive user identity management, reputation tracking, and social proof mechanisms
 */
interface ISense {
    // =============================================================
    // STRUCTS
    // =============================================================

    /**
     * @dev User profile structure
     */
    struct Profile {
        bytes32 profileId;
        address owner;
        bytes8 organizationId;
        string metadata; // IPFS hash for extended profile data
        uint256 createdAt;
        uint256 updatedAt;
        bool active;
        bool verified;
    }

    /**
     * @dev Reputation data structure
     */
    struct ReputationData {
        uint256 experience; // XP - cumulative experience points
        uint256 reputation; // REP - weighted reputation score
        uint256 trust; // TRUST - trust score from peer feedback
        uint256 lastUpdated;
        uint256 totalFeedbacks;
        uint256 positiveFeedbacks;
    }

    /**
     * @dev Achievement structure
     */
    struct Achievement {
        bytes32 achievementId;
        bytes32 profileId;
        string name;
        string description;
        string category;
        bytes data; // Achievement-specific data
        uint256 earnedAt;
        address grantedBy;
        uint256 points; // XP value of the achievement
    }

    /**
     * @dev Reputation event for history tracking
     */
    struct ReputationEvent {
        bytes32 profileId;
        ReputationType repType;
        int256 delta;
        bytes32 reason;
        address updatedBy;
        uint256 timestamp;
        uint256 blockNumber;
    }

    /**
     * @dev Feedback structure
     */
    struct Feedback {
        bytes32 feedbackId;
        bytes32 targetProfileId;
        address giver;
        FeedbackType feedbackType;
        uint8 rating; // 1-5 scale
        string comment;
        uint256 timestamp;
        bool verified;
    }

    /**
     * @dev Feedback summary for a profile
     */
    struct FeedbackSummary {
        uint256 totalFeedbacks;
        uint256 positiveFeedbacks;
        uint256 negativeFeedbacks;
        uint256 neutralFeedbacks;
        uint256 averageRating; // Scaled by 100 (e.g., 450 = 4.50)
        uint256 trustScore; // Calculated trust score
    }

    /**
     * @dev Name claim structure for 8-byte name management
     */
    struct NameClaim {
        bytes8 name;
        address owner;
        uint256 stakeAmount;
        uint256 stakeDuration;
        uint256 claimedAt;
        uint256 expiresAt;
        bool isActive;
        NameType nameType;
    }

    /**
     * @dev Reputation export structure for cross-DAO portability
     */
    struct ReputationExport {
        bytes32 sourceProfileId;
        address owner;
        bytes8 sourceOrganizationId;
        ReputationData reputation;
        Achievement[] achievements;
        FeedbackSummary feedbackSummary;
        uint256 exportedAt;
        bytes32 merkleRoot; // For verification
    }

    /**
     * @dev Category-specific reputation scores
     */
    struct CategoryReputation {
        bytes32 category;
        uint256 score;
        uint256 lastUpdated;
        uint256 eventCount;
    }

    // =============================================================
    // ENUMS
    // =============================================================

    /**
     * @dev Types of reputation updates
     */
    enum ReputationType {
        EXPERIENCE,
        REPUTATION,
        TRUST,
        CATEGORY_SPECIFIC
    }

    /**
     * @dev Types of feedback
     */
    enum FeedbackType {
        POSITIVE,
        NEGATIVE,
        NEUTRAL,
        DETAILED_RATING
    }

    /**
     * @dev Profile verification status
     */
    enum VerificationLevel {
        NONE,
        BASIC,
        ENHANCED,
        PREMIUM
    }

    /**
     * @dev Name type for 8-byte name claiming
     */
    enum NameType {
        PERSONAL,
        ORGANIZATION
    }

    // =============================================================
    // EVENTS
    // =============================================================

    /**
     * @dev Emitted when a new profile is created
     */
    event ProfileCreated(
        bytes32 indexed profileId,
        address indexed owner,
        bytes8 indexed organizationId,
        string metadata,
        uint256 timestamp
    );

    /**
     * @dev Emitted when a profile is updated
     */
    event ProfileUpdated(
        bytes32 indexed profileId,
        string metadata,
        uint256 timestamp
    );

    /**
     * @dev Emitted when reputation is updated
     */
    event ReputationUpdated(
        bytes32 indexed profileId,
        ReputationType indexed repType,
        int256 delta,
        bytes32 indexed reason,
        address updatedBy,
        uint256 newValue,
        uint256 timestamp
    );

    /**
     * @dev Emitted when an achievement is granted
     */
    event AchievementGranted(
        bytes32 indexed profileId,
        bytes32 indexed achievementId,
        string name,
        uint256 points,
        address grantedBy,
        uint256 timestamp
    );

    /**
     * @dev Emitted when feedback is submitted
     */
    event FeedbackSubmitted(
        bytes32 indexed feedbackId,
        bytes32 indexed targetProfileId,
        address indexed giver,
        FeedbackType feedbackType,
        uint8 rating,
        uint256 timestamp
    );

    /**
     * @dev Emitted when a profile is verified
     */
    event ProfileVerified(
        bytes32 indexed profileId,
        VerificationLevel level,
        address verifier,
        uint256 timestamp
    );

    /**
     * @dev Emitted when reputation is exported
     */
    event ReputationExported(
        bytes32 indexed profileId,
        bytes8 indexed targetOrganizationId,
        bytes32 merkleRoot,
        uint256 timestamp
    );

    /**
     * @dev Emitted when reputation is imported
     */
    event ReputationImported(
        bytes32 indexed profileId,
        bytes8 indexed sourceOrganizationId,
        uint256 importedReputation,
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

    /**
     * @dev Emitted when a name expires
     */
    event NameExpired(
        bytes8 indexed name,
        address indexed owner,
        uint256 timestamp
    );

    // =============================================================
    // ERRORS
    // =============================================================

    error ProfileNotFound(bytes32 profileId);
    error ProfileAlreadyExists(address owner, bytes8 organizationId);
    error UnauthorizedProfileAccess(bytes32 profileId, address caller);
    error InvalidReputationDelta(int256 delta);
    error AchievementNotFound(bytes32 achievementId);
    error AchievementAlreadyGranted(bytes32 profileId, bytes32 achievementId);
    error InvalidFeedbackRating(uint8 rating);
    error SelfFeedbackNotAllowed(address giver, bytes32 targetProfileId);
    error InvalidVerificationLevel(VerificationLevel level);
    error ReputationExportFailed(bytes32 profileId);
    error InvalidImportProof(bytes32 profileId);
    error OrganizationNotFound(bytes8 organizationId);
    error InsufficientPermissions(address caller, string action);

    // Name claiming errors
    error NameAlreadyClaimed(bytes8 name);
    error NameNotClaimed(bytes8 name);
    error InvalidNameFormat(bytes8 name);
    error InvalidStakeAmount(uint256 amount);
    error InvalidStakeDuration(uint256 duration);
    error NameNotExpired(bytes8 name);
    error UnauthorizedNameAccess(bytes8 name, address caller);
    error InsufficientTokenBalance(address token, uint256 required, uint256 available);

    // =============================================================
    // PROFILE MANAGEMENT
    // =============================================================

    /**
     * @dev Create a new user profile
     * @param organizationId The organization ID to associate with
     * @param metadata IPFS hash for extended profile data
     * @return profileId The unique identifier for the created profile
     */
    function createProfile(bytes8 organizationId, string memory metadata)
        external
        returns (bytes32 profileId);

    /**
     * @dev Update an existing profile
     * @param profileId The profile to update
     * @param metadata New IPFS hash for profile data
     */
    function updateProfile(bytes32 profileId, string memory metadata) external;

    /**
     * @dev Get profile information
     * @param profileId The profile to retrieve
     * @return profile The profile data
     */
    function getProfile(bytes32 profileId) external view returns (Profile memory profile);

    /**
     * @dev Get profile by owner and organization
     * @param owner The profile owner address
     * @param organizationId The organization ID
     * @return profile The profile data
     */
    function getProfileByOwner(address owner, bytes8 organizationId)
        external
        view
        returns (Profile memory profile);

    /**
     * @dev Check if a profile exists
     * @param profileId The profile to check
     * @return exists True if the profile exists
     */
    function profileExists(bytes32 profileId) external view returns (bool exists);

    /**
     * @dev Verify a profile
     * @param profileId The profile to verify
     * @param level The verification level to grant
     */
    function verifyProfile(bytes32 profileId, VerificationLevel level) external;

    // =============================================================
    // NAME CLAIMING SYSTEM
    // =============================================================

    /**
     * @dev Claim an 8-byte name with GAME token staking
     * @param name The 8-byte name to claim
     * @param stakeAmount Amount of GAME tokens to stake
     * @param stakeDuration Duration to stake tokens (in seconds)
     * @param nameType Type of name (personal or organization)
     * @return success True if claim was successful
     */
    function claimName(
        bytes8 name,
        uint256 stakeAmount,
        uint256 stakeDuration,
        NameType nameType
    ) external returns (bool success);

    /**
     * @dev Release a claimed name and recover staked tokens
     * @param name The name to release
     * @return stakeAmount Amount of tokens recovered
     */
    function releaseName(bytes8 name) external returns (uint256 stakeAmount);

    /**
     * @dev Check if a name is available for claiming
     * @param name The name to check
     * @return available True if name is available
     */
    function isNameAvailable(bytes8 name) external view returns (bool available);

    /**
     * @dev Get name claim details
     * @param name The name to query
     * @return claim The name claim details
     */
    function getNameClaim(bytes8 name) external view returns (NameClaim memory claim);

    /**
     * @dev Get names owned by an address
     * @param owner The owner address
     * @return names Array of owned names
     */
    function getNamesOwnedBy(address owner) external view returns (bytes8[] memory names);

    /**
     * @dev Validate name format (8 characters, alphanumeric)
     * @param name The name to validate
     * @return valid True if name format is valid
     */
    function validateNameFormat(bytes8 name) external pure returns (bool valid);

    // =============================================================
    // REPUTATION SYSTEM
    // =============================================================

    /**
     * @dev Update reputation for a profile
     * @param profileId The profile to update
     * @param repType The type of reputation to update
     * @param delta The change in reputation (can be negative)
     * @param reason The reason for the update
     */
    function updateReputation(
        bytes32 profileId,
        ReputationType repType,
        int256 delta,
        bytes32 reason
    ) external;

    /**
     * @dev Get reputation data for a profile
     * @param profileId The profile to query
     * @return reputation The reputation data
     */
    function getReputation(bytes32 profileId)
        external
        view
        returns (ReputationData memory reputation);

    /**
     * @dev Get reputation history for a profile
     * @param profileId The profile to query
     * @return events Array of reputation events
     */
    function getReputationHistory(bytes32 profileId)
        external
        view
        returns (ReputationEvent[] memory events);

    /**
     * @dev Get category-specific reputation scores
     * @param profileId The profile to query
     * @param category The category to check
     * @return score The category reputation score
     */
    function getCategoryReputation(bytes32 profileId, bytes32 category)
        external
        view
        returns (uint256 score);

    /**
     * @dev Update category-specific reputation
     * @param profileId The profile to update
     * @param category The category to update
     * @param delta The change in reputation
     * @param reason The reason for the update
     */
    function updateCategoryReputation(
        bytes32 profileId,
        bytes32 category,
        int256 delta,
        bytes32 reason
    ) external;

    // =============================================================
    // ACHIEVEMENT SYSTEM
    // =============================================================

    /**
     * @dev Achievement parameters for granting
     */
    struct AchievementParams {
        bytes32 achievementId;
        string name;
        string description;
        string category;
        uint256 points;
        bytes data;
    }

    /**
     * @dev Grant an achievement to a profile with struct parameters (new simplified API)
     * @param granter The address granting the achievement
     * @param profileId The profile to grant achievement to
     * @param params The achievement parameters
     */
    function grantAchievementWithParams(
        address granter,
        bytes32 profileId,
        AchievementParams memory params
    ) external;

    /**
     * @dev Grant an achievement to a profile (legacy function - maintained for backward compatibility)
     * @param profileId The profile to grant achievement to
     * @param achievementId The achievement identifier
     * @param name The achievement name
     * @param description The achievement description
     * @param category The achievement category
     * @param points The XP points awarded
     * @param data Additional achievement data
     */
    function grantAchievement(
        bytes32 profileId,
        bytes32 achievementId,
        string memory name,
        string memory description,
        string memory category,
        uint256 points,
        bytes memory data
    ) external;

    /**
     * @dev Get all achievements for a profile
     * @param profileId The profile to query
     * @return achievements Array of achievements
     */
    function getAchievements(bytes32 profileId)
        external
        view
        returns (Achievement[] memory achievements);

    /**
     * @dev Get achievements by category
     * @param profileId The profile to query
     * @param category The category to filter by
     * @return achievements Array of achievements in the category
     */
    function getAchievementsByCategory(bytes32 profileId, string memory category)
        external
        view
        returns (Achievement[] memory achievements);

    /**
     * @dev Check if a profile has a specific achievement
     * @param profileId The profile to check
     * @param achievementId The achievement to check for
     * @return hasAchievement True if the profile has the achievement
     */
    function hasAchievement(bytes32 profileId, bytes32 achievementId)
        external
        view
        returns (bool hasAchievement);

    // =============================================================
    // SOCIAL FEATURES
    // =============================================================

    /**
     * @dev Submit feedback for a profile
     * @param targetProfileId The profile to give feedback to
     * @param feedbackType The type of feedback
     * @param rating The rating (1-5 scale)
     * @param comment The feedback comment
     * @return feedbackId The unique identifier for the feedback
     */
    function submitFeedback(
        bytes32 targetProfileId,
        FeedbackType feedbackType,
        uint8 rating,
        string memory comment
    ) external returns (bytes32 feedbackId);

    /**
     * @dev Get feedback summary for a profile
     * @param profileId The profile to query
     * @return summary The feedback summary
     */
    function getFeedbackSummary(bytes32 profileId)
        external
        view
        returns (FeedbackSummary memory summary);

    /**
     * @dev Get individual feedback entries for a profile
     * @param profileId The profile to query
     * @param offset The starting index
     * @param limit The maximum number of entries to return
     * @return feedbacks Array of feedback entries
     */
    function getFeedbacks(bytes32 profileId, uint256 offset, uint256 limit)
        external
        view
        returns (Feedback[] memory feedbacks);

    // =============================================================
    // CROSS-DAO FEATURES
    // =============================================================

    /**
     * @dev Export reputation data for cross-DAO portability
     * @param profileId The profile to export
     * @return exportData The reputation export data
     */
    function exportReputation(bytes32 profileId)
        external
        view
        returns (ReputationExport memory exportData);

    /**
     * @dev Import reputation from another DAO
     * @param profileId The profile to import to
     * @param exportData The reputation data to import
     * @param proof Merkle proof for verification
     */
    function importReputation(
        bytes32 profileId,
        ReputationExport memory exportData,
        bytes memory proof
    ) external;

    // =============================================================
    // VIEW FUNCTIONS
    // =============================================================

    /**
     * @dev Get profiles by organization
     * @param organizationId The organization to query
     * @return profileIds Array of profile IDs
     */
    function getProfilesByOrganization(bytes8 organizationId)
        external
        view
        returns (bytes32[] memory profileIds);

    /**
     * @dev Get total number of profiles
     * @return count The total profile count
     */
    function getProfileCount() external view returns (uint256 count);

    /**
     * @dev Get top profiles by reputation
     * @param organizationId The organization to query (or zero for global)
     * @param limit The maximum number of profiles to return
     * @return profileIds Array of profile IDs sorted by reputation
     */
    function getTopProfiles(bytes8 organizationId, uint256 limit)
        external
        view
        returns (bytes32[] memory profileIds);

    /**
     * @dev Calculate voting weight based on reputation
     * @param profileId The profile to calculate for
     * @param baseWeight The base voting weight
     * @return weight The reputation-adjusted voting weight
     */
    function calculateVotingWeight(bytes32 profileId, uint256 baseWeight)
        external
        view
        returns (uint256 weight);

    /**
     * @dev Calculate trust score for campaign validation
     * @param profileId The profile to calculate for
     * @return trustScore The calculated trust score (0-10000 scale)
     */
    function calculateTrustScore(bytes32 profileId)
        external
        view
        returns (uint256 trustScore);
}
