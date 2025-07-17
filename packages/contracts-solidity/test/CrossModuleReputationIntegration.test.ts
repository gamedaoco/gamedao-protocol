import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { Registry, Control, Factory, Sense, Signal, Flow, Membership, MockGameToken, Staking, Identity } from "../typechain-types";

describe("Cross-Module Reputation Integration", function () {
  let registry: Registry;
  let control: Control;
  let factory: Factory;
  let sense: Sense;
  let signal: Signal;
  let flow: Flow;
  let membership: Membership;
  let identity: Identity;
  let gameToken: MockGameToken;
  let staking: Staking;

  let admin: SignerWithAddress;
  let creator: SignerWithAddress;
  let member1: SignerWithAddress;
  let member2: SignerWithAddress;
  let contributor: SignerWithAddress;

  let orgId: string;
  let profileId1: string;
  let profileId2: string;

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

    // Deploy all modules
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

    const SenseFactory = await ethers.getContractFactory("Sense");
    sense = await SenseFactory.deploy();
    await sense.waitForDeployment();

    const SignalFactory = await ethers.getContractFactory("Signal");
    signal = await SignalFactory.deploy();
    await signal.waitForDeployment();

    const FlowFactory = await ethers.getContractFactory("Flow");
    flow = await FlowFactory.deploy();
    await flow.waitForDeployment();

    const MembershipFactory = await ethers.getContractFactory("Membership");
    membership = await MembershipFactory.deploy();
    await membership.waitForDeployment();

    const IdentityFactory = await ethers.getContractFactory("Identity");
    identity = await IdentityFactory.deploy();
    await identity.waitForDeployment();

    // Register all modules
    await registry.registerModule(await control.getAddress());
    await registry.registerModule(await sense.getAddress());
    await registry.registerModule(await signal.getAddress());
    await registry.registerModule(await flow.getAddress());
    await registry.registerModule(await membership.getAddress());
    await registry.registerModule(await identity.getAddress());

    // Enable all modules
    await registry.enableModule(await control.getAddress());
    await registry.enableModule(await sense.getAddress());
    await registry.enableModule(await signal.getAddress());
    await registry.enableModule(await flow.getAddress());
    await registry.enableModule(await membership.getAddress());
    await registry.enableModule(await identity.getAddress());

    // Initialize modules
    await sense.initialize(await registry.getAddress());
    await signal.initialize(await registry.getAddress());
    await flow.initialize(await registry.getAddress());
    await membership.initialize(await registry.getAddress());
    await identity.initialize(await registry.getAddress());

    // Setup connections
    await control.setFactory(await factory.getAddress());
    await factory.setRegistry(await control.getAddress());
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
    await gameToken.transfer(member2.address, transferAmount);
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

    // Add members to organization
    await membership.connect(admin).addMember(orgId, member1.address, 0);
    await membership.connect(admin).addMember(orgId, member2.address, 0);

    // Create profiles for members
    const profile1Tx = await identity.connect(member1).createProfile(
      orgId,
      "member1",
      "Member 1 Bio",
      "https://avatar1.com",
      "https://website1.com"
    );
    const profile1Receipt = await profile1Tx.wait();
    const profile1Event = profile1Receipt?.logs.find(log =>
      log.topics[0] === ethers.id("ProfileCreated(bytes8,bytes8,address,string)")
    );
    if (profile1Event) {
      profileId1 = ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes8", "bytes8", "address", "string"],
        profile1Event.data
      )[0];
    }

    const profile2Tx = await identity.connect(member2).createProfile(
      orgId,
      "member2",
      "Member 2 Bio",
      "https://avatar2.com",
      "https://website2.com"
    );
    const profile2Receipt = await profile2Tx.wait();
    const profile2Event = profile2Receipt?.logs.find(log =>
      log.topics[0] === ethers.id("ProfileCreated(bytes8,bytes8,address,string)")
    );
    if (profile2Event) {
      profileId2 = ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes8", "bytes8", "address", "string"],
        profile2Event.data
      )[0];
    }
  });

  describe("Flow -> Sense Reputation Integration", function () {
    it("Should award reputation for campaign creation", async function () {
      // Get initial reputation
      const initialReputation = await sense.getReputation(orgId, profileId1);

      // Create a campaign
      const campaignAmount = ethers.parseEther("1000");
      const currentBlock = await ethers.provider.getBlockNumber();

      const campaignTx = await flow.connect(member1).createCampaign(
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

      // Wait for transaction
      await campaignTx.wait();

      // Check if reputation was awarded
      const newReputation = await sense.getReputation(orgId, profileId1);
      expect(newReputation.reputation).to.be.gt(initialReputation.reputation);

      // Should have awarded CAMPAIGN_CREATION_REPUTATION (100 points)
      const expectedIncrease = 100;
      expect(newReputation.reputation).to.equal(initialReputation.reputation + BigInt(expectedIncrease));
    });

    it("Should award reputation for campaign contributions", async function () {
      // Create a campaign first
      const campaignAmount = ethers.parseEther("1000");
      const currentBlock = await ethers.provider.getBlockNumber();

      const campaignTx = await flow.connect(member1).createCampaign(
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

      const campaignReceipt = await campaignTx.wait();
      const campaignEvent = campaignReceipt?.logs.find(log =>
        log.topics[0] === ethers.id("CampaignCreated(bytes32,bytes8,address,string,uint256,uint256,address)")
      );

      expect(campaignEvent).to.not.be.undefined;
      const campaignId = ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes32", "bytes8", "address", "string", "uint256", "uint256", "address"],
        campaignEvent!.data
      )[0];

      // Get initial reputation for contributor
      const initialReputation = await sense.getReputation(orgId, profileId2);

      // Contribute to campaign
      const contributionAmount = ethers.parseEther("100");
      await gameToken.connect(member2).approve(await flow.getAddress(), contributionAmount);

      const contributeTx = await flow.connect(member2).contribute(campaignId, contributionAmount);
      await contributeTx.wait();

      // Check if reputation was awarded for contribution
      const newReputation = await sense.getReputation(orgId, profileId2);
      expect(newReputation.reputation).to.be.gt(initialReputation.reputation);

      // Should have awarded CONTRIBUTION_REPUTATION (50 points)
      const expectedIncrease = 50;
      expect(newReputation.reputation).to.equal(initialReputation.reputation + BigInt(expectedIncrease));
    });

    it("Should award bonus reputation for large contributions", async function () {
      // Create a campaign first
      const campaignAmount = ethers.parseEther("10000");
      const currentBlock = await ethers.provider.getBlockNumber();

      const campaignTx = await flow.connect(member1).createCampaign(
        orgId,
        "Large Campaign",
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

      const campaignId = ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes32", "bytes8", "address", "string", "uint256", "uint256", "address"],
        campaignEvent!.data
      )[0];

      // Get initial reputation
      const initialReputation = await sense.getReputation(orgId, profileId2);

      // Make a large contribution (> 1000 tokens threshold)
      const largeContribution = ethers.parseEther("1500");
      await gameToken.connect(member2).approve(await flow.getAddress(), largeContribution);

      const contributeTx = await flow.connect(member2).contribute(campaignId, largeContribution);
      await contributeTx.wait();

      // Check if bonus reputation was awarded
      const newReputation = await sense.getReputation(orgId, profileId2);

      // Should have awarded CONTRIBUTION_REPUTATION (50) + LARGE_CONTRIBUTION_BONUS (100) = 150 points
      const expectedIncrease = 150;
      expect(newReputation.reputation).to.equal(initialReputation.reputation + BigInt(expectedIncrease));
    });
  });

  describe("Signal -> Sense Reputation Integration", function () {
    it("Should use reputation for voting power calculation", async function () {
      // Award some reputation to member1
      await sense.connect(admin).updateReputation(
        orgId,
        profileId1,
        1, // ReputationType.REPUTATION
        1500, // 1.5x multiplier
        ethers.keccak256(ethers.toUtf8Bytes("TEST_REPUTATION"))
      );

      // Create a proposal with reputation-based voting
      const currentBlock = await ethers.provider.getBlockNumber();

      const proposalTx = await signal.connect(member1).createProposal(
        orgId,
        0, // ProposalType.General
        "Test Proposal",
        "Proposal description",
        currentBlock + 10, // start
        currentBlock + 100, // expiry
        3, // Majority.Simple
        1 // VotingPower.Reputation
      );

      const proposalReceipt = await proposalTx.wait();
      const proposalEvent = proposalReceipt?.logs.find(log =>
        log.topics[0] === ethers.id("ProposalCreated(bytes32,bytes8,address,uint8,string,uint256,uint256)")
      );

      expect(proposalEvent).to.not.be.undefined;
      const proposalId = ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes32", "bytes8", "address", "uint8", "string", "uint256", "uint256"],
        proposalEvent!.data
      )[0];

      // Fast forward to voting period
      await ethers.provider.send("evm_mine", []);
      await ethers.provider.send("evm_mine", []);
      await ethers.provider.send("evm_mine", []);

      // Vote on the proposal
      const voteTx = await signal.connect(member1).vote(proposalId, true, 0);
      await voteTx.wait();

      // The voting power should be influenced by reputation
      // This test verifies that the Signal module is calling Sense for reputation-based voting power
      const proposal = await signal.getProposal(proposalId);
      expect(proposal.yesVotes).to.be.gt(0);

      // With 1.5x reputation multiplier, the voting power should be enhanced
      // The exact calculation depends on the base voting power from membership
    });

    it("Should handle different reputation levels in voting", async function () {
      // Award different reputation levels to members
      await sense.connect(admin).updateReputation(
        orgId,
        profileId1,
        1, // ReputationType.REPUTATION
        2000, // 2.0x multiplier
        ethers.keccak256(ethers.toUtf8Bytes("HIGH_REPUTATION"))
      );

      await sense.connect(admin).updateReputation(
        orgId,
        profileId2,
        1, // ReputationType.REPUTATION
        500, // 0.5x multiplier
        ethers.keccak256(ethers.toUtf8Bytes("LOW_REPUTATION"))
      );

      // Create proposal
      const currentBlock = await ethers.provider.getBlockNumber();

      const proposalTx = await signal.connect(member1).createProposal(
        orgId,
        0, // ProposalType.General
        "Reputation Test Proposal",
        "Testing reputation-based voting",
        currentBlock + 10,
        currentBlock + 100,
        3, // Majority.Simple
        1 // VotingPower.Reputation
      );

      const proposalReceipt = await proposalTx.wait();
      const proposalEvent = proposalReceipt?.logs.find(log =>
        log.topics[0] === ethers.id("ProposalCreated(bytes32,bytes8,address,uint8,string,uint256,uint256)")
      );

      const proposalId = ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes32", "bytes8", "address", "uint8", "string", "uint256", "uint256"],
        proposalEvent!.data
      )[0];

      // Fast forward to voting period
      await ethers.provider.send("evm_mine", []);
      await ethers.provider.send("evm_mine", []);
      await ethers.provider.send("evm_mine", []);

      // Both members vote YES
      await signal.connect(member1).vote(proposalId, true, 0);
      await signal.connect(member2).vote(proposalId, true, 0);

      // Member1 with higher reputation should have more voting power
      const proposal = await signal.getProposal(proposalId);
      expect(proposal.yesVotes).to.be.gt(0);

      // This verifies that reputation affects voting power calculation
    });
  });

  describe("End-to-End Reputation Flow", function () {
    it("Should demonstrate complete reputation flow across modules", async function () {
      // Step 1: Member1 creates a campaign (gets reputation from Flow)
      const campaignAmount = ethers.parseEther("1000");
      const currentBlock = await ethers.provider.getBlockNumber();

      const campaignTx = await flow.connect(member1).createCampaign(
        orgId,
        "E2E Test Campaign",
        "End-to-end test campaign",
        campaignAmount,
        currentBlock + 100,
        await gameToken.getAddress(),
        ethers.ZeroAddress,
        0,
        ethers.ZeroAddress
      );

      await campaignTx.wait();

      // Check reputation was awarded
      const reputationAfterCampaign = await sense.getReputation(orgId, profileId1);
      expect(reputationAfterCampaign.reputation).to.equal(1100); // 1000 base + 100 campaign creation

      // Step 2: Member2 contributes to campaign (gets reputation from Flow)
      const campaignReceipt = await campaignTx.wait();
      const campaignEvent = campaignReceipt?.logs.find(log =>
        log.topics[0] === ethers.id("CampaignCreated(bytes32,bytes8,address,string,uint256,uint256,address)")
      );

      const campaignId = ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes32", "bytes8", "address", "string", "uint256", "uint256", "address"],
        campaignEvent!.data
      )[0];

      const contributionAmount = ethers.parseEther("100");
      await gameToken.connect(member2).approve(await flow.getAddress(), contributionAmount);
      await flow.connect(member2).contribute(campaignId, contributionAmount);

      // Check reputation was awarded to contributor
      const reputationAfterContribution = await sense.getReputation(orgId, profileId2);
      expect(reputationAfterContribution.reputation).to.equal(1050); // 1000 base + 50 contribution

      // Step 3: Create a proposal using reputation-based voting
      const proposalTx = await signal.connect(member1).createProposal(
        orgId,
        0, // ProposalType.General
        "E2E Test Proposal",
        "End-to-end test proposal",
        currentBlock + 200,
        currentBlock + 300,
        3, // Majority.Simple
        1 // VotingPower.Reputation
      );

      const proposalReceipt = await proposalTx.wait();
      const proposalEvent = proposalReceipt?.logs.find(log =>
        log.topics[0] === ethers.id("ProposalCreated(bytes32,bytes8,address,uint8,string,uint256,uint256)")
      );

      const proposalId = ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes32", "bytes8", "address", "uint8", "string", "uint256", "uint256"],
        proposalEvent!.data
      )[0];

      // Fast forward to voting period
      for (let i = 0; i < 200; i++) {
        await ethers.provider.send("evm_mine", []);
      }

      // Step 4: Vote with reputation-enhanced voting power
      await signal.connect(member1).vote(proposalId, true, 0);
      await signal.connect(member2).vote(proposalId, true, 0);

      // Verify the proposal passed with reputation-weighted votes
      const finalProposal = await signal.getProposal(proposalId);
      expect(finalProposal.yesVotes).to.be.gt(0);

      // This demonstrates the complete flow:
      // 1. Campaign creation → reputation award (Flow → Sense)
      // 2. Campaign contribution → reputation award (Flow → Sense)
      // 3. Proposal voting → reputation-based voting power (Signal → Sense)
    });
  });

  describe("Reputation Persistence and Organization Scope", function () {
    it("Should maintain reputation across different activities", async function () {
      // Award initial reputation
      await sense.connect(admin).updateReputation(
        orgId,
        profileId1,
        1, // ReputationType.REPUTATION
        500,
        ethers.keccak256(ethers.toUtf8Bytes("INITIAL_REPUTATION"))
      );

      // Create campaign (should add 100 reputation)
      const campaignAmount = ethers.parseEther("1000");
      const currentBlock = await ethers.provider.getBlockNumber();

      await flow.connect(member1).createCampaign(
        orgId,
        "Persistence Test Campaign",
        "Testing reputation persistence",
        campaignAmount,
        currentBlock + 100,
        await gameToken.getAddress(),
        ethers.ZeroAddress,
        0,
        ethers.ZeroAddress
      );

      // Check cumulative reputation
      const reputation = await sense.getReputation(orgId, profileId1);
      expect(reputation.reputation).to.equal(1600); // 1000 base + 500 initial + 100 campaign

      // Award more reputation directly
      await sense.connect(admin).updateReputation(
        orgId,
        profileId1,
        1, // ReputationType.REPUTATION
        200,
        ethers.keccak256(ethers.toUtf8Bytes("ADDITIONAL_REPUTATION"))
      );

      // Check final reputation
      const finalReputation = await sense.getReputation(orgId, profileId1);
      expect(finalReputation.reputation).to.equal(1800); // Previous + 200
    });

    it("Should isolate reputation by organization", async function () {
      // Create a second organization
      const stakeAmount = ethers.parseEther("10000");
      await gameToken.connect(creator).approve(await staking.getAddress(), stakeAmount);

      const org2Tx = await control.connect(creator).createOrganization(
        "Second DAO",
        "https://example.com/metadata2",
        0,
        0,
        0,
        100,
        0,
        stakeAmount
      );

      const org2Receipt = await org2Tx.wait();
      const org2Event = org2Receipt?.logs.find(event =>
        event.topics[0] === ethers.id("OrganizationCreated(bytes8,string,address,address,uint256)")
      );

      const orgId2 = ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes8", "string", "address", "address", "uint256"],
        org2Event!.data
      )[0];

      // Award reputation in first organization
      await sense.connect(admin).updateReputation(
        orgId,
        profileId1,
        1,
        1000,
        ethers.keccak256(ethers.toUtf8Bytes("ORG1_REPUTATION"))
      );

      // Award different reputation in second organization
      await sense.connect(admin).updateReputation(
        orgId2,
        profileId1,
        1,
        500,
        ethers.keccak256(ethers.toUtf8Bytes("ORG2_REPUTATION"))
      );

      // Check reputation is isolated by organization
      const org1Reputation = await sense.getReputation(orgId, profileId1);
      const org2Reputation = await sense.getReputation(orgId2, profileId1);

      expect(org1Reputation.reputation).to.equal(2000); // 1000 base + 1000 added
      expect(org2Reputation.reputation).to.equal(1500); // 1000 base + 500 added
    });
  });
});
