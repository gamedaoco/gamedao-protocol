import { ethers } from "hardhat"
import fs from "fs"
import path from "path"

// Enhanced Configuration for extended interactions
const CONFIG = {
  additionalUsers: 15, // Add more users beyond scaffold
  interactions: {
    campaignContributions: 40,
    proposalVotes: 50,
    stakingActivities: 25,
    daoJoins: 20,
    profileCreations: 15
  }
}

// Additional user profiles
const ADDITIONAL_USER_PROFILES = [
  { name: "Zoe Chen", bio: "Blockchain game economist designing token economies", role: "Token Economist", avatar: "💰", interests: ["DeFi", "Tokenomics", "Economics"] },
  { name: "Alex Rivera", bio: "Metaverse architect building virtual worlds", role: "Metaverse Dev", avatar: "🌐", interests: ["Metaverse", "3D", "Virtual Worlds"] },
  { name: "Jamie Foster", bio: "Play-to-earn specialist creating sustainable game economies", role: "P2E Designer", avatar: "🎯", interests: ["P2E", "Sustainability", "Gaming"] },
  { name: "Morgan Lee", bio: "Cross-chain developer bridging gaming ecosystems", role: "Cross-chain Dev", avatar: "🌉", interests: ["Cross-chain", "Interoperability", "Bridges"] },
  { name: "Casey Wong", bio: "Gaming DAO governance expert", role: "Governance Lead", avatar: "🏛️", interests: ["Governance", "DAOs", "Voting"] },
  { name: "River Smith", bio: "NFT marketplace developer for gaming assets", role: "NFT Dev", avatar: "🖼️", interests: ["NFTs", "Marketplace", "Assets"] },
  { name: "Sage Johnson", bio: "GameFi researcher analyzing play-to-earn trends", role: "GameFi Analyst", avatar: "📊", interests: ["GameFi", "Research", "Analytics"] },
  { name: "Phoenix Davis", bio: "Decentralized gaming infrastructure engineer", role: "Infrastructure", avatar: "🏗️", interests: ["Infrastructure", "Decentralization", "Scaling"] },
  { name: "Rowan Taylor", bio: "Gaming community token specialist", role: "Token Specialist", avatar: "🪙", interests: ["Tokens", "Community", "Rewards"] },
  { name: "Skylar Brown", bio: "Web3 gaming UX/UI designer", role: "Web3 Designer", avatar: "🎨", interests: ["Web3", "UX", "Gaming UI"] },
  { name: "Jordan Kim", bio: "Esports betting platform developer", role: "Betting Dev", avatar: "🎲", interests: ["Betting", "Esports", "Probability"] },
  { name: "Avery Martinez", bio: "Gaming guild management specialist", role: "Guild Manager", avatar: "⚔️", interests: ["Guilds", "Management", "Strategy"] },
  { name: "Blake Wilson", bio: "Blockchain gaming security auditor", role: "Security Auditor", avatar: "🔐", interests: ["Security", "Auditing", "Smart Contracts"] },
  { name: "Cameron Garcia", bio: "Gaming analytics and data science expert", role: "Data Scientist", avatar: "📈", interests: ["Analytics", "Data Science", "ML"] },
  { name: "Drew Anderson", bio: "Decentralized autonomous gaming worlds creator", role: "World Builder", avatar: "🗺️", interests: ["World Building", "Autonomy", "Simulation"] }
]

// Generate deterministic key pairs for additional users
function generateUserKeyPair(index: number): { privateKey: string, publicKey: string, address: string } {
  const seed = ethers.keccak256(ethers.toUtf8Bytes(`gamedao-extended-user-${index}`))
  const wallet = new ethers.Wallet(seed)

  return {
    privateKey: wallet.privateKey,
    publicKey: wallet.signingKey.publicKey,
    address: wallet.address
  }
}

// Simulate realistic interaction patterns
function generateInteractionPattern(userIndex: number, totalUsers: number) {
  const baseActivity = 0.3 // 30% base activity rate
  const userPosition = userIndex / totalUsers

  // Early users are more active
  const positionMultiplier = Math.max(0.2, 1 - userPosition * 0.6)

  // Add some randomness
  const randomFactor = 0.5 + Math.random() * 0.5

  return baseActivity * positionMultiplier * randomFactor
}

