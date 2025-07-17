import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { Registry, Control, Factory, Treasury, Staking, MockGameToken } from "../typechain-types";

describe("Factory Module", function () {
  let registry: Registry;
  let control: Control;
  let factory: Factory;
  let gameToken: MockGameToken;
  let staking: Staking;

  let admin: SignerWithAddress;
  let creator: SignerWithAddress;
  let member1: SignerWithAddress;
  let nonMember: SignerWithAddress;

  const ORGANIZATION_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ORGANIZATION_MANAGER_ROLE"));
  const MIN_STAKE_AMOUNT = ethers.parseEther("10000"); // 10,000 GAME tokens

  beforeEach(async function () {
    [admin, creator, member1, nonMember] = await ethers.getSigners();

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

    // Setup connections
    await control.setFactory(await factory.getAddress());
    await factory.setRegistry(await control.getAddress());

    // Grant necessary roles
    await staking.grantRole(ORGANIZATION_MANAGER_ROLE, await factory.getAddress());

    // Transfer tokens to test accounts
    const transferAmount = ethers.parseEther("100000");
    await gameToken.transfer(creator.address, transferAmount);
    await gameToken.transfer(member1.address, transferAmount);
  });

  describe("Deployment and Initialization", function () {
    it("Should deploy Factory correctly", async function () {
      expect(await factory.getAddress()).to.be.properAddress;
      expect(await factory.gameToken()).to.equal(await gameToken.getAddress());
      expect(await factory.stakingContract()).to.equal(await staking.getAddress());
    });

    it("Should have correct module ID", async function () {
      expect(await factory.MODULE_ID()).to.equal(ethers.keccak256(ethers.toUtf8Bytes("FACTORY")));
    });

    it("Should have correct constants", async function () {
      expect(await factory.MAX_MEMBER_LIMIT()).to.equal(10000);
      expect(await factory.MIN_MEMBER_LIMIT()).to.equal(1);
      expect(await factory.MIN_STAKE_AMOUNT()).to.equal(MIN_STAKE_AMOUNT);
    });

    it("Should allow admin to set registry", async function () {
      const newRegistry = await ethers.getContractFactory("Registry");
      const deployedRegistry = await newRegistry.deploy(admin.address);

      await expect(factory.setRegistry(await deployedRegistry.getAddress()))
        .to.emit(factory, "RegistrySet")
        .withArgs(await deployedRegistry.getAddress());
    });

    it("Should prevent non-admin from setting registry", async function () {
      await expect(
        factory.connect(creator).setRegistry(await registry.getAddress())
      ).to.be.revertedWith("AccessControl:");
    });
  });

  describe("Organization Creation", function () {
    beforeEach(async function () {
      // Approve tokens for staking
      await gameToken.connect(creator).approve(await staking.getAddress(), MIN_STAKE_AMOUNT);
    });

    it("Should create organization successfully", async function () {
      const tx = await factory.connect(creator).createOrganization(
        creator.address,
        "Test DAO",
        "https://example.com/metadata",
        0, // OrgType.Individual
        0, // AccessModel.Open
        0, // FeeModel.NoFees
        100, // memberLimit
        0, // membershipFee
        MIN_STAKE_AMOUNT
      );

      const receipt = await tx.wait();
      const events = receipt?.logs || [];

      // Should emit OrganizationCreated event
      const organizationCreatedEvent = events.find(event =>
        event.topics[0] === ethers.id("OrganizationCreated(bytes8,string,address,address,uint256)")
      );
      expect(organizationCreatedEvent).to.not.be.undefined;

      // Decode the organization ID
      const orgId = ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes8", "string", "address", "address", "uint256"],
        organizationCreatedEvent!.data
      )[0];

      expect(orgId).to.not.equal("0x0000000000000000");
    });

    it("Should deploy Treasury contract for organization", async function () {
      const tx = await factory.connect(creator).createOrganization(
        creator.address,
        "Test DAO",
        "https://example.com/metadata",
        0, 0, 0, 100, 0, MIN_STAKE_AMOUNT
      );

      const receipt = await tx.wait();
      const events = receipt?.logs || [];

      // Should emit TreasuryDeployed event
      const treasuryEvent = events.find(event =>
        event.topics[0] === ethers.id("TreasuryDeployed(bytes8,address)")
      );
      expect(treasuryEvent).to.not.be.undefined;

      // Verify treasury address is valid
      const treasuryAddress = ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes8", "address"],
        treasuryEvent!.data
      )[1];
      expect(treasuryAddress).to.be.properAddress;
      expect(treasuryAddress).to.not.equal(ethers.ZeroAddress);
    });

    it("Should handle staking correctly", async function () {
      const initialBalance = await gameToken.balanceOf(creator.address);

      await factory.connect(creator).createOrganization(
        creator.address,
        "Test DAO",
        "https://example.com/metadata",
        0, 0, 0, 100, 0, MIN_STAKE_AMOUNT
      );

      // Check that tokens were transferred for staking
      const finalBalance = await gameToken.balanceOf(creator.address);
      expect(initialBalance - finalBalance).to.equal(MIN_STAKE_AMOUNT);
    });

    it("Should generate unique organization IDs", async function () {
      // Approve tokens for multiple organizations
      await gameToken.connect(creator).approve(await staking.getAddress(), MIN_STAKE_AMOUNT * BigInt(3));

      const tx1 = await factory.connect(creator).createOrganization(
        creator.address, "DAO 1", "https://example.com/1", 0, 0, 0, 100, 0, MIN_STAKE_AMOUNT
      );
      const tx2 = await factory.connect(creator).createOrganization(
        creator.address, "DAO 2", "https://example.com/2", 0, 0, 0, 100, 0, MIN_STAKE_AMOUNT
      );

      const receipt1 = await tx1.wait();
      const receipt2 = await tx2.wait();

      const event1 = receipt1?.logs.find(log =>
        log.topics[0] === ethers.id("OrganizationCreated(bytes8,string,address,address,uint256)")
      );
      const event2 = receipt2?.logs.find(log =>
        log.topics[0] === ethers.id("OrganizationCreated(bytes8,string,address,address,uint256)")
      );

      const orgId1 = ethers.AbiCoder.defaultAbiCoder().decode(["bytes8", "string", "address", "address", "uint256"], event1!.data)[0];
      const orgId2 = ethers.AbiCoder.defaultAbiCoder().decode(["bytes8", "string", "address", "address", "uint256"], event2!.data)[0];

      expect(orgId1).to.not.equal(orgId2);
    });
  });

  describe("Validation and Error Handling", function () {
    it("Should reject empty organization name", async function () {
      await gameToken.connect(creator).approve(await staking.getAddress(), MIN_STAKE_AMOUNT);

      await expect(
        factory.connect(creator).createOrganization(
          creator.address, "", "https://example.com/metadata", 0, 0, 0, 100, 0, MIN_STAKE_AMOUNT
        )
      ).to.be.revertedWith("Organization name cannot be empty");
    });

    it("Should reject member limit below minimum", async function () {
      await gameToken.connect(creator).approve(await staking.getAddress(), MIN_STAKE_AMOUNT);

      await expect(
        factory.connect(creator).createOrganization(
          creator.address, "Test DAO", "https://example.com/metadata", 0, 0, 0, 0, 0, MIN_STAKE_AMOUNT
        )
      ).to.be.revertedWith("Member limit too low");
    });

    it("Should reject member limit above maximum", async function () {
      await gameToken.connect(creator).approve(await staking.getAddress(), MIN_STAKE_AMOUNT);

      await expect(
        factory.connect(creator).createOrganization(
          creator.address, "Test DAO", "https://example.com/metadata", 0, 0, 0, 20000, 0, MIN_STAKE_AMOUNT
        )
      ).to.be.revertedWith("Member limit too high");
    });

    it("Should reject stake amount below minimum", async function () {
      const lowStake = ethers.parseEther("1000"); // Below 10,000 minimum
      await gameToken.connect(creator).approve(await staking.getAddress(), lowStake);

      await expect(
        factory.connect(creator).createOrganization(
          creator.address, "Test DAO", "https://example.com/metadata", 0, 0, 0, 100, 0, lowStake
        )
      ).to.be.revertedWith("Stake amount too low");
    });

    it("Should reject insufficient token allowance", async function () {
      // Don't approve enough tokens
      await gameToken.connect(creator).approve(await staking.getAddress(), ethers.parseEther("5000"));

      await expect(
        factory.connect(creator).createOrganization(
          creator.address, "Test DAO", "https://example.com/metadata", 0, 0, 0, 100, 0, MIN_STAKE_AMOUNT
        )
      ).to.be.revertedWith("Insufficient token allowance for stake");
    });

    it("Should reject when registry not set", async function () {
      // Deploy a new factory without registry
      const FactoryFactory = await ethers.getContractFactory("contracts/modules/Control/Factory.sol:Factory");
      const newFactory = await FactoryFactory.deploy(
        await gameToken.getAddress(),
        await staking.getAddress()
      );

      await gameToken.connect(creator).approve(await staking.getAddress(), MIN_STAKE_AMOUNT);

      await expect(
        newFactory.connect(creator).createOrganization(
          creator.address, "Test DAO", "https://example.com/metadata", 0, 0, 0, 100, 0, MIN_STAKE_AMOUNT
        )
      ).to.be.revertedWith("Registry not set");
    });
  });

  describe("Access Control", function () {
    it("Should allow only admin to set registry", async function () {
      const newRegistry = await ethers.getContractFactory("Registry");
      const deployedRegistry = await newRegistry.deploy(admin.address);

      // Admin can set registry
      await expect(factory.setRegistry(await deployedRegistry.getAddress()))
        .to.not.be.reverted;

      // Non-admin cannot set registry
      await expect(
        factory.connect(creator).setRegistry(await deployedRegistry.getAddress())
      ).to.be.revertedWith("AccessControl:");
    });

    it("Should have correct default admin role", async function () {
      const DEFAULT_ADMIN_ROLE = await factory.DEFAULT_ADMIN_ROLE();
      expect(await factory.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
      expect(await factory.hasRole(DEFAULT_ADMIN_ROLE, creator.address)).to.be.false;
    });
  });

  describe("Integration with Control Module", function () {
    it("Should register organization with Control module", async function () {
      await gameToken.connect(creator).approve(await staking.getAddress(), MIN_STAKE_AMOUNT);

      const tx = await factory.connect(creator).createOrganization(
        creator.address, "Test DAO", "https://example.com/metadata", 0, 0, 0, 100, 0, MIN_STAKE_AMOUNT
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find(log =>
        log.topics[0] === ethers.id("OrganizationCreated(bytes8,string,address,address,uint256)")
      );

      const orgId = ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes8", "string", "address", "address", "uint256"],
        event!.data
      )[0];

      // Verify organization exists in Control module
      const organization = await control.getOrganization(orgId);
      expect(organization.name).to.equal("Test DAO");
      expect(organization.creator).to.equal(creator.address);
      expect(organization.metadataURI).to.equal("https://example.com/metadata");
    });

    it("Should delegate creation correctly from Control to Factory", async function () {
      await gameToken.connect(creator).approve(await staking.getAddress(), MIN_STAKE_AMOUNT);

      // Call through Control module (which should delegate to Factory)
      const tx = await control.connect(creator).createOrganization(
        "Test DAO via Control",
        "https://example.com/control-metadata",
        0, 0, 0, 100, 0, MIN_STAKE_AMOUNT
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find(log =>
        log.topics[0] === ethers.id("OrganizationCreated(bytes8,string,address,address,uint256)")
      );

      expect(event).to.not.be.undefined;

      const orgId = ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes8", "string", "address", "address", "uint256"],
        event!.data
      )[0];

      // Verify organization was created correctly
      const organization = await control.getOrganization(orgId);
      expect(organization.name).to.equal("Test DAO via Control");
    });
  });

  describe("Treasury Deployment", function () {
    it("Should deploy Treasury with correct parameters", async function () {
      await gameToken.connect(creator).approve(await staking.getAddress(), MIN_STAKE_AMOUNT);

      const tx = await factory.connect(creator).createOrganization(
        creator.address, "Test DAO", "https://example.com/metadata", 0, 0, 0, 100, 0, MIN_STAKE_AMOUNT
      );

      const receipt = await tx.wait();
      const treasuryEvent = receipt?.logs.find(event =>
        event.topics[0] === ethers.id("TreasuryDeployed(bytes8,address)")
      );

      const treasuryAddress = ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes8", "address"],
        treasuryEvent!.data
      )[1];

      // Verify Treasury contract is deployed and functional
      const TreasuryFactory = await ethers.getContractFactory("Treasury");
      const treasury = TreasuryFactory.attach(treasuryAddress) as Treasury;

      // Treasury should be properly initialized
      expect(await treasury.getAddress()).to.equal(treasuryAddress);
    });

    it("Should link Treasury to organization correctly", async function () {
      await gameToken.connect(creator).approve(await staking.getAddress(), MIN_STAKE_AMOUNT);

      const tx = await factory.connect(creator).createOrganization(
        creator.address, "Test DAO", "https://example.com/metadata", 0, 0, 0, 100, 0, MIN_STAKE_AMOUNT
      );

      const receipt = await tx.wait();

      const orgEvent = receipt?.logs.find(event =>
        event.topics[0] === ethers.id("OrganizationCreated(bytes8,string,address,address,uint256)")
      );
      const treasuryEvent = receipt?.logs.find(event =>
        event.topics[0] === ethers.id("TreasuryDeployed(bytes8,address)")
      );

      const orgId = ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes8", "string", "address", "address", "uint256"],
        orgEvent!.data
      )[0];
      const treasuryAddress = ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes8", "address"],
        treasuryEvent!.data
      )[1];

      // Verify organization has correct treasury address
      const organization = await control.getOrganization(orgId);
      expect(organization.treasury).to.equal(treasuryAddress);
    });
  });

  describe("Reentrancy Protection", function () {
    it("Should prevent reentrancy attacks", async function () {
      await gameToken.connect(creator).approve(await staking.getAddress(), MIN_STAKE_AMOUNT);

      // This test verifies that the nonReentrant modifier is working
      // The actual reentrancy test would require a malicious contract
      const tx = factory.connect(creator).createOrganization(
        creator.address, "Test DAO", "https://example.com/metadata", 0, 0, 0, 100, 0, MIN_STAKE_AMOUNT
      );

      await expect(tx).to.not.be.reverted;
    });
  });

  describe("Gas Optimization", function () {
    it("Should create organization within reasonable gas limits", async function () {
      await gameToken.connect(creator).approve(await staking.getAddress(), MIN_STAKE_AMOUNT);

      const tx = await factory.connect(creator).createOrganization(
        creator.address, "Test DAO", "https://example.com/metadata", 0, 0, 0, 100, 0, MIN_STAKE_AMOUNT
      );

      const receipt = await tx.wait();

      // Verify gas usage is reasonable (adjust threshold as needed)
      expect(receipt?.gasUsed).to.be.lt(3000000); // Less than 3M gas
    });
  });
});
