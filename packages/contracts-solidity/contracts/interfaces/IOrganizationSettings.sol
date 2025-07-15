// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.20;

/**
 * @title IOrganizationSettings
 * @dev Interface for organization settings that require governance approval
 * @author GameDAO AG
 * @notice All organization configuration changes must go through governance votes
 */
interface IOrganizationSettings {
    // =============================================================
    // ENUMS
    // =============================================================

    enum SettingType {
        VOTING_PARAMETERS,      // Voting delays, periods, thresholds
        MEMBERSHIP_CONFIG,      // Membership fees, limits, access models
        TREASURY_CONFIG,        // Treasury management settings
        STAKING_REQUIREMENTS,   // Staking amounts and periods
        REPUTATION_CONFIG,      // Reputation scoring parameters
        GOVERNANCE_CONFIG       // Governance-specific settings
    }

    enum SettingStatus {
        PENDING,               // Setting change proposed
        APPROVED,              // Approved by governance
        REJECTED,              // Rejected by governance
        EXECUTED               // Successfully executed
    }

    // =============================================================
    // STRUCTS
    // =============================================================

    struct VotingParameters {
        uint256 votingDelay;        // Delay before voting starts
        uint256 votingPeriod;       // Duration of voting period
        uint256 executionDelay;     // Delay before execution
        uint256 quorumThreshold;    // Minimum participation (basis points)
        uint256 proposalThreshold;  // Minimum tokens to create proposal (basis points)
        bool requireMembership;     // Whether membership is required
        uint256 lastUpdated;        // Last update timestamp
    }

    struct MembershipConfig {
        uint256 membershipFee;      // Fee to join organization
        uint256 memberLimit;        // Maximum number of members
        uint8 accessModel;          // 0=Open, 1=Voting, 2=Invite
        uint8 feeModel;             // 0=NoFees, 1=Reserve, 2=Transfer
        uint256 minimumStake;       // Minimum stake required
        uint256 lastUpdated;        // Last update timestamp
    }

    struct TreasuryConfig {
        uint256 spendingLimit;      // Maximum spending without governance
        uint256 proposalBond;       // Bond required for treasury proposals
        address[] authorizedSpenders; // Addresses authorized for direct spending
        uint256 emergencyFund;      // Emergency fund allocation
        uint256 lastUpdated;        // Last update timestamp
    }

    struct StakingRequirements {
        uint256 organizationStake;  // Stake required to create organization
        uint256 memberStake;        // Stake required for membership
        uint256 lockPeriod;         // Lock period for stakes
        uint256 slashingRate;       // Slashing rate for violations (basis points)
        uint256 lastUpdated;        // Last update timestamp
    }

    struct ReputationConfig {
        uint256 baseReputation;     // Starting reputation for new members
        uint256 maxReputation;      // Maximum reputation possible
        uint256 reputationDecay;    // Decay rate per period
        uint256 proposalReward;     // Reputation reward for proposals
        uint256 votingReward;       // Reputation reward for voting
        uint256 lastUpdated;        // Last update timestamp
    }

    struct GovernanceConfig {
        uint256 emergencyVotingPeriod; // Voting period for emergency proposals
        uint256 constitutionalThreshold; // Threshold for constitutional changes
        uint256 adminActionDelay;    // Delay for admin actions
        bool enableConvictionVoting; // Whether conviction voting is enabled
        uint256 lastUpdated;        // Last update timestamp
    }

    struct SettingChange {
        bytes8 organizationId;      // Organization ID
        SettingType settingType;    // Type of setting being changed
        bytes settingData;          // Encoded setting data
        string proposalId;          // Associated governance proposal ID
        SettingStatus status;       // Current status
        address proposer;           // Address that proposed the change
        uint256 proposedAt;         // When change was proposed
        uint256 executedAt;         // When change was executed
        string reason;              // Reason for the change
    }

    // =============================================================
    // EVENTS
    // =============================================================

    event SettingChangeProposed(
        bytes8 indexed organizationId,
        SettingType indexed settingType,
        string indexed proposalId,
        address proposer,
        uint256 timestamp
    );

