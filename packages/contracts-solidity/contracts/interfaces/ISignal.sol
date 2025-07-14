// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.20;

/**
 * @title ISignal
 * @dev Interface for the Signal module - Governance and proposal management
 * @author GameDAO AG
 * @notice GameDAO v3 - Hierarchical ID System Only
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
        Token,          // Voting power based on token holdings
        Reputation      // Voting power based on reputation score
    }

    enum ProposalState {
        Pending,        // Proposal created but voting not started
        Active,         // Voting is active
        Succeeded,      // Proposal passed, ready for execution
        Executed,       // Proposal executed successfully
        Defeated,       // Proposal failed to pass
        Canceled        // Proposal cancelled by proposer/admin
    }

    enum VoteChoice {
        None,           // No vote cast
        Against,        // Vote against the proposal
        For,            // Vote for the proposal
        Abstain         // Abstain from voting
    }

    // Structs
    struct Proposal {
        string hierarchicalId;      // Hierarchical ID (e.g., "GAMEDAO-P-PROP001")
        bytes8 organizationId;      // Organization ID
        address creator;            // Proposal creator
        string title;               // Proposal title
        string description;         // Proposal description
        string metadataURI;         // IPFS URI for additional metadata
        ProposalType proposalType;  // Type of proposal
        VotingType votingType;      // Voting mechanism
        VotingPower votingPower;    // Voting power calculation method
        ProposalState state;        // Current state
        uint256 startTime;          // Voting start time
        uint256 endTime;            // Voting end time
        uint256 executionTime;      // Earliest execution time
        uint256 forVotes;           // Votes in favor
        uint256 againstVotes;       // Votes against
        uint256 abstainVotes;       // Abstain votes
        bytes executionData;        // Data for execution
        address targetContract;     // Target contract for execution
        address executor;           // Address that executed the proposal
        uint256 createdAt;          // Creation timestamp
        uint256 executedAt;         // Execution timestamp
    }

    struct Vote {
        address voter;              // Voter address
        VoteChoice choice;          // Vote choice
        uint256 votingPower;        // Voting power used
        uint256 timestamp;          // Vote timestamp
        string reason;              // Reason for vote
        bool hasVoted;              // Whether vote was cast
        uint256 convictionTime;     // Conviction time (0 if no conviction)
        uint256 convictionMultiplier; // Conviction multiplier applied
    }

    struct VotingParameters {
        uint256 votingDelay;        // Delay before voting starts
        uint256 votingPeriod;       // Duration of voting period
        uint256 executionDelay;     // Delay before execution
        uint256 quorumThreshold;    // Minimum participation (basis points)
        uint256 proposalThreshold;  // Minimum tokens to create proposal (basis points)
        bool requireMembership;     // Whether membership is required
    }

    // Events
    event ProposalCreated(
        string hierarchicalId,
        bytes8 indexed organizationId,
        address indexed creator,
        string title,
        ProposalType proposalType,
        VotingType votingType,
        uint256 votingPeriod,
        uint256 startTime,
        uint256 endTime
    );

    event VoteCast(
        string hierarchicalId,
        address indexed voter,
        VoteChoice choice,
        uint256 votingPower,
        string reason
    );

    event ProposalExecuted(
        string indexed hierarchicalId,
        address indexed executor,
        bool success,
        bytes returnData
    );

    event ProposalCanceled(
        string indexed hierarchicalId,
        address indexed canceler,
        string reason
    );

    event VotingParametersUpdated(
        bytes8 indexed organizationId,
        VotingParameters parameters
    );

    // Functions - Hierarchical ID System Only
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
    ) external returns (string memory hierarchicalId);

    function castVote(
        string memory hierarchicalId,
        VoteChoice choice,
        string memory reason
    ) external;

    function executeProposal(string memory hierarchicalId)
        external
        returns (bool success, bytes memory returnData);

    function cancelProposal(string memory hierarchicalId, string memory reason) external;

    function getProposal(string memory hierarchicalId)
        external
        view
        returns (Proposal memory);

    function getVote(string memory hierarchicalId, address voter)
        external
        view
        returns (Vote memory);

    function getOrganizationProposals(bytes8 organizationId)
        external
        view
        returns (bytes32[] memory);

    function getProposalsByState(ProposalState state)
        external
        view
        returns (bytes32[] memory);

    function setVotingParameters(bytes8 organizationId, VotingParameters memory params) external;

    function getVotingParameters(bytes8 organizationId)
        external
        view
        returns (VotingParameters memory);

    // Delegation functions
    function delegateVotingPower(address delegatee, uint256 amount) external;

    function undelegateVotingPower(address delegatee, uint256 amount) external;

    function getDelegatedVotingPower(address delegator) external view returns (uint256);

    function getDelegations(address delegator) external view returns (Delegation[] memory);

    function getVotingPowerWithDelegation(bytes8 organizationId, address account, VotingPower votingPowerType)
        external view returns (uint256);

    // Conviction voting functions
    function castVoteWithConviction(
        string memory hierarchicalId,
        VoteChoice choice,
        uint256 convictionTime,
        string memory reason
    ) external;

    function calculateConvictionMultiplier(uint256 convictionTime) external pure returns (uint256);

    function applyConvictionDecay(string memory hierarchicalId, address voter) external;

    // Enhanced voting functions
    function canVote(string memory hierarchicalId, address voter) external view returns (bool);

    function canExecute(string memory hierarchicalId) external view returns (bool);

    function calculateVotingPower(string memory hierarchicalId, address voter, VotingPower powerType)
        external view returns (uint256);

    // Structs for delegation
    struct Delegation {
        address delegatee;
        uint256 amount;
        uint256 timestamp;
        bool active;
    }

    // Events for delegation
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

    // Events for conviction voting
    event ConvictionVoteCast(
        string indexed hierarchicalId,
        address indexed voter,
        VoteChoice choice,
        uint256 votingPower,
        uint256 convictionMultiplier,
        uint256 convictionTime,
        string reason
    );

    event ConvictionDecayApplied(
        string indexed hierarchicalId,
        address indexed voter,
        uint256 oldPower,
        uint256 newPower,
        uint256 timestamp
    );

}
