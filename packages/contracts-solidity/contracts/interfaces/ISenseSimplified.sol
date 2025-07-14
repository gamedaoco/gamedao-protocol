// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.20;

/**
 * @title ISenseSimplified
 * @dev Interface for GameDAO Sense Module - Reputation, Experience & Trust System
 * @notice Provides reputation tracking, experience management, and trust scoring
 */
interface ISenseSimplified {
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
        string profileId;           // Profile ID that received the reputation change
        ReputationType repType;     // Type of reputation changed
        int256 delta;               // Change amount (positive or negative)
        bytes32 reason;             // Reason for the change
        address updatedBy;          // Address that made the change
        uint256 timestamp;          // When the change occurred
        uint256 blockNumber;        // Block number of the change
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
     * @dev Emitted when reputation is updated
     */
    event ReputationUpdated(
        string indexed profileId,
        ReputationType indexed repType,
        int256 delta,
        bytes32 reason,
        address indexed updatedBy,
        uint256 newValue,
        uint256 timestamp
    );

    /**
     * @dev Emitted when interaction affects trust score
     */
    event InteractionRecorded(
        string indexed profileId,
        bool positive,
        address indexed interactor,
        bytes32 reason,
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
        string memory profileId,
        ReputationType repType,
        int256 delta,
        bytes32 reason
    ) external;

    /**
     * @dev Get reputation data for a profile
     * @param profileId Profile ID to query
     * @return reputation Reputation data
     */
    function getReputation(string memory profileId)
        external
        view
        returns (ReputationData memory reputation);

    /**
     * @dev Get reputation history for a profile
     * @param profileId Profile ID to query
     * @return events Array of reputation events
     */
    function getReputationHistory(string memory profileId)
        external
        view
        returns (ReputationEvent[] memory events);

    // =============================================================
    // EXPERIENCE MANAGEMENT
    // =============================================================

    /**
     * @dev Award experience points to a profile
     * @param profileId Profile ID to award XP to
     * @param amount Experience points to award
     * @param reason Reason for awarding XP
     */
    function awardExperience(string memory profileId, uint256 amount, bytes32 reason) external;

    /**
     * @dev Get experience points for a profile
     * @param profileId Profile ID to query
     * @return experience Current experience points
     */
    function getExperience(string memory profileId) external view returns (uint256 experience);

    // =============================================================
    // TRUST MANAGEMENT
    // =============================================================

    /**
     * @dev Record a positive or negative interaction
     * @param profileId Profile ID to record interaction for
     * @param positive Whether the interaction was positive
     * @param reason Reason for the interaction
     */
    function recordInteraction(string memory profileId, bool positive, bytes32 reason) external;

    /**
     * @dev Get trust score for a profile
     * @param profileId Profile ID to query
     * @return trustScore Current trust score (0-10000 scale)
     */
    function getTrustScore(string memory profileId) external view returns (uint256 trustScore);

    // =============================================================
    // UTILITY FUNCTIONS
    // =============================================================

    /**
     * @dev Calculate voting weight based on reputation
     * @param profileId Profile ID to calculate weight for
     * @param baseWeight Base voting weight
     * @return weight Calculated voting weight
     */
    function calculateVotingWeight(string memory profileId, uint256 baseWeight)
        external
        view
        returns (uint256 weight);

    /**
     * @dev Calculate comprehensive trust score for campaign validation
     * @param profileId Profile ID to calculate trust for
     * @return trustScore Comprehensive trust score (0-10000 scale)
     */
    function calculateTrustScore(string memory profileId)
        external
        view
        returns (uint256 trustScore);

    /**
     * @dev Get reputation summary for multiple profiles
     * @param profileIds Array of profile IDs to query
     * @return reputations Array of reputation data
     */
    function getReputationBatch(string[] memory profileIds)
        external
        view
        returns (ReputationData[] memory reputations);
}
