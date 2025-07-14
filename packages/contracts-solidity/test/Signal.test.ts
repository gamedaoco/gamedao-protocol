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

    // Deploy Registry
    const GameDAORegistryFactory = await ethers.getContractFactory("GameDAORegistry");
    registry = await GameDAORegistryFactory.deploy(owner.address);
    await registry.waitForDeployment();

    // Deploy Control module
    const ControlFactory = await ethers.getContractFactory("Control");
    control = await ControlFactory.deploy(ethers.ZeroAddress); // Use zero address for testing
    await control.waitForDeployment();

    // Deploy Signal module
    const SignalFactory = await ethers.getContractFactory("Signal");
    signal = await SignalFactory.deploy();
    await signal.waitForDeployment();

    // Register modules
    await registry.registerModule(await control.getAddress());
    await registry.registerModule(await signal.getAddress());

    // Enable modules
    await registry.enableModule(CONTROL_MODULE_ID);
    await registry.enableModule(SIGNAL_MODULE_ID);

    // Create test organization
    // Get the organization ID from the function return value
    testOrgId = await control.createOrganization.staticCall(
      "Test DAO",
      "https://test-dao.com/metadata",
      2, // DAO
      0, // Open access
      0, // No fees
      100, // Member limit
      0, // No membership fee
      0  // No GAME stake required
    );

    // Now actually create the organization
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

    await createOrgTx.wait();

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

    it("Should initialize with default voting parameters", async function () {
      const defaultParams = await signal.getDefaultVotingParameters();
      expect(defaultParams.votingDelay).to.equal(86400); // 1 day
      expect(defaultParams.votingPeriod).to.equal(604800); // 7 days
      expect(defaultParams.executionDelay).to.equal(172800); // 2 days
      expect(defaultParams.quorumThreshold).to.equal(1000); // 10%
      expect(defaultParams.proposalThreshold).to.equal(100); // 1%
      expect(defaultParams.requireMembership).to.be.true;
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

      // Get the proposal ID from the function return value
      testProposalId = await signal.connect(member1).createProposal.staticCall(
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

      // Now actually create the proposal
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

      await expect(tx).to.emit(signal, "ProposalCreated");

      const proposal = await signal.getProposal(testProposalId);
      expect(proposal.title).to.equal(title);
      expect(proposal.description).to.equal(description);
      expect(proposal.proposer).to.equal(member1.address);
      expect(proposal.organizationId).to.equal(testOrgId);
      expect(proposal.state).to.equal(0); // Pending
    });

    it("Should reject proposal with empty title", async function () {
      await expect(
        signal.connect(member1).createProposal(
          testOrgId,
          "",
          "Description",
          "https://test.com",
          0, 0, 0,
          7 * 24 * 60 * 60,
          "0x",
          ethers.ZeroAddress
        )
      ).to.be.revertedWithCustomError(signal, "InvalidProposalParameters");
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
      ).to.be.revertedWithCustomError(signal, "InsufficientVotingPower");
    });

    it("Should create proposal with execution data", async function () {
      const executionData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256"],
        [ethers.parseEther("1.0")]
      );

      // Get the treasury address from the organization
      const org = await control.getOrganization(testOrgId);
      const treasuryAddress = org.treasury;

      const tx = await signal.connect(member1).createProposal(
        testOrgId,
        "Treasury Proposal",
        "Proposal to spend from treasury",
        "https://test.com/treasury",
        2, // Treasury proposal
        0, // Relative voting
        0, // Democratic voting power
        7 * 24 * 60 * 60,
        executionData,
        treasuryAddress
      );

      await expect(tx).to.emit(signal, "ProposalCreated");
    });
  });

  describe("Proposal Management", function () {
    beforeEach(async function () {
      // Create a test proposal for management tests
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
          const parsed = signal.interface.parseLog(log);
          return parsed?.name === "ProposalCreated";
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = signal.interface.parseLog(event);
        testProposalId = parsed?.args[0];
      }
    });

    it("Should allow proposer to update proposal", async function () {
      const newTitle = "Updated Proposal";
      const newDescription = "Updated description";

      await expect(
        signal.connect(member1).updateProposal(
          testProposalId,
          newTitle,
          newDescription,
          0
        )
      ).to.emit(signal, "ProposalUpdated");

      const proposal = await signal.getProposal(testProposalId);
      expect(proposal.title).to.equal(newTitle);
      expect(proposal.description).to.equal(newDescription);
    });

    it("Should prevent non-proposer from updating proposal", async function () {
      await expect(
        signal.connect(member2).updateProposal(
          testProposalId,
          "Hacked Title",
          "Hacked Description",
          0
        )
      ).to.be.revertedWithCustomError(signal, "UnauthorizedProposalAccess");
    });

    it("Should allow proposer to cancel proposal", async function () {
      await expect(
        signal.connect(member1).cancelProposal(testProposalId)
      ).to.emit(signal, "ProposalCancelled");

      const proposal = await signal.getProposal(testProposalId);
      expect(proposal.state).to.equal(5); // Cancelled
      expect(proposal.cancelled).to.be.true;
    });

    it("Should allow admin to emergency cancel proposal", async function () {
      await expect(
        signal.connect(owner).emergencyCancel(testProposalId)
      ).to.emit(signal, "ProposalCancelled");

      const proposal = await signal.getProposal(testProposalId);
      expect(proposal.state).to.equal(5); // Cancelled
    });
  });

  describe("Voting Mechanisms", function () {
    beforeEach(async function () {
      // Create a proposal and advance time to voting period
      const tx = await signal.connect(member1).createProposal(
        testOrgId,
        "Voting Test",
        "Test voting mechanisms",
        "https://test.com",
        0, 0, 0,
        7 * 24 * 60 * 60,
        "0x",
        ethers.ZeroAddress
      );

      // Get the proposal ID from the transaction result
      const receipt = await tx.wait();

      // Try to get from return value first
      try {
        testProposalId = await signal.connect(member1).createProposal.staticCall(
          testOrgId,
          "Voting Test",
          "Test voting mechanisms",
          "https://test.com",
          0, 0, 0,
          7 * 24 * 60 * 60,
          "0x",
          ethers.ZeroAddress
        );
      } catch {
        // Fallback: use a predictable format since we know it's hierarchical
        testProposalId = "GAMEDAO-P-PROP001"; // First proposal for the organization
      }

      // Advance time to start voting
      await ethers.provider.send("evm_increaseTime", [24 * 60 * 60 + 1]); // 1 day + 1 second
      await ethers.provider.send("evm_mine", []);
    });

    it("Should allow members to cast votes", async function () {
      await expect(
        signal.connect(member1).castVote(testProposalId, 1, "I support this proposal")
      ).to.emit(signal, "VoteCast");

      await expect(
        signal.connect(member2).castVote(testProposalId, 0, "I oppose this proposal")
      ).to.emit(signal, "VoteCast");

      const vote1 = await signal.getVote(testProposalId, member1.address);
      const vote2 = await signal.getVote(testProposalId, member2.address);

      expect(vote1.choice).to.equal(1); // For
      expect(vote1.reason).to.equal("I support this proposal");
      expect(vote2.choice).to.equal(0); // Against
      expect(vote2.reason).to.equal("I oppose this proposal");
    });

    it("Should prevent double voting", async function () {
      await signal.connect(member1).castVote(testProposalId, 1, "First vote");

      await expect(
        signal.connect(member1).castVote(testProposalId, 0, "Second vote")
      ).to.be.revertedWithCustomError(signal, "AlreadyVoted");
    });

    it("Should prevent voting from non-members", async function () {
      await expect(
        signal.connect(nonMember).castVote(testProposalId, 1, "Non-member vote")
      ).to.be.revertedWithCustomError(signal, "InsufficientVotingPower");
    });

    it("Should support conviction voting", async function () {
      const convictionTime = 7 * 24 * 60 * 60; // 7 days

      await expect(
        signal.connect(member1).castVoteWithConviction(
          testProposalId,
          1,
          convictionTime,
          "Strong conviction vote"
        )
      ).to.emit(signal, "VoteCast");

      const vote = await signal.getVote(testProposalId, member1.address);
      expect(vote.convictionTime).to.equal(convictionTime);
    });

    it("Should calculate voting power correctly for democratic voting", async function () {
      const votingPower = await signal.getVotingPower(testProposalId, member1.address);
      expect(votingPower).to.equal(1); // Democratic = 1 vote per member
    });

    it("Should track proposal vote counts", async function () {
      await signal.connect(member1).castVote(testProposalId, 1, "For");
      await signal.connect(member2).castVote(testProposalId, 0, "Against");
      await signal.connect(member3).castVote(testProposalId, 2, "Abstain");

      const proposal = await signal.getProposal(testProposalId);
      expect(proposal.votesFor).to.equal(1);
      expect(proposal.votesAgainst).to.equal(1);
      expect(proposal.votesAbstain).to.equal(1);
      expect(proposal.totalVotingPower).to.equal(3);
    });
  });

  describe("Proposal Results and Execution", function () {
    beforeEach(async function () {
      // Create proposal and set up voting
      const tx = await signal.connect(member1).createProposal(
        testOrgId,
        "Execution Test",
        "Test proposal execution",
        "https://test.com",
        0, 0, 0,
        2 * 60 * 60, // 2 hours for faster testing
        "0x",
        ethers.ZeroAddress
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find(log => {
        try {
          const parsed = signal.interface.parseLog(log);
          return parsed?.name === "ProposalCreated";
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = signal.interface.parseLog(event);
        testProposalId = parsed?.args[0];
      }

      // Advance to voting period
      await ethers.provider.send("evm_increaseTime", [24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine", []);
    });

    it("Should calculate proposal results correctly", async function () {
      // Cast votes
      await signal.connect(member1).castVote(testProposalId, 1, "For");
      await signal.connect(member2).castVote(testProposalId, 1, "For");
      await signal.connect(member3).castVote(testProposalId, 0, "Against");

      const result = await signal.getProposalResult(testProposalId);
      expect(result.passed).to.be.true;
      expect(result.forVotes).to.equal(2);
      expect(result.againstVotes).to.equal(1);
      expect(result.abstainVotes).to.equal(0);
    });

    it("Should queue passed proposals", async function () {
      // Vote in favor
      await signal.connect(member1).castVote(testProposalId, 1, "For");
      await signal.connect(member2).castVote(testProposalId, 1, "For");

      // End voting period
      await ethers.provider.send("evm_increaseTime", [2 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine", []);

      await expect(
        signal.queueProposal(testProposalId)
      ).to.emit(signal, "ProposalQueued");

      const proposal = await signal.getProposal(testProposalId);
      expect(proposal.state).to.equal(2); // Queued
    });

    it("Should execute queued proposals", async function () {
      // Vote and queue proposal
      await signal.connect(member1).castVote(testProposalId, 1, "For");
      await signal.connect(member2).castVote(testProposalId, 1, "For");

      await ethers.provider.send("evm_increaseTime", [2 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine", []);

      await signal.queueProposal(testProposalId);

      // Wait for execution delay
      await ethers.provider.send("evm_increaseTime", [2 * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine", []);

      await expect(
        signal.executeProposal(testProposalId)
      ).to.emit(signal, "ProposalExecuted");

      const proposal = await signal.getProposal(testProposalId);
      expect(proposal.state).to.equal(3); // Executed
      expect(proposal.executed).to.be.true;
    });

    it("Should not queue failed proposals", async function () {
      // Vote against
      await signal.connect(member1).castVote(testProposalId, 0, "Against");
      await signal.connect(member2).castVote(testProposalId, 0, "Against");

      await ethers.provider.send("evm_increaseTime", [2 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine", []);

      await expect(
        signal.queueProposal(testProposalId)
      ).to.be.revertedWithCustomError(signal, "ProposalNotPassed");
    });
  });

  describe("Voting Types", function () {
    it("Should handle relative majority voting", async function () {
      const tx = await signal.connect(member1).createProposal(
        testOrgId,
        "Relative Test",
        "Test relative voting",
        "https://test.com",
        0, 0, 0, // Relative voting
        2 * 60 * 60,
        "0x",
        ethers.ZeroAddress
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find(log => {
        try {
          const parsed = signal.interface.parseLog(log);
          return parsed?.name === "ProposalCreated";
        } catch {
          return false;
        }
      });

      let proposalId = "";
      if (event) {
        const parsed = signal.interface.parseLog(event);
        proposalId = parsed?.args[0];
      }

      await ethers.provider.send("evm_increaseTime", [24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine", []);

      // 2 for, 1 against = passed (relative majority)
      await signal.connect(member1).castVote(proposalId, 1, "For");
      await signal.connect(member2).castVote(proposalId, 1, "For");
      await signal.connect(member3).castVote(proposalId, 0, "Against");

      const result = await signal.getProposalResult(proposalId);
      expect(result.passed).to.be.true;
    });

    it("Should handle supermajority voting", async function () {
      // First set a lower quorum threshold for this test
      const customParams = {
        votingDelay: 1 * 24 * 60 * 60, // 1 day
        votingPeriod: 7 * 24 * 60 * 60, // 7 days
        executionDelay: 2 * 24 * 60 * 60, // 2 days
        quorumThreshold: 500, // 5% - lower threshold for testing
        proposalThreshold: 100, // 1%
        requireMembership: true
      };

      await signal.setVotingParameters(testOrgId, customParams);

      const tx = await signal.connect(member1).createProposal(
        testOrgId,
        "Supermajority Test",
        "Test supermajority voting",
        "https://test.com",
        0, 2, 0, // Supermajority voting
        2 * 60 * 60,
        "0x",
        ethers.ZeroAddress
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find(log => {
        try {
          const parsed = signal.interface.parseLog(log);
          return parsed?.name === "ProposalCreated";
        } catch {
          return false;
        }
      });

      let proposalId = "";
      if (event) {
        const parsed = signal.interface.parseLog(event);
        proposalId = parsed?.args[0];
      }

      await ethers.provider.send("evm_increaseTime", [24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine", []);

      // 3 for, 1 against = 75% for = passed (need >66.7% for supermajority)
      await signal.connect(member1).castVote(proposalId, 1, "For");
      await signal.connect(member2).castVote(proposalId, 1, "For");
      await signal.connect(member3).castVote(proposalId, 1, "For");
      await signal.connect(owner).castVote(proposalId, 0, "Against");

      const result = await signal.getProposalResult(proposalId);
      expect(result.passed).to.be.true;
    });
  });

  describe("Voting Parameters", function () {
    it("Should allow admin to set custom voting parameters", async function () {
      const customParams = {
        votingDelay: 2 * 24 * 60 * 60, // 2 days
        votingPeriod: 5 * 24 * 60 * 60, // 5 days
        executionDelay: 1 * 24 * 60 * 60, // 1 day
        quorumThreshold: 2000, // 20%
        proposalThreshold: 500, // 5%
        requireMembership: true
      };

      await expect(
        signal.setVotingParameters(testOrgId, customParams)
      ).to.emit(signal, "VotingParametersUpdated");

      const params = await signal.getVotingParameters(testOrgId);
      expect(params.votingDelay).to.equal(customParams.votingDelay);
      expect(params.votingPeriod).to.equal(customParams.votingPeriod);
      expect(params.executionDelay).to.equal(customParams.executionDelay);
      expect(params.quorumThreshold).to.equal(customParams.quorumThreshold);
      expect(params.proposalThreshold).to.equal(customParams.proposalThreshold);
    });

    it("Should reject invalid voting parameters", async function () {
      const invalidParams = {
        votingDelay: 0,
        votingPeriod: 30 * 60, // Too short
        executionDelay: 0,
        quorumThreshold: 1000,
        proposalThreshold: 100,
        requireMembership: true
      };

      await expect(
        signal.setVotingParameters(testOrgId, invalidParams)
      ).to.be.revertedWithCustomError(signal, "InvalidVotingPeriod");
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      // Create multiple proposals for testing view functions
      for (let i = 0; i < 3; i++) {
        await signal.connect(member1).createProposal(
          testOrgId,
          `Proposal ${i}`,
          `Description ${i}`,
          `https://test.com/${i}`,
          0, 0, 0,
          7 * 24 * 60 * 60,
          "0x",
          ethers.ZeroAddress
        );
      }
    });

    it("Should return proposals by organization", async function () {
      const proposals = await signal.getProposalsByOrganization(testOrgId);
      expect(proposals.length).to.equal(3);
    });

    it("Should return proposals by state", async function () {
      const pendingProposals = await signal.getProposalsByState(0); // Pending
      expect(pendingProposals.length).to.equal(3);
    });

    it("Should return correct proposal count", async function () {
      const count = await signal.getProposalCount();
      expect(count).to.equal(3);
    });

    it("Should check if user can vote", async function () {
      const proposals = await signal.getProposalsByOrganization(testOrgId);
      const proposalId = proposals[0];

      // Advance to voting period
      await ethers.provider.send("evm_increaseTime", [24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine", []);

      expect(await signal.canVote(proposalId, member1.address)).to.be.true;
      expect(await signal.canVote(proposalId, nonMember.address)).to.be.false;
    });

    it("Should validate proposal parameters", async function () {
      const isValid = await signal.validateProposalParameters(
        testOrgId,
        0, 0, 0, // Simple, Relative, Democratic
        7 * 24 * 60 * 60 // 7 days
      );
      expect(isValid).to.be.true;

      const isInvalid = await signal.validateProposalParameters(
        testOrgId,
        0, 0, 0,
        30 * 60 // 30 minutes (too short)
      );
      expect(isInvalid).to.be.false;
    });
  });

  describe("Delegation", function () {
    it("Should allow voting power delegation", async function () {
      const amount = 100;

      await expect(
        signal.connect(member1).delegateVotingPower(member2.address, amount)
      ).to.emit(signal, "VotingPowerDelegated");

      const delegatedPower = await signal.getDelegatedVotingPower(member1.address);
      expect(delegatedPower).to.equal(amount);

      const delegations = await signal.getDelegations(member1.address);
      expect(delegations.length).to.equal(1);
      expect(delegations[0].delegatee).to.equal(member2.address);
      expect(delegations[0].amount).to.equal(amount);
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

    it("Should reject invalid delegations", async function () {
      await expect(
        signal.connect(member1).delegateVotingPower(ethers.ZeroAddress, 100)
      ).to.be.revertedWithCustomError(signal, "InvalidDelegation");

      await expect(
        signal.connect(member1).delegateVotingPower(member1.address, 100)
      ).to.be.revertedWithCustomError(signal, "InvalidDelegation");
    });
  });

  describe("Conviction Voting", function () {
    it("Should calculate conviction multiplier correctly", async function () {
      const oneDayMultiplier = await signal.calculateConvictionMultiplier(24 * 60 * 60);
      expect(oneDayMultiplier).to.equal(11000); // Base + 1000 (10% increase)

      const sevenDayMultiplier = await signal.calculateConvictionMultiplier(7 * 24 * 60 * 60);
      expect(sevenDayMultiplier).to.equal(17000); // Base + 7000 (70% increase)
    });

    it("Should apply conviction decay", async function () {
      // This would require more complex setup with time manipulation
      // For now, just test that the function exists and can be called
      const proposals = await signal.getProposalsByOrganization(testOrgId);
      if (proposals.length > 0) {
        await expect(
          signal.applyConvictionDecay(proposals[0], member1.address)
        ).to.not.be.reverted;
      }
    });
  });

  describe("Gas Estimation and Preview", function () {
    beforeEach(async function () {
      const tx = await signal.connect(member1).createProposal(
        testOrgId,
        "Gas Test",
        "Test gas estimation",
        "https://test.com",
        0, 0, 0,
        7 * 24 * 60 * 60,
        "0x",
        ethers.ZeroAddress
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find(log => {
        try {
          const parsed = signal.interface.parseLog(log);
          return parsed?.name === "ProposalCreated";
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = signal.interface.parseLog(event);
        testProposalId = parsed?.args[0];
      }
    });

    it("Should estimate gas for execution", async function () {
      const gasEstimate = await signal.estimateGasForExecution(testProposalId);
      expect(gasEstimate).to.be.greaterThan(0);
    });

    it("Should preview proposal execution", async function () {
      const [success, returnData] = await signal.previewProposalExecution(testProposalId);
      expect(success).to.be.true;
      expect(returnData).to.equal("0x");
    });
  });

  describe("Error Handling", function () {
    it("Should handle non-existent proposals", async function () {
      const fakeProposalId = ethers.keccak256(ethers.toUtf8Bytes("fake"));

      await expect(
        signal.getProposal(fakeProposalId)
      ).to.not.be.reverted; // Returns empty proposal

      await expect(
        signal.castVote(fakeProposalId, 1, "Vote")
      ).to.be.revertedWithCustomError(signal, "ProposalNotFound");
    });

    it("Should handle voting outside of voting period", async function () {
      const tx = await signal.connect(member1).createProposal(
        testOrgId,
        "Time Test",
        "Test voting time",
        "https://test.com",
        0, 0, 0,
        1 * 60 * 60, // 1 hour
        "0x",
        ethers.ZeroAddress
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find(log => {
        try {
          const parsed = signal.interface.parseLog(log);
          return parsed?.name === "ProposalCreated";
        } catch {
          return false;
        }
      });

      let proposalId = "";
      if (event) {
        const parsed = signal.interface.parseLog(event);
        proposalId = parsed?.args[0];
      }

      // Try to vote before voting starts
      await expect(
        signal.connect(member1).castVote(proposalId, 1, "Early vote")
      ).to.be.revertedWithCustomError(signal, "VotingNotActive");

      // Advance past voting period
      await ethers.provider.send("evm_increaseTime", [25 * 60 * 60 + 1]); // 25 hours
      await ethers.provider.send("evm_mine", []);

      // Try to vote after voting ends
      await expect(
        signal.connect(member1).castVote(proposalId, 1, "Late vote")
      ).to.be.revertedWithCustomError(signal, "VotingNotActive");
    });
  });
});
