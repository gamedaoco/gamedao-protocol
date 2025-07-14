import { ethers } from "hardhat";
import fs from "fs";

async function main() {
  console.log("🚀 Setting up Development Environment for Hierarchical ID System");
  console.log("=================================================================");

  // Get signers
  const [deployer, ...users] = await ethers.getSigners();
  console.log("👥 Available signers:", users.length + 1);

  // Load deployment addresses
  const deploymentFile = "./deployment-addresses.json";
  if (!fs.existsSync(deploymentFile)) {
    console.error("❌ Deployment addresses not found. Run deployment first.");
    process.exit(1);
  }

  const addresses = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  console.log("📋 Loaded deployment addresses");

  // Connect to contracts
  const control = await ethers.getContractAt("Control", addresses.control);
  const signal = await ethers.getContractAt("Signal", addresses.signal, {
    libraries: {
      GameId: addresses.gameId
    }
  });
  const gameToken = await ethers.getContractAt("MockGameToken", addresses.gameToken);

  console.log("🔗 Connected to contracts");
  console.log("");

  // Setup data structures
  const setupData = {
    organizations: [],
    proposals: [],
    users: [],
    hierarchicalIds: [],
    legacyIds: []
  };

  // Create test organizations
  console.log("🏛️ Creating test organizations...");
  const orgNames = [
    "GameDAO Core",
    "DeFi Gaming Guild",
    "NFT Creators DAO",
    "Esports Alliance",
    "Metaverse Builders"
  ];

  for (let i = 0; i < orgNames.length; i++) {
    const user = users[i % users.length];
    const orgTx = await control.connect(user).createOrganization(
      orgNames[i],
      `${orgNames[i]} - Testing hierarchical IDs`,
      `https://test.com/org-${i}`,
      0, // DAO type
      user.address // treasury
    );

    const receipt = await orgTx.wait();
    const event = receipt?.logs.find(log => {
      try {
        const parsed = control.interface.parseLog(log);
        return parsed?.name === "OrganizationCreated";
      } catch {
        return false;
      }
    });

    if (event) {
      const parsedEvent = control.interface.parseLog(event);
      const orgId = parsedEvent?.args.organizationId;
      setupData.organizations.push({
        id: orgId,
        name: orgNames[i],
        creator: user.address,
        treasury: user.address
      });
      console.log(`   ✅ ${orgNames[i]}: ${orgId}`);
    }
  }
  console.log("");

  // Create mix of legacy and hierarchical proposals
  console.log("🗳️ Creating test proposals (mix of legacy and hierarchical)...");

  for (let i = 0; i < setupData.organizations.length; i++) {
    const org = setupData.organizations[i];
    const user = users[i % users.length];

    // Create 2 legacy proposals per org
    for (let j = 1; j <= 2; j++) {
      const proposalTx = await signal.connect(user).createProposal(
        org.id,
        `${org.name} - Legacy Proposal ${j}`,
        `This is legacy proposal ${j} for ${org.name}`,
        `https://test.com/legacy-${i}-${j}`,
        0, // Standard proposal
        0, // Simple voting
        1, // Token weighted
        86400, // 1 day voting period
        "0x",
        ethers.ZeroAddress
      );

      const receipt = await proposalTx.wait();
      const event = receipt?.logs.find(log => {
        try {
          const parsed = signal.interface.parseLog(log);
          return parsed?.name === "ProposalCreated";
        } catch {
          return false;
        }
      });

      if (event) {
        const parsedEvent = signal.interface.parseLog(event);
        const proposalId = parsedEvent?.args.proposalId;
        setupData.proposals.push({
          id: proposalId,
          title: `${org.name} - Legacy Proposal ${j}`,
          organizationId: org.id,
          organizationName: org.name,
          type: "legacy",
          creator: user.address
        });
        setupData.legacyIds.push(proposalId);
        console.log(`   📜 Legacy: ${proposalId.substring(0, 10)}...`);
      }
    }

    // Create 3 hierarchical proposals per org
    for (let j = 1; j <= 3; j++) {
      const proposalTx = await signal.connect(user).createProposalV2(
        org.id,
        `${org.name} - Hierarchical Proposal ${j}`,
        `This is hierarchical proposal ${j} for ${org.name}`,
        `https://test.com/hierarchical-${i}-${j}`,
        0, // Standard proposal
        0, // Simple voting
        1, // Token weighted
        86400, // 1 day voting period
        "0x",
        ethers.ZeroAddress
      );

      const receipt = await proposalTx.wait();
      const event = receipt?.logs.find(log => {
        try {
          const parsed = signal.interface.parseLog(log);
          return parsed?.name === "ProposalCreated";
        } catch {
          return false;
        }
      });

      if (event) {
        const parsedEvent = signal.interface.parseLog(event);
        const proposalId = parsedEvent?.args.proposalId;
        setupData.proposals.push({
          id: proposalId,
          title: `${org.name} - Hierarchical Proposal ${j}`,
          organizationId: org.id,
          organizationName: org.name,
          type: "hierarchical",
          creator: user.address
        });
        setupData.hierarchicalIds.push(proposalId);
        console.log(`   🔗 Hierarchical: ${proposalId}`);
      }
    }
  }
  console.log("");

  // Create some votes on proposals
  console.log("🗳️ Creating test votes...");
  let voteCount = 0;

  for (let i = 0; i < setupData.proposals.length && i < 10; i++) {
    const proposal = setupData.proposals[i];
    const voter = users[(i + 1) % users.length];

    try {
      if (proposal.type === "legacy") {
        const voteTx = await signal.connect(voter).castVote(
          proposal.id,
          Math.floor(Math.random() * 3), // Random vote choice
          `Vote on ${proposal.title}`
        );
        await voteTx.wait();
      } else {
        const voteTx = await signal.connect(voter).castVoteV2(
          proposal.id,
          Math.floor(Math.random() * 3), // Random vote choice
          `Vote on ${proposal.title}`
        );
        await voteTx.wait();
      }
      voteCount++;
      console.log(`   ✅ Vote cast on ${proposal.type} proposal: ${proposal.id.substring(0, 20)}...`);
    } catch (error) {
      console.log(`   ⚠️  Failed to vote on proposal ${proposal.id}: ${error.message}`);
    }
  }
  console.log("");

  // Generate user data
  console.log("👥 Generating user data...");
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const balance = await gameToken.balanceOf(user.address);
    setupData.users.push({
      address: user.address,
      gameBalance: ethers.formatEther(balance),
      index: i
    });
    console.log(`   👤 User ${i}: ${user.address} (${ethers.formatEther(balance)} GAME)`);
  }
  console.log("");

  // Generate statistics
  console.log("📊 Development Environment Statistics");
  console.log("====================================");
  console.log(`👥 Users: ${setupData.users.length}`);
  console.log(`🏛️  Organizations: ${setupData.organizations.length}`);
  console.log(`🗳️  Total Proposals: ${setupData.proposals.length}`);
  console.log(`📜 Legacy Proposals: ${setupData.legacyIds.length}`);
  console.log(`🔗 Hierarchical Proposals: ${setupData.hierarchicalIds.length}`);
  console.log(`✅ Votes Cast: ${voteCount}`);
  console.log("");

  // ID Format Analysis
  console.log("🔍 ID Format Analysis");
  console.log("=====================");
  console.log("Legacy ID Examples:");
  setupData.legacyIds.slice(0, 3).forEach((id, index) => {
    console.log(`   ${index + 1}. ${id}`);
  });
  console.log("");

  console.log("Hierarchical ID Examples:");
  setupData.hierarchicalIds.slice(0, 3).forEach((id, index) => {
    const orgPart = id.substring(0, 8);
    const typePart = id.substring(8, 11);
    const proposalPart = id.substring(11);
    console.log(`   ${index + 1}. ${id}`);
    console.log(`      Organization: ${orgPart}`);
    console.log(`      Type: ${typePart}`);
    console.log(`      Proposal: ${proposalPart}`);
  });
  console.log("");

  // Contract Statistics
  console.log("📈 Contract Statistics");
  console.log("======================");
  try {
    const totalOrgs = await control.getOrganizationCount();
    const totalProposals = await signal.getProposalCount();
    console.log(`Total Organizations: ${totalOrgs}`);
    console.log(`Total Proposals: ${totalProposals}`);
  } catch (error) {
    console.log("⚠️  Could not fetch contract statistics");
  }
  console.log("");

  // Save development data
  const devData = {
    timestamp: new Date().toISOString(),
    environment: "development",
    gipVersion: "GIP-006",
    ...setupData,
    statistics: {
      totalUsers: setupData.users.length,
      totalOrganizations: setupData.organizations.length,
      totalProposals: setupData.proposals.length,
      legacyProposals: setupData.legacyIds.length,
      hierarchicalProposals: setupData.hierarchicalIds.length,
      votesCreated: voteCount
    }
  };

  fs.writeFileSync("dev-hierarchical-setup.json", JSON.stringify(devData, null, 2));
  console.log("💾 Development data saved to dev-hierarchical-setup.json");
  console.log("");

  // Frontend Integration Guide
  console.log("🎨 Frontend Integration Guide");
  console.log("=============================");
  console.log("1. Use createProposalV2() for new proposals");
  console.log("2. Use castVoteV2() for voting on hierarchical proposals");
  console.log("3. Use hierarchical-id-utils.ts for ID validation");
  console.log("4. Legacy proposals still work with original functions");
  console.log("");

  console.log("🎉 Development environment setup complete!");
  console.log("🔗 Both legacy and hierarchical systems are ready for testing");
  console.log("📱 Frontend can now be started with: make dev-frontend");
}

main()
  .then(() => {
    console.log("\n✨ Development setup completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Development setup failed:", error);
    process.exit(1);
  });
