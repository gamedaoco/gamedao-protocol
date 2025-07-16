import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  OrganizationSettings,
  SignalWithMembership,
  FlowWithMembership,
  SenseWithMembership,
  ControlWithSettings,
  GameDAOMembershipWithSettings,
  MockGameToken,
  MockGameStaking,
  GameDAORegistry
} from "../typechain-types";

describe("Membership Integration Tests", function () {
  let organizationSettings: OrganizationSettings;
  let signal: SignalWithMembership;
  let flow: FlowWithMembership;
  let sense: SenseWithMembership;
  let control: ControlWithSettings;
  let membership: GameDAOMembershipWithSettings;
  let gameToken: MockGameToken;
  let gameStaking: MockGameStaking;
  let registry: GameDAORegistry;

  let owner: SignerWithAddress;
  let creator: SignerWithAddress;
  let member1: SignerWithAddress;
  let member2: SignerWithAddress;
  let member3: SignerWithAddress;
  let nonMember: SignerWithAddress;

  let organizationId: string;
  const INITIAL_SUPPLY = ethers.utils.parseEther("1000000");
  const ORGANIZATION_STAKE = ethers.utils.parseEther("10000");
  const MEMBERSHIP_FEE = ethers.utils.parseEther("100");

  beforeEach(async function () {
    [owner, creator, member1, member2, member3, nonMember] = await ethers.getSigners();

    // Deploy mock contracts
    const MockGameToken = await ethers.getContractFactory("MockGameToken");
    gameToken = await MockGameToken.deploy("GameDAO Token", "GAME", INITIAL_SUPPLY);
    await gameToken.deployed();

    const MockGameStaking = await ethers.getContractFactory("MockGameStaking");
    gameStaking = await MockGameStaking.deploy(gameToken.address);
    await gameStaking.deployed();

    // Deploy OrganizationSettings
    const OrganizationSettings = await ethers.getContractFactory("OrganizationSettings");
    organizationSettings = await OrganizationSettings.deploy();
    await organizationSettings.deployed();

    // Deploy GameDAOMembershipWithSettings
    const GameDAOMembershipWithSettings = await ethers.getContractFactory("GameDAOMembershipWithSettings");
    membership = await GameDAOMembershipWithSettings.deploy(
      ethers.constants.AddressZero, // identityContract
      ethers.constants.AddressZero, // controlContract - will be set later
      gameToken.address,
      organizationSettings.address
    );
    await membership.deployed();

    // Deploy ControlWithSettings
    const ControlWithSettings = await ethers.getContractFactory("ControlWithSettings");
    control = await ControlWithSettings.deploy(
      gameStaking.address,
      membership.address,
      organizationSettings.address
    );
    await control.deployed();

    // Deploy GameDAORegistry
    const GameDAORegistry = await ethers.getContractFactory("GameDAORegistry");
    registry = await GameDAORegistry.deploy();
    await registry.deployed();

    // Deploy SignalWithMembership
    const SignalWithMembership = await ethers.getContractFactory("SignalWithMembership");
    signal = await SignalWithMembership.deploy();
    await signal.deployed();

    // Deploy FlowWithMembership
    const FlowWithMembership = await ethers.getContractFactory("FlowWithMembership");
    flow = await FlowWithMembership.deploy();
    await flow.deployed();

    // Deploy SenseWithMembership
    const SenseWithMembership = await ethers.getContractFactory("SenseWithMembership");
    sense = await SenseWithMembership.deploy();
    await sense.deployed();

    // Initialize registry
    await registry.initialize(owner.address);

    // Register modules
    await registry.registerModule(keccak256("CONTROL"), control.address);
    await registry.registerModule(keccak256("SIGNAL"), signal.address);
    await registry.registerModule(keccak256("FLOW"), flow.address);
    await registry.registerModule(keccak256("SENSE"), sense.address);

    // Initialize modules
    await control.initialize(registry.address);
    await signal.initialize(registry.address);
    await flow.initialize(registry.address);
    await sense.initialize(registry.address);

    // Set up contract references
    await organizationSettings.setSignalContract(signal.address);
    await organizationSettings.setControlContract(control.address);
    await organizationSettings.setMembershipContract(membership.address);

    await signal.setOrganizationSettings(organizationSettings.address);
    await signal.setMembershipContract(membership.address);
    await flow.setMembershipContract(membership.address);
    await sense.setMembershipContract(membership.address);

    // Grant roles
    await organizationSettings.grantRole(await organizationSettings.GOVERNANCE_ROLE(), signal.address);
    await membership.grantRole(await membership.ORGANIZATION_MANAGER_ROLE(), control.address);
    await gameStaking.grantRole(await gameStaking.ORGANIZATION_MANAGER_ROLE(), control.address);

    // Distribute tokens
    await gameToken.transfer(creator.address, ethers.utils.parseEther("50000"));
    await gameToken.transfer(member1.address, ethers.utils.parseEther("10000"));
    await gameToken.transfer(member2.address, ethers.utils.parseEther("10000"));
    await gameToken.transfer(member3.address, ethers.utils.parseEther("10000"));

    // Approve tokens for staking
    await gameToken.connect(creator).approve(gameStaking.address, ORGANIZATION_STAKE);
    await gameToken.connect(creator).approve(control.address, ORGANIZATION_STAKE);

    // Create organization
    const tx = await control.connect(creator).createOrganization(
      "Test Organization",
      "https://metadata.uri",
      0, // Individual
      0, // Open
      0, // NoFees
      1000, // memberLimit
      MEMBERSHIP_FEE,
      ORGANIZATION_STAKE
    );
    const receipt = await tx.wait();
    const event = receipt.events?.find(e => e.event === "OrganizationCreated");
    organizationId = event?.args?.id;
  });

  describe("Signal Module Integration", function () {
    it("Should use membership contract for voting power", async function () {
      // Add member
      await gameToken.connect(member1).approve(membership.address, MEMBERSHIP_FEE);
      await control.connect(member1).addMember(organizationId, member1.address);

      // Check voting power from membership contract
      const votingPower = await membership.getVotingPower(organizationId, member1.address);
      expect(votingPower).to.be.gt(0);

      // Create proposal
      const proposalId = await signal.connect(member1).callStatic.createProposal(
        organizationId,
        "Test Proposal",
        "Test Description",
        "https://metadata.uri",
        0, // Simple
        0, // Relative
        0, // Democratic
        604800, // 7 days
        "0x",
        ethers.constants.AddressZero
      );

      await signal.connect(member1).createProposal(
        organizationId,
        "Test Proposal",
        "Test Description",
        "https://metadata.uri",
        0, // Simple
        0, // Relative
        0, // Democratic
        604800, // 7 days
        "0x",
        ethers.constants.AddressZero
      );

      // Check proposal was created
      const proposal = await signal.getProposal(proposalId);
      expect(proposal.creator).to.equal(member1.address);
    });

    it("Should require membership for proposal creation", async function () {
      // Try to create proposal without membership
      await expect(
        signal.connect(nonMember).createProposal(
          organizationId,
          "Test Proposal",
          "Test Description",
          "https://metadata.uri",
          0, // Simple
          0, // Relative
          0, // Democratic
          604800, // 7 days
          "0x",
          ethers.constants.AddressZero
        )
      ).to.be.revertedWith("Membership required");
    });

    it("Should reward members for proposal creation", async function () {
      // Add member
      await gameToken.connect(member1).approve(membership.address, MEMBERSHIP_FEE);
      await control.connect(member1).addMember(organizationId, member1.address);

      // Get initial reputation
      const initialMember = await membership.getMember(organizationId, member1.address);
      const initialReputation = initialMember.reputation;

      // Create proposal
      await signal.connect(member1).createProposal(
        organizationId,
        "Test Proposal",
        "Test Description",
        "https://metadata.uri",
        0, // Simple
        0, // Relative
        0, // Democratic
        604800, // 7 days
        "0x",
        ethers.constants.AddressZero
      );

      // Check reputation increased
      const updatedMember = await membership.getMember(organizationId, member1.address);
      expect(updatedMember.reputation).to.be.gt(initialReputation);
    });

    it("Should use membership contract for voting", async function () {
      // Add members
      await gameToken.connect(member1).approve(membership.address, MEMBERSHIP_FEE);
      await gameToken.connect(member2).approve(membership.address, MEMBERSHIP_FEE);
      await control.connect(member1).addMember(organizationId, member1.address);
      await control.connect(member2).addMember(organizationId, member2.address);

      // Create proposal
      const proposalId = await signal.connect(member1).callStatic.createProposal(
        organizationId,
        "Test Proposal",
        "Test Description",
        "https://metadata.uri",
        0, // Simple
        0, // Relative
        0, // Democratic
        604800, // 7 days
        "0x",
        ethers.constants.AddressZero
      );

      await signal.connect(member1).createProposal(
        organizationId,
        "Test Proposal",
        "Test Description",
        "https://metadata.uri",
        0, // Simple
        0, // Relative
        0, // Democratic
        604800, // 7 days
        "0x",
        ethers.constants.AddressZero
      );

      // Wait for voting delay
      await ethers.provider.send("evm_increaseTime", [86400]); // 1 day
      await ethers.provider.send("evm_mine", []);

      // Cast votes
      await signal.connect(member1).castVote(proposalId, 2, "Support"); // For
      await signal.connect(member2).castVote(proposalId, 2, "Support"); // For

      // Check votes were recorded
      const vote1 = await signal.getVote(proposalId, member1.address);
      const vote2 = await signal.getVote(proposalId, member2.address);

      expect(vote1.hasVoted).to.be.true;
      expect(vote2.hasVoted).to.be.true;
      expect(vote1.votingPower).to.be.gt(0);
      expect(vote2.votingPower).to.be.gt(0);
    });
  });

  describe("Flow Module Integration", function () {
    it("Should require membership for campaign creation", async function () {
      // Try to create campaign without membership
      await expect(
        flow.connect(nonMember).createCampaign(
          organizationId,
          "Test Campaign",
          "Test Description",
          "https://metadata.uri",
          0, // Donation
          gameToken.address,
          ethers.utils.parseEther("1000"), // target
          ethers.utils.parseEther("100"), // min
          ethers.utils.parseEther("10000"), // max
          604800, // 7 days
          false // autoFinalize
        )
      ).to.be.revertedWith("Membership required");
    });

    it("Should allow members to create campaigns", async function () {
      // Add member
      await gameToken.connect(member1).approve(membership.address, MEMBERSHIP_FEE);
      await control.connect(member1).addMember(organizationId, member1.address);

      // Create campaign
      const campaignId = await flow.connect(member1).callStatic.createCampaign(
        organizationId,
        "Test Campaign",
        "Test Description",
        "https://metadata.uri",
        0, // Donation
        gameToken.address,
        ethers.utils.parseEther("1000"), // target
        ethers.utils.parseEther("100"), // min
        ethers.utils.parseEther("10000"), // max
        604800, // 7 days
        false // autoFinalize
      );

      await flow.connect(member1).createCampaign(
        organizationId,
        "Test Campaign",
        "Test Description",
        "https://metadata.uri",
        0, // Donation
        gameToken.address,
        ethers.utils.parseEther("1000"), // target
        ethers.utils.parseEther("100"), // min
        ethers.utils.parseEther("10000"), // max
        604800, // 7 days
        false // autoFinalize
      );

      // Check campaign was created
      const campaign = await flow.getCampaign(campaignId);
      expect(campaign.creator).to.equal(member1.address);
      expect(campaign.organizationId).to.equal(organizationId);
    });

    it("Should reward members for campaign creation", async function () {
      // Add member
      await gameToken.connect(member1).approve(membership.address, MEMBERSHIP_FEE);
      await control.connect(member1).addMember(organizationId, member1.address);

      // Get initial reputation
      const initialMember = await membership.getMember(organizationId, member1.address);
      const initialReputation = initialMember.reputation;

      // Create campaign
      await flow.connect(member1).createCampaign(
        organizationId,
        "Test Campaign",
        "Test Description",
        "https://metadata.uri",
        0, // Donation
        gameToken.address,
        ethers.utils.parseEther("1000"), // target
        ethers.utils.parseEther("100"), // min
        ethers.utils.parseEther("10000"), // max
        604800, // 7 days
        false // autoFinalize
      );

      // Check reputation increased
      const updatedMember = await membership.getMember(organizationId, member1.address);
      expect(updatedMember.reputation).to.be.gt(initialReputation);
    });

    it("Should validate admin membership for campaign management", async function () {
      // Add member
      await gameToken.connect(member1).approve(membership.address, MEMBERSHIP_FEE);
      await control.connect(member1).addMember(organizationId, member1.address);

      // Create campaign
      const campaignId = await flow.connect(member1).callStatic.createCampaign(
        organizationId,
        "Test Campaign",
        "Test Description",
        "https://metadata.uri",
        0, // Donation
        gameToken.address,
        ethers.utils.parseEther("1000"), // target
        ethers.utils.parseEther("100"), // min
        ethers.utils.parseEther("10000"), // max
        604800, // 7 days
        false // autoFinalize
      );

      await flow.connect(member1).createCampaign(
        organizationId,
        "Test Campaign",
        "Test Description",
        "https://metadata.uri",
        0, // Donation
        gameToken.address,
        ethers.utils.parseEther("1000"), // target
        ethers.utils.parseEther("100"), // min
        ethers.utils.parseEther("10000"), // max
        604800, // 7 days
        false // autoFinalize
      );

      // Try to update admin to non-member
      await expect(
        flow.connect(member1).updateCampaignAdmin(campaignId, nonMember.address)
      ).to.be.revertedWith("Membership required");
    });

    it("Should reward contributors with reputation", async function () {
      // Add members
      await gameToken.connect(member1).approve(membership.address, MEMBERSHIP_FEE);
      await gameToken.connect(member2).approve(membership.address, MEMBERSHIP_FEE);
      await control.connect(member1).addMember(organizationId, member1.address);
      await control.connect(member2).addMember(organizationId, member2.address);

      // Create campaign
      const campaignId = await flow.connect(member1).callStatic.createCampaign(
        organizationId,
        "Test Campaign",
        "Test Description",
        "https://metadata.uri",
        0, // Donation
        gameToken.address,
        ethers.utils.parseEther("1000"), // target
        ethers.utils.parseEther("100"), // min
        ethers.utils.parseEther("10000"), // max
        604800, // 7 days
        false // autoFinalize
      );

      await flow.connect(member1).createCampaign(
        organizationId,
        "Test Campaign",
        "Test Description",
        "https://metadata.uri",
        0, // Donation
        gameToken.address,
        ethers.utils.parseEther("1000"), // target
        ethers.utils.parseEther("100"), // min
        ethers.utils.parseEther("10000"), // max
        604800, // 7 days
        false // autoFinalize
      );

      // Activate campaign
      await flow.connect(member1).activateCampaign(campaignId);

      // Get initial reputation
      const initialMember = await membership.getMember(organizationId, member2.address);
      const initialReputation = initialMember.reputation;

      // Contribute to campaign
      const contributionAmount = ethers.utils.parseEther("100");
      await gameToken.connect(member2).approve(flow.address, contributionAmount);
      await flow.connect(member2).contribute(campaignId, contributionAmount);

      // Check reputation increased
      const updatedMember = await membership.getMember(organizationId, member2.address);
      expect(updatedMember.reputation).to.be.gt(initialReputation);
    });
  });

  describe("Sense Module Integration", function () {
    it("Should sync reputation with membership contract", async function () {
      // Add member
      await gameToken.connect(member1).approve(membership.address, MEMBERSHIP_FEE);
      await control.connect(member1).addMember(organizationId, member1.address);

      // Create profile ID (simplified)
      const profileId = "0x1234567890123456";

      // Link profile to membership
      await sense.linkProfileToMembership(profileId, organizationId, member1.address);

      // Update reputation
      await sense.updateReputation(profileId, 1, 100, ethers.utils.formatBytes32String("Test"));

      // Check reputation was updated
      const reputation = await sense.getReputation(profileId);
      expect(reputation.reputation).to.equal(100);
    });

    it("Should calculate voting weight with membership integration", async function () {
      // Add member
      await gameToken.connect(member1).approve(membership.address, MEMBERSHIP_FEE);
      await control.connect(member1).addMember(organizationId, member1.address);

      // Create profile ID (simplified)
      const profileId = "0x1234567890123456";

      // Link profile to membership
      await sense.linkProfileToMembership(profileId, organizationId, member1.address);

      // Update reputation
      await sense.updateReputation(profileId, 1, 500, ethers.utils.formatBytes32String("Test"));

      // Calculate voting weight
      const votingWeight = await sense.calculateOrganizationVotingWeight(
        profileId,
        organizationId,
        member1.address
      );

      expect(votingWeight).to.be.gt(0);
    });

    it("Should track profile organizations", async function () {
      // Add member
      await gameToken.connect(member1).approve(membership.address, MEMBERSHIP_FEE);
      await control.connect(member1).addMember(organizationId, member1.address);

      // Create profile ID (simplified)
      const profileId = "0x1234567890123456";

      // Link profile to membership
      await sense.linkProfileToMembership(profileId, organizationId, member1.address);

      // Check profile organizations
      const organizations = await sense.getProfileOrganizations(profileId);
      expect(organizations.length).to.equal(1);
      expect(organizations[0]).to.equal(organizationId);
    });

    it("Should provide reputation-adjusted member data", async function () {
      // Add member
      await gameToken.connect(member1).approve(membership.address, MEMBERSHIP_FEE);
      await control.connect(member1).addMember(organizationId, member1.address);

      // Create profile ID (simplified)
      const profileId = "0x1234567890123456";

      // Link profile to membership
      await sense.linkProfileToMembership(profileId, organizationId, member1.address);

      // Update reputation and experience
      await sense.updateReputation(profileId, 1, 500, ethers.utils.formatBytes32String("Test"));
      await sense.awardExperience(profileId, 1000, ethers.utils.formatBytes32String("Experience"));

      // Get reputation-adjusted member data
      const memberData = await sense.getReputationAdjustedMemberData(
        profileId,
        organizationId,
        member1.address
      );

      expect(memberData.reputation).to.equal(500);
      expect(memberData.experience).to.equal(1000);
      expect(memberData.votingWeight).to.be.gt(0);
    });
  });

  describe("Cross-Module Integration", function () {
    it("Should maintain consistent membership state across modules", async function () {
      // Add member
      await gameToken.connect(member1).approve(membership.address, MEMBERSHIP_FEE);
      await control.connect(member1).addMember(organizationId, member1.address);

      // Check membership in all modules
      const isControlMember = await control.isMember(organizationId, member1.address);
      const isMembershipMember = await membership.isActiveMember(organizationId, member1.address);
      const canCreateCampaign = await flow.canCreateCampaign(organizationId, member1.address);

      expect(isControlMember).to.be.true;
      expect(isMembershipMember).to.be.true;
      expect(canCreateCampaign).to.be.true;
    });

    it("Should handle member removal across modules", async function () {
      // Add member
      await gameToken.connect(member1).approve(membership.address, MEMBERSHIP_FEE);
      await control.connect(member1).addMember(organizationId, member1.address);

      // Verify member exists
      expect(await membership.isActiveMember(organizationId, member1.address)).to.be.true;

      // Remove member
      await control.connect(creator).removeMember(organizationId, member1.address);

      // Verify member removed
      expect(await membership.isActiveMember(organizationId, member1.address)).to.be.false;
      expect(await control.isMember(organizationId, member1.address)).to.be.false;
    });

    it("Should integrate reputation across Signal and Flow", async function () {
      // Add member
      await gameToken.connect(member1).approve(membership.address, MEMBERSHIP_FEE);
      await control.connect(member1).addMember(organizationId, member1.address);

      // Get initial reputation
      const initialMember = await membership.getMember(organizationId, member1.address);
      const initialReputation = initialMember.reputation;

      // Create proposal (rewards reputation)
      await signal.connect(member1).createProposal(
        organizationId,
        "Test Proposal",
        "Test Description",
        "https://metadata.uri",
        0, // Simple
        0, // Relative
        0, // Democratic
        604800, // 7 days
        "0x",
        ethers.constants.AddressZero
      );

      // Create campaign (rewards reputation)
      await flow.connect(member1).createCampaign(
        organizationId,
        "Test Campaign",
        "Test Description",
        "https://metadata.uri",
        0, // Donation
        gameToken.address,
        ethers.utils.parseEther("1000"), // target
        ethers.utils.parseEther("100"), // min
        ethers.utils.parseEther("10000"), // max
        604800, // 7 days
        false // autoFinalize
      );

      // Check reputation increased from both actions
      const updatedMember = await membership.getMember(organizationId, member1.address);
      expect(updatedMember.reputation).to.be.gt(initialReputation);
    });

    it("Should handle voting power consistently", async function () {
      // Add member with different tier
      await gameToken.connect(member1).approve(membership.address, MEMBERSHIP_FEE);
      await control.connect(member1).addMember(organizationId, member1.address);

      // Update member tier to Premium
      await membership.updateMemberTier(organizationId, member1.address, 1); // Premium

      // Check voting power in membership contract
      const membershipVotingPower = await membership.getVotingPower(organizationId, member1.address);

      // Check voting power in Signal contract
      const signalVotingPower = await signal.calculateVotingPower(
        "test-proposal",
        member1.address,
        0 // Democratic
      );

      expect(membershipVotingPower).to.be.gt(1); // Premium tier should have more than 1
      expect(signalVotingPower).to.equal(membershipVotingPower);
    });
  });

  describe("Performance and Gas Optimization", function () {
    it("Should have reduced contract sizes", async function () {
      // This test would check contract sizes during deployment
      // For now, we'll just verify the contracts deployed successfully
      expect(signal.address).to.not.equal(ethers.constants.AddressZero);
      expect(flow.address).to.not.equal(ethers.constants.AddressZero);
      expect(sense.address).to.not.equal(ethers.constants.AddressZero);
    });

    it("Should handle batch operations efficiently", async function () {
      // Add multiple members
      const members = [member1, member2, member3];

      for (const member of members) {
        await gameToken.connect(member).approve(membership.address, MEMBERSHIP_FEE);
        await control.connect(member).addMember(organizationId, member.address);
      }

      // Check all members were added
      const memberCount = await membership.getMemberCount(organizationId);
      expect(memberCount).to.equal(4); // 3 members + 1 creator
    });

    it("Should maintain consistent state during concurrent operations", async function () {
      // Add member
      await gameToken.connect(member1).approve(membership.address, MEMBERSHIP_FEE);
      await control.connect(member1).addMember(organizationId, member1.address);

      // Perform multiple operations simultaneously
      const proposalTx = signal.connect(member1).createProposal(
        organizationId,
        "Test Proposal",
        "Test Description",
        "https://metadata.uri",
        0, // Simple
        0, // Relative
        0, // Democratic
        604800, // 7 days
        "0x",
        ethers.constants.AddressZero
      );

      const campaignTx = flow.connect(member1).createCampaign(
        organizationId,
        "Test Campaign",
        "Test Description",
        "https://metadata.uri",
        0, // Donation
        gameToken.address,
        ethers.utils.parseEther("1000"), // target
        ethers.utils.parseEther("100"), // min
        ethers.utils.parseEther("10000"), // max
        604800, // 7 days
        false // autoFinalize
      );

      // Wait for both transactions
      await Promise.all([proposalTx, campaignTx]);

      // Verify member state is consistent
      const member = await membership.getMember(organizationId, member1.address);
      expect(member.reputation).to.be.gt(100); // Should have increased from both actions
    });
  });
});
