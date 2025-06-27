const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Checking deployed contracts...");

  // Read addresses from deployment file
  const fs = require('fs');
  const path = require('path');

  let addresses = {};
  try {
    const deploymentPath = path.join(__dirname, '../deployment-addresses.json');
    const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));

    addresses = {
      REGISTRY: deploymentData.registry,
      CONTROL: deploymentData.control,
      FLOW: deploymentData.flow,
      SIGNAL: deploymentData.signal,
      SENSE: deploymentData.sense,
    };

    console.log('✅ Loaded addresses from deployment-addresses.json');
  } catch (error) {
    console.log('⚠️  Could not load deployment addresses, using fallback');
    // Fallback addresses
    addresses = {
      REGISTRY: '0xc351628EB244ec633d5f21fBD6621e1a683B1181',
      CONTROL: '0xFD471836031dc5108809D173A067e8486B9047A3',
      FLOW: '0xcbEAF3BDe82155F56486Fb5a1072cb8baAf547cc',
      SIGNAL: '0x1429859428C0aBc9C2C47C8Ee9FBaf82cFA0F20f',
      SENSE: '0xB0D4afd8879eD9F52b28595d31B441D079B2Ca07',
    };
  }

  try {
    // Check Control contract
    console.log("\n📋 Control Contract:");
    const Control = await ethers.getContractAt("Control", addresses.CONTROL);
    const orgCount = await Control.getOrganizationCount();
    const allOrgs = await Control.getAllOrganizations();
    console.log(`- Address: ${addresses.CONTROL}`);
    console.log(`- Organization Count: ${orgCount.toString()}`);
    console.log(`- All Organizations: ${allOrgs.length} found`);
    if (allOrgs.length > 0) {
      console.log(`- First Org ID: ${allOrgs[0]}`);

      // Get details of first organization
      const firstOrg = await Control.getOrganization(allOrgs[0]);
      console.log(`- First Org Name: ${firstOrg[0]}`);
    }

    // Check Flow contract
    console.log("\n💸 Flow Contract:");
    const Flow = await ethers.getContractAt("Flow", addresses.FLOW);
    const campaignCount = await Flow.getCampaignCount();
    console.log(`- Address: ${addresses.FLOW}`);
    console.log(`- Campaign Count: ${campaignCount.toString()}`);

    // Get active campaigns
    const activeCampaigns = await Flow.getCampaignsByState(1); // Active = 1
    const createdCampaigns = await Flow.getCampaignsByState(0); // Created = 0
    console.log(`- Active Campaigns: ${activeCampaigns.length}`);
    console.log(`- Created Campaigns: ${createdCampaigns.length}`);

    // Check Signal contract
    console.log("\n🗳️  Signal Contract:");
    const Signal = await ethers.getContractAt("Signal", addresses.SIGNAL);
    const proposalCount = await Signal.getProposalCount();
    const activeProposals = await Signal.getActiveProposals();
    console.log(`- Address: ${addresses.SIGNAL}`);
    console.log(`- Proposal Count: ${proposalCount.toString()}`);
    console.log(`- Active Proposals: ${activeProposals.length}`);

    console.log("\n✅ All contracts are accessible and have data!");
    console.log("\n📊 Summary:");
    console.log(`  🏛️  Organizations: ${orgCount.toString()}`);
    console.log(`  💸 Campaigns: ${campaignCount.toString()}`);
    console.log(`  🗳️  Proposals: ${proposalCount.toString()}`);

  } catch (error) {
    console.error("\n❌ Error checking contracts:", error.message);
    console.log("\nThis might mean:");
    console.log("1. Contracts are not deployed");
    console.log("2. Contract addresses are wrong");
    console.log("3. Hardhat node is not running");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
