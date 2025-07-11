import { ethers } from 'hardhat'

async function checkCurrentBlock() {
  const provider = ethers.provider
  const currentBlock = await provider.getBlockNumber()
  console.log('🔍 Current blockchain block:', currentBlock)

  // Also check recent blocks for OrganizationCreated events
  const controlAddress = '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9'
  const Control = await ethers.getContractAt('Control', controlAddress)

  const filter = Control.filters.OrganizationCreated()
  const events = await Control.queryFilter(filter, currentBlock - 20, currentBlock)

  console.log('📊 Recent OrganizationCreated events:')
  events.forEach((event, index) => {
    console.log(`  ${index + 1}. Block ${event.blockNumber}: ${event.args?.[0]} - "${event.args?.[1]}"`)
  })
}

checkCurrentBlock()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
