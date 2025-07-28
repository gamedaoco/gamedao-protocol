import { ethers } from 'hardhat'

async function main() {
  const [deployer] = await ethers.getSigners()
  
  console.log('🧪 Testing organization creation...')
  console.log('👤 Creator:', deployer.address)
  
  // Check deployer balance
  const gameToken = await ethers.getContractAt('GameToken', '0x8e264821AFa98DD104eEcfcfa7FD9f8D8B320adA')
  const balance = await gameToken.balanceOf(deployer.address)
  console.log('💰 GAME balance:', ethers.formatEther(balance))
  
  // Check Control contract
  const control = await ethers.getContractAt('Control', '0x0fe4223AD99dF788A6Dcad148eB4086E6389cEB6')
  console.log('🏛️ Control contract loaded')
  
  try {
    console.log('📋 Attempting to create organization...')
    const tx = await control.createOrganization(
      "Test Org Debug",
      "ipfs://test-metadata", 
      0, // Individual
      0, // Open access
      0, // No fees
      100, // Member limit
      ethers.parseEther("0"), // No membership fee
      ethers.parseEther("5000") // Game stake required
    )
    
    console.log('✅ Transaction submitted:', tx.hash)
    const receipt = await tx.wait()
    console.log('✅ Transaction confirmed in block:', receipt.blockNumber)
    
  } catch (error) {
    console.error('❌ Organization creation failed:', error.message)
    
    // More specific error details
    if (error.data) {
      console.error('📋 Error data:', error.data)
    }
    if (error.reason) {
      console.error('📋 Error reason:', error.reason)
    }
  }
}

main().catch(console.error)
