import { ethers } from "hardhat"
import { getAddressesForNetwork } from "@gamedao/evm"

// Mimic the frontend ID extraction logic
function extractOrganizationIdFromLogs(logs: any[], contractAddress: string): string | null {
  try {
    // Find the OrganizationCreated event in the logs
    const organizationCreatedEvent = logs.find((log: any) => {
      const isFromFactoryContract = log.address.toLowerCase() === contractAddress.toLowerCase()
      const hasCorrectTopics = log.topics && log.topics.length === 4
      return isFromFactoryContract && hasCorrectTopics
    })

    if (organizationCreatedEvent) {
      // The second topic contains the organization ID (bytes8 but padded to 32 bytes)
      const orgIdBytes32 = organizationCreatedEvent.topics[1]
      if (orgIdBytes32) {
        // Extract only the first 8 bytes (16 hex chars) from the 32-byte value
        const orgIdBytes8 = orgIdBytes32.slice(0, 18) // 0x + 16 hex chars = 18 total

        // Convert bytes8 to alphanumeric string (simplified version)
        const bytes = ethers.getBytes(orgIdBytes8)
        let result = ''
        for (let i = 0; i < bytes.length; i++) {
          const char = bytes[i]
          if (char >= 48 && char <= 57) { // 0-9
            result += String.fromCharCode(char)
          } else if (char >= 65 && char <= 90) { // A-Z
            result += String.fromCharCode(char)
          } else if (char >= 97 && char <= 122) { // a-z
            result += String.fromCharCode(char.toString().charCodeAt(0) - 32) // Convert to uppercase
          }
        }

        console.log('🔍 Extracted organization ID:', {
          original: orgIdBytes32,
          extracted: orgIdBytes8,
          alphanumeric: result
        })
        return result
      }
    }

    return null
  } catch (error) {
    console.error('Error extracting organization ID from logs:', error)
    return null
  }
}

async function testRedirectFix() {
  console.log("🧪 Testing Organization ID Extraction Fix...")

  try {
    // Get network and addresses
    const network = await ethers.provider.getNetwork()
    const chainId = Number(network.chainId)
    const addresses = getAddressesForNetwork(chainId)

    console.log(`📋 Factory Address: ${addresses.FACTORY}`)
    console.log(`📋 Control Address: ${addresses.CONTROL}`)
    console.log("")

    // Get signers
    const [deployer, user] = await ethers.getSigners()

    // Connect to contracts
    const gameToken = await ethers.getContractAt("MockGameToken", addresses.GAME_TOKEN)
    const control = await ethers.getContractAt("Control", addresses.CONTROL)
    const staking = await ethers.getContractAt("Staking", addresses.STAKING)

    // Send some tokens and approve for staking
    console.log("💰 Setting up tokens...")
    await gameToken.connect(deployer).transfer(user.address, ethers.parseEther("1000"))
    await gameToken.connect(user).approve(addresses.STAKING, ethers.parseEther("100"))

    // Create organization
    console.log("🏗️ Creating organization...")
    const createTx = await control.connect(user).createOrganization(
      "RedirectTest-" + Date.now(),
      "ipfs://test-metadata",
      0, // OrgType.Individual
      0, // AccessModel.Open
      0, // FeeModel.NoFees
      100, // memberLimit
      0, // membershipFee
      ethers.parseEther("50") // gameStakeRequired
    )

    console.log("⏳ Waiting for transaction confirmation...")
    const receipt = await createTx.wait()

    if (!receipt) {
      throw new Error("Transaction receipt is null")
    }

    console.log(`✅ Transaction mined in block ${receipt.blockNumber}`)
    console.log(`📋 Transaction logs: ${receipt.logs.length}`)

    // Test extraction with Factory address (SHOULD WORK)
    console.log("\n🧪 Testing with Factory address...")
    const orgIdFromFactory = extractOrganizationIdFromLogs(receipt.logs, addresses.FACTORY)

    // Test extraction with Control address (SHOULD FAIL)
    console.log("\n🧪 Testing with Control address...")
    const orgIdFromControl = extractOrganizationIdFromLogs(receipt.logs, addresses.CONTROL)

    console.log("\n🎯 Results:")
    console.log(`   Factory extraction: ${orgIdFromFactory ? '✅ SUCCESS' : '❌ FAILED'} - ${orgIdFromFactory || 'null'}`)
    console.log(`   Control extraction: ${orgIdFromControl ? '⚠️ UNEXPECTED' : '✅ CORRECTLY FAILED'} - ${orgIdFromControl || 'null'}`)

    if (orgIdFromFactory && !orgIdFromControl) {
      console.log("\n🎉 Fix verified! Frontend will now detect organization ID and redirect properly.")
    } else {
      console.log("\n❌ Fix not working as expected.")
    }

  } catch (error: any) {
    console.error("❌ Test failed:", error.message)
  }
}

testRedirectFix().catch(console.error)
