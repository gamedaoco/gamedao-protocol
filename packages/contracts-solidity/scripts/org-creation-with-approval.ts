import { ethers } from 'hardhat'

async function main() {
  const [deployer] = await ethers.getSigners()
  
  console.log('🔧 Organization creation with proper token approval...')
  
  const gameTokenAddress = '0x8e264821AFa98DD104eEcfcfa7FD9f8D8B320adA'
  const stakingAddress = '0x6A59CC73e334b018C9922793d96Df84B538E6fD5'
  const controlAddress = '0x0fe4223AD99dF788A6Dcad148eB4086E6389cEB6'
  
  const gameToken = await ethers.getContractAt('GameToken', gameTokenAddress)
  const control = await ethers.getContractAt('Control', controlAddress)
  
  const stakeAmount = ethers.parseEther("10000") // 10,000 GAME stake
  
  console.log('💰 Current balance:', ethers.formatEther(await gameToken.balanceOf(deployer.address)), 'GAME')
  console.log('📋 Stake amount needed:', ethers.formatEther(stakeAmount), 'GAME')
  
  // 1. APPROVE the staking contract to spend tokens
  console.log('✅ Step 1: Approving staking contract to spend tokens...')
  const approveTx = await gameToken.approve(stakingAddress, stakeAmount)
  await approveTx.wait()
  console.log('✅ Approval confirmed!')
  
  // Check allowance
  const allowance = await gameToken.allowance(deployer.address, stakingAddress)
  console.log('📋 Allowance granted:', ethers.formatEther(allowance), 'GAME')
  
  // 2. CREATE the organization
  console.log('✅ Step 2: Creating organization...')
  try {
    const tx = await control.createOrganization(
      "Properly Fixed Org",
      "ipfs://test-metadata", 
      0, // Individual
      0, // Open access
      0, // No fees
      100, // Member limit
      ethers.parseEther("0"), // No membership fee
      stakeAmount // 10,000 GAME stake
    )
    
    console.log('🎉 SUCCESS! Transaction submitted:', tx.hash)
    const receipt = await tx.wait()
    console.log('🎉 Organization created successfully! Block:', receipt.blockNumber)
    
    // Check if organization shows up in subgraph
    console.log('⏳ Waiting for subgraph indexing...')
    await new Promise(resolve => setTimeout(resolve, 5000))
    
  } catch (error) {
    console.error('❌ Organization creation still failed:', error.message)
    console.error('📋 Full error:', error)
  }
}

main().catch(console.error)