async function main() {
  console.log("🧪 GameDAO Extended Interaction Testing Started")

  const [deployer, ...accounts] = await ethers.getSigners()

  // Load existing scaffold data
  let scaffoldData: any = null
  try {
    const scaffoldFile = path.join(__dirname, '..', 'scaffold-output.json')
    scaffoldData = JSON.parse(fs.readFileSync(scaffoldFile, 'utf8'))
    console.log(`📥 Loaded scaffold data: ${scaffoldData.users.length} users, ${scaffoldData.daos.length} DAOs`)
  } catch (error) {
    console.log("❌ Could not load scaffold data. Please run scaffold first.")
    process.exit(1)
  }

  // Load deployment data
  let deploymentData: any = null
  try {
    const deploymentFile = path.join(__dirname, '..', 'deployment-addresses.json')
    deploymentData = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'))
  } catch (error) {
    console.log("❌ Could not load deployment addresses.")
    process.exit(1)
  }

  // Get contracts
  const registry = await ethers.getContractAt("GameDAORegistry", scaffoldData.contracts.registry)

  const CONTROL_MODULE_ID = ethers.keccak256(ethers.toUtf8Bytes("CONTROL"))
  const FLOW_MODULE_ID = ethers.keccak256(ethers.toUtf8Bytes("FLOW"))
  const SIGNAL_MODULE_ID = ethers.keccak256(ethers.toUtf8Bytes("SIGNAL"))
  const SENSE_MODULE_ID = ethers.keccak256(ethers.toUtf8Bytes("SENSE"))

  const controlAddress = await registry.getModule(CONTROL_MODULE_ID)
  const flowAddress = await registry.getModule(FLOW_MODULE_ID)
  const signalAddress = await registry.getModule(SIGNAL_MODULE_ID)
  const senseAddress = await registry.getModule(SENSE_MODULE_ID)

  const control = await ethers.getContractAt("Control", controlAddress)
  const flow = await ethers.getContractAt("Flow", flowAddress)
  const signal = await ethers.getContractAt("Signal", signalAddress)
  const sense = await ethers.getContractAt("Sense", senseAddress)

  const gameToken = await ethers.getContractAt("MockGameToken", deploymentData.gameToken)
  const usdc = await ethers.getContractAt("MockUSDC", deploymentData.usdc)
  const gameStaking = await ethers.getContractAt("GameStaking", deploymentData.gameStaking)

  const result = {
    originalData: scaffoldData,
    additionalUsers: [] as any[],
    interactions: {
      contributions: [] as any[],
      votes: [] as any[],
      stakes: [] as any[],
      joins: [] as any[],
      profiles: [] as any[]
    },
    summary: {
      totalUsers: 0,
      totalInteractions: 0,
      activeUsers: 0
    }
  }

  // Phase 1: Generate additional users with key pairs
  console.log("\n👥 Phase 1: Generating additional users...")
  const additionalAccounts = accounts.slice(scaffoldData.users.length, scaffoldData.users.length + CONFIG.additionalUsers)

  for (let i = 0; i < CONFIG.additionalUsers; i++) {
    const keyPair = generateUserKeyPair(i)
    const profile = ADDITIONAL_USER_PROFILES[i % ADDITIONAL_USER_PROFILES.length]
    const account = additionalAccounts[i] || null

    const user = {
      index: scaffoldData.users.length + i,
      name: profile.name,
      bio: profile.bio,
      role: profile.role,
      avatar: profile.avatar,
      interests: profile.interests,
      keyPair,
      account: account?.address || null,
      reputation: Math.floor(Math.random() * 3000) + 500,
      activityLevel: generateInteractionPattern(i, CONFIG.additionalUsers),
      joinedDAOs: [] as string[],
      contributedCampaigns: [] as string[],
      votedProposals: [] as string[]
    }

    result.additionalUsers.push(user)
    console.log(`  ${profile.avatar} ${profile.name} - Activity: ${(user.activityLevel * 100).toFixed(0)}%`)
  }

  // Combine all available accounts
  const allAccounts = [...accounts.slice(0, scaffoldData.users.length), ...additionalAccounts]

  // Phase 2: Simulate campaign contributions
  console.log("\n💰 Phase 2: Simulating campaign contributions...")

  for (let i = 0; i < CONFIG.interactions.campaignContributions; i++) {
    if (scaffoldData.campaigns.length === 0) break

    const campaign = scaffoldData.campaigns[Math.floor(Math.random() * scaffoldData.campaigns.length)]
    const contributorAccount = allAccounts[Math.floor(Math.random() * allAccounts.length)]

    if (contributorAccount) {
      try {
        // Vary contribution amounts based on campaign target
        const targetAmount = parseInt(campaign.target)
        const baseAmount = Math.max(50, targetAmount * 0.01) // 1% of target or minimum $50
        const maxAmount = Math.min(1000, targetAmount * 0.1) // 10% of target or maximum $1000
        const amount = ethers.parseUnits((Math.random() * (maxAmount - baseAmount) + baseAmount).toFixed(0), 6)

        console.log(`  💸 ${ethers.formatUnits(amount, 6)} USDC to "${campaign.title}"`)

        await (usdc as any).connect(contributorAccount).approve(flowAddress, amount)
        await flow.connect(contributorAccount).contribute(campaign.id, amount, `Extended test contribution ${i}`)

        result.interactions.contributions.push({
          campaignId: campaign.id,
          campaignTitle: campaign.title,
          contributor: contributorAccount.address,
          amount: ethers.formatUnits(amount, 6),
          timestamp: Date.now()
        })

      } catch (error) {
        // Ignore errors (might be campaign state issues)
      }
    }
  }

  // Phase 3: Simulate proposal voting
  console.log("\n🗳️  Phase 3: Simulating proposal voting...")

  for (let i = 0; i < CONFIG.interactions.proposalVotes; i++) {
    if (scaffoldData.proposals.length === 0) break

    const proposal = scaffoldData.proposals[Math.floor(Math.random() * scaffoldData.proposals.length)]
    const dao = scaffoldData.daos.find((d: any) => d.id === proposal.daoId)

    if (dao && dao.members.length > 0) {
      // Sometimes use DAO members, sometimes use additional users (if they join)
      const useDAOMember = Math.random() > 0.3
      let voterAccount = null

      if (useDAOMember) {
        const memberAddress = dao.members[Math.floor(Math.random() * dao.members.length)]
        voterAccount = allAccounts.find((a: any) => a.address === memberAddress)
      } else {
        voterAccount = allAccounts[Math.floor(Math.random() * allAccounts.length)]
      }

      if (voterAccount) {
        try {
          // Realistic voting patterns: 65% yes, 35% no
          const vote = Math.random() > 0.35 ? 1 : 0
          const comments = [
            "Strong support for this proposal",
            "I have concerns about the implementation",
            "This aligns with our DAO's mission",
            "Need more details before deciding",
            "Excellent initiative, fully support",
            "Budget allocation seems reasonable",
            "Timeline might be too aggressive"
          ]
          const comment = comments[Math.floor(Math.random() * comments.length)]

          console.log(`  🗳️  ${vote ? 'YES' : 'NO'} vote on "${proposal.title}"`)

          await signal.connect(voterAccount).castVote(proposal.id, vote, comment)

          result.interactions.votes.push({
            proposalId: proposal.id,
            proposalTitle: proposal.title,
            voter: voterAccount.address,
            vote,
            comment,
            timestamp: Date.now()
          })

        } catch (error) {
          // Ignore errors (might have already voted or proposal ended)
        }
      }
    }
  }

  // Phase 4: Simulate staking activities
  console.log("\n🎯 Phase 4: Simulating staking activities...")

  const StakingPurpose = { GOVERNANCE: 0, DAO_CREATION: 1, TREASURY_BOND: 2, LIQUIDITY_MINING: 3 }
  const UnstakingStrategy = { RAGE_QUIT: 0, STANDARD: 1, PATIENT: 2 }
  const purposes = Object.values(StakingPurpose)
  const strategies = Object.values(UnstakingStrategy)

  for (let i = 0; i < CONFIG.interactions.stakingActivities; i++) {
    const stakerAccount = allAccounts[i % allAccounts.length]
    const purpose = purposes[Math.floor(Math.random() * purposes.length)]
    const strategy = strategies[Math.floor(Math.random() * strategies.length)]

    if (stakerAccount) {
      try {
        // Vary stake amounts: small stakes (100-500), medium (500-1500), large (1500-5000)
        const stakeCategory = Math.random()
        let stakeAmount: bigint

        if (stakeCategory < 0.5) {
          stakeAmount = ethers.parseEther((Math.random() * 400 + 100).toFixed(0)) // Small
        } else if (stakeCategory < 0.8) {
          stakeAmount = ethers.parseEther((Math.random() * 1000 + 500).toFixed(0)) // Medium
        } else {
          stakeAmount = ethers.parseEther((Math.random() * 3500 + 1500).toFixed(0)) // Large
        }

        console.log(`  🎯 ${ethers.formatEther(stakeAmount)} GAME staked (Purpose: ${purpose}, Strategy: ${strategy})`)

        await (gameToken as any).connect(stakerAccount).approve(gameStaking.address, stakeAmount)
        await gameStaking.connect(stakerAccount).stake(purpose, stakeAmount, strategy)

        result.interactions.stakes.push({
          staker: stakerAccount.address,
          purpose,
          strategy,
          amount: ethers.formatEther(stakeAmount),
          timestamp: Date.now()
        })

      } catch (error) {
        // Ignore errors
      }
    }
  }

  // Phase 5: Create user profiles for additional users
  console.log("\n👤 Phase 5: Creating profiles for active users...")

  for (let i = 0; i < Math.min(CONFIG.interactions.profileCreations, result.additionalUsers.length); i++) {
    const user = result.additionalUsers[i]
    const userAccount = additionalAccounts[i]

    if (userAccount && scaffoldData.daos.length > 0) {
      try {
        // Use the first DAO or a random one
        const dao = scaffoldData.daos[Math.floor(Math.random() * scaffoldData.daos.length)]
        const username = user.name.toLowerCase().replace(/\s+/g, '_') + '_' + i

        console.log(`  👤 Creating profile: ${user.name}`)

        const tx = await sense.connect(userAccount).createProfile(
          dao.id,
          username,
          user.bio,
          user.avatar,
          user.interests.join(',')
        )

        const receipt = await tx.wait()
        if (receipt) {
          const event = receipt.logs.find(log => {
            try {
              const parsed = sense.interface.parseLog(log as any)
              return parsed?.name === 'ProfileCreated'
            } catch {
              return false
            }
          })

          if (event) {
            const parsedEvent = sense.interface.parseLog(event as any)
            const profileId = parsedEvent?.args[0]

            result.interactions.profiles.push({
              id: profileId,
              userId: user.index,
              username,
              name: user.name,
              bio: user.bio,
              avatar: user.avatar,
              interests: user.interests,
              daoId: dao.id,
              owner: userAccount.address
            })

            console.log(`    ✅ Profile created`)
          }
        }

      } catch (error) {
        console.log(`    ❌ Failed to create profile for ${user.name}`)
      }
    }
  }

  // Calculate summary statistics
  result.summary.totalUsers = scaffoldData.users.length + result.additionalUsers.length
  result.summary.totalInteractions =
    result.interactions.contributions.length +
    result.interactions.votes.length +
    result.interactions.stakes.length +
    result.interactions.profiles.length

  result.summary.activeUsers = new Set([
    ...result.interactions.contributions.map(c => c.contributor),
    ...result.interactions.votes.map(v => v.voter),
    ...result.interactions.stakes.map(s => s.staker)
  ]).size

  // Save comprehensive results
  const outputPath = path.join(__dirname, '../extended-interactions-output.json')
  const output = {
    ...result,
    contracts: scaffoldData.contracts,
    config: CONFIG,
    timestamp: new Date().toISOString(),
  }

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2))

  console.log("\n🎉 Extended Interaction Testing Complete!")
  console.log(`📊 Final Summary:`)
  console.log(`  👥 Total Users: ${result.summary.totalUsers} (${scaffoldData.users.length} original + ${result.additionalUsers.length} additional)`)
  console.log(`  🎭 Total Interactions: ${result.summary.totalInteractions}`)
  console.log(`  🔥 Active Users: ${result.summary.activeUsers}`)
  console.log(`  💰 Campaign Contributions: ${result.interactions.contributions.length}`)
  console.log(`  🗳️  Proposal Votes: ${result.interactions.votes.length}`)
  console.log(`  🎯 Staking Activities: ${result.interactions.stakes.length}`)
  console.log(`  👤 New Profiles: ${result.interactions.profiles.length}`)
  console.log(`💾 Detailed data saved to: ${outputPath}`)

  // Show interaction statistics
  if (result.interactions.contributions.length > 0) {
    const totalContributed = result.interactions.contributions.reduce((sum, c) => sum + parseFloat(c.amount), 0)
    console.log(`\n💰 Contribution Statistics:`)
    console.log(`  Total Contributed: $${totalContributed.toFixed(2)} USDC`)
    console.log(`  Average Contribution: $${(totalContributed / result.interactions.contributions.length).toFixed(2)} USDC`)
  }

  if (result.interactions.votes.length > 0) {
    const yesVotes = result.interactions.votes.filter(v => v.vote === 1).length
    const noVotes = result.interactions.votes.filter(v => v.vote === 0).length
    console.log(`\n🗳️  Voting Statistics:`)
    console.log(`  Yes Votes: ${yesVotes} (${(yesVotes / result.interactions.votes.length * 100).toFixed(1)}%)`)
    console.log(`  No Votes: ${noVotes} (${(noVotes / result.interactions.votes.length * 100).toFixed(1)}%)`)
  }

  if (result.interactions.stakes.length > 0) {
    const totalStaked = result.interactions.stakes.reduce((sum, s) => sum + parseFloat(s.amount), 0)
    console.log(`\n🎯 Staking Statistics:`)
    console.log(`  Total Staked: ${totalStaked.toFixed(2)} GAME tokens`)
    console.log(`  Average Stake: ${(totalStaked / result.interactions.stakes.length).toFixed(2)} GAME tokens`)
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
