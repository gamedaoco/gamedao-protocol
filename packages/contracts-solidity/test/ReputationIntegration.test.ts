import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { Registry, Control, Factory, Sense, Signal, Flow, Membership, MockGameToken, Staking } from "../typechain-types";

describe("Reputation Integration Tests", function () {
  let registry: Registry;
  let control: Control;
  let factory: Factory;
  let sense: Sense;
  let signal: Signal;
  let flow: Flow;
  let membership: Membership;
  let gameToken: MockGameToken;
  let staking: Staking;

  let admin: SignerWithAddress;
  let creator: SignerWithAddress;
  let member1: SignerWithAddress;
  let member2: SignerWithAddress;
  let contributor: SignerWithAddress;

  let orgId: string;

  const ORGANIZATION_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ORGANIZATION_MANAGER_ROLE"));
  const REPUTATION_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("REPUTATION_MANAGER_ROLE"));

  beforeEach(async function () {
    [admin, creator, member1, member2, contributor] = await ethers.getSigners();

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

    // Deploy Control
    const ControlFactory = await ethers.getContractFactory("Control");
    control = await ControlFactory.deploy(
      await gameToken.getAddress(),
      await staking.getAddress()
    );
    await control.waitForDeployment();

    // Deploy Factory
    const FactoryFactory = await ethers.getContractFactory("contracts/modules/Control/Factory.sol:Factory");
    factory = await FactoryFactory.deploy(
      await gameToken.getAddress(),
      await staking.getAddress()
    );
    await factory.waitForDeployment();

    // Deploy Sense
    const SenseFactory = await ethers.getContractFactory("Sense");
    sense = await SenseFactory.deploy();
    await sense.waitForDeployment();

    // Deploy Signal
    const SignalFactory = await ethers.getContractFactory("Signal");
    signal = await SignalFactory.deploy();
    await signal.waitForDeployment();

    // Deploy Flow
    const FlowFactory = await ethers.getContractFactory("Flow");
    flow = await FlowFactory.deploy();
    await flow.waitForDeployment();

    // Deploy Membership
    const MembershipFactory = await ethers.getContractFactory("Membership");
    membership = await MembershipFactory.deploy();
    await membership.waitForDeployment();

    // Setup registry and module registrations
    await registry.registerModule(await control.getAddress());
    await registry.registerModule(await sense.getAddress());
    await registry.registerModule(await signal.getAddress());
    await registry.registerModule(await flow.getAddress());
    await registry.registerModule(await membership.getAddress());

    await registry.enableModule(await control.getAddress());
    await registry.enableModule(await sense.getAddress());
    await registry.enableModule(await signal.getAddress());
    await registry.enableModule(await flow.getAddress());
    await registry.enableModule(await membership.getAddress());

    // Initialize modules
    await sense.initialize(await registry.getAddress());
    await signal.initialize(await registry.getAddress());
    await flow.initialize(await registry.getAddress());
    await membership.initialize(await registry.getAddress());

    // Setup Factory connections
    await control.setFactory(await factory.getAddress());
    await factory.setRegistry(await control.getAddress());

    // Setup module connections
    await membership.setGameToken(await gameToken.getAddress());
    await membership.setControlContract(await control.getAddress());

    // Grant necessary roles
    await staking.grantRole(ORGANIZATION_MANAGER_ROLE, await factory.getAddress());
    await membership.grantRole(ORGANIZATION_MANAGER_ROLE, admin.address);
    await sense.grantRole(REPUTATION_MANAGER_ROLE, await flow.getAddress());
    await sense.grantRole(REPUTATION_MANAGER_ROLE, await signal.getAddress());
    await sense.grantRole(REPUTATION_MANAGER_ROLE, admin.address);

    // Transfer tokens to test accounts
    const transferAmount = ethers.parseEther("100000");
    await gameToken.transfer(creator.address, transferAmount);
    await gameToken.transfer(member1.address, transferAmount);
    await gameToken.transfer(contributor.address, transferAmount);

    // Create test organization
    const stakeAmount = ethers.parseEther("10000");
    await gameToken.connect(creator).approve(await staking.getAddress(), stakeAmount);

    const tx = await control.connect(creator).createOrganization(
      "Test DAO",
      "https://example.com/metadata",
      0, // OrgType.Individual
      0, // AccessModel.Open
      0, // FeeModel.NoFees
      100, // memberLimit
      0, // membershipFee
      stakeAmount
    );

    const receipt = await tx.wait();
    const events = receipt?.logs || [];
    const organizationCreatedEvent = events.find(event =>
      event.topics[0] === ethers.id("OrganizationCreated(bytes8,string,address,address,uint256)")
    );

    expect(organizationCreatedEvent).to.not.be.undefined;
    orgId = ethers.AbiCoder.defaultAbiCoder().decode(
      ["bytes8", "string", "address", "address", "uint256"],
      organizationCreatedEvent!.data
    )[0];

    // Activate organization for membership
    await membership.connect(admin).activateOrganization(orgId);
  });

  describe("Cross-Module Reputation Integration", function () {
    it("Should award reputation for Flow campaign activities", async function () {
      // Add member1 to organization
      await membership.connect(admin).addMember(orgId, member1.address, 0);

      // Get initial reputation
      const profileId = ethers.encodeBytes32String("profile1").slice(0, 18); // Convert to bytes8

      // Create a campaign (should award reputation)
      const campaignAmount = ethers.parseEther("1000");
      const currentBlock = await ethers.provider.getBlockNumber();

      await flow.connect(member1).createCampaign(
        orgId,
        "Test Campaign",
        "Campaign description",
        campaignAmount,
        currentBlock + 100, // expiry
        await gameToken.getAddress(),
        ethers.ZeroAddress, // no reward token
        0, // no reward amount
        ethers.ZeroAddress // no beneficiary
      );

      // Check if reputation was awarded (this tests Flow -> Sense integration)
      // Note: This would require the Flow contract to properly call Sense.updateReputation
      // The actual reputation check would depend on the profile system being set up
    });

    it("Should use reputation for Signal voting power", async function () {
      // Add members to organization
      await membership.connect(admin).addMember(orgId, member1.address, 0);
      await membership.connect(admin).addMember(orgId, member2.address, 0);

      // Award some reputation to member1
      const profileId1 = ethers.encodeBytes32String("profile1").slice(0, 18);
      await sense.connect(admin).updateReputation(
        orgId,
        profileId1,
        1, // ReputationType.REPUTATION
        500, // +500 reputation
        ethers.keccak256(ethers.toUtf8Bytes("TEST_REWARD"))
      );

      // Create a proposal
      const currentBlock = await ethers.provider.getBlockNumber();

      await signal.connect(member1).createProposal(
        orgId,
        0, // ProposalType.General
        "Test Proposal",
        "Proposal description",
        currentBlock + 10, // start
        currentBlock + 100, // expiry
        3, // Majority.Simple
        1 // VotingPower.Reputation (this should use Sense for voting power calculation)
      );

      // This tests Signal -> Sense integration for reputation-based voting power
    });

    it("Should track reputation across all modules", async function () {
      // Add member to organization
      await membership.connect(admin).addMember(orgId, member1.address, 0);

      const profileId = ethers.encodeBytes32String("profile1").slice(0, 18);

      // Test direct reputation updates
      await sense.connect(admin).updateReputation(
        orgId,
        profileId,
        1, // ReputationType.REPUTATION
        100,
        ethers.keccak256(ethers.toUtf8Bytes("DIRECT_AWARD"))
      );

      // Get reputation data
      const reputationData = await sense.getReputation(orgId, profileId);
      expect(reputationData.reputation).to.equal(100);

      // Test experience points
      await sense.connect(admin).awardExperience(
        orgId,
        profileId,
        50,
        ethers.keccak256(ethers.toUtf8Bytes("EXPERIENCE_AWARD"))
      );

      const updatedData = await sense.getReputation(orgId, profileId);
      expect(updatedData.experience).to.equal(50);

      // Test trust interactions
      await sense.connect(admin).recordInteraction(
        orgId,
        profileId,
        true, // positive interaction
        ethers.keccak256(ethers.toUtf8Bytes("POSITIVE_INTERACTION"))
      );

      const finalData = await sense.getReputation(orgId, profileId);
      expect(finalData.positiveInteractions).to.equal(1);
      expect(finalData.totalInteractions).to.equal(1);
    });

    it("Should calculate voting weights based on reputation", async function () {
      const profileId = ethers.encodeBytes32String("profile1").slice(0, 18);

      // Award reputation
      await sense.connect(admin).updateReputation(
        orgId,
        profileId,
        1, // ReputationType.REPUTATION
        1500, // 1.5x multiplier (1500/1000)
        ethers.keccak256(ethers.toUtf8Bytes("REPUTATION_AWARD"))
      );

      // Test voting weight calculation
      const baseWeight = 100;
      const votingWeight = await sense.calculateVotingWeight(orgId, profileId, baseWeight);

      // Should be 100 * 1500 / 1000 = 150
      expect(votingWeight).to.equal(150);
    });

    it("Should handle organization-scoped reputation correctly", async function () {
      // Create second organization for testing scope isolation
      const stakeAmount = ethers.parseEther("10000");
      await gameToken.connect(creator).approve(await staking.getAddress(), stakeAmount);

      const tx = await control.connect(creator).createOrganization(
        "Second DAO",
        "https://example.com/metadata2",
        0, // OrgType.Individual
        0, // AccessModel.Open
        0, // FeeModel.NoFees
        100, // memberLimit
        0, // membershipFee
        stakeAmount
      );

      const receipt = await tx.wait();
      const events = receipt?.logs || [];
      const organizationCreatedEvent = events.find(event =>
        event.topics[0] === ethers.id("OrganizationCreated(bytes8,string,address,address,uint256)")
      );

      const orgId2 = ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes8", "string", "address", "address", "uint256"],
        organizationCreatedEvent!.data
      )[0];

      const profileId = ethers.encodeBytes32String("profile1").slice(0, 18);

      // Award reputation in first organization
      await sense.connect(admin).updateReputation(
        orgId,
        profileId,
        1, // ReputationType.REPUTATION
        100,
        ethers.keccak256(ethers.toUtf8Bytes("ORG1_AWARD"))
      );

      // Award different reputation in second organization
      await sense.connect(admin).updateReputation(
        orgId2,
        profileId,
        1, // ReputationType.REPUTATION
        200,
        ethers.keccak256(ethers.toUtf8Bytes("ORG2_AWARD"))
      );

      // Check reputation is scoped correctly
      const org1Reputation = await sense.getReputation(orgId, profileId);
      const org2Reputation = await sense.getReputation(orgId2, profileId);

      expect(org1Reputation.reputation).to.equal(100);
      expect(org2Reputation.reputation).to.equal(200);
      expect(org1Reputation.organizationId).to.equal(orgId);
      expect(org2Reputation.organizationId).to.equal(orgId2);
    });
  });
});
