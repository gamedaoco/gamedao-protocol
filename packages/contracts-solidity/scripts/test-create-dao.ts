import { ethers } from 'hardhat'
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'

async function main() {
  console.log('🧪 Testing DAO Creation...')

  // Get signers
  const [deployer, user1] = await ethers.getSigners()
  console.log(`📍 Using deployer: ${deployer.address}`)
  console.log(`👤 Using user1: ${user1.address}`)

  // Load deployment addresses
  const addresses = require('../deployment-addresses.json')
  console.log('📋 Loaded addresses:', addresses)

  // Get contract instances
  const Control = await ethers.getContractAt('Control', addresses.control)
  const GameToken = await ethers.getContractAt('MockGameToken', addresses.gameToken)

  console.log('🔗 Contract instances created')

  // Check GAME token balance
  const balance = await GameToken.balanceOf(user1.address)
  console.log(`💰 User1 GAME balance: ${ethers.formatEther(balance)} GAME`)

  // Create a new DAO
  console.log('🏗️  Creating new DAO...')

  try {
    const tx = await Control.connect(user1).createOrganization(
      'Test DAO from Script',  // name
      '',                      // metadataURI (empty for now)
      2,                       // orgType (DAO)
      0,                       // accessModel (Open)
      0,                       // feeModel (NoFees)
      100,                     // memberLimit
      0,                       // membershipFee
      0                        // gameStakeRequired
    )

    console.log(`📝 Transaction submitted: ${tx.hash}`)

    const receipt = await tx.wait()
    console.log(`✅ Transaction confirmed in block: ${receipt?.blockNumber}`)

    // Get the organization count
    const orgCount = await Control.getOrganizationCount()
    console.log(`📊 Total organizations: ${orgCount}`)

    // Get the latest organization ID (should be the one we just created)
    const events = receipt?.logs || []
    console.log(`📋 Events emitted: ${events.length}`)

    for (const event of events) {
      console.log(`🎯 Event: ${event.topics[0]}`)
    }

    console.log('🎉 DAO creation test successful!')

  } catch (error) {
    console.error('❌ DAO creation failed:', error)

    if (error instanceof Error) {
      console.error('Error message:', error.message)
      if ('reason' in error) {
        console.error('Revert reason:', (error as any).reason)
      }
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
