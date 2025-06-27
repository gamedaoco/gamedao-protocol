const { ethers } = require('hardhat');
const addresses = require('../deployment-addresses.json');

async function main() {
  console.log('Testing contract counts...');

  const Control = await ethers.getContractAt('Control', addresses.control);
  const Flow = await ethers.getContractAt('Flow', addresses.flow);
  const Signal = await ethers.getContractAt('Signal', addresses.signal);

  try {
    const orgCount = await Control.getOrganizationCount();
    const campaignCount = await Flow.getCampaignCount();
    const proposalCount = await Signal.getProposalCount();

    console.log('✅ Contract Counts:');
    console.log('  Organizations:', orgCount.toString());
    console.log('  Campaigns:', campaignCount.toString());
    console.log('  Proposals:', proposalCount.toString());

    // Test some actual data
    if (orgCount > 0) {
      const allOrgs = await Control.getAllOrganizations();
      console.log('  Organization IDs:', allOrgs.slice(0, 3).map(id => id.slice(0, 10) + '...'));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main().catch(console.error);
