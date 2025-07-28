import { ethers } from "hardhat"
import { getAddressesForNetwork } from "@gamedao/evm"

async function testMembershipFix() {
  console.log("🧪 Testing Membership Addition Fix...")

  try {
    // Get network and addresses
    const network = await ethers.provider.getNetwork()
    const chainId = Number(network.chainId)
    const addresses = getAddressesForNetwork(chainId)

    console.log("📋 Using addresses:")
    console.log(`   Control: ${addresses.CONTROL}`)
    console.log(`   Factory: ${addresses.FACTORY}`)
    console.log(`   Membership: ${addresses.MEMBERSHIP}`)
    console.log("")

    // Get signers
    const [deployer, user] = await ethers.getSigners()
    console.log(`👤 User: ${user.address}`)

    // Connect to contracts
    const gameToken = await ethers.getContractAt("MockGameToken", addresses.GAME_TOKEN)
    const control = await ethers.getContractAt("Control", addresses.CONTROL)

    // Setup tokens
    console.log("🏗️ Setting up tokens...")
    await gameToken.connect(deployer).mint(deployer.address, ethers.parseEther("100000"))
    await gameToken.connect(deployer).transfer(user.address, ethers.parseEther("15000"))
    await gameToken.connect(user).approve(addresses.STAKING, ethers.parseEther("12000"))

    // Try to create organization
    console.log("🏗️ Creating organization...")
    try {
      const createOrgTx = await control.connect(user).createOrganization(
        "MembershipTest-" + Date.now(),
        "ipfs://membership-test",
        0, // OrgType.Individual
        0, // AccessModel.Open
        0, // FeeModel.NoFees
        100, // memberLimit
        0, // membershipFee
        ethers.parseEther("10000") // gameStakeRequired (minimum)
      )

      const receipt = await createOrgTx.wait()
      console.log(`✅ Organization created in block ${receipt?.blockNumber}`)

      // Extract organization ID
      const factoryAddress = addresses.FACTORY.toLowerCase()
      const orgEvent = receipt?.logs?.find((log: any) =>
        log.address?.toLowerCase() === factoryAddress && log.topics?.length >= 2
      )

      if (orgEvent) {
        const orgIdBytes8 = orgEvent.topics[1]
        console.log(`📋 Organization ID: ${orgIdBytes8}`)

        // Check if membership was created
        console.log("⏳ Waiting 10 seconds for indexing...")
        await new Promise(resolve => setTimeout(resolve, 10000))

        // Query subgraph for members
        const response = await fetch('http://localhost:8000/subgraphs/name/gamedao/protocol', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              query {
                members {
                  id
                  user {
                    address
                  }
                  organization {
                    id
                    name
                  }
                  tier
                  state
                }
              }
            `
          })
        })

        const data = await response.json() as any

        if (data.data && data.data.members && data.data.members.length > 0) {
          console.log(`🎉 SUCCESS! Found ${data.data.members.length} members:`)
          data.data.members.forEach((member: any, index: number) => {
            console.log(`   ${index + 1}. ${member.user.address}`)
            console.log(`      Organization: ${member.organization.name} (${member.organization.id})`)
            console.log(`      Tier: ${member.tier}, State: ${member.state}`)
          })
        } else {
          console.log("❌ No members found in subgraph")
          console.log("Response:", JSON.stringify(data, null, 2))
        }
      } else {
        console.log("❌ Could not find organization creation event")
      }

    } catch (createError: any) {
      console.error("❌ Organization creation failed:", createError.message)
      if (createError.reason) {
        console.error("   Reason:", createError.reason)
      }
    }

  } catch (error: any) {
    console.error("❌ Test failed:", error.message)
  }
}

testMembershipFix().catch(console.error)
