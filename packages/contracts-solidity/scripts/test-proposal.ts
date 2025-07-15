import { ethers } from 'hardhat'

async function main() {
  const [deployer, user1] = await ethers.getSigners()

  // Load contracts
  const gameToken = await ethers.getContractAt('MockGameToken', '0x5FbDB2315678afecb367f032d93F642f64180aa3')
  const control = await ethers.getContractAt('Control', '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9')
  const signal = await ethers.getContractAt('Signal', '0x0165878A594ca255338adfa4d48449f69242Eb8F')

  console.log('🧪 Testing Proposal Creation')
  console.log('Deployer:', deployer.address)
  console.log('User1:', user1.address)

  try {
    // First, let's create a simple organization
    console.log('\n📋 Creating test organization...')
    const createOrgTx = await control.createOrganization(
      'Test DAO',
      'ipfs://test-metadata',
      0, // Individual
      0, // Open
      0, // No fees
      100, // memberLimit
      0, // membershipFee
      0, // gameStakeRequired
    )

    const receipt = await createOrgTx.wait()
    if (!receipt) {
      throw new Error('Transaction receipt is null')
    }
    console.log('✅ Organization created, tx:', receipt.hash)
    console.log('📊 Transaction status:', receipt.status)
    console.log('📊 Gas used:', receipt.gasUsed.toString())
    console.log('📊 Number of logs:', receipt.logs.length)

    // Debug all logs
    console.log('\n🔍 All transaction logs:')
    receipt.logs.forEach((log, i) => {
      console.log(`  Log ${i}:`, {
        address: log.address,
        topics: log.topics,
        data: log.data
      })

      // Try to parse with different interfaces
      try {
        const parsed = control.interface.parseLog(log)
        console.log(`    Parsed as Control event: ${parsed?.name}`, parsed?.args)
      } catch (e) {
        console.log(`    Could not parse as Control event`)
      }
    })

    // Extract organization ID from logs
    const orgCreatedEvent = receipt.logs.find(log => {
      try {
        const parsed = control.interface.parseLog(log)
        return parsed?.name === 'OrganizationCreated'
      } catch {
        return false
      }
    })

    if (!orgCreatedEvent) {
      throw new Error('Organization creation event not found')
    }

    const parsedEvent = control.interface.parseLog(orgCreatedEvent)
    if (!parsedEvent) {
      throw new Error('Could not parse organization creation event')
    }
    const orgId = parsedEvent.args.id
    console.log('📍 Organization ID:', orgId)

    // Now try to create a proposal
    console.log('\n🗳️  Creating test proposal...')
    const createProposalTx = await signal.createProposal(
      orgId,
      'Test Proposal',
      'This is a test proposal',
      'ipfs://test-proposal',
      0, // Simple
      0, // Relative
      0, // Democratic
      86400, // 1 day
      '0x', // no execution data
      ethers.ZeroAddress
    )

    const proposalReceipt = await createProposalTx.wait()
    if (!proposalReceipt) {
      throw new Error('Proposal transaction receipt is null')
    }
    console.log('✅ Proposal created, tx:', proposalReceipt.hash)

    // Look for proposal events
    const proposalEvents = proposalReceipt.logs.filter(log => {
      try {
        const parsed = signal.interface.parseLog(log)
        return parsed?.name.includes('Proposal')
      } catch {
        return false
      }
    })

    console.log('\n📊 Found proposal events:')
    proposalEvents.forEach((event, i) => {
      try {
        const parsed = signal.interface.parseLog(event)
        if (parsed) {
          console.log(`  ${i + 1}. ${parsed.name}:`, parsed.args)
        }
      } catch (e) {
        console.log(`  ${i + 1}. Could not parse event`)
      }
    })

    // Try to get the proposal
    if (proposalEvents.length > 0) {
      const firstEvent = proposalEvents[0]
      const parsed = signal.interface.parseLog(firstEvent)
      if (parsed && parsed.args.hierarchicalId) {
        console.log('\n📋 Fetching proposal details...')
        const proposal = await signal.getProposal(parsed.args.hierarchicalId)
        console.log('Proposal details:', {
          title: proposal.title,
          creator: proposal.creator,
          organizationId: proposal.organizationId,
          state: proposal.state,
          startTime: proposal.startTime.toString(),
          endTime: proposal.endTime.toString()
        })
      }
    }

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

main().catch(console.error)
