// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "../../core/GameDAOModule.sol";
import "../../interfaces/ISense.sol";
import "../../interfaces/IControl.sol";

/**
 * @title Sense
 * @dev GameDAO Sense Module - Identity & Reputation System
 * @notice Provides comprehensive user identity management, reputation tracking, and social proof mechanisms
 */
contract Sense is ISense, GameDAOModule {
    using EnumerableSet for EnumerableSet.Bytes32Set;
    using EnumerableSet for EnumerableSet.AddressSet;

    // =============================================================
    // CONSTANTS
    // =============================================================

    bytes32 public constant SENSE_ADMIN_ROLE = keccak256("SENSE_ADMIN_ROLE");
    bytes32 public constant REPUTATION_MANAGER_ROLE = keccak256("REPUTATION_MANAGER_ROLE");
    bytes32 public constant ACHIEVEMENT_GRANTER_ROLE = keccak256("ACHIEVEMENT_GRANTER_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    uint256 public constant MAX_FEEDBACK_RATING = 5;
    uint256 public constant MIN_FEEDBACK_RATING = 1;
    uint256 public constant TRUST_SCORE_SCALE = 10000; // 0-10000 scale
    uint256 public constant REPUTATION_SCALE = 1000; // 1000 = 1.0x multiplier
    uint256 public constant MAX_REPUTATION_DELTA = 10000;
    uint256 public constant MAX_FEEDBACKS_PER_QUERY = 100;

    // =============================================================
    // STATE VARIABLES
    // =============================================================

    // Profile storage
    mapping(bytes32 => Profile) private _profiles;
    mapping(address => mapping(bytes32 => bytes32)) private _ownerToProfile; // owner -> orgId -> profileId
    EnumerableSet.Bytes32Set private _allProfiles;
    mapping(bytes32 => EnumerableSet.Bytes32Set) private _organizationProfiles; // orgId -> profileIds

    // Reputation storage
    mapping(bytes32 => ReputationData) private _reputations;
    mapping(bytes32 => ReputationEvent[]) private _reputationHistory;
    mapping(bytes32 => mapping(bytes32 => uint256)) private _categoryReputations; // profileId -> category -> score

    // Achievement storage
    mapping(bytes32 => Achievement[]) private _profileAchievements;
    mapping(bytes32 => mapping(bytes32 => bool)) private _hasAchievement; // profileId -> achievementId -> bool
    mapping(bytes32 => EnumerableSet.Bytes32Set) private _achievementsByCategory; // category -> achievementIds

    // Feedback storage
    mapping(bytes32 => Feedback[]) private _profileFeedbacks;
    mapping(bytes32 => FeedbackSummary) private _feedbackSummaries;
    mapping(bytes32 => mapping(address => bool)) private _hasFeedbackFrom; // profileId -> giver -> bool

    // Verification storage
    mapping(bytes32 => VerificationLevel) private _verificationLevels;

    // Counters
    uint256 private _profileCounter;
    uint256 private _feedbackCounter;

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
        _grantRole(ACHIEVEMENT_GRANTER_ROLE, _msgSender());
        _grantRole(VERIFIER_ROLE, _msgSender());
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
        _grantRole(ACHIEVEMENT_GRANTER_ROLE, registryAddr);
        _grantRole(VERIFIER_ROLE, registryAddr);
    }

    // =============================================================
    // PROFILE MANAGEMENT
    // =============================================================

    /**
     * @dev Create a new user profile
     */
    function createProfile(bytes32 organizationId, string memory metadata)
        external
        override
        onlyInitialized
        whenNotPaused
        returns (bytes32 profileId)
    {
        // Validate organization exists
        _validateOrganization(organizationId);

        // Check if profile already exists for this owner and organization
        bytes32 existingProfileId = _ownerToProfile[_msgSender()][organizationId];
        if (existingProfileId != bytes32(0)) {
            revert ProfileAlreadyExists(_msgSender(), organizationId);
        }

        // Generate unique profile ID
        profileId = keccak256(abi.encodePacked(
            _msgSender(),
            organizationId,
            block.timestamp,
            _profileCounter++
        ));

        // Create profile
        Profile storage profile = _profiles[profileId];
        profile.profileId = profileId;
        profile.owner = _msgSender();
        profile.organizationId = organizationId;
        profile.metadata = metadata;
        profile.createdAt = block.timestamp;
        profile.updatedAt = block.timestamp;
        profile.active = true;
        profile.verified = false;

        // Initialize reputation data
        ReputationData storage reputation = _reputations[profileId];
        reputation.experience = 0;
        reputation.reputation = 1000; // Start with neutral reputation (1.0x)
        reputation.trust = 0;
        reputation.lastUpdated = block.timestamp;
        reputation.totalFeedbacks = 0;
        reputation.positiveFeedbacks = 0;

        // Initialize feedback summary
        FeedbackSummary storage feedbackSummary = _feedbackSummaries[profileId];
        feedbackSummary.totalFeedbacks = 0;
        feedbackSummary.positiveFeedbacks = 0;
        feedbackSummary.negativeFeedbacks = 0;
        feedbackSummary.neutralFeedbacks = 0;
        feedbackSummary.averageRating = 0;
        feedbackSummary.trustScore = 0;

        // Add to tracking sets
        _allProfiles.add(profileId);
        _organizationProfiles[organizationId].add(profileId);
        _ownerToProfile[_msgSender()][organizationId] = profileId;

        emit ProfileCreated(profileId, _msgSender(), organizationId, metadata, block.timestamp);

        return profileId;
    }

    /**
     * @dev Update an existing profile
     */
    function updateProfile(bytes32 profileId, string memory metadata)
        external
        override
        onlyInitialized
        whenNotPaused
    {
        Profile storage profile = _profiles[profileId];
        if (profile.owner == address(0)) revert ProfileNotFound(profileId);
        if (profile.owner != _msgSender() && !hasRole(SENSE_ADMIN_ROLE, _msgSender())) {
            revert UnauthorizedProfileAccess(profileId, _msgSender());
        }

        profile.metadata = metadata;
        profile.updatedAt = block.timestamp;

        emit ProfileUpdated(profileId, metadata, block.timestamp);
    }

    /**
     * @dev Get profile information
     */
    function getProfile(bytes32 profileId) external view override returns (Profile memory profile) {
        profile = _profiles[profileId];
        if (profile.owner == address(0)) revert ProfileNotFound(profileId);
        return profile;
    }

    /**
     * @dev Get profile by owner and organization
     */
    function getProfileByOwner(address owner, bytes32 organizationId)
        external
        view
        override
        returns (Profile memory profile)
    {
        bytes32 profileId = _ownerToProfile[owner][organizationId];
        if (profileId == bytes32(0)) revert ProfileNotFound(profileId);
        return _profiles[profileId];
    }

    /**
     * @dev Check if a profile exists
     */
    function profileExists(bytes32 profileId) external view override returns (bool exists) {
        return _profiles[profileId].owner != address(0);
    }

    /**
     * @dev Verify a profile
     */
    function verifyProfile(bytes32 profileId, VerificationLevel level)
        external
        override
        onlyRole(VERIFIER_ROLE)
        onlyInitialized
        whenNotPaused
    {
        Profile storage profile = _profiles[profileId];
        if (profile.owner == address(0)) revert ProfileNotFound(profileId);

        profile.verified = level != VerificationLevel.NONE;
        _verificationLevels[profileId] = level;

        emit ProfileVerified(profileId, level, _msgSender(), block.timestamp);
    }

    // =============================================================
    // REPUTATION SYSTEM
    // =============================================================

    /**
     * @dev Update reputation for a profile
     */
    function updateReputation(
        bytes32 profileId,
        ReputationType repType,
        int256 delta,
        bytes32 reason
    ) external override onlyRole(REPUTATION_MANAGER_ROLE) onlyInitialized whenNotPaused {
        Profile storage profile = _profiles[profileId];
        if (profile.owner == address(0)) revert ProfileNotFound(profileId);

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
    function getReputation(bytes32 profileId)
        external
        view
        override
        returns (ReputationData memory reputation)
    {
        if (_profiles[profileId].owner == address(0)) revert ProfileNotFound(profileId);

        // Create a memory copy since we can't return storage with mappings
        ReputationData storage storageRep = _reputations[profileId];
        reputation = ReputationData({
            experience: storageRep.experience,
            reputation: storageRep.reputation,
            trust: storageRep.trust,
            lastUpdated: storageRep.lastUpdated,
            totalFeedbacks: storageRep.totalFeedbacks,
            positiveFeedbacks: storageRep.positiveFeedbacks
        });

        return reputation;
    }

    /**
     * @dev Get reputation history for a profile
     */
    function getReputationHistory(bytes32 profileId)
        external
        view
        override
        returns (ReputationEvent[] memory events)
    {
        if (_profiles[profileId].owner == address(0)) revert ProfileNotFound(profileId);
        return _reputationHistory[profileId];
    }

    /**
     * @dev Get category-specific reputation scores
     */
    function getCategoryReputation(bytes32 profileId, bytes32 category)
        external
        view
        override
        returns (uint256 score)
    {
        if (_profiles[profileId].owner == address(0)) revert ProfileNotFound(profileId);
        return _categoryReputations[profileId][category];
    }

    /**
     * @dev Update category-specific reputation
     */
    function updateCategoryReputation(
        bytes32 profileId,
        bytes32 category,
        int256 delta,
        bytes32 reason
    ) external override onlyRole(REPUTATION_MANAGER_ROLE) onlyInitialized whenNotPaused {
        Profile storage profile = _profiles[profileId];
        if (profile.owner == address(0)) revert ProfileNotFound(profileId);

        uint256 currentScore = _categoryReputations[profileId][category];
        uint256 newScore;

        if (delta < 0 && uint256(-delta) > currentScore) {
            newScore = 0;
        } else {
            newScore = uint256(int256(currentScore) + delta);
        }

        _categoryReputations[profileId][category] = newScore;

        // Record reputation event
        ReputationEvent memory repEvent = ReputationEvent({
            profileId: profileId,
            repType: ReputationType.CATEGORY_SPECIFIC,
            delta: delta,
            reason: reason,
            updatedBy: _msgSender(),
            timestamp: block.timestamp,
            blockNumber: block.number
        });
        _reputationHistory[profileId].push(repEvent);

        emit ReputationUpdated(profileId, ReputationType.CATEGORY_SPECIFIC, delta, reason, _msgSender(), newScore, block.timestamp);
    }

    // =============================================================
    // ACHIEVEMENT SYSTEM
    // =============================================================

    /**
     * @dev Grant an achievement to a profile
     */
    function grantAchievement(
        bytes32 profileId,
        bytes32 achievementId,
        string memory name,
        string memory description,
        string memory category,
        uint256 points,
        bytes memory data
    ) external override onlyRole(ACHIEVEMENT_GRANTER_ROLE) onlyInitialized whenNotPaused {
        Profile storage profile = _profiles[profileId];
        if (profile.owner == address(0)) revert ProfileNotFound(profileId);

        // Check if achievement already granted
        if (_hasAchievement[profileId][achievementId]) {
            revert AchievementAlreadyGranted(profileId, achievementId);
        }

        // Create achievement
        Achievement memory achievement = Achievement({
            achievementId: achievementId,
            profileId: profileId,
            name: name,
            description: description,
            category: category,
            data: data,
            earnedAt: block.timestamp,
            grantedBy: _msgSender(),
            points: points
        });

        // Store achievement
        _profileAchievements[profileId].push(achievement);
        _hasAchievement[profileId][achievementId] = true;
        _achievementsByCategory[keccak256(bytes(category))].add(achievementId);

        // Award experience points
        ReputationData storage reputation = _reputations[profileId];
        reputation.experience += points;
        reputation.lastUpdated = block.timestamp;

        emit AchievementGranted(profileId, achievementId, name, points, _msgSender(), block.timestamp);
    }

    /**
     * @dev Grant an achievement to a profile with struct parameters (new simplified API)
     */
    function grantAchievementWithParams(
        address granter,
        bytes32 profileId,
        AchievementParams memory params
    ) external override onlyRole(ACHIEVEMENT_GRANTER_ROLE) onlyInitialized whenNotPaused {
        Profile storage profile = _profiles[profileId];
        if (profile.owner == address(0)) revert ProfileNotFound(profileId);

        // Check if achievement already granted
        if (_hasAchievement[profileId][params.achievementId]) {
            revert AchievementAlreadyGranted(profileId, params.achievementId);
        }

        // Create achievement
        Achievement memory achievement = Achievement({
            achievementId: params.achievementId,
            profileId: profileId,
            name: params.name,
            description: params.description,
            category: params.category,
            data: params.data,
            earnedAt: block.timestamp,
            grantedBy: granter,
            points: params.points
        });

        // Store achievement
        _profileAchievements[profileId].push(achievement);
        _hasAchievement[profileId][params.achievementId] = true;
        _achievementsByCategory[keccak256(bytes(params.category))].add(params.achievementId);

        // Award experience points
        ReputationData storage reputation = _reputations[profileId];
        reputation.experience += params.points;
        reputation.lastUpdated = block.timestamp;

        emit AchievementGranted(profileId, params.achievementId, params.name, params.points, granter, block.timestamp);
    }

    /**
     * @dev Get all achievements for a profile
     */
    function getAchievements(bytes32 profileId)
        external
        view
        override
        returns (Achievement[] memory achievements)
    {
        if (_profiles[profileId].owner == address(0)) revert ProfileNotFound(profileId);
        return _profileAchievements[profileId];
    }

    /**
     * @dev Get achievements by category
     */
    function getAchievementsByCategory(bytes32 profileId, string memory category)
        external
        view
        override
        returns (Achievement[] memory achievements)
    {
        if (_profiles[profileId].owner == address(0)) revert ProfileNotFound(profileId);

        Achievement[] storage allAchievements = _profileAchievements[profileId];
        uint256 count = 0;

        // Count matching achievements
        for (uint256 i = 0; i < allAchievements.length; i++) {
            if (keccak256(bytes(allAchievements[i].category)) == keccak256(bytes(category))) {
                count++;
            }
        }

        // Create result array
        achievements = new Achievement[](count);
        uint256 index = 0;

        for (uint256 i = 0; i < allAchievements.length; i++) {
            if (keccak256(bytes(allAchievements[i].category)) == keccak256(bytes(category))) {
                achievements[index] = allAchievements[i];
                index++;
            }
        }

        return achievements;
    }

    /**
     * @dev Check if a profile has a specific achievement
     */
    function hasAchievement(bytes32 profileId, bytes32 achievementId)
        external
        view
        override
        returns (bool)
    {
        if (_profiles[profileId].owner == address(0)) revert ProfileNotFound(profileId);
        return _hasAchievement[profileId][achievementId];
    }

    // =============================================================
    // SOCIAL FEATURES
    // =============================================================

    /**
     * @dev Submit feedback for a profile
     */
    function submitFeedback(
        bytes32 targetProfileId,
        FeedbackType feedbackType,
        uint8 rating,
        string memory comment
    ) external override onlyInitialized whenNotPaused returns (bytes32 feedbackId) {
        Profile storage targetProfile = _profiles[targetProfileId];
        if (targetProfile.owner == address(0)) revert ProfileNotFound(targetProfileId);

        // Prevent self-feedback
        if (targetProfile.owner == _msgSender()) {
            revert SelfFeedbackNotAllowed(_msgSender(), targetProfileId);
        }

        // Validate rating
        if (rating < MIN_FEEDBACK_RATING || rating > MAX_FEEDBACK_RATING) {
            revert InvalidFeedbackRating(rating);
        }

        // Check if already gave feedback (prevent spam)
        if (_hasFeedbackFrom[targetProfileId][_msgSender()]) {
            // Update existing feedback instead of creating new one
            Feedback[] storage feedbacks = _profileFeedbacks[targetProfileId];
            for (uint256 i = 0; i < feedbacks.length; i++) {
                if (feedbacks[i].giver == _msgSender()) {
                    feedbacks[i].feedbackType = feedbackType;
                    feedbacks[i].rating = rating;
                    feedbacks[i].comment = comment;
                    feedbacks[i].timestamp = block.timestamp;
                    feedbackId = feedbacks[i].feedbackId;
                    break;
                }
            }
        } else {
            // Create new feedback
            feedbackId = keccak256(abi.encodePacked(
                targetProfileId,
                _msgSender(),
                block.timestamp,
                _feedbackCounter++
            ));

            Feedback memory feedback = Feedback({
                feedbackId: feedbackId,
                targetProfileId: targetProfileId,
                giver: _msgSender(),
                feedbackType: feedbackType,
                rating: rating,
                comment: comment,
                timestamp: block.timestamp,
                verified: false
            });

            _profileFeedbacks[targetProfileId].push(feedback);
            _hasFeedbackFrom[targetProfileId][_msgSender()] = true;
        }

        // Update feedback summary and reputation
        _updateFeedbackSummary(targetProfileId);

        emit FeedbackSubmitted(feedbackId, targetProfileId, _msgSender(), feedbackType, rating, block.timestamp);

        return feedbackId;
    }

    /**
     * @dev Get feedback summary for a profile
     */
    function getFeedbackSummary(bytes32 profileId)
        external
        view
        override
        returns (FeedbackSummary memory summary)
    {
        if (_profiles[profileId].owner == address(0)) revert ProfileNotFound(profileId);
        return _feedbackSummaries[profileId];
    }

    /**
     * @dev Get individual feedback entries for a profile
     */
    function getFeedbacks(bytes32 profileId, uint256 offset, uint256 limit)
        external
        view
        override
        returns (Feedback[] memory feedbacks)
    {
        if (_profiles[profileId].owner == address(0)) revert ProfileNotFound(profileId);

        Feedback[] storage allFeedbacks = _profileFeedbacks[profileId];

        if (offset >= allFeedbacks.length) {
            return new Feedback[](0);
        }

        uint256 end = offset + limit;
        if (end > allFeedbacks.length) {
            end = allFeedbacks.length;
        }
        if (limit > MAX_FEEDBACKS_PER_QUERY) {
            limit = MAX_FEEDBACKS_PER_QUERY;
            end = offset + limit;
            if (end > allFeedbacks.length) {
                end = allFeedbacks.length;
            }
        }

        feedbacks = new Feedback[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            feedbacks[i - offset] = allFeedbacks[i];
        }

        return feedbacks;
    }

    // =============================================================
    // CROSS-DAO FEATURES
    // =============================================================

    /**
     * @dev Export reputation data for cross-DAO portability
     */
    function exportReputation(bytes32 profileId)
        external
        view
        override
        returns (ReputationExport memory exportData)
    {
        Profile storage profile = _profiles[profileId];
        if (profile.owner == address(0)) revert ProfileNotFound(profileId);

        // Only profile owner can export
        if (profile.owner != _msgSender() && !hasRole(SENSE_ADMIN_ROLE, _msgSender())) {
            revert UnauthorizedProfileAccess(profileId, _msgSender());
        }

        ReputationData storage reputation = _reputations[profileId];
        Achievement[] storage achievements = _profileAchievements[profileId];
        FeedbackSummary storage feedbackSummary = _feedbackSummaries[profileId];

        // Create reputation data copy
        ReputationData memory repData = ReputationData({
            experience: reputation.experience,
            reputation: reputation.reputation,
            trust: reputation.trust,
            lastUpdated: reputation.lastUpdated,
            totalFeedbacks: reputation.totalFeedbacks,
            positiveFeedbacks: reputation.positiveFeedbacks
        });

        // Create merkle root for verification (simplified)
        bytes32 merkleRoot = keccak256(abi.encodePacked(
            profileId,
            profile.owner,
            reputation.experience,
            reputation.reputation,
            reputation.trust,
            block.timestamp
        ));

        exportData = ReputationExport({
            sourceProfileId: profileId,
            owner: profile.owner,
            sourceOrganizationId: profile.organizationId,
            reputation: repData,
            achievements: achievements,
            feedbackSummary: feedbackSummary,
            exportedAt: block.timestamp,
            merkleRoot: merkleRoot
        });

        return exportData;
    }

    /**
     * @dev Import reputation from another DAO
     */
    function importReputation(
        bytes32 profileId,
        ReputationExport memory exportData,
        bytes memory /* proof */
    ) external override onlyInitialized whenNotPaused {
        Profile storage profile = _profiles[profileId];
        if (profile.owner == address(0)) revert ProfileNotFound(profileId);

        // Only profile owner can import
        if (profile.owner != _msgSender() && !hasRole(SENSE_ADMIN_ROLE, _msgSender())) {
            revert UnauthorizedProfileAccess(profileId, _msgSender());
        }

        // Verify the export data (simplified verification)
        bytes32 expectedRoot = keccak256(abi.encodePacked(
            exportData.sourceProfileId,
            exportData.owner,
            exportData.reputation.experience,
            exportData.reputation.reputation,
            exportData.reputation.trust,
            exportData.exportedAt
        ));

        if (expectedRoot != exportData.merkleRoot) {
            revert InvalidImportProof(profileId);
        }

        // Import reputation (partial import to prevent gaming)
        ReputationData storage reputation = _reputations[profileId];
        uint256 importMultiplier = 50; // Import 50% of external reputation

        reputation.experience += (exportData.reputation.experience * importMultiplier) / 100;
        reputation.reputation += (exportData.reputation.reputation * importMultiplier) / 100;
        reputation.trust += (exportData.reputation.trust * importMultiplier) / 100;
        reputation.lastUpdated = block.timestamp;

        emit ReputationImported(profileId, exportData.sourceOrganizationId, exportData.reputation.reputation, block.timestamp);
    }

    // =============================================================
    // VIEW FUNCTIONS
    // =============================================================

    /**
     * @dev Get profiles by organization
     */
    function getProfilesByOrganization(bytes32 organizationId)
        external
        view
        override
        returns (bytes32[] memory profileIds)
    {
        return _organizationProfiles[organizationId].values();
    }

    /**
     * @dev Get total number of profiles
     */
    function getProfileCount() external view override returns (uint256 count) {
        return _allProfiles.length();
    }

    /**
     * @dev Get top profiles by reputation
     */
    function getTopProfiles(bytes32 organizationId, uint256 limit)
        external
        view
        override
        returns (bytes32[] memory profileIds)
    {
        bytes32[] memory candidates;

        if (organizationId == bytes32(0)) {
            candidates = _allProfiles.values();
        } else {
            candidates = _organizationProfiles[organizationId].values();
        }

        if (candidates.length == 0) {
            return new bytes32[](0);
        }

        // Simple bubble sort by reputation (for small datasets)
        // In production, consider using a more efficient sorting algorithm or maintaining sorted lists
        bytes32[] memory sorted = new bytes32[](candidates.length);
        for (uint256 i = 0; i < candidates.length; i++) {
            sorted[i] = candidates[i];
        }

        for (uint256 i = 0; i < sorted.length - 1; i++) {
            for (uint256 j = 0; j < sorted.length - i - 1; j++) {
                if (_reputations[sorted[j]].reputation < _reputations[sorted[j + 1]].reputation) {
                    bytes32 temp = sorted[j];
                    sorted[j] = sorted[j + 1];
                    sorted[j + 1] = temp;
                }
            }
        }

        // Return top profiles up to limit
        uint256 resultLength = limit > sorted.length ? sorted.length : limit;
        profileIds = new bytes32[](resultLength);
        for (uint256 i = 0; i < resultLength; i++) {
            profileIds[i] = sorted[i];
        }

        return profileIds;
    }

    /**
     * @dev Calculate voting weight based on reputation
     */
    function calculateVotingWeight(bytes32 profileId, uint256 baseWeight)
        external
        view
        override
        returns (uint256 weight)
    {
        if (_profiles[profileId].owner == address(0)) return baseWeight;

        ReputationData storage reputation = _reputations[profileId];

        // Calculate multiplier based on reputation score
        // reputation is scaled by 1000 (1000 = 1.0x)
        uint256 multiplier = reputation.reputation;

        // Cap the multiplier to prevent excessive voting power
        if (multiplier > 3000) multiplier = 3000; // Max 3x
        if (multiplier < 500) multiplier = 500;   // Min 0.5x

        weight = (baseWeight * multiplier) / REPUTATION_SCALE;
        return weight;
    }

    /**
     * @dev Calculate trust score for campaign validation
     */
    function calculateTrustScore(bytes32 profileId)
        external
        view
        override
        returns (uint256 trustScore)
    {
        if (_profiles[profileId].owner == address(0)) return 0;

        ReputationData storage reputation = _reputations[profileId];
        FeedbackSummary storage feedbackSummary = _feedbackSummaries[profileId];

        // Base trust from reputation system
        uint256 baseTrust = reputation.trust;

        // Feedback-based trust
        uint256 feedbackTrust = 0;
        if (feedbackSummary.totalFeedbacks > 0) {
            feedbackTrust = (feedbackSummary.averageRating * 2000) / 500; // Scale to 0-10000
        }

        // Experience-based trust
        uint256 experienceTrust = reputation.experience / 100; // 1 trust per 100 XP
        if (experienceTrust > 2000) experienceTrust = 2000; // Cap at 2000

        // Verification bonus
        uint256 verificationBonus = 0;
        VerificationLevel level = _verificationLevels[profileId];
        if (level == VerificationLevel.BASIC) verificationBonus = 500;
        else if (level == VerificationLevel.ENHANCED) verificationBonus = 1000;
        else if (level == VerificationLevel.PREMIUM) verificationBonus = 1500;

        // Combine all trust factors
        trustScore = baseTrust + feedbackTrust + experienceTrust + verificationBonus;

        // Cap at maximum trust score
        if (trustScore > TRUST_SCORE_SCALE) trustScore = TRUST_SCORE_SCALE;

        return trustScore;
    }

    // =============================================================
    // INTERNAL FUNCTIONS
    // =============================================================

    /**
     * @dev Update feedback summary after new feedback
     */
    function _updateFeedbackSummary(bytes32 profileId) internal {
        Feedback[] storage feedbacks = _profileFeedbacks[profileId];
        FeedbackSummary storage summary = _feedbackSummaries[profileId];

        uint256 totalFeedbacks = feedbacks.length;
        uint256 positiveFeedbacks = 0;
        uint256 negativeFeedbacks = 0;
        uint256 neutralFeedbacks = 0;
        uint256 totalRating = 0;

        for (uint256 i = 0; i < totalFeedbacks; i++) {
            Feedback storage feedback = feedbacks[i];

            if (feedback.feedbackType == FeedbackType.POSITIVE) {
                positiveFeedbacks++;
            } else if (feedback.feedbackType == FeedbackType.NEGATIVE) {
                negativeFeedbacks++;
            } else if (feedback.feedbackType == FeedbackType.NEUTRAL) {
                neutralFeedbacks++;
            }

            totalRating += feedback.rating;
        }

        summary.totalFeedbacks = totalFeedbacks;
        summary.positiveFeedbacks = positiveFeedbacks;
        summary.negativeFeedbacks = negativeFeedbacks;
        summary.neutralFeedbacks = neutralFeedbacks;
        summary.averageRating = totalFeedbacks > 0 ? (totalRating * 100) / totalFeedbacks : 0;

        // Calculate trust score based on feedback
        if (totalFeedbacks > 0) {
            uint256 positiveRatio = (positiveFeedbacks * 100) / totalFeedbacks;
            summary.trustScore = (positiveRatio * summary.averageRating) / 100;
        } else {
            summary.trustScore = 0;
        }

        // Update reputation trust score
        ReputationData storage reputation = _reputations[profileId];
        reputation.trust = summary.trustScore;
        reputation.totalFeedbacks = totalFeedbacks;
        reputation.positiveFeedbacks = positiveFeedbacks;
        reputation.lastUpdated = block.timestamp;
    }

    /**
     * @dev Validate organization exists through Control module
     */
    function _validateOrganization(bytes32 organizationId) internal view {
        address controlModule = getModule(keccak256("CONTROL"));
        if (controlModule == address(0)) revert OrganizationNotFound(organizationId);

        IControl control = IControl(controlModule);
        if (!control.isOrganizationActive(organizationId)) {
            revert OrganizationNotFound(organizationId);
        }
    }
}
