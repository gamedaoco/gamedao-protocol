import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  OrganizationSettings,
  SignalWithGovernance,
  ControlWithSettings,
  GameDAOMembershipWithSettings,
  MockGameToken,
  MockGameStaking
} from "../typechain-types";

describe("OrganizationSettings Governance Integration", function () {
  let organizationSettings: OrganizationSettings;
  let signal: SignalWithGovernance;
  let control: ControlWithSettings;
  let membership: GameDAOMembershipWithSettings;
  let gameToken: MockGameToken;
  let gameStaking: MockGameStaking;

  let owner: SignerWithAddress;
  let creator: SignerWithAddress;
  let member1: SignerWithAddress;
  let member2: SignerWithAddress;
  let member3: SignerWithAddress;

  let organizationId: string;
  const INITIAL_SUPPLY = ethers.utils.parseEther("1000000");
  const ORGANIZATION_STAKE = ethers.utils.parseEther("10000");
  const MEMBERSHIP_FEE = ethers.utils.parseEther("100");

  beforeEach(async function () {
    [owner, creator, member1, member2, member3] = await ethers.getSigners();

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
      ethers.constants.AddressZero, // identityContract - not used in tests
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

    // Deploy SignalWithGovernance
    const SignalWithGovernance = await ethers.getContractFactory("SignalWithGovernance");
    signal = await SignalWithGovernance.deploy();
    await signal.deployed();

    // Set up contract references
    await organizationSettings.setSignalContract(signal.address);
    await organizationSettings.setControlContract(control.address);
    await organizationSettings.setMembershipContract(membership.address);

    await signal.setOrganizationSettings(organizationSettings.address);
    await signal.setMembershipContract(membership.address);

    // Grant roles
    await organizationSettings.grantRole(await organizationSettings.GOVERNANCE_ROLE(), signal.address);
    await membership.grantRole(await membership.ORGANIZATION_MANAGER_ROLE(), control.address);

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

  describe("Settings Initialization", function () {
    it("Should initialize organization settings with default values", async function () {
      const votingParams = await organizationSettings.getVotingParameters(organizationId);
      expect(votingParams.votingDelay).to.equal(86400); // 1 day
      expect(votingParams.votingPeriod).to.equal(604800); // 7 days
      expect(votingParams.quorumThreshold).to.equal(1000); // 10%
      expect(votingParams.requireMembership).to.be.true;

      const membershipConfig = await organizationSettings.getMembershipConfig(organizationId);
      expect(membershipConfig.membershipFee).to.equal(MEMBERSHIP_FEE);
      expect(membershipConfig.memberLimit).to.equal(1000);
      expect(membershipConfig.accessModel).to.equal(0); // Open

      const stakingRequirements = await organizationSettings.getStakingRequirements(organizationId);
      expect(stakingRequirements.organizationStake).to.equal(ORGANIZATION_STAKE);
    });

    it("Should allow admin to update contract references", async function () {
      const newSignalAddress = ethers.Wallet.createRandom().address;
      await organizationSettings.setSignalContract(newSignalAddress);

      expect(await organizationSettings.signalContract()).to.equal(newSignalAddress);
    });
  });

  describe("Voting Parameters Governance", function () {
    it("Should create a proposal to change voting parameters", async function () {
      // Add members to organization
      await gameToken.connect(member1).approve(membership.address, MEMBERSHIP_FEE);
      await control.connect(member1).addMember(organizationId, member1.address);

      // Create new voting parameters
      const newVotingParams = {
        votingDelay: 172800, // 2 days
        votingPeriod: 1209600, // 14 days
        executionDelay: 259200, // 3 days
        quorumThreshold: 2000, // 20%
        proposalThreshold: 200, // 2%
        requireMembership: true,
        lastUpdated: 0
      };

      const encodedData = ethers.utils.defaultAbiCoder.encode(
        ["tuple(uint256,uint256,uint256,uint256,uint256,bool,uint256)"],
        [Object.values(newVotingParams)]
      );

      const proposalId = await signal.connect(member1).callStatic.createSettingsProposal(
        organizationId,
        "Update Voting Parameters",
        "Increase voting period and quorum threshold",
        0, // VOTING_PARAMETERS
        encodedData,
        "Improve governance participation"
      );

      await signal.connect(member1).createSettingsProposal(
        organizationId,
        "Update Voting Parameters",
        "Increase voting period and quorum threshold",
        0, // VOTING_PARAMETERS
        encodedData,
        "Improve governance participation"
      );

      // Check that setting change was proposed
      const settingChange = await organizationSettings.getSettingChange(organizationId, proposalId);
      expect(settingChange.proposer).to.equal(member1.address);
      expect(settingChange.settingType).to.equal(0); // VOTING_PARAMETERS
      expect(settingChange.status).to.equal(0); // PENDING
    });

    it("Should execute voting parameters change after successful vote", async function () {
      // Add members
      await gameToken.connect(member1).approve(membership.address, MEMBERSHIP_FEE);
      await gameToken.connect(member2).approve(membership.address, MEMBERSHIP_FEE);
      await control.connect(member1).addMember(organizationId, member1.address);
      await control.connect(member2).addMember(organizationId, member2.address);

      // Create voting parameters proposal
      const newVotingParams = {
        votingDelay: 172800, // 2 days
        votingPeriod: 1209600, // 14 days
        executionDelay: 259200, // 3 days
        quorumThreshold: 2000, // 20%
        proposalThreshold: 200, // 2%
        requireMembership: true,
        lastUpdated: 0
      };

      const encodedData = ethers.utils.defaultAbiCoder.encode(
        ["tuple(uint256,uint256,uint256,uint256,uint256,bool,uint256)"],
        [Object.values(newVotingParams)]
      );

      const proposalId = await signal.connect(member1).callStatic.createSettingsProposal(
        organizationId,
        "Update Voting Parameters",
        "Increase voting period and quorum threshold",
        0, // VOTING_PARAMETERS
        encodedData,
        "Improve governance participation"
      );

      await signal.connect(member1).createSettingsProposal(
        organizationId,
        "Update Voting Parameters",
        "Increase voting period and quorum threshold",
        0, // VOTING_PARAMETERS
        encodedData,
        "Improve governance participation"
      );

      // Wait for voting delay
      await ethers.provider.send("evm_increaseTime", [86400]); // 1 day
      await ethers.provider.send("evm_mine", []);

      // Cast votes
      await signal.connect(member1).castVote(proposalId, 2, "Support the change"); // For
      await signal.connect(member2).castVote(proposalId, 2, "Good idea"); // For

      // Wait for voting period
      await ethers.provider.send("evm_increaseTime", [604800]); // 7 days
      await ethers.provider.send("evm_mine", []);

      // Wait for execution delay
      await ethers.provider.send("evm_increaseTime", [172800]); // 2 days
      await ethers.provider.send("evm_mine", []);

      // Execute proposal
      await signal.connect(member1).executeProposal(proposalId);

      // Check that voting parameters were updated
      const updatedParams = await organizationSettings.getVotingParameters(organizationId);
      expect(updatedParams.votingDelay).to.equal(172800);
      expect(updatedParams.votingPeriod).to.equal(1209600);
      expect(updatedParams.quorumThreshold).to.equal(2000);
    });
  });

  describe("Membership Configuration Governance", function () {
    it("Should create a proposal to change membership configuration", async function () {
      // Add member
      await gameToken.connect(member1).approve(membership.address, MEMBERSHIP_FEE);
      await control.connect(member1).addMember(organizationId, member1.address);

      // Create new membership config
      const newMembershipConfig = {
        membershipFee: ethers.utils.parseEther("200"),
        memberLimit: 2000,
        accessModel: 1, // Voting
        feeModel: 2, // Transfer
        minimumStake: ethers.utils.parseEther("50"),
        lastUpdated: 0
      };

      const encodedData = ethers.utils.defaultAbiCoder.encode(
        ["tuple(uint256,uint256,uint8,uint8,uint256,uint256)"],
        [Object.values(newMembershipConfig)]
      );

      const proposalId = await signal.connect(member1).callStatic.createSettingsProposal(
        organizationId,
        "Update Membership Config",
        "Increase membership fee and change access model",
        1, // MEMBERSHIP_CONFIG
        encodedData,
        "Better member quality control"
      );

      await signal.connect(member1).createSettingsProposal(
        organizationId,
        "Update Membership Config",
        "Increase membership fee and change access model",
        1, // MEMBERSHIP_CONFIG
        encodedData,
        "Better member quality control"
      );

      // Check that setting change was proposed
      const settingChange = await organizationSettings.getSettingChange(organizationId, proposalId);
      expect(settingChange.proposer).to.equal(member1.address);
      expect(settingChange.settingType).to.equal(1); // MEMBERSHIP_CONFIG
    });

    it("Should enforce membership limits from settings", async function () {
      // First, update membership config to have a limit of 2
      await gameToken.connect(member1).approve(membership.address, MEMBERSHIP_FEE);
      await control.connect(member1).addMember(organizationId, member1.address);

      const newMembershipConfig = {
        membershipFee: MEMBERSHIP_FEE,
        memberLimit: 2, // Very low limit
        accessModel: 0, // Open
        feeModel: 0, // NoFees
        minimumStake: 0,
        lastUpdated: 0
      };

      const encodedData = ethers.utils.defaultAbiCoder.encode(
        ["tuple(uint256,uint256,uint8,uint8,uint256,uint256)"],
        [Object.values(newMembershipConfig)]
      );

      // Create and execute proposal (simplified for test)
      const proposalId = await signal.connect(member1).callStatic.createSettingsProposal(
        organizationId,
        "Update Membership Config",
        "Set low member limit",
        1, // MEMBERSHIP_CONFIG
        encodedData,
        "Test limit enforcement"
      );

      await signal.connect(member1).createSettingsProposal(
        organizationId,
        "Update Membership Config",
        "Set low member limit",
        1, // MEMBERSHIP_CONFIG
        encodedData,
        "Test limit enforcement"
      );

      // Fast-forward through governance process
      await ethers.provider.send("evm_increaseTime", [86400]); // voting delay
      await signal.connect(member1).castVote(proposalId, 2, "Support"); // For
      await ethers.provider.send("evm_increaseTime", [604800]); // voting period
      await ethers.provider.send("evm_increaseTime", [172800]); // execution delay
      await signal.connect(member1).executeProposal(proposalId);

      // Now try to add a third member - should fail
      await gameToken.connect(member2).approve(membership.address, MEMBERSHIP_FEE);
      await control.connect(member2).addMember(organizationId, member2.address);

      // Try to add fourth member - should fail due to limit
      await gameToken.connect(member3).approve(membership.address, MEMBERSHIP_FEE);
      await expect(
        control.connect(member3).addMember(organizationId, member3.address)
      ).to.be.revertedWith("MembershipLimitExceeded");
    });
  });

  describe("Reputation Configuration Governance", function () {
    it("Should create a proposal to change reputation configuration", async function () {
      // Add member
      await gameToken.connect(member1).approve(membership.address, MEMBERSHIP_FEE);
      await control.connect(member1).addMember(organizationId, member1.address);

      // Create new reputation config
      const newReputationConfig = {
        baseReputation: 200,
        maxReputation: 20000,
        reputationDecay: 20, // 0.2% per day
        proposalReward: 100,
        votingReward: 20,
        lastUpdated: 0
      };

      const encodedData = ethers.utils.defaultAbiCoder.encode(
        ["tuple(uint256,uint256,uint256,uint256,uint256,uint256)"],
        [Object.values(newReputationConfig)]
      );

      const proposalId = await signal.connect(member1).callStatic.createSettingsProposal(
        organizationId,
        "Update Reputation Config",
        "Increase base reputation and rewards",
        4, // REPUTATION_CONFIG
        encodedData,
        "Better reputation system"
      );

      await signal.connect(member1).createSettingsProposal(
        organizationId,
        "Update Reputation Config",
        "Increase base reputation and rewards",
        4, // REPUTATION_CONFIG
        encodedData,
        "Better reputation system"
      );

      // Check that setting change was proposed
      const settingChange = await organizationSettings.getSettingChange(organizationId, proposalId);
      expect(settingChange.proposer).to.equal(member1.address);
      expect(settingChange.settingType).to.equal(4); // REPUTATION_CONFIG
    });

    it("Should apply reputation rewards based on settings", async function () {
      // Add member
      await gameToken.connect(member1).approve(membership.address, MEMBERSHIP_FEE);
      await control.connect(member1).addMember(organizationId, member1.address);

      // Check initial reputation
      const initialMember = await membership.getMember(organizationId, member1.address);
      expect(initialMember.reputation).to.equal(100); // Default base reputation

      // Reward member for proposal creation
      await membership.connect(owner).rewardProposalCreation(organizationId, member1.address);

      // Check updated reputation
      const updatedMember = await membership.getMember(organizationId, member1.address);
      expect(updatedMember.reputation).to.equal(150); // 100 + 50 (default proposal reward)
    });
  });

  describe("Emergency Settings Updates", function () {
    it("Should allow emergency settings updates", async function () {
      // Grant emergency role
      await organizationSettings.grantRole(await organizationSettings.EMERGENCY_ROLE(), owner.address);

      // Create emergency membership config
      const emergencyConfig = {
        membershipFee: 0,
        memberLimit: 10000,
        accessModel: 0, // Open
        feeModel: 0, // NoFees
        minimumStake: 0,
        lastUpdated: 0
      };

      const encodedData = ethers.utils.defaultAbiCoder.encode(
        ["tuple(uint256,uint256,uint8,uint8,uint256,uint256)"],
        [Object.values(emergencyConfig)]
      );

      await organizationSettings.emergencyUpdateSetting(
        organizationId,
        1, // MEMBERSHIP_CONFIG
        encodedData,
        "Emergency: Remove membership fees"
      );

      // Check that settings were updated immediately
      const updatedConfig = await organizationSettings.getMembershipConfig(organizationId);
      expect(updatedConfig.membershipFee).to.equal(0);
      expect(updatedConfig.memberLimit).to.equal(10000);
    });

    it("Should enforce emergency action limits", async function () {
      // Grant emergency role
      await organizationSettings.grantRole(await organizationSettings.EMERGENCY_ROLE(), owner.address);

      // Create emergency config
      const emergencyConfig = {
        membershipFee: 0,
        memberLimit: 10000,
        accessModel: 0,
        feeModel: 0,
        minimumStake: 0,
        lastUpdated: 0
      };

      const encodedData = ethers.utils.defaultAbiCoder.encode(
        ["tuple(uint256,uint256,uint8,uint8,uint256,uint256)"],
        [Object.values(emergencyConfig)]
      );

      // Perform multiple emergency actions
      for (let i = 0; i < 5; i++) {
        await organizationSettings.emergencyUpdateSetting(
          organizationId,
          1, // MEMBERSHIP_CONFIG
          encodedData,
          `Emergency action ${i + 1}`
        );
      }

      // Sixth action should fail
      await expect(
        organizationSettings.emergencyUpdateSetting(
          organizationId,
          1, // MEMBERSHIP_CONFIG
          encodedData,
          "Emergency action 6"
        )
      ).to.be.revertedWith("EmergencyActionLimitExceeded");
    });
  });

  describe("Settings Change History", function () {
    it("Should track setting change history", async function () {
      // Add member
      await gameToken.connect(member1).approve(membership.address, MEMBERSHIP_FEE);
      await control.connect(member1).addMember(organizationId, member1.address);

      // Create and execute multiple setting changes
      const configs = [
        { membershipFee: ethers.utils.parseEther("150"), memberLimit: 1500 },
        { membershipFee: ethers.utils.parseEther("200"), memberLimit: 2000 }
      ];

      for (let i = 0; i < configs.length; i++) {
        const config = {
          membershipFee: configs[i].membershipFee,
          memberLimit: configs[i].memberLimit,
          accessModel: 0,
          feeModel: 0,
          minimumStake: 0,
          lastUpdated: 0
        };

        const encodedData = ethers.utils.defaultAbiCoder.encode(
          ["tuple(uint256,uint256,uint8,uint8,uint256,uint256)"],
          [Object.values(config)]
        );

        const proposalId = await signal.connect(member1).callStatic.createSettingsProposal(
          organizationId,
          `Update Config ${i + 1}`,
          `Configuration change ${i + 1}`,
          1, // MEMBERSHIP_CONFIG
          encodedData,
          `Change ${i + 1}`
        );

        await signal.connect(member1).createSettingsProposal(
          organizationId,
          `Update Config ${i + 1}`,
          `Configuration change ${i + 1}`,
          1, // MEMBERSHIP_CONFIG
          encodedData,
          `Change ${i + 1}`
        );

        // Fast-forward through governance
        await ethers.provider.send("evm_increaseTime", [86400]); // voting delay
        await signal.connect(member1).castVote(proposalId, 2, "Support"); // For
        await ethers.provider.send("evm_increaseTime", [604800]); // voting period
        await ethers.provider.send("evm_increaseTime", [172800]); // execution delay
        await signal.connect(member1).executeProposal(proposalId);
      }

      // Check setting change history
      const history = await organizationSettings.getSettingChangeHistory(organizationId, 1); // MEMBERSHIP_CONFIG
      expect(history.length).to.equal(2);
      expect(history[0].status).to.equal(3); // EXECUTED
      expect(history[1].status).to.equal(3); // EXECUTED
    });

    it("Should track pending setting changes", async function () {
      // Add member
      await gameToken.connect(member1).approve(membership.address, MEMBERSHIP_FEE);
      await control.connect(member1).addMember(organizationId, member1.address);

      // Create multiple pending proposals
      const configs = [
        { membershipFee: ethers.utils.parseEther("150"), memberLimit: 1500 },
        { membershipFee: ethers.utils.parseEther("200"), memberLimit: 2000 }
      ];

      for (let i = 0; i < configs.length; i++) {
        const config = {
          membershipFee: configs[i].membershipFee,
          memberLimit: configs[i].memberLimit,
          accessModel: 0,
          feeModel: 0,
          minimumStake: 0,
          lastUpdated: 0
        };

        const encodedData = ethers.utils.defaultAbiCoder.encode(
          ["tuple(uint256,uint256,uint8,uint8,uint256,uint256)"],
          [Object.values(config)]
        );

        await signal.connect(member1).createSettingsProposal(
          organizationId,
          `Pending Config ${i + 1}`,
          `Pending configuration change ${i + 1}`,
          1, // MEMBERSHIP_CONFIG
          encodedData,
          `Pending change ${i + 1}`
        );
      }

      // Check pending changes
      const pendingChanges = await organizationSettings.getPendingSettingChanges(organizationId);
      expect(pendingChanges.length).to.equal(2);
      expect(pendingChanges[0].status).to.equal(0); // PENDING
      expect(pendingChanges[1].status).to.equal(0); // PENDING
    });
  });

  describe("Integration with Control Contract", function () {
    it("Should use settings for organization configuration", async function () {
      // Get organization data
      const organization = await control.getOrganization(organizationId);
      expect(organization.membershipFee).to.equal(MEMBERSHIP_FEE);
      expect(organization.memberLimit).to.equal(1000);

      // Add member
      await gameToken.connect(member1).approve(membership.address, MEMBERSHIP_FEE);
      await control.connect(member1).addMember(organizationId, member1.address);

      // Update organization config through Control contract
      await control.connect(member1).updateOrganizationConfig(
        organizationId,
        1, // Voting access model
        2, // Transfer fee model
        2000, // New member limit
        ethers.utils.parseEther("200"), // New membership fee
        ethers.utils.parseEther("100") // Minimum stake
      );

      // Check that setting change was proposed
      const pendingChanges = await organizationSettings.getPendingSettingChanges(organizationId);
      expect(pendingChanges.length).to.equal(1);
      expect(pendingChanges[0].settingType).to.equal(1); // MEMBERSHIP_CONFIG
    });

    it("Should get organization settings through Control contract", async function () {
      const settings = await control.getOrganizationSettings(organizationId);

      expect(settings.votingParams.votingPeriod).to.equal(604800); // 7 days
      expect(settings.membershipConfig.membershipFee).to.equal(MEMBERSHIP_FEE);
      expect(settings.stakingRequirements.organizationStake).to.equal(ORGANIZATION_STAKE);
    });
  });

  describe("Pause/Unpause Functionality", function () {
    it("Should allow pausing and unpausing organization settings", async function () {
      // Grant emergency role
      await organizationSettings.grantRole(await organizationSettings.EMERGENCY_ROLE(), owner.address);

      // Pause organization settings
      await organizationSettings.pauseOrganizationSettings(organizationId);

      // Try to propose a setting change - should fail
      await gameToken.connect(member1).approve(membership.address, MEMBERSHIP_FEE);
      await control.connect(member1).addMember(organizationId, member1.address);

      const config = {
        membershipFee: ethers.utils.parseEther("200"),
        memberLimit: 2000,
        accessModel: 0,
        feeModel: 0,
        minimumStake: 0,
        lastUpdated: 0
      };

      const encodedData = ethers.utils.defaultAbiCoder.encode(
        ["tuple(uint256,uint256,uint8,uint8,uint256,uint256)"],
        [Object.values(config)]
      );

      await expect(
        signal.connect(member1).createSettingsProposal(
          organizationId,
          "Update Config",
          "Should fail due to pause",
          1, // MEMBERSHIP_CONFIG
          encodedData,
          "Test pause"
        )
      ).to.be.revertedWith("OrganizationPaused");

      // Unpause
      await organizationSettings.unpauseOrganizationSettings(organizationId);

      // Now proposal should work
      await expect(
        signal.connect(member1).createSettingsProposal(
          organizationId,
          "Update Config",
          "Should work after unpause",
          1, // MEMBERSHIP_CONFIG
          encodedData,
          "Test unpause"
        )
      ).to.not.be.reverted;
    });
  });
});
