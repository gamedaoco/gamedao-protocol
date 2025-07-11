// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.20;

import "../../core/GameDAOModule.sol";
import "../../interfaces/ISignal.sol";
import "../../interfaces/IControl.sol";
import "../../interfaces/IGameToken.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title Signal
 * @dev Implementation of the Signal module for governance and proposal management
 * @author GameDAO AG
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
    uint256 public constant CONVICTION_MULTIPLIER_BASE = 10000;

    // State variables
    mapping(bytes32 => Proposal) private _proposals;
    mapping(bytes32 => mapping(address => Vote)) private _votes;
    mapping(bytes32 => EnumerableSet.AddressSet) private _proposalVoters;
    mapping(bytes8 => EnumerableSet.Bytes32Set) private _organizationProposals;
    mapping(ProposalState => EnumerableSet.Bytes32Set) private _proposalsByState;
    mapping(bytes8 => VotingParameters) private _votingParameters;
    mapping(address => mapping(address => uint256)) private _delegatedVotingPower;
    mapping(address => EnumerableSet.AddressSet) private _delegators;

    EnumerableSet.Bytes32Set private _allProposals;
    uint256 private _proposalCounter;

    // Default voting parameters
    VotingParameters private _defaultParams;

    // Errors
    error ProposalNotFound(bytes32 proposalId);
    error ProposalNotActive(bytes32 proposalId);
    error ProposalAlreadyExecuted(bytes32 proposalId);
    error InvalidProposalParameters();
    error InvalidVotingPeriod(uint256 period);
    error VotingNotActive(bytes32 proposalId);
    error AlreadyVoted(bytes32 proposalId, address voter);
    error InsufficientVotingPower(address voter, uint256 required, uint256 available);
    error QuorumNotReached(bytes32 proposalId, uint256 required, uint256 actual);
    error ProposalNotPassed(bytes32 proposalId);
    error ExecutionFailed(bytes32 proposalId, string reason);
    error InvalidConvictionTime(uint256 convictionTime);
    error UnauthorizedProposalAccess(bytes32 proposalId, address caller);
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
     * @dev Create a new proposal
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
    ) external override onlyInitialized whenNotPaused nonReentrant returns (bytes32 proposalId) {
        // Validate organization exists
        _validateOrganization(organizationId);

        // Validate proposal parameters
        if (bytes(title).length == 0) revert InvalidProposalParameters();
        if (votingPeriod < MIN_VOTING_PERIOD || votingPeriod > MAX_VOTING_PERIOD) {
            revert InvalidVotingPeriod(votingPeriod);
        }

        // Get voting parameters for organization
        VotingParameters memory params = _getVotingParameters(organizationId);

        // Check if proposer meets threshold requirements
        if (params.requireMembership) {
            _validateMembership(organizationId, _msgSender());
        }

        uint256 proposerPower = _calculateVotingPower(organizationId, _msgSender(), votingPower);
        uint256 requiredThreshold = _calculateProposalThreshold(organizationId, params.proposalThreshold);

        if (proposerPower < requiredThreshold) {
            revert InsufficientProposalThreshold(_msgSender(), requiredThreshold, proposerPower);
        }

        // Generate unique proposal ID
        proposalId = keccak256(abi.encodePacked(
            organizationId,
            _msgSender(),
            title,
            block.timestamp,
            _proposalCounter++
        ));

        // Calculate timing
        uint256 startTime = block.timestamp + params.votingDelay;
        uint256 endTime = startTime + votingPeriod;

        // Create proposal
        Proposal storage proposal = _proposals[proposalId];
        proposal.index = _proposalCounter;
        proposal.proposalId = proposalId;
        proposal.organizationId = organizationId;
        proposal.proposer = _msgSender();
        proposal.title = title;
        proposal.description = description;
        proposal.metadataURI = metadataURI;
        proposal.proposalType = proposalType;
        proposal.votingType = votingType;
        proposal.votingPower = votingPower;
        proposal.state = ProposalState.Pending;
        proposal.startTime = startTime;
        proposal.endTime = endTime;
        proposal.executionTime = 0;
        proposal.createdAt = block.timestamp;
        proposal.updatedAt = block.timestamp;
        proposal.executionData = executionData;
        proposal.targetContract = targetContract;
        proposal.requiredQuorum = params.quorumThreshold;
        proposal.votesFor = 0;
        proposal.votesAgainst = 0;
        proposal.votesAbstain = 0;
        proposal.totalVotingPower = 0;
        proposal.executed = false;
        proposal.cancelled = false;

        // Add to tracking sets
        _allProposals.add(proposalId);
        _organizationProposals[organizationId].add(proposalId);
        _proposalsByState[ProposalState.Pending].add(proposalId);

        emit ProposalCreated(
            proposalId,
            organizationId,
            _msgSender(),
            title,
            proposalType,
            votingType,
            votingPower,
            startTime,
            endTime,
            block.timestamp
        );

        return proposalId;
    }

    /**
     * @dev Update an existing proposal
     */
    function updateProposal(
        bytes32 proposalId,
        string memory title,
        string memory description,
        uint256 endTime
    ) external override onlyInitialized whenNotPaused {
        Proposal storage proposal = _proposals[proposalId];
        if (proposal.proposer == address(0)) revert ProposalNotFound(proposalId);

        // Only proposer or admin can update
        if (_msgSender() != proposal.proposer && !hasRole(SIGNAL_ADMIN_ROLE, _msgSender())) {
            revert UnauthorizedProposalAccess(proposalId, _msgSender());
        }

        // Cannot update if voting has started or proposal is finalized
        if (proposal.state != ProposalState.Pending) {
            revert UnauthorizedProposalAccess(proposalId, _msgSender());
        }

        // Validate new parameters
        if (bytes(title).length > 0) proposal.title = title;
        if (bytes(description).length > 0) proposal.description = description;
        if (endTime > proposal.startTime && endTime > block.timestamp) {
            proposal.endTime = endTime;
        }

        proposal.updatedAt = block.timestamp;

        emit ProposalUpdated(proposalId, proposal.title, proposal.description, proposal.endTime, block.timestamp);
    }

    /**
     * @dev Cancel a proposal
     */
    function cancelProposal(bytes32 proposalId) external override onlyInitialized whenNotPaused {
        Proposal storage proposal = _proposals[proposalId];
        if (proposal.proposer == address(0)) revert ProposalNotFound(proposalId);

        // Only proposer or admin can cancel
        if (_msgSender() != proposal.proposer && !hasRole(SIGNAL_ADMIN_ROLE, _msgSender())) {
            revert UnauthorizedProposalAccess(proposalId, _msgSender());
        }

        // Cannot cancel if already executed
        if (proposal.state == ProposalState.Executed) {
            revert ProposalAlreadyExecuted(proposalId);
        }

        _updateProposalState(proposalId, ProposalState.Cancelled);
        proposal.cancelled = true;

        emit ProposalCancelled(proposalId, _msgSender(), block.timestamp);
    }

    /**
     * @dev Cast a vote on a proposal
     */
    function castVote(
        bytes32 proposalId,
        VoteChoice choice,
        string memory reason
    ) external override onlyInitialized whenNotPaused nonReentrant {
        _castVoteInternal(proposalId, choice, 0, reason);
    }

    /**
     * @dev Cast a vote with conviction (time-locking)
     */
    function castVoteWithConviction(
        bytes32 proposalId,
        VoteChoice choice,
        uint256 convictionTime,
        string memory reason
    ) external override onlyInitialized whenNotPaused nonReentrant {
        if (convictionTime > MAX_EXECUTION_DELAY) {
            revert InvalidConvictionTime(convictionTime);
        }
        _castVoteInternal(proposalId, choice, convictionTime, reason);
    }

    /**
     * @dev Internal function to cast votes
     */
    function _castVoteInternal(
        bytes32 proposalId,
        VoteChoice choice,
        uint256 convictionTime,
        string memory reason
    ) internal {
        Proposal storage proposal = _proposals[proposalId];
        if (proposal.proposer == address(0)) revert ProposalNotFound(proposalId);

        // Check if voting is active
        if (block.timestamp < proposal.startTime || block.timestamp >= proposal.endTime) {
            revert VotingNotActive(proposalId);
        }
        if (proposal.state != ProposalState.Active && proposal.state != ProposalState.Pending) {
            revert ProposalNotActive(proposalId);
        }

        // Activate proposal if it's pending and voting period has started
        if (proposal.state == ProposalState.Pending && block.timestamp >= proposal.startTime) {
            _updateProposalState(proposalId, ProposalState.Active);
        }

        // Check if voter has already voted
        if (_votes[proposalId][_msgSender()].voter != address(0)) {
            revert AlreadyVoted(proposalId, _msgSender());
        }

        // Calculate voting power
        uint256 votingPower = _calculateVotingPower(proposal.organizationId, _msgSender(), proposal.votingPower);

        // Apply conviction multiplier if applicable
        if (proposal.votingPower == VotingPower.Conviction && convictionTime > 0) {
            uint256 multiplier = _calculateConvictionMultiplier(convictionTime);
            votingPower = (votingPower * multiplier) / CONVICTION_MULTIPLIER_BASE;
        }

        if (votingPower == 0) {
            revert InsufficientVotingPower(_msgSender(), 1, 0);
        }

        // Record vote
        Vote storage vote = _votes[proposalId][_msgSender()];
        vote.voter = _msgSender();
        vote.choice = choice;
        vote.votingPower = votingPower;
        vote.timestamp = block.timestamp;
        vote.reason = reason;
        vote.convictionTime = convictionTime;

        // Add to voters list
        _proposalVoters[proposalId].add(_msgSender());

        // Update proposal vote counts
        if (choice == VoteChoice.For) {
            proposal.votesFor += votingPower;
        } else if (choice == VoteChoice.Against) {
            proposal.votesAgainst += votingPower;
        } else {
            proposal.votesAbstain += votingPower;
        }

        proposal.totalVotingPower += votingPower;

        emit VoteCast(proposalId, _msgSender(), choice, votingPower, reason, block.timestamp);

        // Check if proposal should be automatically queued
        _checkAutoQueue(proposalId);
    }

    /**
     * @dev Queue a proposal for execution
     */
    function queueProposal(bytes32 proposalId) external override onlyInitialized whenNotPaused {
        Proposal storage proposal = _proposals[proposalId];
        if (proposal.proposer == address(0)) revert ProposalNotFound(proposalId);

        // Check if proposal has passed
        (bool passed, , , , ) = _getProposalResult(proposalId);
        if (!passed) revert ProposalNotPassed(proposalId);

        // Check if voting period has ended
        if (block.timestamp < proposal.endTime) {
            revert VotingNotActive(proposalId);
        }

        VotingParameters memory params = _getVotingParameters(proposal.organizationId);
        proposal.executionTime = block.timestamp + params.executionDelay;

        _updateProposalState(proposalId, ProposalState.Queued);

        emit ProposalQueued(proposalId, proposal.executionTime, block.timestamp);
    }

    /**
     * @dev Execute a queued proposal
     */
    function executeProposal(bytes32 proposalId) external override onlyInitialized whenNotPaused nonReentrant {
        Proposal storage proposal = _proposals[proposalId];
        if (proposal.proposer == address(0)) revert ProposalNotFound(proposalId);

        // Check if proposal is queued and ready for execution
        if (proposal.state != ProposalState.Queued) {
            revert ProposalNotActive(proposalId);
        }
        if (block.timestamp < proposal.executionTime) {
            revert VotingNotActive(proposalId);
        }

        proposal.executed = true;

        // Execute the proposal
        bool success = false;
        bytes memory returnData;

        if (proposal.executionData.length > 0 && proposal.targetContract != address(0)) {
            (success, returnData) = proposal.targetContract.call(proposal.executionData);
        } else {
            success = true; // Simple proposals without execution data
        }

        if (success) {
            _updateProposalState(proposalId, ProposalState.Executed);
        } else {
            _updateProposalState(proposalId, ProposalState.Defeated);
        }

        emit ProposalExecuted(proposalId, success, returnData, block.timestamp);

        if (!success) {
            revert ExecutionFailed(proposalId, "Proposal execution failed");
        }
    }

    /**
     * @dev Delegate voting power to another address
     */
    function delegateVotingPower(address delegatee, uint256 amount)
        external
        override
        onlyInitialized
        whenNotPaused
    {
        if (delegatee == address(0) || delegatee == _msgSender()) {
            revert InvalidDelegation(_msgSender(), delegatee);
        }

        _delegatedVotingPower[_msgSender()][delegatee] += amount;
        _delegators[_msgSender()].add(delegatee);

        emit VotingPowerDelegated(_msgSender(), delegatee, amount, block.timestamp);
    }

    /**
     * @dev Undelegate voting power from another address
     */
    function undelegateVotingPower(address delegatee, uint256 amount)
        external
        override
        onlyInitialized
        whenNotPaused
    {
        uint256 currentDelegation = _delegatedVotingPower[_msgSender()][delegatee];
        if (currentDelegation < amount) {
            revert DelegationNotFound(_msgSender(), delegatee);
        }

        _delegatedVotingPower[_msgSender()][delegatee] -= amount;

        if (_delegatedVotingPower[_msgSender()][delegatee] == 0) {
            _delegators[_msgSender()].remove(delegatee);
        }

        emit VotingPowerUndelegated(_msgSender(), delegatee, amount, block.timestamp);
    }

    /**
     * @dev Apply conviction decay for time-locked votes
     */
    function applyConvictionDecay(bytes32 proposalId, address voter)
        external
        override
        onlyInitialized
        whenNotPaused
    {
        Vote storage vote = _votes[proposalId][voter];
        if (vote.voter == address(0) || vote.convictionTime == 0) return;

        uint256 timeElapsed = block.timestamp - vote.timestamp;
        if (timeElapsed < vote.convictionTime) return;

        uint256 oldPower = vote.votingPower;
        uint256 decayFactor = timeElapsed / vote.convictionTime;
        uint256 newPower = oldPower / (1 + decayFactor);

        vote.votingPower = newPower;

        // Update proposal vote counts
        Proposal storage proposal = _proposals[proposalId];
        uint256 powerReduction = oldPower - newPower;

        if (vote.choice == VoteChoice.For) {
            proposal.votesFor -= powerReduction;
        } else if (vote.choice == VoteChoice.Against) {
            proposal.votesAgainst -= powerReduction;
        } else {
            proposal.votesAbstain -= powerReduction;
        }

        proposal.totalVotingPower -= powerReduction;

        emit ConvictionDecayApplied(proposalId, voter, oldPower, newPower, block.timestamp);
    }

    /**
     * @dev Set voting parameters for an organization
     */
    function setVotingParameters(
        bytes8 organizationId,
        VotingParameters memory params
    ) external override onlyRole(SIGNAL_ADMIN_ROLE) onlyInitialized whenNotPaused {
        _validateOrganization(organizationId);

        // Validate parameters
        if (params.votingPeriod < MIN_VOTING_PERIOD || params.votingPeriod > MAX_VOTING_PERIOD) {
            revert InvalidVotingPeriod(params.votingPeriod);
        }
        if (params.executionDelay > MAX_EXECUTION_DELAY) {
            revert InvalidProposalParameters();
        }
        if (params.quorumThreshold > MAX_QUORUM_THRESHOLD) {
            revert InvalidProposalParameters();
        }

        _votingParameters[organizationId] = params;

        emit VotingParametersUpdated(
            organizationId,
            params.votingDelay,
            params.votingPeriod,
            params.executionDelay,
            params.quorumThreshold,
            params.proposalThreshold,
            block.timestamp
        );
    }

    /**
     * @dev Set proposal state (admin only)
     */
    function setProposalState(bytes32 proposalId, ProposalState newState)
        external
        override
        onlyRole(SIGNAL_ADMIN_ROLE)
        onlyInitialized
        whenNotPaused
    {
        _updateProposalState(proposalId, newState);
    }

    /**
     * @dev Emergency cancel proposal (admin only)
     */
    function emergencyCancel(bytes32 proposalId)
        external
        override
        onlyRole(SIGNAL_ADMIN_ROLE)
        onlyInitialized
        whenNotPaused
    {
        Proposal storage proposal = _proposals[proposalId];
        if (proposal.proposer == address(0)) revert ProposalNotFound(proposalId);

        _updateProposalState(proposalId, ProposalState.Cancelled);
        proposal.cancelled = true;

        emit ProposalCancelled(proposalId, _msgSender(), block.timestamp);
    }

    // Internal helper functions

    /**
     * @dev Update proposal state
     */
    function _updateProposalState(bytes32 proposalId, ProposalState newState) internal {
        Proposal storage proposal = _proposals[proposalId];
        ProposalState oldState = proposal.state;

        if (oldState == newState) return;

        // Remove from old state tracking
        _proposalsByState[oldState].remove(proposalId);

        // Update state
        proposal.state = newState;
        proposal.updatedAt = block.timestamp;

        // Add to new state tracking
        _proposalsByState[newState].add(proposalId);

        emit ProposalStateChanged(proposalId, oldState, newState, block.timestamp);
    }

    /**
     * @dev Check if proposal should be automatically queued
     */
    function _checkAutoQueue(bytes32 proposalId) internal {
        Proposal storage proposal = _proposals[proposalId];

        // Only check if voting period has ended
        if (block.timestamp < proposal.endTime) return;

        // Only auto-queue if proposal is still active
        if (proposal.state != ProposalState.Active) return;

                (bool passed, , , , ) = _getProposalResult(proposalId);

        if (passed) {
            VotingParameters memory params = _getVotingParameters(proposal.organizationId);
            proposal.executionTime = block.timestamp + params.executionDelay;
            _updateProposalState(proposalId, ProposalState.Queued);
            emit ProposalQueued(proposalId, proposal.executionTime, block.timestamp);
        } else {
            _updateProposalState(proposalId, ProposalState.Defeated);
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

    /**
     * @dev Validate membership in organization
     */
    function _validateMembership(bytes8 organizationId, address member) internal view {
        address controlModule = getModule(keccak256("CONTROL"));
        if (controlModule == address(0)) revert OrganizationNotFound(organizationId);

        IControl control = IControl(controlModule);
        if (!control.isMemberActive(organizationId, member)) {
            revert InsufficientVotingPower(member, 1, 0);
        }
    }

    /**
     * @dev Get voting parameters for organization
     */
    function _getVotingParameters(bytes8 organizationId) internal view returns (VotingParameters memory) {
        VotingParameters memory params = _votingParameters[organizationId];

        // Use default parameters if not set
        if (params.votingPeriod == 0) {
            return _defaultParams;
        }

        return params;
    }

    /**
     * @dev Calculate voting power for a voter
     */
    function _calculateVotingPower(
        bytes8 organizationId,
        address voter,
        VotingPower powerType
    ) internal view returns (uint256) {
        if (powerType == VotingPower.Democratic) {
            // One person, one vote (if they're a member)
            address controlModule = getModule(keccak256("CONTROL"));
            if (controlModule == address(0)) return 0;

            IControl control = IControl(controlModule);
            return control.isMemberActive(organizationId, voter) ? 1 : 0;

        } else if (powerType == VotingPower.TokenWeighted) {
            // Based on $GAME token holdings
            address gameTokenModule = getModule(keccak256("GAME_TOKEN"));
            if (gameTokenModule == address(0)) return 0;

            IGameToken gameToken = IGameToken(gameTokenModule);
            return gameToken.getTotalStaked(voter);

        } else if (powerType == VotingPower.Quadratic) {
            // Quadratic voting based on token holdings
            address gameTokenModule = getModule(keccak256("GAME_TOKEN"));
            if (gameTokenModule == address(0)) return 0;

            IGameToken gameToken = IGameToken(gameTokenModule);
            uint256 balance = gameToken.getTotalStaked(voter);
            return balance > 0 ? Math.sqrt(balance) : 0;

        } else {
            // Conviction voting - base power that can be multiplied by conviction time
            address controlModule = getModule(keccak256("CONTROL"));
            if (controlModule == address(0)) return 0;

            IControl control = IControl(controlModule);
            return control.isMemberActive(organizationId, voter) ? 1 : 0;
        }
    }

        /**
     * @dev Calculate proposal threshold for organization
     */
    function _calculateProposalThreshold(bytes8 organizationId, uint256 thresholdBasisPoints) internal view returns (uint256) {
        address controlModule = getModule(keccak256("CONTROL"));
        if (controlModule == address(0)) return 1;

        IControl control = IControl(controlModule);
        uint256 totalMembers = control.getMemberCount(organizationId);

        return (totalMembers * thresholdBasisPoints) / BASIS_POINTS;
    }

    /**
     * @dev Internal function to calculate conviction multiplier
     */
    function _calculateConvictionMultiplier(uint256 convictionTime) internal pure returns (uint256) {
        if (convictionTime == 0) return CONVICTION_MULTIPLIER_BASE;

        // Conviction multiplier increases with time commitment
        // Base formula: 1 + (convictionTime / 1 day)
        uint256 daysCommitted = convictionTime / 1 days;
        return CONVICTION_MULTIPLIER_BASE + (daysCommitted * 1000); // 10% increase per day
    }

    /**
     * @dev Internal function to get proposal result
     */
    function _getProposalResult(bytes32 proposalId)
        internal
        view
        returns (bool passed, uint256 forVotes, uint256 againstVotes, uint256 abstainVotes, uint256 quorum)
    {
        Proposal storage proposal = _proposals[proposalId];

        forVotes = proposal.votesFor;
        againstVotes = proposal.votesAgainst;
        abstainVotes = proposal.votesAbstain;

        uint256 totalVotes = forVotes + againstVotes + abstainVotes;

        // Calculate quorum
        address controlModule = getModule(keccak256("CONTROL"));
        if (controlModule != address(0)) {
            IControl control = IControl(controlModule);
            uint256 totalEligible = control.getMemberCount(proposal.organizationId);
            quorum = totalEligible > 0 ? (totalVotes * BASIS_POINTS) / totalEligible : 0;
        }

        // Check if quorum is reached
        bool quorumReached = quorum >= proposal.requiredQuorum;

        // Determine if proposal passed based on voting type
        if (!quorumReached) {
            passed = false;
        } else if (proposal.votingType == VotingType.Relative) {
            passed = forVotes > againstVotes;
        } else if (proposal.votingType == VotingType.Absolute) {
            address controlModule2 = getModule(keccak256("CONTROL"));
            if (controlModule2 != address(0)) {
                IControl control = IControl(controlModule2);
                uint256 totalEligible = control.getMemberCount(proposal.organizationId);
                passed = forVotes > (totalEligible / 2);
            }
        } else if (proposal.votingType == VotingType.Supermajority) {
            uint256 totalVotesForAgainst = forVotes + againstVotes;
            passed = totalVotesForAgainst > 0 && (forVotes * 3) > (totalVotesForAgainst * 2); // >66.7%
        } else if (proposal.votingType == VotingType.Unanimous) {
            passed = againstVotes == 0 && forVotes > 0;
        }
    }

    // View Functions Implementation
    function getProposal(bytes32 proposalId) external view override returns (Proposal memory) {
        return _proposals[proposalId];
    }

    function getVote(bytes32 proposalId, address voter) external view override returns (Vote memory) {
        return _votes[proposalId][voter];
    }

    function getProposalVotes(bytes32 proposalId)
        external
        view
        override
        returns (address[] memory voters, Vote[] memory votes)
    {
        address[] memory voterList = _proposalVoters[proposalId].values();
        Vote[] memory voteList = new Vote[](voterList.length);

        for (uint256 i = 0; i < voterList.length; i++) {
            voteList[i] = _votes[proposalId][voterList[i]];
        }

        return (voterList, voteList);
    }

    function getProposalsByOrganization(bytes8 organizationId)
        external
        view
        override
        returns (bytes32[] memory)
    {
        return _organizationProposals[organizationId].values();
    }

    function getProposalsByState(ProposalState state)
        external
        view
        override
        returns (bytes32[] memory)
    {
        return _proposalsByState[state].values();
    }

    function getActiveProposals() external view override returns (bytes32[] memory) {
        return _proposalsByState[ProposalState.Active].values();
    }

    function getVotingParameters(bytes8 organizationId)
        external
        view
        override
        returns (VotingParameters memory)
    {
        return _getVotingParameters(organizationId);
    }

    function getVotingPower(bytes32 proposalId, address voter)
        external
        view
        override
        returns (uint256)
    {
        Proposal storage proposal = _proposals[proposalId];
        return _calculateVotingPower(proposal.organizationId, voter, proposal.votingPower);
    }

    function getDelegatedVotingPower(address delegator) external view override returns (uint256) {
        return _delegatedVotingPower[delegator][_msgSender()];
    }

    function getDelegations(address delegator)
        external
        view
        override
        returns (Delegation[] memory)
    {
        address[] memory delegatees = _delegators[delegator].values();
        Delegation[] memory delegations = new Delegation[](delegatees.length);

        for (uint256 i = 0; i < delegatees.length; i++) {
            delegations[i] = Delegation({
                delegator: delegator,
                delegatee: delegatees[i],
                amount: _delegatedVotingPower[delegator][delegatees[i]],
                timestamp: 0, // No timestamp for delegated power
                active: true
            });
        }

        return delegations;
    }

    function hasVoted(bytes32 proposalId, address voter) external view override returns (bool) {
        return _votes[proposalId][voter].voter != address(0);
    }

    function canVote(bytes32 proposalId, address voter) external view override returns (bool) {
        Proposal storage proposal = _proposals[proposalId];

        if (proposal.proposer == address(0)) return false;
        if (proposal.state != ProposalState.Active && proposal.state != ProposalState.Pending) return false;
        if (block.timestamp < proposal.startTime || block.timestamp >= proposal.endTime) return false;
        if (_votes[proposalId][voter].voter != address(0)) return false;

        uint256 votingPower = _calculateVotingPower(proposal.organizationId, voter, proposal.votingPower);
        return votingPower > 0;
    }

    function canExecute(bytes32 proposalId) external view override returns (bool) {
        Proposal storage proposal = _proposals[proposalId];

        if (proposal.proposer == address(0)) return false;
        if (proposal.state != ProposalState.Queued) return false;
        if (block.timestamp < proposal.executionTime) return false;

        return true;
    }

        function getProposalResult(bytes32 proposalId)
        external
        view
        override
        returns (bool passed, uint256 forVotes, uint256 againstVotes, uint256 abstainVotes, uint256 quorum)
    {
        return _getProposalResult(proposalId);
    }

    function calculateVotingPower(
        bytes32 proposalId,
        address voter,
        VotingPower powerType
    ) external view override returns (uint256) {
        Proposal storage proposal = _proposals[proposalId];
        return _calculateVotingPower(proposal.organizationId, voter, powerType);
    }

        function calculateConvictionMultiplier(uint256 convictionTime)
        external
        pure
        override
        returns (uint256)
    {
        return _calculateConvictionMultiplier(convictionTime);
    }

    function getQuorumReached(bytes32 proposalId) external view override returns (bool) {
        (, , , , uint256 quorum) = _getProposalResult(proposalId);
        Proposal storage proposal = _proposals[proposalId];
        return quorum >= proposal.requiredQuorum;
    }

    function getTimeRemaining(bytes32 proposalId) external view override returns (uint256) {
        Proposal storage proposal = _proposals[proposalId];
        if (block.timestamp >= proposal.endTime) return 0;
        return proposal.endTime - block.timestamp;
    }

    function getProposalCount() external view override returns (uint256) {
        return _allProposals.length();
    }

    function isProposalActive(bytes32 proposalId) external view override returns (bool) {
        Proposal storage proposal = _proposals[proposalId];
        return proposal.state == ProposalState.Active &&
               block.timestamp >= proposal.startTime &&
               block.timestamp < proposal.endTime;
    }

    function getExecutionETA(bytes32 proposalId) external view override returns (uint256) {
        Proposal storage proposal = _proposals[proposalId];
        return proposal.executionTime;
    }

    function validateProposalParameters(
        bytes8 organizationId,
        ProposalType /* proposalType */,
        VotingType /* votingType */,
        VotingPower /* votingPower */,
        uint256 votingPeriod
    ) external view override returns (bool) {
        if (votingPeriod < MIN_VOTING_PERIOD || votingPeriod > MAX_VOTING_PERIOD) {
            return false;
        }

        address controlModule = getModule(keccak256("CONTROL"));
        if (controlModule == address(0)) return false;

        IControl control = IControl(controlModule);
        return control.isOrganizationActive(organizationId);
    }

    function estimateGasForExecution(bytes32 proposalId) external view override returns (uint256) {
        Proposal storage proposal = _proposals[proposalId];

        if (proposal.executionData.length == 0 || proposal.targetContract == address(0)) {
            return 21000; // Base transaction gas
        }

        // Estimate gas for the call (simplified estimation)
        return 100000 + (proposal.executionData.length * 68);
    }

    function previewProposalExecution(bytes32 proposalId)
        external
        view
        override
        returns (bool success, bytes memory returnData)
    {
        Proposal storage proposal = _proposals[proposalId];

        if (proposal.executionData.length == 0 || proposal.targetContract == address(0)) {
            return (true, "");
        }

        // Use staticcall to preview execution without state changes
        (success, returnData) = proposal.targetContract.staticcall(proposal.executionData);
    }

        // Admin functions
    function setDefaultVotingParameters(VotingParameters memory params)
        external
        onlyRole(SIGNAL_ADMIN_ROLE)
    {
        _defaultParams = params;
    }

    function getDefaultVotingParameters() external view returns (VotingParameters memory) {
        return _defaultParams;
    }
}
