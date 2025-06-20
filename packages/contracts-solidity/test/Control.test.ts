import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
// import { GameDAORegistry, Control, Treasury } from "../typechain-types";

describe("Control Module", function () {
  let registry: GameDAORegistry;
  let control: Control;
  let admin: SignerWithAddress;
  let creator: SignerWithAddress;
  let member1: SignerWithAddress;
  let member2: SignerWithAddress;
  let nonMember: SignerWithAddress;

  const MODULE_ID = ethers.keccak256(ethers.toUtf8Bytes("CONTROL"));

  beforeEach(async function () {
    [admin, creator, member1, member2, nonMember] = await ethers.getSigners();

    // Deploy Registry
    const GameDAORegistryFactory = await ethers.getContractFactory("GameDAORegistry");
    registry = await GameDAORegistryFactory.deploy(admin.address);
    await registry.waitForDeployment();

    // Deploy Control Module
    const ControlFactory = await ethers.getContractFactory("Control");
    control = await ControlFactory.deploy();
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
      expect(org.prime).to.equal(creator.address);
      expect(org.orgType).to.equal(0);
      expect(org.accessModel).to.equal(0);
      expect(org.memberLimit).to.equal(100);

      // Verify creator is added as member
      expect(await control.isMemberActive(orgId, creator.address)).to.be.true;
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

      const treasuryAddress = await control.getTreasuryAddress(orgId);
      expect(treasuryAddress).to.not.equal(ethers.ZeroAddress);

      // Verify treasury is properly initialized
      const Treasury = await ethers.getContractFactory("Treasury");
      const treasury = Treasury.attach(treasuryAddress) as Treasury;

      expect(await treasury.organizationId()).to.equal(orgId);
      expect(await treasury.controlModule()).to.equal(await control.getAddress());
    });

    it("Should update organization settings", async function () {
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

      // Update organization
      await control.connect(creator).updateOrganization(
        orgId,
        ethers.ZeroAddress, // Keep same prime
        2, // Change to DAO
        1, // Change to Voting access
        200, // New member limit
        1, // Change to Reserve fee model
        ethers.parseEther("10") // Set membership fee
      );

      const updatedOrg = await control.getOrganization(orgId);
      expect(updatedOrg.orgType).to.equal(2);
      expect(updatedOrg.accessModel).to.equal(1);
      expect(updatedOrg.memberLimit).to.equal(200);
      expect(updatedOrg.feeModel).to.equal(1);
      expect(updatedOrg.membershipFee).to.equal(ethers.parseEther("10"));
    });

    it("Should prevent non-prime from updating organization", async function () {
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

      // Try to update from non-prime account
      await expect(
        control.connect(member1).updateOrganization(
          orgId, ethers.ZeroAddress, 2, 1, 200, 1, ethers.parseEther("10")
        )
      ).to.be.revertedWithCustomError(control, "UnauthorizedAccess");
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

    it("Should handle voting access model correctly", async function () {
      // Update to voting access model
      await control.connect(creator).updateOrganization(
        orgId, ethers.ZeroAddress, 2, 1, 5, 0, 0 // Voting access
      );

      // Add member - should be pending
      await control.connect(member1).addMember(orgId, member1.address);

      const memberData = await control.getMember(orgId, member1.address);
      expect(memberData.state).to.equal(2); // Pending

      // Prime can approve member
      await control.connect(creator).updateMemberState(orgId, member1.address, 1); // Active

      expect(await control.isMemberActive(orgId, member1.address)).to.be.true;
    });

    it("Should enforce member limits", async function () {
      // Add members up to limit (4 more since creator is already a member)
      for (let i = 0; i < 4; i++) {
        const signer = await ethers.getSigner(i + 2); // Skip admin and creator
        await control.connect(signer).addMember(orgId, signer.address);
      }

      expect(await control.getMemberCount(orgId)).to.equal(5);

      // Try to add one more - should fail
      await expect(
        control.connect(nonMember).addMember(orgId, nonMember.address)
      ).to.be.revertedWithCustomError(control, "MemberLimitReached");
    });

    it("Should remove member successfully", async function () {
      // Add member
      await control.connect(member1).addMember(orgId, member1.address);
      expect(await control.getMemberCount(orgId)).to.equal(2);

      // Remove member (prime can remove)
      await control.connect(creator).removeMember(orgId, member1.address);

      expect(await control.getMemberCount(orgId)).to.equal(1);
      expect(await control.isMemberActive(orgId, member1.address)).to.be.false;
    });

    it("Should allow member to remove themselves", async function () {
      // Add member
      await control.connect(member1).addMember(orgId, member1.address);
      expect(await control.getMemberCount(orgId)).to.equal(2);

      // Member removes themselves
      await control.connect(member1).removeMember(orgId, member1.address);

      expect(await control.getMemberCount(orgId)).to.equal(1);
      expect(await control.isMemberActive(orgId, member1.address)).to.be.false;
    });

    it("Should prevent unauthorized member removal", async function () {
      // Add member
      await control.connect(member1).addMember(orgId, member1.address);

      // Try to remove from non-authorized account
      await expect(
        control.connect(member2).removeMember(orgId, member1.address)
      ).to.be.revertedWithCustomError(control, "UnauthorizedAccess");
    });
  });

  describe("View Functions", function () {
    let orgId: string;

    beforeEach(async function () {
      const orgTx = await control.connect(creator).createOrganization(
        "Test DAO", "ipfs://test-metadata", 2, 0, 0, 100, 0, 0
      );
      const receipt = await orgTx.wait();
      const event = receipt?.logs.find(log =>
        control.interface.parseLog(log as any)?.name === "OrganizationCreated"
      );
      const parsedEvent = control.interface.parseLog(event as any);
      orgId = parsedEvent?.args[0];
    });

    it("Should return correct organization count", async function () {
      expect(await control.getOrganizationCount()).to.equal(1);

      // Create another organization
      await control.connect(member1).createOrganization(
        "Another DAO", "ipfs://metadata", 1, 0, 0, 50, 0, 0
      );

      expect(await control.getOrganizationCount()).to.equal(2);
    });

    it("Should check join eligibility correctly", async function () {
      expect(await control.canJoinOrganization(orgId, member1.address)).to.be.true;
      expect(await control.canJoinOrganization(orgId, creator.address)).to.be.false; // Already member

      // Add member
      await control.connect(member1).addMember(orgId, member1.address);
      expect(await control.canJoinOrganization(orgId, member1.address)).to.be.false; // Now a member
    });

    it("Should return organization members list", async function () {
      // Add some members
      await control.connect(member1).addMember(orgId, member1.address);
      await control.connect(member2).addMember(orgId, member2.address);

      const members = await control.getOrganizationMembers(orgId);
      expect(members.length).to.equal(3); // Creator + 2 members
      expect(members).to.include(creator.address);
      expect(members).to.include(member1.address);
      expect(members).to.include(member2.address);
    });
  });

  describe("Access Control", function () {
    it("Should set organization state with admin role", async function () {
      const orgTx = await control.connect(creator).createOrganization(
        "Test DAO", "ipfs://test-metadata", 2, 0, 0, 100, 0, 0
      );
      const receipt = await orgTx.wait();
      const event = receipt?.logs.find(log =>
        control.interface.parseLog(log as any)?.name === "OrganizationCreated"
      );
      const parsedEvent = control.interface.parseLog(event as any);
      const orgId = parsedEvent?.args[0];

      // Admin can change state
      await control.connect(admin).setOrganizationState(orgId, 2); // Locked

      expect(await control.isOrganizationActive(orgId)).to.be.false;
    });

    it("Should prevent non-admin from changing organization state", async function () {
      const orgTx = await control.connect(creator).createOrganization(
        "Test DAO", "ipfs://test-metadata", 2, 0, 0, 100, 0, 0
      );
      const receipt = await orgTx.wait();
      const event = receipt?.logs.find(log =>
        control.interface.parseLog(log as any)?.name === "OrganizationCreated"
      );
      const parsedEvent = control.interface.parseLog(event as any);
      const orgId = parsedEvent?.args[0];

      await expect(
        control.connect(creator).setOrganizationState(orgId, 2)
      ).to.be.revertedWithCustomError(control, "AccessControlUnauthorizedAccount");
    });
  });

  describe("Edge Cases", function () {
    it("Should handle empty organization name", async function () {
      await expect(
        control.connect(creator).createOrganization(
          "", "ipfs://test-metadata", 0, 0, 0, 100, 0, 0
        )
      ).to.be.revertedWithCustomError(control, "InvalidParameters");
    });

    it("Should handle non-existent organization queries", async function () {
      const fakeOrgId = ethers.keccak256(ethers.toUtf8Bytes("fake"));

      const org = await control.getOrganization(fakeOrgId);
      expect(org.creator).to.equal(ethers.ZeroAddress);

      expect(await control.isOrganizationActive(fakeOrgId)).to.be.false;
      expect(await control.getMemberCount(fakeOrgId)).to.equal(0);
      expect(await control.canJoinOrganization(fakeOrgId, member1.address)).to.be.false;
    });
  });
});
