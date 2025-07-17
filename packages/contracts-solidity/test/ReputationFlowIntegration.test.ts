import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { Registry, Sense, Flow, MockGameToken } from "../typechain-types";

describe("Flow -> Sense Reputation Integration", function () {
  let registry: Registry;
  let sense: Sense;
  let flow: Flow;
  let gameToken: MockGameToken;

  let admin: SignerWithAddress;
  let creator: SignerWithAddress;
  let contributor: SignerWithAddress;

  const testOrgId = "0x544553544f524700"; // "TESTORG" as bytes8
  const testProfileId1 = "0x50524f46494c4531"; // "PROFILE1" as bytes8
  const testProfileId2 = "0x50524f46494c4532"; // "PROFILE2" as bytes8

  const REPUTATION_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("REPUTATION_MANAGER_ROLE"));

  beforeEach(async function () {
    [admin, creator, contributor] = await ethers.getSigners();

    // Deploy Game Token
    const GameTokenFactory = await ethers.getContractFactory("MockGameToken");
    gameToken = await GameTokenFactory.deploy();
    await gameToken.waitForDeployment();

    // Deploy Registry
    const RegistryFactory = await ethers.getContractFactory("Registry");
    registry = await RegistryFactory.deploy(admin.address);
    await registry.waitForDeployment();

    // Deploy Sense
    const SenseFactory = await ethers.getContractFactory("Sense");
    sense = await SenseFactory.deploy();
    await sense.waitForDeployment();

    // Deploy Flow
    const FlowFactory = await ethers.getContractFactory("Flow");
    flow = await FlowFactory.deploy();
    await flow.waitForDeployment();

    // Register and enable modules
    await registry.registerModule(await sense.getAddress());
    await registry.registerModule(await flow.getAddress());
    await registry.enableModule(await sense.getAddress());
    await registry.enableModule(await flow.getAddress());

    // Initialize modules
    await sense.initialize(await registry.getAddress());
    await flow.initialize(await registry.getAddress());

    // Grant Flow module permission to manage reputation
    await sense.grantRole(REPUTATION_MANAGER_ROLE, await flow.getAddress());

    // Transfer tokens to test accounts
    const transferAmount = ethers.parseEther("100000");
    await gameToken.transfer(creator.address, transferAmount);
    await gameToken.transfer(contributor.address, transferAmount);
  });

  describe("Campaign Creation Reputation Rewards", function () {
    it("Should award reputation for campaign creation", async function () {
      // Get initial reputation
      const initialReputation = await sense.getReputation(testOrgId, testProfileId1);
      expect(initialReputation.reputation).to.equal(1000); // Base reputation

      // Create a campaign
      const campaignAmount = ethers.parseEther("1000");
      const currentBlock = await ethers.provider.getBlockNumber();

      const campaignTx = await flow.connect(creator).createCampaign(
        testOrgId,
        "Test Campaign",
        "Campaign description",
        campaignAmount,
        currentBlock + 100, // expiry
        await gameToken.getAddress(),
        ethers.ZeroAddress, // no reward token
        0, // no reward amount
        ethers.ZeroAddress // no beneficiary
      );

      // Wait for transaction
      await campaignTx.wait();

      // Check if reputation was awarded
      const newReputation = await sense.getReputation(testOrgId, testProfileId1);

      // Should have awarded CAMPAIGN_CREATION_REPUTATION (100 points)
      expect(newReputation.reputation).to.equal(1100); // 1000 base + 100 creation reward
    });

    it("Should track reputation history for campaign creation", async function () {
      // Create a campaign
      const campaignAmount = ethers.parseEther("1000");
      const currentBlock = await ethers.provider.getBlockNumber();

      await flow.connect(creator).createCampaign(
        testOrgId,
        "Test Campaign",
        "Campaign description",
        campaignAmount,
        currentBlock + 100,
        await gameToken.getAddress(),
        ethers.ZeroAddress,
        0,
        ethers.ZeroAddress
      );

      // Check reputation history
      const history = await sense.getReputationHistory(testOrgId, testProfileId1);
      expect(history.length).to.be.gt(0);

      // Should have a campaign creation entry
      const creationEntry = history.find(entry =>
        entry.reason === ethers.keccak256(ethers.toUtf8Bytes("CAMPAIGN_CREATION"))
      );
      expect(creationEntry).to.not.be.undefined;
      expect(creationEntry!.delta).to.equal(100);
    });
  });

  describe("Campaign Contribution Reputation Rewards", function () {
    let campaignId: string;

    beforeEach(async function () {
      // Create a campaign first
      const campaignAmount = ethers.parseEther("1000");
      const currentBlock = await ethers.provider.getBlockNumber();

      const campaignTx = await flow.connect(creator).createCampaign(
        testOrgId,
        "Test Campaign",
        "Campaign description",
        campaignAmount,
        currentBlock + 100,
        await gameToken.getAddress(),
        ethers.ZeroAddress,
        0,
        ethers.ZeroAddress
      );

      const campaignReceipt = await campaignTx.wait();
      const campaignEvent = campaignReceipt?.logs.find(log =>
        log.topics[0] === ethers.id("CampaignCreated(bytes32,bytes8,address,string,uint256,uint256,address)")
      );

      expect(campaignEvent).to.not.be.undefined;
      campaignId = ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes32", "bytes8", "address", "string", "uint256", "uint256", "address"],
        campaignEvent!.data
      )[0];
    });

    it("Should award reputation for campaign contributions", async function () {
      // Get initial reputation for contributor
      const initialReputation = await sense.getReputation(testOrgId, testProfileId2);
      expect(initialReputation.reputation).to.equal(1000); // Base reputation

      // Contribute to campaign
      const contributionAmount = ethers.parseEther("100");
      await gameToken.connect(contributor).approve(await flow.getAddress(), contributionAmount);

      const contributeTx = await flow.connect(contributor).contribute(campaignId, contributionAmount);
      await contributeTx.wait();

      // Check if reputation was awarded for contribution
      const newReputation = await sense.getReputation(testOrgId, testProfileId2);

      // Should have awarded CONTRIBUTION_REPUTATION (50 points)
      expect(newReputation.reputation).to.equal(1050); // 1000 base + 50 contribution reward
    });

    it("Should award bonus reputation for large contributions", async function () {
      // Get initial reputation
      const initialReputation = await sense.getReputation(testOrgId, testProfileId2);

      // Make a large contribution (> 1000 tokens threshold)
      const largeContribution = ethers.parseEther("1500");
      await gameToken.connect(contributor).approve(await flow.getAddress(), largeContribution);

      const contributeTx = await flow.connect(contributor).contribute(campaignId, largeContribution);
      await contributeTx.wait();

      // Check if bonus reputation was awarded
      const newReputation = await sense.getReputation(testOrgId, testProfileId2);

      // Should have awarded CONTRIBUTION_REPUTATION (50) + LARGE_CONTRIBUTION_BONUS (100) = 150 points
      expect(newReputation.reputation).to.equal(initialReputation.reputation + BigInt(150));
    });

    it("Should track reputation history for contributions", async function () {
      // Make a contribution
      const contributionAmount = ethers.parseEther("100");
      await gameToken.connect(contributor).approve(await flow.getAddress(), contributionAmount);
      await flow.connect(contributor).contribute(campaignId, contributionAmount);

      // Check reputation history
      const history = await sense.getReputationHistory(testOrgId, testProfileId2);
      expect(history.length).to.be.gt(0);

      // Should have a contribution entry
      const contributionEntry = history.find(entry =>
        entry.reason === ethers.keccak256(ethers.toUtf8Bytes("CONTRIBUTION"))
      );
      expect(contributionEntry).to.not.be.undefined;
      expect(contributionEntry!.delta).to.equal(50);
    });
  });

  describe("Campaign Success Reputation Rewards", function () {
    it("Should award reputation for successful campaigns", async function () {
      // Create a campaign
      const campaignAmount = ethers.parseEther("1000");
      const currentBlock = await ethers.provider.getBlockNumber();

      const campaignTx = await flow.connect(creator).createCampaign(
        testOrgId,
        "Success Test Campaign",
        "Campaign for testing success rewards",
        campaignAmount,
        currentBlock + 100,
        await gameToken.getAddress(),
        ethers.ZeroAddress,
        0,
        ethers.ZeroAddress
      );

      const campaignReceipt = await campaignTx.wait();
      const campaignEvent = campaignReceipt?.logs.find(log =>
        log.topics[0] === ethers.id("CampaignCreated(bytes32,bytes8,address,string,uint256,uint256,address)")
      );

      const campaignId = ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes32", "bytes8", "address", "string", "uint256", "uint256", "address"],
        campaignEvent!.data
      )[0];

      // Contribute enough to reach the target
      await gameToken.connect(contributor).approve(await flow.getAddress(), campaignAmount);
      await flow.connect(contributor).contribute(campaignId, campaignAmount);

      // Get reputation before finalization
      const reputationBeforeFinalization = await sense.getReputation(testOrgId, testProfileId1);

      // Fast forward past campaign expiry
      for (let i = 0; i < 101; i++) {
        await ethers.provider.send("evm_mine", []);
      }

      // Finalize the campaign
      const finalizeTx = await flow.finalizeCampaign(campaignId);
      await finalizeTx.wait();

      // Check if success reputation was awarded
      const reputationAfterFinalization = await sense.getReputation(testOrgId, testProfileId1);

      // Should have awarded CAMPAIGN_SUCCESS_REPUTATION (500 points)
      expect(reputationAfterFinalization.reputation).to.equal(
        reputationBeforeFinalization.reputation + BigInt(500)
      );
    });

    it("Should record positive interactions for successful campaign contributors", async function () {
      // Create and fund a campaign
      const campaignAmount = ethers.parseEther("1000");
      const currentBlock = await ethers.provider.getBlockNumber();

      const campaignTx = await flow.connect(creator).createCampaign(
        testOrgId,
        "Interaction Test Campaign",
        "Campaign for testing contributor interactions",
        campaignAmount,
        currentBlock + 100,
        await gameToken.getAddress(),
        ethers.ZeroAddress,
        0,
        ethers.ZeroAddress
      );

      const campaignReceipt = await campaignTx.wait();
      const campaignEvent = campaignReceipt?.logs.find(log =>
        log.topics[0] === ethers.id("CampaignCreated(bytes32,bytes8,address,string,uint256,uint256,address)")
      );

      const campaignId = ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes32", "bytes8", "address", "string", "uint256", "uint256", "address"],
        campaignEvent!.data
      )[0];

      // Contribute to campaign
      await gameToken.connect(contributor).approve(await flow.getAddress(), campaignAmount);
      await flow.connect(contributor).contribute(campaignId, campaignAmount);

      // Get trust score before finalization
      const trustBefore = await sense.getTrustScore(testOrgId, testProfileId2);

      // Fast forward and finalize
      for (let i = 0; i < 101; i++) {
        await ethers.provider.send("evm_mine", []);
      }
      await flow.finalizeCampaign(campaignId);

      // Check if trust score improved (positive interaction recorded)
      const trustAfter = await sense.getTrustScore(testOrgId, testProfileId2);
      expect(trustAfter).to.be.gt(trustBefore);
    });
  });

  describe("Organization-Scoped Reputation", function () {
    it("Should maintain separate reputation for different organizations", async function () {
      const orgId2 = "0x544553544f524732"; // "TESTORG2" as bytes8

      // Create campaigns in different organizations
      const campaignAmount = ethers.parseEther("1000");
      const currentBlock = await ethers.provider.getBlockNumber();

      // Campaign in first org
      await flow.connect(creator).createCampaign(
        testOrgId,
        "Org1 Campaign",
        "Campaign in first org",
        campaignAmount,
        currentBlock + 100,
        await gameToken.getAddress(),
        ethers.ZeroAddress,
        0,
        ethers.ZeroAddress
      );

      // Campaign in second org
      await flow.connect(creator).createCampaign(
        orgId2,
        "Org2 Campaign",
        "Campaign in second org",
        campaignAmount,
        currentBlock + 100,
        await gameToken.getAddress(),
        ethers.ZeroAddress,
        0,
        ethers.ZeroAddress
      );

      // Check reputation is scoped correctly
      const org1Reputation = await sense.getReputation(testOrgId, testProfileId1);
      const org2Reputation = await sense.getReputation(orgId2, testProfileId1);

      expect(org1Reputation.reputation).to.equal(1100); // 1000 base + 100 creation
      expect(org2Reputation.reputation).to.equal(1100); // 1000 base + 100 creation
      expect(org1Reputation.organizationId).to.equal(testOrgId);
      expect(org2Reputation.organizationId).to.equal(orgId2);
    });
  });
});
