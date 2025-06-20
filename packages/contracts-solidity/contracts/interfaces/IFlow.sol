// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

/**
 * @title IFlow
 * @dev Interface for the Flow module - Crowdfunding and campaign management
 * @author GameDAO AG
 */
interface IFlow {
    // Enums
    enum FlowType {
        Grant,      // Grant funding (no return expected)
        Raise,      // Fundraising with token/equity return
        Lend,       // Lending with interest
        Loan,       // Borrowing funds
        Share,      // Revenue sharing
        Pool        // Liquidity pooling
    }

    enum FlowState {
        Created,    // Campaign created but not started
        Active,     // Campaign is live and accepting contributions
        Paused,     // Campaign temporarily paused
        Succeeded,  // Campaign reached its goal
        Failed,     // Campaign failed to reach minimum
        Locked,     // Campaign locked by admin
        Finalized   // Campaign completed and funds distributed
    }

    enum ContributorState {
        None,       // Not a contributor
        Active,     // Active contributor
        Refunded,   // Received refund
        Rewarded    // Received rewards/tokens
    }

    // Structs
    struct Campaign {
        uint256 index;
        bytes32 organizationId;
        address creator;
        address admin;
        string title;
        string description;
        string metadataURI;
        FlowType flowType;
        FlowState state;
        address paymentToken;
        uint256 target;           // Target amount to raise
        uint256 min;             // Minimum amount to consider success
        uint256 max;             // Maximum amount (cap)
        uint256 raised;          // Current amount raised
        uint256 contributorCount;
        uint256 startTime;
        uint256 endTime;
        uint256 createdAt;
        uint256 updatedAt;
        bool autoFinalize;       // Auto-finalize when target reached
        uint256 protocolFee;     // Protocol fee percentage (basis points)
    }

    struct Contribution {
        address contributor;
        uint256 amount;
        uint256 timestamp;
        ContributorState state;
        string metadata;         // Additional contribution metadata
    }

    struct FlowReward {
        address token;           // Reward token address
        uint256 totalAmount;     // Total reward amount
        uint256 distributedAmount; // Amount already distributed
        mapping(address => uint256) claimed; // Amount claimed by each contributor
    }

    // Events
    event CampaignCreated(
        bytes32 indexed campaignId,
        bytes32 indexed organizationId,
        address indexed creator,
        string title,
        FlowType flowType,
        uint256 target,
        uint256 startTime,
        uint256 endTime,
        uint256 timestamp
    );

    event CampaignUpdated(
        bytes32 indexed campaignId,
        string title,
        string description,
        uint256 target,
        uint256 min,
        uint256 max,
        uint256 endTime,
        uint256 timestamp
    );

    event CampaignStateChanged(
        bytes32 indexed campaignId,
        FlowState oldState,
        FlowState newState,
        uint256 timestamp
    );

    event ContributionMade(
        bytes32 indexed campaignId,
        address indexed contributor,
        uint256 amount,
        uint256 totalRaised,
        uint256 timestamp
    );

    event ContributionRefunded(
        bytes32 indexed campaignId,
        address indexed contributor,
        uint256 amount,
        uint256 timestamp
    );

    event CampaignFinalized(
        bytes32 indexed campaignId,
        FlowState finalState,
        uint256 totalRaised,
        uint256 contributorCount,
        uint256 timestamp
    );

    event RewardsDistributed(
        bytes32 indexed campaignId,
        address indexed token,
        uint256 totalAmount,
        uint256 contributorCount,
        uint256 timestamp
    );

    event ProtocolFeeCollected(
        bytes32 indexed campaignId,
        address indexed token,
        uint256 amount,
        uint256 timestamp
    );

    // Core Functions
    function createCampaign(
        bytes32 organizationId,
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
    ) external returns (bytes32 campaignId);

    function updateCampaign(
        bytes32 campaignId,
        string memory title,
        string memory description,
        uint256 target,
        uint256 min,
        uint256 max,
        uint256 endTime
    ) external;

    function setCampaignState(bytes32 campaignId, FlowState newState) external;

    function contribute(
        bytes32 campaignId,
        uint256 amount,
        string memory metadata
    ) external;

    function finalizeCampaign(bytes32 campaignId) external;

    function refundContribution(bytes32 campaignId, address contributor) external;

    function distributeRewards(
        bytes32 campaignId,
        address rewardToken,
        uint256 totalRewardAmount
    ) external;

    function claimRewards(bytes32 campaignId, address rewardToken) external;

    function withdrawFunds(
        bytes32 campaignId,
        address to,
        uint256 amount
    ) external;

    // View Functions
    function getCampaign(bytes32 campaignId)
        external
        view
        returns (Campaign memory);

    function getContribution(bytes32 campaignId, address contributor)
        external
        view
        returns (Contribution memory);

    function getCampaignContributors(bytes32 campaignId)
        external
        view
        returns (address[] memory);

    function getCampaignsByOrganization(bytes32 organizationId)
        external
        view
        returns (bytes32[] memory);

    function getCampaignsByState(FlowState state)
        external
        view
        returns (bytes32[] memory);

    function isCampaignActive(bytes32 campaignId) external view returns (bool);

    function canContribute(bytes32 campaignId, address contributor)
        external
        view
        returns (bool);

    function getCampaignProgress(bytes32 campaignId)
        external
        view
        returns (uint256 raised, uint256 target, uint256 percentage);

    function getTimeRemaining(bytes32 campaignId)
        external
        view
        returns (uint256);

    function getCampaignCount() external view returns (uint256);

    function getProtocolFeeRate() external view returns (uint256);

    function calculateProtocolFee(uint256 amount) external view returns (uint256);

    function getRewardDistribution(
        bytes32 campaignId,
        address rewardToken,
        address contributor
    ) external view returns (uint256 totalReward, uint256 claimedAmount, uint256 claimableAmount);
}
