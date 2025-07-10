import { ethers } from "hardhat"
import fs from "fs"
import path from "path"

// Configuration
const CONFIG = {
  users: 12,
  daos: 5,
  campaigns: 8,
  proposals: 6,
  stakingActivities: 8,
  profiles: 10,
}

// User templates
const USERS = [
  { name: 'Alice Chen', role: 'Developer', avatar: '👩‍💻' },
  { name: 'Bob Martinez', role: 'Designer', avatar: '🎮' },
  { name: 'Carol Johnson', role: 'Artist', avatar: '🎨' },
  { name: 'David Kim', role: 'Musician', avatar: '🎵' },
  { name: 'Eva Rodriguez', role: 'Writer', avatar: '✍️' },
  { name: 'Frank Wilson', role: 'Engineer', avatar: '⛓️' },
  { name: 'Grace Liu', role: 'Designer', avatar: '🎯' },
  { name: 'Henry Brown', role: 'Analyst', avatar: '🔍' },
  { name: 'Iris Taylor', role: 'Marketer', avatar: '📈' },
  { name: 'Jack Davis', role: 'Producer', avatar: '📹' },
  { name: 'Kate Miller', role: 'Manager', avatar: '📋' },
  { name: 'Leo Zhang', role: 'DevOps', avatar: '⚙️' },
]

// DAO templates
const DAO_TEMPLATES = [
  { name: 'Indie Game Collective', desc: 'Supporting independent game developers' },
  { name: 'Esports Alliance', desc: 'Competitive gaming organization' },
  { name: 'NFT Gaming Hub', desc: 'Blockchain gaming community' },
  { name: 'VR Game Studios', desc: 'Virtual reality game development' },
  { name: 'Mobile Gaming Guild', desc: 'Mobile game development collective' },
]

// Campaign templates
const CAMPAIGN_TEMPLATES = [
  { title: 'Fantasy RPG: Chronicles of Etheria', target: '25000' },
  { title: 'Cyberpunk Racing League', target: '15000' },
  { title: 'VR Mystic Realms', target: '30000' },
  { title: 'Retro Arcade Revival', target: '8000' },
  { title: 'Mobile Strategy Empire', target: '12000' },
  { title: 'Indie Puzzle Adventure', target: '5000' },
  { title: 'Multiplayer Battle Arena', target: '20000' },
  { title: 'Space Exploration Sim', target: '18000' },
]

// Proposal templates
const PROPOSAL_TEMPLATES = [
  { title: 'Increase Marketing Budget', description: 'Allocate more funds for marketing campaigns' },
  { title: 'Add Developer Role', description: 'Create new developer role with specific permissions' },
  { title: 'Partnership Proposal', description: 'Partner with external gaming studio' },
  { title: 'Community Event Funding', description: 'Fund quarterly community gaming events' },
  { title: 'Treasury Allocation', description: 'Reallocate treasury funds for development' },
  { title: 'Governance Update', description: 'Update governance parameters and voting rules' },
]

