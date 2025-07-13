import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("🚀 Deploying GameDAO Protocol contracts...");
  console.log("📍 Deploying with account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));
  console.log("");

  // 1. Deploy Test Tokens
  console.log("🪙 Deploying Test Tokens...");

  // Deploy GAME token
  const GameTokenFactory = await ethers.getContractFactory("MockGameToken");
  const gameToken = await GameTokenFactory.deploy();
  await gameToken.waitForDeployment();
  const gameTokenAddress = await gameToken.getAddress();
  console.log("✅ GAME Token deployed to:", gameTokenAddress);

  // Deploy USDC token
  const USDCFactory = await ethers.getContractFactory("MockUSDC");
  const usdc = await USDCFactory.deploy();
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log("✅ USDC Token deployed to:", usdcAddress);
  console.log("");

  // 2. Deploy GameDAO Registry
  console.log("📋 Deploying GameDAO Registry...");
  const GameDAORegistryFactory = await ethers.getContractFactory("GameDAORegistry");
  const registry = await GameDAORegistryFactory.deploy(deployer.address);
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("✅ GameDAO Registry deployed to:", registryAddress);
  console.log("");

  // 2. Deploy Control Module
  console.log("🏛️ Deploying Control Module...");
  const ControlFactory = await ethers.getContractFactory("Control");
  const control = await ControlFactory.deploy(gameTokenAddress);
  await control.waitForDeployment();
  const controlAddress = await control.getAddress();
  console.log("✅ Control Module deployed to:", controlAddress);
  console.log("");

  // 3. Deploy Flow Module
  console.log("💰 Deploying Flow Module...");
  const FlowFactory = await ethers.getContractFactory("Flow");
  const flow = await FlowFactory.deploy();
  await flow.waitForDeployment();
  const flowAddress = await flow.getAddress();
  console.log("✅ Flow Module deployed to:", flowAddress);
  console.log("");

  // 4. Deploy Signal Module
  console.log("🗳️ Deploying Signal Module...");
  const SignalFactory = await ethers.getContractFactory("Signal");
  const signal = await SignalFactory.deploy();
  await signal.waitForDeployment();
  const signalAddress = await signal.getAddress();
  console.log("✅ Signal Module deployed to:", signalAddress);
  console.log("");

  // 5. Deploy Sense Module
  console.log("👤 Deploying Sense Module...");
  const SenseFactory = await ethers.getContractFactory("Sense");
  const sense = await SenseFactory.deploy();
  await sense.waitForDeployment();
  const senseAddress = await sense.getAddress();
  console.log("✅ Sense Module deployed to:", senseAddress);
  console.log("");

  // 5. Register and Enable Modules
  console.log("🔗 Registering Control Module with Registry...");
  const CONTROL_MODULE_ID = ethers.keccak256(ethers.toUtf8Bytes("CONTROL"));

  await registry.registerModule(controlAddress);
  console.log("📝 Control Module registered and initialized");

  await registry.enableModule(CONTROL_MODULE_ID);
  console.log("⚡ Control Module enabled");
  console.log("");

  console.log("🔗 Registering Flow Module with Registry...");
  const FLOW_MODULE_ID = ethers.keccak256(ethers.toUtf8Bytes("FLOW"));

  await registry.registerModule(flowAddress);
  console.log("📝 Flow Module registered and initialized");

  await registry.enableModule(FLOW_MODULE_ID);
  console.log("⚡ Flow Module enabled");
  console.log("");

  console.log("🔗 Registering Signal Module with Registry...");
  const SIGNAL_MODULE_ID = ethers.keccak256(ethers.toUtf8Bytes("SIGNAL"));

  await registry.registerModule(signalAddress);
  console.log("📝 Signal Module registered and initialized");

  await registry.enableModule(SIGNAL_MODULE_ID);
  console.log("⚡ Signal Module enabled");
  console.log("");

  console.log("🔗 Registering Sense Module with Registry...");
  const SENSE_MODULE_ID = ethers.keccak256(ethers.toUtf8Bytes("SENSE"));

  await registry.registerModule(senseAddress);
  console.log("📝 Sense Module registered and initialized");

  await registry.enableModule(SENSE_MODULE_ID);
  console.log("⚡ Sense Module enabled");
  console.log("");

  // 6. Deploy GameStaking Contract
  console.log("🎯 Deploying GameStaking Contract...");
  const GameStakingFactory = await ethers.getContractFactory("GameStaking");
  const gameStaking = await GameStakingFactory.deploy(
    gameTokenAddress,
    deployer.address, // Treasury address (using deployer for now)
    1000 // 10% of protocol fees go to staking rewards
  );
  await gameStaking.waitForDeployment();
  const gameStakingAddress = await gameStaking.getAddress();
  console.log("✅ GameStaking Contract deployed to:", gameStakingAddress);
  console.log("");

  // 7. GAME Token Integration (already configured in constructor)
  console.log("🎮 GAME Token Integration...");
  console.log("✅ GAME Token configured in Control module constructor");
  console.log("");

      // 8. Distribute Test Tokens
  console.log("💰 Distributing test tokens to accounts...");
  const [, ...accounts] = await ethers.getSigners();

    // 9. Test GameStaking Integration
  console.log("🧪 Testing GameStaking Integration...");

  // Give staking contract some rewards to distribute (from deployer who has all tokens)
  await (gameToken as any).transfer(gameStakingAddress, ethers.parseEther("50000")); // 50k GAME for rewards

  // Test staking functionality with a fresh account that has tokens
  const testStaker = accounts[0]; // Use first account from the accounts array
  const stakeAmount = ethers.parseEther("1000"); // 1k GAME (smaller amount)

  // First give the test staker some tokens
  await (gameToken as any).transfer(testStaker.address, ethers.parseEther("5000"));

  // Approve and stake
  await (gameToken as any).connect(testStaker).approve(gameStakingAddress, stakeAmount);
  await gameStaking.connect(testStaker).stake(1, stakeAmount, 1); // DAO_CREATION purpose, STANDARD strategy

  console.log("✅ GameStaking integration test successful");
  console.log(`   Staked: ${ethers.formatEther(stakeAmount)} GAME`);
  console.log(`   Purpose: DAO_CREATION (8% APY)`);
  console.log(`   Strategy: STANDARD (7-day unstaking)`);
  console.log("");

  for (let i = 0; i < Math.min(accounts.length, 12); i++) {
    const account = accounts[i];

    // Give each account 10,000 GAME tokens
    await (gameToken as any).transfer(account.address, ethers.parseEther("10000"));

    // Give each account 10,000 USDC
    await (usdc as any).transfer(account.address, ethers.parseUnits("10000", 6));

    console.log(`💸 Distributed tokens to ${account.address}`);
  }
  console.log("✅ Token distribution complete");
  console.log("");

  // 5. Create a Test Organization
  console.log("🏗️ Creating test organization...");
  const createOrgTx = await control.createOrganization(
    "GameDAO",
    "ipfs://QmTestMetadata123",
    2, // DAO type
    0, // Open access
    0, // No fees
    100, // Member limit
    0, // No membership fee
    0  // No GAME stake required (for now)
  );

  const receipt = await createOrgTx.wait();
  const event = receipt?.logs.find(log =>
    control.interface.parseLog(log as any)?.name === "OrganizationCreated"
  );

  if (event) {
    const parsedEvent = control.interface.parseLog(event as any);
    const orgId = parsedEvent?.args[0];

    console.log("🎉 Test organization created!");
    console.log("🆔 Organization ID:", orgId);

    // Get organization details
    const org = await control.getOrganization(orgId);
    console.log("📊 Organization Details:");
    console.log("   Name:", org.name);
    console.log("   Creator:", org.creator);
    console.log("   Treasury:", org.treasury);
    console.log("   Member Count:", await control.getMemberCount(orgId));
    console.log("   Is Active:", await control.isOrganizationActive(orgId));
    console.log("");

    // 6. Test Treasury Integration
    console.log("💰 Testing Treasury Integration...");
    const Treasury = await ethers.getContractFactory("Treasury");
    const treasury = Treasury.attach(org.treasury) as any; // Type assertion for treasury methods

    console.log("🏦 Treasury Details:");
    console.log("   Address:", org.treasury);
    console.log("   Organization ID:", await treasury.organizationId());
    console.log("   Control Module:", await treasury.controlModule());
    console.log("");

    // 7. Add a test member
    console.log("👥 Adding test member...");
    const [, testMember] = await ethers.getSigners();

    await control.connect(testMember).addMember(orgId, testMember.address);
    console.log("✅ Test member added:", testMember.address);
    console.log("👥 New member count:", await control.getMemberCount(orgId));
    console.log("✅ Member is active:", await control.isMemberActive(orgId, testMember.address));
    console.log("");

    // 8. Test Flow Module Integration
    console.log("💰 Testing Flow Module - Creating test campaign...");
    const createCampaignTx = await flow.createCampaign(
      orgId,
      "GameDAO Core Campaign",
      "Seedfunding campaign for GameDAO",
      "ipfs://QmTestCampaignMetadata",
      0, // Grant type
      usdcAddress, // USDC payments
      ethers.parseUnits("10000", 6), // Target: 10,000 USDC
      ethers.parseUnits("5000", 6),  // Min: 5,000 USDC
      ethers.parseUnits("20000", 6), // Max: 20,000 USDC
      86400 * 30, // 30 days duration
      false // Manual finalization
    );

    const campaignReceipt = await createCampaignTx.wait();
    const campaignEvent = campaignReceipt?.logs.find(log =>
      flow.interface.parseLog(log as any)?.name === "CampaignCreated"
    );

    if (campaignEvent) {
      const parsedCampaignEvent = flow.interface.parseLog(campaignEvent as any);
      const campaignId = parsedCampaignEvent?.args[0];

      console.log("🎉 Test campaign created!");
      console.log("🆔 Campaign ID:", campaignId);

      // Get campaign details
      const campaign = await flow.getCampaign(campaignId);
      console.log("📊 Campaign Details:");
      console.log("   Title:", campaign.title);
      console.log("   Creator:", campaign.creator);
      console.log("   Target:", ethers.formatUnits(campaign.target, 6), "USDC");
      console.log("   Min:", ethers.formatUnits(campaign.min, 6), "USDC");
      console.log("   Max:", ethers.formatUnits(campaign.max, 6), "USDC");
      console.log("   State:", campaign.state); // 0 = Created
      console.log("   Auto Finalize:", campaign.autoFinalize);
      console.log("");

      // Test a small contribution
      console.log("💸 Making test contribution...");
      const contributionAmount = ethers.parseUnits("1000", 6); // 1000 USDC

      // Approve USDC spending first
      await (usdc as any).connect(testMember).approve(flowAddress, contributionAmount);

      await flow.connect(testMember).contribute(
        campaignId,
        contributionAmount,
        "Test contribution from deployment script"
      );

      const updatedCampaign = await flow.getCampaign(campaignId);
      console.log("✅ Contribution successful!");
      console.log("   Amount raised:", ethers.formatUnits(updatedCampaign.raised, 6), "USDC");
      console.log("   Contributors:", updatedCampaign.contributorCount.toString());
      console.log("   State:", updatedCampaign.state); // Should be 1 = Active
      console.log("");

      // 9. Test Signal Module - Create a governance proposal
      console.log("🗳️ Testing Signal Module - Creating governance proposal...");
      const createProposalTx = await signal.connect(testMember).createProposal(
        orgId,
        "Governance Proposal",
        "A proposal to demonstrate governance functionality",
        "ipfs://QmTestProposalMetadata",
        0, // Simple proposal
        0, // Relative voting
        0, // Democratic voting power
        7 * 24 * 60 * 60, // 7 days voting period
        "0x", // No execution data
        ethers.ZeroAddress // No target contract
      );

      const proposalReceipt = await createProposalTx.wait();
      const proposalEvent = proposalReceipt?.logs.find(log =>
        signal.interface.parseLog(log as any)?.name === "ProposalCreated"
      );

      if (proposalEvent) {
        const parsedProposalEvent = signal.interface.parseLog(proposalEvent as any);
        const proposalId = parsedProposalEvent?.args[0];

        console.log("🎉 Test proposal created!");
        console.log("🆔 Proposal ID:", proposalId);

        // Get proposal details
        const proposal = await signal.getProposal(proposalId);
        console.log("📊 Proposal Details:");
        console.log("   Title:", proposal.title);
        console.log("   Proposer:", proposal.proposer);
        console.log("   State:", proposal.state); // 0 = Pending
        console.log("   Voting Type:", proposal.votingType); // 0 = Relative
        console.log("   Voting Power:", proposal.votingPower); // 0 = Democratic
        console.log("   Start Time:", new Date(Number(proposal.startTime) * 1000).toISOString());
        console.log("   End Time:", new Date(Number(proposal.endTime) * 1000).toISOString());
        console.log("");

        console.log("✅ Signal Module integration successful!");
        console.log("   Total Proposals:", await signal.getProposalCount());
        console.log("   Active Proposals:", (await signal.getActiveProposals()).length);
        console.log("   Org Proposals:", (await signal.getProposalsByOrganization(orgId)).length);
        console.log("");

        // 10. Test Sense Module - Create user profiles and reputation
        console.log("👤 Testing Sense Module - Creating user profiles...");
        const createProfileTx = await sense.connect(testMember).createProfile(
          orgId,
          "ipfs://QmTestProfileMetadata"
        );

        const profileReceipt = await createProfileTx.wait();
        const profileEvent = profileReceipt?.logs.find(log =>
          sense.interface.parseLog(log as any)?.name === "ProfileCreated"
        );

        if (profileEvent) {
          const parsedProfileEvent = sense.interface.parseLog(profileEvent as any);
          const profileId = parsedProfileEvent?.args[0];

          console.log("🎉 Test profile created!");
          console.log("🆔 Profile ID:", profileId);

          // Get profile details
          const profile = await sense.getProfile(profileId);
          console.log("📊 Profile Details:");
          console.log("   Owner:", profile.owner);
          console.log("   Organization:", profile.organizationId);
          console.log("   Active:", profile.active);
          console.log("   Verified:", profile.verified);
          console.log("");

          // Test reputation system
          console.log("⭐ Testing Reputation System...");
          const experienceReason = ethers.keccak256(ethers.toUtf8Bytes("Campaign contribution"));
          await sense.updateReputation(profileId, 0, 100, experienceReason); // EXPERIENCE

          const reputationReason = ethers.keccak256(ethers.toUtf8Bytes("Good governance participation"));
          await sense.updateReputation(profileId, 1, 50, reputationReason); // REPUTATION

          const reputation = await sense.getReputation(profileId);
          console.log("✅ Reputation updated!");
          console.log("   Experience:", reputation.experience.toString());
          console.log("   Reputation:", reputation.reputation.toString());
          console.log("   Trust:", reputation.trust.toString());
          console.log("");

          // Test achievement system
          console.log("🏆 Testing Achievement System...");
          const achievementId = ethers.keccak256(ethers.toUtf8Bytes("FIRST_CAMPAIGN_CONTRIBUTION"));
          await sense.grantAchievement(
            profileId,
            achievementId,
            "First Campaign Contribution",
            "Made your first contribution to a campaign",
            "FUNDING",
            50,
            "0x"
          );

          const achievements = await sense.getAchievements(profileId);
          console.log("✅ Achievement granted!");
          console.log("   Total Achievements:", achievements.length);
          if (achievements.length > 0) {
            console.log("   First Achievement:", achievements[0].name);
            console.log("   Points Awarded:", achievements[0].points.toString());
          }
          console.log("");

          // Test social features
          console.log("💬 Testing Social Features...");
          const [, , anotherMember] = await ethers.getSigners();

          // Create another profile for feedback testing
          const anotherProfileTx = await sense.connect(anotherMember).createProfile(
            orgId,
            "ipfs://QmAnotherProfileMetadata"
          );
          await anotherProfileTx.wait();

          // Submit feedback
          await sense.connect(anotherMember).submitFeedback(
            profileId,
            0, // POSITIVE
            5, // Rating
            "Great contributor to the DAO!"
          );

          const feedbackSummary = await sense.getFeedbackSummary(profileId);
          console.log("✅ Feedback submitted!");
          console.log("   Total Feedbacks:", feedbackSummary.totalFeedbacks.toString());
          console.log("   Positive Feedbacks:", feedbackSummary.positiveFeedbacks.toString());
          console.log("   Average Rating:", (Number(feedbackSummary.averageRating) / 100).toFixed(2));
          console.log("");

          // Test integration features
          console.log("🔗 Testing Integration Features...");
          const votingWeight = await sense.calculateVotingWeight(profileId, 1000);
          const trustScore = await sense.calculateTrustScore(profileId);

          console.log("✅ Integration calculations:");
          console.log("   Base Voting Weight: 1000");
          console.log("   Reputation-adjusted Weight:", votingWeight.toString());
          console.log("   Trust Score:", trustScore.toString());
          console.log("");

          console.log("✅ Sense Module integration successful!");
          console.log("   Total Profiles:", await sense.getProfileCount());
          console.log("   Org Profiles:", (await sense.getProfilesByOrganization(orgId)).length);
          console.log("");
        } else {
          throw new Error("Profile creation event not found");
        }

        // 10. Summary
         console.log("🎯 DEPLOYMENT SUMMARY");
         console.log("====================");
         console.log("GAME Token Address:  ", gameTokenAddress);
         console.log("USDC Token Address:  ", usdcAddress);
         console.log("GameStaking Address: ", gameStakingAddress);
         console.log("Registry Address:    ", registryAddress);
         console.log("Control Address:     ", controlAddress);
         console.log("Flow Address:        ", flowAddress);
         console.log("Signal Address:      ", signalAddress);
         console.log("Sense Address:       ", senseAddress);
         console.log("Test Org ID:         ", orgId);
         console.log("Test Treasury:       ", org.treasury);
         console.log("Test Campaign ID:    ", campaignId);
         console.log("Test Proposal ID:    ", proposalId);
         console.log("Total Organizations: ", await control.getOrganizationCount());
         console.log("Total Campaigns:     ", await flow.getCampaignCount());
         console.log("Total Proposals:     ", await signal.getProposalCount());
         console.log("Total Profiles:      ", await sense.getProfileCount());
         console.log("");
         console.log("🚀 GameDAO Protocol successfully deployed and tested!");

         return {
           gameToken: gameTokenAddress,
           usdc: usdcAddress,
           gameStaking: gameStakingAddress,
           registry: registryAddress,
           control: controlAddress,
           flow: flowAddress,
           signal: signalAddress,
           sense: senseAddress,
           testOrgId: orgId,
           testTreasury: org.treasury,
           testCampaignId: campaignId,
           testProposalId: proposalId
         };
       } else {
         throw new Error("Proposal creation event not found");
       }
     } else {
       throw new Error("Campaign creation event not found");
     }
  } else {
    throw new Error("Organization creation event not found");
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then((deploymentInfo) => {
    console.log("\n✨ Deployment completed successfully!");
    console.log("📋 Save these addresses for frontend integration:");
    console.log(JSON.stringify(deploymentInfo, null, 2));

    // Save deployment addresses to file for other scripts
    const fs = require('fs');
    const path = require('path');
    const deploymentFile = path.join(__dirname, '..', 'deployment-addresses.json');

    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    console.log(`💾 Deployment addresses saved to: ${deploymentFile}`);

    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
