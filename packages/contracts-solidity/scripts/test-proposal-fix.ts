import { ethers } from "hardhat"
import { getAddressesForNetwork } from "@gamedao/evm"

async function testProposalFix() {
  console.log("🧪 Testing Proposal Creation Fix...")

  try {
    // Get network and addresses
    const network = await ethers.provider.getNetwork()
    const chainId = Number(network.chainId)
    const addresses = getAddressesForNetwork(chainId)

    console.log("📋 Using addresses:")
    console.log(`   Signal: ${addresses.SIGNAL}`)
    console.log(`   Control: ${addresses.CONTROL}`)
    console.log(`   GAME Token: ${addresses.GAME_TOKEN}`)
    console.log("")

    // Get signers
    const [deployer, user] = await ethers.getSigners()
    console.log(`👤 User: ${user.address}`)

    // Connect to contracts
    const gameToken = await ethers.getContractAt("MockGameToken", addresses.GAME_TOKEN)
    const control = await ethers.getContractAt("Control", addresses.CONTROL)
    const signal = await ethers.getContractAt("Signal", addresses.SIGNAL)
    const staking = await ethers.getContractAt("Staking", addresses.STAKING)

    // First, create an organization and join it
    console.log("🏗️ Creating test organization...")

    // Mint tokens to deployer first, then transfer to user
    await gameToken.connect(deployer).mint(deployer.address, ethers.parseEther("100000"))
    await gameToken.connect(deployer).transfer(user.address, ethers.parseEther("15000"))
    await gameToken.connect(user).approve(addresses.STAKING, ethers.parseEther("12000")) // 10,000 stake + buffer

        const createOrgTx = await control.connect(user).createOrganization(
      "ProposalTest-" + Date.now(),
      "ipfs://test-metadata",
      0, // OrgType.Individual
      0, // AccessModel.Open
      0, // FeeModel.NoFees
      100, // memberLimit
      0, // membershipFee
      ethers.parseEther("10000") // gameStakeRequired (minimum 10,000 GAME)
    )

    const orgReceipt = await createOrgTx.wait()
    console.log(`✅ Organization created in block ${orgReceipt?.blockNumber}`)

    // Extract org ID from Factory logs
    const factoryAddress = addresses.FACTORY.toLowerCase()
    const orgEvent = orgReceipt?.logs?.find((log: any) =>
      log.address?.toLowerCase() === factoryAddress && log.topics?.length >= 2
    )

    if (!orgEvent) {
      console.error("❌ Could not find organization creation event")
      return
    }

    const orgIdBytes8 = orgEvent.topics[1]
    console.log(`📋 Organization ID: ${orgIdBytes8}`)

    // Now test proposal creation
    console.log("🗳️ Testing proposal creation...")

    const createProposalTx = await signal.connect(user).createProposal(
      orgIdBytes8, // orgId
      "Fixed Proposal Test",
      "This proposal should work after the fix",
      "", // metadataURI
      0, // proposalType (Simple)
      0, // votingType (Simple)
      1, // votingPower (TokenWeighted)
      86400, // votingPeriod (1 day)
      "0x", // executionData
      ethers.ZeroAddress // targetContract
    )

    console.log("⏳ Waiting for proposal creation...")
    const proposalReceipt = await createProposalTx.wait()
    console.log(`✅ Proposal created in block ${proposalReceipt?.blockNumber}`)
    console.log(`📋 Transaction logs: ${proposalReceipt?.logs?.length || 0}`)

    if (proposalReceipt?.logs && proposalReceipt.logs.length > 0) {
      console.log("🎉 SUCCESS! Proposal creation now works!")

      // Check for ProposalCreated event
      const proposalEvent = proposalReceipt.logs.find((log: any) => {
        return log.address.toLowerCase() === addresses.SIGNAL.toLowerCase()
      })

      if (proposalEvent) {
        console.log("✅ ProposalCreated event found!")
      }
    } else {
      console.log("❌ Still no events - something is wrong")
    }

    // Wait for subgraph indexing
    console.log("⏳ Waiting 15 seconds for subgraph indexing...")
    await new Promise(resolve => setTimeout(resolve, 15000))

    // Query proposals
    console.log("📊 Querying subgraph for proposals...")
    const response = await fetch('http://localhost:8000/subgraphs/name/gamedao/protocol', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          query {
            proposals(orderBy: createdAt, orderDirection: desc) {
              id
              title
              state
              organization {
                name
              }
              creator {
                address
              }
            }
          }
        `
      })
    })

    const data = await response.json() as any

    if (data.data && data.data.proposals && data.data.proposals.length > 0) {
      console.log(`🎉 COMPLETE SUCCESS! Found ${data.data.proposals.length} proposals in subgraph:`)
      data.data.proposals.forEach((proposal: any, index: number) => {
        console.log(`   ${index + 1}. "${proposal.title}" (${proposal.state})`)
        console.log(`       Creator: ${proposal.creator.address}`)
        console.log(`       Organization: ${proposal.organization.name}`)
      })
    } else {
      console.log("⚠️ No proposals found in subgraph yet - may need more time to index")
    }

  } catch (error: any) {
    console.error("❌ Test failed:", error.message)
    if (error.reason) {
      console.error("   Reason:", error.reason)
    }
  }
}

testProposalFix().catch(console.error)
