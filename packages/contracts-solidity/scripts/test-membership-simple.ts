import { ethers } from 'hardhat'

async function main() {
  const [deployer, alice] = await ethers.getSigners()
  
  const membershipAddress = '0x1c9fD50dF7a4f066884b58A05D91e4b55005876A'
  console.log('🧪 Testing membership with address:', membershipAddress)
  
  const Membership = await ethers.getContractFactory('Membership')
  const membership = Membership.attach(membershipAddress)
  
  // Use the real 8-character alphanumeric org ID from the scaffold output
  const orgIdString = '0Q4O0PBC' // Mobile Gaming Guild
  const orgIdBytes8 = ethers.encodeBytes32String(orgIdString).slice(0, 18) // Convert to bytes8
  
  console.log('Adding alice as member to org:', orgIdString, '(bytes8:', orgIdBytes8, ')')
  
  const tx = await membership.addMember(orgIdBytes8, alice.address, 3)
  const receipt = await tx.wait()
  
  console.log('✅ Member added! TX:', receipt.hash)
  console.log('📋 Block number:', receipt.blockNumber)
}

main().catch(console.error)
