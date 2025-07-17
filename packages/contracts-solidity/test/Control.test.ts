import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { Registry, Control, Treasury, Staking, MockGameToken, Membership, Factory } from "../typechain-types";

describe("Control Module", function () {
  let registry: Registry;
  let control: Control;
  let factory: Factory;
  let membership: Membership;
  let gameToken: MockGameToken;
  let staking: Staking;
  let admin: SignerWithAddress;
  let creator: SignerWithAddress;
  let member1: SignerWithAddress;
  let member2: SignerWithAddress;
  let nonMember: SignerWithAddress;

  const MODULE_ID = ethers.keccak256(ethers.toUtf8Bytes("CONTROL"));
  const MEMBERSHIP_MODULE_ID = ethers.keccak256(ethers.toUtf8Bytes("MEMBERSHIP"));
  const ORGANIZATION_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ORGANIZATION_MANAGER_ROLE"));

  beforeEach(async function () {
    [admin, creator, member1, member2, nonMember] = await ethers.getSigners();

    // Deploy Game Token (clean ERC20)
    const GameTokenFactory = await ethers.getContractFactory("MockGameToken");
    gameToken = await GameTokenFactory.deploy();
    await gameToken.waitForDeployment();

    // Deploy Staking Contract
    const StakingFactory = await ethers.getContractFactory("Staking");
    staking = await StakingFactory.deploy(
      await gameToken.getAddress(),
      admin.address, // treasury
      500 // 5% protocol fee share
    );
    await staking.waitForDeployment();

    // Deploy Registry
    const RegistryFactory = await ethers.getContractFactory("Registry");
    registry = await RegistryFactory.deploy(admin.address);
    await registry.waitForDeployment();

    // Deploy Membership Module
    const MembershipFactory = await ethers.getContractFactory("Membership");
    membership = await MembershipFactory.deploy();
    await membership.waitForDeployment();

    // Deploy Control Module
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

    // Grant ORGANIZATION_MANAGER_ROLE to Factory
    await staking.grantRole(ORGANIZATION_MANAGER_ROLE, await factory.getAddress());

    // Register modules
    await registry.registerModule(await control.getAddress());
    await registry.registerModule(await membership.getAddress());

    // Initialize Membership contract
    await membership.initialize(await registry.getAddress());
    await membership.setGameToken(await gameToken.getAddress());
    await membership.setControlContract(await control.getAddress());

    // Grant ORGANIZATION_MANAGER_ROLE to admin for membership management
    await membership.grantRole(ORGANIZATION_MANAGER_ROLE, admin.address);

    // Set up factory connections
    await control.setFactory(await factory.getAddress());
    await factory.setRegistry(await control.getAddress());

    // Transfer tokens to test accounts
    const transferAmount = ethers.parseEther("100000");
    await gameToken.transfer(creator.address, transferAmount);
    await gameToken.transfer(member1.address, transferAmount);
    await gameToken.transfer(member2.address, transferAmount);
  });

  describe("Organization Management", function () {
    it("Should create organization successfully with staking", async function () {
      const stakeAmount = ethers.parseEther("10000");

      // Approve tokens for staking - approve Staking contract to spend tokens
      await gameToken.connect(creator).approve(await staking.getAddress(), stakeAmount);

      const tx = await control.connect(creator).createOrganization(
        "Test Organization",
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

      // Find OrganizationCreated event
      const organizationCreatedEvent = events.find(event =>
        event.topics[0] === ethers.id("OrganizationCreated(bytes8,string,address,address,uint256)")
      );

      expect(organizationCreatedEvent).to.not.be.undefined;

      // Parse event data
      const iface = new ethers.Interface([
        "event OrganizationCreated(bytes8 indexed id, string name, address indexed creator, address indexed treasury, uint256 timestamp)"
      ]);
      const parsed = iface.parseLog(organizationCreatedEvent!);
      const orgId = parsed?.args[0];

      const stake = await staking.getOrganizationStake(orgId);
      expect(stake.staker).to.equal(creator.address);
      expect(stake.amount).to.equal(stakeAmount);
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

      // Approve tokens for staking
      await gameToken.connect(creator).approve(await staking.getAddress(), stakeAmount);

      const tx = await control.connect(creator).createOrganization(
        "Test Organization",
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

      // Find OrganizationCreated event
      const organizationCreatedEvent = events.find(event =>
        event.topics[0] === ethers.id("OrganizationCreated(bytes8,string,address,address,uint256)")
      );

      // Parse event data
      const iface = new ethers.Interface([
        "event OrganizationCreated(bytes8 indexed id, string name, address indexed creator, address indexed treasury, uint256 timestamp)"
      ]);
      const parsed = iface.parseLog(organizationCreatedEvent!);
      orgId = parsed?.args[0];

      // Activate organization for membership management
      await membership.connect(admin).activateOrganization(orgId);

      // Grant creator permission to manage members of their organization
      await membership.connect(admin).grantRole(ORGANIZATION_MANAGER_ROLE, creator.address);
    });

    it("Should add member successfully", async function () {
      await membership.connect(creator).addMember(orgId, member1.address, 0); // MembershipTier.STANDARD = 0

      expect(await membership.isMember(orgId, member1.address)).to.be.true;
    });

    it("Should remove member successfully", async function () {
      await membership.connect(creator).addMember(orgId, member1.address, 0);
      await membership.connect(creator).removeMember(orgId, member1.address);

      expect(await membership.isMember(orgId, member1.address)).to.be.false;
    });

    it("Should allow member to remove themselves", async function () {
      await membership.connect(creator).addMember(orgId, member1.address, 0);
      await membership.connect(member1).removeMember(orgId, member1.address);

      expect(await membership.isMember(orgId, member1.address)).to.be.false;
    });
  });

  describe("View Functions", function () {
    it("Should return correct organization count", async function () {
      expect(await control.getOrganizationCount()).to.equal(0);

      const stakeAmount = ethers.parseEther("10000");
      await gameToken.connect(creator).approve(await control.getAddress(), stakeAmount);

      await control.connect(creator).createOrganization(
        "Test Organization",
        "https://example.com/metadata",
        0, // OrgType.Individual
        0, // AccessModel.Open
        0, // FeeModel.NoFees
        100, // memberLimit
        0, // membershipFee
        stakeAmount
      );

      expect(await control.getOrganizationCount()).to.equal(1);
    });

    it("Should return organization details", async function () {
      const stakeAmount = ethers.parseEther("10000");
      await gameToken.connect(creator).approve(await control.getAddress(), stakeAmount);

      const tx = await control.connect(creator).createOrganization(
        "Test Organization",
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

      // Find OrganizationCreated event
      const organizationCreatedEvent = events.find(event =>
        event.topics[0] === ethers.id("OrganizationCreated(bytes8,string,address,address,uint256)")
      );

      // Parse event data
      const iface = new ethers.Interface([
        "event OrganizationCreated(bytes8 indexed id, string name, address indexed creator, address indexed treasury, uint256 timestamp)"
      ]);
      const parsed = iface.parseLog(organizationCreatedEvent!);
      const orgId = parsed?.args[0];

      const org = await control.getOrganization(orgId);
      expect(org.name).to.equal("Test Organization");
      expect(org.creator).to.equal(creator.address);
      expect(org.memberCount).to.equal(1); // Creator is first member
    });
  });
});
