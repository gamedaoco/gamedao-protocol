// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.20;

import "../../core/GameDAOModule.sol";
import "../../core/Treasury.sol";
import "../../interfaces/IControl.sol";
import "../../interfaces/IGameToken.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title Control
 * @dev Core DAO management module for GameDAO protocol
 * @author GameDAO AG
 */
contract Control is GameDAOModule, IControl {
    using EnumerableSet for EnumerableSet.Bytes32Set;
    using EnumerableSet for EnumerableSet.AddressSet;
    using Counters for Counters.Counter;

    // Constants
    bytes32 public constant MODULE_ID = keccak256("CONTROL");
    bytes32 public constant GAME_STAKE_PURPOSE = keccak256("DAO_CREATION");

    // Counters
    Counters.Counter private _organizationCounter;

    // Game Token
    IGameToken public gameToken;

    // Storage
    mapping(bytes32 => Organization) private _organizations;
    mapping(bytes32 => mapping(address => Member)) private _members;
    mapping(bytes32 => EnumerableSet.AddressSet) private _memberSets;
    mapping(bytes32 => OrgState) private _organizationStates;

    // Organization enumeration
    EnumerableSet.Bytes32Set private _allOrganizations;
    mapping(OrgState => EnumerableSet.Bytes32Set) private _organizationsByState;

    // Access control
    mapping(bytes32 => mapping(address => bytes32)) private _memberRoles;
    mapping(bytes32 => mapping(bytes32 => EnumerableSet.AddressSet)) private _roleMembers;

    // GAME staking requirements
    mapping(bytes32 => uint256) private _gameStakeRequired;
    mapping(bytes32 => mapping(address => uint256)) private _memberGameStake;

    // Errors
    error OrganizationNotFound(bytes32 orgId);
    error OrganizationExists(bytes32 orgId);
    error MemberNotFound(bytes32 orgId, address member);
    error MemberExists(bytes32 orgId, address member);
    error InsufficientGameStake(uint256 required, uint256 provided);
    error UnauthorizedAccess(bytes32 orgId, address caller);
    error OrganizationInactive(bytes32 orgId);
    error MemberLimitReached(bytes32 orgId, uint256 limit);
    error InvalidParameters();
    error InvalidGameToken();

    /**
     * @dev Constructor
     */
    constructor() GameDAOModule("1.0.0") {}

    /**
     * @dev Returns the module ID
     */
    function moduleId() external pure override returns (bytes32) {
        return MODULE_ID;
    }

    /**
     * @dev Internal initialization hook
     */
    function _onInitialize() internal override {
        // Module-specific initialization
    }

    /**
     * @dev Set the GAME token address
     * @param _gameToken The GAME token contract address
     */
    function setGameToken(address _gameToken) external onlyRole(ADMIN_ROLE) {
        if (_gameToken == address(0)) revert InvalidGameToken();
        gameToken = IGameToken(_gameToken);
    }

    /**
     * @dev Create a new organization
     */
    function createOrganization(
        string memory name,
        string memory metadataURI,
        OrgType orgType,
        AccessModel accessModel,
        FeeModel feeModel,
        uint32 memberLimit,
        uint256 membershipFee,
        uint256 gameStakeRequired
    ) external nonReentrant whenNotPaused returns (bytes32 orgId) {
        if (bytes(name).length == 0) revert InvalidParameters();
        if (gameStakeRequired > 0 && address(gameToken) == address(0)) revert InvalidGameToken();

        // Stake GAME tokens if required
        if (gameStakeRequired > 0) {
            // Stake tokens on behalf of the user (requires user approval)
            gameToken.stakeFor(_msgSender(), GAME_STAKE_PURPOSE, gameStakeRequired);
        }

        // Generate organization ID
        _organizationCounter.increment();
        uint256 orgIndex = _organizationCounter.current();
        orgId = keccak256(abi.encodePacked(MODULE_ID, orgIndex, _msgSender(), block.timestamp));

        if (_organizations[orgId].creator != address(0)) revert OrganizationExists(orgId);

        // Create treasury
        Treasury treasury = new Treasury(orgId, address(this), _msgSender());

        // Create organization
        Organization memory org = Organization({
            index: orgIndex,
            creator: _msgSender(),
            prime: _msgSender(),
            name: name,
            metadataURI: metadataURI,
            orgType: orgType,
            accessModel: accessModel,
            feeModel: feeModel,
            membershipFee: membershipFee,
            treasury: address(treasury),
            memberLimit: memberLimit,
            state: OrgState.Active,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });

        // Store organization
        _organizations[orgId] = org;
        _organizationStates[orgId] = OrgState.Active;
        _gameStakeRequired[orgId] = gameStakeRequired;

        // Add to enumerations
        _allOrganizations.add(orgId);
        _organizationsByState[OrgState.Active].add(orgId);

        // Add creator as first member
        _addMemberInternal(orgId, _msgSender(), MemberState.Active, 0);

        emit OrganizationCreated(
            orgId,
            _msgSender(),
            _msgSender(),
            name,
            orgType,
            block.timestamp
        );
    }

    /**
     * @dev Update organization settings
     */
    function updateOrganization(
        bytes32 orgId,
        address newPrime,
        OrgType orgType,
        AccessModel accessModel,
        uint32 memberLimit,
        FeeModel feeModel,
        uint256 membershipFee
    ) external nonReentrant whenNotPaused {
        Organization storage org = _organizations[orgId];
        if (org.creator == address(0)) revert OrganizationNotFound(orgId);

        // Only prime can update
        if (_msgSender() != org.prime) revert UnauthorizedAccess(orgId, _msgSender());

        // Update fields
        if (newPrime != address(0)) {
            org.prime = newPrime;
        }
        org.orgType = orgType;
        org.accessModel = accessModel;
        org.memberLimit = memberLimit;
        org.feeModel = feeModel;
        org.membershipFee = membershipFee;
        org.updatedAt = block.timestamp;

        emit OrganizationUpdated(
            orgId,
            org.prime,
            orgType,
            accessModel,
            memberLimit,
            block.timestamp
        );
    }

    /**
     * @dev Set organization state
     */
    function setOrganizationState(bytes32 orgId, OrgState newState) external onlyRole(ADMIN_ROLE) {
        Organization storage org = _organizations[orgId];
        if (org.creator == address(0)) revert OrganizationNotFound(orgId);

        OrgState oldState = _organizationStates[orgId];
        _organizationStates[orgId] = newState;
        org.state = newState;

        // Update enumerations
        _organizationsByState[oldState].remove(orgId);
        _organizationsByState[newState].add(orgId);

        emit OrganizationStateChanged(orgId, oldState, newState, block.timestamp);
    }

    /**
     * @dev Join an organization (new simplified API)
     * @param account The address that wants to join
     * @param orgId The organization to join
     */
    function join(address account, bytes32 orgId) external nonReentrant whenNotPaused {
        Organization storage org = _organizations[orgId];
        if (org.creator == address(0)) revert OrganizationNotFound(orgId);
        if (_organizationStates[orgId] != OrgState.Active) revert OrganizationInactive(orgId);

        // Check access permissions
        if (org.accessModel == AccessModel.Invite && _msgSender() != org.prime) {
            revert UnauthorizedAccess(orgId, _msgSender());
        }

        // Check member limit
        if (org.memberLimit > 0 && _memberSets[orgId].length() >= org.memberLimit) {
            revert MemberLimitReached(orgId, org.memberLimit);
        }

        // For voting access model, member starts as pending
        MemberState initialState = org.accessModel == AccessModel.Voting
            ? MemberState.Pending
            : MemberState.Active;

        uint256 fee = 0;
        if (org.feeModel != FeeModel.NoFees && org.membershipFee > 0) {
            fee = org.membershipFee;
            // Handle fee collection (simplified for now)
        }

        _addMemberInternal(orgId, account, initialState, fee);
    }

    /**
     * @dev Add a member to an organization (legacy function - maintained for backward compatibility)
     * @notice Use join(address, bytes32) instead
     */
    function addMember(bytes32 orgId, address member) external nonReentrant whenNotPaused {
        // Delegate to the new join function
        Organization storage org = _organizations[orgId];
        if (org.creator == address(0)) revert OrganizationNotFound(orgId);
        if (_organizationStates[orgId] != OrgState.Active) revert OrganizationInactive(orgId);

        // Check access permissions
        if (org.accessModel == AccessModel.Invite && _msgSender() != org.prime) {
            revert UnauthorizedAccess(orgId, _msgSender());
        }

        // Check member limit
        if (org.memberLimit > 0 && _memberSets[orgId].length() >= org.memberLimit) {
            revert MemberLimitReached(orgId, org.memberLimit);
        }

        // For voting access model, member starts as pending
        MemberState initialState = org.accessModel == AccessModel.Voting
            ? MemberState.Pending
            : MemberState.Active;

        uint256 fee = 0;
        if (org.feeModel != FeeModel.NoFees && org.membershipFee > 0) {
            fee = org.membershipFee;
            // Handle fee collection (simplified for now)
        }

        _addMemberInternal(orgId, member, initialState, fee);
    }

    /**
     * @dev Update member state
     */
    function updateMemberState(
        bytes32 orgId,
        address member,
        MemberState newState
    ) external nonReentrant whenNotPaused {
        Organization storage org = _organizations[orgId];
        if (org.creator == address(0)) revert OrganizationNotFound(orgId);

        Member storage memberData = _members[orgId][member];
        if (memberData.joinedAt == 0) revert MemberNotFound(orgId, member);

        // Only prime can update member states
        if (_msgSender() != org.prime) revert UnauthorizedAccess(orgId, _msgSender());

        MemberState oldState = memberData.state;
        memberData.state = newState;

        emit MemberStateChanged(orgId, member, oldState, newState, block.timestamp);
    }

    /**
     * @dev Remove a member from an organization
     */
    function removeMember(bytes32 orgId, address member) external nonReentrant whenNotPaused {
        Organization storage org = _organizations[orgId];
        if (org.creator == address(0)) revert OrganizationNotFound(orgId);

        Member storage memberData = _members[orgId][member];
        if (memberData.joinedAt == 0) revert MemberNotFound(orgId, member);

        // Only prime or the member themselves can remove
        if (_msgSender() != org.prime && _msgSender() != member) {
            revert UnauthorizedAccess(orgId, _msgSender());
        }

        // Remove from member set
        _memberSets[orgId].remove(member);

        // Clear member data
        delete _members[orgId][member];
        delete _memberRoles[orgId][member];

        // Unstake GAME tokens if any
        if (_memberGameStake[orgId][member] > 0) {
            uint256 stakedAmount = _memberGameStake[orgId][member];
            _memberGameStake[orgId][member] = 0;
            if (address(gameToken) != address(0)) {
                gameToken.unstake(GAME_STAKE_PURPOSE, stakedAmount);
            }
        }

        emit MemberRemoved(orgId, member, block.timestamp);
    }

    /**
     * @dev Spend treasury funds
     */
    function spendTreasuryFunds(
        bytes32 orgId,
        address token,
        address beneficiary,
        uint256 amount,
        string memory purpose
    ) external nonReentrant whenNotPaused {
        Organization storage org = _organizations[orgId];
        if (org.creator == address(0)) revert OrganizationNotFound(orgId);

        // Only prime can spend funds (this can be extended to governance later)
        if (_msgSender() != org.prime) revert UnauthorizedAccess(orgId, _msgSender());

        Treasury treasury = Treasury(org.treasury);
        treasury.spend(token, beneficiary, amount, purpose);

        emit TreasuryFundsSpent(orgId, beneficiary, token, amount, purpose, block.timestamp);
    }

    // View Functions

    /**
     * @dev Get organization data
     */
    function getOrganization(bytes32 orgId) external view returns (Organization memory) {
        return _organizations[orgId];
    }

    /**
     * @dev Get member data
     */
    function getMember(bytes32 orgId, address member) external view returns (Member memory) {
        return _members[orgId][member];
    }

    /**
     * @dev Check if organization is active
     */
    function isOrganizationActive(bytes32 orgId) external view returns (bool) {
        return _organizationStates[orgId] == OrgState.Active;
    }

    /**
     * @dev Check if member is active
     */
    function isMemberActive(bytes32 orgId, address member) external view returns (bool) {
        return _members[orgId][member].state == MemberState.Active;
    }

    /**
     * @dev Get organization count
     */
    function getOrganizationCount() external view returns (uint256) {
        return _organizationCounter.current();
    }

    /**
     * @dev Get member count for organization
     */
    function getMemberCount(bytes32 orgId) external view returns (uint256) {
        return _memberSets[orgId].length();
    }

    /**
     * @dev Get treasury address
     */
    function getTreasuryAddress(bytes32 orgId) external view returns (address) {
        return _organizations[orgId].treasury;
    }

    /**
     * @dev Get GAME stake required for organization
     */
    function getGameStakeRequired(bytes32 orgId) external view returns (uint256) {
        return _gameStakeRequired[orgId];
    }

    /**
     * @dev Check if member has role
     */
    function hasRole(bytes32 orgId, address member, bytes32 role) external view returns (bool) {
        return _memberRoles[orgId][member] == role;
    }

    /**
     * @dev Check if address can join organization
     */
    function canJoinOrganization(bytes32 orgId, address member) external view returns (bool) {
        Organization memory org = _organizations[orgId];
        if (org.creator == address(0)) return false;
        if (_organizationStates[orgId] != OrgState.Active) return false;
        if (_members[orgId][member].joinedAt != 0) return false; // Already a member
        if (org.memberLimit > 0 && _memberSets[orgId].length() >= org.memberLimit) return false;

        return true;
    }

    // Internal Functions

    /**
     * @dev Internal function to add a member
     */
    function _addMemberInternal(
        bytes32 orgId,
        address member,
        MemberState state,
        uint256 fee
    ) internal {
        if (_members[orgId][member].joinedAt != 0) revert MemberExists(orgId, member);

        // Add to member set
        _memberSets[orgId].add(member);

        // Create member data
        _members[orgId][member] = Member({
            state: state,
            joinedAt: block.timestamp,
            totalContribution: fee,
            role: bytes32(0),
            stakedAmount: 0
        });

        emit MemberAdded(orgId, member, state, fee, block.timestamp);
    }

    /**
     * @dev Get all organizations by state
     */
    function getOrganizationsByState(OrgState state) external view returns (bytes32[] memory) {
        return _organizationsByState[state].values();
    }

    /**
     * @dev Get all organizations
     */
    function getAllOrganizations() external view returns (bytes32[] memory) {
        return _allOrganizations.values();
    }

    /**
     * @dev Get all members of an organization
     */
    function getOrganizationMembers(bytes32 orgId) external view returns (address[] memory) {
        return _memberSets[orgId].values();
    }
}
