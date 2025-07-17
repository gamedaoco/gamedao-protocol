import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { Registry, Identity, Control, Membership, Sense, Signal, Flow, MockGameToken, Staking } from "../typechain-types";

describe("Identity Integration Tests", function () {
  let registry: Registry;
  let identity: Identity;
  let control: Control;
  let membership: Membership;
  let sense: Sense;
  let signal: Signal;
  let flow: Flow;
  let gameToken: MockGameToken;
  let staking: Staking;

  let admin: SignerWithAddress;
  let creator: SignerWithAddress;
  let member1: SignerWithAddress;
  let member2: SignerWithAddress;
  let member3: SignerWithAddress;
  let verifier: SignerWithAddress;

  const testOrgId = "0x544553544f524700"; // "TESTORG" as bytes8
  const VERIFIER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("VERIFIER_ROLE"));
  const ORGANIZATION_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ORGANIZATION_MANAGER_ROLE"));

  beforeEach(async function () {
    [admin, creator, member1, member2, member3, verifier] = await ethers.getSigners();

    // Deploy Game Token
    const GameTokenFactory = await ethers.getContractFactory("MockGameToken");
    gameToken = await GameTokenFactory.deploy();
    await gameToken.waitForDeployment();

    // Deploy Staking Contract
    const StakingFactory = await ethers.getContractFactory("Staking");
    staking = await StakingFactory.deploy(
      await gameToken.getAddress(),
      admin.address,
      500 // 5% protocol fee
    );
    await staking.waitForDeployment();

    // Deploy Registry
    const RegistryFactory = await ethers.getContractFactory("Registry");
    registry = await RegistryFactory.deploy(admin.address);
    await registry.waitForDeployment();

    // Deploy all modules
    const IdentityFactory = await ethers.getContractFactory("Identity");
    identity = await IdentityFactory.deploy();
    await identity.waitForDeployment();

    const ControlFactory = await ethers.getContractFactory("Control");
    control = await ControlFactory.deploy(
      await gameToken.getAddress(),
      await staking.getAddress()
    );
    await control.waitForDeployment();

    const MembershipFactory = await ethers.getContractFactory("Membership");
    membership = await MembershipFactory.deploy();
    await membership.waitForDeployment();

    const SenseFactory = await ethers.getContractFactory("Sense");
    sense = await SenseFactory.deploy();
    await sense.waitForDeployment();

    const SignalFactory = await ethers.getContractFactory("Signal");
    signal = await SignalFactory.deploy();
    await signal.waitForDeployment();

    const FlowFactory = await ethers.getContractFactory("Flow");
    flow = await FlowFactory.deploy();
    await flow.waitForDeployment();

    // Register all modules
    await registry.registerModule(await identity.getAddress());
    await registry.registerModule(await control.getAddress());
    await registry.registerModule(await membership.getAddress());
    await registry.registerModule(await sense.getAddress());
    await registry.registerModule(await signal.getAddress());
    await registry.registerModule(await flow.getAddress());

    // Initialize modules
    await identity.initialize(await registry.getAddress());
    await membership.initialize(await registry.getAddress());
    await sense.initialize(await registry.getAddress());
    await signal.initialize(await registry.getAddress());
    await flow.initialize(await registry.getAddress());

    // Setup module connections
    await membership.setGameToken(await gameToken.getAddress());
    await membership.setControlContract(await control.getAddress());
    await sense.setGameToken(await gameToken.getAddress());
    await signal.setGameToken(await gameToken.getAddress());
    await flow.setGameToken(await gameToken.getAddress());

    // Grant necessary roles
    await identity.grantRole(VERIFIER_ROLE, verifier.address);
    await membership.grantRole(ORGANIZATION_MANAGER_ROLE, admin.address);
    await membership.grantRole(ORGANIZATION_MANAGER_ROLE, creator.address);

    // Setup test organization
    await membership.activateOrganization(testOrgId);

    // Transfer tokens to test accounts
    const transferAmount = ethers.parseEther("10000");
    await gameToken.transfer(creator.address, transferAmount);
    await gameToken.transfer(member1.address, transferAmount);
    await gameToken.transfer(member2.address, transferAmount);
    await gameToken.transfer(member3.address, transferAmount);
  });

  describe("Identity + Control Integration", function () {
    it("Should link profiles to organization creation", async function () {
      // Create profile first
      const tx = await identity.connect(creator).createProfile(
        testOrgId, "orgcreator", "Organization Creator", "creator.jpg", "creator.com"
      );
      const receipt = await tx.wait();
      const event = receipt?.logs.find(log =>
        log.topics[0] === ethers.id("ProfileCreated(bytes8,bytes8,address,string)")
      );
      const profileId = ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes8", "bytes8", "address", "string"], event!.data
      )[0];

      // Verify profile exists and is linked to organization
      const profile = await identity.getProfile(profileId);
      expect(profile.organizationId).to.equal(testOrgId);
      expect(profile.owner).to.equal(creator.address);
      expect(profile.username).to.equal("orgcreator");
    });

    it("Should provide creator identity for organization management", async function () {
      // Create profile for organization creator
      await identity.connect(creator).createProfile(
        testOrgId, "creator", "DAO Creator", "creator.jpg", "creator.com"
      );

      // Profile should be accessible for organization context
      const profile = await identity.getProfileByOwner(creator.address, testOrgId);
      expect(profile.username).to.equal("creator");
      expect(profile.organizationId).to.equal(testOrgId);
    });

    it("Should handle organization member profiles", async function () {
      // Create profiles for multiple organization members
      await identity.connect(member1).createProfile(
        testOrgId, "member1", "Member One", "member1.jpg", "member1.com"
      );
      await identity.connect(member2).createProfile(
        testOrgId, "member2", "Member Two", "member2.jpg", "member2.com"
      );

      // Get all organization profiles
      const orgProfiles = await identity.getOrganizationProfiles(testOrgId);
      expect(orgProfiles.length).to.equal(2);

      const usernames = orgProfiles.map(p => p.username);
      expect(usernames).to.include("member1");
      expect(usernames).to.include("member2");
    });
  });

  describe("Identity + Membership Integration", function () {
    beforeEach(async function () {
      // Create profiles for members
      await identity.connect(member1).createProfile(
        testOrgId, "member1", "Member One", "member1.jpg", "member1.com"
      );
      await identity.connect(member2).createProfile(
        testOrgId, "member2", "Member Two", "member2.jpg", "member2.com"
      );
      await identity.connect(member3).createProfile(
        testOrgId, "member3", "Member Three", "member3.jpg", "member3.com"
      );

      // Add members to organization
      await membership.connect(admin).addMember(testOrgId, member1.address, 0); // STANDARD
      await membership.connect(admin).addMember(testOrgId, member2.address, 1); // PREMIUM
      await membership.connect(admin).addMember(testOrgId, member3.address, 2); // VIP
    });

    it("Should correlate profiles with membership status", async function () {
      // Check that profiles exist for all members
      const member1Profile = await identity.getProfileByOwner(member1.address, testOrgId);
      const member2Profile = await identity.getProfileByOwner(member2.address, testOrgId);
      const member3Profile = await identity.getProfileByOwner(member3.address, testOrgId);

      expect(member1Profile.username).to.equal("member1");
      expect(member2Profile.username).to.equal("member2");
      expect(member3Profile.username).to.equal("member3");

      // Check membership status
      expect(await membership.isMember(testOrgId, member1.address)).to.be.true;
      expect(await membership.isMember(testOrgId, member2.address)).to.be.true;
      expect(await membership.isMember(testOrgId, member3.address)).to.be.true;
    });

    it("Should handle profile verification affecting membership", async function () {
      const member1Profile = await identity.getProfileByOwner(member1.address, testOrgId);

      // Verify profile
      await identity.connect(verifier).verifyProfile(member1Profile.profileId, 2);

      // Verified profile should still be associated with membership
      const verifiedProfile = await identity.getProfile(member1Profile.profileId);
      expect(verifiedProfile.verificationLevel).to.equal(2);
      expect(await membership.isMember(testOrgId, member1.address)).to.be.true;
    });

    it("Should handle member removal affecting profile status", async function () {
      const member1Profile = await identity.getProfileByOwner(member1.address, testOrgId);

      // Remove member from organization
      await membership.connect(admin).removeMember(testOrgId, member1.address);

      // Profile should still exist but member should be removed
      const profile = await identity.getProfile(member1Profile.profileId);
      expect(profile.isActive).to.be.true; // Profile remains active
      expect(await membership.isMember(testOrgId, member1.address)).to.be.false;
    });

    it("Should provide member profiles for governance", async function () {
      const orgProfiles = await identity.getOrganizationProfiles(testOrgId);
      expect(orgProfiles.length).to.equal(3);

      // All profiles should belong to organization members
      for (const profile of orgProfiles) {
        expect(await membership.isMember(testOrgId, profile.owner)).to.be.true;
      }
    });
  });

  describe("Identity + Sense Integration", function () {
    beforeEach(async function () {
      // Create profiles and add members
      await identity.connect(member1).createProfile(
        testOrgId, "member1", "Member One", "member1.jpg", "member1.com"
      );
      await identity.connect(member2).createProfile(
        testOrgId, "member2", "Member Two", "member2.jpg", "member2.com"
      );

      await membership.connect(admin).addMember(testOrgId, member1.address, 0);
      await membership.connect(admin).addMember(testOrgId, member2.address, 1);
    });

    it("Should link profiles to reputation management", async function () {
      // Create reputation profiles in Sense
      await sense.connect(member1).createProfile(testOrgId, "Member One Bio", "member1.jpg");
      await sense.connect(member2).createProfile(testOrgId, "Member Two Bio", "member2.jpg");

      // Identity profiles should correlate with Sense profiles
      const identityProfile1 = await identity.getProfileByOwner(member1.address, testOrgId);
      const identityProfile2 = await identity.getProfileByOwner(member2.address, testOrgId);

      expect(identityProfile1.owner).to.equal(member1.address);
      expect(identityProfile2.owner).to.equal(member2.address);

      // Both should have reputation profiles
      expect(await sense.hasProfile(testOrgId, member1.address)).to.be.true;
      expect(await sense.hasProfile(testOrgId, member2.address)).to.be.true;
    });

    it("Should handle verified profiles in reputation system", async function () {
      const member1Profile = await identity.getProfileByOwner(member1.address, testOrgId);

      // Verify profile in Identity
      await identity.connect(verifier).verifyProfile(member1Profile.profileId, 3);

      // Create reputation profile
      await sense.connect(member1).createProfile(testOrgId, "Verified Member", "member1.jpg");

      // Verification status should be available for reputation calculations
      const verifiedProfile = await identity.getProfile(member1Profile.profileId);
      expect(verifiedProfile.verificationLevel).to.equal(3);
    });

    it("Should provide profile context for reputation activities", async function () {
      await sense.connect(member1).createProfile(testOrgId, "Active Member", "member1.jpg");

      // Award reputation points
      await sense.connect(admin).awardReputation(testOrgId, member1.address, 500, "Good contribution");

      // Identity profile should still be accessible
      const identityProfile = await identity.getProfileByOwner(member1.address, testOrgId);
      expect(identityProfile.username).to.equal("member1");

      // Reputation should be tracked
      const reputation = await sense.getReputation(testOrgId, member1.address);
      expect(reputation).to.be.gt(0);
    });
  });

  describe("Identity + Signal Integration", function () {
    beforeEach(async function () {
      // Setup complete member profiles
      await identity.connect(member1).createProfile(
        testOrgId, "proposer", "Proposal Creator", "proposer.jpg", "proposer.com"
      );
      await identity.connect(member2).createProfile(
        testOrgId, "voter1", "Voter One", "voter1.jpg", "voter1.com"
      );
      await identity.connect(member3).createProfile(
        testOrgId, "voter2", "Voter Two", "voter2.jpg", "voter2.com"
      );

      await membership.connect(admin).addMember(testOrgId, member1.address, 0);
      await membership.connect(admin).addMember(testOrgId, member2.address, 1);
      await membership.connect(admin).addMember(testOrgId, member3.address, 2);

      // Create reputation profiles
      await sense.connect(member1).createProfile(testOrgId, "Proposer Bio", "proposer.jpg");
      await sense.connect(member2).createProfile(testOrgId, "Voter 1 Bio", "voter1.jpg");
      await sense.connect(member3).createProfile(testOrgId, "Voter 2 Bio", "voter2.jpg");
    });

    it("Should link profiles to governance proposals", async function () {
      // Create a proposal
      const tx = await signal.connect(member1).createProposal(
        testOrgId,
        "Test Proposal",
        "This is a test proposal",
        "https://example.com/proposal",
        86400, // 1 day voting period
        50, // 50% threshold
        100 // 100 minimum votes
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find(log =>
        log.topics[0] === ethers.id("ProposalCreated(bytes8,bytes8,address,string,uint256,uint256)")
      );
      const proposalId = ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes8", "bytes8", "address", "string", "uint256", "uint256"], event!.data
      )[0];

      // Proposer identity should be linked
      const proposerProfile = await identity.getProfileByOwner(member1.address, testOrgId);
      expect(proposerProfile.username).to.equal("proposer");
    });

    it("Should provide voter identity for governance", async function () {
      // Create proposal
      const tx = await signal.connect(member1).createProposal(
        testOrgId, "Vote Test", "Test voting", "https://example.com", 86400, 50, 100
      );
      const receipt = await tx.wait();
      const event = receipt?.logs.find(log =>
        log.topics[0] === ethers.id("ProposalCreated(bytes8,bytes8,address,string,uint256,uint256)")
      );
      const proposalId = ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes8", "bytes8", "address", "string", "uint256", "uint256"], event!.data
      )[0];

      // Vote on proposal
      await signal.connect(member2).vote(proposalId, true, "I support this");
      await signal.connect(member3).vote(proposalId, false, "I oppose this");

      // Voter identities should be accessible
      const voter1Profile = await identity.getProfileByOwner(member2.address, testOrgId);
      const voter2Profile = await identity.getProfileByOwner(member3.address, testOrgId);

      expect(voter1Profile.username).to.equal("voter1");
      expect(voter2Profile.username).to.equal("voter2");
    });

    it("Should handle verified profiles in voting", async function () {
      const member2Profile = await identity.getProfileByOwner(member2.address, testOrgId);

      // Verify voter profile
      await identity.connect(verifier).verifyProfile(member2Profile.profileId, 2);

      // Create and vote on proposal
      const tx = await signal.connect(member1).createProposal(
        testOrgId, "Verified Vote", "Test verified voting", "https://example.com", 86400, 50, 100
      );
      const receipt = await tx.wait();
      const event = receipt?.logs.find(log =>
        log.topics[0] === ethers.id("ProposalCreated(bytes8,bytes8,address,string,uint256,uint256)")
      );
      const proposalId = ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes8", "bytes8", "address", "string", "uint256", "uint256"], event!.data
      )[0];

      await signal.connect(member2).vote(proposalId, true, "Verified vote");

      // Verification status should be available
      const verifiedProfile = await identity.getProfile(member2Profile.profileId);
      expect(verifiedProfile.verificationLevel).to.equal(2);
    });
  });

  describe("Identity + Flow Integration", function () {
    beforeEach(async function () {
      // Setup campaign creator and contributor profiles
      await identity.connect(creator).createProfile(
        testOrgId, "campaigner", "Campaign Creator", "creator.jpg", "creator.com"
      );
      await identity.connect(member1).createProfile(
        testOrgId, "contributor1", "Contributor One", "contrib1.jpg", "contrib1.com"
      );
      await identity.connect(member2).createProfile(
        testOrgId, "contributor2", "Contributor Two", "contrib2.jpg", "contrib2.com"
      );

      await membership.connect(admin).addMember(testOrgId, creator.address, 2);
      await membership.connect(admin).addMember(testOrgId, member1.address, 1);
      await membership.connect(admin).addMember(testOrgId, member2.address, 0);

      // Create reputation profiles
      await sense.connect(creator).createProfile(testOrgId, "Campaign Creator Bio", "creator.jpg");
      await sense.connect(member1).createProfile(testOrgId, "Contributor 1 Bio", "contrib1.jpg");
      await sense.connect(member2).createProfile(testOrgId, "Contributor 2 Bio", "contrib2.jpg");
    });

    it("Should link profiles to campaign creation", async function () {
      // Create campaign
      const tx = await flow.connect(creator).createCampaign(
        testOrgId,
        "Test Campaign",
        "Campaign Description",
        "https://example.com/campaign",
        ethers.parseEther("1000"), // 1000 GAME target
        Math.floor(Date.now() / 1000) + 86400, // 1 day duration
        0 // CampaignType.GRANT
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find(log =>
        log.topics[0] === ethers.id("CampaignCreated(bytes8,bytes8,address,string,uint256,uint256)")
      );
      const campaignId = ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes8", "bytes8", "address", "string", "uint256", "uint256"], event!.data
      )[0];

      // Creator identity should be linked
      const creatorProfile = await identity.getProfileByOwner(creator.address, testOrgId);
      expect(creatorProfile.username).to.equal("campaigner");
    });

    it("Should provide contributor identity for campaigns", async function () {
      // Create campaign
      const tx = await flow.connect(creator).createCampaign(
        testOrgId, "Contribution Test", "Test contributions", "https://example.com",
        ethers.parseEther("1000"), Math.floor(Date.now() / 1000) + 86400, 0
      );
      const receipt = await tx.wait();
      const event = receipt?.logs.find(log =>
        log.topics[0] === ethers.id("CampaignCreated(bytes8,bytes8,address,string,uint256,uint256)")
      );
      const campaignId = ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes8", "bytes8", "address", "string", "uint256", "uint256"], event!.data
      )[0];

      // Approve tokens for contributions
      await gameToken.connect(member1).approve(await flow.getAddress(), ethers.parseEther("100"));
      await gameToken.connect(member2).approve(await flow.getAddress(), ethers.parseEther("200"));

      // Make contributions
      await flow.connect(member1).contribute(campaignId, ethers.parseEther("100"));
      await flow.connect(member2).contribute(campaignId, ethers.parseEther("200"));

      // Contributor identities should be accessible
      const contrib1Profile = await identity.getProfileByOwner(member1.address, testOrgId);
      const contrib2Profile = await identity.getProfileByOwner(member2.address, testOrgId);

      expect(contrib1Profile.username).to.equal("contributor1");
      expect(contrib2Profile.username).to.equal("contributor2");
    });

    it("Should handle verified profiles in campaign activities", async function () {
      const creatorProfile = await identity.getProfileByOwner(creator.address, testOrgId);

      // Verify campaign creator profile
      await identity.connect(verifier).verifyProfile(creatorProfile.profileId, 3);

      // Create campaign with verified creator
      const tx = await flow.connect(creator).createCampaign(
        testOrgId, "Verified Campaign", "Campaign by verified creator", "https://example.com",
        ethers.parseEther("1000"), Math.floor(Date.now() / 1000) + 86400, 0
      );

      // Verification status should be available
      const verifiedProfile = await identity.getProfile(creatorProfile.profileId);
      expect(verifiedProfile.verificationLevel).to.equal(3);
    });
  });

  describe("Cross-Module Profile Consistency", function () {
    it("Should maintain profile consistency across all modules", async function () {
      // Create comprehensive member setup
      await identity.connect(member1).createProfile(
        testOrgId, "fullmember", "Full Member", "full.jpg", "full.com"
      );
      await membership.connect(admin).addMember(testOrgId, member1.address, 1);
      await sense.connect(member1).createProfile(testOrgId, "Full Member Bio", "full.jpg");

      // Verify profile in Identity
      const identityProfile = await identity.getProfileByOwner(member1.address, testOrgId);
      await identity.connect(verifier).verifyProfile(identityProfile.profileId, 2);

      // Test cross-module consistency
      expect(await membership.isMember(testOrgId, member1.address)).to.be.true;
      expect(await sense.hasProfile(testOrgId, member1.address)).to.be.true;

      const verifiedProfile = await identity.getProfile(identityProfile.profileId);
      expect(verifiedProfile.verificationLevel).to.equal(2);
      expect(verifiedProfile.username).to.equal("fullmember");
    });

    it("Should handle profile deactivation across modules", async function () {
      // Setup complete member
      await identity.connect(member1).createProfile(
        testOrgId, "deactivatetest", "Deactivate Test", "test.jpg", "test.com"
      );
      await membership.connect(admin).addMember(testOrgId, member1.address, 0);
      await sense.connect(member1).createProfile(testOrgId, "Test Bio", "test.jpg");

      const identityProfile = await identity.getProfileByOwner(member1.address, testOrgId);

      // Deactivate profile in Identity
      await identity.connect(member1).deactivateProfile(identityProfile.profileId);

      // Profile should be deactivated in Identity but other modules should still function
      const deactivatedProfile = await identity.getProfile(identityProfile.profileId);
      expect(deactivatedProfile.isActive).to.be.false;

      // Membership and reputation should still be accessible
      expect(await membership.isMember(testOrgId, member1.address)).to.be.true;
      expect(await sense.hasProfile(testOrgId, member1.address)).to.be.true;
    });

    it("Should provide unified profile information for UI", async function () {
      // Create profiles across modules
      await identity.connect(member1).createProfile(
        testOrgId, "uiuser", "UI User", "ui.jpg", "ui.com"
      );
      await membership.connect(admin).addMember(testOrgId, member1.address, 2);
      await sense.connect(member1).createProfile(testOrgId, "UI User Bio", "ui.jpg");

      // Verify profile
      const identityProfile = await identity.getProfileByOwner(member1.address, testOrgId);
      await identity.connect(verifier).verifyProfile(identityProfile.profileId, 1);

      // UI should be able to get comprehensive profile information
      const profile = await identity.getProfile(identityProfile.profileId);
      const memberData = await membership.getMember(testOrgId, member1.address);
      const reputation = await sense.getReputation(testOrgId, member1.address);

      expect(profile.username).to.equal("uiuser");
      expect(profile.verificationLevel).to.equal(1);
      expect(memberData.tier).to.equal(2);
      expect(reputation).to.be.gt(0);
    });
  });

  describe("Profile-Based Access Control", function () {
    it("Should enforce profile-based permissions", async function () {
      // Create verified and unverified profiles
      await identity.connect(member1).createProfile(
        testOrgId, "verified", "Verified User", "verified.jpg", "verified.com"
      );
      await identity.connect(member2).createProfile(
        testOrgId, "unverified", "Unverified User", "unverified.jpg", "unverified.com"
      );

      const member1Profile = await identity.getProfileByOwner(member1.address, testOrgId);
      await identity.connect(verifier).verifyProfile(member1Profile.profileId, 2);

      // Verified profile should have higher privileges
      const verifiedProfile = await identity.getProfile(member1Profile.profileId);
      const unverifiedProfile = await identity.getProfileByOwner(member2.address, testOrgId);

      expect(verifiedProfile.verificationLevel).to.equal(2);
      expect(unverifiedProfile.verificationLevel).to.equal(0);
    });

    it("Should handle role-based profile management", async function () {
      await identity.connect(member1).createProfile(
        testOrgId, "managed", "Managed User", "managed.jpg", "managed.com"
      );

      const memberProfile = await identity.getProfileByOwner(member1.address, testOrgId);

      // Admin should be able to manage any profile
      await expect(
        identity.connect(admin).deactivateProfile(memberProfile.profileId)
      ).to.not.be.reverted;

      // Verify admin action was successful
      const managedProfile = await identity.getProfile(memberProfile.profileId);
      expect(managedProfile.isActive).to.be.false;
    });
  });

  describe("Performance and Scalability", function () {
    it("Should handle multiple profiles efficiently", async function () {
      const profileCount = 10;
      const profiles = [];

      // Create multiple profiles
      for (let i = 0; i < profileCount; i++) {
        const wallet = ethers.Wallet.createRandom();
        const tx = await identity.connect(wallet).createProfile(
          testOrgId, `user${i}`, `Bio ${i}`, `avatar${i}.jpg`, `user${i}.com`
        );

        const receipt = await tx.wait();
        expect(receipt?.gasUsed).to.be.lt(500000); // Reasonable gas usage

        profiles.push(wallet.address);
      }

      // Verify all profiles exist
      const orgProfiles = await identity.getOrganizationProfiles(testOrgId);
      expect(orgProfiles.length).to.equal(profileCount);
    });

    it("Should handle cross-module queries efficiently", async function () {
      // Setup member with all module profiles
      await identity.connect(member1).createProfile(
        testOrgId, "efficient", "Efficient User", "efficient.jpg", "efficient.com"
      );
      await membership.connect(admin).addMember(testOrgId, member1.address, 1);
      await sense.connect(member1).createProfile(testOrgId, "Efficient Bio", "efficient.jpg");

      // Cross-module queries should be efficient
      const startTime = Date.now();

      const identityProfile = await identity.getProfileByOwner(member1.address, testOrgId);
      const memberData = await membership.getMember(testOrgId, member1.address);
      const reputation = await sense.getReputation(testOrgId, member1.address);

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      expect(queryTime).to.be.lt(1000); // Should complete within 1 second
      expect(identityProfile.username).to.equal("efficient");
      expect(memberData.tier).to.equal(1);
      expect(reputation).to.be.gt(0);
    });
  });
});
