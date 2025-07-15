import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import {
  GameDAOMembership,
  Identity,
  Control,
  MockGameToken,
  GameStaking
} from "../typechain-types";

describe("GameDAOMembership", function () {
  let membership: GameDAOMembership;
  let identity: Identity;
  let control: Control;
  let gameToken: MockGameToken;
  let gameStaking: GameStaking;

  let owner: SignerWithAddress;
  let admin: SignerWithAddress;
  let creator: SignerWithAddress;
  let member1: SignerWithAddress;
  let member2: SignerWithAddress;
  let member3: SignerWithAddress;
  let nonMember: SignerWithAddress;

  let testOrgId: string;
  let testProfileId: string;

  const MEMBERSHIP_ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MEMBERSHIP_ADMIN_ROLE"));
  const ORGANIZATION_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ORGANIZATION_MANAGER_ROLE"));
  const REPUTATION_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("REPUTATION_MANAGER_ROLE"));

  beforeEach(async function () {
    [owner, admin, creator, member1, member2, member3, nonMember] = await ethers.getSigners();

    // Deploy Game Token
    const GameTokenFactory = await ethers.getContractFactory("MockGameToken");
    gameToken = await GameTokenFactory.deploy();
    await gameToken.waitForDeployment();

    // Deploy GameStaking
    const GameStakingFactory = await ethers.getContractFactory("GameStaking");
    gameStaking = await GameStakingFactory.deploy(
      await gameToken.getAddress(),
      owner.address,
      500 // 5% protocol fee
    );
    await gameStaking.waitForDeployment();

    // Deploy Identity contract
    const IdentityFactory = await ethers.getContractFactory("Identity");
    identity = await IdentityFactory.deploy();
    await identity.waitForDeployment();

    // Deploy Control contract (placeholder for now)
    const ControlFactory = await ethers.getContractFactory("Control");
    control = await ControlFactory.deploy(
      await gameToken.getAddress(),
      await gameStaking.getAddress()
    );
    await control.waitForDeployment();

    // Deploy GameDAOMembership contract
    const MembershipFactory = await ethers.getContractFactory("GameDAOMembership");
    membership = await MembershipFactory.deploy(
      await identity.getAddress(),
      await control.getAddress(),
      await gameToken.getAddress()
    );
    await membership.waitForDeployment();

    // Grant necessary roles
    await membership.grantRole(ORGANIZATION_MANAGER_ROLE, admin.address);
    await membership.grantRole(REPUTATION_MANAGER_ROLE, admin.address);

    // Create test organization
    testOrgId = "0x4F52473031320000"; // "ORG0012" in bytes8
    await membership.connect(admin).setOrganizationActive(testOrgId, true);

    // Create test profile (mock)
    testProfileId = "0x5553523031320000"; // "USR0012" in bytes8
  });

  describe("Deployment", function () {
    it("Should deploy with correct initial state", async function () {
      expect(await membership.identityContract()).to.equal(await identity.getAddress());
      expect(await membership.controlContract()).to.equal(await control.getAddress());
      expect(await membership.gameToken()).to.equal(await gameToken.getAddress());
    });

    it("Should grant correct roles to deployer", async function () {
      expect(await membership.hasRole(await membership.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.true;
      expect(await membership.hasRole(MEMBERSHIP_ADMIN_ROLE, owner.address)).to.be.true;
    });
  });

  describe("Organization Management", function () {
    it("Should set organization as active", async function () {
      const newOrgId = "0x4F52473031330000"; // "ORG0013"

      await membership.connect(admin).setOrganizationActive(newOrgId, true);

      expect(await membership.getOrganizationExists(newOrgId)).to.be.true;
    });

    it("Should initialize membership stats for new organization", async function () {
      const newOrgId = "0x4F52473031330000"; // "ORG0013"

      await membership.connect(admin).setOrganizationActive(newOrgId, true);

      const stats = await membership.getMembershipStats(newOrgId);
      expect(stats.totalMembers).to.equal(0);
      expect(stats.activeMembers).to.equal(0);
      expect(stats.totalVotingPower).to.equal(0);
      expect(stats.averageReputation).to.equal(1000);
    });

    it("Should revert if non-admin tries to set organization active", async function () {
      const newOrgId = "0x4F52473031330000"; // "ORG0013"

      await expect(
        membership.connect(nonMember).setOrganizationActive(newOrgId, true)
      ).to.be.revertedWith("AccessControl");
    });
  });

  describe("Member Management", function () {
    it("Should add a member successfully", async function () {
      await membership.connect(admin).addMember(
        testOrgId,
        member1.address,
        testProfileId,
        0, // MembershipTier.Basic
        ethers.parseEther("100")
      );

      expect(await membership.isMember(testOrgId, member1.address)).to.be.true;
      expect(await membership.isActiveMember(testOrgId, member1.address)).to.be.true;
      expect(await membership.getMemberCount(testOrgId)).to.equal(1);
    });

    it("Should emit MemberAdded event", async function () {
      await expect(
        membership.connect(admin).addMember(
          testOrgId,
          member1.address,
          testProfileId,
          0, // MembershipTier.Basic
          ethers.parseEther("100")
        )
      ).to.emit(membership, "MemberAdded")
        .withArgs(testOrgId, member1.address, testProfileId, 0, ethers.parseEther("100"));
    });

    it("Should prevent adding duplicate members", async function () {
      await membership.connect(admin).addMember(
        testOrgId,
        member1.address,
        testProfileId,
        0, // MembershipTier.Basic
        ethers.parseEther("100")
      );

      await expect(
        membership.connect(admin).addMember(
          testOrgId,
          member1.address,
          testProfileId,
          0, // MembershipTier.Basic
          ethers.parseEther("100")
        )
      ).to.be.revertedWith("Already a member");
    });

    it("Should remove a member successfully", async function () {
      // Add member first
      await membership.connect(admin).addMember(
        testOrgId,
        member1.address,
        testProfileId,
        0, // MembershipTier.Basic
        ethers.parseEther("100")
      );

      // Remove member
      await membership.connect(admin).removeMember(testOrgId, member1.address);

      expect(await membership.isMember(testOrgId, member1.address)).to.be.false;
      expect(await membership.getMemberCount(testOrgId)).to.equal(0);
    });

    it("Should emit MemberRemoved event", async function () {
      // Add member first
      await membership.connect(admin).addMember(
        testOrgId,
        member1.address,
        testProfileId,
        0, // MembershipTier.Basic
        ethers.parseEther("100")
      );

      await expect(
        membership.connect(admin).removeMember(testOrgId, member1.address)
      ).to.emit(membership, "MemberRemoved")
        .withArgs(testOrgId, member1.address, testProfileId);
    });

    it("Should update member state", async function () {
      // Add member first
      await membership.connect(admin).addMember(
        testOrgId,
        member1.address,
        testProfileId,
        0, // MembershipTier.Basic
        ethers.parseEther("100")
      );

      // Update to paused state
      await membership.connect(admin).updateMemberState(
        testOrgId,
        member1.address,
        2 // MemberState.Paused
      );

      expect(await membership.getMemberState(testOrgId, member1.address)).to.equal(2);
      expect(await membership.isActiveMember(testOrgId, member1.address)).to.be.false;
    });

    it("Should update member tier", async function () {
      // Add member first
      await membership.connect(admin).addMember(
        testOrgId,
        member1.address,
        testProfileId,
        0, // MembershipTier.Basic
        ethers.parseEther("100")
      );

      // Update to VIP tier
      await membership.connect(admin).updateMemberTier(
        testOrgId,
        member1.address,
        2 // MembershipTier.VIP
      );

      expect(await membership.getMemberTier(testOrgId, member1.address)).to.equal(2);

      // Check that voting power was updated
      expect(await membership.getVotingPower(testOrgId, member1.address)).to.equal(5);
    });
  });

  describe("Batch Operations", function () {
    beforeEach(async function () {
      // Add multiple members
      await membership.connect(admin).addMember(
        testOrgId,
        member1.address,
        testProfileId,
        0, // MembershipTier.Basic
        ethers.parseEther("100")
      );

      await membership.connect(admin).addMember(
        testOrgId,
        member2.address,
        testProfileId,
        1, // MembershipTier.Premium
        ethers.parseEther("200")
      );
    });

    it("Should check membership for multiple organizations", async function () {
      const orgId2 = "0x4F52473031340000"; // "ORG0014"
      await membership.connect(admin).setOrganizationActive(orgId2, true);

      const results = await membership.isMemberBatch(
        [testOrgId, orgId2],
        member1.address
      );

      expect(results[0]).to.be.true;  // Member of testOrgId
      expect(results[1]).to.be.false; // Not member of orgId2
    });

    it("Should get member data for multiple organizations", async function () {
      const orgId2 = "0x4F52473031340000"; // "ORG0014"
      await membership.connect(admin).setOrganizationActive(orgId2, true);

      const results = await membership.getMemberBatch(
        [testOrgId, orgId2],
        member1.address
      );

      expect(results[0].account).to.equal(member1.address);
      expect(results[1].account).to.equal(ethers.ZeroAddress); // Not a member
    });

    it("Should get member counts for multiple organizations", async function () {
      const orgId2 = "0x4F52473031340000"; // "ORG0014"
      await membership.connect(admin).setOrganizationActive(orgId2, true);

      const results = await membership.getMemberCountBatch([testOrgId, orgId2]);

      expect(results[0]).to.equal(2); // testOrgId has 2 members
      expect(results[1]).to.equal(0); // orgId2 has 0 members
    });
  });

  describe("Voting Power Management", function () {
    beforeEach(async function () {
      // Add members with different tiers
      await membership.connect(admin).addMember(
        testOrgId,
        member1.address,
        testProfileId,
        0, // MembershipTier.Basic
        ethers.parseEther("100")
      );

      await membership.connect(admin).addMember(
        testOrgId,
        member2.address,
        testProfileId,
        2, // MembershipTier.VIP
        ethers.parseEther("500")
      );
    });

    it("Should have correct initial voting power based on tier", async function () {
      expect(await membership.getVotingPower(testOrgId, member1.address)).to.equal(1); // Basic tier
      expect(await membership.getVotingPower(testOrgId, member2.address)).to.equal(5); // VIP tier
    });

    it("Should update voting power", async function () {
      await membership.connect(admin).updateVotingPower(
        testOrgId,
        member1.address,
        10
      );

      expect(await membership.getVotingPower(testOrgId, member1.address)).to.equal(10);
    });

    it("Should delegate voting power", async function () {
      await membership.connect(member2).delegateVotingPower(
        testOrgId,
        member1.address,
        2
      );

      expect(await membership.getVotingPower(testOrgId, member1.address)).to.equal(3); // 1 + 2 delegated
      expect(await membership.getVotingPower(testOrgId, member2.address)).to.equal(3); // 5 - 2 delegated
      expect(await membership.getDelegatedVotingPower(testOrgId, member1.address)).to.equal(2);
    });

    it("Should undelegate voting power", async function () {
      // Delegate first
      await membership.connect(member2).delegateVotingPower(
        testOrgId,
        member1.address,
        2
      );

      // Then undelegate
      await membership.connect(member2).undelegateVotingPower(
        testOrgId,
        member1.address,
        1
      );

      expect(await membership.getVotingPower(testOrgId, member1.address)).to.equal(2); // 1 + 1 remaining
      expect(await membership.getVotingPower(testOrgId, member2.address)).to.equal(4); // 5 - 1 remaining
    });

    it("Should emit VotingPowerDelegated event", async function () {
      await expect(
        membership.connect(member2).delegateVotingPower(
          testOrgId,
          member1.address,
          2
        )
      ).to.emit(membership, "VotingPowerDelegated")
        .withArgs(testOrgId, member2.address, member1.address, 2);
    });

    it("Should prevent delegating to self", async function () {
      await expect(
        membership.connect(member1).delegateVotingPower(
          testOrgId,
          member1.address,
          1
        )
      ).to.be.revertedWith("Cannot delegate to self");
    });

    it("Should prevent delegating more than available", async function () {
      await expect(
        membership.connect(member1).delegateVotingPower(
          testOrgId,
          member2.address,
          5 // member1 only has 1 voting power
        )
      ).to.be.revertedWith("Insufficient voting power");
    });
  });

  describe("Reputation Management", function () {
    beforeEach(async function () {
      await membership.connect(admin).addMember(
        testOrgId,
        member1.address,
        testProfileId,
        0, // MembershipTier.Basic
        ethers.parseEther("100")
      );
    });

    it("Should update reputation", async function () {
      await membership.connect(admin).updateReputation(
        testOrgId,
        member1.address,
        1500,
        ethers.keccak256(ethers.toUtf8Bytes("Good contribution"))
      );

      expect(await membership.getReputation(testOrgId, member1.address)).to.equal(1500);
    });

    it("Should emit ReputationUpdated event", async function () {
      await expect(
        membership.connect(admin).updateReputation(
          testOrgId,
          member1.address,
          1500,
          ethers.keccak256(ethers.toUtf8Bytes("Good contribution"))
        )
      ).to.emit(membership, "ReputationUpdated")
        .withArgs(testOrgId, member1.address, 1000, 1500, ethers.keccak256(ethers.toUtf8Bytes("Good contribution")));
    });

    it("Should prevent reputation outside valid range", async function () {
      await expect(
        membership.connect(admin).updateReputation(
          testOrgId,
          member1.address,
          15000, // Above MAX_REPUTATION (10000)
          ethers.keccak256(ethers.toUtf8Bytes("Too high"))
        )
      ).to.be.revertedWith("Invalid reputation value");
    });

    it("Should calculate average reputation", async function () {
      // Add another member
      await membership.connect(admin).addMember(
        testOrgId,
        member2.address,
        testProfileId,
        0, // MembershipTier.Basic
        ethers.parseEther("100")
      );

      // Update reputations
      await membership.connect(admin).updateReputation(
        testOrgId,
        member1.address,
        1500,
        ethers.keccak256(ethers.toUtf8Bytes("Good"))
      );

      await membership.connect(admin).updateReputation(
        testOrgId,
        member2.address,
        2000,
        ethers.keccak256(ethers.toUtf8Bytes("Great"))
      );

      // Average should be (1500 + 2000) / 2 = 1750
      expect(await membership.getAverageReputation(testOrgId)).to.equal(1750);
    });
  });

  describe("Permission Checks", function () {
    beforeEach(async function () {
      await membership.connect(admin).addMember(
        testOrgId,
        member1.address,
        testProfileId,
        0, // MembershipTier.Basic
        ethers.parseEther("100")
      );

      await membership.connect(admin).addMember(
        testOrgId,
        member2.address,
        testProfileId,
        2, // MembershipTier.VIP
        ethers.parseEther("500")
      );
    });

    it("Should check voting permissions", async function () {
      expect(await membership.canVote(testOrgId, member1.address)).to.be.true;
      expect(await membership.canVote(testOrgId, nonMember.address)).to.be.false;
    });

    it("Should check proposal permissions", async function () {
      expect(await membership.canPropose(testOrgId, member1.address)).to.be.true;
      expect(await membership.canPropose(testOrgId, nonMember.address)).to.be.false;
    });

    it("Should check member management permissions", async function () {
      expect(await membership.canManageMembers(testOrgId, member1.address)).to.be.false; // Basic tier
      expect(await membership.canManageMembers(testOrgId, member2.address)).to.be.true;  // VIP tier
    });

    it("Should update permissions when member state changes", async function () {
      // Pause member
      await membership.connect(admin).updateMemberState(
        testOrgId,
        member1.address,
        2 // MemberState.Paused
      );

      expect(await membership.canVote(testOrgId, member1.address)).to.be.false;
      expect(await membership.canPropose(testOrgId, member1.address)).to.be.false;
    });
  });

  describe("Organization Integration", function () {
    beforeEach(async function () {
      await membership.connect(admin).addMember(
        testOrgId,
        member1.address,
        testProfileId,
        0, // MembershipTier.Basic
        ethers.parseEther("100")
      );
    });

    it("Should get member organizations", async function () {
      const orgId2 = "0x4F52473031340000"; // "ORG0014"
      await membership.connect(admin).setOrganizationActive(orgId2, true);
      await membership.connect(admin).addMember(
        orgId2,
        member1.address,
        testProfileId,
        0, // MembershipTier.Basic
        ethers.parseEther("100")
      );

      const organizations = await membership.getMemberOrganizations(member1.address);
      expect(organizations.length).to.equal(2);
      expect(organizations).to.include(testOrgId);
      expect(organizations).to.include(orgId2);
    });

    it("Should get profile memberships", async function () {
      const organizations = await membership.getProfileMemberships(testProfileId);
      expect(organizations.length).to.equal(1);
      expect(organizations[0]).to.equal(testOrgId);
    });
  });

  describe("Admin Functions", function () {
    beforeEach(async function () {
      await membership.connect(admin).addMember(
        testOrgId,
        member1.address,
        testProfileId,
        0, // MembershipTier.Basic
        ethers.parseEther("100")
      );
    });

    it("Should emergency remove member", async function () {
      await membership.connect(owner).emergencyRemoveMember(
        testOrgId,
        member1.address,
        ethers.keccak256(ethers.toUtf8Bytes("Emergency removal"))
      );

      expect(await membership.isMember(testOrgId, member1.address)).to.be.false;
    });

    it("Should bulk update member states", async function () {
      // Add another member
      await membership.connect(admin).addMember(
        testOrgId,
        member2.address,
        testProfileId,
        0, // MembershipTier.Basic
        ethers.parseEther("100")
      );

      await membership.connect(admin).bulkUpdateMemberStates(
        testOrgId,
        [member1.address, member2.address],
        [2, 2] // MemberState.Paused
      );

      expect(await membership.getMemberState(testOrgId, member1.address)).to.equal(2);
      expect(await membership.getMemberState(testOrgId, member2.address)).to.equal(2);
    });

    it("Should pause and unpause contract", async function () {
      await membership.connect(owner).pause();
      expect(await membership.paused()).to.be.true;

      await expect(
        membership.connect(admin).addMember(
          testOrgId,
          member2.address,
          testProfileId,
          0, // MembershipTier.Basic
          ethers.parseEther("100")
        )
      ).to.be.revertedWith("Pausable: paused");

      await membership.connect(owner).unpause();
      expect(await membership.paused()).to.be.false;
    });
  });

  describe("Membership Statistics", function () {
    it("Should update membership statistics correctly", async function () {
      // Add members
      await membership.connect(admin).addMember(
        testOrgId,
        member1.address,
        testProfileId,
        0, // MembershipTier.Basic
        ethers.parseEther("100")
      );

      await membership.connect(admin).addMember(
        testOrgId,
        member2.address,
        testProfileId,
        2, // MembershipTier.VIP
        ethers.parseEther("500")
      );

      // Pause one member
      await membership.connect(admin).updateMemberState(
        testOrgId,
        member2.address,
        2 // MemberState.Paused
      );

      const stats = await membership.getMembershipStats(testOrgId);
      expect(stats.totalMembers).to.equal(2);
      expect(stats.activeMembers).to.equal(1); // Only member1 is active
      expect(stats.totalVotingPower).to.equal(1); // Only member1's voting power counts
    });
  });
});
