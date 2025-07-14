import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { GameDAORegistry, Control, Treasury, GameStaking, MockGameToken } from "../typechain-types";

describe("Control Module", function () {
  let registry: GameDAORegistry;
  let control: Control;
  let gameToken: MockGameToken;
  let gameStaking: GameStaking;
  let admin: SignerWithAddress;
  let creator: SignerWithAddress;
  let member1: SignerWithAddress;
  let member2: SignerWithAddress;
  let nonMember: SignerWithAddress;

  const MODULE_ID = ethers.keccak256(ethers.toUtf8Bytes("CONTROL"));
  const ORGANIZATION_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ORGANIZATION_MANAGER_ROLE"));

  beforeEach(async function () {
    [admin, creator, member1, member2, nonMember] = await ethers.getSigners();

    // Deploy Game Token (clean ERC20)
    const GameTokenFactory = await ethers.getContractFactory("MockGameToken");
    gameToken = await GameTokenFactory.deploy();
    await gameToken.waitForDeployment();

    // Deploy GameStaking Contract
    const GameStakingFactory = await ethers.getContractFactory("GameStaking");
    gameStaking = await GameStakingFactory.deploy(
      await gameToken.getAddress(),
      admin.address, // treasury
      500 // 5% protocol fee share
    );
    await gameStaking.waitForDeployment();

    // Deploy Registry
    const GameDAORegistryFactory = await ethers.getContractFactory("GameDAORegistry");
    registry = await GameDAORegistryFactory.deploy(admin.address);
    await registry.waitForDeployment();

    // Deploy Control Module
    const ControlFactory = await ethers.getContractFactory("Control");
    control = await ControlFactory.deploy(
      await gameToken.getAddress(),
      await gameStaking.getAddress()
    );
    await control.waitForDeployment();

    // Grant ORGANIZATION_MANAGER_ROLE to Control contract
    await gameStaking.grantRole(ORGANIZATION_MANAGER_ROLE, await control.getAddress());

    // Register Control module
    await registry.registerModule(await control.getAddress());

    // Transfer tokens to creator for testing
    await gameToken.transfer(creator.address, ethers.parseEther("100000"));
  });

  describe("Organization Management", function () {
    it("Should create organization successfully with staking", async function () {
      const stakeAmount = ethers.parseEther("10000");

      // Creator approves Control contract to spend tokens
      await gameToken.connect(creator).approve(await control.getAddress(), stakeAmount);

      const orgTx = await control.connect(creator).createOrganization(
        "Test DAO",
        "ipfs://test-metadata",
        0, // Individual
        0, // Open access
        0, // No fees
        100, // Member limit
        0, // No membership fee
        stakeAmount
      );

      const receipt = await orgTx.wait();
      const event = receipt?.logs.find(log => {
        try {
          const parsed = control.interface.parseLog(log as any);
          return parsed?.name === "OrganizationCreated";
        } catch {
          return false;
        }
      });

      expect(event).to.not.be.undefined;

      // Check that stake was created in GameStaking contract
      const parsed = control.interface.parseLog(event as any);
      const orgId = parsed?.args[0];

      const stake = await gameStaking.getOrganizationStake(orgId);
      expect(stake.staker).to.equal(creator.address);
      expect(stake.amount).to.equal(stakeAmount);
      expect(stake.active).to.be.true;
    });

    it("Should fail to create organization without sufficient allowance", async function () {
      const stakeAmount = ethers.parseEther("10000");

      // Don't approve tokens
      await expect(
        control.connect(creator).createOrganization(
          "Test DAO",
          "ipfs://test-metadata",
          0, // Individual
          0, // Open access
          0, // No fees
          100, // Member limit
          0, // No membership fee
          stakeAmount
        )
      ).to.be.revertedWith("Insufficient token allowance for stake");
    });

    it("Should fail to create organization with insufficient stake", async function () {
      const stakeAmount = ethers.parseEther("1000"); // Below minimum

      await gameToken.connect(creator).approve(await control.getAddress(), stakeAmount);

      await expect(
        control.connect(creator).createOrganization(
          "Test DAO",
          "ipfs://test-metadata",
          0, // Individual
          0, // Open access
          0, // No fees
          100, // Member limit
          0, // No membership fee
          stakeAmount
        )
      ).to.be.revertedWith("Stake amount below minimum");
    });

    it("Should allow stake withdrawal after organization dissolution", async function () {
      const stakeAmount = ethers.parseEther("10000");

      // Create organization
      await gameToken.connect(creator).approve(await control.getAddress(), stakeAmount);
      const orgTx = await control.connect(creator).createOrganization(
        "Test DAO",
        "ipfs://test-metadata",
        0, 0, 0, 100, 0, stakeAmount
      );

      const receipt = await orgTx.wait();
      const event = receipt?.logs.find(log => {
        try {
          const parsed = control.interface.parseLog(log as any);
          return parsed?.name === "OrganizationCreated";
        } catch {
          return false;
        }
      });

      const parsed = control.interface.parseLog(event as any);
      const orgId = parsed?.args[0];

      // Dissolve organization
      await control.connect(creator).updateOrganizationState(orgId, 2); // Dissolved

      // Fast forward time to pass lock period
      await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60 + 1]); // 30 days + 1 second
      await ethers.provider.send("evm_mine", []);

      // Check if stake can be withdrawn
      const canWithdraw = await control.canWithdrawStake(orgId);
      expect(canWithdraw).to.be.true;

      // Withdraw stake
      const balanceBefore = await gameToken.balanceOf(creator.address);
      await control.connect(creator).withdrawStake(orgId);
      const balanceAfter = await gameToken.balanceOf(creator.address);

      expect(balanceAfter - balanceBefore).to.equal(stakeAmount);
    });

    it("Should fail to withdraw stake before lock period", async function () {
      const stakeAmount = ethers.parseEther("10000");

      // Create organization
      await gameToken.connect(creator).approve(await control.getAddress(), stakeAmount);
      const orgTx = await control.connect(creator).createOrganization(
        "Test DAO",
        "ipfs://test-metadata",
        0, 0, 0, 100, 0, stakeAmount
      );

      const receipt = await orgTx.wait();
      const event = receipt?.logs.find(log => {
        try {
          const parsed = control.interface.parseLog(log as any);
          return parsed?.name === "OrganizationCreated";
        } catch {
          return false;
        }
      });

      const parsed = control.interface.parseLog(event as any);
      const orgId = parsed?.args[0];

      // Dissolve organization
      await control.connect(creator).updateOrganizationState(orgId, 2); // Dissolved

      // Try to withdraw immediately (should fail)
      await expect(
        control.connect(creator).withdrawStake(orgId)
      ).to.be.revertedWith("Stake cannot be withdrawn yet");
    });
  });

  describe("Member Management", function () {
    let orgId: string;

    beforeEach(async function () {
      const stakeAmount = ethers.parseEther("10000");

      // Create organization for testing
      await gameToken.connect(creator).approve(await control.getAddress(), stakeAmount);
      const orgTx = await control.connect(creator).createOrganization(
        "Test DAO",
        "ipfs://test-metadata",
        0, 0, 0, 100, 0, stakeAmount
      );

      const receipt = await orgTx.wait();
      const event = receipt?.logs.find(log => {
        try {
          const parsed = control.interface.parseLog(log as any);
          return parsed?.name === "OrganizationCreated";
        } catch {
          return false;
        }
      });

      const parsed = control.interface.parseLog(event as any);
      orgId = parsed?.args[0];
    });

    it("Should add member successfully", async function () {
      await control.connect(creator).addMember(orgId, member1.address);

      const isMember = await control.isMember(orgId, member1.address);
      expect(isMember).to.be.true;
    });

    it("Should remove member successfully", async function () {
      await control.connect(creator).addMember(orgId, member1.address);
      await control.connect(creator).removeMember(orgId, member1.address);

      const isMember = await control.isMember(orgId, member1.address);
      expect(isMember).to.be.false;
    });

    it("Should allow member to remove themselves", async function () {
      await control.connect(creator).addMember(orgId, member1.address);
      await control.connect(member1).removeMember(orgId, member1.address);

      const isMember = await control.isMember(orgId, member1.address);
      expect(isMember).to.be.false;
    });
  });

  describe("View Functions", function () {
    it("Should return correct organization count", async function () {
      const initialCount = await control.getOrganizationCount();

      const stakeAmount = ethers.parseEther("10000");
      await gameToken.connect(creator).approve(await control.getAddress(), stakeAmount);
      await control.connect(creator).createOrganization(
        "Test DAO",
        "ipfs://test-metadata",
        0, 0, 0, 100, 0, stakeAmount
      );

      const newCount = await control.getOrganizationCount();
      expect(newCount).to.equal(initialCount + 1n);
    });

    it("Should return organization details", async function () {
      const stakeAmount = ethers.parseEther("10000");

      await gameToken.connect(creator).approve(await control.getAddress(), stakeAmount);
      const orgTx = await control.connect(creator).createOrganization(
        "Test DAO",
        "ipfs://test-metadata",
        0, 0, 0, 100, 0, stakeAmount
      );

      const receipt = await orgTx.wait();
      const event = receipt?.logs.find(log => {
        try {
          const parsed = control.interface.parseLog(log as any);
          return parsed?.name === "OrganizationCreated";
        } catch {
          return false;
        }
      });

      const parsed = control.interface.parseLog(event as any);
      const orgId = parsed?.args[0];

      const org = await control.getOrganization(orgId);
      expect(org.name).to.equal("Test DAO");
      expect(org.creator).to.equal(creator.address);
      expect(org.gameStakeRequired).to.equal(stakeAmount);
    });
  });
});
