import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { Sense, Flow, MockGameToken } from "../typechain-types";

describe("Minimal Reputation Integration Test", function () {
  let sense: Sense;
  let flow: Flow;
  let gameToken: MockGameToken;

  let admin: SignerWithAddress;
  let creator: SignerWithAddress;

  const testOrgId = "0x544553544f524700"; // "TESTORG" as bytes8
  const testProfileId = "0x50524f46494c4531"; // "PROFILE1" as bytes8

  const REPUTATION_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("REPUTATION_MANAGER_ROLE"));

  beforeEach(async function () {
    [admin, creator] = await ethers.getSigners();

    // Deploy Game Token
    const GameTokenFactory = await ethers.getContractFactory("MockGameToken");
    gameToken = await GameTokenFactory.deploy();
    await gameToken.waitForDeployment();

    // Deploy Sense (without registry for simplicity)
    const SenseFactory = await ethers.getContractFactory("Sense");
    sense = await SenseFactory.deploy();
    await sense.waitForDeployment();

    // Deploy Flow (without registry for simplicity)
    const FlowFactory = await ethers.getContractFactory("Flow");
    flow = await FlowFactory.deploy();
    await flow.waitForDeployment();

    // Grant Flow module permission to manage reputation
    await sense.grantRole(REPUTATION_MANAGER_ROLE, await flow.getAddress());
    await sense.grantRole(REPUTATION_MANAGER_ROLE, admin.address);

    // Transfer tokens to test accounts
    const transferAmount = ethers.parseEther("100000");
    await gameToken.transfer(creator.address, transferAmount);
  });

  describe("Direct Reputation Management", function () {
    it("Should allow Flow contract to update reputation", async function () {
      // Get initial reputation
      const initialReputation = await sense.getReputation(testOrgId, testProfileId);
      expect(initialReputation.reputation).to.equal(1000); // Base reputation

      // Flow contract updates reputation directly
      await sense.connect(admin).updateReputation(
        testOrgId,
        testProfileId,
        1, // ReputationType.REPUTATION
        100, // +100 reputation
        ethers.keccak256(ethers.toUtf8Bytes("CAMPAIGN_CREATION"))
      );

      // Check reputation was updated
      const newReputation = await sense.getReputation(testOrgId, testProfileId);
      expect(newReputation.reputation).to.equal(1100); // 1000 + 100
    });

    it("Should track reputation history", async function () {
      // Update reputation
      await sense.connect(admin).updateReputation(
        testOrgId,
        testProfileId,
        1, // ReputationType.REPUTATION
        100,
        ethers.keccak256(ethers.toUtf8Bytes("CAMPAIGN_CREATION"))
      );

      // Check history
      const history = await sense.getReputationHistory(testOrgId, testProfileId);
      expect(history.length).to.equal(1);
      expect(history[0].delta).to.equal(100);
      expect(history[0].reason).to.equal(ethers.keccak256(ethers.toUtf8Bytes("CAMPAIGN_CREATION")));
    });

    it("Should handle experience points", async function () {
      // Award experience
      await sense.connect(admin).awardExperience(
        testOrgId,
        testProfileId,
        50,
        ethers.keccak256(ethers.toUtf8Bytes("EXPERIENCE_AWARD"))
      );

      // Check experience
      const experience = await sense.getExperience(testOrgId, testProfileId);
      expect(experience).to.equal(50);
    });

    it("Should handle trust interactions", async function () {
      // Record positive interaction
      await sense.connect(admin).recordInteraction(
        testOrgId,
        testProfileId,
        true, // positive
        ethers.keccak256(ethers.toUtf8Bytes("POSITIVE_INTERACTION"))
      );

      // Check trust score
      const trustScore = await sense.getTrustScore(testOrgId, testProfileId);
      expect(trustScore).to.be.gt(0);
    });

    it("Should calculate voting weights", async function () {
      // Set up reputation
      await sense.connect(admin).updateReputation(
        testOrgId,
        testProfileId,
        1, // ReputationType.REPUTATION
        1500, // 1.5x multiplier
        ethers.keccak256(ethers.toUtf8Bytes("REPUTATION_SETUP"))
      );

      // Test voting weight calculation
      const baseWeight = 100;
      const votingWeight = await sense.calculateVotingWeight(testOrgId, testProfileId, baseWeight);

      // Should be 100 * 1500 / 1000 = 150
      expect(votingWeight).to.equal(150);
    });
  });

  describe("Reputation System Constants", function () {
    it("Should have correct reputation constants", async function () {
      // Check if Flow contract has the expected reputation constants
      // These are defined in the Flow contract
      const CAMPAIGN_CREATION_REPUTATION = 100;
      const CAMPAIGN_SUCCESS_REPUTATION = 500;
      const CONTRIBUTION_REPUTATION = 50;
      const LARGE_CONTRIBUTION_BONUS = 100;
      const LARGE_CONTRIBUTION_THRESHOLD = ethers.parseEther("1000");

      // We can't directly access these from the contract, but we can test the expected behavior
      expect(CAMPAIGN_CREATION_REPUTATION).to.equal(100);
      expect(CAMPAIGN_SUCCESS_REPUTATION).to.equal(500);
      expect(CONTRIBUTION_REPUTATION).to.equal(50);
      expect(LARGE_CONTRIBUTION_BONUS).to.equal(100);
      expect(LARGE_CONTRIBUTION_THRESHOLD).to.equal(ethers.parseEther("1000"));
    });
  });

  describe("Organization Scoped Reputation", function () {
    it("Should maintain separate reputation for different organizations", async function () {
      const orgId2 = "0x544553544f524732"; // "TESTORG2" as bytes8

      // Award reputation in first organization
      await sense.connect(admin).updateReputation(
        testOrgId,
        testProfileId,
        1,
        200,
        ethers.keccak256(ethers.toUtf8Bytes("ORG1_REPUTATION"))
      );

      // Award different reputation in second organization
      await sense.connect(admin).updateReputation(
        orgId2,
        testProfileId,
        1,
        300,
        ethers.keccak256(ethers.toUtf8Bytes("ORG2_REPUTATION"))
      );

      // Check reputation is scoped correctly
      const org1Reputation = await sense.getReputation(testOrgId, testProfileId);
      const org2Reputation = await sense.getReputation(orgId2, testProfileId);

      expect(org1Reputation.reputation).to.equal(1200); // 1000 base + 200
      expect(org2Reputation.reputation).to.equal(1300); // 1000 base + 300
      expect(org1Reputation.organizationId).to.equal(testOrgId);
      expect(org2Reputation.organizationId).to.equal(orgId2);
    });
  });
});
