import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { Registry, Identity, Control, Factory, Membership, Sense, Signal, Flow, MockGameToken, Staking, Treasury } from "../typechain-types";

describe("End-to-End Scenarios", function () {
  let registry: Registry;
  let identity: Identity;
  let control: Control;
  let factory: Factory;
  let membership: Membership;
  let sense: Sense;
  let signal: Signal;
  let flow: Flow;
  let gameToken: MockGameToken;
  let staking: Staking;

  let admin: SignerWithAddress;
  let orgCreator: SignerWithAddress;
  let member1: SignerWithAddress;
  let member2: SignerWithAddress;
  let member3: SignerWithAddress;
  let contributor: SignerWithAddress;
  let verifier: SignerWithAddress;

  const VERIFIER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("VERIFIER_ROLE"));
  const ORGANIZATION_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ORGANIZATION_MANAGER_ROLE"));
  const MIN_STAKE_AMOUNT = ethers.parseEther("10000");

  beforeEach(async function () {
    [admin, orgCreator, member1, member2, member3, contributor, verifier] = await ethers.getSigners();

    // Deploy Game Token
    const MockGameTokenFactory = await ethers.getContractFactory("MockGameToken");
    gameToken = await MockGameTokenFactory.deploy();
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

    const FactoryFactory = await ethers.getContractFactory("contracts/modules/Control/Factory.sol:Factory");
    factory = await FactoryFactory.deploy(
      await gameToken.getAddress(),
      await staking.getAddress()
    );
    await factory.waitForDeployment();

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

    // Setup module connections
    await control.setFactory(await factory.getAddress());
    await factory.setRegistry(await control.getAddress());

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
    await membership.setMockGameToken(await gameToken.getAddress());
    await membership.setControlContract(await control.getAddress());
    await sense.setMockGameToken(await gameToken.getAddress());
    await signal.setMockGameToken(await gameToken.getAddress());
    await flow.setMockGameToken(await gameToken.getAddress());

    // Grant necessary roles
    await identity.grantRole(VERIFIER_ROLE, verifier.address);
    await membership.grantRole(ORGANIZATION_MANAGER_ROLE, admin.address);
    await staking.grantRole(ORGANIZATION_MANAGER_ROLE, await factory.getAddress());

    // Transfer tokens to test accounts
    const transferAmount = ethers.parseEther("100000");
    await gameToken.transfer(orgCreator.address, transferAmount);
    await gameToken.transfer(member1.address, transferAmount);
    await gameToken.transfer(member2.address, transferAmount);
    await gameToken.transfer(member3.address, transferAmount);
    await gameToken.transfer(contributor.address, transferAmount);
  });

  describe("Complete Organization Lifecycle", function () {
    it("Should complete full organization creation and management flow", async function () {
      // Step 1: Organization Creator creates profile
      await identity.connect(orgCreator).createProfile(
        "0x0000000000000000", // Global profile first
        "orgcreator",
        "Organization Creator",
        "creator.jpg",
        "creator.com"
      );

      // Step 2: Create organization through Factory
      await gameToken.connect(orgCreator).approve(await staking.getAddress(), MIN_STAKE_AMOUNT);

      const tx = await factory.connect(orgCreator).createOrganization(
        orgCreator.address,
        "Test DAO",
        "https://example.com/metadata",
        0, // OrgType.Individual
        0, // AccessModel.Open
        0, // FeeModel.NoFees
        1000, // memberLimit
        0, // membershipFee
        MIN_STAKE_AMOUNT
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find(log =>
        log.topics[0] === ethers.id("OrganizationCreated(bytes8,string,address,address,uint256)")
      );
      const orgId = ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes8", "string", "address", "address", "uint256"],
        event!.data
      )[0];

      // Step 3: Verify organization exists
      const organization = await control.getOrganization(orgId);
      expect(organization.name).to.equal("Test DAO");
      expect(organization.creator).to.equal(orgCreator.address);

      // Step 4: Activate organization in Membership
      await membership.connect(admin).activateOrganization(orgId);
      expect(await membership.isOrganizationActive(orgId)).to.be.true;

      // Step 5: Creator creates organization-specific profile
      await identity.connect(orgCreator).createProfile(
        orgId,
        "creator",
        "DAO Creator",
        "creator.jpg",
        "creator.com"
      );

      // Verify complete organization setup
      const creatorProfile = await identity.getProfileByOwner(orgCreator.address, orgId);
      expect(creatorProfile.username).to.equal("creator");
      expect(creatorProfile.organizationId).to.equal(orgId);
    });
  });

  describe("Complete Member Onboarding Journey", function () {
    let orgId: string;

    beforeEach(async function () {
      // Create organization
      await gameToken.connect(orgCreator).approve(await staking.getAddress(), MIN_STAKE_AMOUNT);
      const tx = await factory.connect(orgCreator).createOrganization(
        orgCreator.address, "Member Test DAO", "https://example.com", 0, 0, 0, 1000, 0, MIN_STAKE_AMOUNT
      );
      const receipt = await tx.wait();
      const event = receipt?.logs.find(log =>
        log.topics[0] === ethers.id("OrganizationCreated(bytes8,string,address,address,uint256)")
      );
      orgId = ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes8", "string", "address", "address", "uint256"], event!.data
      )[0];

      await membership.connect(admin).activateOrganization(orgId);
    });

    it("Should complete full member onboarding and verification", async function () {
      // Step 1: New member creates profile
      await identity.connect(member1).createProfile(
        orgId,
        "newmember",
        "New Member",
        "member.jpg",
        "member.com"
      );

      const memberProfile = await identity.getProfileByOwner(member1.address, orgId);
      expect(memberProfile.username).to.equal("newmember");
      expect(memberProfile.verificationLevel).to.equal(0);

      // Step 2: Add member to organization
      await membership.connect(admin).addMember(orgId, member1.address, 0); // STANDARD tier
      expect(await membership.isMember(orgId, member1.address)).to.be.true;

      // Step 3: Create reputation profile
      await sense.connect(member1).createProfile(orgId, "Active community member", "member.jpg");
      expect(await sense.hasProfile(orgId, member1.address)).to.be.true;

      // Step 4: Verify member profile
      await identity.connect(verifier).verifyProfile(memberProfile.profileId, 2);

      const verifiedProfile = await identity.getProfile(memberProfile.profileId);
      expect(verifiedProfile.verificationLevel).to.equal(2);

      // Step 5: Award initial reputation
      await sense.connect(admin).awardReputation(orgId, member1.address, 500, "Welcome bonus");
      const reputation = await sense.getReputation(orgId, member1.address);
      expect(reputation).to.be.gt(500);

      // Step 6: Upgrade member tier
      await membership.connect(admin).updateMemberTier(orgId, member1.address, 1); // PREMIUM
      const memberData = await membership.getMember(orgId, member1.address);
      expect(memberData.tier).to.equal(1);

      // Verify complete member setup
      expect(await membership.isMember(orgId, member1.address)).to.be.true;
      expect(await sense.hasProfile(orgId, member1.address)).to.be.true;
      expect(verifiedProfile.verificationLevel).to.equal(2);
      expect(memberData.tier).to.equal(1);
    });
  });

  describe("Complete Governance Workflow", function () {
    let orgId: string;

    beforeEach(async function () {
      // Setup organization and members
      await gameToken.connect(orgCreator).approve(await staking.getAddress(), MIN_STAKE_AMOUNT);
      const tx = await factory.connect(orgCreator).createOrganization(
        orgCreator.address, "Governance DAO", "https://example.com", 0, 0, 0, 1000, 0, MIN_STAKE_AMOUNT
      );
      const receipt = await tx.wait();
      const event = receipt?.logs.find(log =>
        log.topics[0] === ethers.id("OrganizationCreated(bytes8,string,address,address,uint256)")
      );
      orgId = ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes8", "string", "address", "address", "uint256"], event!.data
      )[0];

      await membership.connect(admin).activateOrganization(orgId);

      // Setup members with profiles
      const members = [orgCreator, member1, member2, member3];
      const usernames = ["creator", "voter1", "voter2", "voter3"];

      for (let i = 0; i < members.length; i++) {
        await identity.connect(members[i]).createProfile(
          orgId, usernames[i], `Bio ${i}`, `avatar${i}.jpg`, `user${i}.com`
        );
        await membership.connect(admin).addMember(orgId, members[i].address, i % 3);
        await sense.connect(members[i]).createProfile(orgId, `Member ${i} bio`, `avatar${i}.jpg`);
      }
    });

    it("Should complete full governance proposal lifecycle", async function () {
      // Step 1: Create proposal
      const tx = await signal.connect(orgCreator).createProposal(
        orgId,
        "Treasury Allocation",
        "Allocate 1000 GAME tokens for development",
        "https://example.com/proposal",
        86400, // 1 day voting period
        60, // 60% threshold
        3 // minimum 3 votes
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find(log =>
        log.topics[0] === ethers.id("ProposalCreated(bytes8,bytes8,address,string,uint256,uint256)")
      );
      const proposalId = ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes8", "bytes8", "address", "string", "uint256", "uint256"], event!.data
      )[0];

      // Step 2: Members vote on proposal
      await signal.connect(member1).vote(proposalId, true, "I support this proposal");
      await signal.connect(member2).vote(proposalId, true, "Good idea");
      await signal.connect(member3).vote(proposalId, false, "Need more details");

      // Step 3: Check voting results
      const proposal = await signal.getProposal(proposalId);
      expect(proposal.title).to.equal("Treasury Allocation");
      expect(proposal.creator).to.equal(orgCreator.address);

      // Step 4: Award reputation for participation
      await sense.connect(admin).awardReputation(orgId, orgCreator.address, 100, "Proposal creation");
      await sense.connect(admin).awardReputation(orgId, member1.address, 50, "Voting participation");
      await sense.connect(admin).awardReputation(orgId, member2.address, 50, "Voting participation");
      await sense.connect(admin).awardReputation(orgId, member3.address, 50, "Voting participation");

      // Verify reputation updates
      const creatorReputation = await sense.getReputation(orgId, orgCreator.address);
      const voter1Reputation = await sense.getReputation(orgId, member1.address);

      expect(creatorReputation).to.be.gt(1000); // Base + bonus
      expect(voter1Reputation).to.be.gt(1000); // Base + bonus
    });
  });

  describe("Complete Campaign Workflow", function () {
    let orgId: string;

    beforeEach(async function () {
      // Setup organization
      await gameToken.connect(orgCreator).approve(await staking.getAddress(), MIN_STAKE_AMOUNT);
      const tx = await factory.connect(orgCreator).createOrganization(
        orgCreator.address, "Campaign DAO", "https://example.com", 0, 0, 0, 1000, 0, MIN_STAKE_AMOUNT
      );
      const receipt = await tx.wait();
      const event = receipt?.logs.find(log =>
        log.topics[0] === ethers.id("OrganizationCreated(bytes8,string,address,address,uint256)")
      );
      orgId = ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes8", "string", "address", "address", "uint256"], event!.data
      )[0];

      await membership.connect(admin).activateOrganization(orgId);

      // Setup members
      const members = [orgCreator, member1, contributor];
      const usernames = ["campaigner", "supporter", "contributor"];

      for (let i = 0; i < members.length; i++) {
        await identity.connect(members[i]).createProfile(
          orgId, usernames[i], `Bio ${i}`, `avatar${i}.jpg`, `user${i}.com`
        );
        await membership.connect(admin).addMember(orgId, members[i].address, i % 3);
        await sense.connect(members[i]).createProfile(orgId, `Member ${i} bio`, `avatar${i}.jpg`);
      }
    });

    it("Should complete full campaign creation and funding lifecycle", async function () {
      // Step 1: Create campaign
      const tx = await flow.connect(orgCreator).createCampaign(
        orgId,
        "Development Fund",
        "Fund development of new features",
        "https://example.com/campaign",
        ethers.parseEther("5000"), // 5000 GAME target
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

      // Step 2: Award reputation for campaign creation
      await sense.connect(admin).awardReputation(orgId, orgCreator.address, 100, "Campaign creation");

      // Step 3: Contributors fund the campaign
      await gameToken.connect(member1).approve(await flow.getAddress(), ethers.parseEther("2000"));
      await flow.connect(member1).contribute(campaignId, ethers.parseEther("2000"));

      await gameToken.connect(contributor).approve(await flow.getAddress(), ethers.parseEther("3000"));
      await flow.connect(contributor).contribute(campaignId, ethers.parseEther("3000"));

      // Step 4: Award reputation for contributions
      await sense.connect(admin).awardReputation(orgId, member1.address, 50, "Campaign contribution");
      await sense.connect(admin).awardReputation(orgId, contributor.address, 75, "Major contribution");

      // Step 5: Verify campaign funding
      const campaign = await flow.getCampaign(campaignId);
      expect(campaign.title).to.equal("Development Fund");
      expect(campaign.creator).to.equal(orgCreator.address);

      // Step 6: Check reputation updates
      const creatorReputation = await sense.getReputation(orgId, orgCreator.address);
      const contributorReputation = await sense.getReputation(orgId, contributor.address);

      expect(creatorReputation).to.be.gt(1000); // Base + creation bonus
      expect(contributorReputation).to.be.gt(1000); // Base + contribution bonus
    });
  });

  describe("Complete Multi-Module User Journey", function () {
    let orgId: string;

    beforeEach(async function () {
      // Create organization
      await gameToken.connect(orgCreator).approve(await staking.getAddress(), MIN_STAKE_AMOUNT);
      const tx = await factory.connect(orgCreator).createOrganization(
        orgCreator.address, "Full Journey DAO", "https://example.com", 0, 0, 0, 1000, 0, MIN_STAKE_AMOUNT
      );
      const receipt = await tx.wait();
      const event = receipt?.logs.find(log =>
        log.topics[0] === ethers.id("OrganizationCreated(bytes8,string,address,address,uint256)")
      );
      orgId = ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes8", "string", "address", "address", "uint256"], event!.data
      )[0];

      await membership.connect(admin).activateOrganization(orgId);
    });

    it("Should complete comprehensive user journey across all modules", async function () {
      // === IDENTITY PHASE ===
      // Step 1: User creates profile
      await identity.connect(member1).createProfile(
        orgId, "poweruser", "Power User", "power.jpg", "power.com"
      );

      const userProfile = await identity.getProfileByOwner(member1.address, orgId);
      expect(userProfile.username).to.equal("poweruser");

      // === MEMBERSHIP PHASE ===
      // Step 2: User joins organization
      await membership.connect(admin).addMember(orgId, member1.address, 0); // STANDARD
      expect(await membership.isMember(orgId, member1.address)).to.be.true;

      // === SENSE PHASE ===
      // Step 3: User creates reputation profile
      await sense.connect(member1).createProfile(orgId, "Active contributor", "power.jpg");
      expect(await sense.hasProfile(orgId, member1.address)).to.be.true;

      // Step 4: User gets initial reputation
      await sense.connect(admin).awardReputation(orgId, member1.address, 200, "Welcome bonus");
      let reputation = await sense.getReputation(orgId, member1.address);
      expect(reputation).to.be.gt(1000);

      // === VERIFICATION PHASE ===
      // Step 5: User gets verified
      await identity.connect(verifier).verifyProfile(userProfile.profileId, 2);
      const verifiedProfile = await identity.getProfile(userProfile.profileId);
      expect(verifiedProfile.verificationLevel).to.equal(2);

      // === MEMBERSHIP UPGRADE PHASE ===
      // Step 6: User gets upgraded to premium
      await membership.connect(admin).updateMemberTier(orgId, member1.address, 1); // PREMIUM
      const memberData = await membership.getMember(orgId, member1.address);
      expect(memberData.tier).to.equal(1);

      // === GOVERNANCE PHASE ===
      // Step 7: User creates proposal
      const proposalTx = await signal.connect(member1).createProposal(
        orgId,
        "User Proposal",
        "Proposal by power user",
        "https://example.com/proposal",
        86400, 50, 1
      );

      const proposalReceipt = await proposalTx.wait();
      const proposalEvent = proposalReceipt?.logs.find(log =>
        log.topics[0] === ethers.id("ProposalCreated(bytes8,bytes8,address,string,uint256,uint256)")
      );
      const proposalId = ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes8", "bytes8", "address", "string", "uint256", "uint256"], proposalEvent!.data
      )[0];

      // Step 8: User votes on own proposal
      await signal.connect(member1).vote(proposalId, true, "Supporting my proposal");

      // Step 9: Award reputation for governance participation
      await sense.connect(admin).awardReputation(orgId, member1.address, 150, "Proposal creation");
      reputation = await sense.getReputation(orgId, member1.address);
      expect(reputation).to.be.gt(1300);

      // === CAMPAIGN PHASE ===
      // Step 10: User creates campaign
      const campaignTx = await flow.connect(member1).createCampaign(
        orgId,
        "User Campaign",
        "Campaign by power user",
        "https://example.com/campaign",
        ethers.parseEther("1000"),
        Math.floor(Date.now() / 1000) + 86400,
        0
      );

      const campaignReceipt = await campaignTx.wait();
      const campaignEvent = campaignReceipt?.logs.find(log =>
        log.topics[0] === ethers.id("CampaignCreated(bytes8,bytes8,address,string,uint256,uint256)")
      );
      const campaignId = ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes8", "bytes8", "address", "string", "uint256", "uint256"], campaignEvent!.data
      )[0];

      // Step 11: User contributes to own campaign
      await gameToken.connect(member1).approve(await flow.getAddress(), ethers.parseEther("500"));
      await flow.connect(member1).contribute(campaignId, ethers.parseEther("500"));

      // Step 12: Award reputation for campaign activities
      await sense.connect(admin).awardReputation(orgId, member1.address, 100, "Campaign creation");
      await sense.connect(admin).awardReputation(orgId, member1.address, 50, "Self-contribution");

      // === FINAL VERIFICATION ===
      // Verify user's complete journey
      const finalProfile = await identity.getProfile(userProfile.profileId);
      const finalMemberData = await membership.getMember(orgId, member1.address);
      const finalReputation = await sense.getReputation(orgId, member1.address);

      expect(finalProfile.username).to.equal("poweruser");
      expect(finalProfile.verificationLevel).to.equal(2);
      expect(finalMemberData.tier).to.equal(1);
      expect(finalReputation).to.be.gt(1500);
      expect(await membership.isMember(orgId, member1.address)).to.be.true;
      expect(await sense.hasProfile(orgId, member1.address)).to.be.true;

      // Verify user has created content across all modules
      const proposal = await signal.getProposal(proposalId);
      const campaign = await flow.getCampaign(campaignId);

      expect(proposal.creator).to.equal(member1.address);
      expect(campaign.creator).to.equal(member1.address);
    });
  });

  describe("Organization Growth and Scaling", function () {
    let orgId: string;

    beforeEach(async function () {
      // Create organization
      await gameToken.connect(orgCreator).approve(await staking.getAddress(), MIN_STAKE_AMOUNT);
      const tx = await factory.connect(orgCreator).createOrganization(
        orgCreator.address, "Growth DAO", "https://example.com", 0, 0, 0, 1000, 0, MIN_STAKE_AMOUNT
      );
      const receipt = await tx.wait();
      const event = receipt?.logs.find(log =>
        log.topics[0] === ethers.id("OrganizationCreated(bytes8,string,address,address,uint256)")
      );
      orgId = ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes8", "string", "address", "address", "uint256"], event!.data
      )[0];

      await membership.connect(admin).activateOrganization(orgId);
    });

    it("Should handle organization growth from creation to active community", async function () {
      // Phase 1: Organization Bootstrap
      await identity.connect(orgCreator).createProfile(
        orgId, "founder", "DAO Founder", "founder.jpg", "founder.com"
      );
      await membership.connect(admin).addMember(orgId, orgCreator.address, 2); // VIP
      await sense.connect(orgCreator).createProfile(orgId, "DAO Founder", "founder.jpg");

      // Phase 2: Early Members Join
      const earlyMembers = [member1, member2];
      for (let i = 0; i < earlyMembers.length; i++) {
        await identity.connect(earlyMembers[i]).createProfile(
          orgId, `early${i}`, `Early Member ${i}`, `early${i}.jpg`, `early${i}.com`
        );
        await membership.connect(admin).addMember(orgId, earlyMembers[i].address, 1); // PREMIUM
        await sense.connect(earlyMembers[i]).createProfile(orgId, `Early Member ${i}`, `early${i}.jpg`);
      }

      // Phase 3: Community Growth
      const newMembers = [member3, contributor];
      for (let i = 0; i < newMembers.length; i++) {
        await identity.connect(newMembers[i]).createProfile(
          orgId, `member${i}`, `Member ${i}`, `member${i}.jpg`, `member${i}.com`
        );
        await membership.connect(admin).addMember(orgId, newMembers[i].address, 0); // STANDARD
        await sense.connect(newMembers[i]).createProfile(orgId, `Member ${i}`, `member${i}.jpg`);
      }

      // Phase 4: Active Governance
      const proposalTx = await signal.connect(orgCreator).createProposal(
        orgId, "Growth Proposal", "Expand the community", "https://example.com", 86400, 60, 3
      );
      const proposalReceipt = await proposalTx.wait();
      const proposalEvent = proposalReceipt?.logs.find(log =>
        log.topics[0] === ethers.id("ProposalCreated(bytes8,bytes8,address,string,uint256,uint256)")
      );
      const proposalId = ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes8", "bytes8", "address", "string", "uint256", "uint256"], proposalEvent!.data
      )[0];

      // All members vote
      await signal.connect(member1).vote(proposalId, true, "Support growth");
      await signal.connect(member2).vote(proposalId, true, "Good idea");
      await signal.connect(member3).vote(proposalId, false, "Too fast");

      // Phase 5: Campaign Activities
      const campaignTx = await flow.connect(orgCreator).createCampaign(
        orgId, "Growth Fund", "Fund growth initiatives", "https://example.com",
        ethers.parseEther("10000"), Math.floor(Date.now() / 1000) + 86400, 0
      );
      const campaignReceipt = await campaignTx.wait();
      const campaignEvent = campaignReceipt?.logs.find(log =>
        log.topics[0] === ethers.id("CampaignCreated(bytes8,bytes8,address,string,uint256,uint256)")
      );
      const campaignId = ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes8", "bytes8", "address", "string", "uint256", "uint256"], campaignEvent!.data
      )[0];

      // Members contribute
      await gameToken.connect(member1).approve(await flow.getAddress(), ethers.parseEther("2000"));
      await flow.connect(member1).contribute(campaignId, ethers.parseEther("2000"));

      await gameToken.connect(contributor).approve(await flow.getAddress(), ethers.parseEther("3000"));
      await flow.connect(contributor).contribute(campaignId, ethers.parseEther("3000"));

      // Phase 6: Reputation Distribution
      await sense.connect(admin).awardReputation(orgId, orgCreator.address, 200, "Leadership");
      await sense.connect(admin).awardReputation(orgId, member1.address, 150, "Active participation");
      await sense.connect(admin).awardReputation(orgId, member2.address, 100, "Governance participation");
      await sense.connect(admin).awardReputation(orgId, contributor.address, 175, "Major contribution");

      // Final Verification: Organization is fully active
      expect(await membership.getMemberCount(orgId)).to.equal(5);
      expect(await identity.getOrganizationProfileCount(orgId)).to.equal(5);

      const totalVotingPower = await membership.getTotalVotingPower(orgId);
      expect(totalVotingPower).to.be.gt(0);

      // Verify all members have reputation
      const founderReputation = await sense.getReputation(orgId, orgCreator.address);
      const contributorReputation = await sense.getReputation(orgId, contributor.address);

      expect(founderReputation).to.be.gt(1000);
      expect(contributorReputation).to.be.gt(1000);
    });
  });

  describe("Error Recovery and Edge Cases", function () {
    let orgId: string;

    beforeEach(async function () {
      await gameToken.connect(orgCreator).approve(await staking.getAddress(), MIN_STAKE_AMOUNT);
      const tx = await factory.connect(orgCreator).createOrganization(
        orgCreator.address, "Error Test DAO", "https://example.com", 0, 0, 0, 1000, 0, MIN_STAKE_AMOUNT
      );
      const receipt = await tx.wait();
      const event = receipt?.logs.find(log =>
        log.topics[0] === ethers.id("OrganizationCreated(bytes8,string,address,address,uint256)")
      );
      orgId = ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes8", "string", "address", "address", "uint256"], event!.data
      )[0];

      await membership.connect(admin).activateOrganization(orgId);
    });

    it("Should handle member removal and profile deactivation gracefully", async function () {
      // Setup member
      await identity.connect(member1).createProfile(
        orgId, "removeme", "Remove Me", "remove.jpg", "remove.com"
      );
      await membership.connect(admin).addMember(orgId, member1.address, 0);
      await sense.connect(member1).createProfile(orgId, "Remove Me Bio", "remove.jpg");

      const memberProfile = await identity.getProfileByOwner(member1.address, orgId);

      // Remove member from organization
      await membership.connect(admin).removeMember(orgId, member1.address);
      expect(await membership.isMember(orgId, member1.address)).to.be.false;

      // Profile should still exist but member should be removed
      const profile = await identity.getProfile(memberProfile.profileId);
      expect(profile.isActive).to.be.true;
      expect(await sense.hasProfile(orgId, member1.address)).to.be.true;

      // Deactivate profile
      await identity.connect(member1).deactivateProfile(memberProfile.profileId);
      const deactivatedProfile = await identity.getProfile(memberProfile.profileId);
      expect(deactivatedProfile.isActive).to.be.false;
    });

    it("Should handle organization deactivation impact", async function () {
      // Setup members
      await identity.connect(member1).createProfile(
        orgId, "testmember", "Test Member", "test.jpg", "test.com"
      );
      await membership.connect(admin).addMember(orgId, member1.address, 0);
      await sense.connect(member1).createProfile(orgId, "Test Bio", "test.jpg");

      // Deactivate organization
      await membership.connect(admin).deactivateOrganization(orgId);
      expect(await membership.isOrganizationActive(orgId)).to.be.false;

      // Should prevent new member additions
      await expect(
        membership.connect(admin).addMember(orgId, member2.address, 0)
      ).to.be.revertedWith("Organization not active");

      // Existing profiles should still be accessible
      const memberProfile = await identity.getProfileByOwner(member1.address, orgId);
      expect(memberProfile.username).to.equal("testmember");
    });
  });
});
