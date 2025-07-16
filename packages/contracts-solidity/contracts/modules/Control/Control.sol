// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.20;

import "../../core/Module.sol";
import "../../core/Treasury.sol";
import "../../interfaces/IControl.sol";
import "../../interfaces/IStaking.sol";
import "../../libraries/AlphanumericID.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Counters.sol";


/**
 * @title Control
 * @dev Core organization management module
 * @author GameDAO AG
 */
contract Control is Module, IControl {
    using Counters for Counters.Counter;
    using AlphanumericID for bytes32;

    // Constants
    bytes32 public constant MODULE_ID = keccak256("CONTROL");
    uint256 public constant MAX_MEMBER_LIMIT = 10000;
    uint256 public constant MIN_MEMBER_LIMIT = 1;
    uint256 public constant MIN_STAKE_AMOUNT = 10000 * 10**18; // 10,000 GAME tokens minimum

    // State variables
    Counters.Counter private _organizationCounter;

    // Organization storage
    mapping(bytes8 => Organization) private _organizations;
    mapping(bytes8 => bool) private _organizationExists;
    bytes8[] private _organizationIds;

    // Contract references
    IERC20 public gameToken;
    IStaking public stakingContract;

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
        address _gameToken,
        address _stakingContract
    ) Module("1.0.0") {
        require(_gameToken != address(0), "Invalid game token address");
        require(_stakingContract != address(0), "Invalid staking contract address");

        gameToken = IERC20(_gameToken);
        stakingContract = IStaking(_stakingContract);
    }

    /**
     * @dev Returns the module ID
     */
    function moduleId() external pure override returns (bytes32) {
        return MODULE_ID;
    }

    /**
     * @dev Create a new organization with staking
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

        // Handle GAME token staking
        require(
            gameToken.allowance(msg.sender, address(this)) >= gameStakeRequired,
            "Insufficient token allowance for stake"
        );

        // Transfer tokens from user to this contract
        gameToken.transferFrom(msg.sender, address(this), gameStakeRequired);

        // Approve staking contract to spend tokens
        gameToken.approve(address(stakingContract), gameStakeRequired);

        // Create stake in staking contract
        stakingContract.stakeForOrganization(orgId, msg.sender, gameStakeRequired);

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
            memberCount: 1, // Creator is first member
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

        emit OrganizationCreated(orgId, name, msg.sender, address(treasury), block.timestamp);

        return orgId;
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

        emit OrganizationStateChanged(organizationId, oldState, state, block.timestamp);
    }

    /**
     * @dev Update member count (called by Membership contract)
     */
    function updateMemberCount(bytes8 organizationId, uint256 memberCount)
        external
        override
        organizationExists(organizationId)
    {
        // TODO: Add access control - only membership contract should call this
        Organization storage org = _organizations[organizationId];
        org.memberCount = memberCount;
        org.updatedAt = block.timestamp;
    }

    /**
     * @dev Withdraw stake from an organization
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

        // Check if stake can be withdrawn
        require(
            stakingContract.canWithdrawOrganizationStake(organizationId),
            "Stake cannot be withdrawn yet"
        );

        // Get stake info before withdrawal
        IStaking.OrganizationStake memory stake = stakingContract.getOrganizationStake(organizationId);
        require(stake.active, "No active stake for organization");
        require(stake.staker == msg.sender, "Not the staker");

        // Withdraw stake through staking contract
        stakingContract.withdrawOrganizationStake(organizationId, msg.sender);

        emit StakeWithdrawn(organizationId, msg.sender, stake.amount, block.timestamp);
    }

    /**
     * @dev Get organization stake information
     */
    function getOrganizationStake(bytes8 organizationId)
        external
        view
        organizationExists(organizationId)
        returns (IStaking.OrganizationStake memory)
    {
        return stakingContract.getOrganizationStake(organizationId);
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
               stakingContract.canWithdrawOrganizationStake(organizationId);
    }

    // View functions
    function getOrganization(bytes8 id) external view override returns (Organization memory) {
        require(_organizationExists[id], "Organization does not exist");
        return _organizations[id];
    }

    function getOrganizationCount() external view override returns (uint256) {
        return _organizationIds.length;
    }

    function getAllOrganizations() external view override returns (Organization[] memory) {
        // Removed to reduce contract size - use events and subgraph instead
        revert("Use subgraph for bulk queries");
    }

    function getOrganizationsByState(OrgState state)
        external
        view
        override
        returns (Organization[] memory)
    {
        // Removed to reduce contract size - use events and subgraph instead
        revert("Use subgraph for state queries");
    }

    function isOrganizationActive(bytes8 organizationId)
        external
        view
        override
        returns (bool)
    {
        return _organizationExists[organizationId] && _organizations[organizationId].state == OrgState.Active;
    }
}
