// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.20;

import "../../core/Module.sol";
import "../../interfaces/IMembership.sol";
import "../../interfaces/IControl.sol";
import "../../interfaces/ISense.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

/**
 * @title Membership
 * @dev Comprehensive membership management module - Centralized membership for all GameDAO modules
 * @author GameDAO AG
 */
contract Membership is Module, IMembership {
    using EnumerableSet for EnumerableSet.AddressSet;

    // Constants
    bytes32 public constant MODULE_ID = keccak256("MEMBERSHIP");
    bytes32 public constant MEMBERSHIP_ADMIN_ROLE = keccak256("MEMBERSHIP_ADMIN_ROLE");
    bytes32 public constant ORGANIZATION_MANAGER_ROLE = keccak256("ORGANIZATION_MANAGER_ROLE");

    // Member storage
    mapping(bytes8 => mapping(address => Member)) private _members;
    mapping(bytes8 => EnumerableSet.AddressSet) private _organizationMembers;
    mapping(bytes8 => mapping(MembershipTier => EnumerableSet.AddressSet)) private _membersByTier;
    mapping(bytes8 => mapping(MemberState => EnumerableSet.AddressSet)) private _membersByState;
    mapping(bytes8 => bool) private _organizationActive;
    mapping(bytes8 => MembershipStats) private _membershipStats;

    // Voting delegation
    mapping(bytes8 => mapping(address => VotingDelegation[])) private _delegations;
    mapping(bytes8 => mapping(address => uint256)) private _totalDelegatedOut;
    mapping(bytes8 => mapping(address => uint256)) private _totalDelegatedIn;

    // Contract references
    IERC20 public gameToken;
    IControl public controlContract;

    // Errors are defined in the interface

    // Modifiers
    modifier onlyActiveOrganization(bytes8 organizationId) {
        if (!_organizationActive[organizationId]) revert OrganizationNotActive(organizationId);
        _;
    }

    modifier onlyExistingMember(bytes8 organizationId, address member) {
        if (!_organizationMembers[organizationId].contains(member)) revert MemberNotFound(organizationId, member);
        _;
    }

    modifier onlyNonExistingMember(bytes8 organizationId, address member) {
        if (_organizationMembers[organizationId].contains(member)) revert MemberAlreadyExists(organizationId, member);
        _;
    }

    modifier onlyActiveMember(bytes8 organizationId, address member) {
        Member storage memberData = _members[organizationId][member];
        if (memberData.state != MemberState.ACTIVE) revert MemberNotActive(organizationId, member);
        _;
    }

    /**
     * @dev Constructor
     */
    constructor() Module("1.0.0") {
        // Grant roles to deployer initially
        _grantRole(MEMBERSHIP_ADMIN_ROLE, msg.sender);
        _grantRole(ORGANIZATION_MANAGER_ROLE, msg.sender);
    }

    /**
     * @dev Returns the unique identifier for this module
     */
    function moduleId() external pure override returns (bytes32) {
        return MODULE_ID;
    }

    /**
     * @dev Internal initialization hook
     */
    function _onInitialize() internal override {
        // Grant admin roles to the registry
        address registryAddr = address(_registry);
        _grantRole(MEMBERSHIP_ADMIN_ROLE, registryAddr);
        _grantRole(ORGANIZATION_MANAGER_ROLE, registryAddr);
    }

    /**
     * @dev Set game token contract
     */
    function setGameToken(address _gameToken) external onlyRole(MEMBERSHIP_ADMIN_ROLE) {
        require(_gameToken != address(0), "Invalid game token address");
        gameToken = IERC20(_gameToken);
    }

    /**
     * @dev Set control contract
     */
    function setControlContract(address _controlContract) external onlyRole(MEMBERSHIP_ADMIN_ROLE) {
        require(_controlContract != address(0), "Invalid control contract address");
        controlContract = IControl(_controlContract);
    }

    // =============================================================
    // MEMBERSHIP MANAGEMENT
    // =============================================================

    /**
     * @dev Add a new member to an organization
     */
    function addMember(
        bytes8 organizationId,
        address member,
        MembershipTier tier
    ) external override onlyActiveOrganization(organizationId) onlyNonExistingMember(organizationId, member) onlyRole(ORGANIZATION_MANAGER_ROLE) returns (bool) {

        // Validate tier
        if (uint256(tier) > uint256(MembershipTier.PLATINUM)) {
            revert InvalidMembershipTier(tier);
        }

        // Create member data
        Member storage memberData = _members[organizationId][member];
        memberData.account = member;
        memberData.tier = tier;
        memberData.state = MemberState.ACTIVE;
        memberData.joinedAt = block.timestamp;
        memberData.canVote = true;
        memberData.canPropose = true;
        memberData.canDelegate = true;

        // Calculate initial voting power based on tier (no reputation)
        uint256 newVotingPower = _calculateVotingPower(tier);
        memberData.votingPower = newVotingPower;

        // Add to organization member list
        _organizationMembers[organizationId].add(member);
        _membersByTier[organizationId][tier].add(member);
        _membersByState[organizationId][MemberState.ACTIVE].add(member);

        // Update membership stats
        _updateMembershipStats(organizationId);

        emit MemberAdded(organizationId, member, tier, block.timestamp);
        return true;
    }

    /**
     * @dev Remove a member from an organization
     */
    function removeMember(
        bytes8 organizationId,
        address member
    ) external override onlyActiveOrganization(organizationId) onlyExistingMember(organizationId, member) onlyRole(ORGANIZATION_MANAGER_ROLE) returns (bool) {

        Member storage memberData = _members[organizationId][member];

        // Remove from all tracking sets
        _organizationMembers[organizationId].remove(member);
        _membersByTier[organizationId][memberData.tier].remove(member);
        _membersByState[organizationId][memberData.state].remove(member);

        // Clean up delegations
        _cleanupDelegations(organizationId, member);

        // Delete member data
        delete _members[organizationId][member];

        // Update membership stats
        _updateMembershipStats(organizationId);

        emit MemberRemoved(organizationId, member, block.timestamp);
        return true;
    }

    /**
     * @dev Update member tier
     */
    function updateMemberTier(
        bytes8 organizationId,
        address member,
        MembershipTier newTier
    ) external override onlyActiveOrganization(organizationId) onlyExistingMember(organizationId, member) onlyRole(ORGANIZATION_MANAGER_ROLE) returns (bool) {

        if (uint256(newTier) > uint256(MembershipTier.PLATINUM)) {
            revert InvalidMembershipTier(newTier);
        }

        Member storage memberData = _members[organizationId][member];
        MembershipTier oldTier = memberData.tier;

        if (oldTier == newTier) return true;

        // Update tier tracking
        _membersByTier[organizationId][oldTier].remove(member);
        _membersByTier[organizationId][newTier].add(member);

        memberData.tier = newTier;

        // Recalculate voting power based on new tier
        uint256 newVotingPower = _calculateVotingPower(newTier);
        uint256 oldVotingPower = memberData.votingPower;
        memberData.votingPower = newVotingPower;

        // Update membership stats
        _updateMembershipStats(organizationId);

        emit MemberTierUpdated(organizationId, member, oldTier, newTier, block.timestamp);
        emit VotingPowerUpdated(organizationId, member, oldVotingPower, newVotingPower, block.timestamp);
        return true;
    }

    /**
     * @dev Update member state
     */
    function updateMemberState(
        bytes8 organizationId,
        address member,
        MemberState newState
    ) external override onlyActiveOrganization(organizationId) onlyExistingMember(organizationId, member) onlyRole(ORGANIZATION_MANAGER_ROLE) returns (bool) {

        if (uint256(newState) > uint256(MemberState.INACTIVE)) {
            revert InvalidMemberState(newState);
        }

        Member storage memberData = _members[organizationId][member];
        MemberState oldState = memberData.state;

        if (oldState == newState) return true;

        // Update state tracking
        _membersByState[organizationId][oldState].remove(member);
        _membersByState[organizationId][newState].add(member);

        memberData.state = newState;

        // Update permissions based on state
        memberData.canVote = (newState == MemberState.ACTIVE);
        memberData.canPropose = (newState == MemberState.ACTIVE);
        memberData.canDelegate = (newState == MemberState.ACTIVE);

        // Update membership stats
        _updateMembershipStats(organizationId);

        emit MemberStateUpdated(organizationId, member, oldState, newState, block.timestamp);
        return true;
    }

    /**
     * @dev Update member voting power
     */
    function updateVotingPower(
        bytes8 organizationId,
        address member,
        uint256 newVotingPower
    ) external override onlyActiveOrganization(organizationId) onlyExistingMember(organizationId, member) onlyRole(ORGANIZATION_MANAGER_ROLE) returns (bool) {

        Member storage memberData = _members[organizationId][member];
        uint256 oldVotingPower = memberData.votingPower;

        if (oldVotingPower == newVotingPower) return true;

        memberData.votingPower = newVotingPower;

        // Update membership stats
        _updateMembershipStats(organizationId);

        emit VotingPowerUpdated(organizationId, member, oldVotingPower, newVotingPower, block.timestamp);
        return true;
    }

    // =============================================================
    // VOTING DELEGATION
    // =============================================================

    /**
     * @dev Delegate voting power to another member
     */
    function delegateVotingPower(
        bytes8 organizationId,
        address delegatee,
        uint256 amount
    ) external override onlyActiveOrganization(organizationId) onlyActiveMember(organizationId, msg.sender) returns (bool) {

        if (delegatee == msg.sender) revert SelfDelegationNotAllowed(msg.sender);
        if (amount == 0) revert InvalidDelegationAmount(amount);
        if (!_organizationMembers[organizationId].contains(delegatee)) revert MemberNotFound(organizationId, delegatee);

        Member storage delegatorData = _members[organizationId][msg.sender];

        // Check if delegator has sufficient voting power
        uint256 availablePower = delegatorData.votingPower - _totalDelegatedOut[organizationId][msg.sender];
        if (availablePower < amount) revert InsufficientVotingPower(msg.sender, amount, availablePower);

        // Create delegation
        VotingDelegation memory delegation = VotingDelegation({
            delegator: msg.sender,
            delegatee: delegatee,
            amount: amount,
            timestamp: block.timestamp,
            active: true
        });

        _delegations[organizationId][msg.sender].push(delegation);
        _totalDelegatedOut[organizationId][msg.sender] += amount;
        _totalDelegatedIn[organizationId][delegatee] += amount;

        emit VotingDelegated(organizationId, msg.sender, delegatee, amount, block.timestamp);
        return true;
    }

    /**
     * @dev Undelegate voting power from a member
     */
    function undelegateVotingPower(
        bytes8 organizationId,
        address delegatee,
        uint256 amount
    ) external override onlyActiveOrganization(organizationId) returns (bool) {

        if (amount == 0) revert InvalidDelegationAmount(amount);

        // Find and update delegation
        VotingDelegation[] storage delegations = _delegations[organizationId][msg.sender];
        uint256 remainingAmount = amount;

        for (uint256 i = 0; i < delegations.length && remainingAmount > 0; i++) {
            VotingDelegation storage delegation = delegations[i];

            if (delegation.delegatee == delegatee && delegation.active) {
                uint256 undelegateAmount = remainingAmount > delegation.amount ? delegation.amount : remainingAmount;

                delegation.amount -= undelegateAmount;
                remainingAmount -= undelegateAmount;

                _totalDelegatedOut[organizationId][msg.sender] -= undelegateAmount;
                _totalDelegatedIn[organizationId][delegatee] -= undelegateAmount;

                if (delegation.amount == 0) {
                    delegation.active = false;
                }

                emit VotingUndelegated(organizationId, msg.sender, delegatee, undelegateAmount, block.timestamp);
            }
        }

        return remainingAmount == 0;
    }

    // =============================================================
    // QUERY FUNCTIONS
    // =============================================================

    /**
     * @dev Check if an address is a member of an organization
     */
    function isMember(
        bytes8 organizationId,
        address account
    ) external view override returns (bool) {
        return _organizationMembers[organizationId].contains(account);
    }

    /**
     * @dev Get member data
     */
    function getMember(
        bytes8 organizationId,
        address account
    ) external view override returns (Member memory) {
        return _members[organizationId][account];
    }

    /**
     * @dev Get all members of an organization
     */
    function getMembers(
        bytes8 organizationId
    ) external view override returns (address[] memory) {
        return _organizationMembers[organizationId].values();
    }

    /**
     * @dev Get members by tier
     */
    function getMembersByTier(
        bytes8 organizationId,
        MembershipTier tier
    ) external view override returns (address[] memory) {
        return _membersByTier[organizationId][tier].values();
    }

    /**
     * @dev Get members by state
     */
    function getMembersByState(
        bytes8 organizationId,
        MemberState state
    ) external view override returns (address[] memory) {
        return _membersByState[organizationId][state].values();
    }

    /**
     * @dev Get member count
     */
    function getMemberCount(
        bytes8 organizationId
    ) external view override returns (uint256) {
        return _organizationMembers[organizationId].length();
    }

    /**
     * @dev Get membership statistics
     */
    function getMembershipStats(
        bytes8 organizationId
    ) external view override returns (MembershipStats memory) {
        return _membershipStats[organizationId];
    }

    /**
     * @dev Get effective voting power including delegations
     */
    function getEffectiveVotingPower(
        bytes8 organizationId,
        address member
    ) external view override returns (uint256) {
        Member storage memberData = _members[organizationId][member];
        uint256 basePower = memberData.votingPower - _totalDelegatedOut[organizationId][member];
        uint256 delegatedPower = _totalDelegatedIn[organizationId][member];
        return basePower + delegatedPower;
    }

    // =============================================================
    // DELEGATION QUERY FUNCTIONS
    // =============================================================

    /**
     * @dev Get all delegations for a member
     */
    function getDelegations(
        bytes8 organizationId,
        address member
    ) external view override returns (VotingDelegation[] memory) {
        return _delegations[organizationId][member];
    }

    /**
     * @dev Get total delegated out power
     */
    function getTotalDelegatedOut(
        bytes8 organizationId,
        address member
    ) external view override returns (uint256) {
        return _totalDelegatedOut[organizationId][member];
    }

    /**
     * @dev Get total delegated in power
     */
    function getTotalDelegatedIn(
        bytes8 organizationId,
        address member
    ) external view override returns (uint256) {
        return _totalDelegatedIn[organizationId][member];
    }

    // =============================================================
    // ORGANIZATION MANAGEMENT
    // =============================================================

    /**
     * @dev Activate an organization
     */
    function activateOrganization(
        bytes8 organizationId
    ) external override onlyRole(ORGANIZATION_MANAGER_ROLE) returns (bool) {
        _organizationActive[organizationId] = true;
        return true;
    }

    /**
     * @dev Deactivate an organization
     */
    function deactivateOrganization(
        bytes8 organizationId
    ) external override onlyRole(ORGANIZATION_MANAGER_ROLE) returns (bool) {
        _organizationActive[organizationId] = false;
        return true;
    }

    /**
     * @dev Check if organization is active
     */
    function isOrganizationActive(
        bytes8 organizationId
    ) external view override returns (bool) {
        return _organizationActive[organizationId];
    }

    // =============================================================
    // INTERNAL FUNCTIONS
    // =============================================================

    /**
     * @dev Calculate voting power based on tier only (no reputation)
     */
    function _calculateVotingPower(MembershipTier tier) internal pure returns (uint256) {
        uint256 basePower = 100; // Base voting power
        uint256 tierMultiplier;

        if (tier == MembershipTier.BRONZE) {
            tierMultiplier = 1000; // 1.0x
        } else if (tier == MembershipTier.SILVER) {
            tierMultiplier = 1250; // 1.25x
        } else if (tier == MembershipTier.GOLD) {
            tierMultiplier = 1500; // 1.5x
        } else if (tier == MembershipTier.PLATINUM) {
            tierMultiplier = 2000; // 2.0x
        } else {
            tierMultiplier = 1000; // Default 1.0x
        }

        return (basePower * tierMultiplier) / 1000;
    }

    /**
     * @dev Update membership statistics
     */
    function _updateMembershipStats(bytes8 organizationId) internal {
        MembershipStats storage stats = _membershipStats[organizationId];

        uint256 totalMembers = _organizationMembers[organizationId].length();
        uint256 activeMembers = _membersByState[organizationId][MemberState.ACTIVE].length();

        stats.totalMembers = totalMembers;
        stats.activeMembers = activeMembers;

        // Calculate total voting power
        uint256 totalVotingPower = 0;
        address[] memory members = _organizationMembers[organizationId].values();

        for (uint256 i = 0; i < members.length; i++) {
            Member storage member = _members[organizationId][members[i]];
            totalVotingPower += member.votingPower;
        }

        stats.totalVotingPower = totalVotingPower;
    }

    /**
     * @dev Clean up delegations when a member is removed
     */
    function _cleanupDelegations(bytes8 organizationId, address member) internal {
        // Clean up delegations where member is delegator
        VotingDelegation[] storage delegations = _delegations[organizationId][member];
        for (uint256 i = 0; i < delegations.length; i++) {
            if (delegations[i].active) {
                _totalDelegatedIn[organizationId][delegations[i].delegatee] -= delegations[i].amount;
            }
        }
        delete _delegations[organizationId][member];
        delete _totalDelegatedOut[organizationId][member];

        // Clean up delegations where member is delegatee
        // This is more complex and would require iterating through all delegations
        // For now, we'll leave this as a future optimization
        delete _totalDelegatedIn[organizationId][member];
    }
}

