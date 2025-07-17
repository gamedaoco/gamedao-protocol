import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { Registry, Sense } from "../typechain-types";

describe("Reputation System Basic Tests", function () {
  let registry: Registry;
  let sense: Sense;
  let admin: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  const testOrgId = "0x544553544f524700"; // "TESTORG" as bytes8
  const testProfileId1 = "0x50524f46494c4531"; // "PROFILE1" as bytes8
  const testProfileId2 = "0x50524f46494c4532"; // "PROFILE2" as bytes8

  beforeEach(async function () {
    [admin, user1, user2] = await ethers.getSigners();

    // Deploy Registry
    const RegistryFactory = await ethers.getContractFactory("Registry");
    registry = await RegistryFactory.deploy(admin.address);
    await registry.waitForDeployment();

    // Deploy Sense
    const SenseFactory = await ethers.getContractFactory("Sense");
    sense = await SenseFactory.deploy();
    await sense.waitForDeployment();

    // Register and enable Sense module
    await registry.registerModule(await sense.getAddress());
    await registry.enableModule(await sense.getAddress());

    // Initialize Sense
    await sense.initialize(await registry.getAddress());

    // Grant reputation manager role to admin for testing
    const REPUTATION_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("REPUTATION_MANAGER_ROLE"));
    await sense.grantRole(REPUTATION_MANAGER_ROLE, admin.address);
  });

  describe("Basic Reputation Management", function () {
    it("Should update reputation correctly", async function () {
      // Update reputation
      await sense.connect(admin).updateReputation(
        testOrgId,
        testProfileId1,
        1, // ReputationType.REPUTATION
        500, // +500 reputation points
        ethers.keccak256(ethers.toUtf8Bytes("TEST_REWARD"))
      );

      // Get reputation data
      const reputationData = await sense.getReputation(testOrgId, testProfileId1);

      expect(reputationData.reputation).to.equal(500);
      expect(reputationData.organizationId).to.equal(testOrgId);
      expect(reputationData.lastUpdated).to.be.gt(0);
    });

    it("Should award experience points correctly", async function () {
      // Award experience
      await sense.connect(admin).awardExperience(
        testOrgId,
        testProfileId1,
        100,
        ethers.keccak256(ethers.toUtf8Bytes("EXPERIENCE_AWARD"))
      );

      // Check experience
      const experience = await sense.getExperience(testOrgId, testProfileId1);
      expect(experience).to.equal(100);

      // Check in reputation data too
      const reputationData = await sense.getReputation(testOrgId, testProfileId1);
      expect(reputationData.experience).to.equal(100);
    });

    it("Should record trust interactions correctly", async function () {
      // Record positive interaction
      await sense.connect(admin).recordInteraction(
        testOrgId,
        testProfileId1,
        true, // positive
        ethers.keccak256(ethers.toUtf8Bytes("POSITIVE_INTERACTION"))
      );

      // Check trust score
      const trustScore = await sense.getTrustScore(testOrgId, testProfileId1);
      expect(trustScore).to.be.gt(0);

      // Check in reputation data
      const reputationData = await sense.getReputation(testOrgId, testProfileId1);
      expect(reputationData.totalInteractions).to.equal(1);
      expect(reputationData.positiveInteractions).to.equal(1);
      expect(reputationData.trust).to.be.gt(0);
    });

    it("Should calculate voting weights based on reputation", async function () {
      // Set up reputation
      await sense.connect(admin).updateReputation(
        testOrgId,
        testProfileId1,
        1, // ReputationType.REPUTATION
        1500, // 1.5x multiplier (1500/1000)
        ethers.keccak256(ethers.toUtf8Bytes("REPUTATION_SETUP"))
      );

      // Test voting weight calculation
      const baseWeight = 100;
      const votingWeight = await sense.calculateVotingWeight(testOrgId, testProfileId1, baseWeight);

      // Should be 100 * 1500 / 1000 = 150
      expect(votingWeight).to.equal(150);
    });

    it("Should handle organization-scoped reputation", async function () {
      const orgId2 = "0x544553544f524732"; // "TESTORG2" as bytes8

      // Award different reputation in different organizations
      await sense.connect(admin).updateReputation(
        testOrgId,
        testProfileId1,
        1, // ReputationType.REPUTATION
        100,
        ethers.keccak256(ethers.toUtf8Bytes("ORG1_AWARD"))
      );

      await sense.connect(admin).updateReputation(
        orgId2,
        testProfileId1,
        1, // ReputationType.REPUTATION
        200,
        ethers.keccak256(ethers.toUtf8Bytes("ORG2_AWARD"))
      );

      // Check reputation is scoped correctly
      const org1Reputation = await sense.getReputation(testOrgId, testProfileId1);
      const org2Reputation = await sense.getReputation(orgId2, testProfileId1);

      expect(org1Reputation.reputation).to.equal(100);
      expect(org2Reputation.reputation).to.equal(200);
      expect(org1Reputation.organizationId).to.equal(testOrgId);
      expect(org2Reputation.organizationId).to.equal(orgId2);
    });

    it("Should handle negative reputation changes", async function () {
      // Start with some reputation
      await sense.connect(admin).updateReputation(
        testOrgId,
        testProfileId1,
        1, // ReputationType.REPUTATION
        1000,
        ethers.keccak256(ethers.toUtf8Bytes("INITIAL_REPUTATION"))
      );

      // Apply negative change
      await sense.connect(admin).updateReputation(
        testOrgId,
        testProfileId1,
        1, // ReputationType.REPUTATION
        -300, // negative change
        ethers.keccak256(ethers.toUtf8Bytes("REPUTATION_PENALTY"))
      );

      // Check reputation decreased
      const reputationData = await sense.getReputation(testOrgId, testProfileId1);
      expect(reputationData.reputation).to.equal(700);
    });

    it("Should track reputation history", async function () {
      // Make several reputation changes
      await sense.connect(admin).updateReputation(
        testOrgId,
        testProfileId1,
        1, // ReputationType.REPUTATION
        100,
        ethers.keccak256(ethers.toUtf8Bytes("FIRST_AWARD"))
      );

      await sense.connect(admin).updateReputation(
        testOrgId,
        testProfileId1,
        1, // ReputationType.REPUTATION
        50,
        ethers.keccak256(ethers.toUtf8Bytes("SECOND_AWARD"))
      );

      // Get reputation history
      const history = await sense.getReputationHistory(testOrgId, testProfileId1);

      expect(history.length).to.equal(2);
      expect(history[0].delta).to.equal(100);
      expect(history[1].delta).to.equal(50);
      expect(history[0].reason).to.equal(ethers.keccak256(ethers.toUtf8Bytes("FIRST_AWARD")));
      expect(history[1].reason).to.equal(ethers.keccak256(ethers.toUtf8Bytes("SECOND_AWARD")));
    });

    it("Should handle multiple reputation types", async function () {
      // Update all reputation types
      await sense.connect(admin).updateReputation(
        testOrgId,
        testProfileId1,
        0, // ReputationType.EXPERIENCE
        100,
        ethers.keccak256(ethers.toUtf8Bytes("EXPERIENCE_UPDATE"))
      );

      await sense.connect(admin).updateReputation(
        testOrgId,
        testProfileId1,
        1, // ReputationType.REPUTATION
        500,
        ethers.keccak256(ethers.toUtf8Bytes("REPUTATION_UPDATE"))
      );

      await sense.connect(admin).updateReputation(
        testOrgId,
        testProfileId1,
        2, // ReputationType.TRUST
        50,
        ethers.keccak256(ethers.toUtf8Bytes("TRUST_UPDATE"))
      );

      // Check all values
      const reputationData = await sense.getReputation(testOrgId, testProfileId1);
      expect(reputationData.experience).to.equal(100);
      expect(reputationData.reputation).to.equal(500);
      expect(reputationData.trust).to.equal(50);
    });
  });

  describe("Access Control", function () {
    it("Should require REPUTATION_MANAGER_ROLE for reputation updates", async function () {
      await expect(
        sense.connect(user1).updateReputation(
          testOrgId,
          testProfileId1,
          1,
          100,
          ethers.keccak256(ethers.toUtf8Bytes("UNAUTHORIZED"))
        )
      ).to.be.revertedWith("Not authorized");
    });

    it("Should require REPUTATION_MANAGER_ROLE for experience awards", async function () {
      await expect(
        sense.connect(user1).awardExperience(
          testOrgId,
          testProfileId1,
          100,
          ethers.keccak256(ethers.toUtf8Bytes("UNAUTHORIZED"))
        )
      ).to.be.revertedWith("Not authorized");
    });

    it("Should require REPUTATION_MANAGER_ROLE for trust interactions", async function () {
      await expect(
        sense.connect(user1).recordInteraction(
          testOrgId,
          testProfileId1,
          true,
          ethers.keccak256(ethers.toUtf8Bytes("UNAUTHORIZED"))
        )
      ).to.be.revertedWith("Not authorized");
    });
  });
});
