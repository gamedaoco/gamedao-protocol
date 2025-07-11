// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.20;

import "../../core/GameDAOModule.sol";
import "../../core/Treasury.sol";
import "../../interfaces/IControl.sol";
import "../../interfaces/IGameToken.sol";
import "../../libraries/AlphanumericID.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title Control
 * @dev Core DAO management module for GameDAO protocol
 * @author GameDAO AG
 */
contract Control is GameDAOModule, IControl {
    using EnumerableSet for EnumerableSet.AddressSet;
    using Counters for Counters.Counter;
    using AlphanumericID for bytes32;

    // Constants
    bytes32 public constant MODULE_ID = keccak256("CONTROL");
    uint256 public constant MAX_MEMBER_LIMIT = 10000;
    uint256 public constant MIN_MEMBER_LIMIT = 1;

    // State variables
    Counters.Counter private _organizationCounter;

    // Organization storage
    mapping(bytes8 => Organization) private _organizations;
    mapping(bytes8 => bool) private _organizationExists;
    bytes8[] private _organizationIds;

    // Member storage
    mapping(bytes8 => mapping(address => Member)) private _members;
    mapping(bytes8 => EnumerableSet.AddressSet) private _organizationMembers;

    // Organization state mappings
    mapping(OrgState => mapping(bytes8 => bool)) private _organizationsByState;

    // Game token interface
    IGameToken public gameToken;

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
            _members[orgId][msg.sender].state == MemberState.Active,
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

    constructor(address _gameToken) GameDAOModule("1.0.0") {
        gameToken = IGameToken(_gameToken);
    }

    /**
     * @dev Returns the module ID
     */
    function moduleId() external pure override returns (bytes32) {
        return MODULE_ID;
    }

    /**
     * @dev Create a new organization with 8-character alphanumeric ID
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
    ) external override validMemberLimit(memberLimit) returns (bytes8) {
        require(bytes(name).length > 0, "Organization name cannot be empty");

        // Generate unique 8-character alphanumeric ID
        _organizationCounter.increment();
        uint256 orgIndex = _organizationCounter.current();
        bytes8 orgId = AlphanumericID.generateOrganizationID(MODULE_ID, orgIndex, msg.sender, block.timestamp);

        // Ensure ID is unique (extremely unlikely to collide, but safety first)
        require(!_organizationExists[orgId], "Organization ID collision");

        // Create treasury for the organization
        // Convert bytes8 ID to bytes32 for Treasury compatibility
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
            memberCount: 0,
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
        _organizationsByState[OrgState.Active][orgId] = true;

        // Add creator as first member
        _addMemberInternal(orgId, msg.sender);

        emit OrganizationCreated(orgId, name, msg.sender, address(treasury), block.timestamp);

        return orgId;
    }

    /**
     * @dev Add a member to an organization
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
            require(_members[organizationId][msg.sender].state == MemberState.Active, "Only active members can vote");
            // TODO: Implement voting mechanism
        }
        // AccessModel.Open allows anyone to join

        _addMemberInternal(organizationId, member);
    }

    /**
     * @dev Remove a member from an organization
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

        require(_organizationMembers[organizationId].contains(member), "Not a member");

        // Remove member
        _organizationMembers[organizationId].remove(member);
        delete _members[organizationId][member];

        // Update member count
        org.memberCount--;
        org.updatedAt = block.timestamp;

        emit MemberRemoved(organizationId, member, block.timestamp);
    }

    /**
     * @dev Update member state
     */
    function updateMemberState(
        bytes8 organizationId,
        address member,
        MemberState state
    ) external override organizationExists(organizationId) onlyOrganizationCreator(organizationId) {
        require(_organizationMembers[organizationId].contains(member), "Not a member");

        MemberState oldState = _members[organizationId][member].state;
        _members[organizationId][member].state = state;

        emit MemberStateChanged(organizationId, member, oldState, state, block.timestamp);
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

        // Update state mappings
        _organizationsByState[oldState][organizationId] = false;
        _organizationsByState[state][organizationId] = true;

        emit OrganizationStateChanged(organizationId, oldState, state, block.timestamp);
    }

    /**
     * @dev Internal function to add a member
     */
    function _addMemberInternal(bytes8 organizationId, address member) internal {
        Organization storage org = _organizations[organizationId];

        require(org.memberCount < org.memberLimit, "Member limit reached");
        require(!_organizationMembers[organizationId].contains(member), "Already a member");

        // Handle membership fee
        if (org.membershipFee > 0) {
            require(
                gameToken.transferFrom(member, org.treasury, org.membershipFee),
                "Membership fee transfer failed"
            );
        }

        // Add member
        _organizationMembers[organizationId].add(member);
        _members[organizationId][member] = Member({
            account: member,
            state: MemberState.Active,
            joinedAt: block.timestamp,
            reputation: 0,
            stake: 0
        });

        // Update member count
        org.memberCount++;
        org.updatedAt = block.timestamp;

        emit MemberAdded(organizationId, member, block.timestamp);
    }

    // View functions
    function getOrganization(bytes8 id) external view override returns (Organization memory) {
        require(_organizationExists[id], "Organization does not exist");
        return _organizations[id];
    }

    function getMember(bytes8 organizationId, address member)
        external
        view
        override
        returns (Member memory)
    {
        require(_organizationExists[organizationId], "Organization does not exist");
        require(_organizationMembers[organizationId].contains(member), "Not a member");
        return _members[organizationId][member];
    }

    function isMember(bytes8 organizationId, address member)
        external
        view
        override
        returns (bool)
    {
        return _organizationMembers[organizationId].contains(member);
    }

    function getOrganizationCount() external view override returns (uint256) {
        return _organizationIds.length;
    }

    function getAllOrganizations() external view override returns (Organization[] memory) {
        Organization[] memory orgs = new Organization[](_organizationIds.length);
        for (uint256 i = 0; i < _organizationIds.length; i++) {
            orgs[i] = _organizations[_organizationIds[i]];
        }
        return orgs;
    }

    function getOrganizationsByState(OrgState state)
        external
        view
        override
        returns (Organization[] memory)
    {
        // Count organizations in this state
        uint256 count = 0;
        for (uint256 i = 0; i < _organizationIds.length; i++) {
            if (_organizationsByState[state][_organizationIds[i]]) {
                count++;
            }
        }

        // Create array and populate
        Organization[] memory orgs = new Organization[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < _organizationIds.length; i++) {
            if (_organizationsByState[state][_organizationIds[i]]) {
                orgs[index] = _organizations[_organizationIds[i]];
                index++;
            }
        }
        return orgs;
    }

    function getMemberCount(bytes8 organizationId)
        external
        view
        override
        returns (uint256)
    {
        require(_organizationExists[organizationId], "Organization does not exist");
        return _organizations[organizationId].memberCount;
    }

    function getMembers(bytes8 organizationId)
        external
        view
        override
        returns (address[] memory)
    {
        require(_organizationExists[organizationId], "Organization does not exist");
        return _organizationMembers[organizationId].values();
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
        return _organizationExists[organizationId] &&
               _organizationMembers[organizationId].contains(member) &&
               _members[organizationId][member].state == MemberState.Active;
    }
}
