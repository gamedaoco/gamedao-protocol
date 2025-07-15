import { expect } from "chai";
import { ethers } from "hardhat";
import {
  GameDAORegistry,
  Control,
  Signal
} from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Signal Module", function () {
  let registry: GameDAORegistry;
  let control: Control;
  let signal: Signal;
  let owner: SignerWithAddress;
  let admin: SignerWithAddress;
  let member1: SignerWithAddress;
  let member2: SignerWithAddress;
  let member3: SignerWithAddress;
  let nonMember: SignerWithAddress;
  let testOrgId: string;
  let testProposalId: string;

  const CONTROL_MODULE_ID = ethers.keccak256(ethers.toUtf8Bytes("CONTROL"));
  const SIGNAL_MODULE_ID = ethers.keccak256(ethers.toUtf8Bytes("SIGNAL"));

  beforeEach(async function () {
    [owner, admin, member1, member2, member3, nonMember] = await ethers.getSigners();

    // Deploy GameId library first
    const GameIdFactory = await ethers.getContractFactory("GameId");
    const gameId = await GameIdFactory.deploy();
    await gameId.waitForDeployment();

    // Deploy mock tokens
    const MockGameTokenFactory = await ethers.getContractFactory("MockGameToken");
    const gameToken = await MockGameTokenFactory.deploy();
    await gameToken.waitForDeployment();

    const GameStakingFactory = await ethers.getContractFactory("GameStaking");
    const gameStaking = await GameStakingFactory.deploy(
      await gameToken.getAddress(),
      owner.address, // treasury
      500 // 5% protocol fee share
    );
    await gameStaking.waitForDeployment();

    // Deploy Registry
    const GameDAORegistryFactory = await ethers.getContractFactory("GameDAORegistry");
    registry = await GameDAORegistryFactory.deploy(owner.address);
    await registry.waitForDeployment();

    // Deploy Control module with proper addresses
    const ControlFactory = await ethers.getContractFactory("Control");
    control = await ControlFactory.deploy(await gameToken.getAddress(), await gameStaking.getAddress());
    await control.waitForDeployment();

    // Deploy Signal module with GameId library linked
    const SignalFactory = await ethers.getContractFactory("Signal", {
      libraries: {
        GameId: await gameId.getAddress()
      }
    });
    signal = await SignalFactory.deploy();
    await signal.waitForDeployment();

    // Register modules
    await registry.registerModule(await control.getAddress());
    await registry.registerModule(await signal.getAddress());

    // Enable modules
    await registry.enableModule(CONTROL_MODULE_ID);
    await registry.enableModule(SIGNAL_MODULE_ID);

    // Initialize modules
    await control.initialize(await registry.getAddress());
    await signal.initialize(await registry.getAddress());

    // Create test organization
    const createOrgTx = await control.createOrganization(
      "Test DAO",
      "https://test-dao.com/metadata",
      2, // DAO
      0, // Open access
      0, // No fees
      100, // Member limit
      0, // No membership fee
      0  // No GAME stake required
    );

    const receipt = await createOrgTx.wait();
    const event = receipt?.logs.find(log => {
      try {
        const parsed = control.interface.parseLog(log as any);
        return parsed?.name === "OrganizationCreated";
      } catch {
        return false;
      }
    });

    if (event) {
      const parsedEvent = control.interface.parseLog(event as any);
      testOrgId = parsedEvent?.args[0];
    }

    // Add members to organization
    await control.addMember(testOrgId, member1.address);
    await control.addMember(testOrgId, member2.address);
    await control.addMember(testOrgId, member3.address);
  });

  describe("Deployment and Initialization", function () {
    it("Should deploy Signal module correctly", async function () {
      expect(await signal.getAddress()).to.be.properAddress;
      expect(await signal.moduleId()).to.equal(SIGNAL_MODULE_ID);
      expect(await signal.version()).to.equal("1.0.0");
    });

    it("Should have correct role assignments", async function () {
      const SIGNAL_ADMIN_ROLE = await signal.SIGNAL_ADMIN_ROLE();
      const PROPOSAL_CREATOR_ROLE = await signal.PROPOSAL_CREATOR_ROLE();
      const EXECUTOR_ROLE = await signal.EXECUTOR_ROLE();

      expect(await signal.hasRole(SIGNAL_ADMIN_ROLE, owner.address)).to.be.true;
      expect(await signal.hasRole(PROPOSAL_CREATOR_ROLE, owner.address)).to.be.true;
      expect(await signal.hasRole(EXECUTOR_ROLE, owner.address)).to.be.true;
    });
  });

  describe("Proposal Creation", function () {
    it("Should create a simple proposal successfully", async function () {
      const title = "Test Proposal";
      const description = "A test proposal for governance";
      const metadataURI = "https://test.com/proposal";
      const votingPeriod = 7 * 24 * 60 * 60; // 7 days

      const tx = await signal.connect(member1).createProposal(
        testOrgId,
        title,
        description,
        metadataURI,
        0, // Simple proposal
        0, // Relative voting
        0, // Democratic voting power
        votingPeriod,
        "0x",
        ethers.ZeroAddress
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find(log => {
        try {
          const parsed = signal.interface.parseLog(log as any);
          return parsed?.name === "ProposalCreated";
        } catch {
          return false;
        }
      });

      expect(event).to.not.be.undefined;

      if (event) {
        const parsedEvent = signal.interface.parseLog(event as any);
        testProposalId = parsedEvent?.args[0];

        const proposal = await signal.getProposal(testProposalId);
        expect(proposal.title).to.equal(title);
        expect(proposal.description).to.equal(description);
        expect(proposal.creator).to.equal(member1.address);
        expect(proposal.organizationId).to.equal(testOrgId);
      }
    });

    it("Should reject proposal with invalid voting period", async function () {
      await expect(
        signal.connect(member1).createProposal(
          testOrgId,
          "Test",
          "Description",
          "https://test.com",
          0, 0, 0,
          30 * 60, // 30 minutes (too short)
          "0x",
          ethers.ZeroAddress
        )
      ).to.be.revertedWithCustomError(signal, "InvalidVotingPeriod");
    });

    it("Should reject proposal from non-member when membership required", async function () {
      await expect(
        signal.connect(nonMember).createProposal(
          testOrgId,
          "Test",
          "Description",
          "https://test.com",
          0, 0, 0,
          7 * 24 * 60 * 60,
          "0x",
          ethers.ZeroAddress
        )
      ).to.be.revertedWithCustomError(signal, "MembershipRequired");
    });
  });

  describe("Voting", function () {
    beforeEach(async function () {
      // Create a test proposal for voting tests
      const tx = await signal.connect(member1).createProposal(
        testOrgId,
        "Test Proposal",
        "Test description",
        "https://test.com",
        0, 0, 0,
        7 * 24 * 60 * 60,
        "0x",
        ethers.ZeroAddress
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find(log => {
        try {
          const parsed = signal.interface.parseLog(log as any);
          return parsed?.name === "ProposalCreated";
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = signal.interface.parseLog(event as any);
        testProposalId = parsed?.args[0];
      }

      // Advance to voting period
      await ethers.provider.send("evm_increaseTime", [24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine", []);
    });

    it("Should allow members to vote", async function () {
      await expect(
        signal.connect(member1).castVote(testProposalId, 1, "For")
      ).to.emit(signal, "VoteCast");

      const vote = await signal.getVote(testProposalId, member1.address);
      expect(vote.hasVoted).to.be.true;
      expect(vote.choice).to.equal(1);
    });

    it("Should prevent double voting", async function () {
      await signal.connect(member1).castVote(testProposalId, 1, "For");

      await expect(
        signal.connect(member1).castVote(testProposalId, 0, "Against")
      ).to.be.revertedWithCustomError(signal, "AlreadyVoted");
    });

    it("Should prevent voting with invalid choice", async function () {
      await expect(
        signal.connect(member1).castVote(testProposalId, 0, "None")
      ).to.be.revertedWithCustomError(signal, "InvalidVoteChoice");
    });
  });

  describe("Proposal Management", function () {
    beforeEach(async function () {
      // Create a test proposal
      const tx = await signal.connect(member1).createProposal(
        testOrgId,
        "Test Proposal",
        "Test description",
        "https://test.com",
        0, 0, 0,
        2 * 60 * 60, // 2 hours for faster testing
        "0x",
        ethers.ZeroAddress
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find(log => {
        try {
          const parsed = signal.interface.parseLog(log as any);
          return parsed?.name === "ProposalCreated";
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = signal.interface.parseLog(event as any);
        testProposalId = parsed?.args[0];
      }
    });

    it("Should allow proposal cancellation by creator", async function () {
      await expect(
        signal.connect(member1).cancelProposal(testProposalId, "Changed mind")
      ).to.emit(signal, "ProposalCanceledHierarchical");

      const proposal = await signal.getProposal(testProposalId);
      expect(proposal.state).to.equal(5); // Canceled
    });

    it("Should prevent non-creator from canceling", async function () {
      await expect(
        signal.connect(member2).cancelProposal(testProposalId, "Not allowed")
      ).to.be.revertedWithCustomError(signal, "UnauthorizedProposalAccess");
    });
  });

  describe("Voting Power and Delegation", function () {
    it("Should allow voting power delegation", async function () {
      const amount = 100;

      await expect(
        signal.connect(member1).delegateVotingPower(member2.address, amount)
      ).to.emit(signal, "VotingPowerDelegated");

      const delegatedPower = await signal.getDelegatedVotingPower(member1.address);
      expect(delegatedPower).to.equal(amount);
    });

    it("Should allow undelegation of voting power", async function () {
      const amount = 100;

      await signal.connect(member1).delegateVotingPower(member2.address, amount);

      await expect(
        signal.connect(member1).undelegateVotingPower(member2.address, amount)
      ).to.emit(signal, "VotingPowerUndelegated");

      const delegatedPower = await signal.getDelegatedVotingPower(member1.address);
      expect(delegatedPower).to.equal(0);
    });
  });

  describe("Conviction Voting", function () {
    beforeEach(async function () {
      // Create a test proposal
      const tx = await signal.connect(member1).createProposal(
        testOrgId,
        "Conviction Test",
        "Test conviction voting",
        "https://test.com",
        0, 0, 0,
        7 * 24 * 60 * 60,
        "0x",
        ethers.ZeroAddress
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find(log => {
        try {
          const parsed = signal.interface.parseLog(log as any);
          return parsed?.name === "ProposalCreated";
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = signal.interface.parseLog(event as any);
        testProposalId = parsed?.args[0];
      }

      // Advance to voting period
      await ethers.provider.send("evm_increaseTime", [24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine", []);
    });

    it("Should calculate conviction multiplier correctly", async function () {
      const convictionTime = 30 * 24 * 60 * 60; // 30 days
      const multiplier = await signal.calculateConvictionMultiplier(convictionTime);
      expect(multiplier).to.be.greaterThan(100); // Should be more than 1x (100)
    });

    it("Should allow conviction voting", async function () {
      const convictionTime = 7 * 24 * 60 * 60; // 7 days

      await expect(
        signal.connect(member1).castVoteWithConviction(
          testProposalId,
          1, // For
          convictionTime,
          "Strong support"
        )
      ).to.emit(signal, "ConvictionVoteCast");
    });
  });

  describe("Error Handling", function () {
    it("Should handle non-existent proposals", async function () {
      const fakeProposalId = "FAKE0000-P-TEST1234";

      await expect(
        signal.getProposal(fakeProposalId)
      ).to.be.revertedWithCustomError(signal, "ProposalNotFound");

      await expect(
        signal.castVote(fakeProposalId, 1, "Vote")
      ).to.be.revertedWithCustomError(signal, "ProposalNotFound");
    });
  });
});
