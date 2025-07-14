// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.20;

import "../../core/GameDAOModule.sol";
import "../../interfaces/ISense.sol";
import "../../interfaces/IIdentity.sol";

/**
 * @title Sense
 * @dev GameDAO Sense Module - Reputation, Experience & Trust System
 * @notice Provides reputation tracking, experience management, and trust scoring
 */
contract Sense is ISense, GameDAOModule {
    // =============================================================
    // CONSTANTS
    // =============================================================

    bytes32 public constant SENSE_ADMIN_ROLE = keccak256("SENSE_ADMIN_ROLE");
    bytes32 public constant REPUTATION_MANAGER_ROLE = keccak256("REPUTATION_MANAGER_ROLE");

    uint256 public constant TRUST_SCORE_SCALE = 10000; // 0-10000 scale
    uint256 public constant REPUTATION_SCALE = 1000; // 1000 = 1.0x multiplier
    uint256 public constant MAX_REPUTATION_DELTA = 10000;

    // =============================================================
    // STATE VARIABLES
    // =============================================================

    // Reputation storage - using bytes8 profile IDs
    mapping(bytes8 => ReputationData) private _reputations;
    mapping(bytes8 => ReputationEvent[]) private _reputationHistory;
    mapping(bytes8 => uint256) private _lastReputationUpdate;

    // Experience tracking
    mapping(bytes8 => uint256) private _experiencePoints;
    mapping(bytes8 => uint256) private _experienceHistory;

    // Trust and interaction tracking
    mapping(bytes8 => uint256) private _trustScores;
    mapping(bytes8 => uint256) private _totalInteractions;
    mapping(bytes8 => uint256) private _positiveInteractions;

    // Voting weight cache
    mapping(bytes8 => uint256) private _votingWeights;
    mapping(bytes8 => uint256) private _votingWeightUpdates;

    // =============================================================
    // CONSTRUCTOR
    // =============================================================

    /**
     * @dev Constructor
     */
    constructor() GameDAOModule("1.0.0") {
        // Grant roles to deployer initially
        _grantRole(SENSE_ADMIN_ROLE, _msgSender());
        _grantRole(REPUTATION_MANAGER_ROLE, _msgSender());
    }

    /**
     * @dev Returns the unique identifier for this module
     */
    function moduleId() external pure override returns (bytes32) {
        return keccak256("SENSE");
    }

    /**
     * @dev Internal initialization hook
     */
    function _onInitialize() internal override {
        // Grant admin roles to the registry
        address registryAddr = this.registry();
        _grantRole(SENSE_ADMIN_ROLE, registryAddr);
        _grantRole(REPUTATION_MANAGER_ROLE, registryAddr);
    }

    // =============================================================
    // REPUTATION MANAGEMENT
    // =============================================================

    /**
     * @dev Update reputation for a profile
     */
    function updateReputation(
        bytes8 profileId,
        ReputationType repType,
        int256 delta,
        bytes32 reason
    ) external override onlyRole(REPUTATION_MANAGER_ROLE) {
        _validateProfile(profileId);

        ReputationData storage reputation = _reputations[profileId];

        if (repType == ReputationType.EXPERIENCE) {
            // Experience can only be positive
            require(delta >= 0, "Experience delta must be positive");
            reputation.experience = reputation.experience + uint256(delta);
        } else if (repType == ReputationType.REPUTATION) {
            // Reputation can be positive or negative, but has bounds
            if (delta > 0) {
                reputation.reputation = reputation.reputation + uint256(delta);
                if (reputation.reputation > 10000) reputation.reputation = 10000; // Cap at 10.0x
            } else {
                uint256 absDelta = uint256(-delta);
                if (reputation.reputation > absDelta) {
                    reputation.reputation = reputation.reputation - absDelta;
                } else {
                    reputation.reputation = 0; // Floor at 0
                }
            }
        } else if (repType == ReputationType.TRUST) {
            // Trust can be positive or negative
            if (delta > 0) {
                reputation.trust = reputation.trust + uint256(delta);
            } else {
                uint256 absDelta = uint256(-delta);
                if (reputation.trust > absDelta) {
                    reputation.trust = reputation.trust - absDelta;
                } else {
                    reputation.trust = 0;
                }
            }
        }

        reputation.lastUpdated = block.timestamp;

        // Record the event
        _reputationHistory[profileId].push(ReputationEvent({
            profileId: profileId,
            repType: repType,
            delta: delta,
            reason: reason,
            updatedBy: _msgSender(),
            timestamp: block.timestamp
        }));

        emit ReputationUpdated(profileId, repType, delta, reason, _msgSender(), block.timestamp);
    }

    /**
     * @dev Get reputation data for a profile
     */
    function getReputation(bytes8 profileId)
        external
        view
        override
        returns (ReputationData memory reputation)
    {
        return _reputations[profileId];
    }

    /**
     * @dev Get reputation history for a profile
     */
    function getReputationHistory(bytes8 profileId)
        external
        view
        override
        returns (ReputationEvent[] memory events)
    {
        return _reputationHistory[profileId];
    }

    // =============================================================
    // EXPERIENCE SYSTEM
    // =============================================================

    /**
     * @dev Award experience points to a profile
     */
    function awardExperience(bytes8 profileId, uint256 amount, bytes32 reason) external override {
        require(hasRole(REPUTATION_MANAGER_ROLE, _msgSender()), "Not authorized");
        _validateProfile(profileId);

        ReputationData storage reputation = _reputations[profileId];
        reputation.experience += amount;
        reputation.lastUpdated = block.timestamp;

        // Record in history
        _reputationHistory[profileId].push(ReputationEvent({
            profileId: profileId,
            repType: ReputationType.EXPERIENCE,
            delta: int256(amount),
            reason: reason,
            updatedBy: _msgSender(),
            timestamp: block.timestamp
        }));

        emit ExperienceAwarded(profileId, amount, reason, _msgSender(), block.timestamp);
    }

    /**
     * @dev Get experience points for a profile
     */
    function getExperience(bytes8 profileId) external view override returns (uint256 experience) {
        return _reputations[profileId].experience;
    }

    // =============================================================
    // TRUST SYSTEM
    // =============================================================

    /**
     * @dev Record an interaction (positive or negative)
     */
    function recordInteraction(bytes8 profileId, bool positive, bytes32 reason) external override {
        require(hasRole(REPUTATION_MANAGER_ROLE, _msgSender()), "Not authorized");
        _validateProfile(profileId);

        ReputationData storage reputation = _reputations[profileId];
        reputation.totalInteractions++;

        if (positive) {
            reputation.positiveInteractions++;
            reputation.trust += 10; // Small positive trust boost
        } else {
            // Negative interaction reduces trust
            if (reputation.trust >= 5) {
                reputation.trust -= 5;
            } else {
                reputation.trust = 0;
            }
        }

        reputation.lastUpdated = block.timestamp;

        emit InteractionRecorded(profileId, positive, reason, _msgSender(), block.timestamp);
    }

    /**
     * @dev Get trust score for a profile
     */
    function getTrustScore(bytes8 profileId) external view override returns (uint256 trustScore) {
        return _reputations[profileId].trust;
    }

    // =============================================================
    // VOTING WEIGHT CALCULATION
    // =============================================================

    /**
     * @dev Calculate voting weight based on reputation
     */
    function calculateVotingWeight(bytes8 profileId, uint256 baseWeight)
        external
        view
        override
        returns (uint256 votingWeight)
    {
        ReputationData memory reputation = _reputations[profileId];

        // Base weight multiplied by reputation multiplier (scaled by 1000)
        // reputation of 1000 = 1.0x, 1500 = 1.5x, etc.
        return (baseWeight * reputation.reputation) / 1000;
    }

    /**
     * @dev Calculate trust score based on interactions
     */
    function calculateTrustScore(bytes8 profileId)
        external
        view
        override
        returns (uint256 trustScore)
    {
        ReputationData memory reputation = _reputations[profileId];

        if (reputation.totalInteractions == 0) {
            return 5000; // Neutral trust score for new profiles
        }

        // Calculate trust score based on positive interaction ratio
        uint256 positiveRatio = (reputation.positiveInteractions * 10000) / reputation.totalInteractions;

        // Combine with base trust score
        return (positiveRatio + reputation.trust) / 2;
    }

    // =============================================================
    // BATCH OPERATIONS
    // =============================================================

    /**
     * @dev Get reputation data for multiple profiles (batch operation)
     */
    function getReputationBatch(bytes8[] memory profileIds)
        external
        view
        override
        returns (ReputationData[] memory reputations)
    {
        reputations = new ReputationData[](profileIds.length);

        for (uint256 i = 0; i < profileIds.length; i++) {
            reputations[i] = _reputations[profileIds[i]];
        }

        return reputations;
    }

    // =============================================================
    // INTERNAL FUNCTIONS
    // =============================================================

    /**
     * @dev Validate that a profile exists
     */
    function _validateProfile(bytes8 profileId) internal view {
        require(_profileExists(profileId), "Profile does not exist");
    }

    /**
     * @dev Check if profile exists through Identity module
     */
    function _profileExists(bytes8 profileId) internal view returns (bool) {
        address identityModule = getModule(keccak256("IDENTITY"));
        if (identityModule == address(0)) return false;

        IIdentity identity = IIdentity(identityModule);
        return identity.profileExists(profileId);
    }

    /**
     * @dev Check if caller is an authorized module
     */
    function _isAuthorizedModule(address caller) internal view returns (bool) {
        // Check if caller is a registered module
        // This is a simplified check - in production, implement proper module authorization
        return hasRole(DEFAULT_ADMIN_ROLE, caller);
    }
}
