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
        Pending,     // Application pending approval
        Kicked,
        Banned,
        Exited
    }

    enum OrgState {
        Inactive,
        Active,
        Locked
    }

    // Structs
    struct Organization {
        uint256 index;
        address creator;
        address prime;
        string name;
        string metadataURI;
        OrgType orgType;
        AccessModel accessModel;
        FeeModel feeModel;
        uint256 membershipFee;
        address treasury;
        uint32 memberLimit;
        OrgState state;
        uint256 createdAt;
        uint256 updatedAt;
    }

    struct Member {
        MemberState state;
        uint256 joinedAt;
        uint256 totalContribution;
        bytes32 role;
        uint256 stakedAmount; // $GAME tokens staked
    }

    // Events
    event OrganizationCreated(
        bytes32 indexed orgId,
        address indexed creator,
        address indexed prime,
        string name,
        OrgType orgType,
        uint256 timestamp
    );

    event OrganizationUpdated(
        bytes32 indexed orgId,
        address indexed prime,
        OrgType orgType,
        AccessModel accessModel,
        uint32 memberLimit,
        uint256 timestamp
    );

    event OrganizationStateChanged(
        bytes32 indexed orgId,
        OrgState oldState,
        OrgState newState,
        uint256 timestamp
    );

    event MemberAdded(
        bytes32 indexed orgId,
        address indexed member,
        MemberState state,
        uint256 fee,
        uint256 timestamp
    );

    event MemberStateChanged(
        bytes32 indexed orgId,
        address indexed member,
        MemberState oldState,
        MemberState newState,
        uint256 timestamp
    );

    event MemberRemoved(
        bytes32 indexed orgId,
        address indexed member,
        uint256 timestamp
    );

    event TreasuryFundsSpent(
        bytes32 indexed orgId,
        address indexed beneficiary,
        address indexed token,
        uint256 amount,
        string purpose,
        uint256 timestamp
    );

    event MembershipFeeUpdated(
        bytes32 indexed orgId,
        uint256 oldFee,
        uint256 newFee,
        uint256 timestamp
    );

    // Core Functions
    function createOrganization(
        string memory name,
        string memory metadataURI,
        OrgType orgType,
        AccessModel accessModel,
        FeeModel feeModel,
        uint32 memberLimit,
        uint256 membershipFee,
        uint256 gameStakeRequired
    ) external returns (bytes32 orgId);

    function updateOrganization(
        bytes32 orgId,
        address newPrime,
        OrgType orgType,
        AccessModel accessModel,
        uint32 memberLimit,
        FeeModel feeModel,
        uint256 membershipFee
    ) external;

    function setOrganizationState(bytes32 orgId, OrgState newState) external;

    function join(address account, bytes32 orgId) external;

    function addMember(bytes32 orgId, address member) external;

    function updateMemberState(
        bytes32 orgId,
        address member,
        MemberState newState
    ) external;

    function removeMember(bytes32 orgId, address member) external;

    function spendTreasuryFunds(
        bytes32 orgId,
        address token,
        address beneficiary,
        uint256 amount,
        string memory purpose
    ) external;

    // View Functions
    function getOrganization(bytes32 orgId)
        external
        view
        returns (Organization memory);

    function getMember(bytes32 orgId, address member)
        external
        view
        returns (Member memory);

    function isOrganizationActive(bytes32 orgId) external view returns (bool);

    function isMemberActive(bytes32 orgId, address member)
        external
        view
        returns (bool);

    function getOrganizationCount() external view returns (uint256);

    function getMemberCount(bytes32 orgId) external view returns (uint256);

    function getTreasuryAddress(bytes32 orgId) external view returns (address);

    function getGameStakeRequired(bytes32 orgId) external view returns (uint256);

    function hasRole(
        bytes32 orgId,
        address member,
        bytes32 role
    ) external view returns (bool);

    function canJoinOrganization(bytes32 orgId, address member)
        external
        view
        returns (bool);
}
