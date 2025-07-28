import { ethers } from 'hardhat'

async function main() {
  const [deployer] = await ethers.getSigners()
  
  console.log('🔧 Simple fix: Mint tokens and try higher stake...')
  
  // 1. Mint tokens to deployer
  const gameToken = await ethers.getContractAt('GameToken', '0x8e264821AFa98DD104eEcfcfa7FD9f8D8B320adA')
  console.log('🪙 Minting 100,000 GAME tokens...')
  await gameToken.mint(deployer.address, ethers.parseEther("100000"))
  
  const balance = await gameToken.balanceOf(deployer.address)
  console.log('✅ New balance:', ethers.formatEther(balance), 'GAME')
  
  // 2. Try with much higher stake (10,000 GAME)
  const control = await ethers.getContractAt('Control', '0x0fe4223AD99dF788A6Dcad148eB4086E6389cEB6')
  
  console.log('📋 Attempting organization creation with 10,000 GAME stake...')
  
  try {
    const tx = await control.createOrganization(
      "Fixed Test Org",
      "ipfs://test-metadata", 
      0, // Individual
      0, // Open access
      0, // No fees
      100, // Member limit
      ethers.parseEther("0"), // No membership fee
      ethers.parseEther("10000") // 10,000 GAME stake
    )
    
    console.log('✅ Transaction submitted:', tx.hash)
    const receipt = await tx.wait()
    console.log('✅ Organization created successfully! Block:', receipt.blockNumber)
    
  } catch (error) {
    console.error('❌ Still failing:', error.message)
    console.error('📋 Error reason:', error.reason || 'Unknown')
    
    // Try with even higher amount
    console.log('🔄 Trying with 50,000 GAME stake...')
    try {
      const tx2 = await control.createOrganization(
        "Fixed Test Org 2",
        "ipfs://test-metadata-2", 
        0, // Individual
        0, // Open access
        0, // No fees
        100, // Member limit
        ethers.parseEther("0"), // No membership fee
        ethers.parseEther("50000") // 50,000 GAME stake
      )
      
      console.log('✅ Transaction submitted:', tx2.hash)
      const receipt2 = await tx2.wait()
      console.log('✅ Organization created with higher stake! Block:', receipt2.blockNumber)
      
    } catch (error2) {
      console.error('❌ Even higher stake failed:', error2.message)
    }
  }
}

main().catch(console.error)
