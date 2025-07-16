// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.20;

import "../../core/Module.sol";
import "../../interfaces/IFlow.sol";
import "../../interfaces/IControl.sol";
import "../../interfaces/ISense.sol";
import "../../interfaces/IIdentity.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

/**
 * @title Flow
 * @dev Implementation of the Flow module for campaign management and crowdfunding with reputation integration
 * @author GameDAO AG
 */
contract Flow is Module, IFlow {
    using SafeERC20 for IERC20;
    using EnumerableSet for EnumerableSet.Bytes32Set;
    using EnumerableSet for EnumerableSet.AddressSet;

    // Constants
    bytes32 public constant FLOW_ADMIN_ROLE = keccak256("FLOW_ADMIN_ROLE");
    bytes32 public constant CAMPAIGN_CREATOR_ROLE = keccak256("CAMPAIGN_CREATOR_ROLE");
    uint256 public constant MAX_PROTOCOL_FEE = 1000; // 10% max protocol fee
    uint256 public constant BASIS_POINTS = 10000;

    // Reputation rewards
    uint256 public constant CAMPAIGN_CREATION_REPUTATION = 100; // Reputation for creating a campaign
    uint256 public constant CAMPAIGN_SUCCESS_REPUTATION = 500; // Reputation for successful campaign
    uint256 public constant CONTRIBUTION_REPUTATION = 50; // Reputation for contributing
    uint256 public constant LARGE_CONTRIBUTION_THRESHOLD = 1000 * 1e18; // Threshold for large contribution bonus
    uint256 public constant LARGE_CONTRIBUTION_BONUS = 100; // Additional reputation for large contributions

    // State variables
    mapping(bytes32 => Campaign) private _campaigns;
    mapping(bytes32 => mapping(address => Contribution)) private _contributions;
    mapping(bytes32 => EnumerableSet.AddressSet) private _campaignContributors;
    mapping(bytes32 => mapping(address => FlowReward)) private _rewards;
    mapping(bytes8 => EnumerableSet.Bytes32Set) private _organizationCampaigns;
    mapping(FlowState => EnumerableSet.Bytes32Set) private _campaignsByState;

    EnumerableSet.Bytes32Set private _allCampaigns;
    uint256 private _campaignCounter;
    uint256 private _protocolFeeRate; // In basis points (100 = 1%)
    address private _protocolFeeRecipient;

    // Errors
    error CampaignNotFound(bytes32 campaignId);
    error CampaignNotActive(bytes32 campaignId);
    error CampaignEnded(bytes32 campaignId);
    error CampaignNotEnded(bytes32 campaignId);
    error InvalidCampaignParameters();
    error InvalidContributionAmount(uint256 amount);
    error ContributionExceedsMax(uint256 amount, uint256 max);
    error CampaignCapReached(uint256 raised, uint256 max);
    error UnauthorizedCampaignAccess(bytes32 campaignId, address caller);
    error InvalidProtocolFee(uint256 fee);
    error NoContributionFound(bytes32 campaignId, address contributor);
    error ContributionAlreadyRefunded(bytes32 campaignId, address contributor);
    error RewardsAlreadyClaimed(bytes32 campaignId, address contributor, address token);
    error InsufficientRewardBalance(bytes32 campaignId, address token);
    error OrganizationNotFound(bytes8 organizationId);

    /**
     * @dev Constructor
     */
    constructor() Module("1.0.0") {
        _protocolFeeRate = 250; // 2.5% default protocol fee
        _protocolFeeRecipient = _msgSender();

        // Grant roles to deployer initially
        _grantRole(FLOW_ADMIN_ROLE, _msgSender());
        _grantRole(CAMPAIGN_CREATOR_ROLE, _msgSender());
    }

    /**
     * @dev Returns the unique identifier for this module
     */
    function moduleId() external pure override returns (bytes32) {
        return keccak256("FLOW");
    }

    /**
     * @dev Internal initialization hook
     */
    function _onInitialize() internal override {
        // Grant admin roles to the registry - access via this.registry() for external call
        address registryAddr = this.registry();
        _grantRole(FLOW_ADMIN_ROLE, registryAddr);
        _grantRole(CAMPAIGN_CREATOR_ROLE, registryAddr);
    }

    /**
     * @dev Create a new campaign
     */
    function createCampaign(
        bytes8 organizationId,
        string memory title,
        string memory description,
        string memory metadataURI,
        FlowType flowType,
        address paymentToken,
        uint256 target,
        uint256 min,
        uint256 max,
        uint256 duration,
        bool autoFinalize
    ) external override onlyInitialized whenNotPaused nonReentrant returns (bytes32 campaignId) {
        // Validate parameters
        if (target == 0 || min == 0 || max < target || duration == 0) {
            revert InvalidCampaignParameters();
        }

        // Check if organization exists
        if (!_getControlModule().isOrganizationActive(organizationId)) {
            revert OrganizationNotFound(organizationId);
        }

        // Generate campaign ID
        campaignId = keccak256(abi.encodePacked(organizationId, _campaignCounter++, block.timestamp));

        // Create campaign
        Campaign storage campaign = _campaigns[campaignId];
        campaign.index = _campaignCounter - 1;
        campaign.organizationId = organizationId;
        campaign.creator = _msgSender();
        campaign.admin = _msgSender();
        campaign.title = title;
        campaign.description = description;
        campaign.metadataURI = metadataURI;
        campaign.flowType = flowType;
        campaign.state = FlowState.Created;
        campaign.paymentToken = paymentToken;
        campaign.target = target;
        campaign.min = min;
        campaign.max = max;
        campaign.startTime = block.timestamp;
        campaign.endTime = block.timestamp + duration;
        campaign.createdAt = block.timestamp;
        campaign.updatedAt = block.timestamp;
        campaign.autoFinalize = autoFinalize;
        campaign.protocolFee = _protocolFeeRate;

        // Add to tracking
        _allCampaigns.add(campaignId);
        _organizationCampaigns[organizationId].add(campaignId);
        _campaignsByState[FlowState.Created].add(campaignId);

        // Award reputation to campaign creator
        _awardReputationForCampaignCreation(organizationId, _msgSender());

        emit CampaignCreated(
            campaignId,
            organizationId,
            _msgSender(),
            title,
            flowType,
            target,
            block.timestamp,
            campaign.endTime,
            block.timestamp
        );

        return campaignId;
    }

    /**
     * @dev Create a new campaign with struct parameters (new simplified API)
     */
    function createCampaignWithParams(
        address creator,
        bytes8 organizationId,
        CampaignParams memory params
    ) external override onlyInitialized whenNotPaused nonReentrant returns (bytes32 campaignId) {
        // Validate organization exists through Control module
        _validateOrganization(organizationId);

        // Validate campaign parameters
        if (bytes(params.title).length == 0) revert InvalidCampaignParameters();
        if (params.target == 0 || params.min > params.target || (params.max > 0 && params.max < params.target)) {
            revert InvalidCampaignParameters();
        }
        if (params.duration == 0) revert InvalidCampaignParameters();

        // Generate unique campaign ID
        campaignId = keccak256(abi.encodePacked(
            organizationId,
            creator,
            params.title,
            block.timestamp,
            _campaignCounter++
        ));

        // Create campaign
        Campaign storage campaign = _campaigns[campaignId];
        campaign.index = _campaignCounter;
        campaign.organizationId = organizationId;
        campaign.creator = creator;
        campaign.admin = creator;
        campaign.title = params.title;
        campaign.description = params.description;
        campaign.metadataURI = params.metadataURI;
        campaign.flowType = params.flowType;
        campaign.state = FlowState.Created;
        campaign.paymentToken = params.paymentToken;
        campaign.target = params.target;
        campaign.min = params.min;
        campaign.max = params.max;
        campaign.raised = 0;
        campaign.contributorCount = 0;
        campaign.startTime = block.timestamp;
        campaign.endTime = block.timestamp + params.duration;
        campaign.createdAt = block.timestamp;
        campaign.updatedAt = block.timestamp;
        campaign.autoFinalize = params.autoFinalize;
        campaign.protocolFee = _protocolFeeRate;

        // Add to tracking sets
        _allCampaigns.add(campaignId);
        _organizationCampaigns[organizationId].add(campaignId);
        _campaignsByState[FlowState.Created].add(campaignId);

        emit CampaignCreated(
            campaignId,
            organizationId,
            creator,
            params.title,
            params.flowType,
            params.target,
            campaign.startTime,
            campaign.endTime,
            block.timestamp
        );

        return campaignId;
    }

    /**
     * @dev Update an existing campaign
     */
    function updateCampaign(
        bytes32 campaignId,
        string memory title,
        string memory description,
        uint256 target,
        uint256 min,
        uint256 max,
        uint256 endTime
    ) external override onlyInitialized whenNotPaused {
        Campaign storage campaign = _campaigns[campaignId];
        if (campaign.creator == address(0)) revert CampaignNotFound(campaignId);

        // Only creator or admin can update
        if (_msgSender() != campaign.creator &&
            _msgSender() != campaign.admin &&
            !hasRole(FLOW_ADMIN_ROLE, _msgSender())) {
            revert UnauthorizedCampaignAccess(campaignId, _msgSender());
        }

        // Cannot update if campaign is finalized
        if (campaign.state == FlowState.Finalized) {
            revert UnauthorizedCampaignAccess(campaignId, _msgSender());
        }

        // Validate new parameters
        if (bytes(title).length > 0) campaign.title = title;
        if (bytes(description).length > 0) campaign.description = description;
        if (target > 0 && min <= target && (max == 0 || max >= target)) {
            campaign.target = target;
            campaign.min = min;
            campaign.max = max;
        }
        if (endTime > block.timestamp && endTime > campaign.startTime) {
            campaign.endTime = endTime;
        }

        campaign.updatedAt = block.timestamp;

        emit CampaignUpdated(
            campaignId,
            campaign.title,
            campaign.description,
            campaign.target,
            campaign.min,
            campaign.max,
            campaign.endTime,
            block.timestamp
        );
    }

    /**
     * @dev Set campaign state (admin only)
     */
    function setCampaignState(bytes32 campaignId, FlowState newState)
        external
        override
        onlyRole(FLOW_ADMIN_ROLE)
        onlyInitialized
        whenNotPaused
    {
        Campaign storage campaign = _campaigns[campaignId];
        if (campaign.creator == address(0)) revert CampaignNotFound(campaignId);

        FlowState oldState = campaign.state;
        if (oldState == newState) return;

        // Remove from old state tracking
        _campaignsByState[oldState].remove(campaignId);

        // Update state
        campaign.state = newState;
        campaign.updatedAt = block.timestamp;

        // Add to new state tracking
        _campaignsByState[newState].add(campaignId);

        emit CampaignStateChanged(campaignId, oldState, newState, block.timestamp);
    }

    /**
     * @dev Contribute to a campaign
     */
    function contribute(
        bytes32 campaignId,
        uint256 amount,
        string memory metadata
    ) external payable override onlyInitialized whenNotPaused nonReentrant {
        Campaign storage campaign = _campaigns[campaignId];
        if (campaign.creator == address(0)) {
            revert CampaignNotFound(campaignId);
        }

        if (campaign.state != FlowState.Active) {
            revert CampaignNotActive(campaignId);
        }

        if (block.timestamp >= campaign.endTime) {
            revert CampaignEnded(campaignId);
        }

        if (amount == 0) {
            revert InvalidContributionAmount(amount);
        }

        if (campaign.raised + amount > campaign.max) {
            revert CampaignCapReached(campaign.raised, campaign.max);
        }

        // Transfer tokens
        IERC20(campaign.paymentToken).safeTransferFrom(_msgSender(), address(this), amount);

        // Record contribution
        Contribution storage contribution = _contributions[campaignId][_msgSender()];
        contribution.contributor = _msgSender();
        contribution.amount += amount;
        contribution.timestamp = block.timestamp;
        contribution.state = ContributorState.Active;
        contribution.metadata = metadata;

        // Update campaign
        campaign.raised += amount;
        campaign.updatedAt = block.timestamp;

        // Add to contributors if first contribution
        if (!_campaignContributors[campaignId].contains(_msgSender())) {
            _campaignContributors[campaignId].add(_msgSender());
            campaign.contributorCount++;
        }

        // Award reputation to contributor
        _awardReputationForContribution(campaign.organizationId, _msgSender(), amount);

        // Auto-finalize if target reached and auto-finalize enabled
        if (campaign.autoFinalize && campaign.raised >= campaign.target) {
            _finalizeCampaign(campaignId);
        }

        emit ContributionMade(campaignId, _msgSender(), amount, campaign.raised, block.timestamp);
    }

    /**
     * @dev Finalize a campaign
     */
    function finalizeCampaign(bytes32 campaignId)
        external
        override
        onlyInitialized
        whenNotPaused
        nonReentrant
    {
        Campaign storage campaign = _campaigns[campaignId];
        if (campaign.creator == address(0)) {
            revert CampaignNotFound(campaignId);
        }

        // Only creator or admin can finalize
        if (_msgSender() != campaign.creator && _msgSender() != campaign.admin && !hasRole(FLOW_ADMIN_ROLE, _msgSender())) {
            revert UnauthorizedCampaignAccess(campaignId, _msgSender());
        }

        _finalizeCampaign(campaignId);
    }

    /**
     * @dev Internal function to finalize a campaign
     */
    function _finalizeCampaign(bytes32 campaignId) internal {
        Campaign storage campaign = _campaigns[campaignId];

        // Determine if campaign succeeded
        bool succeeded = campaign.raised >= campaign.min;

        // Update campaign state
        FlowState oldState = campaign.state;
        campaign.state = succeeded ? FlowState.Succeeded : FlowState.Failed;
        campaign.updatedAt = block.timestamp;

        // Update state tracking
        _campaignsByState[oldState].remove(campaignId);
        _campaignsByState[campaign.state].add(campaignId);

        if (succeeded) {
            // Calculate protocol fee
            uint256 protocolFee = (campaign.raised * campaign.protocolFee) / BASIS_POINTS;
            uint256 creatorAmount = campaign.raised - protocolFee;

            // Transfer funds to creator
            IERC20(campaign.paymentToken).safeTransfer(campaign.creator, creatorAmount);

            // Transfer protocol fee
            if (protocolFee > 0 && _protocolFeeRecipient != address(0)) {
                IERC20(campaign.paymentToken).safeTransfer(_protocolFeeRecipient, protocolFee);
            }

            // Award reputation to campaign creator for successful campaign
            _awardReputationForCampaignSuccess(campaign.organizationId, campaign.creator);

            // Record positive interactions for contributors
            _recordContributorInteractions(campaignId, campaign.organizationId, true);
        } else {
            // Campaign failed, enable refunds
            _recordContributorInteractions(campaignId, campaign.organizationId, false);
        }

        campaign.state = FlowState.Finalized;
        _campaignsByState[succeeded ? FlowState.Succeeded : FlowState.Failed].remove(campaignId);
        _campaignsByState[FlowState.Finalized].add(campaignId);

        emit CampaignFinalized(
            campaignId,
            campaign.state,
            campaign.raised,
            campaign.contributorCount,
            block.timestamp
        );
    }

    /**
     * @dev Refund a contribution (for failed campaigns)
     */
    function refundContribution(bytes32 campaignId, address contributor)
        external
        override
        onlyInitialized
        whenNotPaused
        nonReentrant
    {
        Campaign storage campaign = _campaigns[campaignId];
        if (campaign.creator == address(0)) revert CampaignNotFound(campaignId);

        // Only allow refunds for failed campaigns
        if (campaign.state != FlowState.Failed && campaign.state != FlowState.Finalized) {
            revert CampaignNotActive(campaignId);
        }

        Contribution storage contribution = _contributions[campaignId][contributor];
        if (contribution.contributor == address(0)) {
            revert NoContributionFound(campaignId, contributor);
        }
        if (contribution.state == ContributorState.Refunded) {
            revert ContributionAlreadyRefunded(campaignId, contributor);
        }

        uint256 refundAmount = contribution.amount;
        contribution.state = ContributorState.Refunded;
        contribution.amount = 0;

        // Transfer refund
        _transferFunds(campaign.paymentToken, contributor, refundAmount);

        emit ContributionRefunded(campaignId, contributor, refundAmount, block.timestamp);
    }

    /**
     * @dev Distribute rewards to contributors
     */
    function distributeRewards(
        bytes32 campaignId,
        address rewardToken,
        uint256 totalRewardAmount
    ) external override onlyInitialized whenNotPaused nonReentrant {
        Campaign storage campaign = _campaigns[campaignId];
        if (campaign.creator == address(0)) revert CampaignNotFound(campaignId);

        // Only creator or admin can distribute rewards
        if (_msgSender() != campaign.creator &&
            _msgSender() != campaign.admin &&
            !hasRole(FLOW_ADMIN_ROLE, _msgSender())) {
            revert UnauthorizedCampaignAccess(campaignId, _msgSender());
        }

        // Campaign must be successful
        if (campaign.state != FlowState.Succeeded && campaign.state != FlowState.Finalized) {
            revert CampaignNotActive(campaignId);
        }

        // Transfer reward tokens to contract
        IERC20(rewardToken).safeTransferFrom(_msgSender(), address(this), totalRewardAmount);

        // Set up reward distribution
        FlowReward storage reward = _rewards[campaignId][rewardToken];
        reward.token = rewardToken;
        reward.totalAmount = totalRewardAmount;
        reward.distributedAmount = 0;

        emit RewardsDistributed(
            campaignId,
            rewardToken,
            totalRewardAmount,
            campaign.contributorCount,
            block.timestamp
        );
    }

    /**
     * @dev Claim rewards for a contributor
     */
    function claimRewards(bytes32 campaignId, address rewardToken)
        external
        override
        onlyInitialized
        whenNotPaused
        nonReentrant
    {
        Campaign storage campaign = _campaigns[campaignId];
        if (campaign.creator == address(0)) revert CampaignNotFound(campaignId);

        Contribution storage contribution = _contributions[campaignId][_msgSender()];
        if (contribution.contributor == address(0)) {
            revert NoContributionFound(campaignId, _msgSender());
        }

        FlowReward storage reward = _rewards[campaignId][rewardToken];
        if (reward.token == address(0)) revert InsufficientRewardBalance(campaignId, rewardToken);

        // Check if already claimed
        if (reward.claimed[_msgSender()] > 0) {
            revert RewardsAlreadyClaimed(campaignId, _msgSender(), rewardToken);
        }

        // Calculate proportional reward
        uint256 rewardAmount = (contribution.amount * reward.totalAmount) / campaign.raised;

        reward.claimed[_msgSender()] = rewardAmount;
        reward.distributedAmount += rewardAmount;
        contribution.state = ContributorState.Rewarded;

        // Transfer reward
        IERC20(rewardToken).safeTransfer(_msgSender(), rewardAmount);
    }

    /**
     * @dev Withdraw funds from a successful campaign
     */
    function withdrawFunds(
        bytes32 campaignId,
        address to,
        uint256 amount
    ) external override onlyInitialized whenNotPaused nonReentrant {
        Campaign storage campaign = _campaigns[campaignId];
        if (campaign.creator == address(0)) revert CampaignNotFound(campaignId);

        // Only creator or admin can withdraw
        if (_msgSender() != campaign.creator &&
            _msgSender() != campaign.admin &&
            !hasRole(FLOW_ADMIN_ROLE, _msgSender())) {
            revert UnauthorizedCampaignAccess(campaignId, _msgSender());
        }

        // Campaign must be successful
        if (campaign.state != FlowState.Succeeded && campaign.state != FlowState.Finalized) {
            revert CampaignNotActive(campaignId);
        }

        // Calculate available funds (after protocol fee)
        uint256 protocolFee = calculateProtocolFee(campaign.raised);
        uint256 availableFunds = campaign.raised - protocolFee;

        if (amount > availableFunds) {
            revert InvalidContributionAmount(amount);
        }

        _transferFunds(campaign.paymentToken, to, amount);
    }

    /**
     * @dev Internal function to transfer funds
     */
    function _transferFunds(address token, address to, uint256 amount) internal {
        if (token == address(0)) {
            // ETH transfer
            (bool success, ) = payable(to).call{value: amount}("");
            require(success, "ETH transfer failed");
        } else {
            // ERC20 transfer
            IERC20(token).safeTransfer(to, amount);
        }
    }

    /**
     * @dev Validate organization exists through Control module
     */
    function _validateOrganization(bytes8 organizationId) internal view {
        address controlModule = getModule(keccak256("CONTROL"));
        if (controlModule == address(0)) revert OrganizationNotFound(organizationId);

        IControl control = IControl(controlModule);
        if (!control.isOrganizationActive(organizationId)) {
            revert OrganizationNotFound(organizationId);
        }
    }

    // ============ REPUTATION INTEGRATION ============

    /**
     * @dev Award reputation for campaign creation
     */
    function _awardReputationForCampaignCreation(bytes8 organizationId, address creator) internal {
        ISense senseModule = _getSenseModule();
        if (address(senseModule) != address(0)) {
            try senseModule.updateReputation(
                organizationId,
                _getProfileId(creator, organizationId),
                ISense.ReputationType.REPUTATION,
                int256(CAMPAIGN_CREATION_REPUTATION),
                keccak256("CAMPAIGN_CREATION")
            ) {} catch {
                // Silently fail if reputation update fails
            }
        }
    }

    /**
     * @dev Award reputation for successful campaign
     */
    function _awardReputationForCampaignSuccess(bytes8 organizationId, address creator) internal {
        ISense senseModule = _getSenseModule();
        if (address(senseModule) != address(0)) {
            try senseModule.updateReputation(
                organizationId,
                _getProfileId(creator, organizationId),
                ISense.ReputationType.REPUTATION,
                int256(CAMPAIGN_SUCCESS_REPUTATION),
                keccak256("CAMPAIGN_SUCCESS")
            ) {} catch {
                // Silently fail if reputation update fails
            }
        }
    }

    /**
     * @dev Award reputation for contribution
     */
    function _awardReputationForContribution(bytes8 organizationId, address contributor, uint256 amount) internal {
        ISense senseModule = _getSenseModule();
        if (address(senseModule) != address(0)) {
            uint256 reputationReward = CONTRIBUTION_REPUTATION;

            // Bonus for large contributions
            if (amount >= LARGE_CONTRIBUTION_THRESHOLD) {
                reputationReward += LARGE_CONTRIBUTION_BONUS;
            }

            try senseModule.updateReputation(
                organizationId,
                _getProfileId(contributor, organizationId),
                ISense.ReputationType.REPUTATION,
                int256(reputationReward),
                keccak256("CONTRIBUTION")
            ) {} catch {
                // Silently fail if reputation update fails
            }
        }
    }

    /**
     * @dev Record interactions for contributors based on campaign outcome
     */
    function _recordContributorInteractions(bytes32 campaignId, bytes8 organizationId, bool positive) internal {
        ISense senseModule = _getSenseModule();
        if (address(senseModule) != address(0)) {
            address[] memory contributors = _campaignContributors[campaignId].values();

            for (uint256 i = 0; i < contributors.length; i++) {
                bytes8 profileId = _getProfileId(contributors[i], organizationId);
                if (profileId != bytes8(0)) {
                    try senseModule.recordInteraction(
                        organizationId,
                        profileId,
                        positive,
                        positive ? keccak256("SUCCESSFUL_CAMPAIGN_CONTRIBUTION") : keccak256("FAILED_CAMPAIGN_CONTRIBUTION")
                    ) {} catch {
                        // Silently fail if interaction recording fails
                    }
                }
            }
        }
    }

    /**
     * @dev Get profile ID for an address
     */
    function _getProfileId(address account, bytes8 organizationId) internal view returns (bytes8) {
        address identityModule = getModule(keccak256("IDENTITY"));
        if (identityModule == address(0)) return bytes8(0);

        try IIdentity(identityModule).getProfileByOwner(account, organizationId) returns (IIdentity.Profile memory profile) {
            return profile.profileId;
        } catch {
            return bytes8(0);
        }
    }

    /**
     * @dev Get Control module instance
     */
    function _getControlModule() internal view returns (IControl) {
        return IControl(getModule(keccak256("CONTROL")));
    }

    /**
     * @dev Get Sense module instance
     */
    function _getSenseModule() internal view returns (ISense) {
        address senseAddress = getModule(keccak256("SENSE"));
        if (senseAddress == address(0)) {
            return ISense(address(0));
        }
        return ISense(senseAddress);
    }

    // ============ EXISTING FUNCTIONS CONTINUE ============
    // (The rest of the Flow contract functions remain unchanged)

    // View Functions
    function getCampaign(bytes32 campaignId) external view override returns (Campaign memory) {
        return _campaigns[campaignId];
    }

    function getContribution(bytes32 campaignId, address contributor)
        external
        view
        override
        returns (Contribution memory)
    {
        return _contributions[campaignId][contributor];
    }

    function getCampaignContributors(bytes32 campaignId)
        external
        view
        override
        returns (address[] memory)
    {
        return _campaignContributors[campaignId].values();
    }

    function getCampaignsByOrganization(bytes8 organizationId)
        external
        view
        override
        returns (bytes32[] memory)
    {
        return _organizationCampaigns[organizationId].values();
    }

    function getCampaignsByState(FlowState state)
        external
        view
        override
        returns (bytes32[] memory)
    {
        return _campaignsByState[state].values();
    }

    function isCampaignActive(bytes32 campaignId) external view override returns (bool) {
        Campaign storage campaign = _campaigns[campaignId];
        return campaign.state == FlowState.Active && block.timestamp < campaign.endTime;
    }

        function canContribute(bytes32 campaignId, address /* contributor */)
        external
        view
        override
        returns (bool)
    {
        Campaign storage campaign = _campaigns[campaignId];
        return campaign.creator != address(0) &&
               (campaign.state == FlowState.Active || campaign.state == FlowState.Created) &&
               block.timestamp < campaign.endTime &&
               (campaign.max == 0 || campaign.raised < campaign.max);
    }

    function getCampaignProgress(bytes32 campaignId)
        external
        view
        override
        returns (uint256 raised, uint256 target, uint256 percentage)
    {
        Campaign storage campaign = _campaigns[campaignId];
        raised = campaign.raised;
        target = campaign.target;
        percentage = target > 0 ? (raised * 100) / target : 0;
    }

    function getTimeRemaining(bytes32 campaignId) external view override returns (uint256) {
        Campaign storage campaign = _campaigns[campaignId];
        if (block.timestamp >= campaign.endTime) return 0;
        return campaign.endTime - block.timestamp;
    }

    function getCampaignCount() external view override returns (uint256) {
        return _allCampaigns.length();
    }

    function getProtocolFeeRate() external view override returns (uint256) {
        return _protocolFeeRate;
    }

    function calculateProtocolFee(uint256 amount) public view override returns (uint256) {
        return (amount * _protocolFeeRate) / BASIS_POINTS;
    }

    function getRewardDistribution(
        bytes32 campaignId,
        address rewardToken,
        address contributor
    ) external view override returns (uint256 totalReward, uint256 claimedAmount, uint256 claimableAmount) {
        Campaign storage campaign = _campaigns[campaignId];
        Contribution storage contribution = _contributions[campaignId][contributor];
        FlowReward storage reward = _rewards[campaignId][rewardToken];

        if (contribution.contributor == address(0) || reward.token == address(0)) {
            return (0, 0, 0);
        }

        totalReward = (contribution.amount * reward.totalAmount) / campaign.raised;
        claimedAmount = reward.claimed[contributor];
        claimableAmount = totalReward - claimedAmount;
    }

    // Admin Functions
    function setProtocolFeeRate(uint256 newRate) external onlyRole(FLOW_ADMIN_ROLE) {
        if (newRate > MAX_PROTOCOL_FEE) revert InvalidProtocolFee(newRate);
        _protocolFeeRate = newRate;
    }

    function setProtocolFeeRecipient(address newRecipient) external onlyRole(FLOW_ADMIN_ROLE) {
        require(newRecipient != address(0), "Invalid recipient");
        _protocolFeeRecipient = newRecipient;
    }

    // Emergency functions
    function emergencyWithdraw(address token, address to, uint256 amount)
        external
        onlyRole(ADMIN_ROLE)
    {
        _transferFunds(token, to, amount);
    }

    // Support for ETH contributions
    receive() external payable {
        // Allow ETH deposits
    }
}

