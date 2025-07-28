import { ethers } from 'hardhat'

async function main() {
  const [deployer, user2] = await ethers.getSigners()
  
  console.log('🧪 Testing COMPLETE membership flow with dual activation...')
  
  const gameTokenAddress = '0x8e264821AFa98DD104eEcfcfa7FD9f8D8B320adA'
  const stakingAddress = '0x6A59CC73e334b018C9922793d96Df84B538E6fD5'
  const controlAddress = '0x0fe4223AD99dF788A6Dcad148eB4086E6389cEB6'
  const membershipAddress = '0x1c9fD50dF7a4f066884b58A05D91e4b55005876A'
  const factoryAddress = '0x71a0b8A2245A9770A4D887cE1E4eCc6C1d4FF28c'
  
  const gameToken = await ethers.getContractAt('GameToken', gameTokenAddress)
  const control = await ethers.getContractAt('Control', controlAddress)
  const membership = await ethers.getContractAt('Membership', membershipAddress)
  const factory = await ethers.getContractAt('Factory', factoryAddress)
  
  const stakeAmount = ethers.parseEther("10000")
  
  // 1. Create organization
  console.log('✅ Step 1: Creating organization...')
  await gameToken.approve(stakingAddress, stakeAmount)
  
  const tx = await control.createOrganization(
    "Complete Flow Test",
    "ipfs://complete-flow-test", 
    0, // Individual
    0, // Open access
    0, // No fees
    100, // Member limit
    ethers.parseEther("0"), // No membership fee
    stakeAmount
  )
  
  const receipt = await tx.wait()
  console.log('✅ Organization created! Block:', receipt.blockNumber)
  
  // Parse Factory event to get organization ID
  const orgCreatedLog = receipt.logs.find(log => {
    return log.address.toLowerCase() === factoryAddress.toLowerCase()
  })
  const parsedLog = factory.interface.parseLog({
    topics: orgCreatedLog.topics,
    data: orgCreatedLog.data
  })
  const orgId = parsedLog.args.id
  console.log('📋 Organization ID:', orgId)
  
  // 2. Activate organization in Control contract
  console.log('✅ Step 2: Activating organization in Control contract...')
  const controlActivateTx = await control.updateOrganizationState(orgId, 1) // 1 = Active
  await controlActivateTx.wait()
  console.log('✅ Control contract organization activated!')
  
  // 3. Activate organization in Membership contract
  console.log('✅ Step 3: Activating organization in Membership contract...')
  const membershipActivateTx = await membership.activateOrganization(orgId)
  await membershipActivateTx.wait()
  console.log('✅ Membership contract organization activated!')
  
  // 4. Add creator as member
  console.log('✅ Step 4: Adding creator as founding member...')
  const addMemberTx = await membership.addMember(orgId, deployer.address, 4) // PLATINUM = 4
  const memberReceipt = await addMemberTx.wait()
  console.log('✅ Creator added as founding member! Block:', memberReceipt.blockNumber)
  
  // 5. Add another user as member 
  console.log('✅ Step 5: Adding second member...')
  const addMemberTx2 = await membership.addMember(orgId, user2.address, 2) // SILVER = 2
  const memberReceipt2 = await addMemberTx2.wait()
  console.log('✅ Second member added! Block:', memberReceipt2.blockNumber)
  
  // 6. Wait for subgraph indexing
  console.log('⏳ Waiting for subgraph indexing (15 seconds)...')
  await new Promise(resolve => setTimeout(resolve, 15000))
  
  console.log('🎉 COMPLETE membership flow test finished!')
  console.log('📋 Organization ID:', orgId)
  console.log('📋 Members added:')
  console.log('  - Creator (PLATINUM):', deployer.address)
  console.log('  - User2 (SILVER):', user2.address)
}

main().catch(console.error)
