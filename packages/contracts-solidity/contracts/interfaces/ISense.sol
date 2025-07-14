// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.20;

/**
 * @title ISense
 * @dev Interface for GameDAO Sense Module - Reputation, Experience & Trust System
 * @notice Provides reputation tracking, experience management, and trust scoring
 */
interface ISense {
    // =============================================================
    // STRUCTS
    // =============================================================

    /**
     * @dev Reputation data structure
     */
    struct ReputationData {
        uint256 experience;         // XP - cumulative experience points
        uint256 reputation;         // REP - weighted reputation score (scaled by 1000)
        uint256 trust;              // TRUST - trust score from interactions
        uint256 lastUpdated;        // Last update timestamp
        uint256 totalInteractions;  // Total number of interactions
        uint256 positiveInteractions; // Number of positive interactions
    }

    /**
     * @dev Reputation event structure for history tracking
     */
    struct ReputationEvent {
        bytes8 profileId;           // Profile ID that received the reputation change
        ReputationType repType;     // Type of reputation changed
        int256 delta;               // Change amount (positive or negative)
        bytes32 reason;             // Reason for the change
        address updatedBy;          // Address that made the change
        uint256 timestamp;          // When the change occurred
    }

    /**
     * @dev Reputation type enumeration
     */
    enum ReputationType {
        EXPERIENCE,     // Experience points (XP)
        REPUTATION,     // General reputation score
        TRUST          // Trust score from interactions
    }

    // =============================================================
    // EVENTS
    // =============================================================

    /**
     * @dev Emitted when experience is awarded to a profile
     */
    event ExperienceAwarded(
        bytes8 indexed profileId,
        uint256 amount,
        bytes32 reason,
        address indexed awardedBy,
        uint256 timestamp
    );

    /**
     * @dev Emitted when reputation is updated
     */
    event ReputationUpdated(
        bytes8 indexed profileId,
        ReputationType indexed repType,
        int256 delta,
        bytes32 reason,
        address indexed updatedBy,
        uint256 timestamp
    );

    /**
     * @dev Emitted when an interaction is recorded
     */
    event InteractionRecorded(
        bytes8 indexed profileId,
        bool positive,
        bytes32 reason,
        address indexed recordedBy,
        uint256 timestamp
    );

    // =============================================================
    // ERRORS
    // =============================================================

    error ProfileNotFound(string profileId);
    error InvalidReputationDelta(int256 delta);
    error UnauthorizedReputationUpdate(address caller);

    // =============================================================
    // REPUTATION MANAGEMENT
    // =============================================================

    /**
     * @dev Update reputation for a profile
     * @param profileId Profile ID to update
     * @param repType Type of reputation to update
     * @param delta Change amount (positive or negative)
     * @param reason Reason for the change
     */
    function updateReputation(
        bytes8 profileId,
        ReputationType repType,
        int256 delta,
        bytes32 reason
    ) external;

    /**
     * @dev Get reputation data for a profile
     */
    function getReputation(bytes8 profileId)
        external
        view
        returns (ReputationData memory reputation);

    /**
     * @dev Get reputation history for a profile
     */
    function getReputationHistory(bytes8 profileId)
        external
        view
        returns (ReputationEvent[] memory events);

    // =============================================================
    // EXPERIENCE MANAGEMENT
    // =============================================================

    /**
     * @dev Award experience points to a profile
     */
    function awardExperience(bytes8 profileId, uint256 amount, bytes32 reason) external;

    /**
     * @dev Get experience points for a profile
     */
    function getExperience(bytes8 profileId) external view returns (uint256 experience);

    // =============================================================
    // TRUST MANAGEMENT
    // =============================================================

    /**
     * @dev Record an interaction (positive or negative)
     */
    function recordInteraction(bytes8 profileId, bool positive, bytes32 reason) external;

    /**
     * @dev Get trust score for a profile
     */
    function getTrustScore(bytes8 profileId) external view returns (uint256 trustScore);

    // =============================================================
    // UTILITY FUNCTIONS
    // =============================================================

    /**
     * @dev Calculate voting weight based on reputation
     */
    function calculateVotingWeight(bytes8 profileId, uint256 baseWeight)
        external
        view
        returns (uint256 votingWeight);

    /**
     * @dev Calculate trust score based on interactions
     */
    function calculateTrustScore(bytes8 profileId)
        external
        view
        returns (uint256 trustScore);

    /**
     * @dev Get reputation data for multiple profiles (batch operation)
     */
    function getReputationBatch(bytes8[] memory profileIds)
        external
        view
        returns (ReputationData[] memory reputations);
}
