// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.20;

import "../../core/GameDAOModule.sol";
import "../../interfaces/ISense.sol";
import "../../interfaces/IIdentity.sol";
import "../../interfaces/IGameDAOMembership.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

/**
 * @title Sense (With Membership Integration)
 * @dev GameDAO Sense Module with GameDAOMembership integration
 * @notice Provides reputation tracking, experience management, and trust scoring with membership integration
 */
contract Sense is ISense, GameDAOModule {
    using EnumerableSet for EnumerableSet.Bytes32Set;

    // =============================================================
    // CONSTANTS
    // =============================================================

    bytes32 public constant SENSE_ADMIN_ROLE = keccak256("SENSE_ADMIN_ROLE");
    bytes32 public constant REPUTATION_MANAGER_ROLE = keccak256("REPUTATION_MANAGER_ROLE");

    uint256 public constant TRUST_SCORE_SCALE = 10000; // 0-10000 scale
    uint256 public constant REPUTATION_SCALE = 1000; // 1000 = 1.0x multiplier
    uint256 public constant MAX_REPUTATION_DELTA = 10000;

    // =============================================================
    // STATE VARIABLES (REDUCED SIZE - no membership storage)
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

    // Profile-to-membership linking (REDUCED - delegated to membership contract)
    mapping(bytes8 => EnumerableSet.Bytes32Set) private _profileOrganizations;

    // Contract references
    IGameDAOMembership public membershipContract;

    // Events
    event MembershipContractUpdated(address indexed membershipContract, uint256 timestamp);
    event ProfileMembershipLinked(bytes8 indexed profileId, bytes8 indexed organizationId, address indexed member, uint256 timestamp);
    event ReputationSyncedWithMembership(bytes8 indexed profileId, bytes8 indexed organizationId, uint256 reputation, uint256 timestamp);
    event VotingWeightCalculated(bytes8 indexed profileId, bytes8 indexed organizationId, uint256 weight, uint256 timestamp);

    // Errors
    error MembershipContractNotSet();
    error ProfileNotFound(bytes8 profileId);
    error MembershipNotFound(bytes8 profileId, bytes8 organizationId);
    error ReputationSyncFailed(bytes8 profileId, bytes8 organizationId);

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

    /**
     * @dev Set membership contract
     */
    function setMembershipContract(address _membershipContract) external onlyRole(SENSE_ADMIN_ROLE) {
        membershipContract = IGameDAOMembership(_membershipContract);
        emit MembershipContractUpdated(_membershipContract, block.timestamp);
    }

    // =============================================================
    // REPUTATION MANAGEMENT WITH MEMBERSHIP INTEGRATION
    // =============================================================

    /**
     * @dev Update reputation for a profile (UPDATED TO SYNC WITH MEMBERSHIP)
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
            } else {
                uint256 absDelta = uint256(-delta);
                if (reputation.reputation >= absDelta) {
                    reputation.reputation = reputation.reputation - absDelta;
                } else {
                    reputation.reputation = 0;
                }
            }
        } else if (repType == ReputationType.TRUST) {
            // Trust can be positive or negative
            if (delta > 0) {
                reputation.trust = reputation.trust + uint256(delta);
                if (reputation.trust > TRUST_SCORE_SCALE) {
                    reputation.trust = TRUST_SCORE_SCALE;
                }
            } else {
                uint256 absDelta = uint256(-delta);
                if (reputation.trust >= absDelta) {
                    reputation.trust = reputation.trust - absDelta;
                } else {
                    reputation.trust = 0;
                }
            }
        }

        reputation.lastUpdated = block.timestamp;
        _lastReputationUpdate[profileId] = block.timestamp;

        // Record in history
        _reputationHistory[profileId].push(ReputationEvent({
            profileId: profileId,
            repType: repType,
            delta: delta,
            reason: reason,
            updatedBy: _msgSender(),
            timestamp: block.timestamp
        }));

        emit ReputationUpdated(profileId, repType, delta, reason, _msgSender(), block.timestamp);

        // Sync reputation with membership contract for all organizations
        _syncReputationWithMembership(profileId);
    }

    /**
     * @dev Sync reputation with membership contract for all organizations
     */
    function _syncReputationWithMembership(bytes8 profileId) internal {
        if (address(membershipContract) == address(0)) return;

        // Get all organizations this profile is a member of
        bytes32[] memory orgHashes = _profileOrganizations[profileId].values();
        ReputationData memory reputation = _reputations[profileId];

        for (uint256 i = 0; i < orgHashes.length; i++) {
            bytes8 organizationId = bytes8(orgHashes[i]);

            // Get the member's address from membership contract
            try membershipContract.getMemberCount(organizationId) returns (uint256) {
                // Organization exists, try to sync reputation
                // Note: This is a simplified sync - in practice, you'd need to map profiles to addresses
                emit ReputationSyncedWithMembership(profileId, organizationId, reputation.reputation, block.timestamp);
            } catch {
                // Organization doesn't exist or sync failed
                continue;
            }
        }
    }

    /**
     * @dev Link profile to organization membership
     */
    function linkProfileToMembership(
        bytes8 profileId,
        bytes8 organizationId,
        address memberAddress
    ) external onlyRole(REPUTATION_MANAGER_ROLE) {
        _validateProfile(profileId);

        if (address(membershipContract) == address(0)) {
            revert MembershipContractNotSet();
        }

        // Verify the address is actually a member of the organization
        if (!membershipContract.isActiveMember(organizationId, memberAddress)) {
            revert MembershipNotFound(profileId, organizationId);
        }

        // Link profile to organization
        bytes32 orgHash = keccak256(abi.encodePacked(organizationId));
        _profileOrganizations[profileId].add(orgHash);

        emit ProfileMembershipLinked(profileId, organizationId, memberAddress, block.timestamp);

        // Sync reputation with membership contract
        _syncReputationWithMembership(profileId);
    }

    /**
     * @dev Get reputation data for a profile
     */
    function getReputation(bytes8 profileId) external view override returns (ReputationData memory) {
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
    // EXPERIENCE SYSTEM WITH MEMBERSHIP INTEGRATION
    // =============================================================

    /**
     * @dev Award experience points to a profile (UPDATED TO SYNC WITH MEMBERSHIP)
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

        // Sync with membership contract
        _syncReputationWithMembership(profileId);
    }

    /**
     * @dev Get experience points for a profile
     */
    function getExperience(bytes8 profileId) external view override returns (uint256 experience) {
        return _reputations[profileId].experience;
    }

    // =============================================================
    // TRUST SYSTEM WITH MEMBERSHIP INTEGRATION
    // =============================================================

    /**
     * @dev Record an interaction (positive or negative) (UPDATED TO SYNC WITH MEMBERSHIP)
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

        // Sync with membership contract
        _syncReputationWithMembership(profileId);
    }

    /**
     * @dev Get trust score for a profile
     */
    function getTrustScore(bytes8 profileId) external view override returns (uint256 trustScore) {
        return _reputations[profileId].trust;
    }

    // =============================================================
    // VOTING WEIGHT CALCULATION WITH MEMBERSHIP INTEGRATION
    // =============================================================

    /**
     * @dev Calculate voting weight based on reputation (UPDATED TO INTEGRATE WITH MEMBERSHIP)
     */
    function calculateVotingWeight(bytes8 profileId, uint256 baseWeight)
        external
        view
        override
        returns (uint256 votingWeight)
    {
        ReputationData memory reputation = _reputations[profileId];

        // Base calculation from reputation
        uint256 reputationMultiplier = (reputation.reputation * REPUTATION_SCALE) / 1000;
        uint256 trustMultiplier = (reputation.trust * REPUTATION_SCALE) / TRUST_SCORE_SCALE;

        // Combine multipliers
        uint256 totalMultiplier = (reputationMultiplier + trustMultiplier) / 2;
        if (totalMultiplier == 0) totalMultiplier = REPUTATION_SCALE;

        votingWeight = (baseWeight * totalMultiplier) / REPUTATION_SCALE;
    }

    /**
     * @dev Calculate voting weight for specific organization (NEW FUNCTION)
     */
    function calculateOrganizationVotingWeight(
        bytes8 profileId,
        bytes8 organizationId,
        address memberAddress
    ) external view returns (uint256 votingWeight) {
        if (address(membershipContract) == address(0)) {
            return calculateVotingWeight(profileId, 1);
        }

        // Get base voting power from membership contract
        uint256 basePower = membershipContract.getVotingPower(organizationId, memberAddress);

        // Apply reputation multiplier
        ReputationData memory reputation = _reputations[profileId];
        uint256 reputationMultiplier = (reputation.reputation * REPUTATION_SCALE) / 1000;
        uint256 trustMultiplier = (reputation.trust * REPUTATION_SCALE) / TRUST_SCORE_SCALE;

        // Combine multipliers
        uint256 totalMultiplier = (reputationMultiplier + trustMultiplier) / 2;
        if (totalMultiplier == 0) totalMultiplier = REPUTATION_SCALE;

        votingWeight = (basePower * totalMultiplier) / REPUTATION_SCALE;

        emit VotingWeightCalculated(profileId, organizationId, votingWeight, block.timestamp);
    }

    /**
     * @dev Get cached voting weight for a profile
     */
    function getCachedVotingWeight(bytes8 profileId) external view override returns (uint256 votingWeight) {
        return _votingWeights[profileId];
    }

    /**
     * @dev Update cached voting weight for a profile
     */
    function updateVotingWeight(bytes8 profileId) external override {
        _validateProfile(profileId);

        uint256 newWeight = this.calculateVotingWeight(profileId, 1000); // Base weight of 1000
        _votingWeights[profileId] = newWeight;
        _votingWeightUpdates[profileId] = block.timestamp;

        emit VotingWeightUpdated(profileId, newWeight, block.timestamp);
    }

    // =============================================================
    // MEMBERSHIP INTEGRATION FUNCTIONS
    // =============================================================

    /**
     * @dev Get organizations linked to a profile
     */
    function getProfileOrganizations(bytes8 profileId) external view returns (bytes8[] memory organizations) {
        bytes32[] memory orgHashes = _profileOrganizations[profileId].values();
        organizations = new bytes8[](orgHashes.length);

        for (uint256 i = 0; i < orgHashes.length; i++) {
            organizations[i] = bytes8(orgHashes[i]);
        }
    }

    /**
     * @dev Check if profile is linked to organization
     */
    function isProfileLinkedToOrganization(bytes8 profileId, bytes8 organizationId) external view returns (bool) {
        bytes32 orgHash = keccak256(abi.encodePacked(organizationId));
        return _profileOrganizations[profileId].contains(orgHash);
    }

    /**
     * @dev Get reputation-adjusted member data for organization
     */
    function getReputationAdjustedMemberData(
        bytes8 profileId,
        bytes8 organizationId,
        address memberAddress
    ) external view returns (
        uint256 reputation,
        uint256 experience,
        uint256 trust,
        uint256 votingWeight,
        uint256 lastUpdated
    ) {
        ReputationData memory repData = _reputations[profileId];

        reputation = repData.reputation;
        experience = repData.experience;
        trust = repData.trust;
        lastUpdated = repData.lastUpdated;

        // Calculate voting weight with membership integration
        if (address(membershipContract) != address(0)) {
            uint256 basePower = membershipContract.getVotingPower(organizationId, memberAddress);
            uint256 reputationMultiplier = (reputation * REPUTATION_SCALE) / 1000;
            uint256 trustMultiplier = (trust * REPUTATION_SCALE) / TRUST_SCORE_SCALE;
            uint256 totalMultiplier = (reputationMultiplier + trustMultiplier) / 2;
            if (totalMultiplier == 0) totalMultiplier = REPUTATION_SCALE;
            votingWeight = (basePower * totalMultiplier) / REPUTATION_SCALE;
        } else {
            votingWeight = this.calculateVotingWeight(profileId, 1000);
        }
    }

    /**
     * @dev Bulk sync reputation for multiple profiles
     */
    function bulkSyncReputation(bytes8[] calldata profileIds) external onlyRole(REPUTATION_MANAGER_ROLE) {
        for (uint256 i = 0; i < profileIds.length; i++) {
            _syncReputationWithMembership(profileIds[i]);
        }
    }

    // =============================================================
    // ANALYTICS AND REPORTING
    // =============================================================

    /**
     * @dev Get reputation statistics for an organization
     */
    function getOrganizationReputationStats(bytes8 organizationId) external view returns (
        uint256 totalMembers,
        uint256 averageReputation,
        uint256 averageTrust,
        uint256 totalExperience
    ) {
        if (address(membershipContract) == address(0)) {
            return (0, 0, 0, 0);
        }

        // Get all members from membership contract
        address[] memory members = membershipContract.getAllMembers(organizationId);
        totalMembers = members.length;

        if (totalMembers == 0) {
            return (0, 0, 0, 0);
        }

        uint256 totalRep = 0;
        uint256 totalTrustScore = 0;
        uint256 totalExp = 0;

        // This is a simplified version - in practice, you'd need profile-to-address mapping
        // For now, we'll return basic stats
        averageReputation = totalRep / totalMembers;
        averageTrust = totalTrustScore / totalMembers;
        totalExperience = totalExp;
    }

    /**
     * @dev Get top reputation holders for an organization
     */
    function getTopReputationHolders(bytes8 organizationId, uint256 limit) external view returns (
        bytes8[] memory profileIds,
        uint256[] memory reputations
    ) {
        // This would require a more complex implementation with sorting
        // For now, return empty arrays
        profileIds = new bytes8[](0);
        reputations = new uint256[](0);
    }

    // =============================================================
    // INTERNAL FUNCTIONS
    // =============================================================

    /**
     * @dev Validate profile exists
     */
    function _validateProfile(bytes8 profileId) internal view {
        if (profileId == 0x0000000000000000) {
            revert ProfileNotFound(profileId);
        }

        // Additional validation could be added here
        // For example, checking with Identity contract
    }

    /**
     * @dev Calculate reputation decay based on time
     */
    function _calculateReputationDecay(bytes8 profileId) internal view returns (uint256 decayAmount) {
        uint256 lastUpdate = _lastReputationUpdate[profileId];
        if (lastUpdate == 0) return 0;

        uint256 timeDiff = block.timestamp - lastUpdate;
        uint256 daysPassed = timeDiff / 86400; // Convert to days

        // Decay 1% per day (simplified)
        ReputationData memory reputation = _reputations[profileId];
        decayAmount = (reputation.reputation * daysPassed) / 100;
    }

    /**
     * @dev Apply reputation decay
     */
    function applyReputationDecay(bytes8 profileId) external onlyRole(REPUTATION_MANAGER_ROLE) {
        uint256 decayAmount = _calculateReputationDecay(profileId);
        if (decayAmount > 0) {
            ReputationData storage reputation = _reputations[profileId];
            if (reputation.reputation >= decayAmount) {
                reputation.reputation -= decayAmount;
            } else {
                reputation.reputation = 0;
            }
            reputation.lastUpdated = block.timestamp;
            _lastReputationUpdate[profileId] = block.timestamp;

            emit ReputationDecayApplied(profileId, decayAmount, block.timestamp);

            // Sync with membership contract
            _syncReputationWithMembership(profileId);
        }
    }

    // =============================================================
    // EVENTS
    // =============================================================

    event ReputationDecayApplied(bytes8 indexed profileId, uint256 decayAmount, uint256 timestamp);
    event VotingWeightUpdated(bytes8 indexed profileId, uint256 newWeight, uint256 timestamp);
}
