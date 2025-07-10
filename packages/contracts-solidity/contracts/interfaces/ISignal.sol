// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.20;

/**
 * @title ISignal
 * @dev Interface for the Signal module - Governance and proposal management
 * @author GameDAO AG
 */
interface ISignal {
    // Enums
    enum ProposalType {
        Simple,         // Simple proposal (yes/no voting)
        Parametric,     // Parameter change proposal
        Treasury,       // Treasury spending proposal
        Member,         // Member management proposal
        Constitutional  // Constitution/rules change proposal
    }

    enum VotingType {
        Relative,       // Relative majority (>50% of votes cast)
        Absolute,       // Absolute majority (>50% of total eligible voters)
        Supermajority,  // Supermajority (>66.7% of votes cast)
        Unanimous       // Unanimous (100% of votes cast)
    }

    enum VotingPower {
        Democratic,     // One person, one vote
        TokenWeighted,  // Voting power based on token holdings
        Quadratic,      // Quadratic voting (sqrt of tokens)
        Conviction      // Conviction voting with time-locking
    }

    enum ProposalState {
        Pending,        // Proposal created but voting not started
        Active,         // Voting is active
        Queued,         // Proposal passed, queued for execution
        Executed,       // Proposal executed successfully
        Defeated,       // Proposal failed to pass
        Cancelled,      // Proposal cancelled by proposer/admin
        Expired         // Proposal expired without execution
    }

    enum VoteChoice {
        Against,        // Vote against the proposal
        For,            // Vote for the proposal
        Abstain         // Abstain from voting
    }

    // Structs
    struct Proposal {
        uint256 index;
        bytes32 proposalId;
        bytes32 organizationId;
        address proposer;
        string title;
        string description;
        string metadataURI;
        ProposalType proposalType;
        VotingType votingType;
        VotingPower votingPower;
        ProposalState state;
        uint256 startTime;
        uint256 endTime;
        uint256 executionTime;
        uint256 createdAt;
        uint256 updatedAt;
        bytes executionData;        // Encoded function call data
        address targetContract;     // Contract to execute on
        uint256 requiredQuorum;     // Minimum participation required
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 votesAbstain;
        uint256 totalVotingPower;
        bool executed;
        bool cancelled;
    }

    struct Vote {
        address voter;
        VoteChoice choice;
        uint256 votingPower;
        uint256 timestamp;
        string reason;              // Optional reason for vote
        uint256 convictionTime;     // For conviction voting
    }

    struct VotingParameters {
        uint256 votingDelay;        // Delay before voting starts
        uint256 votingPeriod;       // Duration of voting period
        uint256 executionDelay;     // Delay before execution after passing
        uint256 quorumThreshold;    // Minimum quorum required (basis points)
        uint256 proposalThreshold;  // Minimum tokens needed to propose
        bool requireMembership;     // Whether proposer must be organization member
    }

    struct Delegation {
        address delegator;
        address delegatee;
        uint256 amount;             // Amount of voting power delegated
        uint256 timestamp;
        bool active;
    }

    // Events
    event ProposalCreated(
        bytes32 indexed proposalId,
        bytes32 indexed organizationId,
        address indexed proposer,
        string title,
        ProposalType proposalType,
        VotingType votingType,
        VotingPower votingPower,
        uint256 startTime,
        uint256 endTime,
        uint256 timestamp
    );

    event ProposalUpdated(
        bytes32 indexed proposalId,
        string title,
        string description,
        uint256 endTime,
        uint256 timestamp
    );

    event ProposalStateChanged(
        bytes32 indexed proposalId,
        ProposalState oldState,
        ProposalState newState,
        uint256 timestamp
    );

    event VoteCast(
        bytes32 indexed proposalId,
        address indexed voter,
        VoteChoice choice,
        uint256 votingPower,
        string reason,
        uint256 timestamp
    );

    event ProposalQueued(
        bytes32 indexed proposalId,
        uint256 executionTime,
        uint256 timestamp
    );

    event ProposalExecuted(
        bytes32 indexed proposalId,
        bool success,
        bytes returnData,
        uint256 timestamp
    );

    event ProposalCancelled(
        bytes32 indexed proposalId,
        address indexed canceller,
        uint256 timestamp
    );

    event VotingParametersUpdated(
        bytes32 indexed organizationId,
        uint256 votingDelay,
        uint256 votingPeriod,
        uint256 executionDelay,
        uint256 quorumThreshold,
        uint256 proposalThreshold,
        uint256 timestamp
    );

