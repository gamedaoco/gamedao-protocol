// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.20;

/**
 * @title IMembership
 * @dev Interface for GameDAO Membership Module - Comprehensive membership management
 * @notice Provides organization membership management, role handling, and delegation
 */
interface IMembership {
    // =============================================================
    // ENUMS
    // =============================================================

    enum MembershipTier {
        BRONZE,
        SILVER,
        GOLD,
        PLATINUM
    }

    enum MemberState {
        ACTIVE,
        SUSPENDED,
        PENDING,
        INACTIVE
    }

    // =============================================================
    // STRUCTS
    // =============================================================

    struct Member {
        address account;
        MembershipTier tier;
        MemberState state;
        uint256 joinedAt;
        uint256 votingPower;
        uint256 delegatedPower;
        bool canVote;
        bool canPropose;
        bool canDelegate;
    }

    struct MembershipStats {
        uint256 totalMembers;
        uint256 activeMembers;
        uint256 totalVotingPower;
    }

    struct VotingDelegation {
        address delegator;
        address delegatee;
        uint256 amount;
        uint256 timestamp;
        bool active;
    }

    // =============================================================
    // EVENTS
    // =============================================================

    event MemberAdded(
        bytes8 indexed organizationId,
        address indexed member,
        MembershipTier tier,
        uint256 timestamp
    );

    event MemberRemoved(
        bytes8 indexed organizationId,
        address indexed member,
        uint256 timestamp
    );

    event MemberTierUpdated(
        bytes8 indexed organizationId,
        address indexed member,
        MembershipTier oldTier,
        MembershipTier newTier,
        uint256 timestamp
    );

    event MemberStateUpdated(
        bytes8 indexed organizationId,
        address indexed member,
        MemberState oldState,
        MemberState newState,
        uint256 timestamp
    );

    event VotingPowerUpdated(
        bytes8 indexed organizationId,
        address indexed member,
        uint256 oldPower,
        uint256 newPower,
        uint256 timestamp
    );

    event VotingDelegated(
        bytes8 indexed organizationId,
        address indexed delegator,
        address indexed delegatee,
        uint256 amount,
        uint256 timestamp
    );

    event VotingUndelegated(
        bytes8 indexed organizationId,
        address indexed delegator,
        address indexed delegatee,
        uint256 amount,
        uint256 timestamp
    );

    // =============================================================
    // ERRORS
    // =============================================================

    error OrganizationNotFound(bytes8 organizationId);
    error MemberNotFound(bytes8 organizationId, address member);
    error MemberAlreadyExists(bytes8 organizationId, address member);
    error InvalidMembershipTier(MembershipTier tier);
    error InvalidMemberState(MemberState state);
    error InsufficientVotingPower(address member, uint256 required, uint256 available);
    error InvalidDelegationAmount(uint256 amount);
    error SelfDelegationNotAllowed(address member);
    error OrganizationNotActive(bytes8 organizationId);
    error MemberNotActive(bytes8 organizationId, address member);
    error UnauthorizedAccess(address caller);

    // =============================================================
    // MEMBERSHIP MANAGEMENT
    // =============================================================

    function addMember(
        bytes8 organizationId,
        address member,
        MembershipTier tier
    ) external returns (bool);

    function removeMember(
        bytes8 organizationId,
        address member
    ) external returns (bool);

    function updateMemberTier(
        bytes8 organizationId,
        address member,
        MembershipTier newTier
    ) external returns (bool);

    function updateMemberState(
        bytes8 organizationId,
        address member,
        MemberState newState
    ) external returns (bool);

    function updateVotingPower(
        bytes8 organizationId,
        address member,
        uint256 newVotingPower
    ) external returns (bool);

    // =============================================================
    // VOTING DELEGATION
    // =============================================================

    function delegateVotingPower(
        bytes8 organizationId,
        address delegatee,
        uint256 amount
    ) external returns (bool);

    function undelegateVotingPower(
        bytes8 organizationId,
        address delegatee,
        uint256 amount
    ) external returns (bool);

    function getDelegations(
        bytes8 organizationId,
        address member
    ) external view returns (VotingDelegation[] memory);

    function getTotalDelegatedOut(
        bytes8 organizationId,
        address member
    ) external view returns (uint256);

    function getTotalDelegatedIn(
        bytes8 organizationId,
        address member
    ) external view returns (uint256);

    // =============================================================
    // QUERY FUNCTIONS
    // =============================================================

    function isMember(
        bytes8 organizationId,
        address account
    ) external view returns (bool);

    function getMember(
        bytes8 organizationId,
        address account
    ) external view returns (Member memory);

    function getMembers(
        bytes8 organizationId
    ) external view returns (address[] memory);

    function getMembersByTier(
        bytes8 organizationId,
        MembershipTier tier
    ) external view returns (address[] memory);

    function getMembersByState(
        bytes8 organizationId,
        MemberState state
    ) external view returns (address[] memory);

    function getMemberCount(
        bytes8 organizationId
    ) external view returns (uint256);

    function getMembershipStats(
        bytes8 organizationId
    ) external view returns (MembershipStats memory);

    function getEffectiveVotingPower(
        bytes8 organizationId,
        address member
    ) external view returns (uint256);

    // =============================================================
    // ORGANIZATION MANAGEMENT
    // =============================================================

    function activateOrganization(
        bytes8 organizationId
    ) external returns (bool);

    function deactivateOrganization(
        bytes8 organizationId
    ) external returns (bool);

    function isOrganizationActive(
        bytes8 organizationId
    ) external view returns (bool);
}
