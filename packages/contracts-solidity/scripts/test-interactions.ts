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

      } catch (error: any) {
        // Log errors for debugging
        console.log(`    ❌ Failed to contribute to "${campaign.title}": ${error.message || error}`)
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
  console.log(`💾 Detailed data saved to: ${outputPath}`)

  // Show interaction statistics
  if (result.interactions.contributions.length > 0) {
    const totalContributed = result.interactions.contributions.reduce((sum, c) => sum + parseFloat(c.amount), 0)
    console.log(`\n💰 Contribution Statistics:`)
    console.log(`  Total Contributed: $${totalContributed.toFixed(2)} USDC`)
    console.log(`  Average Contribution: $${(totalContributed / result.interactions.contributions.length).toFixed(2)} USDC`)
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