    event SettingChangeApproved(
        bytes8 indexed organizationId,
        SettingType indexed settingType,
        string indexed proposalId,
        uint256 timestamp
    );

    event SettingChangeExecuted(
        bytes8 indexed organizationId,
        SettingType indexed settingType,
        string indexed proposalId,
        uint256 timestamp
    );

    event SettingChangeRejected(
        bytes8 indexed organizationId,
        SettingType indexed settingType,
        string indexed proposalId,
        uint256 timestamp
    );

    event VotingParametersUpdated(
        bytes8 indexed organizationId,
        VotingParameters parameters,
        uint256 timestamp
    );

    event MembershipConfigUpdated(
        bytes8 indexed organizationId,
        MembershipConfig config,
        uint256 timestamp
    );

    event TreasuryConfigUpdated(
        bytes8 indexed organizationId,
        TreasuryConfig config,
        uint256 timestamp
    );

    event StakingRequirementsUpdated(
        bytes8 indexed organizationId,
        StakingRequirements requirements,
        uint256 timestamp
    );

    event ReputationConfigUpdated(
        bytes8 indexed organizationId,
        ReputationConfig config,
        uint256 timestamp
    );

    event GovernanceConfigUpdated(
        bytes8 indexed organizationId,
        GovernanceConfig config,
        uint256 timestamp
    );

    // =============================================================
    // CORE FUNCTIONS
    // =============================================================

    /**
     * @dev Propose a setting change (requires governance approval)
     */
    function proposeSettingChange(
        bytes8 organizationId,
        SettingType settingType,
        bytes memory settingData,
        string memory proposalId,
        string memory reason
    ) external;

    /**
     * @dev Execute an approved setting change
     */
    function executeSettingChange(
        bytes8 organizationId,
        string memory proposalId
    ) external;

    /**
     * @dev Reject a setting change
     */
    function rejectSettingChange(
        bytes8 organizationId,
        string memory proposalId
    ) external;

    // =============================================================
    // SETTING GETTERS
    // =============================================================

    function getVotingParameters(bytes8 organizationId) external view returns (VotingParameters memory);
    function getMembershipConfig(bytes8 organizationId) external view returns (MembershipConfig memory);
    function getTreasuryConfig(bytes8 organizationId) external view returns (TreasuryConfig memory);
    function getStakingRequirements(bytes8 organizationId) external view returns (StakingRequirements memory);
    function getReputationConfig(bytes8 organizationId) external view returns (ReputationConfig memory);
    function getGovernanceConfig(bytes8 organizationId) external view returns (GovernanceConfig memory);

    // =============================================================
    // SETTING CHANGE MANAGEMENT
    // =============================================================

    function getSettingChange(bytes8 organizationId, string memory proposalId) external view returns (SettingChange memory);
    function getPendingSettingChanges(bytes8 organizationId) external view returns (SettingChange[] memory);
    function getSettingChangeHistory(bytes8 organizationId, SettingType settingType) external view returns (SettingChange[] memory);

    // =============================================================
    // ADMIN FUNCTIONS
    // =============================================================

    function initializeOrganizationSettings(
        bytes8 organizationId,
        VotingParameters memory votingParams,
        MembershipConfig memory membershipConfig,
        TreasuryConfig memory treasuryConfig,
        StakingRequirements memory stakingRequirements,
        ReputationConfig memory reputationConfig,
        GovernanceConfig memory governanceConfig
    ) external;

    function setSignalContract(address signalContract) external;
    function setControlContract(address controlContract) external;
    function setMembershipContract(address membershipContract) external;

    // =============================================================
    // EMERGENCY FUNCTIONS
    // =============================================================

    function emergencyUpdateSetting(
        bytes8 organizationId,
        SettingType settingType,
        bytes memory settingData,
        string memory reason
    ) external;

    function pauseOrganizationSettings(bytes8 organizationId) external;
    function unpauseOrganizationSettings(bytes8 organizationId) external;
}
