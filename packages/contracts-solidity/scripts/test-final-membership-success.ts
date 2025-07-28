import { ethers } from 'hardhat'

async function main() {
  const [deployer, user2] = await ethers.getSigners()
  
  console.log('🧪 Testing membership with CORRECT tier values...')
  
  const membershipAddress = '0x1c9fD50dF7a4f066884b58A05D91e4b55005876A'
  const membership = await ethers.getContractAt('Membership', membershipAddress)
  
  // Use our already created and activated organization
  const orgId = '0x334155594d4b4f30' // From previous test
  
  console.log('✅ Step 1: Adding creator as founding member with PLATINUM tier...')
  try {
    const addMemberTx = await membership.addMember(orgId, deployer.address, 3) // 3 = PLATINUM
    const memberReceipt = await addMemberTx.wait()
    console.log('✅ Creator added as PLATINUM member! Block:', memberReceipt.blockNumber)
  } catch (error) {
    console.error('❌ Failed to add creator:', error.message)
    return
  }
  
  console.log('✅ Step 2: Adding second member with SILVER tier...')
  try {
    const addMemberTx2 = await membership.addMember(orgId, user2.address, 1) // 1 = SILVER
    const memberReceipt2 = await addMemberTx2.wait()
    console.log('✅ Second member added as SILVER member! Block:', memberReceipt2.blockNumber)
  } catch (error) {
    console.error('❌ Failed to add second member:', error.message)
    return
  }
  
  console.log('⏳ Waiting for subgraph indexing (15 seconds)...')
  await new Promise(resolve => setTimeout(resolve, 15000))
  
  console.log('🎉 SUCCESS! Membership flow completed!')
  console.log('📋 Organization ID:', orgId)
  console.log('📋 Members added:')
  console.log('  - Creator (PLATINUM - tier 3):', deployer.address)
  console.log('  - User2 (SILVER - tier 1):', user2.address)
  
  // Test getting member info
  console.log('📋 Verifying membership data...')
  try {
    const memberData = await membership.getMember(orgId, deployer.address)
    console.log('Creator member data:', {
      tier: memberData.tier.toString(),
      state: memberData.state.toString(),
      votingPower: ethers.formatEther(memberData.votingPower),
      canVote: memberData.canVote
    })
  } catch (error) {
    console.error('Could not get member data:', error.message)
  }
}

main().catch(console.error)
