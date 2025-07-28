import { ethers } from 'hardhat'

async function main() {
  const [deployer] = await ethers.getSigners()
  
  console.log('🔧 Fixing organization creation issues...')
  
  // 1. Check minimum stake requirement
  const staking = await ethers.getContractAt('Staking', '0x6A59CC73e334b018C9922793d96Df84B538E6fD5')
  const minStake = await staking.minimumStakeAmounts(1) // DAO_CREATION purpose
  console.log('📋 Minimum stake required:', ethers.formatEther(minStake), 'GAME')
  
  // 2. Mint tokens to deployer
  const gameToken = await ethers.getContractAt('GameToken', '0x8e264821AFa98DD104eEcfcfa7FD9f8D8B320adA')
  const currentBalance = await gameToken.balanceOf(deployer.address)
  console.log('💰 Current balance:', ethers.formatEther(currentBalance), 'GAME')
  
  if (currentBalance < minStake) {
    console.log('🪙 Minting GAME tokens...')
    const mintAmount = ethers.parseEther("100000") // Mint 100k GAME
    await gameToken.mint(deployer.address, mintAmount)
    
    const newBalance = await gameToken.balanceOf(deployer.address)
    console.log('✅ New balance:', ethers.formatEther(newBalance), 'GAME')
  }
  
  // 3. Try organization creation again
  const control = await ethers.getContractAt('Control', '0x0fe4223AD99dF788A6Dcad148eB4086E6389cEB6')
  
  console.log('📋 Attempting organization creation with sufficient stake...')
  const stakeAmount = minStake > ethers.parseEther("5000") ? minStake : ethers.parseEther("5000")
  console.log('📋 Using stake amount:', ethers.formatEther(stakeAmount), 'GAME')
  
  try {
    const tx = await control.createOrganization(
      "Debug Test Org",
      "ipfs://test-metadata", 
      0, // Individual
      0, // Open access
      0, // No fees
      100, // Member limit
      ethers.parseEther("0"), // No membership fee
      stakeAmount // Use minimum or 5000, whichever is higher
    )
    
    console.log('✅ Transaction submitted:', tx.hash)
    const receipt = await tx.wait()
    console.log('✅ Organization created successfully! Block:', receipt.blockNumber)
    
  } catch (error) {
    console.error('❌ Still failing:', error.message)
  }
}

main().catch(console.error)
