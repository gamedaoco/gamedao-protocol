// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.20;

import "../../core/GameDAOModule.sol";
import "../../core/Treasury.sol";
import "../../interfaces/IControl.sol";
import "../../interfaces/IGameStaking.sol";
import "../../interfaces/IGameDAOMembership.sol";
import "../../interfaces/IOrganizationSettings.sol";
import "../../libraries/AlphanumericID.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title Control (With Settings)
 * @dev Core DAO management module with OrganizationSettings integration
 * @author GameDAO AG
 * @notice Refactored to use Identity → Membership → Everything Else architecture with governance settings
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
    IOrganizationSettings public organizationSettings;

    // Events
    event StakeWithdrawn(bytes8 indexed organizationId, address indexed staker, uint256 amount, uint256 timestamp);
    event OrganizationSettingsUpdated(bytes8 indexed organizationId, uint256 timestamp);

    // Errors
    error OrganizationSettingsNotSet();
    error SettingsUpdateFailed(bytes8 organizationId, string reason);

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
        address _membershipContract,
        address _organizationSettings
    ) GameDAOModule("1.0.0") {
        require(_gameStaking != address(0), "Invalid game staking address");
        require(_membershipContract != address(0), "Invalid membership contract address");
        require(_organizationSettings != address(0), "Invalid organization settings address");

        gameStaking = IGameStaking(_gameStaking);
        membershipContract = IGameDAOMembership(_membershipContract);
        organizationSettings = IOrganizationSettings(_organizationSettings);
    }

    /**
     * @dev Returns the module ID
     */
    function moduleId() external pure override returns (bytes32) {
        return MODULE_ID;
    }

    /**
     * @dev Create a new organization with governance-controlled settings
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
    ) external override onlyInitialized whenNotPaused nonReentrant validMemberLimit(memberLimit) validStakeAmount(gameStakeRequired) returns (bytes8) {
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

        // Initialize organization settings with current values
        _initializeOrganizationSettings(orgId, accessModel, feeModel, memberLimit, membershipFee, gameStakeRequired);

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
     * @dev Update organization configuration (requires governance approval)
     */
    function updateOrganizationConfig(
        bytes8 organizationId,
        AccessModel accessModel,
        FeeModel feeModel,
        uint256 memberLimit,
        uint256 membershipFee,
        uint256 minimumStake
    ) external organizationExists(organizationId) onlyActiveMember(organizationId) {
        if (address(organizationSettings) == address(0)) {
            revert OrganizationSettingsNotSet();
        }

        // Create membership config data
        IOrganizationSettings.MembershipConfig memory config = IOrganizationSettings.MembershipConfig({
            membershipFee: membershipFee,
            memberLimit: memberLimit,
            accessModel: uint8(accessModel),
            feeModel: uint8(feeModel),
            minimumStake: minimumStake,
            lastUpdated: 0 // Will be set by OrganizationSettings
        });

        // Encode the config data
        bytes memory configData = abi.encode(config);

        // Propose the setting change (requires governance vote)
        organizationSettings.proposeSettingChange(
            organizationId,
            IOrganizationSettings.SettingType.MEMBERSHIP_CONFIG,
            configData,
            string(abi.encodePacked("MEMBERSHIP-CONFIG-", block.timestamp)),
            "Update organization membership configuration"
        );

        emit OrganizationSettingsUpdated(organizationId, block.timestamp);
    }

    /**
     * @dev Update organization staking requirements (requires governance approval)
     */
    function updateStakingRequirements(
        bytes8 organizationId,
        uint256 organizationStake,
        uint256 memberStake,
        uint256 lockPeriod,
        uint256 slashingRate
    ) external organizationExists(organizationId) onlyActiveMember(organizationId) {
        if (address(organizationSettings) == address(0)) {
            revert OrganizationSettingsNotSet();
        }

        // Create staking requirements data
        IOrganizationSettings.StakingRequirements memory requirements = IOrganizationSettings.StakingRequirements({
            organizationStake: organizationStake,
            memberStake: memberStake,
            lockPeriod: lockPeriod,
            slashingRate: slashingRate,
            lastUpdated: 0 // Will be set by OrganizationSettings
        });

        // Encode the requirements data
        bytes memory requirementsData = abi.encode(requirements);

        // Propose the setting change (requires governance vote)
        organizationSettings.proposeSettingChange(
            organizationId,
            IOrganizationSettings.SettingType.STAKING_REQUIREMENTS,
            requirementsData,
            string(abi.encodePacked("STAKING-REQUIREMENTS-", block.timestamp)),
            "Update organization staking requirements"
        );

        emit OrganizationSettingsUpdated(organizationId, block.timestamp);
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
        // Get current membership configuration from settings
        IOrganizationSettings.MembershipConfig memory config = organizationSettings.getMembershipConfig(organizationId);

        Organization storage org = _organizations[organizationId];

        // Check permissions based on access model
        if (config.accessModel == uint8(AccessModel.Invite)) {
            require(msg.sender == org.creator, "Only creator can invite members");
        } else if (config.accessModel == uint8(AccessModel.Voting)) {
            require(membershipContract.isActiveMember(organizationId, msg.sender), "Only active members can vote");
            // TODO: Implement voting mechanism through Signal contract
        }
        // AccessModel.Open allows anyone to join

        // Use membership fee from settings
        uint256 membershipFee = config.membershipFee;

        // Delegate to membership contract
        membershipContract.addMember(
            organizationId,
            member,
            0x0000000000000000, // No profile ID for now
            IGameDAOMembership.MembershipTier.Basic,
            membershipFee
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

        // Update configuration from settings
        if (address(organizationSettings) != address(0)) {
            IOrganizationSettings.MembershipConfig memory config = organizationSettings.getMembershipConfig(id);
            org.membershipFee = config.membershipFee;
            org.memberLimit = config.memberLimit;
            org.accessModel = AccessModel(config.accessModel);
            org.feeModel = FeeModel(config.feeModel);

            IOrganizationSettings.StakingRequirements memory stakingReqs = organizationSettings.getStakingRequirements(id);
            org.gameStakeRequired = stakingReqs.organizationStake;
        }

        return org;
    }

    function getMember(bytes8 organizationId, address member)
        external
        view
        override
        returns (Member memory)
    {
        require(_organizationExists[organizationId], "Organization does not exist");

        // Get member data from membership contract
        IGameDAOMembership.Member memory memberData = membershipContract.getMember(organizationId, member);

        // Convert to Control Member struct
        return Member({
            account: memberData.account,
            state: _convertMemberState(memberData.state),
            joinedAt: memberData.joinedAt,
            reputation: memberData.reputation,
            stake: 0 // Stake is managed separately
        });
    }

    function isMember(bytes8 organizationId, address member)
        external
        view
        override
        returns (bool)
    {
        return _organizationExists[organizationId] && membershipContract.isMember(organizationId, member);
    }

    function getOrganizationCount() external view override returns (uint256) {
        return _organizationIds.length;
    }

    function getAllOrganizations() external view override returns (Organization[] memory) {
        Organization[] memory organizations = new Organization[](_organizationIds.length);
        for (uint256 i = 0; i < _organizationIds.length; i++) {
            organizations[i] = this.getOrganization(_organizationIds[i]);
        }
        return organizations;
    }

    function getOrganizationsByState(OrgState state) external view override returns (Organization[] memory) {
        // Count organizations in the specified state
        uint256 count = 0;
        for (uint256 i = 0; i < _organizationIds.length; i++) {
            if (_organizations[_organizationIds[i]].state == state) {
                count++;
            }
        }

        // Create array and populate
        Organization[] memory organizations = new Organization[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < _organizationIds.length; i++) {
            if (_organizations[_organizationIds[i]].state == state) {
                organizations[index] = this.getOrganization(_organizationIds[i]);
                index++;
            }
        }

        return organizations;
    }

    function getMemberCount(bytes8 organizationId) external view override returns (uint256) {
        require(_organizationExists[organizationId], "Organization does not exist");
        return membershipContract.getMemberCount(organizationId);
    }

    function getMembers(bytes8 organizationId) external view override returns (address[] memory) {
        require(_organizationExists[organizationId], "Organization does not exist");
        return membershipContract.getAllMembers(organizationId);
    }

    function isOrganizationActive(bytes8 organizationId) external view override returns (bool) {
        return _organizationExists[organizationId] && _organizations[organizationId].state == OrgState.Active;
    }

    function isMemberActive(bytes8 organizationId, address member) external view override returns (bool) {
        return _organizationExists[organizationId] && membershipContract.isActiveMember(organizationId, member);
    }

    // =============================================================
    // SETTINGS INTEGRATION FUNCTIONS
    // =============================================================

    /**
     * @dev Get organization settings
     */
    function getOrganizationSettings(bytes8 organizationId) external view returns (
        IOrganizationSettings.VotingParameters memory votingParams,
        IOrganizationSettings.MembershipConfig memory membershipConfig,
        IOrganizationSettings.TreasuryConfig memory treasuryConfig,
        IOrganizationSettings.StakingRequirements memory stakingRequirements,
        IOrganizationSettings.ReputationConfig memory reputationConfig,
        IOrganizationSettings.GovernanceConfig memory governanceConfig
    ) {
        require(_organizationExists[organizationId], "Organization does not exist");

        if (address(organizationSettings) != address(0)) {
            votingParams = organizationSettings.getVotingParameters(organizationId);
            membershipConfig = organizationSettings.getMembershipConfig(organizationId);
            treasuryConfig = organizationSettings.getTreasuryConfig(organizationId);
            stakingRequirements = organizationSettings.getStakingRequirements(organizationId);
            reputationConfig = organizationSettings.getReputationConfig(organizationId);
            governanceConfig = organizationSettings.getGovernanceConfig(organizationId);
        }
    }

    /**
     * @dev Check if a setting change is pending for an organization
     */
    function getPendingSettingChanges(bytes8 organizationId) external view returns (IOrganizationSettings.SettingChange[] memory) {
        require(_organizationExists[organizationId], "Organization does not exist");

        if (address(organizationSettings) != address(0)) {
            return organizationSettings.getPendingSettingChanges(organizationId);
        }

        return new IOrganizationSettings.SettingChange[](0);
    }

    // =============================================================
    // INTERNAL FUNCTIONS
    // =============================================================

    /**
     * @dev Initialize organization settings with default values
     */
    function _initializeOrganizationSettings(
        bytes8 organizationId,
        AccessModel accessModel,
        FeeModel feeModel,
        uint256 memberLimit,
        uint256 membershipFee,
        uint256 gameStakeRequired
    ) internal {
        if (address(organizationSettings) == address(0)) {
            return; // Skip if settings contract not set
        }

        // Default voting parameters
        IOrganizationSettings.VotingParameters memory votingParams = IOrganizationSettings.VotingParameters({
            votingDelay: 1 days,
            votingPeriod: 7 days,
            executionDelay: 2 days,
            quorumThreshold: 1000, // 10%
            proposalThreshold: 100, // 1%
            requireMembership: true,
            lastUpdated: 0
        });

        // Membership configuration
        IOrganizationSettings.MembershipConfig memory membershipConfig = IOrganizationSettings.MembershipConfig({
            membershipFee: membershipFee,
            memberLimit: memberLimit,
            accessModel: uint8(accessModel),
            feeModel: uint8(feeModel),
            minimumStake: 0,
            lastUpdated: 0
        });

        // Default treasury configuration
        IOrganizationSettings.TreasuryConfig memory treasuryConfig = IOrganizationSettings.TreasuryConfig({
            spendingLimit: 1000 * 10**18, // 1000 GAME tokens
            proposalBond: 100 * 10**18, // 100 GAME tokens
            authorizedSpenders: new address[](0),
            emergencyFund: 10000 * 10**18, // 10000 GAME tokens
            lastUpdated: 0
        });

        // Staking requirements
        IOrganizationSettings.StakingRequirements memory stakingRequirements = IOrganizationSettings.StakingRequirements({
            organizationStake: gameStakeRequired,
            memberStake: 100 * 10**18, // 100 GAME tokens
            lockPeriod: 30 days,
            slashingRate: 1000, // 10%
            lastUpdated: 0
        });

        // Default reputation configuration
        IOrganizationSettings.ReputationConfig memory reputationConfig = IOrganizationSettings.ReputationConfig({
            baseReputation: 100,
            maxReputation: 10000,
            reputationDecay: 10, // 0.1% per day
            proposalReward: 50,
            votingReward: 10,
            lastUpdated: 0
        });

        // Default governance configuration
        IOrganizationSettings.GovernanceConfig memory governanceConfig = IOrganizationSettings.GovernanceConfig({
            emergencyVotingPeriod: 24 hours,
            constitutionalThreshold: 6700, // 67%
            adminActionDelay: 2 days,
            enableConvictionVoting: true,
            lastUpdated: 0
        });

        // Initialize settings
        organizationSettings.initializeOrganizationSettings(
            organizationId,
            votingParams,
            membershipConfig,
            treasuryConfig,
            stakingRequirements,
            reputationConfig,
            governanceConfig
        );
    }

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
