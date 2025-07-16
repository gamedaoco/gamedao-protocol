// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.20;

import "../../core/Module.sol";
import "../../interfaces/ISense.sol";
import "../../interfaces/IIdentity.sol";
import "../../interfaces/IMembership.sol";
import "../../interfaces/IRegistry.sol";

/**
 * @title Sense
 * @dev GameDAO Sense Module - Organization-Scoped Reputation, Experience & Trust System
 * @notice Provides organization-scoped reputation tracking, experience management, and trust scoring
 */
contract Sense is ISense, Module {
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

    // Organization-scoped reputation storage - organizationId => profileId => ReputationData
    mapping(bytes8 => mapping(bytes8 => ReputationData)) private _reputations;
    mapping(bytes8 => mapping(bytes8 => ReputationEvent[])) private _reputationHistory;
    mapping(bytes8 => mapping(bytes8 => uint256)) private _lastReputationUpdate;

    // Organization-scoped experience tracking
    mapping(bytes8 => mapping(bytes8 => uint256)) private _experiencePoints;
    mapping(bytes8 => mapping(bytes8 => uint256)) private _experienceHistory;

    // Organization-scoped trust and interaction tracking
    mapping(bytes8 => mapping(bytes8 => uint256)) private _trustScores;
    mapping(bytes8 => mapping(bytes8 => uint256)) private _totalInteractions;
    mapping(bytes8 => mapping(bytes8 => uint256)) private _positiveInteractions;

    // Organization-scoped voting weight cache
    mapping(bytes8 => mapping(bytes8 => uint256)) private _votingWeights;
    mapping(bytes8 => mapping(bytes8 => uint256)) private _votingWeightUpdates;

    // Organization stats
    mapping(bytes8 => uint256) private _organizationMemberCounts;
    mapping(bytes8 => uint256) private _organizationTotalReputation;
    mapping(bytes8 => uint256) private _organizationTotalExperience;
    mapping(bytes8 => uint256) private _organizationTotalTrust;

    // =============================================================
    // CONSTRUCTOR
    // =============================================================

        constructor() Module("1.0.0") {
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
        address registryAddr = address(_registry);
        _grantRole(SENSE_ADMIN_ROLE, registryAddr);
        _grantRole(REPUTATION_MANAGER_ROLE, registryAddr);
    }

    // =============================================================
    // REPUTATION MANAGEMENT
    // =============================================================

    /**
     * @dev Update reputation for a profile in an organization
     */
    function updateReputation(
        bytes8 organizationId,
        bytes8 profileId,
        ReputationType repType,
        int256 delta,
        bytes32 reason
    ) external override onlyRole(REPUTATION_MANAGER_ROLE) {
        _validateOrganization(organizationId);
        _validateProfile(profileId);

        ReputationData storage reputation = _reputations[organizationId][profileId];

        // Initialize organization context if not set
        if (reputation.organizationId == bytes8(0)) {
            reputation.organizationId = organizationId;
        }

        if (repType == ReputationType.EXPERIENCE) {
            uint256 absDelta = uint256(delta >= 0 ? delta : -delta);
            reputation.experience = reputation.experience + uint256(delta);
        } else if (repType == ReputationType.REPUTATION) {
            // Reputation can be positive or negative, but has bounds
            if (delta >= 0) {
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
            if (delta >= 0) {
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

        // Record event in history
        _reputationHistory[organizationId][profileId].push(ReputationEvent({
            organizationId: organizationId,
            profileId: profileId,
            repType: repType,
            delta: delta,
            reason: reason,
            updatedBy: _msgSender(),
            timestamp: block.timestamp
        }));

        emit ReputationUpdated(organizationId, profileId, repType, delta, reason, _msgSender(), block.timestamp);
    }

    /**
     * @dev Get reputation data for a profile in an organization
     */
    function getReputation(bytes8 organizationId, bytes8 profileId)
        external
        view
        override
        returns (ReputationData memory reputation)
    {
        return _reputations[organizationId][profileId];
    }

    /**
     * @dev Get reputation history for a profile in an organization
     */
    function getReputationHistory(bytes8 organizationId, bytes8 profileId)
        external
        view
        override
        returns (ReputationEvent[] memory events)
    {
        return _reputationHistory[organizationId][profileId];
    }

    // =============================================================
    // EXPERIENCE MANAGEMENT
    // =============================================================

    /**
     * @dev Award experience points to a profile in an organization
     */
    function awardExperience(
        bytes8 organizationId,
        bytes8 profileId,
        uint256 amount,
        bytes32 reason
    ) external override {
        require(hasRole(REPUTATION_MANAGER_ROLE, _msgSender()), "Not authorized");
        _validateOrganization(organizationId);
        _validateProfile(profileId);

        ReputationData storage reputation = _reputations[organizationId][profileId];
        reputation.experience += amount;
        reputation.lastUpdated = block.timestamp;

        // Record event in history
        _reputationHistory[organizationId][profileId].push(ReputationEvent({
            organizationId: organizationId,
            profileId: profileId,
            repType: ReputationType.EXPERIENCE,
            delta: int256(amount),
            reason: reason,
            updatedBy: _msgSender(),
            timestamp: block.timestamp
        }));

        emit ExperienceAwarded(organizationId, profileId, amount, reason, _msgSender(), block.timestamp);
    }

    /**
     * @dev Get experience points for a profile in an organization
     */
    function getExperience(bytes8 organizationId, bytes8 profileId)
        external
        view
        override
        returns (uint256 experience)
    {
        return _reputations[organizationId][profileId].experience;
    }

    // =============================================================
    // TRUST MANAGEMENT
    // =============================================================

    /**
     * @dev Record an interaction (positive or negative) for trust scoring
     */
    function recordInteraction(
        bytes8 organizationId,
        bytes8 profileId,
        bool positive,
        bytes32 reason
    ) external override {
        require(hasRole(REPUTATION_MANAGER_ROLE, _msgSender()), "Not authorized");
        _validateOrganization(organizationId);
        _validateProfile(profileId);

        ReputationData storage reputation = _reputations[organizationId][profileId];
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

        emit InteractionRecorded(organizationId, profileId, positive, reason, _msgSender(), block.timestamp);
    }

    /**
     * @dev Get trust score for a profile in an organization
     */
    function getTrustScore(bytes8 organizationId, bytes8 profileId)
        external
        view
        override
        returns (uint256 trust)
    {
        return _reputations[organizationId][profileId].trust;
    }

    // =============================================================
    // VOTING POWER INTEGRATION
    // =============================================================

    /**
     * @dev Calculate voting weight based on reputation in an organization
     */
    function calculateVotingWeight(
        bytes8 organizationId,
        bytes8 profileId,
        uint256 baseWeight
    ) external view override returns (uint256 votingWeight) {
        ReputationData memory reputation = _reputations[organizationId][profileId];

        // Base weight multiplied by reputation multiplier (scaled by 1000)
        // reputation of 1000 = 1.0x, 1500 = 1.5x, etc.
        return (baseWeight * reputation.reputation) / 1000;
    }

    /**
     * @dev Calculate trust score based on interactions in an organization
     */
    function calculateTrustScore(bytes8 organizationId, bytes8 profileId)
        external
        view
        override
        returns (uint256 trustScore)
    {
        ReputationData memory reputation = _reputations[organizationId][profileId];

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
     * @dev Get reputation data for multiple profiles in an organization
     */
    function getReputationBatch(
        bytes8 organizationId,
        bytes8[] memory profileIds
    ) external view override returns (ReputationData[] memory reputations) {
        reputations = new ReputationData[](profileIds.length);

        for (uint256 i = 0; i < profileIds.length; i++) {
            reputations[i] = _reputations[organizationId][profileIds[i]];
        }

        return reputations;
    }

    // =============================================================
    // MEMBERSHIP INTEGRATION
    // =============================================================

    /**
     * @dev Get reputation-based voting power for a member in an organization
     */
    function getMemberVotingPower(
        bytes8 organizationId,
        address memberAddress,
        uint256 baseWeight
    ) external view override returns (uint256 votingPower) {
        // Get member's profile ID through Identity module
        address identityModule = getModule(keccak256("IDENTITY"));
        if (identityModule == address(0)) return baseWeight; // Fallback to base weight

                IIdentity identity = IIdentity(identityModule);
        IIdentity.Profile memory profile = identity.getProfileByOwner(memberAddress, organizationId);

        if (profile.profileId == bytes8(0)) return baseWeight; // No profile, use base weight

        ReputationData memory reputation = _reputations[organizationId][profile.profileId];

        // Apply reputation multiplier (scaled by 1000)
        return (baseWeight * reputation.reputation) / 1000;
    }

    /**
     * @dev Get aggregated reputation stats for an organization
     */
    function getOrganizationReputationStats(bytes8 organizationId)
        external
        view
        override
        returns (
            uint256 totalMembers,
            uint256 averageReputation,
            uint256 totalExperience,
            uint256 averageTrust
        )
    {
        // Get membership module to get member list
        address membershipModule = getModule(keccak256("MEMBERSHIP"));
        if (membershipModule == address(0)) {
            return (0, 0, 0, 0);
        }

        IMembership membership = IMembership(membershipModule);
        address[] memory members = membership.getMembers(organizationId);

        if (members.length == 0) {
            return (0, 0, 0, 0);
        }

        uint256 totalRep = 0;
        uint256 totalExp = 0;
        uint256 totalTrustScore = 0;
        uint256 validMembers = 0;

        // Get identity module to convert addresses to profile IDs
        address identityModule = getModule(keccak256("IDENTITY"));
        if (identityModule == address(0)) {
            return (members.length, 0, 0, 0);
        }

        IIdentity identity = IIdentity(identityModule);

        for (uint256 i = 0; i < members.length; i++) {
            IIdentity.Profile memory profile = identity.getProfileByOwner(members[i], organizationId);
            if (profile.profileId != bytes8(0)) {
                ReputationData memory reputation = _reputations[organizationId][profile.profileId];
                totalRep += reputation.reputation;
                totalExp += reputation.experience;
                totalTrustScore += reputation.trust;
                validMembers++;
            }
        }

        return (
            members.length,
            validMembers > 0 ? totalRep / validMembers : 0,
            totalExp,
            validMembers > 0 ? totalTrustScore / validMembers : 0
        );
    }

    // =============================================================
    // INTERNAL FUNCTIONS
    // =============================================================

    /**
     * @dev Validate that an organization exists
     */
    function _validateOrganization(bytes8 organizationId) internal view {
        require(_organizationExists(organizationId), "Organization does not exist");
    }

    /**
     * @dev Validate that a profile exists
     */
    function _validateProfile(bytes8 profileId) internal view {
        require(_profileExists(profileId), "Profile does not exist");
    }

    /**
     * @dev Check if organization exists through Control module
     */
    function _organizationExists(bytes8 organizationId) internal view returns (bool) {
        address controlModule = getModule(keccak256("CONTROL"));
        if (controlModule == address(0)) return false;

        // Simple check - in production, implement proper organization validation
        return true; // Simplified for now
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
