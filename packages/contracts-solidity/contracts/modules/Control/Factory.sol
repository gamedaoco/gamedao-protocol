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
 * @title Factory
 * @dev Factory contract for creating organizations
 * @author GameDAO AG
 */
contract Factory is Module {
    using Counters for Counters.Counter;
    using AlphanumericID for bytes32;

    // Constants
    bytes32 public constant MODULE_ID = keccak256("FACTORY");
    uint256 public constant MAX_MEMBER_LIMIT = 10000;
    uint256 public constant MIN_MEMBER_LIMIT = 1;
    uint256 public constant MIN_STAKE_AMOUNT = 10000 * 10**18; // 10,000 GAME tokens minimum

    // State variables
    Counters.Counter private _organizationCounter;

    // Contract references
    IERC20 public gameToken;
    IStaking public stakingContract;
    address public organizationRegistry;

    // Events
    event OrganizationCreated(
        bytes8 indexed id,
        string name,
        address indexed creator,
        address indexed treasury,
        uint256 timestamp
    );

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
     * @dev Set the registry address
     */
    function setRegistry(address _registry) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_registry != address(0), "Invalid registry address");
        organizationRegistry = _registry;
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
        address user,
        string memory name,
        string memory metadataURI,
        IControl.OrgType orgType,
        IControl.AccessModel accessModel,
        IControl.FeeModel feeModel,
        uint256 memberLimit,
        uint256 membershipFee,
        uint256 gameStakeRequired
    ) external validMemberLimit(memberLimit) validStakeAmount(gameStakeRequired) nonReentrant returns (bytes8) {
        require(bytes(name).length > 0, "Organization name cannot be empty");
        require(organizationRegistry != address(0), "Registry not set");

        // Generate unique 8-character alphanumeric ID
        _organizationCounter.increment();
        uint256 orgIndex = _organizationCounter.current();
        bytes8 orgId = AlphanumericID.generateOrganizationID(MODULE_ID, orgIndex, user, block.timestamp);

        // Handle GAME token staking
        require(
            gameToken.allowance(user, address(stakingContract)) >= gameStakeRequired,
            "Insufficient token allowance for stake"
        );

        // Create stake in staking contract
        stakingContract.stakeForOrganization(orgId, user, gameStakeRequired);

        // Create treasury for the organization
        bytes32 orgIdBytes32 = keccak256(abi.encodePacked(orgId));
        Treasury treasury = new Treasury(orgIdBytes32, organizationRegistry, user);

        // Create organization data
        IControl.Organization memory newOrg = IControl.Organization({
            id: orgId,
            name: name,
            metadataURI: metadataURI,
            creator: user,
            treasury: address(treasury),
            orgType: orgType,
            accessModel: accessModel,
            feeModel: feeModel,
            memberLimit: memberLimit,
            memberCount: 1,
            totalCampaigns: 0,
            totalProposals: 0,
            membershipFee: membershipFee,
            gameStakeRequired: gameStakeRequired,
            state: IControl.OrgState.Active,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });

        // Register organization with registry
        IControl(organizationRegistry).registerOrganization(orgId, newOrg);

        emit OrganizationCreated(orgId, name, user, address(treasury), block.timestamp);

        return orgId;
    }
}
