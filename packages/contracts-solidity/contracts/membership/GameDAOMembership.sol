// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IGameDAOMembership.sol";
import "../interfaces/IIdentity.sol";
import "../interfaces/IControl.sol";

/**
 * @title GameDAOMembership
 * @dev Centralized membership management system for GameDAO protocol
 * @author GameDAO AG
 * @notice Foundation contract for all membership operations across GameDAO modules
 * @dev Architecture: Identity → Membership → Everything Else
 */
contract GameDAOMembership is IGameDAOMembership, AccessControl, ReentrancyGuard, Pausable {
    using EnumerableSet for EnumerableSet.AddressSet;
    using EnumerableSet for EnumerableSet.Bytes32Set;
    using SafeERC20 for IERC20;

    // =============================================================
    // CONSTANTS
    // =============================================================

    bytes32 public constant MEMBERSHIP_ADMIN_ROLE = keccak256("MEMBERSHIP_ADMIN_ROLE");
    bytes32 public constant ORGANIZATION_MANAGER_ROLE = keccak256("ORGANIZATION_MANAGER_ROLE");
    bytes32 public constant REPUTATION_MANAGER_ROLE = keccak256("REPUTATION_MANAGER_ROLE");

    uint256 public constant MAX_DELEGATION_AMOUNT = 1000000 * 10**18; // 1M tokens max delegation
    uint256 public constant MIN_REPUTATION = 0;
    uint256 public constant MAX_REPUTATION = 10000; // 10.0x multiplier
    uint256 public constant DEFAULT_VOTING_POWER = 1;

    // =============================================================
    // STATE VARIABLES
    // =============================================================

    // Core membership storage
    mapping(bytes8 => mapping(address => Member)) private _members;
    mapping(bytes8 => EnumerableSet.AddressSet) private _organizationMembers;
    mapping(address => EnumerableSet.Bytes32Set) private _userMemberships;
    mapping(bytes8 => EnumerableSet.Bytes32Set) private _profileMemberships;

    // Organization tracking
    mapping(bytes8 => bool) private _organizationExists;
    mapping(bytes8 => MembershipStats) private _membershipStats;

    // Voting power and delegation
    mapping(bytes8 => mapping(address => uint256)) private _votingPower;
    mapping(bytes8 => mapping(address => uint256)) private _delegatedOut;
    mapping(bytes8 => mapping(address => uint256)) private _delegatedIn;
    mapping(bytes8 => mapping(address => mapping(address => uint256))) private _delegations;
    mapping(bytes8 => mapping(address => VotingDelegation[])) private _delegationHistory;

    // Contract references
    address public identityContract;
    address public controlContract;
    address public gameToken;

    // =============================================================
    // CONSTRUCTOR
    // =============================================================

    /**
     * @dev Constructor
     * @param _identityContract Address of the Identity contract
     * @param _controlContract Address of the Control contract
     * @param _gameToken Address of the GAME token contract
     */
    constructor(
        address _identityContract,
        address _controlContract,
        address _gameToken
    ) {
        require(_identityContract != address(0), "Invalid identity contract");
        require(_controlContract != address(0), "Invalid control contract");
        require(_gameToken != address(0), "Invalid game token");

        identityContract = _identityContract;
        controlContract = _controlContract;
        gameToken = _gameToken;

        // Grant roles to deployer
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _grantRole(MEMBERSHIP_ADMIN_ROLE, _msgSender());
        _grantRole(ORGANIZATION_MANAGER_ROLE, _msgSender());
        _grantRole(REPUTATION_MANAGER_ROLE, _msgSender());

        // Grant roles to Control contract
        _grantRole(ORGANIZATION_MANAGER_ROLE, _controlContract);
    }

    // =============================================================
    // MODIFIERS
    // =============================================================

    modifier organizationExists(bytes8 organizationId) {
        require(_organizationExists[organizationId], "Organization does not exist");
        _;
    }

    modifier validMember(bytes8 organizationId, address member) {
        require(_organizationMembers[organizationId].contains(member), "Not a member");
        _;
    }

    modifier validProfile(bytes8 profileId) {
        require(IIdentity(identityContract).profileExists(profileId), "Profile does not exist");
        _;
    }

    // =============================================================
    // CORE MEMBERSHIP FUNCTIONS
    // =============================================================

    /**
     * @dev Add a member to an organization
     */
    function addMember(
        bytes8 organizationId,
        address member,
        bytes8 profileId,
        MembershipTier tier,
        uint256 membershipFee
    ) external override onlyRole(ORGANIZATION_MANAGER_ROLE) whenNotPaused nonReentrant returns (bool) {
        require(member != address(0), "Invalid member address");
        require(!_organizationMembers[organizationId].contains(member), "Already a member");

        // Validate profile exists and belongs to member
        if (profileId != 0x0000000000000000) {
            IIdentity identity = IIdentity(identityContract);
            require(identity.profileExists(profileId), "Profile does not exist");
            // TODO: Add profile ownership validation
        }

        // Create member record
        Member storage newMember = _members[organizationId][member];
        newMember.account = member;
        newMember.profileId = profileId;
        newMember.state = MemberState.Active;
        newMember.tier = tier;
        newMember.joinedAt = block.timestamp;
        newMember.lastActiveAt = block.timestamp;
        newMember.reputation = 1000; // Default 1.0x reputation
        newMember.votingPower = DEFAULT_VOTING_POWER;
        newMember.delegatedPower = 0;
        newMember.canVote = true;
        newMember.canPropose = true;
        newMember.membershipFee = membershipFee;

        // Add to tracking sets
        _organizationMembers[organizationId].add(member);
        _userMemberships[member].add(bytes32(organizationId));

        if (profileId != 0x0000000000000000) {
            _profileMemberships[profileId].add(bytes32(organizationId));
        }

        // Update organization stats
        _updateMembershipStats(organizationId);

        emit MemberAdded(organizationId, member, profileId, tier, membershipFee, block.timestamp);

        return true;
    }

    /**
     * @dev Remove a member from an organization
     */
    function removeMember(
        bytes8 organizationId,
        address member
    ) external override onlyRole(ORGANIZATION_MANAGER_ROLE) organizationExists(organizationId) validMember(organizationId, member) whenNotPaused nonReentrant returns (bool) {
        Member storage memberData = _members[organizationId][member];
        bytes8 profileId = memberData.profileId;

        // Remove from tracking sets
        _organizationMembers[organizationId].remove(member);
        _userMemberships[member].remove(bytes32(organizationId));

        if (profileId != 0x0000000000000000) {
            _profileMemberships[profileId].remove(bytes32(organizationId));
        }

        // Clear delegations
        _clearMemberDelegations(organizationId, member);

        // Delete member record
        delete _members[organizationId][member];

        // Update organization stats
        _updateMembershipStats(organizationId);

        emit MemberRemoved(organizationId, member, profileId, block.timestamp);

        return true;
    }

    /**
     * @dev Update member state
     */
    function updateMemberState(
        bytes8 organizationId,
        address member,
        MemberState newState
    ) external override onlyRole(ORGANIZATION_MANAGER_ROLE) organizationExists(organizationId) validMember(organizationId, member) whenNotPaused returns (bool) {
        Member storage memberData = _members[organizationId][member];
        MemberState oldState = memberData.state;

        memberData.state = newState;
        memberData.lastActiveAt = block.timestamp;

        // Update voting permissions based on state
        memberData.canVote = (newState == MemberState.Active);
        memberData.canPropose = (newState == MemberState.Active);

        // Update organization stats
        _updateMembershipStats(organizationId);

        emit MemberStateChanged(organizationId, member, oldState, newState, block.timestamp);

        return true;
    }

    /**
     * @dev Update member tier
     */
    function updateMemberTier(
        bytes8 organizationId,
        address member,
        MembershipTier newTier
    ) external override onlyRole(ORGANIZATION_MANAGER_ROLE) organizationExists(organizationId) validMember(organizationId, member) whenNotPaused returns (bool) {
        Member storage memberData = _members[organizationId][member];
        MembershipTier oldTier = memberData.tier;

        memberData.tier = newTier;
        memberData.lastActiveAt = block.timestamp;

        // Update voting power based on tier
        _updateVotingPowerForTier(organizationId, member, newTier);

        emit MemberTierChanged(organizationId, member, oldTier, newTier, block.timestamp);

        return true;
    }

    // =============================================================
    // MEMBERSHIP QUERIES
    // =============================================================

    /**
     * @dev Check if address is a member of organization
     */
    function isMember(bytes8 organizationId, address account) external view override returns (bool) {
        return _organizationMembers[organizationId].contains(account);
    }

    /**
     * @dev Check if address is an active member of organization
     */
    function isActiveMember(bytes8 organizationId, address account) external view override returns (bool) {
        return _organizationMembers[organizationId].contains(account) &&
               _members[organizationId][account].state == MemberState.Active;
    }

    /**
     * @dev Get member data
     */
    function getMember(bytes8 organizationId, address account) external view override returns (Member memory) {
        require(_organizationMembers[organizationId].contains(account), "Not a member");
        return _members[organizationId][account];
    }

    /**
     * @dev Get member state
     */
    function getMemberState(bytes8 organizationId, address account) external view override returns (MemberState) {
        require(_organizationMembers[organizationId].contains(account), "Not a member");
        return _members[organizationId][account].state;
    }

    /**
     * @dev Get member tier
     */
    function getMemberTier(bytes8 organizationId, address account) external view override returns (MembershipTier) {
        require(_organizationMembers[organizationId].contains(account), "Not a member");
        return _members[organizationId][account].tier;
    }

    /**
     * @dev Get member count for organization
     */
    function getMemberCount(bytes8 organizationId) external view override returns (uint256) {
        return _organizationMembers[organizationId].length();
    }

    /**
     * @dev Get active members of organization
     */
    function getActiveMembers(bytes8 organizationId) external view override returns (address[] memory) {
        address[] memory allMembers = _organizationMembers[organizationId].values();
        uint256 activeCount = 0;

        // Count active members
        for (uint256 i = 0; i < allMembers.length; i++) {
            if (_members[organizationId][allMembers[i]].state == MemberState.Active) {
                activeCount++;
            }
        }

        // Build active members array
        address[] memory activeMembers = new address[](activeCount);
        uint256 index = 0;
        for (uint256 i = 0; i < allMembers.length; i++) {
            if (_members[organizationId][allMembers[i]].state == MemberState.Active) {
                activeMembers[index] = allMembers[i];
                index++;
            }
        }

        return activeMembers;
    }

    /**
     * @dev Get all members of organization
     */
    function getAllMembers(bytes8 organizationId) external view override returns (address[] memory) {
        return _organizationMembers[organizationId].values();
    }

    /**
     * @dev Get membership statistics for organization
     */
    function getMembershipStats(bytes8 organizationId) external view override returns (MembershipStats memory) {
        return _membershipStats[organizationId];
    }

    // =============================================================
    // BATCH OPERATIONS
    // =============================================================

    /**
     * @dev Check membership across multiple organizations
     */
    function isMemberBatch(
        bytes8[] memory organizationIds,
        address account
    ) external view override returns (bool[] memory) {
        bool[] memory results = new bool[](organizationIds.length);

        for (uint256 i = 0; i < organizationIds.length; i++) {
            results[i] = _organizationMembers[organizationIds[i]].contains(account);
        }

        return results;
    }

    /**
     * @dev Get member data across multiple organizations
     */
    function getMemberBatch(
        bytes8[] memory organizationIds,
        address account
    ) external view override returns (Member[] memory) {
        Member[] memory results = new Member[](organizationIds.length);

        for (uint256 i = 0; i < organizationIds.length; i++) {
            if (_organizationMembers[organizationIds[i]].contains(account)) {
                results[i] = _members[organizationIds[i]][account];
            }
            // Returns empty struct if not a member
        }

        return results;
    }

    /**
     * @dev Get member counts for multiple organizations
     */
    function getMemberCountBatch(
        bytes8[] memory organizationIds
    ) external view override returns (uint256[] memory) {
        uint256[] memory results = new uint256[](organizationIds.length);

        for (uint256 i = 0; i < organizationIds.length; i++) {
            results[i] = _organizationMembers[organizationIds[i]].length();
        }

        return results;
    }

    // =============================================================
    // VOTING POWER MANAGEMENT
    // =============================================================

    /**
     * @dev Get voting power for member
     */
    function getVotingPower(bytes8 organizationId, address account) external view override returns (uint256) {
        if (!_organizationMembers[organizationId].contains(account)) {
            return 0;
        }

        Member memory member = _members[organizationId][account];
        if (member.state != MemberState.Active) {
            return 0;
        }

        // Base voting power + delegated power
        return member.votingPower + _delegatedIn[organizationId][account];
    }

    /**
     * @dev Get total voting power for organization
     */
    function getTotalVotingPower(bytes8 organizationId) external view override returns (uint256) {
        return _membershipStats[organizationId].totalVotingPower;
    }

    /**
     * @dev Update voting power for member
     */
    function updateVotingPower(
        bytes8 organizationId,
        address member,
        uint256 newPower
    ) external override onlyRole(REPUTATION_MANAGER_ROLE) organizationExists(organizationId) validMember(organizationId, member) returns (bool) {
        Member storage memberData = _members[organizationId][member];
        uint256 oldPower = memberData.votingPower;

        memberData.votingPower = newPower;

        // Update organization stats
        _updateMembershipStats(organizationId);

        emit VotingPowerUpdated(organizationId, member, oldPower, newPower, block.timestamp);

        return true;
    }

    /**
     * @dev Delegate voting power to another member
     */
    function delegateVotingPower(
        bytes8 organizationId,
        address delegatee,
        uint256 amount
    ) external override organizationExists(organizationId) validMember(organizationId, _msgSender()) validMember(organizationId, delegatee) whenNotPaused nonReentrant returns (bool) {
        require(amount > 0, "Amount must be greater than 0");
        require(delegatee != _msgSender(), "Cannot delegate to self");

        Member storage delegator = _members[organizationId][_msgSender()];
        require(delegator.votingPower >= amount, "Insufficient voting power");

        // Update delegations
        _delegations[organizationId][_msgSender()][delegatee] += amount;
        _delegatedOut[organizationId][_msgSender()] += amount;
        _delegatedIn[organizationId][delegatee] += amount;

        // Update delegator's available voting power
        delegator.votingPower -= amount;
        delegator.delegatedPower += amount;

        // Record delegation history
        _delegationHistory[organizationId][_msgSender()].push(VotingDelegation({
            delegator: _msgSender(),
            delegatee: delegatee,
            amount: amount,
            timestamp: block.timestamp,
            active: true
        }));

        emit VotingPowerDelegated(organizationId, _msgSender(), delegatee, amount, block.timestamp);

        return true;
    }

    /**
     * @dev Undelegate voting power from another member
     */
    function undelegateVotingPower(
        bytes8 organizationId,
        address delegatee,
        uint256 amount
    ) external override organizationExists(organizationId) validMember(organizationId, _msgSender()) whenNotPaused nonReentrant returns (bool) {
        require(amount > 0, "Amount must be greater than 0");
        require(_delegations[organizationId][_msgSender()][delegatee] >= amount, "Insufficient delegated amount");

        Member storage delegator = _members[organizationId][_msgSender()];

        // Update delegations
        _delegations[organizationId][_msgSender()][delegatee] -= amount;
        _delegatedOut[organizationId][_msgSender()] -= amount;
        _delegatedIn[organizationId][delegatee] -= amount;

        // Return voting power to delegator
        delegator.votingPower += amount;
        delegator.delegatedPower -= amount;

        emit VotingPowerUndelegated(organizationId, _msgSender(), delegatee, amount, block.timestamp);

        return true;
    }

    /**
     * @dev Get delegated voting power for account
     */
    function getDelegatedVotingPower(bytes8 organizationId, address account) external view override returns (uint256) {
        return _delegatedIn[organizationId][account];
    }

    /**
     * @dev Get voting delegations for account
     */
    function getVotingDelegations(bytes8 organizationId, address account) external view override returns (VotingDelegation[] memory) {
        return _delegationHistory[organizationId][account];
    }

    // =============================================================
    // REPUTATION MANAGEMENT
    // =============================================================

    /**
     * @dev Update reputation for member
     */
    function updateReputation(
        bytes8 organizationId,
        address member,
        uint256 newReputation,
        bytes32 reason
    ) external override onlyRole(REPUTATION_MANAGER_ROLE) organizationExists(organizationId) validMember(organizationId, member) returns (bool) {
        require(newReputation >= MIN_REPUTATION && newReputation <= MAX_REPUTATION, "Invalid reputation value");

        Member storage memberData = _members[organizationId][member];
        uint256 oldReputation = memberData.reputation;

        memberData.reputation = newReputation;

        // Update organization stats
        _updateMembershipStats(organizationId);

        emit ReputationUpdated(organizationId, member, oldReputation, newReputation, reason, block.timestamp);

        return true;
    }

    /**
     * @dev Get reputation for member
     */
    function getReputation(bytes8 organizationId, address member) external view override returns (uint256) {
        if (!_organizationMembers[organizationId].contains(member)) {
            return 0;
        }
        return _members[organizationId][member].reputation;
    }

    /**
     * @dev Get average reputation for organization
     */
    function getAverageReputation(bytes8 organizationId) external view override returns (uint256) {
        return _membershipStats[organizationId].averageReputation;
    }

    // =============================================================
    // PERMISSION CHECKS
    // =============================================================

    /**
     * @dev Check if member can vote
     */
    function canVote(bytes8 organizationId, address account) external view override returns (bool) {
        if (!_organizationMembers[organizationId].contains(account)) {
            return false;
        }
        Member memory member = _members[organizationId][account];
        return member.state == MemberState.Active && member.canVote;
    }

    /**
     * @dev Check if member can propose
     */
    function canPropose(bytes8 organizationId, address account) external view override returns (bool) {
        if (!_organizationMembers[organizationId].contains(account)) {
            return false;
        }
        Member memory member = _members[organizationId][account];
        return member.state == MemberState.Active && member.canPropose;
    }

    /**
     * @dev Check if member can manage other members
     */
    function canManageMembers(bytes8 organizationId, address account) external view override returns (bool) {
        if (!_organizationMembers[organizationId].contains(account)) {
            return false;
        }
        Member memory member = _members[organizationId][account];
        return member.state == MemberState.Active &&
               (member.tier == MembershipTier.VIP || member.tier == MembershipTier.Founder);
    }

    // =============================================================
    // ORGANIZATION INTEGRATION
    // =============================================================

    /**
     * @dev Check if organization exists
     */
    function getOrganizationExists(bytes8 organizationId) external view override returns (bool) {
        return _organizationExists[organizationId];
    }

    /**
     * @dev Get organizations where account is a member
     */
    function getMemberOrganizations(address account) external view override returns (bytes8[] memory) {
        bytes32[] memory orgHashes = _userMemberships[account].values();
        bytes8[] memory organizations = new bytes8[](orgHashes.length);

        for (uint256 i = 0; i < orgHashes.length; i++) {
            organizations[i] = bytes8(orgHashes[i]);
        }

        return organizations;
    }

    /**
     * @dev Get organizations where profile is a member
     */
    function getProfileMemberships(bytes8 profileId) external view override returns (bytes8[] memory) {
        bytes32[] memory orgHashes = _profileMemberships[profileId].values();
        bytes8[] memory organizations = new bytes8[](orgHashes.length);

        for (uint256 i = 0; i < orgHashes.length; i++) {
            organizations[i] = bytes8(orgHashes[i]);
        }

        return organizations;
    }

    // =============================================================
    // ADMIN FUNCTIONS
    // =============================================================

    /**
     * @dev Set organization as active/inactive
     */
    function setOrganizationActive(
        bytes8 organizationId,
        bool active
    ) external override onlyRole(ORGANIZATION_MANAGER_ROLE) returns (bool) {
        _organizationExists[organizationId] = active;

        if (active) {
            // Initialize membership stats if new organization
            if (_membershipStats[organizationId].lastUpdated == 0) {
                _membershipStats[organizationId] = MembershipStats({
                    totalMembers: 0,
                    activeMembers: 0,
                    totalVotingPower: 0,
                    averageReputation: 1000,
                    lastUpdated: block.timestamp
                });
            }
        }

        return true;
    }

    /**
     * @dev Emergency remove member
     */
    function emergencyRemoveMember(
        bytes8 organizationId,
        address member,
        bytes32 reason
    ) external override onlyRole(MEMBERSHIP_ADMIN_ROLE) returns (bool) {
        require(_organizationMembers[organizationId].contains(member), "Not a member");

        // Force remove member
        return this.removeMember(organizationId, member);
    }

    /**
     * @dev Bulk update member states
     */
    function bulkUpdateMemberStates(
        bytes8 organizationId,
        address[] memory members,
        MemberState[] memory states
    ) external override onlyRole(ORGANIZATION_MANAGER_ROLE) organizationExists(organizationId) returns (bool) {
        require(members.length == states.length, "Array length mismatch");

        for (uint256 i = 0; i < members.length; i++) {
            if (_organizationMembers[organizationId].contains(members[i])) {
                this.updateMemberState(organizationId, members[i], states[i]);
            }
        }

        return true;
    }

    // =============================================================
    // INTERNAL FUNCTIONS
    // =============================================================

    /**
     * @dev Update membership statistics for organization
     */
    function _updateMembershipStats(bytes8 organizationId) internal {
        address[] memory allMembers = _organizationMembers[organizationId].values();
        uint256 activeCount = 0;
        uint256 totalVotingPower = 0;
        uint256 totalReputation = 0;

        for (uint256 i = 0; i < allMembers.length; i++) {
            Member memory member = _members[organizationId][allMembers[i]];

            if (member.state == MemberState.Active) {
                activeCount++;
                totalVotingPower += member.votingPower + _delegatedIn[organizationId][allMembers[i]];
            }

            totalReputation += member.reputation;
        }

        _membershipStats[organizationId] = MembershipStats({
            totalMembers: allMembers.length,
            activeMembers: activeCount,
            totalVotingPower: totalVotingPower,
            averageReputation: allMembers.length > 0 ? totalReputation / allMembers.length : 1000,
            lastUpdated: block.timestamp
        });
    }

    /**
     * @dev Update voting power based on membership tier
     */
    function _updateVotingPowerForTier(bytes8 organizationId, address member, MembershipTier tier) internal {
        Member storage memberData = _members[organizationId][member];
        uint256 oldPower = memberData.votingPower;
        uint256 newPower;

        // Set voting power based on tier
        if (tier == MembershipTier.Basic) {
            newPower = 1;
        } else if (tier == MembershipTier.Premium) {
            newPower = 2;
        } else if (tier == MembershipTier.VIP) {
            newPower = 5;
        } else if (tier == MembershipTier.Founder) {
            newPower = 10;
        }

        memberData.votingPower = newPower;

        emit VotingPowerUpdated(organizationId, member, oldPower, newPower, block.timestamp);
    }

    /**
     * @dev Clear all delegations for a member
     */
    function _clearMemberDelegations(bytes8 organizationId, address member) internal {
        // Clear outgoing delegations
        uint256 totalDelegatedOut = _delegatedOut[organizationId][member];
        if (totalDelegatedOut > 0) {
            _delegatedOut[organizationId][member] = 0;
            // Note: Individual delegation amounts are cleared when member is deleted
        }

        // Clear incoming delegations
        uint256 totalDelegatedIn = _delegatedIn[organizationId][member];
        if (totalDelegatedIn > 0) {
            _delegatedIn[organizationId][member] = 0;
            // Note: Delegators' records are updated when they undelegate
        }
    }

    // =============================================================
    // PAUSE/UNPAUSE FUNCTIONS
    // =============================================================

    /**
     * @dev Pause the contract
     */
    function pause() external onlyRole(MEMBERSHIP_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyRole(MEMBERSHIP_ADMIN_ROLE) {
        _unpause();
    }
}
