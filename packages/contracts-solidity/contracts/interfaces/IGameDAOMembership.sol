// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.20;

/**
 * @title IGameDAOMembership
 * @dev Interface for the GameDAO Membership contract - Foundation for all membership operations
 * @author GameDAO AG
 * @notice This contract serves as the centralized membership management system for all GameDAO modules
 */
interface IGameDAOMembership {
    // Enums
    enum MemberState {
        Inactive,
        Active,
        Paused,
        Kicked,
        Banned
    }

    enum MembershipTier {
        Basic,
        Premium,
        VIP,
        Founder
    }

    // Structs
    struct Member {
        address account;
        bytes8 profileId;           // Link to Identity profile
        MemberState state;
        MembershipTier tier;
        uint256 joinedAt;
        uint256 lastActiveAt;
        uint256 reputation;
        uint256 votingPower;
        uint256 delegatedPower;
        bool canVote;
        bool canPropose;
        uint256 membershipFee;
        bytes32 metadata;
    }

    struct MembershipStats {
        uint256 totalMembers;
        uint256 activeMembers;
        uint256 totalVotingPower;
        uint256 averageReputation;
        uint256 lastUpdated;
    }

    struct VotingDelegation {
        address delegator;
        address delegatee;
        uint256 amount;
        uint256 timestamp;
        bool active;
    }

    // Events
    event MemberAdded(
        bytes8 indexed organizationId,
        address indexed member,
        bytes8 indexed profileId,
        MembershipTier tier,
        uint256 membershipFee,
        uint256 timestamp
    );

    event MemberRemoved(
        bytes8 indexed organizationId,
        address indexed member,
        bytes8 indexed profileId,
        uint256 timestamp
    );

    event MemberStateChanged(
        bytes8 indexed organizationId,
        address indexed member,
        MemberState oldState,
        MemberState newState,
        uint256 timestamp
    );

    event MemberTierChanged(
        bytes8 indexed organizationId,
        address indexed member,
        MembershipTier oldTier,
        MembershipTier newTier,
        uint256 timestamp
    );

    event VotingPowerUpdated(
        bytes8 indexed organizationId,
        address indexed member,
        uint256 oldPower,
        uint256 newPower,
        uint256 timestamp
    );

    event VotingPowerDelegated(
        bytes8 indexed organizationId,
        address indexed delegator,
        address indexed delegatee,
        uint256 amount,
        uint256 timestamp
    );

    event VotingPowerUndelegated(
        bytes8 indexed organizationId,
        address indexed delegator,
        address indexed delegatee,
        uint256 amount,
        uint256 timestamp
    );

    event ReputationUpdated(
        bytes8 indexed organizationId,
        address indexed member,
        uint256 oldReputation,
        uint256 newReputation,
        bytes32 reason,
        uint256 timestamp
    );

    // Core Membership Functions
    function addMember(
        bytes8 organizationId,
        address member,
        bytes8 profileId,
        MembershipTier tier,
        uint256 membershipFee
    ) external returns (bool success);

    function removeMember(
        bytes8 organizationId,
        address member
    ) external returns (bool success);

    function updateMemberState(
        bytes8 organizationId,
        address member,
        MemberState newState
    ) external returns (bool success);

    function updateMemberTier(
        bytes8 organizationId,
        address member,
        MembershipTier newTier
    ) external returns (bool success);

    // Membership Queries
    function isMember(
        bytes8 organizationId,
        address account
    ) external view returns (bool);

    function isActiveMember(
        bytes8 organizationId,
        address account
    ) external view returns (bool);

    function getMember(
        bytes8 organizationId,
        address account
    ) external view returns (Member memory);

    function getMemberState(
        bytes8 organizationId,
        address account
    ) external view returns (MemberState);

    function getMemberTier(
        bytes8 organizationId,
        address account
    ) external view returns (MembershipTier);

    function getMemberCount(
        bytes8 organizationId
    ) external view returns (uint256);

    function getActiveMembers(
        bytes8 organizationId
    ) external view returns (address[] memory);

    function getAllMembers(
        bytes8 organizationId
    ) external view returns (address[] memory);

    function getMembershipStats(
        bytes8 organizationId
    ) external view returns (MembershipStats memory);

    // Batch Operations
    function isMemberBatch(
        bytes8[] memory organizationIds,
        address account
    ) external view returns (bool[] memory);

    function getMemberBatch(
        bytes8[] memory organizationIds,
        address account
    ) external view returns (Member[] memory);

    function getMemberCountBatch(
        bytes8[] memory organizationIds
    ) external view returns (uint256[] memory);

    // Voting Power Management
    function getVotingPower(
        bytes8 organizationId,
        address account
    ) external view returns (uint256);

    function getTotalVotingPower(
        bytes8 organizationId
    ) external view returns (uint256);

    function updateVotingPower(
        bytes8 organizationId,
        address member,
        uint256 newPower
    ) external returns (bool success);

    function delegateVotingPower(
        bytes8 organizationId,
        address delegatee,
        uint256 amount
    ) external returns (bool success);

    function undelegateVotingPower(
        bytes8 organizationId,
        address delegatee,
        uint256 amount
    ) external returns (bool success);

    function getDelegatedVotingPower(
        bytes8 organizationId,
        address account
    ) external view returns (uint256);

    function getVotingDelegations(
        bytes8 organizationId,
        address account
    ) external view returns (VotingDelegation[] memory);

    // Reputation Management
    function updateReputation(
        bytes8 organizationId,
        address member,
        uint256 newReputation,
        bytes32 reason
    ) external returns (bool success);

    function getReputation(
        bytes8 organizationId,
        address member
    ) external view returns (uint256);

    function getAverageReputation(
        bytes8 organizationId
    ) external view returns (uint256);

    // Permission Checks
    function canVote(
        bytes8 organizationId,
        address account
    ) external view returns (bool);

    function canPropose(
        bytes8 organizationId,
        address account
    ) external view returns (bool);

    function canManageMembers(
        bytes8 organizationId,
        address account
    ) external view returns (bool);

    // Organization Integration
    function getOrganizationExists(
        bytes8 organizationId
    ) external view returns (bool);

    function getMemberOrganizations(
        address account
    ) external view returns (bytes8[] memory);

    function getProfileMemberships(
        bytes8 profileId
    ) external view returns (bytes8[] memory);

    // Admin Functions
    function setOrganizationActive(
        bytes8 organizationId,
        bool active
    ) external returns (bool success);

    function emergencyRemoveMember(
        bytes8 organizationId,
        address member,
        bytes32 reason
    ) external returns (bool success);

    function bulkUpdateMemberStates(
        bytes8 organizationId,
        address[] memory members,
        MemberState[] memory states
    ) external returns (bool success);
}
