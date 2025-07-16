// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.20;

import "../../interfaces/ISignal.sol";
import "../../interfaces/IRegistry.sol";
import "../../core/Module.sol";
import "../../libraries/GameId.sol";
import "../../interfaces/IControl.sol";
import "../../interfaces/IGameToken.sol";
import "../../interfaces/IMembership.sol";
import "../../interfaces/ISense.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title Signal
 * @dev Implementation of the Signal module for governance and proposal management
 * @author GameDAO AG
 * @notice GameDAO v3 - Hierarchical ID System with Sense-based Reputation Integration
 */
contract Signal is Module, ISignal {
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

    // Default voting parameters
    VotingParameters private _defaultParams;

    // Errors
    error ProposalNotFound(string hierarchicalId);
    error ProposalNotActive(string hierarchicalId);
    error ProposalNotPending(string hierarchicalId);
    error ProposalAlreadyExecuted(string hierarchicalId);
    error ProposalNotExecutable(string hierarchicalId);
    error VotingPeriodNotEnded(string hierarchicalId);
    error InvalidVotingPeriod(uint256 startTime, uint256 endTime);
    error InvalidQuorumThreshold(uint256 threshold);
    error InvalidProposalParameters();
    error AlreadyVoted(string hierarchicalId, address voter);
    error VotingPeriodEnded(string hierarchicalId);
    error NotEligibleToVote(address voter);
    error InsufficientVotingPower(address voter, uint256 required, uint256 available);
    error UnauthorizedProposalCreation(address creator);
    error UnauthorizedProposalExecution(address executor);
    error InvalidDelegationAmount(uint256 amount);
    error SelfDelegationNotAllowed(address delegator);
    error InvalidConvictionTime(uint256 time);

    // Modifiers
    modifier onlyExistingProposal(string memory hierarchicalId) {
        if (_proposals[hierarchicalId].startTime == 0) revert ProposalNotFound(hierarchicalId);
        _;
    }

    modifier onlyActiveProposal(string memory hierarchicalId) {
        Proposal storage proposal = _proposals[hierarchicalId];
        if (proposal.state != ProposalState.Active) revert ProposalNotActive(hierarchicalId);
        if (block.timestamp < proposal.startTime || block.timestamp > proposal.endTime) {
            revert ProposalNotActive(hierarchicalId);
        }
        _;
    }

    modifier onlyPendingProposal(string memory hierarchicalId) {
        if (_proposals[hierarchicalId].state != ProposalState.Pending) revert ProposalNotPending(hierarchicalId);
        _;
    }

    /**
     * @dev Constructor
     */
    constructor() Module("1.0.0") {
        // Set default voting parameters
        _defaultParams = VotingParameters({
            votingDelay: 1 days,
            votingPeriod: 7 days,
            executionDelay: 2 days,
            quorumThreshold: 1000, // 10%
            proposalThreshold: 100, // 1%
            requireMembership: true
        });

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
        address registryAddr = address(_registry);
        _grantRole(SIGNAL_ADMIN_ROLE, registryAddr);
        _grantRole(PROPOSAL_CREATOR_ROLE, registryAddr);
        _grantRole(EXECUTOR_ROLE, registryAddr);
    }

    // ============ PROPOSAL MANAGEMENT ============

    /**
     * @dev Create a new proposal using hierarchical ID
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
    ) external override onlyRole(PROPOSAL_CREATOR_ROLE) onlyInitialized returns (string memory hierarchicalId) {
        // Validate voting period
        if (votingPeriod < MIN_VOTING_PERIOD || votingPeriod > MAX_VOTING_PERIOD) {
            revert InvalidVotingPeriod(0, votingPeriod);
        }

        // Generate hierarchical ID: "ORGID123-P-PROP001"
        uint256 proposalCounter = ++_organizationProposalCounters[organizationId];
        hierarchicalId = GameId.generateProposalId(organizationId, proposalCounter);

        // Get voting parameters
        VotingParameters memory params = _getVotingParameters(organizationId);

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

        // Add to tracking
        bytes32 proposalHash = keccak256(abi.encodePacked(hierarchicalId));
        _organizationProposals[organizationId].add(proposalHash);
        _proposalsByState[ProposalState.Pending].add(proposalHash);

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

    // ============ VOTING FUNCTIONS ============

    /**
     * @dev Cast a vote on a proposal
     */
    function castVote(
        string memory hierarchicalId,
        VoteChoice choice,
        string memory reason
    ) external override onlyExistingProposal(hierarchicalId) onlyActiveProposal(hierarchicalId) onlyInitialized {
        Proposal storage proposal = _proposals[hierarchicalId];

        // Check if already voted
        if (_votes[hierarchicalId][_msgSender()].hasVoted) {
            revert AlreadyVoted(hierarchicalId, _msgSender());
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

        // Update proposal tallies
        if (choice == VoteChoice.For) {
            proposal.forVotes += votingPower;
        } else if (choice == VoteChoice.Against) {
            proposal.againstVotes += votingPower;
        } else if (choice == VoteChoice.Abstain) {
            proposal.abstainVotes += votingPower;
        }

        // Add to voters set
        _proposalVoters[hierarchicalId].add(_msgSender());

        emit VoteCast(hierarchicalId, _msgSender(), choice, votingPower, reason);
    }

    /**
     * @dev Execute a proposal
     */
    function executeProposal(string memory hierarchicalId)
        external
        override
        onlyInitialized
        returns (bool success, bytes memory returnData)
    {
        Proposal storage proposal = _proposals[hierarchicalId];
        if (proposal.creator == address(0)) {
            revert ProposalNotFound(hierarchicalId);
        }

        // Update proposal state
        _updateProposalState(hierarchicalId);

        if (proposal.state != ProposalState.Succeeded) {
            revert ProposalNotExecutable(hierarchicalId);
        }

        if (block.timestamp < proposal.executionTime) {
            revert ProposalNotActive(hierarchicalId);
        }

        // Execute proposal
        proposal.state = ProposalState.Executed;
        proposal.executedAt = block.timestamp;
        proposal.executor = _msgSender();

        // Move to executed state
        bytes32 proposalHash = keccak256(abi.encodePacked(hierarchicalId));
        _proposalsByState[ProposalState.Succeeded].remove(proposalHash);
        _proposalsByState[ProposalState.Executed].add(proposalHash);

        // Execute if there's execution data
        if (proposal.executionData.length > 0 && proposal.targetContract != address(0)) {
            (success, returnData) = proposal.targetContract.call(proposal.executionData);
        } else {
            success = true;
        }

        emit ProposalExecuted(hierarchicalId, _msgSender(), success, returnData);
        return (success, returnData);
    }

    /**
     * @dev Cancel a proposal
     */
    function cancelProposal(string memory hierarchicalId, string memory reason)
        external
        override
        onlyInitialized
    {
        Proposal storage proposal = _proposals[hierarchicalId];
        if (proposal.creator == address(0)) {
            revert ProposalNotFound(hierarchicalId);
        }

        // Only creator or admin can cancel
        if (_msgSender() != proposal.creator && !hasRole(SIGNAL_ADMIN_ROLE, _msgSender())) {
            revert UnauthorizedProposalCreation(_msgSender());
        }

        // Can only cancel pending or active proposals
        if (proposal.state != ProposalState.Pending && proposal.state != ProposalState.Active) {
            revert ProposalNotActive(hierarchicalId);
        }

        // Update state
        bytes32 proposalHash = keccak256(abi.encodePacked(hierarchicalId));
        _proposalsByState[proposal.state].remove(proposalHash);
        proposal.state = ProposalState.Canceled;
        _proposalsByState[ProposalState.Canceled].add(proposalHash);

        emit ProposalCanceled(hierarchicalId, _msgSender(), reason);
    }

    // ============ INTERNAL FUNCTIONS ============

    /**
     * @dev Get voting power for an address with reputation integration
     */
    function _getVotingPower(
        bytes8 organizationId,
        address account,
        VotingPower votingPowerType
    ) internal view returns (uint256) {
        // Check if account is a member
        if (!_getMembershipModule().isMember(organizationId, account)) {
            return 0;
        }

        // Get base voting power from membership
        IMembership.Member memory member = _getMembershipModule().getMember(organizationId, account);
        uint256 baseVotingPower = member.votingPower;

        // Apply reputation multiplier if using reputation-based voting
        if (votingPowerType == VotingPower.Reputation) {
            ISense senseModule = _getSenseModule();
            if (address(senseModule) != address(0)) {
                // Get reputation-based voting power from Sense module
                uint256 reputationVotingPower = senseModule.getMemberVotingPower(organizationId, account, baseVotingPower);
                return reputationVotingPower;
            }
        }

        // For other voting power types or if Sense module not available, use base voting power
        return baseVotingPower;
    }

    /**
     * @dev Get total voting power for an organization with reputation integration
     */
    function _getTotalVotingPower(
        bytes8 organizationId,
        VotingPower votingPowerType
    ) internal view returns (uint256) {
        IMembership membershipModule = _getMembershipModule();
        address[] memory members = membershipModule.getMembers(organizationId);

        uint256 totalVotingPower = 0;

        for (uint256 i = 0; i < members.length; i++) {
            totalVotingPower += _getVotingPower(organizationId, members[i], votingPowerType);
        }

        return totalVotingPower;
    }

    /**
     * @dev Update proposal state based on current conditions
     */
    function _updateProposalState(string memory hierarchicalId) internal {
        Proposal storage proposal = _proposals[hierarchicalId];
        ProposalState oldState = proposal.state;
        ProposalState newState = _calculateProposalState(proposal);

        if (oldState != newState) {
            bytes32 proposalHash = keccak256(abi.encodePacked(hierarchicalId));
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
     * @dev Get voting parameters for an organization
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
     * @dev Get Control module instance
     */
    function _getControlModule() internal view returns (IControl) {
        return IControl(getModule(keccak256("CONTROL")));
    }

    /**
     * @dev Get Membership module instance
     */
    function _getMembershipModule() internal view returns (IMembership) {
        return IMembership(getModule(keccak256("MEMBERSHIP")));
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

    // ============ DELEGATION FUNCTIONS ============

    /**
     * @dev Delegate voting power to another address
     */
    function delegateVotingPower(address delegatee, uint256 amount) external override onlyInitialized {
        if (delegatee == _msgSender()) {
            revert SelfDelegationNotAllowed(_msgSender());
        }

        if (amount == 0) {
            revert InvalidDelegationAmount(amount);
        }

        // Create delegation record
        _delegations[_msgSender()].push(Delegation({
            delegatee: delegatee,
            amount: amount,
            timestamp: block.timestamp,
            active: true
        }));

        // Update delegation tracking
        _delegatedVotingPower[_msgSender()][delegatee] += amount;
        _totalDelegatedOut[_msgSender()] += amount;

        // Add to delegators set
        _delegators[delegatee].add(_msgSender());

        emit VotingPowerDelegated(_msgSender(), delegatee, amount, block.timestamp);
    }

    /**
     * @dev Undelegate voting power from another address
     */
    function undelegateVotingPower(address delegatee, uint256 amount) external override onlyInitialized {
        if (_delegatedVotingPower[_msgSender()][delegatee] < amount) {
            revert InvalidDelegationAmount(amount);
        }

        // Update delegation tracking
        _delegatedVotingPower[_msgSender()][delegatee] -= amount;
        _totalDelegatedOut[_msgSender()] -= amount;

        // Update delegation records
        Delegation[] storage delegations = _delegations[_msgSender()];
        uint256 remainingAmount = amount;

        for (uint256 i = 0; i < delegations.length && remainingAmount > 0; i++) {
            Delegation storage delegation = delegations[i];
            if (delegation.delegatee == delegatee && delegation.active) {
                uint256 undelegateAmount = remainingAmount > delegation.amount ? delegation.amount : remainingAmount;
                delegation.amount -= undelegateAmount;
                remainingAmount -= undelegateAmount;

                if (delegation.amount == 0) {
                    delegation.active = false;
                }
            }
        }

        // Remove from delegators set if no more delegations
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
     * @dev Get voting power including delegations with reputation integration
     */
    function getVotingPowerWithDelegation(bytes8 organizationId, address account, VotingPower votingPowerType)
        external view override returns (uint256) {
        uint256 basePower = _getVotingPower(organizationId, account, votingPowerType);

        // Add delegated power
        uint256 delegatedPower = 0;
        address[] memory delegators = _delegators[account].values();
        for (uint256 i = 0; i < delegators.length; i++) {
            delegatedPower += _delegatedVotingPower[delegators[i]][account];
        }

        return basePower + delegatedPower;
    }

    // ============ CONVICTION VOTING ============

    /**
     * @dev Cast a conviction vote (time-locked vote with increasing power)
     */
    function castVoteWithConviction(
        string memory hierarchicalId,
        VoteChoice choice,
        uint256 convictionTime,
        string memory reason
    ) external override onlyExistingProposal(hierarchicalId) onlyActiveProposal(hierarchicalId) onlyInitialized {
        Proposal storage proposal = _proposals[hierarchicalId];

        // Validate conviction time (minimum 1 day, maximum 30 days)
        if (convictionTime < 1 days || convictionTime > 30 days) {
            revert InvalidConvictionTime(convictionTime);
        }

        // Check if already voted
        if (_votes[hierarchicalId][_msgSender()].hasVoted) {
            revert AlreadyVoted(hierarchicalId, _msgSender());
        }

        // Get base voting power
        uint256 basePower = _getVotingPower(proposal.organizationId, _msgSender(), proposal.votingPower);
        if (basePower == 0) {
            revert InsufficientVotingPower(_msgSender(), 1, 0);
        }

        // Calculate conviction multiplier (1x to 3x based on time)
        uint256 convictionMultiplier = calculateConvictionMultiplier(convictionTime);
        uint256 finalVotingPower = basePower * convictionMultiplier / 100;

        // Record vote
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

        // Record conviction vote data
        _convictionVotes[hierarchicalId][_msgSender()] = finalVotingPower;
        _convictionStartTime[hierarchicalId][_msgSender()] = block.timestamp;

        // Update proposal tallies
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
    function calculateConvictionMultiplier(uint256 convictionTime) public pure override returns (uint256) {
        if (convictionTime == 0) return 100;

        // Conviction multiplier: 1x + (time in days / 30) up to 3x max
        uint256 daysCommitted = convictionTime / 86400; // Convert seconds to days
        uint256 multiplier = 100 + (daysCommitted * 200) / 30; // Scale by 100 for precision

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
            Proposal storage proposal = _proposals[hierarchicalId];
            uint256 oldPower = vote.votingPower;
            uint256 basePower = oldPower / vote.convictionMultiplier * 100;
            vote.votingPower = basePower;
            vote.convictionMultiplier = 100;

            // Update proposal vote counts
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

    // ============ VIEW FUNCTIONS ============

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
        if (!_getMembershipModule().isMember(organizationId, _msgSender())) {
            revert NotEligibleToVote(_msgSender());
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
     * @dev Check if an address can vote on a proposal
     */
    function canVote(string memory hierarchicalId, address voter) external view override returns (bool) {
        Proposal storage proposal = _proposals[hierarchicalId];
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
     * @dev Calculate voting power for a specific proposal and voter with reputation integration
     */
    function calculateVotingPower(string memory hierarchicalId, address voter, VotingPower powerType)
        external view override returns (uint256) {
        Proposal storage proposal = _proposals[hierarchicalId];
        return _getVotingPower(proposal.organizationId, voter, powerType);
    }
}
