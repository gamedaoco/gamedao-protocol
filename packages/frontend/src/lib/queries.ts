import { gql } from '@apollo/client'

export const GET_ORGANIZATIONS = gql`
  query GetOrganizations($first: Int = 100, $skip: Int = 0) {
    organizations(first: $first, skip: $skip, orderBy: createdAt, orderDirection: desc) {
      id
      name
      creator {
        id
        address
      }
      metadataURI
      treasuryAddress
      treasury {
        id
        address
        totalDeposits
        totalSpent
      }
      orgType
      accessModel
      feeModel
      state
      memberLimit
      membershipFee
      gameStakeRequired
      memberCount
      totalCampaigns
      totalProposals
      createdAt
      updatedAt
      blockNumber
      transaction {
        hash
      }
    }
  }
`

export const GET_ORGANIZATION_BY_ID = gql`
  query GetOrganizationById($id: ID!) {
    organization(id: $id) {
      id
      name
      creator {
        id
        address
      }
      metadataURI
      treasuryAddress
      treasury {
        id
        address
        totalDeposits
        totalSpent
      }
      orgType
      accessModel
      feeModel
      state
      memberLimit
      membershipFee
      gameStakeRequired
      memberCount
      totalCampaigns
      totalProposals
      createdAt
      updatedAt
      blockNumber
      transaction {
        hash
      }
      members {
        id
        user {
          id
          address
        }
        state
        joinedAt
        reputation
        stake
      }
      campaigns {
        id
        title
        state
        target
        raised
        createdAt
      }
      proposals {
        id
        hierarchicalId
        title
        state
        createdAt
      }
    }
  }
`

export const GET_CAMPAIGNS = gql`
  query GetCampaigns($first: Int = 100, $skip: Int = 0) {
    campaigns(first: $first, skip: $skip, orderBy: createdAt, orderDirection: desc) {
      id
      organization {
        id
        name
      }
      creator {
        id
        address
      }
      flowType
      title
      description
      metadataURI
      paymentToken
      target
      min
      max
      raised
      contributorCount
      state
      startTime
      endTime
      createdAt
      updatedAt
    }
  }
`

export const GET_CAMPAIGN_BY_ID = gql`
  query GetCampaignById($id: ID!) {
    campaign(id: $id) {
      id
      organization {
        id
        name
        creator {
          id
          address
        }
      }
      creator {
        id
        address
      }
      flowType
      title
      description
      metadataURI
      paymentToken
      target
      min
      max
      raised
      contributorCount
      state
      startTime
      endTime
      createdAt
      updatedAt
      contributions {
        id
        contributor {
          id
          address
        }
        amount
        timestamp
      }
    }
  }
`

export const GET_PROPOSALS = gql`
  query GetProposals($first: Int = 100, $skip: Int = 0) {
    proposals(first: $first, skip: $skip, orderBy: createdAt, orderDirection: desc) {
      id
      hierarchicalId
      organization {
        id
        name
      }
      creator {
        id
        address
      }
      title
      description
      proposalType
      votingType
      votingPower
      state
      startTime
      endTime
      forVotes
      againstVotes
      abstainVotes
      totalVotes
      quorumReached
      createdAt
      executedAt
    }
  }
`

export const GET_PROPOSAL_BY_ID = gql`
  query GetProposalById($id: ID!) {
    proposal(id: $id) {
      id
      hierarchicalId
      organization {
        id
        name
        creator {
          id
          address
        }
      }
      creator {
        id
        address
      }
      title
      description
      metadataURI
      proposalType
      votingType
      votingPower
      state
      startTime
      endTime
      executionTime
      forVotes
      againstVotes
      abstainVotes
      totalVotes
      quorumReached
      createdAt
      executedAt
      executor
      votes {
        id
        voter {
          id
          address
        }
        support
        votingPower
        timestamp
      }
    }
  }
`

// Staking Queries
export const GET_STAKING_POOLS = gql`
  query GetStakingPools {
    stakingPools(orderBy: totalStaked, orderDirection: desc) {
      id
      purpose
      totalStaked
      rewardRate
      totalRewardsDistributed
      active
      lastUpdateTime
      stakersCount
      averageStakeAmount
      totalRewardsClaimed
    }
  }
`

