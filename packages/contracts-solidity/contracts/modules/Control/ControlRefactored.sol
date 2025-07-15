// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.20;

import "../../core/GameDAOModule.sol";
import "../../core/Treasury.sol";
import "../../interfaces/IControl.sol";
import "../../interfaces/IGameStaking.sol";
import "../../interfaces/IGameDAOMembership.sol";
import "../../libraries/AlphanumericID.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title Control (Refactored)
 * @dev Core DAO management module for GameDAO protocol - Membership delegated to GameDAOMembership
 * @author GameDAO AG
 * @notice Refactored to use Identity → Membership → Everything Else architecture
 */
contract Control is GameDAOModule, IControl {
    using Counters for Counters.Counter;
    using AlphanumericID for bytes32;

    // Constants
    bytes32 public constant MODULE_ID = keccak256("CONTROL");
    uint256 public constant MAX_MEMBER_LIMIT = 10000;
    uint256 public constant MIN_MEMBER_LIMIT = 1;
    uint256 public constant MIN_STAKE_AMOUNT = 10000 * 10**18; // 10,000 GAME tokens minimum

    // State variables
    Counters.Counter private _organizationCounter;

    // Organization storage (NO MEMBER STORAGE - delegated to GameDAOMembership)
    mapping(bytes8 => Organization) private _organizations;
    mapping(bytes8 => bool) private _organizationExists;
    bytes8[] private _organizationIds;

    // Contract references
    IGameStaking public gameStaking;
    IGameDAOMembership public membershipContract;

    // Events
    event StakeWithdrawn(bytes8 indexed organizationId, address indexed staker, uint256 amount, uint256 timestamp);

    // Modifiers
    modifier organizationExists(bytes8 orgId) {
        require(_organizationExists[orgId], "Organization does not exist");
        _;
    }

    modifier onlyOrganizationCreator(bytes8 orgId) {
        require(_organizations[orgId].creator == msg.sender, "Not organization creator");
        _;
    }

    modifier onlyActiveMember(bytes8 orgId) {
        require(
            membershipContract.isActiveMember(orgId, msg.sender),
            "Not an active member"
        );
        _;
    }

    modifier validMemberLimit(uint256 limit) {
        require(
            limit >= MIN_MEMBER_LIMIT && limit <= MAX_MEMBER_LIMIT,
            "Invalid member limit"
        );
        _;
    }

    modifier validStakeAmount(uint256 amount) {
        require(amount >= MIN_STAKE_AMOUNT, "Stake amount below minimum");
        _;
    }

    constructor(
        address _gameStaking,
        address _membershipContract
    ) GameDAOModule("1.0.0") {
        require(_gameStaking != address(0), "Invalid game staking address");
        require(_membershipContract != address(0), "Invalid membership contract address");

        gameStaking = IGameStaking(_gameStaking);
        membershipContract = IGameDAOMembership(_membershipContract);
    }

    /**
     * @dev Returns the module ID
     */
    function moduleId() external pure override returns (bytes32) {
        return MODULE_ID;
    }

    /**
     * @dev Create a new organization with staking through GameStaking contract
     */
    function createOrganization(
        string memory name,
        string memory metadataURI,
        OrgType orgType,
        AccessModel accessModel,
        FeeModel feeModel,
        uint256 memberLimit,
        uint256 membershipFee,
        uint256 gameStakeRequired
    ) external override validMemberLimit(memberLimit) validStakeAmount(gameStakeRequired) nonReentrant returns (bytes8) {
        require(bytes(name).length > 0, "Organization name cannot be empty");

        // Generate unique 8-character alphanumeric ID
        _organizationCounter.increment();
        uint256 orgIndex = _organizationCounter.current();
        bytes8 orgId = AlphanumericID.generateOrganizationID(MODULE_ID, orgIndex, msg.sender, block.timestamp);

        // Ensure ID is unique (extremely unlikely to collide, but safety first)
        require(!_organizationExists[orgId], "Organization ID collision");

        // Create stake through GameStaking contract
        gameStaking.stakeForOrganization(orgId, msg.sender, gameStakeRequired);

        // Create treasury for the organization
        bytes32 orgIdBytes32 = keccak256(abi.encodePacked(orgId));
        Treasury treasury = new Treasury(orgIdBytes32, address(this), msg.sender);

        // Create organization
        Organization memory newOrg = Organization({
            id: orgId,
            name: name,
            metadataURI: metadataURI,
            creator: msg.sender,
            treasury: address(treasury),
            orgType: orgType,
            accessModel: accessModel,
            feeModel: feeModel,
            memberLimit: memberLimit,
            memberCount: 0, // Will be managed by membershipContract
            totalCampaigns: 0,
            totalProposals: 0,
            membershipFee: membershipFee,
            gameStakeRequired: gameStakeRequired,
            state: OrgState.Active,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });

        // Store organization
        _organizations[orgId] = newOrg;
        _organizationExists[orgId] = true;
        _organizationIds.push(orgId);

        // Register organization with membership contract
        membershipContract.setOrganizationActive(orgId, true);

        // Add creator as first member through membership contract
        membershipContract.addMember(
            orgId,
            msg.sender,
            0x0000000000000000, // No profile ID for now
            IGameDAOMembership.MembershipTier.Founder,
            0 // No fee for creator
        );

        emit OrganizationCreated(orgId, name, msg.sender, address(treasury), block.timestamp);

        return orgId;
    }

    /**
     * @dev Withdraw stake from an organization through GameStaking contract
     */
    function withdrawStake(bytes8 organizationId)
        external
        override
        organizationExists(organizationId)
        onlyOrganizationCreator(organizationId)
        nonReentrant
    {
        // Check if organization is in the correct state
        Organization storage org = _organizations[organizationId];
        require(
            org.state == OrgState.Inactive || org.state == OrgState.Dissolved,
            "Organization must be inactive or dissolved"
        );

        // Delegate to GameStaking contract
        gameStaking.withdrawOrganizationStake(organizationId, msg.sender);

        // Get stake info for event (simplified)
        emit StakeWithdrawn(organizationId, msg.sender, 0, block.timestamp);
    }

    /**
     * @dev Get organization stake information
     */
    function getOrganizationStake(bytes8 organizationId)
        external
        view
        organizationExists(organizationId)
        returns (IGameStaking.OrganizationStake memory)
    {
        return gameStaking.getOrganizationStake(organizationId);
    }

    /**
     * @dev Check if organization stake can be withdrawn
     */
    function canWithdrawStake(bytes8 organizationId)
        external
        view
        organizationExists(organizationId)
        returns (bool)
    {
        Organization storage org = _organizations[organizationId];
        return (org.state == OrgState.Inactive || org.state == OrgState.Dissolved) &&
               gameStaking.canWithdrawOrganizationStake(organizationId);
    }

    // =============================================================
    // MEMBER MANAGEMENT - DELEGATED TO MEMBERSHIP CONTRACT
    // =============================================================

    /**
     * @dev Add a member to an organization (delegated)
     */
    function addMember(bytes8 organizationId, address member)
        external
        override
        organizationExists(organizationId)
        nonReentrant
    {
        Organization storage org = _organizations[organizationId];

        // Check permissions
        if (org.accessModel == AccessModel.Invite) {
            require(msg.sender == org.creator, "Only creator can invite members");
        } else if (org.accessModel == AccessModel.Voting) {
            require(membershipContract.isActiveMember(organizationId, msg.sender), "Only active members can vote");
            // TODO: Implement voting mechanism
        }
        // AccessModel.Open allows anyone to join

        // Delegate to membership contract
        membershipContract.addMember(
            organizationId,
            member,
            0x0000000000000000, // No profile ID for now
            IGameDAOMembership.MembershipTier.Basic,
            org.membershipFee
        );

        // Update organization member count
        org.memberCount = membershipContract.getMemberCount(organizationId);
        org.updatedAt = block.timestamp;
    }

    /**
     * @dev Remove a member from an organization (delegated)
     */
    function removeMember(bytes8 organizationId, address member)
        external
        override
        organizationExists(organizationId)
        nonReentrant
    {
        Organization storage org = _organizations[organizationId];

        // Only creator can remove members, or member can remove themselves
        require(
            msg.sender == org.creator || msg.sender == member,
            "Not authorized to remove member"
        );

        // Delegate to membership contract
        membershipContract.removeMember(organizationId, member);

        // Update organization member count
        org.memberCount = membershipContract.getMemberCount(organizationId);
        org.updatedAt = block.timestamp;
    }

    /**
     * @dev Update member state (delegated)
     */
    function updateMemberState(
        bytes8 organizationId,
        address member,
        MemberState state
    ) external override organizationExists(organizationId) onlyOrganizationCreator(organizationId) {
        // Convert Control MemberState to Membership MemberState
        IGameDAOMembership.MemberState membershipState;
        if (state == MemberState.Inactive) {
            membershipState = IGameDAOMembership.MemberState.Inactive;
        } else if (state == MemberState.Active) {
            membershipState = IGameDAOMembership.MemberState.Active;
        } else if (state == MemberState.Paused) {
            membershipState = IGameDAOMembership.MemberState.Paused;
        }

        // Delegate to membership contract
        membershipContract.updateMemberState(organizationId, member, membershipState);
    }

    /**
     * @dev Update organization state
     */
    function updateOrganizationState(
        bytes8 organizationId,
        OrgState state
    ) external override organizationExists(organizationId) onlyOrganizationCreator(organizationId) {
        Organization storage org = _organizations[organizationId];

        OrgState oldState = org.state;
        org.state = state;
        org.updatedAt = block.timestamp;

        // Update membership contract if organization becomes inactive
        if (state == OrgState.Inactive || state == OrgState.Dissolved) {
            membershipContract.setOrganizationActive(organizationId, false);
        } else if (state == OrgState.Active) {
            membershipContract.setOrganizationActive(organizationId, true);
        }

        emit OrganizationStateChanged(organizationId, oldState, state, block.timestamp);
    }

    // =============================================================
    // VIEW FUNCTIONS - DELEGATED TO MEMBERSHIP CONTRACT
    // =============================================================

    function getOrganization(bytes8 id) external view override returns (Organization memory) {
        require(_organizationExists[id], "Organization does not exist");
        Organization memory org = _organizations[id];

        // Update member count from membership contract
        org.memberCount = membershipContract.getMemberCount(id);

        return org;
    }

    function getMember(bytes8 organizationId, address member)
        external
        view
        override
        returns (Member memory)
    {
        require(_organizationExists[organizationId], "Organization does not exist");

        // Get member from membership contract and convert to Control format
        IGameDAOMembership.Member memory membershipMember = membershipContract.getMember(organizationId, member);

        // Convert membership member to Control member format
        Member memory controlMember = Member({
            account: membershipMember.account,
            state: _convertMemberState(membershipMember.state),
            joinedAt: membershipMember.joinedAt,
            reputation: membershipMember.reputation,
            stake: 0 // Not used in new architecture
        });

        return controlMember;
    }

    function isMember(bytes8 organizationId, address member)
        external
        view
        override
        returns (bool)
    {
        return membershipContract.isMember(organizationId, member);
    }

    function getOrganizationCount() external view override returns (uint256) {
        return _organizationIds.length;
    }

    function getAllOrganizations() external view override returns (Organization[] memory) {
        // Keep simplified - use subgraph for complex queries
        revert("Use subgraph for bulk queries");
    }

    function getOrganizationsByState(OrgState state)
        external
        view
        override
        returns (Organization[] memory)
    {
        // Keep simplified - use subgraph for complex queries
        revert("Use subgraph for state queries");
    }

    function getMemberCount(bytes8 organizationId)
        external
        view
        override
        returns (uint256)
    {
        require(_organizationExists[organizationId], "Organization does not exist");
        return membershipContract.getMemberCount(organizationId);
    }

    function getMembers(bytes8 organizationId)
        external
        view
        override
        returns (address[] memory)
    {
        require(_organizationExists[organizationId], "Organization does not exist");
        return membershipContract.getAllMembers(organizationId);
    }

    function isOrganizationActive(bytes8 organizationId)
        external
        view
        override
        returns (bool)
    {
        return _organizationExists[organizationId] && _organizations[organizationId].state == OrgState.Active;
    }

    function isMemberActive(bytes8 organizationId, address member)
        external
        view
        override
        returns (bool)
    {
        return _organizationExists[organizationId] && membershipContract.isActiveMember(organizationId, member);
    }

    // =============================================================
    // INTERNAL FUNCTIONS
    // =============================================================

    /**
     * @dev Convert membership contract MemberState to Control MemberState
     */
    function _convertMemberState(IGameDAOMembership.MemberState membershipState) internal pure returns (MemberState) {
        if (membershipState == IGameDAOMembership.MemberState.Inactive) {
            return MemberState.Inactive;
        } else if (membershipState == IGameDAOMembership.MemberState.Active) {
            return MemberState.Active;
        } else if (membershipState == IGameDAOMembership.MemberState.Paused) {
            return MemberState.Paused;
        }
        return MemberState.Inactive; // Default
    }
}