async function main() {
  console.log("🏗️  GameDAO Clean Scaffolding Started")

  // Load deployment addresses
  const deploymentPath = path.join(__dirname, '../deployment-addresses.json')
  if (!fs.existsSync(deploymentPath)) {
    throw new Error("Deployment addresses not found. Please run deploy script first.")
  }

  const addresses = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'))
  console.log(`✅ Found registry address: ${addresses.registry}`)

  // Get contracts
  const registry = await ethers.getContractAt("GameDAORegistry", addresses.registry)
  const control = await ethers.getContractAt("Control", addresses.control)
  const flow = await ethers.getContractAt("Flow", addresses.flow)
  const signal = await ethers.getContractAt("Signal", addresses.signal)
  const sense = await ethers.getContractAt("Sense", addresses.sense)
  const gameToken = await ethers.getContractAt("MockGameToken", addresses.gameToken)
  const usdc = await ethers.getContractAt("MockUSDC", addresses.usdc)

  const [deployer, ...accounts] = await ethers.getSigners()
  const userAccounts = accounts.slice(0, CONFIG.users)

  console.log(`📋 Control: ${addresses.control}`)
  console.log(`📋 Flow: ${addresses.flow}`)
  console.log(`📋 Signal: ${addresses.signal}`)
  console.log(`📋 Sense: ${addresses.sense}`)

  const result = {
    contracts: {
      registry: addresses.registry,
      control: addresses.control,
      flow: addresses.flow,
      signal: addresses.signal,
      sense: addresses.sense,
      gameToken: addresses.gameToken,
      usdc: addresses.usdc,
    },
    users: [] as any[],
    daos: [] as any[],
    campaigns: [] as any[],
    proposals: [] as any[],
    profiles: [] as any[],
    staking: [] as any[],
  }

  // Setup users and reset their token balances
  console.log("\n👥 Setting up users...")
  for (let i = 0; i < userAccounts.length; i++) {
    const user = userAccounts[i]
    const profile = USERS[i % USERS.length]

    // Reset user's GAME token balance to 10,000
    const currentBalance = await gameToken.balanceOf(user.address)
    const targetBalance = ethers.parseEther("10000")

    if (currentBalance < targetBalance) {
      const needed = targetBalance - currentBalance
      await gameToken.connect(deployer).transfer(user.address, needed)
    }

    // Give users USDC for testing
    const usdcBalance = await usdc.balanceOf(user.address)
    const targetUsdcBalance = ethers.parseUnits("50000", 6) // 50,000 USDC

    if (usdcBalance < targetUsdcBalance) {
      const usdcNeeded = targetUsdcBalance - usdcBalance
      await usdc.connect(deployer).transfer(user.address, usdcNeeded)
    }

    result.users.push({
      address: user.address,
      name: profile.name,
      role: profile.role,
      avatar: profile.avatar,
    })

    console.log(`  ${profile.avatar} ${profile.name} (${user.address.slice(0, 8)}...)`)
  }

  // Create DAOs
  console.log("\n🏛️  Creating DAOs...")
  for (let i = 0; i < CONFIG.daos; i++) {
    const template = DAO_TEMPLATES[i]
    const creator = userAccounts[i % userAccounts.length]

    try {
      console.log(`  Creating: ${template.name}`)

      // Check balance before staking
      const balance = await gameToken.balanceOf(creator.address)
      const stakeAmount = ethers.parseEther("1000")

      console.log(`    Creator ${creator.address.slice(0, 8)} has ${ethers.formatEther(balance)} GAME tokens`)

      if (balance < stakeAmount) {
        console.log(`    ❌ Insufficient balance: need ${ethers.formatEther(stakeAmount)} GAME`)
        continue
      }

      // Approve and stake GAME tokens for DAO creation
      await gameToken.connect(creator).approve(addresses.control, stakeAmount)

      const tx = await control.connect(creator).createOrganization(
        template.name,
        template.desc,
        0, // orgType
        2, // accessModel: Voting
        0, // feeModel
        20, // memberLimit
        0, // membershipFee
        stakeAmount
      )

      const receipt = await tx.wait()
      if (!receipt) continue

      // Parse event
      const event = receipt.logs.find(log => {
        try {
          const parsed = control.interface.parseLog(log as any)
          return parsed?.name === 'OrganizationCreated'
        } catch {
          return false
        }
      })

      if (!event) continue

      const parsedEvent = control.interface.parseLog(event as any)
      const orgId = parsedEvent?.args[0]
      const treasuryAddress = parsedEvent?.args[3]

      // Add members using new join function
      const memberCount = Math.floor(Math.random() * 4) + 2
      const members = [creator.address]

      const availableUsers = userAccounts.filter(u => u.address !== creator.address)
      const selectedMembers = availableUsers
        .sort(() => 0.5 - Math.random())
        .slice(0, memberCount - 1)

      for (const member of selectedMembers) {
        try {
          await control.connect(member).join(member.address, orgId)
          members.push(member.address)
        } catch {
          // Ignore errors
        }
      }

      result.daos.push({
        id: orgId,
        name: template.name,
        description: template.desc,
        members,
        treasury: treasuryAddress,
        creator: creator.address,
      })

      console.log(`    ✅ Created with ${members.length} members`)

    } catch (error) {
      console.log(`    ❌ Failed to create ${template.name}`)
    }
  }

  // Create user profiles (after DAOs exist)
  console.log("\n👤 Creating user profiles...")

  // Get all unique members from all DAOs
  const allMembers = new Set<string>()
  result.daos.forEach(dao => {
    dao.members.forEach((member: string) => allMembers.add(member))
  })

  let profileCount = 0
  for (const memberAddress of allMembers) {
    if (profileCount >= CONFIG.profiles) break

    const user = userAccounts.find(u => u.address === memberAddress)
    if (!user) continue

    const userIndex = userAccounts.findIndex(u => u.address === memberAddress)
    const profile = USERS[userIndex % USERS.length]

    // Find the user's organization
    const userOrg = result.daos.find(dao => dao.members.includes(user.address))
    if (!userOrg) {
      console.log(`    ⚠️  No organization found for ${profile.name}`)
      continue
    }

    try {
      const metadata = JSON.stringify({
        username: profile.name.toLowerCase().replace(/\s+/g, '_'),
        bio: `${profile.role} with expertise in gaming and blockchain`,
        avatar: profile.avatar,
        interests: "gaming,blockchain,defi,nfts"
      })

      const tx = await sense.connect(user).createProfile(userOrg.id, metadata)
      const receipt = await tx.wait()
      if (!receipt) continue

      // Parse event
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

        result.profiles.push({
          id: profileId,
          owner: user.address,
          username: profile.name,
          organizationId: userOrg.id,
          role: profile.role,
          avatar: profile.avatar,
        })

        console.log(`    ✅ ${profile.avatar} ${profile.name} profile created`)
        profileCount++
      }

    } catch (error) {
      console.log(`    ❌ Failed to create profile for ${profile.name}`)
    }
  }

  // Create campaigns using new simplified function
  console.log("\n💸 Creating campaigns...")
  for (let i = 0; i < CONFIG.campaigns && i < CAMPAIGN_TEMPLATES.length; i++) {
    const template = CAMPAIGN_TEMPLATES[i]

    if (result.daos.length === 0) break

    const dao = result.daos[Math.floor(Math.random() * result.daos.length)]
    const creator = userAccounts.find(u => dao.members.includes(u.address)) || userAccounts[0]

    try {
      console.log(`  Creating: ${template.title}`)

      const targetAmount = ethers.parseUnits(template.target, 6)
      const minAmount = ethers.parseUnits("100", 6)
      const maxAmount = targetAmount * 2n

      // Use new simplified createCampaignWithParams function
      const campaignParams = {
        title: template.title,
        description: `Description for ${template.title}`,
        metadataURI: `ipfs://QmHash${i}`,
        flowType: 1, // Raise
        paymentToken: addresses.usdc,
        target: targetAmount,
        min: minAmount,
        max: maxAmount,
        duration: 60 * 60 * 24 * 30, // 30 days
        autoFinalize: false
      }

      const tx = await flow.connect(creator).createCampaignWithParams(
        creator.address,
        dao.id,
        campaignParams
      )

      const receipt = await tx.wait()
      if (!receipt) continue

      const event = receipt.logs.find(log => {
        try {
          const parsed = flow.interface.parseLog(log as any)
          return parsed?.name === 'CampaignCreated'
        } catch {
          return false
        }
      })

      if (event) {
        const parsedEvent = flow.interface.parseLog(event as any)
        const campaignId = parsedEvent?.args[0]

        result.campaigns.push({
          id: campaignId,
          title: template.title,
          target: template.target,
          daoId: dao.id,
          creator: creator.address,
        })

        console.log(`    ✅ Created campaign`)
      }

    } catch (error) {
      console.log(`    ❌ Failed to create ${template.title}`)
    }
  }

  // Create proposals
  console.log("\n🗳️  Creating proposals...")
  for (let i = 0; i < CONFIG.proposals && i < PROPOSAL_TEMPLATES.length; i++) {
    const template = PROPOSAL_TEMPLATES[i]

    if (result.daos.length === 0) break

    const dao = result.daos[Math.floor(Math.random() * result.daos.length)]
    const creator = userAccounts.find(u => dao.members.includes(u.address)) || userAccounts[0]

    try {
      console.log(`  Creating: ${template.title}`)

      const tx = await signal.connect(creator).createProposal(
        dao.id,
        template.title,
        template.description,
        `ipfs://QmProposal${i}`,
        0, // proposalType: Standard
        0, // votingType: Simple
        0, // votingPower: TokenBased
        60 * 60 * 24 * 7, // 7 days
        "0x", // executionData
        ethers.ZeroAddress // targetContract
      )

      const receipt = await tx.wait()
      if (!receipt) continue

      const event = receipt.logs.find(log => {
        try {
          const parsed = signal.interface.parseLog(log as any)
          return parsed?.name === 'ProposalCreated'
        } catch {
          return false
        }
      })

      if (event) {
        const parsedEvent = signal.interface.parseLog(event as any)
        const proposalId = parsedEvent?.args[0]

        result.proposals.push({
          id: proposalId,
          title: template.title,
          daoId: dao.id,
          creator: creator.address,
        })

        console.log(`    ✅ Created proposal`)
      }

    } catch (error) {
      console.log(`    ❌ Failed to create ${template.title}`)
    }
  }

  // Create staking activity
  console.log("\n🎯 Creating staking activity...")
  for (let i = 0; i < CONFIG.stakingActivities; i++) {
    const user = userAccounts[i % userAccounts.length]
    const profile = USERS[i % USERS.length]

    try {
      const stakeAmount = ethers.parseEther((Math.random() * 2000 + 500).toFixed(0))
      const purpose = Math.floor(Math.random() * 4) // 0-3
      const strategy = Math.floor(Math.random() * 3) // 0-2

      console.log(`  ${profile.avatar} ${profile.name} staking ${ethers.formatEther(stakeAmount)} GAME`)

      await gameToken.connect(user).approve(addresses.gameStaking, stakeAmount)
      await (await ethers.getContractAt("GameStaking", addresses.gameStaking))
        .connect(user).stake(purpose, stakeAmount, strategy)

      result.staking.push({
        user: user.address,
        amount: ethers.formatEther(stakeAmount),
        purpose,
        strategy,
      })

      console.log(`    ✅ Staked in pool ${purpose} with strategy ${strategy}`)

    } catch (error) {
      console.log(`    ❌ Failed to stake for ${profile.name}`)
    }
  }

  // Save results
  const outputPath = path.join(__dirname, '../scaffold-output.json')
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2))

  console.log("\n🎉 Clean Scaffolding Complete!")
  console.log(`📊 Summary:`)
  console.log(`  👥 Users: ${result.users.length}`)
  console.log(`  🏛️  DAOs: ${result.daos.length}`)
  console.log(`  💸 Campaigns: ${result.campaigns.length}`)
  console.log(`  🗳️  Proposals: ${result.proposals.length}`)
  console.log(`  👤 Profiles: ${result.profiles.length}`)
  console.log(`  🎯 Staking Activities: ${result.staking.length}`)
  console.log(`💾 Data saved to: ${outputPath}`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