export const GET_USER_STAKES = gql`
  query GetUserStakes($user: Bytes!) {
    userStakes(where: { user: $user }) {
      id
      user
      pool {
        id
        purpose
        rewardRate
        active
      }
      amount
      stakedAt
      lastClaimTime
      preferredStrategy
      pendingRewards
      totalRewardsClaimed
    }
  }
`

export const GET_STAKING_STATS = gql`
  query GetStakingStats {
    stakingStats(id: "global") {
      id
      totalStaked
      totalRewardsDistributed
      totalRewardsClaimed
      totalSlashed
      activeStakers
      totalStakingPools
      lastUpdated
    }
  }
`

// Profile/Sense Queries
export const GET_PROFILES = gql`
  query GetProfiles($first: Int = 100, $skip: Int = 0) {
    profiles(first: $first, skip: $skip, orderBy: reputation, orderDirection: desc) {
      id
      organization {
        id
        name
      }
      owner {
        id
        address
      }
      username
      bio
      avatar
      website
      verificationLevel
      experience
      reputation
      trustScore
      convictionScore
      achievementCount
      feedbackCount
      positiveFeedbacks
      negativeFeedbacks
      createdAt
      updatedAt
    }
  }
`

export const GET_PROFILE_BY_ID = gql`
  query GetProfileById($id: ID!) {
    profile(id: $id) {
      id
      organization {
        id
        name
      }
      owner {
        id
        address
      }
      username
      bio
      avatar
      website
      verificationLevel
      experience
      reputation
      trustScore
      convictionScore
      achievementCount
      feedbackCount
      positiveFeedbacks
      negativeFeedbacks
      createdAt
      updatedAt
      achievements {
        id
        achievementId
        title
        description
        category
        points
        timestamp
      }
      feedbacksReceived {
        id
        author {
          id
          username
        }
        feedbackType
        rating
        comment
        timestamp
      }
    }
  }
`

// Global Statistics
export const GET_GLOBAL_STATS = gql`
  query GetGlobalStats {
    globalStats(id: "global") {
      id
      totalModules
      activeModules
      totalOrganizations
      activeOrganizations
      totalMembers
      totalCampaigns
      activeCampaigns
      totalRaised
      totalProposals
      activeProposals
      totalVotes
      totalProfiles
      verifiedProfiles
      totalAchievements
      updatedAt
    }
  }
`

// Registry / Modules
export const GET_MODULES = gql`
  query GetModules($first: Int = 50) {
    modules(first: $first) {
      id
      address
      admin
      enabled
      version
      updatedAt
    }
  }
`

// User-specific queries
export const GET_USER_ORGANIZATIONS = gql`
  query GetUserOrganizations($user: Bytes!) {
    members(where: { address: $user }) {
      id
      organization {
        id
        name
        creator
        memberCount
        totalCampaigns
        totalProposals
        state
        createdAt
      }
      state
      role
      joinedAt
    }
  }
`

export const CHECK_MEMBERSHIP = gql`
  query CheckMembership($organizationId: String!, $userAddress: Bytes!) {
    members(where: {
      organization: $organizationId,
      address: $userAddress,
      state: ACTIVE
    }) {
      id
      state
      role
      joinedAt
    }
  }
`

export const GET_USER_CAMPAIGNS = gql`
  query GetUserCampaigns($user: Bytes!, $first: Int = 50) {
    campaigns(
      where: { creator: $user }
      first: $first
      orderBy: createdAt
      orderDirection: desc
    ) {
      id
      organization {
        id
        name
      }
      creator
      flowType
      title
      description
      target
      deposit
      raised
      contributorCount
      state
      expiry
      createdAt
      updatedAt
    }
  }
`

export const GET_USER_CONTRIBUTIONS = gql`
  query GetUserContributions($user: Bytes!, $first: Int = 50) {
    contributions(
      where: { contributor_: { address: $user } }
      first: $first
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      campaign {
        id
        title
        organization {
          id
          name
        }
        state
      }
      amount
      timestamp
      rewardEligible
      rewardReceived
    }
  }
`

export const GET_USER_VOTES = gql`
  query GetUserVotes($user: Bytes!, $first: Int = 50) {
    votes(
      where: { voter_: { address: $user } }
      first: $first
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      proposal {
        id
        title
        organization {
          id
          name
        }
        state
      }
      support
      votingPower
      conviction
      timestamp
    }
  }
`

