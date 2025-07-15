// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.20;

import "../interfaces/IOrganizationSettings.sol";
import "../interfaces/ISignal.sol";
import "../interfaces/IControl.sol";
import "../interfaces/IGameDAOMembership.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

/**
 * @title OrganizationSettings
 * @dev Manages organization settings that require governance approval
 * @author GameDAO AG
 * @notice All organization configuration changes must go through governance votes
 */
contract OrganizationSettings is IOrganizationSettings, AccessControl, ReentrancyGuard, Pausable {
    using EnumerableSet for EnumerableSet.Bytes32Set;

    // =============================================================
    // CONSTANTS
    // =============================================================

    bytes32 public constant SETTINGS_ADMIN_ROLE = keccak256("SETTINGS_ADMIN_ROLE");
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");

    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant MAX_VOTING_PERIOD = 30 days;
    uint256 public constant MIN_VOTING_PERIOD = 1 hours;
    uint256 public constant MAX_MEMBER_LIMIT = 100000;
    uint256 public constant MAX_EMERGENCY_ACTIONS_PER_DAY = 5;

    // =============================================================
    // STATE VARIABLES
    // =============================================================

    // Contract references
    ISignal public signalContract;
    IControl public controlContract;
    IGameDAOMembership public membershipContract;

    // Organization settings storage
    mapping(bytes8 => VotingParameters) private _votingParameters;
    mapping(bytes8 => MembershipConfig) private _membershipConfig;
    mapping(bytes8 => TreasuryConfig) private _treasuryConfig;
    mapping(bytes8 => StakingRequirements) private _stakingRequirements;
    mapping(bytes8 => ReputationConfig) private _reputationConfig;
    mapping(bytes8 => GovernanceConfig) private _governanceConfig;

    // Setting change tracking
    mapping(bytes8 => mapping(string => SettingChange)) private _settingChanges;
    mapping(bytes8 => EnumerableSet.Bytes32Set) private _pendingChanges;
    mapping(bytes8 => mapping(SettingType => EnumerableSet.Bytes32Set)) private _changeHistory;

    // Organization tracking
    mapping(bytes8 => bool) private _organizationExists;
    mapping(bytes8 => bool) private _organizationPaused;

    // Emergency action tracking
    mapping(bytes8 => mapping(uint256 => uint256)) private _emergencyActionsPerDay;

    // Default configurations
    VotingParameters private _defaultVotingParams;
    MembershipConfig private _defaultMembershipConfig;
    TreasuryConfig private _defaultTreasuryConfig;
    StakingRequirements private _defaultStakingRequirements;
    ReputationConfig private _defaultReputationConfig;
    GovernanceConfig private _defaultGovernanceConfig;

    // =============================================================
    // ERRORS
    // =============================================================

    error OrganizationNotFound(bytes8 organizationId);
    error OrganizationPaused(bytes8 organizationId);
    error SettingChangeNotFound(bytes8 organizationId, string proposalId);
    error SettingChangeAlreadyExists(bytes8 organizationId, string proposalId);
    error SettingChangeNotPending(bytes8 organizationId, string proposalId);
    error SettingChangeNotApproved(bytes8 organizationId, string proposalId);
    error UnauthorizedSettingChange(bytes8 organizationId, address caller);
    error InvalidSettingData(SettingType settingType);
    error InvalidProposalId(string proposalId);
    error ContractNotSet(string contractName);
    error EmergencyActionLimitExceeded(bytes8 organizationId, uint256 limit);
    error InvalidSettingValue(string parameter, uint256 value);

    // =============================================================
    // CONSTRUCTOR
    // =============================================================

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _grantRole(SETTINGS_ADMIN_ROLE, _msgSender());
        _grantRole(GOVERNANCE_ROLE, _msgSender());
        _grantRole(EMERGENCY_ROLE, _msgSender());

        // Set default configurations
        _defaultVotingParams = VotingParameters({
            votingDelay: 1 days,
            votingPeriod: 7 days,
            executionDelay: 2 days,
            quorumThreshold: 1000, // 10%
            proposalThreshold: 100, // 1%
            requireMembership: true,
            lastUpdated: block.timestamp
        });

        _defaultMembershipConfig = MembershipConfig({
            membershipFee: 0,
            memberLimit: 1000,
            accessModel: 0, // Open
            feeModel: 0, // NoFees
            minimumStake: 0,
            lastUpdated: block.timestamp
        });

        _defaultTreasuryConfig = TreasuryConfig({
            spendingLimit: 1000 * 10**18, // 1000 GAME tokens
            proposalBond: 100 * 10**18, // 100 GAME tokens
            authorizedSpenders: new address[](0),
            emergencyFund: 10000 * 10**18, // 10000 GAME tokens
            lastUpdated: block.timestamp
        });

        _defaultStakingRequirements = StakingRequirements({
            organizationStake: 10000 * 10**18, // 10000 GAME tokens
            memberStake: 100 * 10**18, // 100 GAME tokens
            lockPeriod: 30 days,
            slashingRate: 1000, // 10%
            lastUpdated: block.timestamp
        });

        _defaultReputationConfig = ReputationConfig({
            baseReputation: 100,
            maxReputation: 10000,
            reputationDecay: 10, // 0.1% per day
            proposalReward: 50,
            votingReward: 10,
            lastUpdated: block.timestamp
        });

        _defaultGovernanceConfig = GovernanceConfig({
            emergencyVotingPeriod: 24 hours,
            constitutionalThreshold: 6700, // 67%
            adminActionDelay: 2 days,
            enableConvictionVoting: true,
            lastUpdated: block.timestamp
        });
    }

    // =============================================================
    // MODIFIERS
    // =============================================================

    modifier organizationExists(bytes8 organizationId) {
        if (!_organizationExists[organizationId]) {
            revert OrganizationNotFound(organizationId);
        }
        _;
    }

    modifier organizationNotPaused(bytes8 organizationId) {
        if (_organizationPaused[organizationId]) {
            revert OrganizationPaused(organizationId);
        }
        _;
    }

    modifier onlyGovernance(bytes8 organizationId) {
        if (address(signalContract) == address(0)) {
            revert ContractNotSet("Signal");
        }

        // Check if caller is authorized (organization member with governance rights)
        if (address(membershipContract) != address(0)) {
            require(
                membershipContract.isActiveMember(organizationId, _msgSender()) ||
                hasRole(GOVERNANCE_ROLE, _msgSender()),
                "Not authorized for governance"
            );
        } else {
            require(hasRole(GOVERNANCE_ROLE, _msgSender()), "Not authorized for governance");
        }
        _;
    }

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
    ) external override organizationExists(organizationId) organizationNotPaused(organizationId) onlyGovernance(organizationId) {
        if (bytes(proposalId).length == 0) {
            revert InvalidProposalId(proposalId);
        }

        bytes32 proposalHash = keccak256(bytes(proposalId));
        if (_settingChanges[organizationId][proposalId].proposer != address(0)) {
            revert SettingChangeAlreadyExists(organizationId, proposalId);
        }

        // Validate setting data
        _validateSettingData(settingType, settingData);

        // Create setting change record
        _settingChanges[organizationId][proposalId] = SettingChange({
            organizationId: organizationId,
            settingType: settingType,
            settingData: settingData,
            proposalId: proposalId,
            status: SettingStatus.PENDING,
            proposer: _msgSender(),
            proposedAt: block.timestamp,
            executedAt: 0,
            reason: reason
        });

        // Add to pending changes
        _pendingChanges[organizationId].add(proposalHash);

        emit SettingChangeProposed(organizationId, settingType, proposalId, _msgSender(), block.timestamp);
    }

    /**
     * @dev Execute an approved setting change (called by Signal contract)
     */
    function executeSettingChange(
        bytes8 organizationId,
        string memory proposalId
    ) external override organizationExists(organizationId) onlyRole(GOVERNANCE_ROLE) {
        SettingChange storage change = _settingChanges[organizationId][proposalId];

        if (change.proposer == address(0)) {
            revert SettingChangeNotFound(organizationId, proposalId);
        }

        if (change.status != SettingStatus.APPROVED) {
            revert SettingChangeNotApproved(organizationId, proposalId);
        }

        // Execute the setting change
        _executeSettingChange(organizationId, change);

        // Update status
        change.status = SettingStatus.EXECUTED;
        change.executedAt = block.timestamp;

        // Remove from pending changes
        bytes32 proposalHash = keccak256(bytes(proposalId));
        _pendingChanges[organizationId].remove(proposalHash);

        // Add to history
        _changeHistory[organizationId][change.settingType].add(proposalHash);

        emit SettingChangeExecuted(organizationId, change.settingType, proposalId, block.timestamp);
    }

    /**
     * @dev Reject a setting change (called by Signal contract)
     */
    function rejectSettingChange(
        bytes8 organizationId,
        string memory proposalId
    ) external override organizationExists(organizationId) onlyRole(GOVERNANCE_ROLE) {
        SettingChange storage change = _settingChanges[organizationId][proposalId];

        if (change.proposer == address(0)) {
            revert SettingChangeNotFound(organizationId, proposalId);
        }

        if (change.status != SettingStatus.PENDING) {
            revert SettingChangeNotPending(organizationId, proposalId);
        }

        // Update status
        change.status = SettingStatus.REJECTED;

        // Remove from pending changes
        bytes32 proposalHash = keccak256(bytes(proposalId));
        _pendingChanges[organizationId].remove(proposalHash);

        // Add to history
        _changeHistory[organizationId][change.settingType].add(proposalHash);

        emit SettingChangeRejected(organizationId, change.settingType, proposalId, block.timestamp);
    }

    /**
     * @dev Approve a setting change (called by Signal contract after successful vote)
     */
    function approveSettingChange(
        bytes8 organizationId,
        string memory proposalId
    ) external onlyRole(GOVERNANCE_ROLE) {
        SettingChange storage change = _settingChanges[organizationId][proposalId];

        if (change.proposer == address(0)) {
            revert SettingChangeNotFound(organizationId, proposalId);
        }

        if (change.status != SettingStatus.PENDING) {
            revert SettingChangeNotPending(organizationId, proposalId);
        }

        // Update status
        change.status = SettingStatus.APPROVED;

        emit SettingChangeApproved(organizationId, change.settingType, proposalId, block.timestamp);
    }

    // =============================================================
    // INTERNAL FUNCTIONS
    // =============================================================

    /**
     * @dev Execute a setting change based on its type
     */
    function _executeSettingChange(bytes8 organizationId, SettingChange memory change) internal {
        if (change.settingType == SettingType.VOTING_PARAMETERS) {
            VotingParameters memory params = abi.decode(change.settingData, (VotingParameters));
            params.lastUpdated = block.timestamp;
            _votingParameters[organizationId] = params;
            emit VotingParametersUpdated(organizationId, params, block.timestamp);

        } else if (change.settingType == SettingType.MEMBERSHIP_CONFIG) {
            MembershipConfig memory config = abi.decode(change.settingData, (MembershipConfig));
            config.lastUpdated = block.timestamp;
            _membershipConfig[organizationId] = config;
            emit MembershipConfigUpdated(organizationId, config, block.timestamp);

        } else if (change.settingType == SettingType.TREASURY_CONFIG) {
            TreasuryConfig memory config = abi.decode(change.settingData, (TreasuryConfig));
            config.lastUpdated = block.timestamp;
            _treasuryConfig[organizationId] = config;
            emit TreasuryConfigUpdated(organizationId, config, block.timestamp);

        } else if (change.settingType == SettingType.STAKING_REQUIREMENTS) {
            StakingRequirements memory requirements = abi.decode(change.settingData, (StakingRequirements));
            requirements.lastUpdated = block.timestamp;
            _stakingRequirements[organizationId] = requirements;
            emit StakingRequirementsUpdated(organizationId, requirements, block.timestamp);

        } else if (change.settingType == SettingType.REPUTATION_CONFIG) {
            ReputationConfig memory config = abi.decode(change.settingData, (ReputationConfig));
            config.lastUpdated = block.timestamp;
            _reputationConfig[organizationId] = config;
            emit ReputationConfigUpdated(organizationId, config, block.timestamp);

        } else if (change.settingType == SettingType.GOVERNANCE_CONFIG) {
            GovernanceConfig memory config = abi.decode(change.settingData, (GovernanceConfig));
            config.lastUpdated = block.timestamp;
            _governanceConfig[organizationId] = config;
            emit GovernanceConfigUpdated(organizationId, config, block.timestamp);
        }
    }

    /**
     * @dev Validate setting data based on type
     */
    function _validateSettingData(SettingType settingType, bytes memory settingData) internal pure {
        if (settingType == SettingType.VOTING_PARAMETERS) {
            VotingParameters memory params = abi.decode(settingData, (VotingParameters));
            if (params.votingPeriod < MIN_VOTING_PERIOD || params.votingPeriod > MAX_VOTING_PERIOD) {
                revert InvalidSettingValue("votingPeriod", params.votingPeriod);
            }
            if (params.quorumThreshold > BASIS_POINTS) {
                revert InvalidSettingValue("quorumThreshold", params.quorumThreshold);
            }
            if (params.proposalThreshold > BASIS_POINTS) {
                revert InvalidSettingValue("proposalThreshold", params.proposalThreshold);
            }

        } else if (settingType == SettingType.MEMBERSHIP_CONFIG) {
            MembershipConfig memory config = abi.decode(settingData, (MembershipConfig));
            if (config.memberLimit == 0 || config.memberLimit > MAX_MEMBER_LIMIT) {
                revert InvalidSettingValue("memberLimit", config.memberLimit);
            }
            if (config.accessModel > 2) {
                revert InvalidSettingValue("accessModel", config.accessModel);
            }
            if (config.feeModel > 2) {
                revert InvalidSettingValue("feeModel", config.feeModel);
            }

        } else if (settingType == SettingType.STAKING_REQUIREMENTS) {
            StakingRequirements memory requirements = abi.decode(settingData, (StakingRequirements));
            if (requirements.slashingRate > BASIS_POINTS) {
                revert InvalidSettingValue("slashingRate", requirements.slashingRate);
            }

        } else if (settingType == SettingType.GOVERNANCE_CONFIG) {
            GovernanceConfig memory config = abi.decode(settingData, (GovernanceConfig));
            if (config.constitutionalThreshold > BASIS_POINTS) {
                revert InvalidSettingValue("constitutionalThreshold", config.constitutionalThreshold);
            }
        }
    }

    // =============================================================
    // SETTING GETTERS
    // =============================================================

    function getVotingParameters(bytes8 organizationId) external view override returns (VotingParameters memory) {
        VotingParameters memory params = _votingParameters[organizationId];
        return params.lastUpdated == 0 ? _defaultVotingParams : params;
    }

    function getMembershipConfig(bytes8 organizationId) external view override returns (MembershipConfig memory) {
        MembershipConfig memory config = _membershipConfig[organizationId];
        return config.lastUpdated == 0 ? _defaultMembershipConfig : config;
    }

    function getTreasuryConfig(bytes8 organizationId) external view override returns (TreasuryConfig memory) {
        TreasuryConfig memory config = _treasuryConfig[organizationId];
        return config.lastUpdated == 0 ? _defaultTreasuryConfig : config;
    }

    function getStakingRequirements(bytes8 organizationId) external view override returns (StakingRequirements memory) {
        StakingRequirements memory requirements = _stakingRequirements[organizationId];
        return requirements.lastUpdated == 0 ? _defaultStakingRequirements : requirements;
    }

    function getReputationConfig(bytes8 organizationId) external view override returns (ReputationConfig memory) {
        ReputationConfig memory config = _reputationConfig[organizationId];
        return config.lastUpdated == 0 ? _defaultReputationConfig : config;
    }

    function getGovernanceConfig(bytes8 organizationId) external view override returns (GovernanceConfig memory) {
        GovernanceConfig memory config = _governanceConfig[organizationId];
        return config.lastUpdated == 0 ? _defaultGovernanceConfig : config;
    }

    // =============================================================
    // SETTING CHANGE MANAGEMENT
    // =============================================================

    function getSettingChange(bytes8 organizationId, string memory proposalId) external view override returns (SettingChange memory) {
        return _settingChanges[organizationId][proposalId];
    }

    function getPendingSettingChanges(bytes8 organizationId) external view override returns (SettingChange[] memory) {
        bytes32[] memory pendingHashes = _pendingChanges[organizationId].values();
        SettingChange[] memory pendingChanges = new SettingChange[](pendingHashes.length);

        for (uint256 i = 0; i < pendingHashes.length; i++) {
            string memory proposalId = string(abi.encodePacked(pendingHashes[i]));
            pendingChanges[i] = _settingChanges[organizationId][proposalId];
        }

        return pendingChanges;
    }

    function getSettingChangeHistory(bytes8 organizationId, SettingType settingType) external view override returns (SettingChange[] memory) {
        bytes32[] memory historyHashes = _changeHistory[organizationId][settingType].values();
        SettingChange[] memory history = new SettingChange[](historyHashes.length);

        for (uint256 i = 0; i < historyHashes.length; i++) {
            string memory proposalId = string(abi.encodePacked(historyHashes[i]));
            history[i] = _settingChanges[organizationId][proposalId];
        }

        return history;
    }

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
    ) external override onlyRole(SETTINGS_ADMIN_ROLE) {
        _organizationExists[organizationId] = true;

        votingParams.lastUpdated = block.timestamp;
        membershipConfig.lastUpdated = block.timestamp;
        treasuryConfig.lastUpdated = block.timestamp;
        stakingRequirements.lastUpdated = block.timestamp;
        reputationConfig.lastUpdated = block.timestamp;
        governanceConfig.lastUpdated = block.timestamp;

        _votingParameters[organizationId] = votingParams;
        _membershipConfig[organizationId] = membershipConfig;
        _treasuryConfig[organizationId] = treasuryConfig;
        _stakingRequirements[organizationId] = stakingRequirements;
        _reputationConfig[organizationId] = reputationConfig;
        _governanceConfig[organizationId] = governanceConfig;
    }

    function setSignalContract(address signalContract_) external override onlyRole(SETTINGS_ADMIN_ROLE) {
        signalContract = ISignal(signalContract_);
        _grantRole(GOVERNANCE_ROLE, signalContract_);
    }

    function setControlContract(address controlContract_) external override onlyRole(SETTINGS_ADMIN_ROLE) {
        controlContract = IControl(controlContract_);
    }

    function setMembershipContract(address membershipContract_) external override onlyRole(SETTINGS_ADMIN_ROLE) {
        membershipContract = IGameDAOMembership(membershipContract_);
    }

    // =============================================================
    // EMERGENCY FUNCTIONS
    // =============================================================

    function emergencyUpdateSetting(
        bytes8 organizationId,
        SettingType settingType,
        bytes memory settingData,
        string memory reason
    ) external override onlyRole(EMERGENCY_ROLE) {
        uint256 today = block.timestamp / 86400;
        uint256 actionsToday = _emergencyActionsPerDay[organizationId][today];

        if (actionsToday >= MAX_EMERGENCY_ACTIONS_PER_DAY) {
            revert EmergencyActionLimitExceeded(organizationId, MAX_EMERGENCY_ACTIONS_PER_DAY);
        }

        _emergencyActionsPerDay[organizationId][today] = actionsToday + 1;

        // Validate and execute the emergency setting change
        _validateSettingData(settingType, settingData);

        SettingChange memory emergencyChange = SettingChange({
            organizationId: organizationId,
            settingType: settingType,
            settingData: settingData,
            proposalId: string(abi.encodePacked("EMERGENCY-", block.timestamp)),
            status: SettingStatus.EXECUTED,
            proposer: _msgSender(),
            proposedAt: block.timestamp,
            executedAt: block.timestamp,
            reason: reason
        });

        _executeSettingChange(organizationId, emergencyChange);
    }

    function pauseOrganizationSettings(bytes8 organizationId) external override onlyRole(EMERGENCY_ROLE) {
        _organizationPaused[organizationId] = true;
    }

    function unpauseOrganizationSettings(bytes8 organizationId) external override onlyRole(EMERGENCY_ROLE) {
        _organizationPaused[organizationId] = false;
    }

    // =============================================================
    // PAUSE/UNPAUSE FUNCTIONS
    // =============================================================

    function pause() external onlyRole(SETTINGS_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(SETTINGS_ADMIN_ROLE) {
        _unpause();
    }
}
