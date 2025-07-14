// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.20;

import "../../interfaces/ISignal.sol";
import "../../interfaces/IGameDAOModule.sol";
import "../../interfaces/IGameDAORegistry.sol";
import "../../core/GameDAOModule.sol";
import "../../libraries/GameId.sol";
import "../../interfaces/IControl.sol";
import "../../interfaces/IGameToken.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title Signal
 * @dev Implementation of the Signal module for governance and proposal management
 * @author GameDAO AG
 * @notice GameDAO v3 - Hierarchical ID System Only
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


    // State variables - Hierarchical ID Only
    mapping(string => Proposal) private _proposals;
    mapping(string => mapping(address => Vote)) private _votes;
    mapping(string => EnumerableSet.AddressSet) private _proposalVoters;
    mapping(bytes8 => EnumerableSet.Bytes32Set) private _organizationProposals;
    mapping(ProposalState => EnumerableSet.Bytes32Set) private _proposalsByState;
    mapping(bytes8 => VotingParameters) private _votingParameters;
    mapping(address => mapping(address => uint256)) private _delegatedVotingPower;
    mapping(address => EnumerableSet.AddressSet) private _delegators;
    mapping(bytes8 => uint256) private _organizationProposalCounters;

    // Delegation tracking
    mapping(address => Delegation[]) private _delegations;
    mapping(address => uint256) private _totalDelegatedOut;

    // Conviction voting
    mapping(string => mapping(address => uint256)) private _convictionVotes;
    mapping(string => mapping(address => uint256)) private _convictionStartTime;

    EnumerableSet.Bytes32Set private _allProposals;

    // Default voting parameters
    VotingParameters private _defaultParams;

    // Events - Hierarchical ID System
    event ProposalCreatedHierarchical(
        string indexed hierarchicalId,
        bytes8 indexed organizationId,
        address indexed creator,
        string title,
        ProposalType proposalType,
        VotingType votingType,
        uint256 votingPeriod,
        uint256 startTime,
        uint256 endTime
    );

    event VoteCastHierarchical(
        string indexed hierarchicalId,
        address indexed voter,
        VoteChoice choice,
        uint256 votingPower,
        string reason
    );

    event ProposalExecutedHierarchical(
        string indexed hierarchicalId,
        address indexed executor,
        bool success,
        bytes returnData
    );

    event ProposalCanceledHierarchical(
        string indexed hierarchicalId,
        address indexed canceler,
        string reason
    );

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

    /**
     * @dev Constructor
     */
    constructor() GameDAOModule("1.0.0") {
        // Set default voting parameters
        _defaultParams = VotingParameters({
            votingDelay: 1 days,
            votingPeriod: 7 days,
            executionDelay: 2 days,
            quorumThreshold: 1000, // 10%
            proposalThreshold: 100, // 1%
            requireMembership: true
        });

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
     * @dev Create a new proposal with hierarchical ID
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

        // Check membership requirement
        VotingParameters memory params = _getVotingParameters(organizationId);
        if (params.requireMembership && !_getControlModule().isMember(organizationId, _msgSender())) {
            revert MembershipRequired(organizationId, _msgSender());
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

        emit ProposalCreated(
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

        return hierarchicalId;
    }

    /**
     * @dev Cast a vote on a proposal
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

        // Get voting power
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
        emit VoteCast(hierarchicalId, _msgSender(), choice, votingPower, reason);
    }

    /**
     * @dev Execute a proposal
     */
    function executeProposal(string memory hierarchicalId)
        external
        override
        onlyInitialized
        whenNotPaused
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
            revert ProposalNotActive(hierarchicalId);
        }

        // Execute proposal
        proposal.state = ProposalState.Executed;
        proposal.executedAt = block.timestamp;
        proposal.executor = _msgSender();

        // Move to executed state
        bytes32 proposalHash = keccak256(bytes(hierarchicalId));
        _proposalsByState[ProposalState.Succeeded].remove(proposalHash);
        _proposalsByState[ProposalState.Executed].add(proposalHash);

        // Execute if there's execution data
        if (proposal.executionData.length > 0 && proposal.targetContract != address(0)) {
            (success, returnData) = proposal.targetContract.call(proposal.executionData);
            if (!success) {
                revert ExecutionFailed(hierarchicalId, string(returnData));
            }
        } else {
            success = true;
        }

        emit ProposalExecutedHierarchical(hierarchicalId, _msgSender(), success, returnData);
        return (success, returnData);
    }

    /**
     * @dev Cancel a proposal
     */
    function cancelProposal(string memory hierarchicalId, string memory reason)
        external
        override
        onlyInitialized
        whenNotPaused
        nonReentrant
    {
        Proposal storage proposal = _proposals[hierarchicalId];
        if (proposal.creator == address(0)) {
            revert ProposalNotFound(hierarchicalId);
        }

        // Only creator or admin can cancel
        if (_msgSender() != proposal.creator && !hasRole(SIGNAL_ADMIN_ROLE, _msgSender())) {
            revert UnauthorizedProposalAccess(hierarchicalId, _msgSender());
        }

        // Can only cancel pending or active proposals
        if (proposal.state != ProposalState.Pending && proposal.state != ProposalState.Active) {
            revert ProposalNotActive(hierarchicalId);
        }

        // Update state
        bytes32 proposalHash = keccak256(bytes(hierarchicalId));
        _proposalsByState[proposal.state].remove(proposalHash);
        proposal.state = ProposalState.Canceled;
        _proposalsByState[ProposalState.Canceled].add(proposalHash);

        emit ProposalCanceledHierarchical(hierarchicalId, _msgSender(), reason);
    }

    /**
     * @dev Get proposal by hierarchical ID
     */
    function getProposal(string memory hierarchicalId)
        external
        view
        override
        returns (Proposal memory)
    {
        Proposal memory proposal = _proposals[hierarchicalId];
        if (proposal.creator == address(0)) {
            revert ProposalNotFound(hierarchicalId);
        }
        return proposal;
    }

    /**
     * @dev Get vote for a proposal
     */
    function getVote(string memory hierarchicalId, address voter)
        external
        view
        override
        returns (Vote memory)
    {
        return _votes[hierarchicalId][voter];
    }

    /**
     * @dev Get organization proposals
     */
    function getOrganizationProposals(bytes8 organizationId)
        external
        view
        override
        returns (bytes32[] memory)
    {
        return _organizationProposals[organizationId].values();
    }

    /**
     * @dev Get proposals by state
     */
    function getProposalsByState(ProposalState state)
        external
        view
        override
        returns (bytes32[] memory)
    {
        return _proposalsByState[state].values();
    }

    /**
     * @dev Set voting parameters for an organization
     */
    function setVotingParameters(
        bytes8 organizationId,
        VotingParameters memory params
    ) external override onlyInitialized {
        // Only organization members can set parameters (simplified for now)
        if (!_getControlModule().isMember(organizationId, _msgSender())) {
            revert MembershipRequired(organizationId, _msgSender());
        }

        _votingParameters[organizationId] = params;
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
     * @dev Internal function to get voting parameters
     */
    function _getVotingParameters(bytes8 organizationId)
        internal
        view
        returns (VotingParameters memory)
    {
        VotingParameters memory params = _votingParameters[organizationId];
        if (params.votingPeriod == 0) {
            return _defaultParams;
        }
        return params;
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

        if (proposal.forVotes > proposal.againstVotes) {
            return ProposalState.Succeeded;
        }

        return ProposalState.Defeated;
    }

        /**
     * @dev Get voting power for an address
     */
    function _getVotingPower(
        bytes8 organizationId,
        address account,
        VotingPower votingPowerType
    ) internal view returns (uint256) {
        // Simplified voting power - just check membership
        if (_getControlModule().isMember(organizationId, account)) {
            return 1; // One person, one vote for now
        }
        return 0;
    }

    /**
     * @dev Get total voting power for an organization
     */
    function _getTotalVotingPower(
        bytes8 organizationId,
        VotingPower votingPowerType
    ) internal view returns (uint256) {
        // Simplified total voting power - just member count
        return _getControlModule().getMemberCount(organizationId);
    }

    /**
     * @dev Get Control module instance
     */
    function _getControlModule() internal view returns (IControl) {
        return IControl(getRegistry().getModule(keccak256("CONTROL")));
    }

    // ============ DELEGATION FUNCTIONS ============

    /**
     * @dev Delegate voting power to another address
     */
    function delegateVotingPower(address delegatee, uint256 amount) external override onlyInitialized {
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
        _delegatedVotingPower[_msgSender()][delegatee] += amount;
        _delegators[delegatee].add(_msgSender());

        emit VotingPowerDelegated(_msgSender(), delegatee, amount, block.timestamp);
    }

    /**
     * @dev Undelegate voting power from another address
     */
    function undelegateVotingPower(address delegatee, uint256 amount) external override onlyInitialized {
        if (_delegatedVotingPower[_msgSender()][delegatee] < amount) {
            revert DelegationNotFound(_msgSender(), delegatee);
        }

        _delegatedVotingPower[_msgSender()][delegatee] -= amount;
        _totalDelegatedOut[_msgSender()] -= amount;

        // Update delegation records
        for (uint256 i = 0; i < _delegations[_msgSender()].length; i++) {
            if (_delegations[_msgSender()][i].delegatee == delegatee && _delegations[_msgSender()][i].active) {
                if (_delegations[_msgSender()][i].amount <= amount) {
                    _delegations[_msgSender()][i].active = false;
                    amount -= _delegations[_msgSender()][i].amount;
                } else {
                    _delegations[_msgSender()][i].amount -= amount;
                    amount = 0;
                }
                if (amount == 0) break;
            }
        }

        if (_delegatedVotingPower[_msgSender()][delegatee] == 0) {
            _delegators[delegatee].remove(_msgSender());
        }

        emit VotingPowerUndelegated(_msgSender(), delegatee, amount, block.timestamp);
    }

    /**
     * @dev Get total delegated voting power for an address
     */
    function getDelegatedVotingPower(address delegator) external view override returns (uint256) {
        return _totalDelegatedOut[delegator];
    }

    /**
     * @dev Get all delegations for an address
     */
    function getDelegations(address delegator) external view override returns (Delegation[] memory) {
        return _delegations[delegator];
    }

    /**
     * @dev Get voting power including delegations
     */
    function getVotingPowerWithDelegation(bytes8 organizationId, address account, VotingPower votingPowerType)
        external view override returns (uint256) {
        uint256 basePower = _getVotingPower(organizationId, account, votingPowerType);

        // Add delegated power from others
        uint256 delegatedPower = 0;
        address[] memory delegators = _delegators[account].values();
        for (uint256 i = 0; i < delegators.length; i++) {
            delegatedPower += _delegatedVotingPower[delegators[i]][account];
        }

        return basePower + delegatedPower;
    }

    // ============ CONVICTION VOTING FUNCTIONS ============

    /**
     * @dev Cast a vote with conviction
     */
    function castVoteWithConviction(
        string memory hierarchicalId,
        VoteChoice choice,
        uint256 convictionTime,
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

        // Get base voting power
        uint256 basePower = _getVotingPower(proposal.organizationId, _msgSender(), proposal.votingPower);
        if (basePower == 0) {
            revert InsufficientVotingPower(_msgSender(), 1, 0);
        }

        // Calculate conviction multiplier
        uint256 convictionMultiplier = this.calculateConvictionMultiplier(convictionTime);
        uint256 finalVotingPower = basePower * convictionMultiplier;

        // Record vote with conviction
        _votes[hierarchicalId][_msgSender()] = Vote({
            voter: _msgSender(),
            choice: choice,
            votingPower: finalVotingPower,
            timestamp: block.timestamp,
            reason: reason,
            hasVoted: true,
            convictionTime: convictionTime,
            convictionMultiplier: convictionMultiplier
        });

        // Store conviction data
        _convictionVotes[hierarchicalId][_msgSender()] = finalVotingPower;
        _convictionStartTime[hierarchicalId][_msgSender()] = block.timestamp;

        // Update proposal vote counts
        if (choice == VoteChoice.For) {
            proposal.forVotes += finalVotingPower;
        } else if (choice == VoteChoice.Against) {
            proposal.againstVotes += finalVotingPower;
        } else if (choice == VoteChoice.Abstain) {
            proposal.abstainVotes += finalVotingPower;
        }

        // Add to voters set
        _proposalVoters[hierarchicalId].add(_msgSender());

        emit ConvictionVoteCast(hierarchicalId, _msgSender(), choice, finalVotingPower, convictionMultiplier, convictionTime, reason);
    }

    /**
     * @dev Calculate conviction multiplier based on conviction time
     */
    function calculateConvictionMultiplier(uint256 convictionTime) external pure override returns (uint256) {
        if (convictionTime == 0) return 1;

        // Conviction multiplier: 1x + (time in days / 30) up to 3x max
        uint256 daysCommitted = convictionTime / 86400; // Convert seconds to days
        uint256 multiplier = 1 + (daysCommitted * 100) / 3000; // Scale by 100 for precision

        return multiplier > 300 ? 300 : multiplier; // Cap at 3x (300)
    }

    /**
     * @dev Apply conviction decay to a vote
     */
    function applyConvictionDecay(string memory hierarchicalId, address voter) external override onlyInitialized {
        Vote storage vote = _votes[hierarchicalId][voter];
        if (!vote.hasVoted || vote.convictionTime == 0) return;

        uint256 timeElapsed = block.timestamp - _convictionStartTime[hierarchicalId][voter];
        if (timeElapsed >= vote.convictionTime) {
            // Conviction period expired, reduce to base power
            uint256 oldPower = vote.votingPower;
            uint256 basePower = oldPower / vote.convictionMultiplier;
            vote.votingPower = basePower;
            vote.convictionMultiplier = 1;

            // Update proposal vote counts
            Proposal storage proposal = _proposals[hierarchicalId];
            if (vote.choice == VoteChoice.For) {
                proposal.forVotes = proposal.forVotes - oldPower + basePower;
            } else if (vote.choice == VoteChoice.Against) {
                proposal.againstVotes = proposal.againstVotes - oldPower + basePower;
            } else if (vote.choice == VoteChoice.Abstain) {
                proposal.abstainVotes = proposal.abstainVotes - oldPower + basePower;
            }

            emit ConvictionDecayApplied(hierarchicalId, voter, oldPower, basePower, block.timestamp);
        }
    }

    // ============ ENHANCED VOTING FUNCTIONS ============

    /**
     * @dev Check if an address can vote on a proposal
     */
    function canVote(string memory hierarchicalId, address voter) external view override returns (bool) {
        Proposal memory proposal = _proposals[hierarchicalId];
        if (proposal.creator == address(0)) return false;
        if (proposal.state != ProposalState.Active) return false;
        if (_votes[hierarchicalId][voter].hasVoted) return false;

        return _getVotingPower(proposal.organizationId, voter, proposal.votingPower) > 0;
    }

    /**
     * @dev Check if a proposal can be executed
     */
    function canExecute(string memory hierarchicalId) external view override returns (bool) {
        Proposal memory proposal = _proposals[hierarchicalId];
        if (proposal.creator == address(0)) return false;
        if (proposal.state != ProposalState.Succeeded) return false;

        return block.timestamp >= proposal.executionTime;
    }

    /**
     * @dev Calculate voting power for a specific proposal and voter
     */
    function calculateVotingPower(string memory hierarchicalId, address voter, VotingPower powerType)
        external view override returns (uint256) {
        Proposal memory proposal = _proposals[hierarchicalId];
        if (proposal.creator == address(0)) return 0;

        return _getVotingPower(proposal.organizationId, voter, powerType);
    }
}
