import { ethers } from "hardhat"
import fs from "fs"
import path from "path"
import { getDeployment } from "./lib/deployment"

// Local Kubo HTTP API — provided by docker-compose's `ipfs` service.
// Override via env when running scaffold against a non-default IPFS.
const IPFS_API = process.env.IPFS_API || "http://localhost:5001/api/v0"

// Upload arbitrary JSON to local IPFS. Returns the CID. Hard error on failure
// — scaffold must not produce fake CIDs that break the live app (see
// docs/feedback_quality_bar). Cache by stringified payload so re-running
// scaffold doesn't re-upload identical metadata.
const ipfsCache = new Map<string, string>()
async function uploadToIPFS(payload: unknown): Promise<string> {
  const json = JSON.stringify(payload)
  const cached = ipfsCache.get(json)
  if (cached) return cached

  const body = new FormData()
  body.append(
    "file",
    new Blob([json], { type: "application/json" }),
    "metadata.json",
  )
  const res = await fetch(`${IPFS_API}/add?pin=true`, { method: "POST", body })
  if (!res.ok) {
    throw new Error(
      `IPFS upload failed (${res.status}): ${await res.text()}\n` +
        `Is the local Kubo running? \`docker compose up -d ipfs\``,
    )
  }
  const { Hash } = (await res.json()) as { Hash: string }
  ipfsCache.set(json, Hash)
  return Hash
}

// ID conversion utilities (matching frontend utils)
function bytes8ToAlphanumericString(bytes8Hex: string): string {
  // Remove 0x prefix if present
  let hex = bytes8Hex.startsWith('0x') ? bytes8Hex.slice(2) : bytes8Hex

  // Ensure it's exactly 16 characters (8 bytes)
  if (hex.length !== 16) {
    console.warn('Invalid bytes8 hex length:', hex.length, 'for', bytes8Hex)
    return bytes8Hex // Return as-is if invalid
  }

  // Convert each pair of hex characters to ASCII character
  let result = ''
  for (let i = 0; i < 16; i += 2) {
    const byte = parseInt(hex.slice(i, i + 2), 16)
    result += String.fromCharCode(byte)
  }

  return result
}

function alphanumericStringToBytes8(alphanumericId: string): string {
  if (alphanumericId.length !== 8) {
    console.warn('Invalid alphanumeric ID length:', alphanumericId.length, 'for', alphanumericId)
    return alphanumericId // Return as-is if invalid
  }

  // Convert each character to hex
  let hex = ''
  for (let i = 0; i < 8; i++) {
    const charCode = alphanumericId.charCodeAt(i)
    hex += charCode.toString(16).padStart(2, '0')
  }

  return '0x' + hex
}

// Configuration
const CONFIG = {
  users: 12,
  daos: 5,
  campaigns: 8,
  proposals: 6,
}

// Mock data
const USERS = [
  { name: "Alice Chen", role: "Game Developer", avatar: "👩‍💻" },
  { name: "Bob Martinez", role: "Esports Organizer", avatar: "🎮" },
  { name: "Carol Johnson", role: "3D Artist", avatar: "🎨" },
  { name: "David Kim", role: "Audio Designer", avatar: "🎵" },
  { name: "Eva Rodriguez", role: "Narrative Designer", avatar: "✍️" },
  { name: "Frank Wilson", role: "Blockchain Dev", avatar: "⛓️" },
  { name: "Grace Liu", role: "UI/UX Designer", avatar: "🎯" },
  { name: "Henry Brown", role: "QA Tester", avatar: "🔍" },
  { name: "Iris Taylor", role: "Marketing", avatar: "📈" },
  { name: "Jack Davis", role: "Streamer", avatar: "📹" },
  { name: "Kate Miller", role: "Producer", avatar: "📋" },
  { name: "Leo Zhang", role: "Engine Dev", avatar: "⚙️" },
]

