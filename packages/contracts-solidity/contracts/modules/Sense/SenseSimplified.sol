// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.20;

import "../../core/GameDAOModule.sol";
import "../../interfaces/ISenseSimplified.sol";
import "../../interfaces/IIdentity.sol";

/**
 * @title SenseSimplified
 * @dev GameDAO Sense Module - Reputation, Experience & Trust System
 * @notice Provides reputation tracking, experience management, and trust scoring
 */
contract SenseSimplified is ISenseSimplified, GameDAOModule {
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

    // Reputation storage
    mapping(string => ReputationData) private _reputations;
    mapping(string => ReputationEvent[]) private _reputationHistory;

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
        string memory profileId,
        ReputationType repType,
        int256 delta,
        bytes32 reason
    ) external override onlyRole(REPUTATION_MANAGER_ROLE) onlyInitialized whenNotPaused {
        // Validate profile exists
        _validateProfile(profileId);

        // Validate delta
        if (delta > int256(MAX_REPUTATION_DELTA) || delta < -int256(MAX_REPUTATION_DELTA)) {
            revert InvalidReputationDelta(delta);
        }

        ReputationData storage reputation = _reputations[profileId];
        uint256 oldValue;
        uint256 newValue;

        // Update based on reputation type
        if (repType == ReputationType.EXPERIENCE) {
            oldValue = reputation.experience;
            if (delta < 0 && uint256(-delta) > reputation.experience) {
                reputation.experience = 0;
            } else {
                reputation.experience = uint256(int256(reputation.experience) + delta);
            }
            newValue = reputation.experience;
        } else if (repType == ReputationType.REPUTATION) {
            oldValue = reputation.reputation;
            if (delta < 0 && uint256(-delta) > reputation.reputation) {
                reputation.reputation = 0;
            } else {
                reputation.reputation = uint256(int256(reputation.reputation) + delta);
            }
            newValue = reputation.reputation;
        } else if (repType == ReputationType.TRUST) {
            oldValue = reputation.trust;
            if (delta < 0 && uint256(-delta) > reputation.trust) {
                reputation.trust = 0;
            } else {
                reputation.trust = uint256(int256(reputation.trust) + delta);
            }
            newValue = reputation.trust;
        }

        reputation.lastUpdated = block.timestamp;

        // Record reputation event
        ReputationEvent memory repEvent = ReputationEvent({
            profileId: profileId,
            repType: repType,
            delta: delta,
            reason: reason,
            updatedBy: _msgSender(),
            timestamp: block.timestamp,
            blockNumber: block.number
        });
        _reputationHistory[profileId].push(repEvent);

        emit ReputationUpdated(profileId, repType, delta, reason, _msgSender(), newValue, block.timestamp);
    }

    /**
     * @dev Get reputation data for a profile
     */
    function getReputation(string memory profileId)
        external
        view
        override
        returns (ReputationData memory reputation)
    {
        _validateProfile(profileId);
        return _reputations[profileId];
    }

    /**
     * @dev Get reputation history for a profile
     */
    function getReputationHistory(string memory profileId)
        external
        view
        override
        returns (ReputationEvent[] memory events)
    {
        _validateProfile(profileId);
        return _reputationHistory[profileId];
    }

    // =============================================================
    // EXPERIENCE MANAGEMENT
    // =============================================================

    /**
     * @dev Award experience points to a profile
     */
    function awardExperience(string memory profileId, uint256 amount, bytes32 reason) external override {
        // Only allow certain roles or modules to award experience
        if (!hasRole(REPUTATION_MANAGER_ROLE, _msgSender()) && !_isAuthorizedModule(_msgSender())) {
            revert UnauthorizedReputationUpdate(_msgSender());
        }

        _validateProfile(profileId);

        ReputationData storage reputation = _reputations[profileId];
        reputation.experience += amount;
        reputation.lastUpdated = block.timestamp;

        // Record as reputation event
        ReputationEvent memory repEvent = ReputationEvent({
            profileId: profileId,
            repType: ReputationType.EXPERIENCE,
            delta: int256(amount),
            reason: reason,
            updatedBy: _msgSender(),
            timestamp: block.timestamp,
            blockNumber: block.number
        });
        _reputationHistory[profileId].push(repEvent);

        emit ReputationUpdated(profileId, ReputationType.EXPERIENCE, int256(amount), reason, _msgSender(), reputation.experience, block.timestamp);
    }

    /**
     * @dev Get experience points for a profile
     */
    function getExperience(string memory profileId) external view override returns (uint256 experience) {
        _validateProfile(profileId);
        return _reputations[profileId].experience;
    }

    // =============================================================
    // TRUST MANAGEMENT
    // =============================================================

    /**
     * @dev Record a positive or negative interaction
     */
    function recordInteraction(string memory profileId, bool positive, bytes32 reason) external override {
        // Only allow certain roles or modules to record interactions
        if (!hasRole(REPUTATION_MANAGER_ROLE, _msgSender()) && !_isAuthorizedModule(_msgSender())) {
            revert UnauthorizedReputationUpdate(_msgSender());
        }

        _validateProfile(profileId);

        ReputationData storage reputation = _reputations[profileId];
        reputation.totalInteractions++;

        if (positive) {
            reputation.positiveInteractions++;
        }

        // Update trust score based on interaction ratio
        if (reputation.totalInteractions > 0) {
            uint256 positiveRatio = (reputation.positiveInteractions * 100) / reputation.totalInteractions;
            reputation.trust = (positiveRatio * TRUST_SCORE_SCALE) / 100;
        }

        reputation.lastUpdated = block.timestamp;

        emit InteractionRecorded(profileId, positive, _msgSender(), reason, block.timestamp);
    }

    /**
     * @dev Get trust score for a profile
     */
    function getTrustScore(string memory profileId) external view override returns (uint256 trustScore) {
        _validateProfile(profileId);
        return _reputations[profileId].trust;
    }

    // =============================================================
    // UTILITY FUNCTIONS
    // =============================================================

    /**
     * @dev Calculate voting weight based on reputation
     */
    function calculateVotingWeight(string memory profileId, uint256 baseWeight)
        external
        view
        override
        returns (uint256 weight)
    {
        if (!_profileExists(profileId)) return baseWeight;

        ReputationData storage reputation = _reputations[profileId];

        // Calculate multiplier based on reputation score
        // reputation is scaled by 1000 (1000 = 1.0x)
        uint256 multiplier = reputation.reputation;
        if (multiplier == 0) multiplier = 1000; // Default to 1.0x if no reputation

        // Cap the multiplier to prevent excessive voting power
        if (multiplier > 3000) multiplier = 3000; // Max 3x
        if (multiplier < 500) multiplier = 500;   // Min 0.5x

        weight = (baseWeight * multiplier) / REPUTATION_SCALE;
        return weight;
    }

    /**
     * @dev Calculate comprehensive trust score for campaign validation
     */
    function calculateTrustScore(string memory profileId)
        external
        view
        override
        returns (uint256 trustScore)
    {
        if (!_profileExists(profileId)) return 0;

        ReputationData storage reputation = _reputations[profileId];

        // Base trust from reputation system
        uint256 baseTrust = reputation.trust;

        // Experience-based trust bonus
        uint256 experienceTrust = reputation.experience / 100; // 1 trust per 100 XP
        if (experienceTrust > 2000) experienceTrust = 2000; // Cap at 2000

        // Reputation-based trust bonus
        uint256 reputationTrust = 0;
        if (reputation.reputation > 1000) {
            reputationTrust = ((reputation.reputation - 1000) * 1000) / 1000; // Bonus for above-average reputation
            if (reputationTrust > 2000) reputationTrust = 2000; // Cap at 2000
        }

        // Combine all trust factors
        trustScore = baseTrust + experienceTrust + reputationTrust;

        // Cap at maximum trust score
        if (trustScore > TRUST_SCORE_SCALE) trustScore = TRUST_SCORE_SCALE;

        return trustScore;
    }

    /**
     * @dev Get reputation summary for multiple profiles
     */
    function getReputationBatch(string[] memory profileIds)
        external
        view
        override
        returns (ReputationData[] memory reputations)
    {
        reputations = new ReputationData[](profileIds.length);

        for (uint256 i = 0; i < profileIds.length; i++) {
            if (_profileExists(profileIds[i])) {
                reputations[i] = _reputations[profileIds[i]];
            }
            // If profile doesn't exist, it will return default (zero) values
        }

        return reputations;
    }

    // =============================================================
    // INTERNAL FUNCTIONS
    // =============================================================

    /**
     * @dev Validate profile exists through Identity module
     */
    function _validateProfile(string memory profileId) internal view {
        if (!_profileExists(profileId)) {
            revert ProfileNotFound(profileId);
        }
    }

    /**
     * @dev Check if profile exists through Identity module
     */
    function _profileExists(string memory profileId) internal view returns (bool) {
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
