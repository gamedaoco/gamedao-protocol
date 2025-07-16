// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.20;

import "../../core/GameDAOModule.sol";
import "../../interfaces/IFlow.sol";
import "../../interfaces/IControl.sol";
import "../../interfaces/IGameDAOMembership.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

/**
 * @title Flow (With Membership Integration)
 * @dev Implementation of the Flow module with GameDAOMembership integration
 * @author GameDAO AG
 * @notice Campaign management and crowdfunding with centralized membership management
 */
contract Flow is GameDAOModule, IFlow {
    using SafeERC20 for IERC20;
    using EnumerableSet for EnumerableSet.Bytes32Set;
    using EnumerableSet for EnumerableSet.AddressSet;

    // Constants
    bytes32 public constant FLOW_ADMIN_ROLE = keccak256("FLOW_ADMIN_ROLE");
    bytes32 public constant CAMPAIGN_CREATOR_ROLE = keccak256("CAMPAIGN_CREATOR_ROLE");
    uint256 public constant MAX_PROTOCOL_FEE = 1000; // 10% max protocol fee
    uint256 public constant BASIS_POINTS = 10000;

    // State variables (REDUCED SIZE - no membership storage)
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

    // Contract references
    IGameDAOMembership public membershipContract;

    // Events
    event MembershipContractUpdated(address indexed membershipContract, uint256 timestamp);
    event CampaignCreatorValidated(bytes32 indexed campaignId, bytes8 indexed organizationId, address indexed creator, uint256 timestamp);
    event ContributorReputationRewarded(bytes32 indexed campaignId, address indexed contributor, uint256 amount, uint256 timestamp);

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
    error MembershipContractNotSet();
    error MembershipRequired(bytes8 organizationId, address member);

    /**
     * @dev Constructor
     */
    constructor() GameDAOModule("1.0.0") {
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
        // Grant admin roles to the registry
        address registryAddr = this.registry();
        _grantRole(FLOW_ADMIN_ROLE, registryAddr);
        _grantRole(CAMPAIGN_CREATOR_ROLE, registryAddr);
    }

    /**
     * @dev Set membership contract
     */
    function setMembershipContract(address _membershipContract) external onlyRole(FLOW_ADMIN_ROLE) {
        membershipContract = IGameDAOMembership(_membershipContract);
        emit MembershipContractUpdated(_membershipContract, block.timestamp);
    }

    /**
     * @dev Create a new campaign (UPDATED TO USE MEMBERSHIP CONTRACT)
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
        // Validate organization exists through Control module
        _validateOrganization(organizationId);

        // Validate creator is a member using membership contract
        if (address(membershipContract) != address(0)) {
            if (!membershipContract.isActiveMember(organizationId, _msgSender())) {
                revert MembershipRequired(organizationId, _msgSender());
            }
        } else {
            // Fallback to Control module validation
            IControl control = IControl(getModule(keccak256("CONTROL")));
            if (!control.isMember(organizationId, _msgSender())) {
                revert MembershipRequired(organizationId, _msgSender());
            }
        }

        // Validate campaign parameters
        if (bytes(title).length == 0) revert InvalidCampaignParameters();
        if (target == 0 || min > target || (max > 0 && max < target)) {
            revert InvalidCampaignParameters();
        }
        if (duration == 0) revert InvalidCampaignParameters();

        // Generate unique campaign ID
        campaignId = keccak256(abi.encodePacked(
            organizationId,
            _msgSender(),
            title,
            block.timestamp,
            _campaignCounter++
        ));

        // Create campaign
        Campaign storage campaign = _campaigns[campaignId];
        campaign.index = _campaignCounter;
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
        campaign.raised = 0;
        campaign.contributorCount = 0;
        campaign.startTime = block.timestamp;
        campaign.endTime = block.timestamp + duration;
        campaign.createdAt = block.timestamp;
        campaign.updatedAt = block.timestamp;
        campaign.autoFinalize = autoFinalize;
        campaign.protocolFee = _protocolFeeRate;

        // Add to tracking sets
        _allCampaigns.add(campaignId);
        _organizationCampaigns[organizationId].add(campaignId);
        _campaignsByState[FlowState.Created].add(campaignId);

        emit CampaignCreated(
            campaignId,
            organizationId,
            _msgSender(),
            title,
            flowType,
            paymentToken,
            target,
            duration,
            block.timestamp
        );

        emit CampaignCreatorValidated(campaignId, organizationId, _msgSender(), block.timestamp);

        // Reward creator for campaign creation using membership contract
        if (address(membershipContract) != address(0)) {
            try membershipContract.rewardProposalCreation(organizationId, _msgSender()) {
                // Reputation reward applied successfully
            } catch {
                // Continue if reputation reward fails
            }
        }

        return campaignId;
    }

    /**
     * @dev Update campaign admin (UPDATED TO USE MEMBERSHIP CONTRACT)
     */
    function updateCampaignAdmin(bytes32 campaignId, address newAdmin)
        external
        override
        onlyInitialized
        nonReentrant
    {
        Campaign storage campaign = _campaigns[campaignId];
        if (campaign.creator == address(0)) revert CampaignNotFound(campaignId);

        // Only current admin can update
        if (campaign.admin != _msgSender()) {
            revert UnauthorizedCampaignAccess(campaignId, _msgSender());
        }

        // Validate new admin is a member using membership contract
        if (address(membershipContract) != address(0)) {
            if (!membershipContract.isActiveMember(campaign.organizationId, newAdmin)) {
                revert MembershipRequired(campaign.organizationId, newAdmin);
            }
        } else {
            // Fallback to Control module validation
            IControl control = IControl(getModule(keccak256("CONTROL")));
            if (!control.isMember(campaign.organizationId, newAdmin)) {
                revert MembershipRequired(campaign.organizationId, newAdmin);
            }
        }

        address oldAdmin = campaign.admin;
        campaign.admin = newAdmin;
        campaign.updatedAt = block.timestamp;

        emit CampaignAdminUpdated(campaignId, oldAdmin, newAdmin, block.timestamp);
    }

    /**
     * @dev Contribute to a campaign (UPDATED TO REWARD CONTRIBUTORS)
     */
    function contribute(bytes32 campaignId, uint256 amount)
        external
        override
        onlyInitialized
        whenNotPaused
        nonReentrant
    {
        Campaign storage campaign = _campaigns[campaignId];
        if (campaign.creator == address(0)) revert CampaignNotFound(campaignId);

        // Update campaign state
        _updateCampaignState(campaignId);

        if (campaign.state != FlowState.Active) {
            revert CampaignNotActive(campaignId);
        }

        if (block.timestamp >= campaign.endTime) {
            revert CampaignEnded(campaignId);
        }

        if (amount == 0) revert InvalidContributionAmount(amount);

        // Check contribution limits
        if (campaign.max > 0 && amount > campaign.max) {
            revert ContributionExceedsMax(amount, campaign.max);
        }

        // Check if contribution would exceed target
        if (campaign.raised + amount > campaign.target) {
            revert CampaignCapReached(campaign.raised, campaign.target);
        }

        // Process contribution
        IERC20 token = IERC20(campaign.paymentToken);
        token.safeTransferFrom(_msgSender(), address(this), amount);

        // Update contribution
        Contribution storage contribution = _contributions[campaignId][_msgSender()];
        if (contribution.amount == 0) {
            // First contribution
            contribution.contributor = _msgSender();
            contribution.timestamp = block.timestamp;
            campaign.contributorCount++;
            _campaignContributors[campaignId].add(_msgSender());
        }
        contribution.amount += amount;
        contribution.updatedAt = block.timestamp;

        // Update campaign
        campaign.raised += amount;
        campaign.updatedAt = block.timestamp;

        emit ContributionMade(campaignId, _msgSender(), amount, block.timestamp);

        // Reward contributor using membership contract (if they're a member)
        if (address(membershipContract) != address(0)) {
            if (membershipContract.isActiveMember(campaign.organizationId, _msgSender())) {
                try membershipContract.rewardVoting(campaign.organizationId, _msgSender()) {
                    emit ContributorReputationRewarded(campaignId, _msgSender(), amount, block.timestamp);
                } catch {
                    // Continue if reputation reward fails
                }
            }
        }

        // Auto-finalize if target reached and enabled
        if (campaign.autoFinalize && campaign.raised >= campaign.target) {
            _finalizeCampaign(campaignId);
        }
    }

    /**
     * @dev Activate a campaign (UPDATED TO CHECK MEMBERSHIP)
     */
    function activateCampaign(bytes32 campaignId)
        external
        override
        onlyInitialized
        nonReentrant
    {
        Campaign storage campaign = _campaigns[campaignId];
        if (campaign.creator == address(0)) revert CampaignNotFound(campaignId);

        // Only admin can activate
        if (campaign.admin != _msgSender()) {
            revert UnauthorizedCampaignAccess(campaignId, _msgSender());
        }

        // Validate admin is still a member
        if (address(membershipContract) != address(0)) {
            if (!membershipContract.isActiveMember(campaign.organizationId, _msgSender())) {
                revert MembershipRequired(campaign.organizationId, _msgSender());
            }
        }

        if (campaign.state != FlowState.Created) {
            revert InvalidCampaignParameters();
        }

        // Update state
        _campaignsByState[FlowState.Created].remove(campaignId);
        _campaignsByState[FlowState.Active].add(campaignId);
        campaign.state = FlowState.Active;
        campaign.updatedAt = block.timestamp;

        emit CampaignActivated(campaignId, _msgSender(), block.timestamp);
    }

    /**
     * @dev Finalize a campaign (UPDATED TO CHECK MEMBERSHIP)
     */
    function finalizeCampaign(bytes32 campaignId)
        external
        override
        onlyInitialized
        nonReentrant
    {
        Campaign storage campaign = _campaigns[campaignId];
        if (campaign.creator == address(0)) revert CampaignNotFound(campaignId);

        // Only admin can finalize
        if (campaign.admin != _msgSender()) {
            revert UnauthorizedCampaignAccess(campaignId, _msgSender());
        }

        // Validate admin is still a member
        if (address(membershipContract) != address(0)) {
            if (!membershipContract.isActiveMember(campaign.organizationId, _msgSender())) {
                revert MembershipRequired(campaign.organizationId, _msgSender());
            }
        }

        _finalizeCampaign(campaignId);
    }

    /**
     * @dev Cancel a campaign (UPDATED TO CHECK MEMBERSHIP)
     */
    function cancelCampaign(bytes32 campaignId)
        external
        override
        onlyInitialized
        nonReentrant
    {
        Campaign storage campaign = _campaigns[campaignId];
        if (campaign.creator == address(0)) revert CampaignNotFound(campaignId);

        // Only admin can cancel
        if (campaign.admin != _msgSender()) {
            revert UnauthorizedCampaignAccess(campaignId, _msgSender());
        }

        // Validate admin is still a member
        if (address(membershipContract) != address(0)) {
            if (!membershipContract.isActiveMember(campaign.organizationId, _msgSender())) {
                revert MembershipRequired(campaign.organizationId, _msgSender());
            }
        }

        if (campaign.state != FlowState.Created && campaign.state != FlowState.Active) {
            revert InvalidCampaignParameters();
        }

        // Update state
        _campaignsByState[campaign.state].remove(campaignId);
        _campaignsByState[FlowState.Cancelled].add(campaignId);
        campaign.state = FlowState.Cancelled;
        campaign.updatedAt = block.timestamp;

        emit CampaignCancelled(campaignId, _msgSender(), block.timestamp);
    }

    /**
     * @dev Claim refund for a cancelled or failed campaign
     */
    function claimRefund(bytes32 campaignId)
        external
        override
        onlyInitialized
        nonReentrant
    {
        Campaign storage campaign = _campaigns[campaignId];
        if (campaign.creator == address(0)) revert CampaignNotFound(campaignId);

        // Update campaign state
        _updateCampaignState(campaignId);

        if (campaign.state != FlowState.Cancelled && campaign.state != FlowState.Failed) {
            revert InvalidCampaignParameters();
        }

        Contribution storage contribution = _contributions[campaignId][_msgSender()];
        if (contribution.amount == 0) {
            revert NoContributionFound(campaignId, _msgSender());
        }

        if (contribution.refunded) {
            revert ContributionAlreadyRefunded(campaignId, _msgSender());
        }

        // Process refund
        uint256 refundAmount = contribution.amount;
        contribution.refunded = true;
        contribution.updatedAt = block.timestamp;

        IERC20 token = IERC20(campaign.paymentToken);
        token.safeTransfer(_msgSender(), refundAmount);

        emit RefundClaimed(campaignId, _msgSender(), refundAmount, block.timestamp);
    }

    /**
     * @dev Withdraw funds from a successful campaign
     */
    function withdrawFunds(bytes32 campaignId, uint256 amount)
        external
        override
        onlyInitialized
        nonReentrant
    {
        Campaign storage campaign = _campaigns[campaignId];
        if (campaign.creator == address(0)) revert CampaignNotFound(campaignId);

        // Only admin can withdraw
        if (campaign.admin != _msgSender()) {
            revert UnauthorizedCampaignAccess(campaignId, _msgSender());
        }

        // Validate admin is still a member
        if (address(membershipContract) != address(0)) {
            if (!membershipContract.isActiveMember(campaign.organizationId, _msgSender())) {
                revert MembershipRequired(campaign.organizationId, _msgSender());
            }
        }

        // Update campaign state
        _updateCampaignState(campaignId);

        if (campaign.state != FlowState.Successful) {
            revert InvalidCampaignParameters();
        }

        if (amount == 0 || amount > campaign.raised) {
            revert InvalidContributionAmount(amount);
        }

        // Calculate protocol fee
        uint256 protocolFee = (amount * campaign.protocolFee) / BASIS_POINTS;
        uint256 netAmount = amount - protocolFee;

        // Update campaign
        campaign.raised -= amount;
        campaign.updatedAt = block.timestamp;

        // Transfer funds
        IERC20 token = IERC20(campaign.paymentToken);
        if (protocolFee > 0) {
            token.safeTransfer(_protocolFeeRecipient, protocolFee);
        }
        token.safeTransfer(_msgSender(), netAmount);

        emit FundsWithdrawn(campaignId, _msgSender(), amount, protocolFee, block.timestamp);
    }

    /**
     * @dev Add rewards to a campaign
     */
    function addRewards(
        bytes32 campaignId,
        address token,
        uint256 amount,
        uint256 minContribution
    ) external override onlyInitialized nonReentrant {
        Campaign storage campaign = _campaigns[campaignId];
        if (campaign.creator == address(0)) revert CampaignNotFound(campaignId);

        // Only admin can add rewards
        if (campaign.admin != _msgSender()) {
            revert UnauthorizedCampaignAccess(campaignId, _msgSender());
        }

        // Validate admin is still a member
        if (address(membershipContract) != address(0)) {
            if (!membershipContract.isActiveMember(campaign.organizationId, _msgSender())) {
                revert MembershipRequired(campaign.organizationId, _msgSender());
            }
        }

        if (amount == 0) revert InvalidContributionAmount(amount);

        // Transfer reward tokens
        IERC20 rewardToken = IERC20(token);
        rewardToken.safeTransferFrom(_msgSender(), address(this), amount);

        // Update rewards
        FlowReward storage reward = _rewards[campaignId][token];
        reward.token = token;
        reward.totalAmount += amount;
        reward.minContribution = minContribution;
        reward.updatedAt = block.timestamp;

        emit RewardsAdded(campaignId, token, amount, minContribution, block.timestamp);
    }

    /**
     * @dev Claim rewards for a contribution
     */
    function claimRewards(bytes32 campaignId, address token)
        external
        override
        onlyInitialized
        nonReentrant
    {
        Campaign storage campaign = _campaigns[campaignId];
        if (campaign.creator == address(0)) revert CampaignNotFound(campaignId);

        Contribution storage contribution = _contributions[campaignId][_msgSender()];
        if (contribution.amount == 0) {
            revert NoContributionFound(campaignId, _msgSender());
        }

        FlowReward storage reward = _rewards[campaignId][token];
        if (reward.totalAmount == 0) {
            revert InsufficientRewardBalance(campaignId, token);
        }

        if (contribution.amount < reward.minContribution) {
            revert InvalidContributionAmount(contribution.amount);
        }

        if (contribution.rewardsClaimed[token]) {
            revert RewardsAlreadyClaimed(campaignId, _msgSender(), token);
        }

        // Calculate reward amount based on contribution percentage
        uint256 rewardAmount = (reward.totalAmount * contribution.amount) / campaign.raised;

        // Update state
        contribution.rewardsClaimed[token] = true;
        contribution.updatedAt = block.timestamp;
        reward.claimedAmount += rewardAmount;

        // Transfer rewards
        IERC20 rewardToken = IERC20(token);
        rewardToken.safeTransfer(_msgSender(), rewardAmount);

        emit RewardsClaimed(campaignId, _msgSender(), token, rewardAmount, block.timestamp);
    }

    // =============================================================
    // INTERNAL FUNCTIONS
    // =============================================================

    /**
     * @dev Internal function to finalize a campaign
     */
    function _finalizeCampaign(bytes32 campaignId) internal {
        Campaign storage campaign = _campaigns[campaignId];

        // Update campaign state
        _updateCampaignState(campaignId);

        if (campaign.state != FlowState.Active) {
            revert InvalidCampaignParameters();
        }

        // Determine final state
        FlowState finalState = campaign.raised >= campaign.min ? FlowState.Successful : FlowState.Failed;

        // Update state
        _campaignsByState[FlowState.Active].remove(campaignId);
        _campaignsByState[finalState].add(campaignId);
        campaign.state = finalState;
        campaign.updatedAt = block.timestamp;

        emit CampaignFinalized(campaignId, finalState, campaign.raised, block.timestamp);
    }

    /**
     * @dev Update campaign state based on current conditions
     */
    function _updateCampaignState(bytes32 campaignId) internal {
        Campaign storage campaign = _campaigns[campaignId];

        if (campaign.state == FlowState.Active && block.timestamp >= campaign.endTime) {
            // Campaign has ended, finalize it
            _finalizeCampaign(campaignId);
        }
    }

    /**
     * @dev Validate organization exists through Control module (UPDATED TO USE MEMBERSHIP CONTRACT)
     */
    function _validateOrganization(bytes8 organizationId) internal view {
        // First check with membership contract if available
        if (address(membershipContract) != address(0)) {
            // Organization exists if it has been registered with membership contract
            try membershipContract.getMemberCount(organizationId) returns (uint256) {
                // Organization exists if we can get member count
                return;
            } catch {
                // Fall through to Control module check
            }
        }

        // Fallback to Control module
        address controlModule = getModule(keccak256("CONTROL"));
        if (controlModule == address(0)) revert OrganizationNotFound(organizationId);

        IControl control = IControl(controlModule);
        if (!control.isOrganizationActive(organizationId)) {
            revert OrganizationNotFound(organizationId);
        }
    }

    // =============================================================
    // ADMIN FUNCTIONS
    // =============================================================

    /**
     * @dev Set protocol fee rate
     */
    function setProtocolFeeRate(uint256 feeRate) external onlyRole(FLOW_ADMIN_ROLE) {
        if (feeRate > MAX_PROTOCOL_FEE) revert InvalidProtocolFee(feeRate);
        _protocolFeeRate = feeRate;
        emit ProtocolFeeRateUpdated(feeRate, block.timestamp);
    }

    /**
     * @dev Set protocol fee recipient
     */
    function setProtocolFeeRecipient(address recipient) external onlyRole(FLOW_ADMIN_ROLE) {
        require(recipient != address(0), "Invalid recipient");
        _protocolFeeRecipient = recipient;
        emit ProtocolFeeRecipientUpdated(recipient, block.timestamp);
    }

    // =============================================================
    // VIEW FUNCTIONS
    // =============================================================

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

    function getOrganizationCampaigns(bytes8 organizationId)
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

    function getAllCampaigns() external view override returns (bytes32[] memory) {
        return _allCampaigns.values();
    }

    function getCampaignCount() external view override returns (uint256) {
        return _allCampaigns.length();
    }

    function getProtocolFeeRate() external view override returns (uint256) {
        return _protocolFeeRate;
    }

    function getProtocolFeeRecipient() external view override returns (address) {
        return _protocolFeeRecipient;
    }

    function getReward(bytes32 campaignId, address token)
        external
        view
        override
        returns (FlowReward memory)
    {
        return _rewards[campaignId][token];
    }

    /**
     * @dev Check if user can create campaigns in organization
     */
    function canCreateCampaign(bytes8 organizationId, address user) external view returns (bool) {
        if (address(membershipContract) != address(0)) {
            return membershipContract.isActiveMember(organizationId, user);
        }

        // Fallback to Control module
        address controlModule = getModule(keccak256("CONTROL"));
        if (controlModule == address(0)) return false;

        IControl control = IControl(controlModule);
        return control.isMember(organizationId, user);
    }

    /**
     * @dev Get campaign creator's membership info
     */
    function getCampaignCreatorMembership(bytes32 campaignId) external view returns (
        bool isMember,
        uint256 reputation,
        uint256 votingPower
    ) {
        Campaign storage campaign = _campaigns[campaignId];
        if (campaign.creator == address(0)) return (false, 0, 0);

        if (address(membershipContract) != address(0)) {
            isMember = membershipContract.isActiveMember(campaign.organizationId, campaign.creator);
            if (isMember) {
                IGameDAOMembership.Member memory member = membershipContract.getMember(campaign.organizationId, campaign.creator);
                reputation = member.reputation;
                votingPower = member.votingPower;
            }
        }
    }
}
