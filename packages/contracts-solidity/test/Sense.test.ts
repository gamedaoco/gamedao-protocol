import { expect } from "chai";
import { ethers } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { GameDAORegistry, Control, Sense } from "../typechain-types";

describe("Sense Module", function () {
  let registry: GameDAORegistry;
  let control: Control;
  let sense: Sense;
  let owner: HardhatEthersSigner;
  let member1: HardhatEthersSigner;
  let member2: HardhatEthersSigner;
  let member3: HardhatEthersSigner;
  let nonMember: HardhatEthersSigner;
  let testOrgId: string;
  let testProfileId: string;

  beforeEach(async function () {
    [owner, member1, member2, member3, nonMember] = await ethers.getSigners();

    // Deploy GameDAO Registry
    const GameDAORegistry = await ethers.getContractFactory("GameDAORegistry");
    registry = await GameDAORegistry.deploy(owner.address);
    await registry.waitForDeployment();

    // Deploy Control Module
    const Control = await ethers.getContractFactory("Control");
    control = await Control.deploy();
    await control.waitForDeployment();

    // Deploy Sense Module
    const Sense = await ethers.getContractFactory("Sense");
    sense = await Sense.deploy();
    await sense.waitForDeployment();

        // Register and enable modules
    await registry.registerModule(await control.getAddress());
    await registry.enableModule(await control.moduleId());

    await registry.registerModule(await sense.getAddress());
    await registry.enableModule(await sense.moduleId());

    // Create test organization
    const tx = await control.createOrganization(
      "Test DAO",
      "Test DAO for Sense module testing",
      0, // OrgType.Community
      0, // AccessModel.Open
      0, // FeeModel.NoFees
      10, // Member limit
      0, // Membership fee
      0  // Game stake required
    );

    const receipt = await tx.wait();
    const event = receipt?.logs.find(log => {
      try {
        const parsed = control.interface.parseLog(log);
        return parsed?.name === "OrganizationCreated";
      } catch {
        return false;
      }
    });

    if (event) {
      const parsed = control.interface.parseLog(event);
      testOrgId = parsed?.args[0];
    }

    // Add members to organization
    await control.addMember(testOrgId, member1.address);
    await control.addMember(testOrgId, member2.address);
    await control.addMember(testOrgId, member3.address);
  });

  describe("Deployment and Initialization", function () {
    it("Should deploy Sense module correctly", async function () {
      expect(await sense.getAddress()).to.be.properAddress;
      expect(await sense.moduleId()).to.equal(ethers.keccak256(ethers.toUtf8Bytes("SENSE")));
      expect(await sense.version()).to.equal("1.0.0");
    });

    it("Should initialize with correct roles", async function () {
      const SENSE_ADMIN_ROLE = await sense.SENSE_ADMIN_ROLE();
      const REPUTATION_MANAGER_ROLE = await sense.REPUTATION_MANAGER_ROLE();
      const ACHIEVEMENT_GRANTER_ROLE = await sense.ACHIEVEMENT_GRANTER_ROLE();
      const VERIFIER_ROLE = await sense.VERIFIER_ROLE();

      expect(await sense.hasRole(SENSE_ADMIN_ROLE, owner.address)).to.be.true;
      expect(await sense.hasRole(REPUTATION_MANAGER_ROLE, owner.address)).to.be.true;
      expect(await sense.hasRole(ACHIEVEMENT_GRANTER_ROLE, owner.address)).to.be.true;
      expect(await sense.hasRole(VERIFIER_ROLE, owner.address)).to.be.true;
    });

    it("Should have correct module configuration", async function () {
      expect(await sense.registry()).to.equal(await registry.getAddress());
      expect(await sense.isInitialized()).to.be.true;
    });
  });

  describe("Profile Management", function () {
    it("Should create profile successfully", async function () {
      const metadata = "QmTestProfileMetadata";

      const tx = await sense.connect(member1).createProfile(testOrgId, metadata);

      await expect(tx).to.emit(sense, "ProfileCreated");

      const receipt = await tx.wait();
      const event = receipt?.logs.find(log => {
        try {
          const parsed = sense.interface.parseLog(log);
          return parsed?.name === "ProfileCreated";
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = sense.interface.parseLog(event);
        testProfileId = parsed?.args[0];
      }

      const profile = await sense.getProfile(testProfileId);
      expect(profile.owner).to.equal(member1.address);
      expect(profile.organizationId).to.equal(testOrgId);
      expect(profile.metadata).to.equal(metadata);
      expect(profile.active).to.be.true;
      expect(profile.verified).to.be.false;
    });

    it("Should prevent duplicate profiles for same owner and organization", async function () {
      await sense.connect(member1).createProfile(testOrgId, "metadata1");

      await expect(
        sense.connect(member1).createProfile(testOrgId, "metadata2")
      ).to.be.revertedWithCustomError(sense, "ProfileAlreadyExists");
    });

    it("Should update profile successfully", async function () {
      const tx = await sense.connect(member1).createProfile(testOrgId, "original");
      const receipt = await tx.wait();
      const event = receipt?.logs.find(log => {
        try {
          const parsed = sense.interface.parseLog(log);
          return parsed?.name === "ProfileCreated";
        } catch {
          return false;
        }
      });

      let profileId = "";
      if (event) {
        const parsed = sense.interface.parseLog(event);
        profileId = parsed?.args[0];
      }

      const newMetadata = "QmUpdatedMetadata";
      await expect(
        sense.connect(member1).updateProfile(profileId, newMetadata)
      ).to.emit(sense, "ProfileUpdated");

      const profile = await sense.getProfile(profileId);
      expect(profile.metadata).to.equal(newMetadata);
    });

    it("Should prevent unauthorized profile updates", async function () {
      const tx = await sense.connect(member1).createProfile(testOrgId, "metadata");
      const receipt = await tx.wait();
      const event = receipt?.logs.find(log => {
        try {
          const parsed = sense.interface.parseLog(log);
          return parsed?.name === "ProfileCreated";
        } catch {
          return false;
        }
      });

      let profileId = "";
      if (event) {
        const parsed = sense.interface.parseLog(event);
        profileId = parsed?.args[0];
      }

      await expect(
        sense.connect(member2).updateProfile(profileId, "hacked")
      ).to.be.revertedWithCustomError(sense, "UnauthorizedProfileAccess");
    });

    it("Should get profile by owner and organization", async function () {
      await sense.connect(member1).createProfile(testOrgId, "metadata");

      const profile = await sense.getProfileByOwner(member1.address, testOrgId);
      expect(profile.owner).to.equal(member1.address);
      expect(profile.organizationId).to.equal(testOrgId);
    });

    it("Should check profile existence", async function () {
      const tx = await sense.connect(member1).createProfile(testOrgId, "metadata");
      const receipt = await tx.wait();
      const event = receipt?.logs.find(log => {
        try {
          const parsed = sense.interface.parseLog(log);
          return parsed?.name === "ProfileCreated";
        } catch {
          return false;
        }
      });

      let profileId = "";
      if (event) {
        const parsed = sense.interface.parseLog(event);
        profileId = parsed?.args[0];
      }

      expect(await sense.profileExists(profileId)).to.be.true;
      expect(await sense.profileExists(ethers.keccak256(ethers.toUtf8Bytes("fake")))).to.be.false;
    });

    it("Should verify profile with different levels", async function () {
      const tx = await sense.connect(member1).createProfile(testOrgId, "metadata");
      const receipt = await tx.wait();
      const event = receipt?.logs.find(log => {
        try {
          const parsed = sense.interface.parseLog(log);
          return parsed?.name === "ProfileCreated";
        } catch {
          return false;
        }
      });

      let profileId = "";
      if (event) {
        const parsed = sense.interface.parseLog(event);
        profileId = parsed?.args[0];
      }

      // Verify with BASIC level (1)
      await expect(
        sense.verifyProfile(profileId, 1)
      ).to.emit(sense, "ProfileVerified");

      const profile = await sense.getProfile(profileId);
      expect(profile.verified).to.be.true;
    });
  });

  describe("Reputation System", function () {
    beforeEach(async function () {
      const tx = await sense.connect(member1).createProfile(testOrgId, "metadata");
      const receipt = await tx.wait();
      const event = receipt?.logs.find(log => {
        try {
          const parsed = sense.interface.parseLog(log);
          return parsed?.name === "ProfileCreated";
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = sense.interface.parseLog(event);
        testProfileId = parsed?.args[0];
      }
    });

    it("Should initialize reputation correctly", async function () {
      const reputation = await sense.getReputation(testProfileId);
      expect(reputation.experience).to.equal(0);
      expect(reputation.reputation).to.equal(1000); // Neutral reputation
      expect(reputation.trust).to.equal(0);
      expect(reputation.totalFeedbacks).to.equal(0);
      expect(reputation.positiveFeedbacks).to.equal(0);
    });

    it("Should update experience reputation", async function () {
      const delta = 100;
      const reason = ethers.keccak256(ethers.toUtf8Bytes("Quest completion"));

      await expect(
        sense.updateReputation(testProfileId, 0, delta, reason) // EXPERIENCE = 0
      ).to.emit(sense, "ReputationUpdated");

      const reputation = await sense.getReputation(testProfileId);
      expect(reputation.experience).to.equal(delta);
    });

    it("Should update reputation score", async function () {
      const delta = 200;
      const reason = ethers.keccak256(ethers.toUtf8Bytes("Good behavior"));

      await sense.updateReputation(testProfileId, 1, delta, reason); // REPUTATION = 1

      const reputation = await sense.getReputation(testProfileId);
      expect(reputation.reputation).to.equal(1200); // 1000 + 200
    });

    it("Should update trust score", async function () {
      const delta = 50;
      const reason = ethers.keccak256(ethers.toUtf8Bytes("Positive feedback"));

      await sense.updateReputation(testProfileId, 2, delta, reason); // TRUST = 2

      const reputation = await sense.getReputation(testProfileId);
      expect(reputation.trust).to.equal(delta);
    });

    it("Should handle negative reputation deltas", async function () {
      // First add some reputation
      await sense.updateReputation(testProfileId, 1, 500, ethers.keccak256(ethers.toUtf8Bytes("initial")));

      // Then subtract some
      await sense.updateReputation(testProfileId, 1, -200, ethers.keccak256(ethers.toUtf8Bytes("penalty")));

      const reputation = await sense.getReputation(testProfileId);
      expect(reputation.reputation).to.equal(1300); // 1000 + 500 - 200
    });

    it("Should prevent reputation from going below zero", async function () {
      await sense.updateReputation(testProfileId, 1, -2000, ethers.keccak256(ethers.toUtf8Bytes("big penalty")));

      const reputation = await sense.getReputation(testProfileId);
      expect(reputation.reputation).to.equal(0);
    });

    it("Should track reputation history", async function () {
      const reason1 = ethers.keccak256(ethers.toUtf8Bytes("First update"));
      const reason2 = ethers.keccak256(ethers.toUtf8Bytes("Second update"));

      await sense.updateReputation(testProfileId, 0, 100, reason1);
      await sense.updateReputation(testProfileId, 1, 200, reason2);

      const history = await sense.getReputationHistory(testProfileId);
      expect(history.length).to.equal(2);
      expect(history[0].delta).to.equal(100);
      expect(history[0].reason).to.equal(reason1);
      expect(history[1].delta).to.equal(200);
      expect(history[1].reason).to.equal(reason2);
    });

    it("Should update category-specific reputation", async function () {
      const category = ethers.keccak256(ethers.toUtf8Bytes("GOVERNANCE"));
      const delta = 150;
      const reason = ethers.keccak256(ethers.toUtf8Bytes("Good proposal"));

      await expect(
        sense.updateCategoryReputation(testProfileId, category, delta, reason)
      ).to.emit(sense, "ReputationUpdated");

      const categoryScore = await sense.getCategoryReputation(testProfileId, category);
      expect(categoryScore).to.equal(delta);
    });

    it("Should reject invalid reputation deltas", async function () {
      const invalidDelta = 20000; // Exceeds MAX_REPUTATION_DELTA
      const reason = ethers.keccak256(ethers.toUtf8Bytes("invalid"));

      await expect(
        sense.updateReputation(testProfileId, 0, invalidDelta, reason)
      ).to.be.revertedWithCustomError(sense, "InvalidReputationDelta");
    });
  });

  describe("Achievement System", function () {
    beforeEach(async function () {
      const tx = await sense.connect(member1).createProfile(testOrgId, "metadata");
      const receipt = await tx.wait();
      const event = receipt?.logs.find(log => {
        try {
          const parsed = sense.interface.parseLog(log);
          return parsed?.name === "ProfileCreated";
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = sense.interface.parseLog(event);
        testProfileId = parsed?.args[0];
      }
    });

    it("Should grant achievement successfully", async function () {
      const achievementId = ethers.keccak256(ethers.toUtf8Bytes("FIRST_PROPOSAL"));
      const name = "First Proposal";
      const description = "Created your first governance proposal";
      const category = "GOVERNANCE";
      const points = 100;
      const data = ethers.toUtf8Bytes("achievement data");

      await expect(
        sense.grantAchievement(testProfileId, achievementId, name, description, category, points, data)
      ).to.emit(sense, "AchievementGranted");

      const achievements = await sense.getAchievements(testProfileId);
      expect(achievements.length).to.equal(1);
      expect(achievements[0].name).to.equal(name);
      expect(achievements[0].points).to.equal(points);

      // Check that experience was awarded
      const reputation = await sense.getReputation(testProfileId);
      expect(reputation.experience).to.equal(points);
    });

    it("Should prevent duplicate achievements", async function () {
      const achievementId = ethers.keccak256(ethers.toUtf8Bytes("DUPLICATE_TEST"));

      await sense.grantAchievement(testProfileId, achievementId, "Test", "Test", "TEST", 50, "0x");

      await expect(
        sense.grantAchievement(testProfileId, achievementId, "Test2", "Test2", "TEST", 50, "0x")
      ).to.be.revertedWithCustomError(sense, "AchievementAlreadyGranted");
    });

    it("Should get achievements by category", async function () {
      const govAchievement = ethers.keccak256(ethers.toUtf8Bytes("GOV_ACHIEVEMENT"));
      const socialAchievement = ethers.keccak256(ethers.toUtf8Bytes("SOCIAL_ACHIEVEMENT"));

      await sense.grantAchievement(testProfileId, govAchievement, "Gov", "Gov", "GOVERNANCE", 100, "0x");
      await sense.grantAchievement(testProfileId, socialAchievement, "Social", "Social", "SOCIAL", 50, "0x");

      const govAchievements = await sense.getAchievementsByCategory(testProfileId, "GOVERNANCE");
      const socialAchievements = await sense.getAchievementsByCategory(testProfileId, "SOCIAL");

      expect(govAchievements.length).to.equal(1);
      expect(socialAchievements.length).to.equal(1);
      expect(govAchievements[0].name).to.equal("Gov");
      expect(socialAchievements[0].name).to.equal("Social");
    });

    it("Should check if profile has achievement", async function () {
      const achievementId = ethers.keccak256(ethers.toUtf8Bytes("TEST_ACHIEVEMENT"));

      expect(await sense.hasAchievement(testProfileId, achievementId)).to.be.false;

      await sense.grantAchievement(testProfileId, achievementId, "Test", "Test", "TEST", 50, "0x");

      expect(await sense.hasAchievement(testProfileId, achievementId)).to.be.true;
    });
  });

  describe("Social Features", function () {
    let targetProfileId: string;

    beforeEach(async function () {
      // Create profiles for member1 and member2
      const tx1 = await sense.connect(member1).createProfile(testOrgId, "member1");
      const receipt1 = await tx1.wait();
      const event1 = receipt1?.logs.find(log => {
        try {
          const parsed = sense.interface.parseLog(log);
          return parsed?.name === "ProfileCreated";
        } catch {
          return false;
        }
      });

      if (event1) {
        const parsed = sense.interface.parseLog(event1);
        testProfileId = parsed?.args[0];
      }

      const tx2 = await sense.connect(member2).createProfile(testOrgId, "member2");
      const receipt2 = await tx2.wait();
      const event2 = receipt2?.logs.find(log => {
        try {
          const parsed = sense.interface.parseLog(log);
          return parsed?.name === "ProfileCreated";
        } catch {
          return false;
        }
      });

      if (event2) {
        const parsed = sense.interface.parseLog(event2);
        targetProfileId = parsed?.args[0];
      }
    });

    it("Should submit feedback successfully", async function () {
      await expect(
        sense.connect(member1).submitFeedback(targetProfileId, 0, 5, "Excellent work!") // POSITIVE = 0
      ).to.emit(sense, "FeedbackSubmitted");

      const summary = await sense.getFeedbackSummary(targetProfileId);
      expect(summary.totalFeedbacks).to.equal(1);
      expect(summary.positiveFeedbacks).to.equal(1);
      expect(summary.averageRating).to.equal(500); // 5.00 * 100
    });

    it("Should prevent self-feedback", async function () {
      await expect(
        sense.connect(member1).submitFeedback(testProfileId, 0, 5, "Self feedback")
      ).to.be.revertedWithCustomError(sense, "SelfFeedbackNotAllowed");
    });

    it("Should reject invalid ratings", async function () {
      await expect(
        sense.connect(member1).submitFeedback(targetProfileId, 0, 0, "Invalid rating")
      ).to.be.revertedWithCustomError(sense, "InvalidFeedbackRating");

      await expect(
        sense.connect(member1).submitFeedback(targetProfileId, 0, 6, "Invalid rating")
      ).to.be.revertedWithCustomError(sense, "InvalidFeedbackRating");
    });

    it("Should update existing feedback instead of creating duplicate", async function () {
      // Submit initial feedback
      await sense.connect(member1).submitFeedback(targetProfileId, 0, 4, "Good work");

      // Submit updated feedback from same user
      await sense.connect(member1).submitFeedback(targetProfileId, 0, 5, "Excellent work!");

      const summary = await sense.getFeedbackSummary(targetProfileId);
      expect(summary.totalFeedbacks).to.equal(1); // Should still be 1, not 2
      expect(summary.averageRating).to.equal(500); // Should reflect updated rating
    });

    it("Should calculate feedback summary correctly", async function () {
      // Multiple feedbacks from different users
      await sense.connect(member1).submitFeedback(targetProfileId, 0, 5, "Excellent"); // POSITIVE
      await sense.connect(member3).submitFeedback(targetProfileId, 1, 2, "Poor"); // NEGATIVE

      const summary = await sense.getFeedbackSummary(targetProfileId);
      expect(summary.totalFeedbacks).to.equal(2);
      expect(summary.positiveFeedbacks).to.equal(1);
      expect(summary.negativeFeedbacks).to.equal(1);
      expect(summary.averageRating).to.equal(350); // (5 + 2) / 2 * 100 = 350
    });

    it("Should get individual feedbacks with pagination", async function () {
      await sense.connect(member1).submitFeedback(targetProfileId, 0, 5, "Great!");
      await sense.connect(member3).submitFeedback(targetProfileId, 0, 4, "Good!");

      const feedbacks = await sense.getFeedbacks(targetProfileId, 0, 10);
      expect(feedbacks.length).to.equal(2);
      expect(feedbacks[0].giver).to.equal(member1.address);
      expect(feedbacks[1].giver).to.equal(member3.address);
    });
  });

  describe("Cross-DAO Features", function () {
    beforeEach(async function () {
      const tx = await sense.connect(member1).createProfile(testOrgId, "metadata");
      const receipt = await tx.wait();
      const event = receipt?.logs.find(log => {
        try {
          const parsed = sense.interface.parseLog(log);
          return parsed?.name === "ProfileCreated";
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = sense.interface.parseLog(event);
        testProfileId = parsed?.args[0];
      }

      // Add some reputation and achievements for export
      await sense.updateReputation(testProfileId, 0, 500, ethers.keccak256(ethers.toUtf8Bytes("test")));
      await sense.updateReputation(testProfileId, 1, 300, ethers.keccak256(ethers.toUtf8Bytes("test")));
    });

    it("Should export reputation successfully", async function () {
      const exportData = await sense.connect(member1).exportReputation(testProfileId);

      expect(exportData.sourceProfileId).to.equal(testProfileId);
      expect(exportData.owner).to.equal(member1.address);
      expect(exportData.reputation.experience).to.equal(500);
      expect(exportData.reputation.reputation).to.equal(1300); // 1000 + 300
      expect(exportData.merkleRoot).to.not.equal(ethers.ZeroHash);
    });

    it("Should prevent unauthorized reputation export", async function () {
      await expect(
        sense.connect(member2).exportReputation(testProfileId)
      ).to.be.revertedWithCustomError(sense, "UnauthorizedProfileAccess");
    });

    it("Should import reputation with verification", async function () {
      // Create another profile for import testing
      const tx = await sense.connect(member2).createProfile(testOrgId, "import_target");
      const receipt = await tx.wait();
      const event = receipt?.logs.find(log => {
        try {
          const parsed = sense.interface.parseLog(log);
          return parsed?.name === "ProfileCreated";
        } catch {
          return false;
        }
      });

      let importProfileId = "";
      if (event) {
        const parsed = sense.interface.parseLog(event);
        importProfileId = parsed?.args[0];
      }

      // Export from first profile
      const rawExportData = await sense.connect(member1).exportReputation(testProfileId);

      // Create a clean copy of the export data to avoid readonly array issues
      const exportData = {
        sourceProfileId: rawExportData.sourceProfileId,
        owner: rawExportData.owner,
        sourceOrganizationId: rawExportData.sourceOrganizationId,
        reputation: {
          experience: rawExportData.reputation.experience,
          reputation: rawExportData.reputation.reputation,
          trust: rawExportData.reputation.trust,
          lastUpdated: rawExportData.reputation.lastUpdated,
          totalFeedbacks: rawExportData.reputation.totalFeedbacks,
          positiveFeedbacks: rawExportData.reputation.positiveFeedbacks
        },
        achievements: [...rawExportData.achievements], // Create a new array
        feedbackSummary: {
          totalFeedbacks: rawExportData.feedbackSummary.totalFeedbacks,
          positiveFeedbacks: rawExportData.feedbackSummary.positiveFeedbacks,
          negativeFeedbacks: rawExportData.feedbackSummary.negativeFeedbacks,
          neutralFeedbacks: rawExportData.feedbackSummary.neutralFeedbacks,
          averageRating: rawExportData.feedbackSummary.averageRating,
          trustScore: rawExportData.feedbackSummary.trustScore
        },
        exportedAt: rawExportData.exportedAt,
        merkleRoot: rawExportData.merkleRoot
      };

      // Import to second profile
      await expect(
        sense.connect(member2).importReputation(importProfileId, exportData, "0x")
      ).to.emit(sense, "ReputationImported");

      // Check imported reputation (should be base + 50% of original)
      const importedReputation = await sense.getReputation(importProfileId);
      expect(importedReputation.experience).to.equal(250); // 500 * 50% (no base experience)
      expect(importedReputation.reputation).to.equal(1650); // 1000 (base) + (1300 * 50%)
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      // Create multiple profiles
      await sense.connect(member1).createProfile(testOrgId, "member1");
      await sense.connect(member2).createProfile(testOrgId, "member2");
      await sense.connect(member3).createProfile(testOrgId, "member3");
    });

    it("Should return profiles by organization", async function () {
      const profiles = await sense.getProfilesByOrganization(testOrgId);
      expect(profiles.length).to.equal(3);
    });

    it("Should return correct profile count", async function () {
      const count = await sense.getProfileCount();
      expect(count).to.equal(3);
    });

    it("Should return top profiles by reputation", async function () {
      const profiles = await sense.getProfilesByOrganization(testOrgId);

      // Add different reputation scores
      await sense.updateReputation(profiles[0], 1, 500, ethers.keccak256(ethers.toUtf8Bytes("test")));
      await sense.updateReputation(profiles[1], 1, 300, ethers.keccak256(ethers.toUtf8Bytes("test")));
      await sense.updateReputation(profiles[2], 1, 800, ethers.keccak256(ethers.toUtf8Bytes("test")));

      const topProfiles = await sense.getTopProfiles(testOrgId, 2);
      expect(topProfiles.length).to.equal(2);

      // Should be sorted by reputation (highest first)
      const rep1 = await sense.getReputation(topProfiles[0]);
      const rep2 = await sense.getReputation(topProfiles[1]);
      expect(rep1.reputation).to.be.greaterThanOrEqual(rep2.reputation);
    });

    it("Should calculate voting weight based on reputation", async function () {
      const profiles = await sense.getProfilesByOrganization(testOrgId);
      const baseWeight = 1000;

      // Test with neutral reputation (1000 = 1.0x)
      let weight = await sense.calculateVotingWeight(profiles[0], baseWeight);
      expect(weight).to.equal(baseWeight);

      // Add reputation and test multiplier
      await sense.updateReputation(profiles[0], 1, 1000, ethers.keccak256(ethers.toUtf8Bytes("test")));
      weight = await sense.calculateVotingWeight(profiles[0], baseWeight);
      expect(weight).to.equal(2000); // 2.0x multiplier

      // Test cap at 3x
      await sense.updateReputation(profiles[0], 1, 5000, ethers.keccak256(ethers.toUtf8Bytes("test")));
      weight = await sense.calculateVotingWeight(profiles[0], baseWeight);
      expect(weight).to.equal(3000); // Capped at 3x
    });

    it("Should calculate trust score correctly", async function () {
      const profiles = await sense.getProfilesByOrganization(testOrgId);

      // Initial trust score should be low
      let trustScore = await sense.calculateTrustScore(profiles[0]);
      expect(trustScore).to.be.greaterThanOrEqual(0);

      // Add experience and reputation
      await sense.updateReputation(profiles[0], 0, 1000, ethers.keccak256(ethers.toUtf8Bytes("xp")));
      await sense.updateReputation(profiles[0], 2, 500, ethers.keccak256(ethers.toUtf8Bytes("trust")));

      trustScore = await sense.calculateTrustScore(profiles[0]);
      expect(trustScore).to.be.greaterThan(0);

      // Verify profile to get verification bonus
      await sense.verifyProfile(profiles[0], 2); // ENHANCED = 2

      const finalTrustScore = await sense.calculateTrustScore(profiles[0]);
      expect(finalTrustScore).to.be.greaterThan(trustScore);
    });
  });

  describe("Error Handling", function () {
    it("Should handle non-existent profiles", async function () {
      const fakeProfileId = ethers.keccak256(ethers.toUtf8Bytes("fake"));

      await expect(
        sense.getProfile(fakeProfileId)
      ).to.be.revertedWithCustomError(sense, "ProfileNotFound");

      await expect(
        sense.updateReputation(fakeProfileId, 0, 100, ethers.keccak256(ethers.toUtf8Bytes("test")))
      ).to.be.revertedWithCustomError(sense, "ProfileNotFound");
    });

    it("Should handle non-existent organizations", async function () {
      const fakeOrgId = ethers.keccak256(ethers.toUtf8Bytes("fake"));

      await expect(
        sense.connect(member1).createProfile(fakeOrgId, "metadata")
      ).to.be.revertedWithCustomError(sense, "OrganizationNotFound");
    });

    it("Should require proper permissions for admin functions", async function () {
      const tx = await sense.connect(member1).createProfile(testOrgId, "metadata");
      const receipt = await tx.wait();
      const event = receipt?.logs.find(log => {
        try {
          const parsed = sense.interface.parseLog(log);
          return parsed?.name === "ProfileCreated";
        } catch {
          return false;
        }
      });

      let profileId = "";
      if (event) {
        const parsed = sense.interface.parseLog(event);
        profileId = parsed?.args[0];
      }

      // Non-admin trying to update reputation
      await expect(
        sense.connect(nonMember).updateReputation(profileId, 0, 100, ethers.keccak256(ethers.toUtf8Bytes("test")))
      ).to.be.reverted;

      // Non-verifier trying to verify profile
      await expect(
        sense.connect(nonMember).verifyProfile(profileId, 1)
      ).to.be.reverted;
    });
  });
});