    event VotingPowerDelegated(
        address indexed delegator,
        address indexed delegatee,
        uint256 amount,
        uint256 timestamp
    );

    event VotingPowerUndelegated(
        address indexed delegator,
        address indexed delegatee,
        uint256 amount,
        uint256 timestamp
    );

    event ConvictionDecayApplied(
        bytes32 indexed proposalId,
        address indexed voter,
        uint256 oldPower,
        uint256 newPower,
        uint256 timestamp
    );

    // Core Functions
    function createProposal(
        bytes32 organizationId,
        string memory title,
        string memory description,
        string memory metadataURI,
        ProposalType proposalType,
        VotingType votingType,
        VotingPower votingPower,
        uint256 votingPeriod,
        bytes memory executionData,
        address targetContract
    ) external returns (bytes32 proposalId);

    function updateProposal(
        bytes32 proposalId,
        string memory title,
        string memory description,
        uint256 endTime
    ) external;

    function cancelProposal(bytes32 proposalId) external;

    function castVote(
        bytes32 proposalId,
        VoteChoice choice,
        string memory reason
    ) external;

    function castVoteWithConviction(
        bytes32 proposalId,
        VoteChoice choice,
        uint256 convictionTime,
        string memory reason
    ) external;

    function queueProposal(bytes32 proposalId) external;

    function executeProposal(bytes32 proposalId) external;

    function delegateVotingPower(address delegatee, uint256 amount) external;

    function undelegateVotingPower(address delegatee, uint256 amount) external;

    function applyConvictionDecay(bytes32 proposalId, address voter) external;

    // Administrative Functions
    function setVotingParameters(
        bytes32 organizationId,
        VotingParameters memory params
    ) external;

    function setProposalState(bytes32 proposalId, ProposalState newState) external;

    function emergencyCancel(bytes32 proposalId) external;

    // View Functions
    function getProposal(bytes32 proposalId)
        external
        view
        returns (Proposal memory);

    function getVote(bytes32 proposalId, address voter)
        external
        view
        returns (Vote memory);

    function getProposalVotes(bytes32 proposalId)
        external
        view
        returns (address[] memory voters, Vote[] memory votes);

    function getProposalsByOrganization(bytes32 organizationId)
        external
        view
        returns (bytes32[] memory);

    function getProposalsByState(ProposalState state)
        external
        view
        returns (bytes32[] memory);

    function getActiveProposals()
        external
        view
        returns (bytes32[] memory);

    function getVotingParameters(bytes32 organizationId)
        external
        view
        returns (VotingParameters memory);

    function getVotingPower(bytes32 proposalId, address voter)
        external
        view
        returns (uint256);

    function getDelegatedVotingPower(address delegator)
        external
        view
        returns (uint256);

    function getDelegations(address delegator)
        external
        view
        returns (Delegation[] memory);

    function hasVoted(bytes32 proposalId, address voter)
        external
        view
        returns (bool);

    function canVote(bytes32 proposalId, address voter)
        external
        view
        returns (bool);

    function canExecute(bytes32 proposalId)
        external
        view
        returns (bool);

    function getProposalResult(bytes32 proposalId)
        external
        view
        returns (bool passed, uint256 forVotes, uint256 againstVotes, uint256 abstainVotes, uint256 quorum);

    function calculateVotingPower(
        bytes32 proposalId,
        address voter,
        VotingPower powerType
    ) external view returns (uint256);

    function calculateConvictionMultiplier(uint256 convictionTime)
        external
        pure
        returns (uint256);

    function getQuorumReached(bytes32 proposalId)
        external
        view
        returns (bool);

    function getTimeRemaining(bytes32 proposalId)
        external
        view
        returns (uint256);

    function getProposalCount()
        external
        view
        returns (uint256);

    function isProposalActive(bytes32 proposalId)
        external
        view
        returns (bool);

    function getExecutionETA(bytes32 proposalId)
        external
        view
        returns (uint256);

    // Utility Functions
    function validateProposalParameters(
        bytes32 organizationId,
        ProposalType proposalType,
        VotingType votingType,
        VotingPower votingPower,
        uint256 votingPeriod
    ) external view returns (bool);

    function estimateGasForExecution(bytes32 proposalId)
        external
        view
        returns (uint256);

    function previewProposalExecution(bytes32 proposalId)
        external
        view
        returns (bool success, bytes memory returnData);
}
