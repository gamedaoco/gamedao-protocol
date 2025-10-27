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
        Locked,
        Dissolved
    }

    // Structs
    struct Organization {
        bytes8 id;                    // 8-character alphanumeric ID as bytes8
        string name;
        string metadataURI;
        address creator;
        address prime;                // elected prime responsible entity (EOA or contract)
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

    event OrganizationPrimeUpdated(
        bytes8 indexed id,
        address indexed oldPrime,
        address indexed newPrime,
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

    function updateOrganizationState(bytes8 organizationId, OrgState state) external;
    function updateOrganizationPrime(bytes8 organizationId, address newPrime) external;
    function updateMemberCount(bytes8 organizationId, uint256 memberCount) external;
    function withdrawStake(bytes8 organizationId) external;
    function registerOrganization(bytes8 organizationId, Organization memory org) external;

    // View functions
    function getOrganization(bytes8 id) external view returns (Organization memory);
    function getOrganizationCount() external view returns (uint256);
    function getAllOrganizations() external view returns (Organization[] memory);
    function getOrganizationsByState(OrgState state) external view returns (Organization[] memory);
    function isOrganizationActive(bytes8 organizationId) external view returns (bool);
}