// Activity feed queries
export const GET_RECENT_ACTIVITIES = gql`
  query GetRecentActivities($first: Int = 20) {
    # Recent organizations
    organizations(first: 5, orderBy: createdAt, orderDirection: desc) {
      id
      name
      creator
      createdAt
      blockNumber
      transactionHash
    }

    # Recent campaigns
    campaigns(first: 5, orderBy: createdAt, orderDirection: desc) {
      id
      title
      organization {
        id
        name
      }
      creator
      target
      createdAt
      blockNumber
      transactionHash
    }

    # Recent proposals
    proposals(first: 5, orderBy: createdAt, orderDirection: desc) {
      id
      title
      organization {
        id
        name
      }
      proposer {
        id
        address
      }
      createdAt
      blockNumber
      transactionHash
    }

    # Recent contributions
    contributions(first: 5, orderBy: timestamp, orderDirection: desc) {
      id
      campaign {
        id
        title
        organization {
          id
          name
        }
      }
      contributor {
        id
        address
      }
      amount
      timestamp
      blockNumber
      transactionHash
    }
  }
`

// Indexing Status Queries
export const GET_INDEXING_STATUS = gql`
  query GetIndexingStatus {
    subgraphIndexingStatus(id: "indexing-status") {
      id
      currentBlock
      latestBlock
      isFullySynced
      totalBlocks
      blocksRemaining
      syncPercentage
      blocksPerSecond
      estimatedTimeToSync
      lastUpdatedAt
      lastUpdatedBlock
      hasErrors
      lastError
      errorCount
    }
  }
`

export const GET_RECENT_BLOCKS = gql`
  query GetRecentBlocks($first: Int = 10) {
    blockInfos(
      first: $first
      orderBy: number
      orderDirection: desc
    ) {
      id
      number
      timestamp
      hash
      processedAt
      transactionCount
      eventCount
      organizationEvents
      campaignEvents
      proposalEvents
      profileEvents
      stakingEvents
    }
  }
`

export const GET_INDEXING_METRICS = gql`
  query GetIndexingMetrics {
    subgraphIndexingStatus(id: "indexing-status") {
      id
      currentBlock
      latestBlock
      isFullySynced
      syncPercentage
      blocksPerSecond
      estimatedTimeToSync
      hasErrors
      lastError
      lastUpdatedAt
    }
    blockInfos(
      first: 5
      orderBy: number
      orderDirection: desc
    ) {
      number
      timestamp
      eventCount
      organizationEvents
      campaignEvents
      proposalEvents
      profileEvents
      stakingEvents
    }
  }
`

// New efficient user-centric queries
export const GET_USER_PROFILE = gql`
  query GetUserProfile($address: String!) {
    user(id: $address) {
      id
      address
      totalOrganizations
      totalContributions
      totalProposals
      totalVotes
      firstSeenAt
      lastActiveAt
      memberships {
        id
        organization {
          id
          name
          state
        }
        role
        state
        joinedAt
      }
    }
  }
`

export const GET_ALL_USER_MEMBERSHIPS = gql`
  query GetAllUserMemberships($address: Bytes!) {
    members(where: { address: $address, state: ACTIVE }) {
      id
      organization {
        id
        name
        creator
        memberCount
        state
        createdAt
      }
      role
      state
      joinedAt
    }
  }
`

export const GET_USER_ACTIVITY = gql`
  query GetUserActivity($address: Bytes!) {
    user(id: $address) {
      id
      address
      memberships(where: { state: ACTIVE }) {
        organization {
          id
          name
        }
        role
        joinedAt
      }
      contributions {
        id
        amount
        campaign {
          id
          title
          organization {
            name
          }
        }
      }
      proposals {
        id
        title
        state
        organization {
          name
        }
      }
      votes {
        id
        choice
        proposal {
          title
          organization {
            name
          }
        }
      }
    }
  }
`

// Enhanced organization queries with user references
export const GET_ORGANIZATION_WITH_USER_DETAILS = gql`
  query GetOrganizationWithUserDetails($id: ID!) {
    organization(id: $id) {
      id
      name
      creator
      prime
      metadataURI
      treasury {
        id
        address
        balance
      }
      orgType
      accessModel
      state
      memberLimit
      membershipFee
      memberCount
      totalCampaigns
      totalProposals
      createdAt
      updatedAt
      blockNumber
      transactionHash
      members {
        id
        user {
          id
          address
          totalOrganizations
          firstSeenAt
        }
        address
        state
        role
        joinedAt
      }
    }
  }
`
