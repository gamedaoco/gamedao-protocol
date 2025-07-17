// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.20;

import "../../core/Module.sol";
import "../../interfaces/IControl.sol";
import "../../interfaces/IStaking.sol";
import "./Factory.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title Control
 * @dev Organization registry and management module
 * @author GameDAO AG
 */
contract Control is Module, IControl {
    // Constants
    bytes32 public constant MODULE_ID = keccak256("CONTROL");

    // Organization storage
    mapping(bytes8 => Organization) private _organizations;
    mapping(bytes8 => bool) private _organizationExists;
    bytes8[] private _organizationIds;

    // Contract references
    IERC20 public gameToken;
    IStaking public stakingContract;
    Factory public factory;

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

    modifier onlyFactory() {
        require(msg.sender == address(factory), "Only factory can call");
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
     * @dev Set the factory address
     */
    function setFactory(address _factory) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_factory != address(0), "Invalid factory address");
        factory = Factory(_factory);
    }

    /**
     * @dev Returns the module ID
     */
    function moduleId() external pure override returns (bytes32) {
        return MODULE_ID;
    }

    /**
     * @dev Register a new organization (called by factory)
     */
    function registerOrganization(bytes8 organizationId, Organization memory org) external override onlyFactory {
        require(!_organizationExists[organizationId], "Organization already exists");

        _organizations[organizationId] = org;
        _organizationExists[organizationId] = true;
        _organizationIds.push(organizationId);
    }

    /**
     * @dev Create organization - delegates to factory
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
    ) external override returns (bytes8) {
        require(address(factory) != address(0), "Factory not set");

        // Delegate to factory
        return factory.createOrganization(
            msg.sender,
            name,
            metadataURI,
            orgType,
            accessModel,
            feeModel,
            memberLimit,
            membershipFee,
            gameStakeRequired
        );
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
        revert("Use subgraph for bulk queries");
    }

    function getOrganizationsByState(OrgState state)
        external
        view
        override
        returns (Organization[] memory)
    {
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
