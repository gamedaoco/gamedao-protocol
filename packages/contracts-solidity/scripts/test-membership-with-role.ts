import { ethers } from 'hardhat'

async function main() {
  const [deployer, user2] = await ethers.getSigners()
  
  console.log('🧪 Testing membership with proper role assignment...')
  
  const membershipAddress = '0x1c9fD50dF7a4f066884b58A05D91e4b55005876A'
  const membership = await ethers.getContractAt('Membership', membershipAddress)
  
  // Grant ORGANIZATION_MANAGER_ROLE to deployer
  const ORGANIZATION_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ORGANIZATION_MANAGER_ROLE"))
  
  console.log('✅ Step 1: Granting ORGANIZATION_MANAGER_ROLE to deployer...')
  const grantRoleTx = await membership.grantRole(ORGANIZATION_MANAGER_ROLE, deployer.address)
  await grantRoleTx.wait()
  console.log('✅ Role granted!')
  
  // Now test adding members to our previously created organization
  const orgId = '0x5146505641554959' // From previous test
  
  console.log('✅ Step 2: Adding creator as founding member...')
  try {
    const addMemberTx = await membership.addMember(orgId, deployer.address, 4) // PLATINUM = 4
    const memberReceipt = await addMemberTx.wait()
    console.log('✅ Creator added as founding member! Block:', memberReceipt.blockNumber)
  } catch (error) {
    console.error('❌ Failed to add creator:', error.message)
  }
  
  console.log('✅ Step 3: Adding second member...')
  try {
    const addMemberTx2 = await membership.addMember(orgId, user2.address, 2) // SILVER = 2
    const memberReceipt2 = await addMemberTx2.wait()
    console.log('✅ Second member added! Block:', memberReceipt2.blockNumber)
  } catch (error) {
    console.error('❌ Failed to add second member:', error.message)
  }
  
  // Wait for subgraph indexing
  console.log('⏳ Waiting for subgraph indexing (10 seconds)...')
  await new Promise(resolve => setTimeout(resolve, 10000))
  
  console.log('🎉 Membership test complete!')
}

main().catch(console.error)
