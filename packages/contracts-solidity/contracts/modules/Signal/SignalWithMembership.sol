// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.20;

import "../../interfaces/ISignal.sol";
import "../../interfaces/IGameDAOModule.sol";
import "../../interfaces/IGameDAORegistry.sol";
import "../../interfaces/IOrganizationSettings.sol";
import "../../interfaces/IGameDAOMembership.sol";
import "../../core/GameDAOModule.sol";
import "../../libraries/GameId.sol";
import "../../interfaces/IControl.sol";
import "../../interfaces/IGameToken.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title Signal (With Membership Integration)
 * @dev Implementation of the Signal module with GameDAOMembership integration
 * @author GameDAO AG
 * @notice GameDAO v3 - Hierarchical ID System with centralized membership management
 */
contract Signal is GameDAOModule, ISignal {
    using EnumerableSet for EnumerableSet.Bytes32Set;
    using EnumerableSet for EnumerableSet.AddressSet;
    using Math for uint256;

    // Constants
    bytes32 public constant SIGNAL_ADMIN_ROLE = keccak256("SIGNAL_ADMIN_ROLE");
    bytes32 public constant PROPOSAL_CREATOR_ROLE = keccak256("PROPOSAL_CREATOR_ROLE");
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");

    uint256 public constant MAX_VOTING_PERIOD = 30 days;
    uint256 public constant MIN_VOTING_PERIOD = 1 hours;
    uint256 public constant MAX_EXECUTION_DELAY = 30 days;
    uint256 public constant MAX_QUORUM_THRESHOLD = 10000; // 100%
    uint256 public constant BASIS_POINTS = 10000;

    // State variables - Hierarchical ID Only (REDUCED SIZE - no membership storage)
    mapping(string => Proposal) private _proposals;
    mapping(string => mapping(address => Vote)) private _votes;
    mapping(string => EnumerableSet.AddressSet) private _proposalVoters;
    mapping(bytes8 => EnumerableSet.Bytes32Set) private _organizationProposals;
    mapping(ProposalState => EnumerableSet.Bytes32Set) private _proposalsByState;
    mapping(bytes8 => uint256) private _organizationProposalCounters;

    // Delegation tracking (REDUCED - delegated to membership contract)
    mapping(address => Delegation[]) private _delegations;
    mapping(address => uint256) private _totalDelegatedOut;

    // Conviction voting
    mapping(string => mapping(address => uint256)) private _convictionVotes;
    mapping(string => mapping(address => uint256)) private _convictionStartTime;

    EnumerableSet.Bytes32Set private _allProposals;

    // Contract references
    IOrganizationSettings public organizationSettings;
    IGameDAOMembership public membershipContract;

    // Special proposal types for organization settings
    enum SettingProposalType {
        VOTING_PARAMETERS,
        MEMBERSHIP_CONFIG,
        TREASURY_CONFIG,
        STAKING_REQUIREMENTS,
        REPUTATION_CONFIG,
        GOVERNANCE_CONFIG
    }

    // Organization settings proposals
    mapping(string => SettingProposalType) private _settingProposalTypes;
    mapping(string => bytes) private _settingProposalData;

    // Events for settings governance
    event SettingsProposalCreated(
        string indexed hierarchicalId,
        bytes8 indexed organizationId,
        SettingProposalType settingType,
        address indexed proposer,
        uint256 timestamp
    );

    event SettingsProposalExecuted(
        string indexed hierarchicalId,
        bytes8 indexed organizationId,
        SettingProposalType settingType,
        bool success,
        uint256 timestamp
    );

    event MembershipContractUpdated(address indexed membershipContract, uint256 timestamp);

    // Errors
    error ProposalNotFound(string hierarchicalId);
    error ProposalNotActive(string hierarchicalId);
    error ProposalAlreadyExecuted(string hierarchicalId);
    error InvalidProposalParameters();
    error InvalidVotingPeriod(uint256 period);
    error VotingNotActive(string hierarchicalId);
    error AlreadyVoted(string hierarchicalId, address voter);
    error InsufficientVotingPower(address voter, uint256 required, uint256 available);
    error QuorumNotReached(string hierarchicalId, uint256 required, uint256 actual);
    error ProposalNotPassed(string hierarchicalId);
    error ExecutionFailed(string hierarchicalId, string reason);
    error UnauthorizedProposalAccess(string hierarchicalId, address caller);
    error OrganizationNotFound(bytes8 organizationId);
    error InsufficientProposalThreshold(address proposer, uint256 required, uint256 available);
    error InvalidDelegation(address delegator, address delegatee);
    error DelegationNotFound(address delegator, address delegatee);
    error InvalidVoteChoice(VoteChoice choice);
    error MembershipRequired(bytes8 organizationId, address member);
    error OrganizationSettingsNotSet();
    error MembershipContractNotSet();
    error InvalidSettingProposalData();

    /**
     * @dev Constructor
     */
    constructor() GameDAOModule("1.0.0") {
        // Grant roles to deployer initially
        _grantRole(SIGNAL_ADMIN_ROLE, _msgSender());
        _grantRole(PROPOSAL_CREATOR_ROLE, _msgSender());
        _grantRole(EXECUTOR_ROLE, _msgSender());
    }

    /**
     * @dev Returns the unique identifier for this module
     */
    function moduleId() external pure override returns (bytes32) {
        return keccak256("SIGNAL");
    }

    /**
     * @dev Internal initialization hook
     */
    function _onInitialize() internal override {
        // Grant admin roles to the registry
        address registryAddr = this.registry();
        _grantRole(SIGNAL_ADMIN_ROLE, registryAddr);
        _grantRole(PROPOSAL_CREATOR_ROLE, registryAddr);
        _grantRole(EXECUTOR_ROLE, registryAddr);
    }

    /**
     * @dev Set organization settings contract
     */
    function setOrganizationSettings(address _organizationSettings) external onlyRole(SIGNAL_ADMIN_ROLE) {
        organizationSettings = IOrganizationSettings(_organizationSettings);
    }

    /**
     * @dev Set membership contract
     */
    function setMembershipContract(address _membershipContract) external onlyRole(SIGNAL_ADMIN_ROLE) {
        membershipContract = IGameDAOMembership(_membershipContract);
        emit MembershipContractUpdated(_membershipContract, block.timestamp);
    }

    /**
     * @dev Create a new proposal with hierarchical ID (UPDATED TO USE MEMBERSHIP CONTRACT)
     */
    function createProposal(
        bytes8 organizationId,
        string memory title,
        string memory description,
        string memory metadataURI,
        ProposalType proposalType,
        VotingType votingType,
        VotingPower votingPower,
        uint256 votingPeriod,
        bytes memory executionData,
        address targetContract
    ) external override onlyInitialized whenNotPaused nonReentrant returns (string memory hierarchicalId) {
        // Validate organization exists
        if (!_getControlModule().isOrganizationActive(organizationId)) {
            revert OrganizationNotFound(organizationId);
        }

        // Check membership requirement using membership contract
        VotingParameters memory params = _getVotingParameters(organizationId);
        if (params.requireMembership) {
            if (address(membershipContract) != address(0)) {
                require(membershipContract.isActiveMember(organizationId, _msgSender()), "Membership required");
            } else {
                require(_getControlModule().isMember(organizationId, _msgSender()), "Membership required");
            }
        }

        // Check proposal threshold using membership contract voting power
        if (params.proposalThreshold > 0) {
            uint256 voterPower = _getVotingPower(organizationId, _msgSender(), votingPower);
            uint256 totalPower = _getTotalVotingPower(organizationId, votingPower);
            uint256 requiredPower = (totalPower * params.proposalThreshold) / BASIS_POINTS;

            if (voterPower < requiredPower) {
                revert InsufficientProposalThreshold(_msgSender(), requiredPower, voterPower);
            }
        }

        // Validate voting period
        if (votingPeriod < MIN_VOTING_PERIOD || votingPeriod > MAX_VOTING_PERIOD) {
            revert InvalidVotingPeriod(votingPeriod);
        }

        // Generate hierarchical ID: "ORGID123-P-PROP001"
        uint256 proposalCounter = ++_organizationProposalCounters[organizationId];
        hierarchicalId = GameId.generateProposalId(organizationId, proposalCounter);

        // Create proposal
        Proposal storage proposal = _proposals[hierarchicalId];
        proposal.hierarchicalId = hierarchicalId;
        proposal.organizationId = organizationId;
        proposal.creator = _msgSender();
        proposal.title = title;
        proposal.description = description;
        proposal.metadataURI = metadataURI;
        proposal.proposalType = proposalType;
        proposal.votingType = votingType;
        proposal.votingPower = votingPower;
        proposal.state = ProposalState.Pending;
        proposal.startTime = block.timestamp + params.votingDelay;
        proposal.endTime = proposal.startTime + votingPeriod;
        proposal.executionTime = proposal.endTime + params.executionDelay;
        proposal.executionData = executionData;
        proposal.targetContract = targetContract;
        proposal.createdAt = block.timestamp;

        // Add to tracking sets
        bytes32 proposalHash = keccak256(bytes(hierarchicalId));
        _organizationProposals[organizationId].add(proposalHash);
        _proposalsByState[ProposalState.Pending].add(proposalHash);
        _allProposals.add(proposalHash);

        emit ProposalCreatedHierarchical(
            hierarchicalId,
            organizationId,
            _msgSender(),
            title,
            proposalType,
            votingType,
            votingPeriod,
            proposal.startTime,
            proposal.endTime
        );

        // Reward member for proposal creation using membership contract
        if (address(membershipContract) != address(0)) {
            try membershipContract.rewardProposalCreation(organizationId, _msgSender()) {
                // Reputation reward applied successfully
            } catch {
                // Continue if reputation reward fails
            }
        }

        return hierarchicalId;
    }

    /**
     * @dev Create a settings proposal that will update organization settings
     */
    function createSettingsProposal(
        bytes8 organizationId,
        string memory title,
        string memory description,
        SettingProposalType settingType,
        bytes memory settingData,
        string memory reason
    ) external onlyInitialized whenNotPaused nonReentrant returns (string memory hierarchicalId) {
        if (address(organizationSettings) == address(0)) {
            revert OrganizationSettingsNotSet();
        }

        // Validate organization exists
        if (!_getControlModule().isOrganizationActive(organizationId)) {
            revert OrganizationNotFound(organizationId);
        }

        // Check membership requirement
        VotingParameters memory params = _getVotingParameters(organizationId);
        if (params.requireMembership) {
            if (address(membershipContract) != address(0)) {
                require(membershipContract.isActiveMember(organizationId, _msgSender()), "Membership required");
            } else {
                require(_getControlModule().isMember(organizationId, _msgSender()), "Membership required");
            }
        }

        // Generate hierarchical ID
        uint256 proposalCounter = ++_organizationProposalCounters[organizationId];
        hierarchicalId = GameId.generateProposalId(organizationId, proposalCounter);

        // Create the proposal in OrganizationSettings
        IOrganizationSettings.SettingType orgSettingType = _convertSettingType(settingType);
        organizationSettings.proposeSettingChange(
            organizationId,
            orgSettingType,
            settingData,
            hierarchicalId,
            reason
        );

        // Create governance proposal
        Proposal storage proposal = _proposals[hierarchicalId];
        proposal.hierarchicalId = hierarchicalId;
        proposal.organizationId = organizationId;
        proposal.creator = _msgSender();
        proposal.title = title;
        proposal.description = description;
        proposal.metadataURI = "";
        proposal.proposalType = ProposalType.Parametric;
        proposal.votingType = VotingType.Supermajority; // Settings changes require supermajority
        proposal.votingPower = VotingPower.Democratic;
        proposal.state = ProposalState.Pending;
        proposal.startTime = block.timestamp + params.votingDelay;
        proposal.endTime = proposal.startTime + params.votingPeriod;
        proposal.executionTime = proposal.endTime + params.executionDelay;
        proposal.executionData = "";
        proposal.targetContract = address(organizationSettings);
        proposal.createdAt = block.timestamp;

        // Store setting proposal data
        _settingProposalTypes[hierarchicalId] = settingType;
        _settingProposalData[hierarchicalId] = settingData;

        // Add to tracking sets
        bytes32 proposalHash = keccak256(bytes(hierarchicalId));
        _organizationProposals[organizationId].add(proposalHash);
        _proposalsByState[ProposalState.Pending].add(proposalHash);
        _allProposals.add(proposalHash);

        emit SettingsProposalCreated(
            hierarchicalId,
            organizationId,
            settingType,
            _msgSender(),
            block.timestamp
        );

        return hierarchicalId;
    }

    /**
     * @dev Cast a vote on a proposal (UPDATED TO USE MEMBERSHIP CONTRACT)
     */
    function castVote(
        string memory hierarchicalId,
        VoteChoice choice,
        string memory reason
    ) external override onlyInitialized whenNotPaused nonReentrant {
        Proposal storage proposal = _proposals[hierarchicalId];
        if (proposal.creator == address(0)) {
            revert ProposalNotFound(hierarchicalId);
        }

        // Update proposal state if needed
        _updateProposalState(hierarchicalId);

        if (proposal.state != ProposalState.Active) {
            revert VotingNotActive(hierarchicalId);
        }

        // Check if already voted
        if (_votes[hierarchicalId][_msgSender()].hasVoted) {
            revert AlreadyVoted(hierarchicalId, _msgSender());
        }

        // Validate vote choice
        if (choice == VoteChoice.None) {
            revert InvalidVoteChoice(choice);
        }

        // Get voting power from membership contract
        uint256 votingPower = _getVotingPower(proposal.organizationId, _msgSender(), proposal.votingPower);
        if (votingPower == 0) {
            revert InsufficientVotingPower(_msgSender(), 1, 0);
        }

        // Record vote
        _votes[hierarchicalId][_msgSender()] = Vote({
            voter: _msgSender(),
            choice: choice,
            votingPower: votingPower,
            timestamp: block.timestamp,
            reason: reason,
            hasVoted: true,
            convictionTime: 0,
            convictionMultiplier: 1
        });

        // Update proposal vote counts
        if (choice == VoteChoice.For) {
            proposal.forVotes += votingPower;
        } else if (choice == VoteChoice.Against) {
            proposal.againstVotes += votingPower;
        } else if (choice == VoteChoice.Abstain) {
            proposal.abstainVotes += votingPower;
        }

        // Add to voters set
        _proposalVoters[hierarchicalId].add(_msgSender());

        emit VoteCastHierarchical(hierarchicalId, _msgSender(), choice, votingPower, reason);

        // Reward member for voting using membership contract
        if (address(membershipContract) != address(0)) {
            try membershipContract.rewardVoting(proposal.organizationId, _msgSender()) {
                // Reputation reward applied successfully
            } catch {
                // Continue if reputation reward fails
            }
        }
    }

    /**
     * @dev Execute a proposal (UPDATED FOR SETTINGS PROPOSALS)
     */
    function executeProposal(string memory hierarchicalId)
        external
        override
        onlyInitialized
        nonReentrant
        returns (bool success, bytes memory returnData)
    {
        Proposal storage proposal = _proposals[hierarchicalId];
        if (proposal.creator == address(0)) {
            revert ProposalNotFound(hierarchicalId);
        }

        // Update proposal state
        _updateProposalState(hierarchicalId);

        if (proposal.state != ProposalState.Succeeded) {
            revert ProposalNotPassed(hierarchicalId);
        }

        if (block.timestamp < proposal.executionTime) {
            revert ProposalNotPassed(hierarchicalId);
        }

        // Check if this is a settings proposal
        if (_settingProposalTypes[hierarchicalId] != SettingProposalType(0) ||
            _settingProposalData[hierarchicalId].length > 0) {

            // Approve the setting change in OrganizationSettings
            organizationSettings.approveSettingChange(proposal.organizationId, hierarchicalId);

            // Execute the setting change
            organizationSettings.executeSettingChange(proposal.organizationId, hierarchicalId);

            success = true;
            returnData = "";

            emit SettingsProposalExecuted(
                hierarchicalId,
                proposal.organizationId,
                _settingProposalTypes[hierarchicalId],
                success,
                block.timestamp
            );
        } else {
            // Execute regular proposal
            if (proposal.targetContract != address(0) && proposal.executionData.length > 0) {
                (success, returnData) = proposal.targetContract.call(proposal.executionData);
            } else {
                success = true;
                returnData = "";
            }
        }

        // Update proposal state
        proposal.state = ProposalState.Executed;
        proposal.executor = _msgSender();
        proposal.executedAt = block.timestamp;

        // Update tracking sets
        bytes32 proposalHash = keccak256(bytes(hierarchicalId));
        _proposalsByState[ProposalState.Succeeded].remove(proposalHash);
        _proposalsByState[ProposalState.Executed].add(proposalHash);

        emit ProposalExecutedHierarchical(hierarchicalId, _msgSender(), success, returnData);
    }

    /**
     * @dev Cancel a proposal
     */
    function cancelProposal(string memory hierarchicalId, string memory reason) external override onlyInitialized {
        Proposal storage proposal = _proposals[hierarchicalId];
        if (proposal.creator == address(0)) {
            revert ProposalNotFound(hierarchicalId);
        }

        // Only creator or admin can cancel
        require(
            proposal.creator == _msgSender() || hasRole(SIGNAL_ADMIN_ROLE, _msgSender()),
            "Not authorized to cancel"
        );

        // Update proposal state
        proposal.state = ProposalState.Canceled;

        // Update tracking sets
        bytes32 proposalHash = keccak256(bytes(hierarchicalId));
        _proposalsByState[ProposalState.Pending].remove(proposalHash);
        _proposalsByState[ProposalState.Active].remove(proposalHash);
        _proposalsByState[ProposalState.Succeeded].remove(proposalHash);
        _proposalsByState[ProposalState.Canceled].add(proposalHash);

        // If this was a settings proposal, reject it in OrganizationSettings
        if (_settingProposalTypes[hierarchicalId] != SettingProposalType(0) ||
            _settingProposalData[hierarchicalId].length > 0) {
            organizationSettings.rejectSettingChange(proposal.organizationId, hierarchicalId);
        }

        emit ProposalCanceledHierarchical(hierarchicalId, _msgSender(), reason);
    }

    // =============================================================
    // VOTING PARAMETERS - DELEGATED TO ORGANIZATION SETTINGS
    // =============================================================

    /**
     * @dev Set voting parameters for an organization (DEPRECATED - use createSettingsProposal)
     */
    function setVotingParameters(
        bytes8 organizationId,
        VotingParameters memory params
    ) external override onlyInitialized {
        revert("Use createSettingsProposal for voting parameters");
    }

    /**
     * @dev Get voting parameters for an organization
     */
    function getVotingParameters(bytes8 organizationId)
        external
        view
        override
        returns (VotingParameters memory)
    {
        return _getVotingParameters(organizationId);
    }

    /**
     * @dev Internal function to get voting parameters from OrganizationSettings
     */
    function _getVotingParameters(bytes8 organizationId)
        internal
        view
        returns (VotingParameters memory)
    {
        if (address(organizationSettings) != address(0)) {
            IOrganizationSettings.VotingParameters memory orgParams = organizationSettings.getVotingParameters(organizationId);

            // Convert to Signal VotingParameters
            return VotingParameters({
                votingDelay: orgParams.votingDelay,
                votingPeriod: orgParams.votingPeriod,
                executionDelay: orgParams.executionDelay,
                quorumThreshold: orgParams.quorumThreshold,
                proposalThreshold: orgParams.proposalThreshold,
                requireMembership: orgParams.requireMembership
            });
        }

        // Fallback to default parameters
        return VotingParameters({
            votingDelay: 1 days,
            votingPeriod: 7 days,
            executionDelay: 2 days,
            quorumThreshold: 1000, // 10%
            proposalThreshold: 100, // 1%
            requireMembership: true
        });
    }

    // =============================================================
    // VOTING POWER - DELEGATED TO MEMBERSHIP CONTRACT
    // =============================================================

    /**
     * @dev Get voting power for an address (UPDATED TO USE MEMBERSHIP CONTRACT)
     */
    function _getVotingPower(
        bytes8 organizationId,
        address account,
        VotingPower votingPowerType
    ) internal view returns (uint256) {
        if (address(membershipContract) != address(0)) {
            // Use membership contract for voting power calculation
            return membershipContract.getVotingPower(organizationId, account);
        }

        // Fallback to Control module
        if (_getControlModule().isMember(organizationId, account)) {
            return 1; // One person, one vote
        }
        return 0;
    }

    /**
     * @dev Get total voting power for an organization (UPDATED TO USE MEMBERSHIP CONTRACT)
     */
    function _getTotalVotingPower(
        bytes8 organizationId,
        VotingPower votingPowerType
    ) internal view returns (uint256) {
        if (address(membershipContract) != address(0)) {
            // Use membership contract for total voting power
            return membershipContract.getTotalVotingPower(organizationId);
        }

        // Fallback to Control module
        return _getControlModule().getMemberCount(organizationId);
    }

    // =============================================================
    // HELPER FUNCTIONS
    // =============================================================

    /**
     * @dev Convert SettingProposalType to OrganizationSettings.SettingType
     */
    function _convertSettingType(SettingProposalType settingType) internal pure returns (IOrganizationSettings.SettingType) {
        if (settingType == SettingProposalType.VOTING_PARAMETERS) {
            return IOrganizationSettings.SettingType.VOTING_PARAMETERS;
        } else if (settingType == SettingProposalType.MEMBERSHIP_CONFIG) {
            return IOrganizationSettings.SettingType.MEMBERSHIP_CONFIG;
        } else if (settingType == SettingProposalType.TREASURY_CONFIG) {
            return IOrganizationSettings.SettingType.TREASURY_CONFIG;
        } else if (settingType == SettingProposalType.STAKING_REQUIREMENTS) {
            return IOrganizationSettings.SettingType.STAKING_REQUIREMENTS;
        } else if (settingType == SettingProposalType.REPUTATION_CONFIG) {
            return IOrganizationSettings.SettingType.REPUTATION_CONFIG;
        } else if (settingType == SettingProposalType.GOVERNANCE_CONFIG) {
            return IOrganizationSettings.SettingType.GOVERNANCE_CONFIG;
        }
        return IOrganizationSettings.SettingType.VOTING_PARAMETERS; // Default
    }

    /**
     * @dev Update proposal state based on current conditions
     */
    function _updateProposalState(string memory hierarchicalId) internal {
        Proposal storage proposal = _proposals[hierarchicalId];
        ProposalState oldState = proposal.state;
        ProposalState newState = _calculateProposalState(proposal);

        if (oldState != newState) {
            bytes32 proposalHash = keccak256(bytes(hierarchicalId));
            _proposalsByState[oldState].remove(proposalHash);
            _proposalsByState[newState].add(proposalHash);
            proposal.state = newState;
        }
    }

    /**
     * @dev Calculate proposal state based on current conditions
     */
    function _calculateProposalState(Proposal memory proposal)
        internal
        view
        returns (ProposalState)
    {
        if (proposal.state == ProposalState.Executed || proposal.state == ProposalState.Canceled) {
            return proposal.state;
        }

        if (block.timestamp < proposal.startTime) {
            return ProposalState.Pending;
        }

        if (block.timestamp <= proposal.endTime) {
            return ProposalState.Active;
        }

        // Voting has ended, check if passed
        VotingParameters memory params = _getVotingParameters(proposal.organizationId);
        uint256 totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
        uint256 totalSupply = _getTotalVotingPower(proposal.organizationId, proposal.votingPower);
        uint256 quorumRequired = (totalSupply * params.quorumThreshold) / BASIS_POINTS;

        if (totalVotes < quorumRequired) {
            return ProposalState.Defeated;
        }

        // Check voting type requirements
        if (proposal.votingType == VotingType.Supermajority) {
            // Require >66.7% of votes cast
            if (proposal.forVotes * 3 > totalVotes * 2) {
                return ProposalState.Succeeded;
            }
        } else if (proposal.votingType == VotingType.Absolute) {
            // Require >50% of total eligible voters
            if (proposal.forVotes * 2 > totalSupply) {
                return ProposalState.Succeeded;
            }
        } else if (proposal.votingType == VotingType.Unanimous) {
            // Require 100% of votes cast
            if (proposal.forVotes == totalVotes && proposal.againstVotes == 0) {
                return ProposalState.Succeeded;
            }
        } else {
            // Relative majority: >50% of votes cast
            if (proposal.forVotes > proposal.againstVotes) {
                return ProposalState.Succeeded;
            }
        }

        return ProposalState.Defeated;
    }

    /**
     * @dev Get Control module instance
     */
    function _getControlModule() internal view returns (IControl) {
        return IControl(getRegistry().getModule(keccak256("CONTROL")));
    }

    // =============================================================
    // VIEW FUNCTIONS
    // =============================================================

    function getProposal(string memory hierarchicalId) external view override returns (Proposal memory) {
        return _proposals[hierarchicalId];
    }

    function getVote(string memory hierarchicalId, address voter) external view override returns (Vote memory) {
        return _votes[hierarchicalId][voter];
    }

    function getOrganizationProposals(bytes8 organizationId) external view override returns (bytes32[] memory) {
        return _organizationProposals[organizationId].values();
    }

    function getProposalsByState(ProposalState state) external view override returns (bytes32[] memory) {
        return _proposalsByState[state].values();
    }

    // =============================================================
    // DELEGATION FUNCTIONS (SIMPLIFIED - DELEGATED TO MEMBERSHIP CONTRACT)
    // =============================================================

    function delegateVotingPower(address delegatee, uint256 amount) external override onlyInitialized {
        if (address(membershipContract) != address(0)) {
            // Delegate through membership contract for better integration
            revert("Use membership contract for delegation");
        }

        // Fallback implementation
        if (delegatee == address(0) || delegatee == _msgSender()) {
            revert InvalidDelegation(_msgSender(), delegatee);
        }

        _delegations[_msgSender()].push(Delegation({
            delegatee: delegatee,
            amount: amount,
            timestamp: block.timestamp,
            active: true
        }));

        _totalDelegatedOut[_msgSender()] += amount;

        emit VotingPowerDelegated(_msgSender(), delegatee, amount, block.timestamp);
    }

    function undelegateVotingPower(address delegatee, uint256 amount) external override onlyInitialized {
        if (address(membershipContract) != address(0)) {
            // Delegate through membership contract for better integration
            revert("Use membership contract for delegation");
        }

        // Fallback implementation
        require(_totalDelegatedOut[_msgSender()] >= amount, "Insufficient delegated amount");

        _totalDelegatedOut[_msgSender()] -= amount;

        emit VotingPowerUndelegated(_msgSender(), delegatee, amount, block.timestamp);
    }

    function getDelegatedVotingPower(address delegator) external view override returns (uint256) {
        return _totalDelegatedOut[delegator];
    }

    function getDelegations(address delegator) external view override returns (Delegation[] memory) {
        return _delegations[delegator];
    }

    function getVotingPowerWithDelegation(bytes8 organizationId, address account, VotingPower votingPowerType)
        external view override returns (uint256) {
        // Use membership contract if available
        if (address(membershipContract) != address(0)) {
            return membershipContract.getVotingPower(organizationId, account);
        }

        // Fallback to base voting power
        return _getVotingPower(organizationId, account, votingPowerType);
    }

    // =============================================================
    // CONVICTION VOTING FUNCTIONS (SIMPLIFIED)
    // =============================================================

    function castVoteWithConviction(
        string memory hierarchicalId,
        VoteChoice choice,
        uint256 convictionTime,
        string memory reason
    ) external override onlyInitialized whenNotPaused nonReentrant {
        // Similar to castVote but with conviction multiplier
        // Implementation simplified for brevity
        revert("Conviction voting not fully implemented in this version");
    }

    function calculateConvictionMultiplier(uint256 convictionTime) external pure override returns (uint256) {
        if (convictionTime == 0) return 1;

        // Conviction multiplier: 1x + (time in days / 30) up to 3x max
        uint256 daysCommitted = convictionTime / 86400; // Convert seconds to days
        uint256 multiplier = 1 + (daysCommitted * 100) / 3000; // Scale by 100 for precision

        return multiplier > 300 ? 300 : multiplier; // Cap at 3x (300)
    }

    function applyConvictionDecay(string memory hierarchicalId, address voter) external override {
        // Implementation simplified for brevity
        revert("Conviction decay not fully implemented in this version");
    }

    // =============================================================
    // ENHANCED VOTING FUNCTIONS
    // =============================================================

    function canVote(string memory hierarchicalId, address voter) external view override returns (bool) {
        Proposal memory proposal = _proposals[hierarchicalId];
        if (proposal.creator == address(0)) return false;
        if (proposal.state != ProposalState.Active) return false;
        if (_votes[hierarchicalId][voter].hasVoted) return false;

        return _getVotingPower(proposal.organizationId, voter, proposal.votingPower) > 0;
    }

    function canExecute(string memory hierarchicalId) external view override returns (bool) {
        Proposal memory proposal = _proposals[hierarchicalId];
        if (proposal.creator == address(0)) return false;
        if (proposal.state != ProposalState.Succeeded) return false;

        return block.timestamp >= proposal.executionTime;
    }

    function calculateVotingPower(string memory hierarchicalId, address voter, VotingPower powerType)
        external view override returns (uint256) {
        Proposal memory proposal = _proposals[hierarchicalId];
        if (proposal.creator == address(0)) return 0;

        return _getVotingPower(proposal.organizationId, voter, powerType);
    }
}
