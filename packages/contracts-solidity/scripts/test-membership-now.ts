import { ethers } from 'hardhat'

async function main() {
  const [deployer, alice] = await ethers.getSigners()
  
  const deploymentAddresses = require('../deployment-addresses.json')
  const membershipAddress = deploymentAddresses.contracts.Membership
  
  console.log('🧪 Testing membership addition with correct address:', membershipAddress)
  
  const Membership = await ethers.getContractFactory('Membership')
  const membership = Membership.attach(membershipAddress)
  
  // Get organization IDs from scaffold
  const orgId = '0x3051344F30505142430000000000000000000000' // First org from scaffold
  
  console.log('Adding alice as member to org:', orgId)
  
  const tx = await membership.addMember(orgId, alice.address, 3) // PLATINUM tier
  const receipt = await tx.wait()
  
  console.log('✅ Member added! TX:', receipt.hash)
  console.log('📋 Block:', receipt.blockNumber)
  
  // Wait a bit for subgraph to index
  console.log('⏳ Waiting for subgraph to index...')
  await new Promise(resolve => setTimeout(resolve, 10000))
}

main().catch(console.error)
