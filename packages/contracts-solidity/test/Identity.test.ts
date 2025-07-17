import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { Registry, Identity } from "../typechain-types";

describe("Identity Module", function () {
  let registry: Registry;
  let identity: Identity;

  let admin: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;
  let verifier: SignerWithAddress;
  let nonUser: SignerWithAddress;

  const testOrgId = "0x544553544f524700"; // "TESTORG" as bytes8
  const testOrgId2 = "0x544553544f524732"; // "TESTORG2" as bytes8
  const VERIFIER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("VERIFIER_ROLE"));

  beforeEach(async function () {
    [admin, user1, user2, user3, verifier, nonUser] = await ethers.getSigners();

    // Deploy Registry
    const RegistryFactory = await ethers.getContractFactory("Registry");
    registry = await RegistryFactory.deploy(admin.address);
    await registry.waitForDeployment();

    // Deploy Identity
    const IdentityFactory = await ethers.getContractFactory("Identity");
    identity = await IdentityFactory.deploy();
    await identity.waitForDeployment();

    // Register and enable Identity module
    await registry.registerModule(await identity.getAddress());
    await registry.enableModule(await identity.getAddress());

    // Initialize Identity
    await identity.initialize(await registry.getAddress());

    // Grant verifier role
    await identity.grantRole(VERIFIER_ROLE, verifier.address);
  });

  describe("Deployment and Initialization", function () {
    it("Should deploy Identity correctly", async function () {
      expect(await identity.getAddress()).to.be.properAddress;
      expect(await identity.registry()).to.equal(await registry.getAddress());
    });

    it("Should have correct module ID", async function () {
      expect(await identity.moduleId()).to.equal(ethers.keccak256(ethers.toUtf8Bytes("IDENTITY")));
    });

    it("Should initialize with correct default values", async function () {
      expect(await identity.isInitialized()).to.be.true;
    });

    it("Should prevent double initialization", async function () {
      await expect(
        identity.initialize(await registry.getAddress())
      ).to.be.revertedWith("Initializable: contract is already initialized");
    });

    it("Should have correct role assignments", async function () {
      const DEFAULT_ADMIN_ROLE = await identity.DEFAULT_ADMIN_ROLE();
      expect(await identity.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
      expect(await identity.hasRole(VERIFIER_ROLE, verifier.address)).to.be.true;
    });
  });

  describe("Profile Creation", function () {
    it("Should create profile successfully", async function () {
      const username = "testuser1";
      const bio = "Test user bio";
      const avatar = "https://example.com/avatar1.jpg";
      const website = "https://testuser1.com";

      const tx = await identity.connect(user1).createProfile(
        testOrgId,
        username,
        bio,
        avatar,
        website
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find(log =>
        log.topics[0] === ethers.id("ProfileCreated(bytes8,bytes8,address,string)")
      );

      expect(event).to.not.be.undefined;

      // Decode the profile ID
      const profileId = ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes8", "bytes8", "address", "string"],
        event!.data
      )[0];

      expect(profileId).to.not.equal("0x0000000000000000");
    });

    it("Should generate unique profile IDs", async function () {
      const tx1 = await identity.connect(user1).createProfile(
        testOrgId, "user1", "Bio 1", "avatar1.jpg", "user1.com"
      );
      const tx2 = await identity.connect(user2).createProfile(
        testOrgId, "user2", "Bio 2", "avatar2.jpg", "user2.com"
      );

      const receipt1 = await tx1.wait();
      const receipt2 = await tx2.wait();

      const event1 = receipt1?.logs.find(log =>
        log.topics[0] === ethers.id("ProfileCreated(bytes8,bytes8,address,string)")
      );
      const event2 = receipt2?.logs.find(log =>
        log.topics[0] === ethers.id("ProfileCreated(bytes8,bytes8,address,string)")
      );

      const profileId1 = ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes8", "bytes8", "address", "string"], event1!.data
      )[0];
      const profileId2 = ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes8", "bytes8", "address", "string"], event2!.data
      )[0];

      expect(profileId1).to.not.equal(profileId2);
    });

    it("Should prevent duplicate profiles for same user in same organization", async function () {
      await identity.connect(user1).createProfile(
        testOrgId, "user1", "Bio 1", "avatar1.jpg", "user1.com"
      );

      await expect(
        identity.connect(user1).createProfile(
          testOrgId, "user1duplicate", "Bio 1 duplicate", "avatar1dup.jpg", "user1dup.com"
        )
      ).to.be.revertedWith("Profile already exists for this user in this organization");
    });

    it("Should allow same user to have profiles in different organizations", async function () {
      await identity.connect(user1).createProfile(
        testOrgId, "user1org1", "Bio in org 1", "avatar1.jpg", "user1.com"
      );

      await expect(
        identity.connect(user1).createProfile(
          testOrgId2, "user1org2", "Bio in org 2", "avatar2.jpg", "user1.com"
        )
      ).to.not.be.reverted;
    });

    it("Should prevent empty username", async function () {
      await expect(
        identity.connect(user1).createProfile(
          testOrgId, "", "Bio", "avatar.jpg", "website.com"
        )
      ).to.be.revertedWith("Username cannot be empty");
    });

    it("Should prevent duplicate usernames in same organization", async function () {
      await identity.connect(user1).createProfile(
        testOrgId, "duplicate", "Bio 1", "avatar1.jpg", "user1.com"
      );

      await expect(
        identity.connect(user2).createProfile(
          testOrgId, "duplicate", "Bio 2", "avatar2.jpg", "user2.com"
        )
      ).to.be.revertedWith("Username already taken in this organization");
    });

    it("Should allow same username in different organizations", async function () {
      await identity.connect(user1).createProfile(
        testOrgId, "samename", "Bio 1", "avatar1.jpg", "user1.com"
      );

      await expect(
        identity.connect(user2).createProfile(
          testOrgId2, "samename", "Bio 2", "avatar2.jpg", "user2.com"
        )
      ).to.not.be.reverted;
    });
  });

  describe("Profile Management", function () {
    let profileId: string;

    beforeEach(async function () {
      const tx = await identity.connect(user1).createProfile(
        testOrgId, "testuser", "Test bio", "avatar.jpg", "website.com"
      );
      const receipt = await tx.wait();
      const event = receipt?.logs.find(log =>
        log.topics[0] === ethers.id("ProfileCreated(bytes8,bytes8,address,string)")
      );
      profileId = ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes8", "bytes8", "address", "string"], event!.data
      )[0];
    });

    it("Should get profile by ID correctly", async function () {
      const profile = await identity.getProfile(profileId);

      expect(profile.profileId).to.equal(profileId);
      expect(profile.organizationId).to.equal(testOrgId);
      expect(profile.owner).to.equal(user1.address);
      expect(profile.username).to.equal("testuser");
      expect(profile.bio).to.equal("Test bio");
      expect(profile.avatar).to.equal("avatar.jpg");
      expect(profile.website).to.equal("website.com");
      expect(profile.verificationLevel).to.equal(0);
      expect(profile.isActive).to.be.true;
    });

    it("Should get profile by owner and organization", async function () {
      const profile = await identity.getProfileByOwner(user1.address, testOrgId);

      expect(profile.profileId).to.equal(profileId);
      expect(profile.owner).to.equal(user1.address);
      expect(profile.organizationId).to.equal(testOrgId);
    });

    it("Should update profile successfully", async function () {
      const newBio = "Updated bio";
      const newAvatar = "newavatar.jpg";
      const newWebsite = "newwebsite.com";

      await expect(
        identity.connect(user1).updateProfile(profileId, newBio, newAvatar, newWebsite)
      ).to.emit(identity, "ProfileUpdated")
        .withArgs(profileId, user1.address);

      const profile = await identity.getProfile(profileId);
      expect(profile.bio).to.equal(newBio);
      expect(profile.avatar).to.equal(newAvatar);
      expect(profile.website).to.equal(newWebsite);
    });

    it("Should prevent unauthorized profile updates", async function () {
      await expect(
        identity.connect(user2).updateProfile(profileId, "Hacked bio", "hack.jpg", "hack.com")
      ).to.be.revertedWith("Not authorized to update this profile");
    });

    it("Should deactivate profile successfully", async function () {
      await expect(
        identity.connect(user1).deactivateProfile(profileId)
      ).to.emit(identity, "ProfileDeactivated")
        .withArgs(profileId, user1.address);

      const profile = await identity.getProfile(profileId);
      expect(profile.isActive).to.be.false;
    });

    it("Should reactivate profile successfully", async function () {
      await identity.connect(user1).deactivateProfile(profileId);

      await expect(
        identity.connect(user1).reactivateProfile(profileId)
      ).to.emit(identity, "ProfileReactivated")
        .withArgs(profileId, user1.address);

      const profile = await identity.getProfile(profileId);
      expect(profile.isActive).to.be.true;
    });

    it("Should check profile existence correctly", async function () {
      expect(await identity.profileExists(profileId)).to.be.true;
      expect(await identity.profileExists("0x0000000000000000")).to.be.false;
    });

    it("Should check username availability correctly", async function () {
      expect(await identity.isUsernameAvailable(testOrgId, "testuser")).to.be.false;
      expect(await identity.isUsernameAvailable(testOrgId, "availableuser")).to.be.true;
      expect(await identity.isUsernameAvailable(testOrgId2, "testuser")).to.be.true; // Different org
    });
  });

  describe("Profile Verification", function () {
    let profileId: string;

    beforeEach(async function () {
      const tx = await identity.connect(user1).createProfile(
        testOrgId, "verifyuser", "Bio", "avatar.jpg", "website.com"
      );
      const receipt = await tx.wait();
      const event = receipt?.logs.find(log =>
        log.topics[0] === ethers.id("ProfileCreated(bytes8,bytes8,address,string)")
      );
      profileId = ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes8", "bytes8", "address", "string"], event!.data
      )[0];
    });

    it("Should verify profile successfully", async function () {
      const verificationLevel = 2; // Verified level

      await expect(
        identity.connect(verifier).verifyProfile(profileId, verificationLevel)
      ).to.emit(identity, "ProfileVerified")
        .withArgs(profileId, verificationLevel, verifier.address);

      const profile = await identity.getProfile(profileId);
      expect(profile.verificationLevel).to.equal(verificationLevel);
    });

    it("Should prevent non-verifier from verifying profiles", async function () {
      await expect(
        identity.connect(user2).verifyProfile(profileId, 2)
      ).to.be.revertedWith("AccessControl:");
    });

    it("Should update verification level", async function () {
      await identity.connect(verifier).verifyProfile(profileId, 1);

      await expect(
        identity.connect(verifier).verifyProfile(profileId, 3)
      ).to.emit(identity, "ProfileVerified")
        .withArgs(profileId, 3, verifier.address);

      const profile = await identity.getProfile(profileId);
      expect(profile.verificationLevel).to.equal(3);
    });

    it("Should revoke verification", async function () {
      await identity.connect(verifier).verifyProfile(profileId, 2);

      await expect(
        identity.connect(verifier).revokeVerification(profileId)
      ).to.emit(identity, "VerificationRevoked")
        .withArgs(profileId, verifier.address);

      const profile = await identity.getProfile(profileId);
      expect(profile.verificationLevel).to.equal(0);
    });

    it("Should get verified profiles correctly", async function () {
      // Create multiple profiles and verify some
      const tx2 = await identity.connect(user2).createProfile(
        testOrgId, "user2", "Bio 2", "avatar2.jpg", "user2.com"
      );
      const receipt2 = await tx2.wait();
      const event2 = receipt2?.logs.find(log =>
        log.topics[0] === ethers.id("ProfileCreated(bytes8,bytes8,address,string)")
      );
      const profileId2 = ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes8", "bytes8", "address", "string"], event2!.data
      )[0];

      await identity.connect(verifier).verifyProfile(profileId, 2);
      await identity.connect(verifier).verifyProfile(profileId2, 1);

      const verifiedProfiles = await identity.getVerifiedProfiles(testOrgId, 1);
      expect(verifiedProfiles.length).to.equal(2);
    });
  });

  describe("Organization Profile Management", function () {
    beforeEach(async function () {
      // Create profiles for multiple users in the organization
      await identity.connect(user1).createProfile(
        testOrgId, "user1", "Bio 1", "avatar1.jpg", "user1.com"
      );
      await identity.connect(user2).createProfile(
        testOrgId, "user2", "Bio 2", "avatar2.jpg", "user2.com"
      );
      await identity.connect(user3).createProfile(
        testOrgId, "user3", "Bio 3", "avatar3.jpg", "user3.com"
      );
    });

    it("Should get organization profiles correctly", async function () {
      const profiles = await identity.getOrganizationProfiles(testOrgId);
      expect(profiles.length).to.equal(3);

      const usernames = profiles.map(p => p.username);
      expect(usernames).to.include("user1");
      expect(usernames).to.include("user2");
      expect(usernames).to.include("user3");
    });

    it("Should get organization profile count correctly", async function () {
      expect(await identity.getOrganizationProfileCount(testOrgId)).to.equal(3);
      expect(await identity.getOrganizationProfileCount(testOrgId2)).to.equal(0);
    });

    it("Should get active profiles only", async function () {
      // Deactivate one profile
      const profile = await identity.getProfileByOwner(user2.address, testOrgId);
      await identity.connect(user2).deactivateProfile(profile.profileId);

      const activeProfiles = await identity.getActiveProfiles(testOrgId);
      expect(activeProfiles.length).to.equal(2);

      const activeUsernames = activeProfiles.map(p => p.username);
      expect(activeUsernames).to.include("user1");
      expect(activeUsernames).to.include("user3");
      expect(activeUsernames).to.not.include("user2");
    });

    it("Should search profiles by username", async function () {
      const foundProfile = await identity.getProfileByUsername(testOrgId, "user2");
      expect(foundProfile.username).to.equal("user2");
      expect(foundProfile.owner).to.equal(user2.address);
    });

    it("Should handle non-existent username search", async function () {
      await expect(
        identity.getProfileByUsername(testOrgId, "nonexistent")
      ).to.be.revertedWith("Profile not found");
    });
  });

  describe("Profile Statistics and Analytics", function () {
    beforeEach(async function () {
      // Create profiles in different organizations
      await identity.connect(user1).createProfile(
        testOrgId, "user1org1", "Bio 1", "avatar1.jpg", "user1.com"
      );
      await identity.connect(user1).createProfile(
        testOrgId2, "user1org2", "Bio 2", "avatar2.jpg", "user1.com"
      );
      await identity.connect(user2).createProfile(
        testOrgId, "user2org1", "Bio 3", "avatar3.jpg", "user2.com"
      );
    });

    it("Should get user profile count across organizations", async function () {
      const user1ProfileCount = await identity.getUserProfileCount(user1.address);
      const user2ProfileCount = await identity.getUserProfileCount(user2.address);
      const nonUserProfileCount = await identity.getUserProfileCount(nonUser.address);

      expect(user1ProfileCount).to.equal(2);
      expect(user2ProfileCount).to.equal(1);
      expect(nonUserProfileCount).to.equal(0);
    });

    it("Should get user profiles across organizations", async function () {
      const user1Profiles = await identity.getUserProfiles(user1.address);
      expect(user1Profiles.length).to.equal(2);

      const orgIds = user1Profiles.map(p => p.organizationId);
      expect(orgIds).to.include(testOrgId);
      expect(orgIds).to.include(testOrgId2);
    });

    it("Should track total profiles correctly", async function () {
      const totalProfiles = await identity.getTotalProfileCount();
      expect(totalProfiles).to.equal(3);
    });
  });

  describe("Access Control and Security", function () {
    let profileId: string;

    beforeEach(async function () {
      const tx = await identity.connect(user1).createProfile(
        testOrgId, "securitytest", "Bio", "avatar.jpg", "website.com"
      );
      const receipt = await tx.wait();
      const event = receipt?.logs.find(log =>
        log.topics[0] === ethers.id("ProfileCreated(bytes8,bytes8,address,string)")
      );
      profileId = ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes8", "bytes8", "address", "string"], event!.data
      )[0];
    });

    it("Should prevent unauthorized profile access", async function () {
      await expect(
        identity.connect(user2).updateProfile(profileId, "Hacked", "hack.jpg", "hack.com")
      ).to.be.revertedWith("Not authorized to update this profile");

      await expect(
        identity.connect(user2).deactivateProfile(profileId)
      ).to.be.revertedWith("Not authorized to update this profile");
    });

    it("Should allow admin to manage any profile", async function () {
      // Admin should be able to deactivate any profile
      await expect(
        identity.connect(admin).deactivateProfile(profileId)
      ).to.not.be.reverted;
    });

    it("Should handle role-based verification permissions", async function () {
      // Only verifiers should be able to verify profiles
      await expect(
        identity.connect(user1).verifyProfile(profileId, 2)
      ).to.be.revertedWith("AccessControl:");

      // Verifier should be able to verify
      await expect(
        identity.connect(verifier).verifyProfile(profileId, 2)
      ).to.not.be.reverted;
    });

    it("Should prevent invalid profile operations", async function () {
      const invalidProfileId = "0x0000000000000000";

      await expect(
        identity.getProfile(invalidProfileId)
      ).to.be.revertedWith("Profile does not exist");

      await expect(
        identity.connect(user1).updateProfile(invalidProfileId, "Bio", "avatar.jpg", "website.com")
      ).to.be.revertedWith("Profile does not exist");
    });
  });

  describe("Integration with Other Modules", function () {
    let profileId: string;

    beforeEach(async function () {
      const tx = await identity.connect(user1).createProfile(
        testOrgId, "integrationtest", "Bio", "avatar.jpg", "website.com"
      );
      const receipt = await tx.wait();
      const event = receipt?.logs.find(log =>
        log.topics[0] === ethers.id("ProfileCreated(bytes8,bytes8,address,string)")
      );
      profileId = ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes8", "bytes8", "address", "string"], event!.data
      )[0];
    });

    it("Should provide profile validation for other modules", async function () {
      // This tests the interface that other modules would use
      expect(await identity.profileExists(profileId)).to.be.true;

      const profile = await identity.getProfile(profileId);
      expect(profile.owner).to.equal(user1.address);
      expect(profile.organizationId).to.equal(testOrgId);
    });

    it("Should provide user-to-profile mapping for reputation modules", async function () {
      const profile = await identity.getProfileByOwner(user1.address, testOrgId);
      expect(profile.profileId).to.equal(profileId);
    });

    it("Should provide verification status for governance modules", async function () {
      await identity.connect(verifier).verifyProfile(profileId, 2);

      const profile = await identity.getProfile(profileId);
      expect(profile.verificationLevel).to.equal(2);
    });

    it("Should handle profile-based permissions", async function () {
      // Deactivated profiles should be identifiable
      await identity.connect(user1).deactivateProfile(profileId);

      const profile = await identity.getProfile(profileId);
      expect(profile.isActive).to.be.false;
    });
  });

  describe("Error Handling and Edge Cases", function () {
    it("Should handle invalid organization IDs", async function () {
      const invalidOrgId = "0x0000000000000000";

      await expect(
        identity.connect(user1).createProfile(
          invalidOrgId, "username", "bio", "avatar.jpg", "website.com"
        )
      ).to.be.revertedWith("Invalid organization ID");
    });

    it("Should handle zero address operations", async function () {
      await expect(
        identity.getProfileByOwner(ethers.ZeroAddress, testOrgId)
      ).to.be.revertedWith("Invalid address");
    });

    it("Should handle very long usernames", async function () {
      const longUsername = "a".repeat(100); // Very long username

      await expect(
        identity.connect(user1).createProfile(
          testOrgId, longUsername, "bio", "avatar.jpg", "website.com"
        )
      ).to.be.revertedWith("Username too long");
    });

    it("Should handle special characters in usernames", async function () {
      await expect(
        identity.connect(user1).createProfile(
          testOrgId, "user@name", "bio", "avatar.jpg", "website.com"
        )
      ).to.be.revertedWith("Invalid username characters");
    });

    it("Should handle large profile metadata", async function () {
      const largeBio = "a".repeat(1000);
      const largeWebsite = "https://example.com/" + "a".repeat(500);

      // Should handle reasonably large metadata
      await expect(
        identity.connect(user1).createProfile(
          testOrgId, "testuser", largeBio, "avatar.jpg", largeWebsite
        )
      ).to.not.be.reverted;
    });

    it("Should handle concurrent profile operations", async function () {
      // Test concurrent profile creation
      const promises = [];
      for (let i = 0; i < 5; i++) {
        const wallet = ethers.Wallet.createRandom();
        promises.push(
          identity.connect(user1).createProfile(
            testOrgId, `user${i}`, `Bio ${i}`, `avatar${i}.jpg`, `user${i}.com`
          )
        );
      }

      // Only the first one should succeed due to duplicate user restriction
      await expect(Promise.all(promises)).to.be.rejected;
    });
  });

  describe("Gas Optimization", function () {
    it("Should create profiles within reasonable gas limits", async function () {
      const tx = await identity.connect(user1).createProfile(
        testOrgId, "gastest", "Bio", "avatar.jpg", "website.com"
      );

      const receipt = await tx.wait();

      // Verify gas usage is reasonable (adjust threshold as needed)
      expect(receipt?.gasUsed).to.be.lt(500000); // Less than 500k gas
    });

    it("Should handle batch operations efficiently", async function () {
      // Create multiple profiles to test gas efficiency
      for (let i = 0; i < 3; i++) {
        const wallet = ethers.Wallet.createRandom();
        const tx = await identity.connect(wallet).createProfile(
          testOrgId, `batchuser${i}`, `Bio ${i}`, `avatar${i}.jpg`, `user${i}.com`
        );

        const receipt = await tx.wait();
        expect(receipt?.gasUsed).to.be.lt(500000);
      }
    });
  });
});
