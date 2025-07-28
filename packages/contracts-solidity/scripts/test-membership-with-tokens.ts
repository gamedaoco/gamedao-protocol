import { ethers } from 'hardhat'

async function main() {
  const [deployer, user2] = await ethers.getSigners()
  
  console.log('🧪 Testing membership indexing with fresh tokens...')
  
  const gameTokenAddress = '0x8e264821AFa98DD104eEcfcfa7FD9f8D8B320adA'
  const stakingAddress = '0x6A59CC73e334b018C9922793d96Df84B538E6fD5'
  const controlAddress = '0x0fe4223AD99dF788A6Dcad148eB4086E6389cEB6'
  const membershipAddress = '0x1c9fD50dF7a4f066884b58A05D91e4b55005876A'
  
  const gameToken = await ethers.getContractAt('GameToken', gameTokenAddress)
  const control = await ethers.getContractAt('Control', controlAddress)
  const membership = await ethers.getContractAt('Membership', membershipAddress)
  
  // Mint fresh tokens
  console.log('🪙 Minting fresh GAME tokens...')
  await gameToken.mint(deployer.address, ethers.parseEther("200000"))
  
  const balance = await gameToken.balanceOf(deployer.address)
  console.log('💰 Balance:', ethers.formatEther(balance), 'GAME')
  
  const stakeAmount = ethers.parseEther("10000")
  
  // 1. Create organization with proper approval
  console.log('✅ Step 1: Creating organization...')
  await gameToken.approve(stakingAddress, stakeAmount)
  
  const tx = await control.createOrganization(
    "Membership Test Org v2",
    "ipfs://membership-test-v2", 
    0, // Individual
    0, // Open access
    0, // No fees
    100, // Member limit
    ethers.parseEther("0"), // No membership fee
    stakeAmount
  )
  
  const receipt = await tx.wait()
  console.log('✅ Organization created! Block:', receipt.blockNumber)
  
  // Extract organization ID from logs
  const factoryAddress = '0x71a0b8A2245A9770A4D887cE1E4eCc6C1d4FF28c'
  const factory = await ethers.getContractAt('Factory', factoryAddress)
  
  const orgCreatedLog = receipt.logs.find(log => {
    return log.address.toLowerCase() === factoryAddress.toLowerCase()
  })
  
  if (!orgCreatedLog) {
    throw new Error('Organization creation event not found')
  }
  
  const parsedLog = factory.interface.parseLog({
    topics: orgCreatedLog.topics,
    data: orgCreatedLog.data
  })
  const orgId = parsedLog.args.orgId
  console.log('📋 Organization ID:', orgId)
  
  // 2. Add creator as member explicitly
  console.log('✅ Step 2: Adding creator as founding member...')
  try {
    const addMemberTx = await membership.addMember(orgId, deployer.address, 4) // PLATINUM = 4
    await addMemberTx.wait()
    console.log('✅ Creator added as founding member!')
  } catch (error) {
    console.error('❌ Failed to add creator as member:', error.message)
  }
  
  // 3. Add another user as member 
  console.log('✅ Step 3: Adding second member...')
  try {
    const addMemberTx2 = await membership.addMember(orgId, user2.address, 2) // SILVER = 2
    await addMemberTx2.wait()
    console.log('✅ Second member added!')
  } catch (error) {
    console.error('❌ Failed to add second member:', error.message)
  }
  
  // 4. Wait for subgraph indexing
  console.log('⏳ Waiting for subgraph indexing (10 seconds)...')
  await new Promise(resolve => setTimeout(resolve, 10000))
  
  console.log('🎉 Test complete! Organization ID:', orgId)
}

main().catch(console.error)