const DAO_TEMPLATES = [
  { name: "Indie Game Collective", desc: "Independent game developers collaborating on projects" },
  { name: "Esports Alliance", desc: "Professional esports organization" },
  { name: "NFT Gaming Hub", desc: "Blockchain gaming with NFT integration" },
  { name: "VR Game Studios", desc: "Virtual reality game development" },
  { name: "Mobile Gaming Guild", desc: "Mobile game developers and publishers" },
]

const CAMPAIGN_TEMPLATES = [
  { title: "Fantasy RPG: Chronicles of Etheria", target: "25000" },
  { title: "Cyberpunk Racing League", target: "40000" },
  { title: "VR Mystic Realms", target: "60000" },
  { title: "Retro Arcade Revival", target: "15000" },
  { title: "Mobile Strategy Empire", target: "30000" },
  { title: "Indie Puzzle Adventure", target: "20000" },
  { title: "Multiplayer Battle Arena", target: "50000" },
  { title: "Space Exploration Sim", target: "35000" },
]

async function main() {
  console.log("🏗️  GameDAO Scaffolding Started")

  const [deployer, ...accounts] = await ethers.getSigners()

  // Resolve contracts via the per-network manifest in @gamedao/evm.
  // REGISTRY_ADDRESS env var still wins for ad-hoc overrides.
  let registryAddress = process.env.REGISTRY_ADDRESS
  let deploymentData: Awaited<ReturnType<typeof getDeployment>> | null = null

  if (!registryAddress) {
    console.log("🔍 REGISTRY_ADDRESS not set, reading deployment manifest...")
    try {
      deploymentData = await getDeployment()
      registryAddress = deploymentData.contracts.Registry?.address
      if (!registryAddress) throw new Error("Registry not in manifest")
      console.log(`✅ Found registry address from manifest: ${registryAddress}`)
    } catch (error: any) {
      console.log(`❌ Could not load deployment manifest: ${error.message}`)
      console.log("💡 Run a deploy first: make deploy-local (or make docker-deploy-all)")
      process.exit(1)
    }
  } else {
    deploymentData = await getDeployment()
  }

  console.log(`📋 Using Registry: ${registryAddress}`)

    // Get contracts
  const registry = await ethers.getContractAt("Registry", registryAddress)

  // Module IDs need to be hashed
  const CONTROL_MODULE_ID = ethers.keccak256(ethers.toUtf8Bytes("CONTROL"))
  const FLOW_MODULE_ID = ethers.keccak256(ethers.toUtf8Bytes("FLOW"))
  const SIGNAL_MODULE_ID = ethers.keccak256(ethers.toUtf8Bytes("SIGNAL"))
  const SENSE_MODULE_ID = ethers.keccak256(ethers.toUtf8Bytes("SENSE"))
  const IDENTITY_MODULE_ID = ethers.keccak256(ethers.toUtf8Bytes("IDENTITY"))
  const MEMBERSHIP_MODULE_ID = ethers.keccak256(ethers.toUtf8Bytes("MEMBERSHIP"))

  const controlAddress = await registry.getModule(CONTROL_MODULE_ID)
  const flowAddress = await registry.getModule(FLOW_MODULE_ID)
  const signalAddress = await registry.getModule(SIGNAL_MODULE_ID)
  const senseAddress = await registry.getModule(SENSE_MODULE_ID)
  const identityAddress = await registry.getModule(IDENTITY_MODULE_ID)
  const membershipAddress = await registry.getModule(MEMBERSHIP_MODULE_ID)

  const control = await ethers.getContractAt("Control", controlAddress)
  const flow = await ethers.getContractAt("Flow", flowAddress)
  // Use the manifest's Signal address directly rather than going through Registry.
  const signalAddressFromDeployment = deploymentData!.contracts.Signal?.address
  const signal = await ethers.getContractAt("Signal", signalAddressFromDeployment)
  const sense = await ethers.getContractAt("Sense", senseAddress)
  const identity = await ethers.getContractAt("Identity", identityAddress)
  const membership = await ethers.getContractAt("Membership", membershipAddress)

  // Get token + staking addresses from the manifest.
  const gameTokenAddress = deploymentData!.contracts.GameToken?.address
  const usdcAddress = deploymentData!.contracts.MockUSDC?.address
  const stakingAddress = deploymentData!.contracts.Staking?.address
  const gameToken = await ethers.getContractAt("MockGameToken", gameTokenAddress)
  const usdc = await ethers.getContractAt("MockUSDC", usdcAddress)
  const staking = await ethers.getContractAt("Staking", stakingAddress)

  console.log(`📋 Control: ${controlAddress}`)
  console.log(`📋 Flow: ${flowAddress}`)
  console.log(`📋 Signal: ${signalAddress}`)
  console.log(`📋 Sense: ${senseAddress}`)

  // Signal contract configured from deployment file

  const result = {
    users: [] as any[],
    daos: [] as any[],
    campaigns: [] as any[],
    proposals: [] as any[],
    profiles: [] as any[],
  }

  // Setup users
  console.log("\n👥 Setting up users...")
  const userAccounts = accounts.slice(0, CONFIG.users)

  // Distribute tokens to users
  console.log("\n💰 Distributing tokens to users...")
  const tokenAmountPerUser = ethers.parseEther("100000") // 100,000 GAME tokens per user

  // First, ensure deployer has enough tokens by minting if needed
  const totalNeeded = tokenAmountPerUser * BigInt(userAccounts.length)
  const deployerBalance = await gameToken.balanceOf(deployer.address)

  if (deployerBalance < totalNeeded) {
    const amountToMint = totalNeeded - deployerBalance
    console.log(`🪙 Minting ${ethers.formatEther(amountToMint)} GAME tokens to deployer...`)
    await (gameToken as any).connect(deployer).mint(deployer.address, amountToMint)
  }

  for (let i = 0; i < userAccounts.length; i++) {
    const user = userAccounts[i]
    const profile = USERS[i % USERS.length]

    // Transfer tokens from deployer to user
    await (gameToken as any).connect(deployer).transfer(user.address, tokenAmountPerUser)

    result.users.push({
      address: user.address,
      name: profile.name,
      role: profile.role,
      avatar: profile.avatar,
    })

    console.log(`  ${profile.avatar} ${profile.name} (${user.address.slice(0, 8)}...) - ${ethers.formatEther(tokenAmountPerUser)} GAME`)
  }

  // Also distribute USDC tokens for campaign contributions
  console.log("\n💰 Distributing USDC tokens to users...")
  const usdcAmountPerUser = ethers.parseUnits("5000", 6) // 5,000 USDC per user

  // First, ensure deployer has enough USDC tokens by minting if needed
  const totalUsdcNeeded = usdcAmountPerUser * BigInt(userAccounts.length)
  const deployerUsdcBalance = await usdc.balanceOf(deployer.address)

  if (deployerUsdcBalance < totalUsdcNeeded) {
    const usdcToMint = totalUsdcNeeded - deployerUsdcBalance
    console.log(`🪙 Minting ${ethers.formatUnits(usdcToMint, 6)} USDC tokens to deployer...`)
    await (usdc as any).connect(deployer).mint(deployer.address, usdcToMint)
  }

  for (let i = 0; i < userAccounts.length; i++) {
    const user = userAccounts[i]
    const profile = USERS[i % USERS.length]

    // Transfer USDC tokens from deployer to user
    await (usdc as any).connect(deployer).transfer(user.address, usdcAmountPerUser)

    console.log(`  ${profile.avatar} ${profile.name} (${user.address.slice(0, 8)}...) - ${ethers.formatUnits(usdcAmountPerUser, 6)} USDC`)
  }


  // Create DAOs
  console.log("\n🏛️  Creating DAOs...")

  // First, check if Factory is properly configured
  let factory: any
  try {
    // Try to get the factory address from the Control contract
    const factoryAddress = await control.factory()
    console.log(`📋 Factory address: ${factoryAddress}`)

    if (factoryAddress === ethers.ZeroAddress) {
      console.log("❌ Factory not configured in Control contract")
      console.log("💡 Skipping DAO creation - Factory setup required")
      return
    }
    factory = await ethers.getContractAt("Factory", factoryAddress)
  } catch (error) {
    console.log("❌ Error checking Factory configuration:", error)
    console.log("💡 Skipping DAO creation - Factory setup required")
    return
  }

  for (let i = 0; i < CONFIG.daos; i++) {
    const template = DAO_TEMPLATES[i]
    const creator = userAccounts[i % userAccounts.length]

        try {
      console.log(`  Creating: ${template.name}`)

            // Approve and stake GAME tokens for DAO creation
      const stakeAmount = ethers.parseEther("10000") // 10,000 GAME tokens

      // Check balance before approval
      const balance = await gameToken.balanceOf(creator.address)
      console.log(`    Creator balance: ${ethers.formatEther(balance)} GAME`)

      if (balance < stakeAmount) {
        console.log(`    ❌ Insufficient balance for ${template.name}`)
        continue
      }

      // Check current allowance and approve if needed
      const currentAllowance = await gameToken.allowance(creator.address, stakingAddress)
      if (currentAllowance < stakeAmount) {
        console.log(`    Approving staking contract...`)
        await (gameToken as any).connect(creator).approve(stakingAddress, stakeAmount)
      } else {
        console.log(`    Already approved (allowance: ${ethers.formatEther(currentAllowance)} GAME)`)
      }

                  console.log(`    Creating organization...`)

      // AccessModel: Open (0) for the first three orgs so any wallet can
      // self-join via Membership.joinOrganization for testing. Remaining
      // orgs use Invite (2) to exercise the manager-only flow.
      const accessModel = i < 3 ? 0 : 2
      const orgMetaCid = await uploadToIPFS({
        type: "gamedao.org",
        version: 1,
        name: template.name,
        description: template.desc,
        tags: ["scaffold"],
        createdAt: new Date().toISOString(),
      })
      const tx = await control.connect(creator).createOrganization(
        template.name,
        `ipfs://${orgMetaCid}`,
        0, // orgType
        accessModel,
        0, // feeModel
        20, // memberLimit
        0, // membershipFee
        stakeAmount  // gameStakeRequired: 10,000 GAME tokens
      )

      const receipt = await tx.wait()
      if (!receipt) continue

      // Parse OrganizationCreated event (emitted by Factory, not Control)
      const event = receipt.logs.find(log => {
        try {
          const parsed = factory.interface.parseLog(log as any)
          return parsed?.name === 'OrganizationCreated'
        } catch {
          return false
        }
      })

      if (!event) {
        console.log(`    ❌ OrganizationCreated event not found in receipt`)
        continue
      }

      // OrganizationCreated(id, name, metadataURI, creator, treasury, timestamp)
      const parsedEvent = factory.interface.parseLog(event as any)
      const orgId = parsedEvent?.args[0]
      const treasuryAddress = parsedEvent?.args[4]

      // Add members
      const memberCount = Math.floor(Math.random() * 4) + 2
      const members = [creator.address]

      // First, grant ORGANIZATION_MANAGER_ROLE to the creator
      const ORG_MANAGER_ROLE = await membership.ORGANIZATION_MANAGER_ROLE()
      try {
        await membership.grantRole(ORG_MANAGER_ROLE, creator.address)
        console.log(`    ✅ Granted ORGANIZATION_MANAGER_ROLE to creator`)
      } catch (error) {
        console.log(`    ❌ Failed to grant role:`, error)
      }

      // Activate the organization
      try {
        await membership.connect(creator).activateOrganization(orgId)
        console.log(`    ✅ Activated organization`)
      } catch (error) {
        console.log(`    ❌ Failed to activate organization:`, error)
      }

      // Then add creator as a member
      try {
        await membership.connect(creator).addMember(orgId, creator.address, 3) // PLATINUM tier
        console.log(`    ✅ Added creator as member`)
      } catch (error) {
        console.log(`    ❌ Failed to add creator as member:`, error)
      }

      const availableUsers = userAccounts.filter(u => u.address !== creator.address)
      const selectedMembers = availableUsers
        .sort(() => 0.5 - Math.random())
        .slice(0, memberCount - 1)

      for (const member of selectedMembers) {
        try {
          await membership.connect(creator).addMember(orgId, member.address, 0) // BRONZE tier
          members.push(member.address)
          console.log(`    ✅ Added member: ${member.address.slice(0, 8)}...`)
        } catch (error) {
          console.log(`    ❌ Failed to add member: ${member.address.slice(0, 8)}...`)
        }
      }

      // Add PROTOCOL_SUDO to the first two organizations so the dev wallet
      // has memberships immediately on a fresh scaffold.
      const SUDO = (process.env.PROTOCOL_SUDO || "0xf0FE780c76ce610FC8DF330971b99Ba6f4429001").toLowerCase()
      if (i < 2 && !members.map(m => m.toLowerCase()).includes(SUDO)) {
        try {
          await membership.connect(creator).addMember(orgId, SUDO, 1) // SILVER tier
          members.push(SUDO)
          console.log(`    ✅ Added PROTOCOL_SUDO ${SUDO.slice(0, 10)}... to ${template.name}`)
        } catch (error: any) {
          console.log(`    ❌ Failed to add PROTOCOL_SUDO: ${error.message?.slice(0, 80)}`)
        }
      }

      // Fund treasury
      if (treasuryAddress && treasuryAddress !== ethers.ZeroAddress) {
        try {
          await creator.sendTransaction({
            to: treasuryAddress,
            value: ethers.parseEther("3")
          })
        } catch {
          // Ignore errors
        }
      }

      result.daos.push({
        id: orgId,
        idAlphanumeric: bytes8ToAlphanumericString(orgId),
        name: template.name,
        description: template.desc,
        members,
        treasury: treasuryAddress,
        creator: creator.address,
      })

      console.log(`    ✅ Created with ${members.length} members`)

    } catch (error: any) {
      console.log(`    ❌ Failed to create ${template.name}`)
      console.log(`    Error: ${error.message}`)
      if (error.reason) {
        console.log(`    Reason: ${error.reason}`)
      }
    }
  }

  // Create user profiles (after DAOs are created)
  console.log("\n👤 Creating user profiles...")

  for (let i = 0; i < userAccounts.length; i++) {
    const user = userAccounts[i]
    const profile = USERS[i % USERS.length]

    // Find the user's organization (if they're a member of any)
    const userOrg = result.daos.find(dao => dao.members.includes(user.address))
    const orgId = userOrg ? userOrg.id : (result.daos[0]?.id || "0x0000000000000000")

    try {
      const profileCid = await uploadToIPFS({
        type: "gamedao.profile",
        version: 1,
        displayName: profile.name,
        role: profile.role,
        avatar: profile.avatar,
        createdAt: new Date().toISOString(),
      })
      const tx = await identity.connect(user).createProfile(
        orgId,
        `ipfs://${profileCid}`,
      )

      const receipt = await tx.wait()
      if (!receipt) continue

      // Parse event
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = identity.interface.parseLog(log as any)
          return parsed?.name === 'ProfileCreated'
        } catch {
          return false
        }
      })

      if (!event) continue

      const parsedEvent = identity.interface.parseLog(event as any)
      const profileId = parsedEvent?.args[0]

      // Add some reputation points
      const experiencePoints = Math.floor(Math.random() * 500) + 100 // 100-600 XP
      const reputationPoints = Math.floor(Math.random() * 200) + 50  // 50-250 REP

      try {
        await sense.updateReputation(profileId, 0, experiencePoints, "Initial scaffolding experience")
        await sense.updateReputation(profileId, 1, reputationPoints, "Initial scaffolding reputation")
      } catch {
        // Ignore reputation errors for now
      }

      result.profiles.push({
        id: profileId,
        organizationId: orgId,
        address: user.address,
        name: profile.name,
        metadata: `ipfs://${profileCid}`,
        experiencePoints,
        reputationPoints,
      })

      console.log(`    ✅ Created profile for ${profile.name}`)
    } catch (error) {
      console.log(`    ❌ Failed to create profile for ${profile.name}`)
    }
  }

  // Create campaigns
  console.log("\n💸 Creating campaigns...")

  for (let i = 0; i < CONFIG.campaigns && i < CAMPAIGN_TEMPLATES.length; i++) {
    const template = CAMPAIGN_TEMPLATES[i]

    if (result.daos.length === 0) break

    const dao = result.daos[Math.floor(Math.random() * result.daos.length)]
    const creator = userAccounts.find(u => dao.members.includes(u.address)) || userAccounts[0]

    try {
      console.log(`  Creating: ${template.title}`)

      const targetAmount = ethers.parseUnits(template.target, 6) // USDC has 6 decimals
      const minAmount = ethers.parseUnits("100", 6) // 100 USDC minimum
      const maxAmount = targetAmount * 2n // Set max to double the target

      const campaignCid = await uploadToIPFS({
        type: "gamedao.campaign",
        version: 1,
        title: template.title,
        description: `Description for ${template.title}`,
        target: template.target,
        durationDays: 30,
        createdAt: new Date().toISOString(),
      })
      const tx = await flow.connect(creator).createCampaign(
        dao.id,
        template.title,
        `Description for ${template.title}`,
        `ipfs://${campaignCid}`,
        1, // flowType: Raise
        usdcAddress, // USDC token
        targetAmount,
        minAmount,
        maxAmount,
        60 * 60 * 24 * 30, // 30 days
        false // autoFinalize
      )

      const receipt = await tx.wait()
      if (!receipt) continue

      const event = receipt.logs.find((log: any) => {
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

        // Activate the campaign (campaigns start in Created state)
        try {
          await flow.setCampaignState(campaignId, 1) // Set to Active state
        } catch {
          // Ignore if we don't have admin rights
        }

        // Add contributions from DAO members and some external users
        const contributorPool = [...dao.members, ...userAccounts.slice(0, 3).map(u => u.address)]
        const uniqueContributors = [...new Set(contributorPool)].slice(0, 4)

        for (const contributorAddress of uniqueContributors) {
          try {
            const contributor = userAccounts.find(u => u.address === contributorAddress)
            if (contributor) {
              const amount = ethers.parseUnits((Math.random() * 500 + 100).toFixed(0), 6) // 100-600 USDC

              // Approve USDC spending first
              await (usdc as any).connect(contributor).approve(flowAddress, amount)

              // Make USDC contribution (no ETH value needed)
              await flow.connect(contributor).contribute(campaignId, amount, "")
            }
          } catch {
            // Ignore errors
          }
        }

        result.campaigns.push({
          id: campaignId,
          title: template.title,
          daoId: dao.id,
          daoIdAlphanumeric: bytes8ToAlphanumericString(dao.id),
          daoName: dao.name,
          target: template.target,
          creator: creator.address,
        })

        console.log(`    ✅ Created campaign`)
      }

    } catch (error: any) {
      console.log(`    ❌ Failed to create campaign`)
    }
  }

  // Create proposals
  console.log("\n🗳️  Creating proposals...")

  // First, grant PROPOSAL_CREATOR_ROLE to users so they can create proposals
  const PROPOSAL_CREATOR_ROLE = await signal.PROPOSAL_CREATOR_ROLE()
  console.log(`  Granting PROPOSAL_CREATOR_ROLE to users...`)

  for (let i = 0; i < userAccounts.length; i++) {
    const user = userAccounts[i]
    try {
      await signal.grantRole(PROPOSAL_CREATOR_ROLE, user.address)
      console.log(`    ✅ Granted role to ${user.address.slice(0, 8)}...`)
    } catch (error) {
      console.log(`    ❌ Failed to grant role to ${user.address.slice(0, 8)}...`)
    }
  }

  const proposalTitles = [
    "Increase Marketing Budget",
    "Add Developer Role",
    "Partnership Proposal",
    "Community Event Funding",
    "Treasury Allocation",
    "Governance Update",
  ]

  for (let i = 0; i < CONFIG.proposals; i++) {
    if (result.daos.length === 0) break

    const dao = result.daos[Math.floor(Math.random() * result.daos.length)]
    const proposer = userAccounts.find(u => dao.members.includes(u.address)) || userAccounts[0]
    const title = proposalTitles[i % proposalTitles.length]

    try {
      console.log(`  Creating: ${title}`)

                  console.log(`  Creating: ${title}`)

      const proposalCid = await uploadToIPFS({
        type: "gamedao.proposal",
        version: 1,
        title,
        description: `Description for ${title}`,
        createdAt: new Date().toISOString(),
      })
      const tx = await signal.connect(proposer).createProposal(
        dao.id,
        title,
        `Description for ${title}`,
        `ipfs://${proposalCid}`,
        0, // Simple proposal
        0, // Relative voting (0, not 1)
        0, // Democratic power
        60 * 60 * 24 * 7, // 7 days
        "0x",
        ethers.ZeroAddress
      )

      const receipt = await tx.wait()
      if (!receipt) continue

      // Don't try to parse the event due to UTF-8 encoding issues in hierarchicalId
      // Just record the successful proposal creation
      const fakeProposalId = `${bytes8ToAlphanumericString(dao.id)}-P-${String(i).padStart(3, '0')}`

      result.proposals.push({
        id: fakeProposalId,
        title,
        daoId: dao.id,
        daoIdAlphanumeric: bytes8ToAlphanumericString(dao.id),
        daoName: dao.name,
        proposer: proposer.address,
      })

      console.log(`    ✅ Created proposal: ${title}`)

    } catch (error: any) {
      console.log(`    ❌ Failed to create proposal: ${error.message}`)
      if (error.reason) {
        console.log(`    Reason: ${error.reason}`)
      }
    }
  }

  // Create staking activity
  console.log("\n🎯 Creating staking activity...")

  // Staking purposes enum
  const StakingPurpose = {
    GOVERNANCE: 0,
    DAO_CREATION: 1,
    TREASURY_BOND: 2,
    LIQUIDITY_MINING: 3
  }

  // Unstaking strategies enum
  const UnstakingStrategy = {
    RAGE_QUIT: 0,
    STANDARD: 1,
    PATIENT: 2
  }

  let stakingCount = 0

  // Have some users stake in different pools
  for (let i = 0; i < Math.min(6, userAccounts.length); i++) {
    const user = userAccounts[i]
    const purposes = [StakingPurpose.GOVERNANCE, StakingPurpose.TREASURY_BOND, StakingPurpose.LIQUIDITY_MINING]
    const purpose = purposes[i % purposes.length]
    const strategies = [UnstakingStrategy.STANDARD, UnstakingStrategy.PATIENT]
    const strategy = strategies[i % strategies.length]

    try {
      // Stake amount that leaves enough for organization creation
      const stakeAmount = ethers.parseEther("2000") // 2,000 GAME tokens

      console.log(`  ${USERS[i].avatar} ${USERS[i].name} staking ${ethers.formatEther(stakeAmount)} GAME`)

      // Approve and stake
      await (gameToken as any).connect(user).approve(stakingAddress, stakeAmount)
      await (staking as any).connect(user).stake(purpose, stakeAmount, strategy)

      stakingCount++
      console.log(`    ✅ Staked in pool ${purpose} with strategy ${strategy}`)
    } catch (error) {
      console.log(`    ❌ Failed to stake for ${USERS[i].name}`)
    }
  }

  // Save results
  const outputPath = path.join(__dirname, '../scaffold-output.json')
  const output = {
    ...result,
    contracts: {
      registry: registryAddress,
      control: controlAddress,
      flow: flowAddress,
      signal: signalAddress,
    },
    timestamp: new Date().toISOString(),
  }

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2))

  console.log("\n🎉 Scaffolding Complete!")
  console.log(`📊 Summary:`)
  console.log(`  👥 Users: ${result.users.length}`)
  console.log(`  🏛️  DAOs: ${result.daos.length}`)
  console.log(`  💸 Campaigns: ${result.campaigns.length}`)
  console.log(`  🗳️  Proposals: ${result.proposals.length}`)
  console.log(`  🎯 Staking Activities: ${stakingCount}`)
  console.log(`💾 Data saved to: ${outputPath}`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
