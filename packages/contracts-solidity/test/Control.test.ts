import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { GameDAORegistry, Control, Treasury } from "../typechain-types";

describe("Control Module", function () {
  let registry: GameDAORegistry;
  let control: Control;
  let gameToken: any;
  let admin: SignerWithAddress;
  let creator: SignerWithAddress;
  let member1: SignerWithAddress;
  let member2: SignerWithAddress;
  let nonMember: SignerWithAddress;

  const MODULE_ID = ethers.keccak256(ethers.toUtf8Bytes("CONTROL"));

  beforeEach(async function () {
    [admin, creator, member1, member2, nonMember] = await ethers.getSigners();

    // Deploy Game Token
    const GameTokenFactory = await ethers.getContractFactory("MockGameToken");
    gameToken = await GameTokenFactory.deploy();
    await gameToken.waitForDeployment();

    // Deploy Registry
    const GameDAORegistryFactory = await ethers.getContractFactory("GameDAORegistry");
    registry = await GameDAORegistryFactory.deploy(admin.address);
    await registry.waitForDeployment();

    // Deploy Control Module
    const ControlFactory = await ethers.getContractFactory("Control");
    control = await ControlFactory.deploy(await gameToken.getAddress());
    await control.waitForDeployment();

    // Register and enable Control module
    await registry.registerModule(await control.getAddress());
    await registry.enableModule(MODULE_ID);
  });

  describe("Organization Management", function () {
    it("Should create organization successfully", async function () {
      const orgTx = await control.connect(creator).createOrganization(
        "Test DAO",
        "ipfs://test-metadata",
        0, // Individual
        0, // Open access
        0, // No fees
        100, // Member limit
        0, // No membership fee
        0  // No GAME stake required
      );

      const receipt = await orgTx.wait();
      const event = receipt?.logs.find(log =>
        control.interface.parseLog(log as any)?.name === "OrganizationCreated"
      );

      expect(event).to.not.be.undefined;

      const parsedEvent = control.interface.parseLog(event as any);
      const orgId = parsedEvent?.args[0];

      // Verify organization data
      const org = await control.getOrganization(orgId);
      expect(org.name).to.equal("Test DAO");
      expect(org.creator).to.equal(creator.address);
      expect(org.orgType).to.equal(0);
      expect(org.accessModel).to.equal(0);
      expect(org.memberLimit).to.equal(100);

      // Verify creator is added as member
      expect(await control.isMember(orgId, creator.address)).to.be.true;
      expect(await control.getMemberCount(orgId)).to.equal(1);
    });

    it("Should have treasury created for organization", async function () {
      const orgTx = await control.connect(creator).createOrganization(
        "Test DAO",
        "ipfs://test-metadata",
        2, // DAO
        0, // Open access
        0, // No fees
        0, // No member limit
        0, // No membership fee
        0  // No GAME stake required
      );

      const receipt = await orgTx.wait();
      const event = receipt?.logs.find(log =>
        control.interface.parseLog(log as any)?.name === "OrganizationCreated"
      );
      const parsedEvent = control.interface.parseLog(event as any);
      const orgId = parsedEvent?.args[0];

      // Get the organization and verify treasury address
      const org = await control.getOrganization(orgId);
      expect(org.treasury).to.not.equal(ethers.ZeroAddress);

      // Verify treasury is properly initialized
      const Treasury = await ethers.getContractFactory("Treasury");
      const treasury = Treasury.attach(org.treasury) as Treasury;

      // Note: Treasury uses bytes32 version of the org ID
      const orgIdBytes32 = ethers.keccak256(ethers.solidityPacked(["bytes8"], [orgId]));
      expect(await treasury.organizationId()).to.equal(orgIdBytes32);
      expect(await treasury.controlModule()).to.equal(await control.getAddress());
    });

    it("Should update organization state", async function () {
      // Create organization
      const orgTx = await control.connect(creator).createOrganization(
        "Test DAO",
        "ipfs://test-metadata",
        0, // Individual
        0, // Open access
        0, // No fees
        100, // Member limit
        0, // No membership fee
        0  // No GAME stake required
      );

      const receipt = await orgTx.wait();
      const event = receipt?.logs.find(log =>
        control.interface.parseLog(log as any)?.name === "OrganizationCreated"
      );
      const parsedEvent = control.interface.parseLog(event as any);
      const orgId = parsedEvent?.args[0];

      // Update organization state
      await control.connect(creator).updateOrganizationState(orgId, 2); // Locked

      const updatedOrg = await control.getOrganization(orgId);
      expect(updatedOrg.state).to.equal(2); // Locked
    });

    it("Should prevent non-creator from updating organization state", async function () {
      // Create organization
      const orgTx = await control.connect(creator).createOrganization(
        "Test DAO",
        "ipfs://test-metadata",
        0, 0, 0, 100, 0, 0
      );

      const receipt = await orgTx.wait();
      const event = receipt?.logs.find(log =>
        control.interface.parseLog(log as any)?.name === "OrganizationCreated"
      );
      const parsedEvent = control.interface.parseLog(event as any);
      const orgId = parsedEvent?.args[0];

      // Try to update from non-creator account
      await expect(
        control.connect(member1).updateOrganizationState(orgId, 2)
      ).to.be.revertedWith("Not organization creator");
    });
  });

  describe("Member Management", function () {
    let orgId: string;

    beforeEach(async function () {
      // Create a test organization for member tests
      const orgTx = await control.connect(creator).createOrganization(
        "Test DAO",
        "ipfs://test-metadata",
        2, // DAO
        0, // Open access
        0, // No fees
        5, // Member limit of 5
        0, // No membership fee
        0  // No GAME stake required
      );

      const receipt = await orgTx.wait();
      const event = receipt?.logs.find(log =>
        control.interface.parseLog(log as any)?.name === "OrganizationCreated"
      );
      const parsedEvent = control.interface.parseLog(event as any);
      orgId = parsedEvent?.args[0];
    });

    it("Should add member to open access organization", async function () {
      await control.connect(member1).addMember(orgId, member1.address);

      expect(await control.isMemberActive(orgId, member1.address)).to.be.true;
      expect(await control.getMemberCount(orgId)).to.equal(2); // Creator + new member

      const memberData = await control.getMember(orgId, member1.address);
      expect(memberData.state).to.equal(1); // Active
      expect(memberData.joinedAt).to.be.gt(0);
    });

    it("Should allow creator to add members", async function () {
      await control.connect(creator).addMember(orgId, member1.address);

      expect(await control.isMemberActive(orgId, member1.address)).to.be.true;
      expect(await control.getMemberCount(orgId)).to.equal(2); // Creator + new member

      const memberData = await control.getMember(orgId, member1.address);
      expect(memberData.state).to.equal(1); // Active
      expect(memberData.joinedAt).to.be.gt(0);
    });

    it("Should remove member from organization", async function () {
      // Add member first
      await control.connect(member1).addMember(orgId, member1.address);
      expect(await control.isMember(orgId, member1.address)).to.be.true;

      // Remove member
      await control.connect(creator).removeMember(orgId, member1.address);
      expect(await control.isMember(orgId, member1.address)).to.be.false;
      expect(await control.getMemberCount(orgId)).to.equal(1); // Only creator left
    });

    it("Should allow member to remove themselves", async function () {
      // Add member first
      await control.connect(member1).addMember(orgId, member1.address);
      expect(await control.isMember(orgId, member1.address)).to.be.true;

      // Member removes themselves
      await control.connect(member1).removeMember(orgId, member1.address);
      expect(await control.isMember(orgId, member1.address)).to.be.false;
      expect(await control.getMemberCount(orgId)).to.equal(1); // Only creator left
    });

    it("Should prevent non-authorized from removing members", async function () {
      // Add member first
      await control.connect(member1).addMember(orgId, member1.address);
      expect(await control.isMember(orgId, member1.address)).to.be.true;

      // Try to remove from non-authorized account
      await expect(
        control.connect(member2).removeMember(orgId, member1.address)
      ).to.be.revertedWith("Not authorized to remove member");
    });

    it("Should update member state", async function () {
      // Add member first
      await control.connect(member1).addMember(orgId, member1.address);
      expect(await control.isMemberActive(orgId, member1.address)).to.be.true;

      // Update member state to Paused
      await control.connect(creator).updateMemberState(orgId, member1.address, 2); // Paused

      const memberData = await control.getMember(orgId, member1.address);
      expect(memberData.state).to.equal(2); // Paused
      expect(await control.isMemberActive(orgId, member1.address)).to.be.false;
    });

    it("Should get organization members", async function () {
      // Add some members
      await control.connect(member1).addMember(orgId, member1.address);
      await control.connect(member2).addMember(orgId, member2.address);

      const members = await control.getMembers(orgId);
      expect(members.length).to.equal(3); // Creator + 2 new members
      expect(members).to.include(creator.address);
      expect(members).to.include(member1.address);
      expect(members).to.include(member2.address);
    });

    it("Should enforce member limit", async function () {
      // Add members up to limit (5 total, creator is 1)
      await control.connect(member1).addMember(orgId, member1.address);
      await control.connect(member2).addMember(orgId, member2.address);
      await control.connect(nonMember).addMember(orgId, nonMember.address);

      // Get the 5th signer to reach the limit
      const [,,,,, fifthMember] = await ethers.getSigners();
      await control.connect(fifthMember).addMember(orgId, fifthMember.address);

      // Try to add one more (should fail)
      const [,,,,,, sixthMember] = await ethers.getSigners();
      await expect(
        control.connect(sixthMember).addMember(orgId, sixthMember.address)
      ).to.be.revertedWith("Member limit reached");
    });
  });

  describe("View Functions", function () {
    it("Should get organization count", async function () {
      expect(await control.getOrganizationCount()).to.equal(0);

      // Create organization
      await control.connect(creator).createOrganization(
        "Test DAO", "ipfs://test-metadata", 0, 0, 0, 100, 0, 0
      );

      expect(await control.getOrganizationCount()).to.equal(1);
    });

    it("Should get all organizations", async function () {
      // Create two organizations
      await control.connect(creator).createOrganization(
        "Test DAO 1", "ipfs://test-metadata-1", 0, 0, 0, 100, 0, 0
      );
      await control.connect(member1).createOrganization(
        "Test DAO 2", "ipfs://test-metadata-2", 1, 1, 0, 50, 0, 0
      );

      const orgs = await control.getAllOrganizations();
      expect(orgs.length).to.equal(2);
      expect(orgs[0].name).to.equal("Test DAO 1");
      expect(orgs[1].name).to.equal("Test DAO 2");
    });

    it("Should get organizations by state", async function () {
      // Create organization
      const orgTx = await control.connect(creator).createOrganization(
        "Test DAO", "ipfs://test-metadata", 0, 0, 0, 100, 0, 0
      );

      const receipt = await orgTx.wait();
      const event = receipt?.logs.find(log =>
        control.interface.parseLog(log as any)?.name === "OrganizationCreated"
      );
      const parsedEvent = control.interface.parseLog(event as any);
      const orgId = parsedEvent?.args[0];

      // Get active organizations
      const activeOrgs = await control.getOrganizationsByState(1); // Active
      expect(activeOrgs.length).to.equal(1);
      expect(activeOrgs[0].name).to.equal("Test DAO");

      // Update state to Locked
      await control.connect(creator).updateOrganizationState(orgId, 2); // Locked

      // Check state distribution
      const activeOrgsAfter = await control.getOrganizationsByState(1); // Active
      const lockedOrgs = await control.getOrganizationsByState(2); // Locked
      expect(activeOrgsAfter.length).to.equal(0);
      expect(lockedOrgs.length).to.equal(1);
    });

    it("Should check if organization is active", async function () {
      // Create organization
      const orgTx = await control.connect(creator).createOrganization(
        "Test DAO", "ipfs://test-metadata", 0, 0, 0, 100, 0, 0
      );

      const receipt = await orgTx.wait();
      const event = receipt?.logs.find(log =>
        control.interface.parseLog(log as any)?.name === "OrganizationCreated"
      );
      const parsedEvent = control.interface.parseLog(event as any);
      const orgId = parsedEvent?.args[0];

      expect(await control.isOrganizationActive(orgId)).to.be.true;

      // Update state to Locked
      await control.connect(creator).updateOrganizationState(orgId, 2); // Locked
      expect(await control.isOrganizationActive(orgId)).to.be.false;
    });
  });

  describe("Edge Cases", function () {
    it("Should handle empty organization name", async function () {
      await expect(
        control.connect(creator).createOrganization(
          "", "ipfs://test-metadata", 0, 0, 0, 100, 0, 0
        )
      ).to.be.revertedWith("Organization name cannot be empty");
    });

    it("Should handle non-existent organization queries", async function () {
      const fakeOrgId = "0x1234567890123456"; // Random bytes8

      await expect(
        control.getOrganization(fakeOrgId)
      ).to.be.revertedWith("Organization does not exist");

      expect(await control.isOrganizationActive(fakeOrgId)).to.be.false;
      expect(await control.getMemberCount(fakeOrgId)).to.be.revertedWith("Organization does not exist");
    });
  });
});
