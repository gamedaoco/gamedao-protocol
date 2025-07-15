// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IGameDAOMembership.sol";
import "../interfaces/IOrganizationSettings.sol";
import "../interfaces/IIdentity.sol";
import "../interfaces/IControl.sol";

/**
 * @title GameDAOMembership (With Settings)
 * @dev Centralized membership management system with OrganizationSettings integration
 * @author GameDAO AG
 * @notice Foundation contract for all membership operations with governance-controlled parameters
 * @dev Architecture: Identity → Membership → Everything Else with governance settings
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
    IOrganizationSettings public organizationSettings;

    // =============================================================
    // EVENTS
    // =============================================================

    event OrganizationSettingsUpdated(address indexed organizationSettings, uint256 timestamp);
    event MembershipConfigApplied(bytes8 indexed organizationId, address indexed member, uint256 timestamp);
    event ReputationConfigApplied(bytes8 indexed organizationId, address indexed member, uint256 newReputation, uint256 timestamp);

    // =============================================================
    // ERRORS
    // =============================================================

    error OrganizationSettingsNotSet();
    error MembershipLimitExceeded(bytes8 organizationId, uint256 limit, uint256 current);
    error InsufficientMembershipFee(bytes8 organizationId, uint256 required, uint256 provided);
    error InsufficientStake(bytes8 organizationId, uint256 required, uint256 provided);
    error ReputationUpdateFailed(bytes8 organizationId, address member, string reason);

    // =============================================================
    // CONSTRUCTOR
    // =============================================================

    /**
     * @dev Constructor
     * @param _identityContract Address of the Identity contract
     * @param _controlContract Address of the Control contract
     * @param _gameToken Address of the GAME token contract
     * @param _organizationSettings Address of the OrganizationSettings contract
     */
    constructor(
        address _identityContract,
        address _controlContract,
        address _gameToken,
        address _organizationSettings
    ) {
        require(_identityContract != address(0), "Invalid identity contract");
        require(_controlContract != address(0), "Invalid control contract");
        require(_gameToken != address(0), "Invalid game token");
        require(_organizationSettings != address(0), "Invalid organization settings");

        identityContract = _identityContract;
        controlContract = _controlContract;
        gameToken = _gameToken;
        organizationSettings = IOrganizationSettings(_organizationSettings);

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

    modifier memberExists(bytes8 organizationId, address member) {
        require(_organizationMembers[organizationId].contains(member), "Member does not exist");
        _;
    }

    modifier validMembershipTier(MembershipTier tier) {
        require(
            tier == MembershipTier.Basic ||
            tier == MembershipTier.Premium ||
            tier == MembershipTier.VIP ||
            tier == MembershipTier.Founder,
            "Invalid membership tier"
        );
        _;
    }

    modifier onlyActiveOrganization(bytes8 organizationId) {
        require(_organizationExists[organizationId], "Organization does not exist");
        _;
    }

    // =============================================================
    // ADMIN FUNCTIONS
    // =============================================================

    /**
     * @dev Update organization settings contract
     */
    function setOrganizationSettings(address _organizationSettings) external onlyRole(MEMBERSHIP_ADMIN_ROLE) {
        require(_organizationSettings != address(0), "Invalid organization settings address");
        organizationSettings = IOrganizationSettings(_organizationSettings);
        emit OrganizationSettingsUpdated(_organizationSettings, block.timestamp);
    }

    // =============================================================
    // CORE MEMBERSHIP FUNCTIONS WITH SETTINGS INTEGRATION
    // =============================================================

    /**
     * @dev Add a member to an organization (with settings validation)
     */
    function addMember(
        bytes8 organizationId,
        address member,
        bytes8 profileId,
        MembershipTier tier,
        uint256 feeAmount
    ) external override organizationExists(organizationId) validMembershipTier(tier) nonReentrant whenNotPaused {
        require(member != address(0), "Invalid member address");
        require(!_organizationMembers[organizationId].contains(member), "Member already exists");

        // Get membership configuration from settings
        IOrganizationSettings.MembershipConfig memory config = organizationSettings.getMembershipConfig(organizationId);

        // Check member limit
        uint256 currentMemberCount = _organizationMembers[organizationId].length();
        if (currentMemberCount >= config.memberLimit) {
            revert MembershipLimitExceeded(organizationId, config.memberLimit, currentMemberCount);
        }

        // Check membership fee
        if (config.membershipFee > 0) {
            if (feeAmount < config.membershipFee) {
                revert InsufficientMembershipFee(organizationId, config.membershipFee, feeAmount);
            }

            // Handle fee payment based on fee model
            if (config.feeModel == 2) { // Transfer to treasury
                IERC20(gameToken).safeTransferFrom(member, controlContract, feeAmount);
            } else if (config.feeModel == 1) { // Reserve in member account
                IERC20(gameToken).safeTransferFrom(member, address(this), feeAmount);
            }
            // feeModel 0 = NoFees, no transfer needed
        }

        // Check minimum stake requirement
        if (config.minimumStake > 0) {
            // This would integrate with staking contract
            // For now, we'll just check the requirement exists
            require(config.minimumStake > 0, "Minimum stake requirement not met");
        }

        // Get reputation configuration
        IOrganizationSettings.ReputationConfig memory reputationConfig = organizationSettings.getReputationConfig(organizationId);

        // Create member
        Member storage newMember = _members[organizationId][member];
        newMember.account = member;
        newMember.profileId = profileId;
        newMember.tier = tier;
        newMember.state = MemberState.Active;
        newMember.joinedAt = block.timestamp;
        newMember.reputation = reputationConfig.baseReputation; // Use base reputation from settings
        newMember.votingPower = _calculateVotingPowerForTier(tier);
        newMember.delegatedVotingPower = 0;
        newMember.lastActivityAt = block.timestamp;
        newMember.membershipFee = feeAmount;

        // Add to organization members
        _organizationMembers[organizationId].add(member);

        // Add to user memberships
        bytes32 orgIdBytes32 = keccak256(abi.encodePacked(organizationId));
        _userMemberships[member].add(orgIdBytes32);

        // Add to profile memberships if profile exists
        if (profileId != 0x0000000000000000) {
            _profileMemberships[profileId].add(orgIdBytes32);
        }

        // Update membership stats
        _membershipStats[organizationId].totalMembers++;
        _membershipStats[organizationId].activeMembers++;
        _membershipStats[organizationId].lastUpdated = block.timestamp;

        // Update voting power tracking
        _votingPower[organizationId][member] = newMember.votingPower;

        emit MemberAdded(organizationId, member, profileId, tier, feeAmount, block.timestamp);
        emit MembershipConfigApplied(organizationId, member, block.timestamp);
    }

    /**
     * @dev Update member reputation based on settings
     */
    function updateMemberReputation(
        bytes8 organizationId,
        address member,
        uint256 reputationChange,
        bool isReward
    ) external override organizationExists(organizationId) memberExists(organizationId, member) onlyRole(REPUTATION_MANAGER_ROLE) {
        // Get reputation configuration from settings
        IOrganizationSettings.ReputationConfig memory config = organizationSettings.getReputationConfig(organizationId);

        Member storage memberData = _members[organizationId][member];
        uint256 currentReputation = memberData.reputation;
        uint256 newReputation;

        if (isReward) {
            newReputation = currentReputation + reputationChange;
            if (newReputation > config.maxReputation) {
                newReputation = config.maxReputation;
            }
        } else {
            if (reputationChange > currentReputation) {
                newReputation = config.baseReputation; // Floor at base reputation
            } else {
                newReputation = currentReputation - reputationChange;
            }
        }

        memberData.reputation = newReputation;
        memberData.lastActivityAt = block.timestamp;

        // Update voting power based on new reputation
        _updateVotingPowerForReputation(organizationId, member, newReputation);

        emit MemberReputationUpdated(organizationId, member, currentReputation, newReputation, block.timestamp);
        emit ReputationConfigApplied(organizationId, member, newReputation, block.timestamp);
    }

    /**
     * @dev Apply reputation decay based on settings
     */
    function applyReputationDecay(bytes8 organizationId, address member) external organizationExists(organizationId) memberExists(organizationId, member) {
        // Get reputation configuration from settings
        IOrganizationSettings.ReputationConfig memory config = organizationSettings.getReputationConfig(organizationId);

        Member storage memberData = _members[organizationId][member];

        // Calculate decay based on time since last activity
        uint256 daysSinceActivity = (block.timestamp - memberData.lastActivityAt) / 86400;
        if (daysSinceActivity > 0) {
            uint256 decayAmount = (memberData.reputation * config.reputationDecay * daysSinceActivity) / 10000;

            if (decayAmount > 0) {
                uint256 newReputation = memberData.reputation > decayAmount ?
                    memberData.reputation - decayAmount :
                    config.baseReputation;

                memberData.reputation = newReputation;

                // Update voting power
                _updateVotingPowerForReputation(organizationId, member, newReputation);

                emit MemberReputationUpdated(organizationId, member, memberData.reputation + decayAmount, newReputation, block.timestamp);
            }
        }
    }

    /**
     * @dev Reward member for proposal creation
     */
    function rewardProposalCreation(bytes8 organizationId, address member) external organizationExists(organizationId) memberExists(organizationId, member) {
        // Get reputation configuration from settings
        IOrganizationSettings.ReputationConfig memory config = organizationSettings.getReputationConfig(organizationId);

        if (config.proposalReward > 0) {
            updateMemberReputation(organizationId, member, config.proposalReward, true);
        }
    }

    /**
     * @dev Reward member for voting
     */
    function rewardVoting(bytes8 organizationId, address member) external organizationExists(organizationId) memberExists(organizationId, member) {
        // Get reputation configuration from settings
        IOrganizationSettings.ReputationConfig memory config = organizationSettings.getReputationConfig(organizationId);

        if (config.votingReward > 0) {
            updateMemberReputation(organizationId, member, config.votingReward, true);
        }
    }

    // =============================================================
    // MEMBERSHIP VALIDATION WITH SETTINGS
    // =============================================================

    /**
     * @dev Check if member can join organization based on settings
     */
    function canJoinOrganization(bytes8 organizationId, address member) external view returns (bool, string memory) {
        if (!_organizationExists[organizationId]) {
            return (false, "Organization does not exist");
        }

        if (_organizationMembers[organizationId].contains(member)) {
            return (false, "Already a member");
        }

        // Get membership configuration from settings
        IOrganizationSettings.MembershipConfig memory config = organizationSettings.getMembershipConfig(organizationId);

        // Check member limit
        uint256 currentMemberCount = _organizationMembers[organizationId].length();
        if (currentMemberCount >= config.memberLimit) {
            return (false, "Member limit reached");
        }

        // Check minimum stake requirement
        if (config.minimumStake > 0) {
            // This would check actual stake in staking contract
            // For now, we'll assume it's valid
        }

        return (true, "");
    }

    /**
     * @dev Get membership requirements for an organization
     */
    function getMembershipRequirements(bytes8 organizationId) external view returns (
        uint256 membershipFee,
        uint256 minimumStake,
        uint256 memberLimit,
        uint256 currentMembers,
        uint8 accessModel,
        uint8 feeModel
    ) {
        require(_organizationExists[organizationId], "Organization does not exist");

        IOrganizationSettings.MembershipConfig memory config = organizationSettings.getMembershipConfig(organizationId);

        membershipFee = config.membershipFee;
        minimumStake = config.minimumStake;
        memberLimit = config.memberLimit;
        currentMembers = _organizationMembers[organizationId].length();
        accessModel = config.accessModel;
        feeModel = config.feeModel;
    }

    // =============================================================
    // VOTING POWER FUNCTIONS WITH SETTINGS INTEGRATION
    // =============================================================

    /**
     * @dev Get voting power for a member (includes reputation multiplier from settings)
     */
    function getVotingPower(bytes8 organizationId, address member) external view override returns (uint256) {
        if (!_organizationMembers[organizationId].contains(member)) {
            return 0;
        }

        Member storage memberData = _members[organizationId][member];
        if (memberData.state != MemberState.Active) {
            return 0;
        }

        // Get reputation configuration from settings
        IOrganizationSettings.ReputationConfig memory config = organizationSettings.getReputationConfig(organizationId);

        // Calculate voting power with reputation multiplier
        uint256 basePower = memberData.votingPower;
        uint256 reputationMultiplier = (memberData.reputation * 10000) / config.maxReputation; // Scale to basis points

        return basePower + (basePower * reputationMultiplier) / 10000;
    }

    /**
     * @dev Get total voting power for an organization
     */
    function getTotalVotingPower(bytes8 organizationId) external view override returns (uint256) {
        if (!_organizationExists[organizationId]) {
            return 0;
        }

        uint256 totalPower = 0;
        address[] memory members = _organizationMembers[organizationId].values();

        for (uint256 i = 0; i < members.length; i++) {
            totalPower += this.getVotingPower(organizationId, members[i]);
        }

        return totalPower;
    }

    // =============================================================
    // INTERNAL FUNCTIONS
    // =============================================================

    /**
     * @dev Calculate voting power for membership tier
     */
    function _calculateVotingPowerForTier(MembershipTier tier) internal pure returns (uint256) {
        if (tier == MembershipTier.Basic) {
            return 1;
        } else if (tier == MembershipTier.Premium) {
            return 2;
        } else if (tier == MembershipTier.VIP) {
            return 5;
        } else if (tier == MembershipTier.Founder) {
            return 10;
        }
        return 1; // Default
    }

    /**
     * @dev Update voting power based on reputation
     */
    function _updateVotingPowerForReputation(bytes8 organizationId, address member, uint256 reputation) internal {
        Member storage memberData = _members[organizationId][member];

        // Get reputation configuration from settings
        IOrganizationSettings.ReputationConfig memory config = organizationSettings.getReputationConfig(organizationId);

        // Calculate new voting power with reputation multiplier
        uint256 basePower = _calculateVotingPowerForTier(memberData.tier);
        uint256 reputationMultiplier = (reputation * 10000) / config.maxReputation;
        uint256 newVotingPower = basePower + (basePower * reputationMultiplier) / 10000;

        uint256 oldVotingPower = memberData.votingPower;
        memberData.votingPower = newVotingPower;

        // Update voting power tracking
        _votingPower[organizationId][member] = newVotingPower;

        emit VotingPowerUpdated(organizationId, member, oldVotingPower, newVotingPower, block.timestamp);
    }

    // =============================================================
    // INHERITED FUNCTIONS FROM ORIGINAL CONTRACT
    // =============================================================

    function setOrganizationActive(bytes8 organizationId, bool active) external override onlyRole(ORGANIZATION_MANAGER_ROLE) {
        _organizationExists[organizationId] = active;
        emit OrganizationActivated(organizationId, active, block.timestamp);
    }

    function removeMember(bytes8 organizationId, address member) external override organizationExists(organizationId) memberExists(organizationId, member) onlyRole(ORGANIZATION_MANAGER_ROLE) {
        // Remove from organization members
        _organizationMembers[organizationId].remove(member);

        // Remove from user memberships
        bytes32 orgIdBytes32 = keccak256(abi.encodePacked(organizationId));
        _userMemberships[member].remove(orgIdBytes32);

        // Remove from profile memberships
        bytes8 profileId = _members[organizationId][member].profileId;
        if (profileId != 0x0000000000000000) {
            _profileMemberships[profileId].remove(orgIdBytes32);
        }

        // Clear delegations
        _clearMemberDelegations(organizationId, member);

        // Update stats
        _membershipStats[organizationId].totalMembers--;
        if (_members[organizationId][member].state == MemberState.Active) {
            _membershipStats[organizationId].activeMembers--;
        }
        _membershipStats[organizationId].lastUpdated = block.timestamp;

        // Remove member data
        delete _members[organizationId][member];
        delete _votingPower[organizationId][member];

        emit MemberRemoved(organizationId, member, block.timestamp);
    }

    function updateMemberState(bytes8 organizationId, address member, MemberState state) external override organizationExists(organizationId) memberExists(organizationId, member) onlyRole(ORGANIZATION_MANAGER_ROLE) {
        MemberState oldState = _members[organizationId][member].state;
        _members[organizationId][member].state = state;

        // Update active member count
        if (oldState == MemberState.Active && state != MemberState.Active) {
            _membershipStats[organizationId].activeMembers--;
        } else if (oldState != MemberState.Active && state == MemberState.Active) {
            _membershipStats[organizationId].activeMembers++;
        }

        _membershipStats[organizationId].lastUpdated = block.timestamp;

        emit MemberStateUpdated(organizationId, member, oldState, state, block.timestamp);
    }

    function updateMemberTier(bytes8 organizationId, address member, MembershipTier tier) external override organizationExists(organizationId) memberExists(organizationId, member) validMembershipTier(tier) onlyRole(ORGANIZATION_MANAGER_ROLE) {
        MembershipTier oldTier = _members[organizationId][member].tier;
        _members[organizationId][member].tier = tier;

        // Update voting power for new tier
        _updateVotingPowerForTier(organizationId, member, tier);

        emit MemberTierUpdated(organizationId, member, oldTier, tier, block.timestamp);
    }

    function _updateVotingPowerForTier(bytes8 organizationId, address member, MembershipTier tier) internal {
        Member storage memberData = _members[organizationId][member];
        uint256 oldPower = memberData.votingPower;
        uint256 newPower = _calculateVotingPowerForTier(tier);

        memberData.votingPower = newPower;
        _votingPower[organizationId][member] = newPower;

        emit VotingPowerUpdated(organizationId, member, oldPower, newPower, block.timestamp);
    }

    function _clearMemberDelegations(bytes8 organizationId, address member) internal {
        uint256 totalDelegatedOut = _delegatedOut[organizationId][member];
        if (totalDelegatedOut > 0) {
            _delegatedOut[organizationId][member] = 0;
        }

        uint256 totalDelegatedIn = _delegatedIn[organizationId][member];
        if (totalDelegatedIn > 0) {
            _delegatedIn[organizationId][member] = 0;
        }
    }

    // =============================================================
    // VIEW FUNCTIONS
    // =============================================================

    function getMember(bytes8 organizationId, address member) external view override returns (Member memory) {
        require(_organizationMembers[organizationId].contains(member), "Member does not exist");
        return _members[organizationId][member];
    }

    function isMember(bytes8 organizationId, address member) external view override returns (bool) {
        return _organizationMembers[organizationId].contains(member);
    }

    function isActiveMember(bytes8 organizationId, address member) external view override returns (bool) {
        return _organizationMembers[organizationId].contains(member) &&
               _members[organizationId][member].state == MemberState.Active;
    }

    function getMemberCount(bytes8 organizationId) external view override returns (uint256) {
        return _organizationMembers[organizationId].length();
    }

    function getAllMembers(bytes8 organizationId) external view override returns (address[] memory) {
        return _organizationMembers[organizationId].values();
    }

    function getMembershipStats(bytes8 organizationId) external view override returns (MembershipStats memory) {
        return _membershipStats[organizationId];
    }

    function getUserMemberships(address user) external view override returns (bytes8[] memory) {
        bytes32[] memory orgHashes = _userMemberships[user].values();
        bytes8[] memory organizations = new bytes8[](orgHashes.length);

        for (uint256 i = 0; i < orgHashes.length; i++) {
            organizations[i] = bytes8(orgHashes[i]);
        }

        return organizations;
    }

    // =============================================================
    // PAUSE/UNPAUSE FUNCTIONS
    // =============================================================

    function pause() external onlyRole(MEMBERSHIP_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(MEMBERSHIP_ADMIN_ROLE) {
        _unpause();
    }
}
