// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.20;

/**
 * @title IControl
 * @dev Interface for the Control module - Core DAO infrastructure
 * @author GameDAO AG
 */
interface IControl {
    // Enums
    enum OrgType {
        Individual,
        Company,
        DAO,
        Hybrid
    }

    enum AccessModel {
        Open,        // Anyone can join
        Voting,      // Members vote on new members
        Invite       // Only prime can invite
    }

    enum FeeModel {
        NoFees,      // No membership fees
        Reserve,     // Fees are reserved in member account
        Transfer     // Fees are transferred to treasury
    }

    enum MemberState {
        Inactive,
        Active,
        Paused
    }

    enum OrgState {
        Inactive,
        Active,
        Locked
    }

    // Structs
    struct Organization {
        bytes8 id;                    // 8-character alphanumeric ID as bytes8
        string name;
        string metadataURI;
        address creator;
        address treasury;
        OrgType orgType;
        AccessModel accessModel;
        FeeModel feeModel;
        uint256 memberLimit;
        uint256 memberCount;
        uint256 totalCampaigns;
        uint256 totalProposals;
        uint256 membershipFee;
        uint256 gameStakeRequired;
        OrgState state;
        uint256 createdAt;
        uint256 updatedAt;
    }

    struct Member {
        address account;
        MemberState state;
        uint256 joinedAt;
        uint256 reputation;
        uint256 stake;
    }

    // Events
    event OrganizationCreated(
        bytes8 indexed id,
        string name,
        address indexed creator,
        address indexed treasury,
        uint256 timestamp
    );

    event OrganizationStateChanged(
        bytes8 indexed id,
        OrgState oldState,
        OrgState newState,
        uint256 timestamp
    );

    event MemberAdded(
        bytes8 indexed organizationId,
        address indexed member,
        uint256 timestamp
    );

    event MemberStateChanged(
        bytes8 indexed organizationId,
        address indexed member,
        MemberState oldState,
        MemberState newState,
        uint256 timestamp
    );

    event MemberRemoved(
        bytes8 indexed organizationId,
        address indexed member,
        uint256 timestamp
    );

    // Core functions
    function createOrganization(
        string memory name,
        string memory metadataURI,
        OrgType orgType,
        AccessModel accessModel,
        FeeModel feeModel,
        uint256 memberLimit,
        uint256 membershipFee,
        uint256 gameStakeRequired
    ) external returns (bytes8);

    function addMember(bytes8 organizationId, address member) external;
    function removeMember(bytes8 organizationId, address member) external;
    function updateMemberState(bytes8 organizationId, address member, MemberState state) external;
    function updateOrganizationState(bytes8 organizationId, OrgState state) external;

    // View functions
    function getOrganization(bytes8 id) external view returns (Organization memory);
    function getMember(bytes8 organizationId, address member) external view returns (Member memory);
    function isMember(bytes8 organizationId, address member) external view returns (bool);
    function getOrganizationCount() external view returns (uint256);
    function getAllOrganizations() external view returns (Organization[] memory);
    function getOrganizationsByState(OrgState state) external view returns (Organization[] memory);
    function getMemberCount(bytes8 organizationId) external view returns (uint256);
    function getMembers(bytes8 organizationId) external view returns (address[] memory);
    function isOrganizationActive(bytes8 organizationId) external view returns (bool);
    function isMemberActive(bytes8 organizationId, address member) external view returns (bool);
}
