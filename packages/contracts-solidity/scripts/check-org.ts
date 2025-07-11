import { ethers } from 'hardhat'

async function checkOrganization() {
  const [deployer] = await ethers.getSigners()

  // Get the Control contract
  const controlAddress = '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9'
  const Control = await ethers.getContractAt('Control', controlAddress)

  // Check the specific organization
  const orgId = '0x7f85e071f85093bf73a02589a708f548bed94308f522993dc13d118feb268dbf'

  try {
    console.log('🔍 Checking organization:', orgId)
    const org = await Control.getOrganization(orgId)
    console.log('✅ Organization found:', {
      creator: org.creator,
      prime: org.prime,
      name: org.name,
      state: org.state.toString()
    })
  } catch (error: any) {
    console.log('❌ Organization not found or error:', error.message)
  }

  // Also check total organization count
  try {
    const totalOrgs = await Control.getOrganizationCount()
    console.log('📊 Total organizations on blockchain:', totalOrgs.toString())
  } catch (error: any) {
    console.log('❌ Could not get organization count:', error.message)
  }
}

checkOrganization()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
