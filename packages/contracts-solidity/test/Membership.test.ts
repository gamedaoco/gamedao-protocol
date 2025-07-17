import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { Registry, Control, Membership, MockGameToken } from "../typechain-types";

describe("Membership Module", function () {
  let registry: Registry;
  let control: Control;
  let membership: Membership;
  let gameToken: MockGameToken;

  let admin: SignerWithAddress;
  let creator: SignerWithAddress;
  let member1: SignerWithAddress;
  let member2: SignerWithAddress;
  let member3: SignerWithAddress;
  let nonMember: SignerWithAddress;

  const testOrgId = "0x544553544f524700"; // "TESTORG" as bytes8
  const ORGANIZATION_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ORGANIZATION_MANAGER_ROLE"));

  beforeEach(async function () {
    [admin, creator, member1, member2, member3, nonMember] = await ethers.getSigners();

    // Deploy Game Token
    const GameTokenFactory = await ethers.getContractFactory("MockGameToken");
    gameToken = await GameTokenFactory.deploy();
    await gameToken.waitForDeployment();

    // Deploy Registry
    const RegistryFactory = await ethers.getContractFactory("Registry");
    registry = await RegistryFactory.deploy(admin.address);
    await registry.waitForDeployment();

    // Deploy Control (simplified for testing)
    const ControlFactory = await ethers.getContractFactory("Control");
    control = await ControlFactory.deploy(
      await gameToken.getAddress(),
      ethers.ZeroAddress // simplified staking for testing
    );
    await control.waitForDeployment();

    // Deploy Membership
    const MembershipFactory = await ethers.getContractFactory("Membership");
    membership = await MembershipFactory.deploy();
    await membership.waitForDeployment();

    // Register modules
    await registry.registerModule(await control.getAddress());
    await registry.registerModule(await membership.getAddress());

    // Initialize Membership
    await membership.initialize(await registry.getAddress());
    await membership.setGameToken(await gameToken.getAddress());
    await membership.setControlContract(await control.getAddress());

    // Grant necessary roles
    await membership.grantRole(ORGANIZATION_MANAGER_ROLE, admin.address);
    await membership.grantRole(ORGANIZATION_MANAGER_ROLE, creator.address);

    // Transfer tokens to test accounts
    const transferAmount = ethers.parseEther("10000");
    await gameToken.transfer(member1.address, transferAmount);
    await gameToken.transfer(member2.address, transferAmount);
    await gameToken.transfer(member3.address, transferAmount);
  });

  describe("Deployment and Initialization", function () {
    it("Should deploy Membership correctly", async function () {
      expect(await membership.getAddress()).to.be.properAddress;
      expect(await membership.registry()).to.equal(await registry.getAddress());
      expect(await membership.gameToken()).to.equal(await gameToken.getAddress());
    });

    it("Should have correct module ID", async function () {
      expect(await membership.moduleId()).to.equal(ethers.keccak256(ethers.toUtf8Bytes("MEMBERSHIP")));
    });

    it("Should initialize with correct default values", async function () {
      expect(await membership.isInitialized()).to.be.true;
    });

    it("Should prevent double initialization", async function () {
      await expect(
        membership.initialize(await registry.getAddress())
      ).to.be.revertedWith("Initializable: contract is already initialized");
    });

    it("Should allow admin to set game token", async function () {
      const newToken = await ethers.getContractFactory("MockGameToken");
      const deployedToken = await newToken.deploy();

      await expect(membership.setGameToken(await deployedToken.getAddress()))
        .to.emit(membership, "GameTokenSet")
        .withArgs(await deployedToken.getAddress());
    });

    it("Should prevent non-admin from setting game token", async function () {
      await expect(
        membership.connect(member1).setGameToken(await gameToken.getAddress())
      ).to.be.revertedWith("AccessControl:");
    });
  });

  describe("Organization Management", function () {
    it("Should activate organization successfully", async function () {
      await expect(membership.connect(admin).activateOrganization(testOrgId))
        .to.emit(membership, "OrganizationActivated")
        .withArgs(testOrgId);

      expect(await membership.isOrganizationActive(testOrgId)).to.be.true;
    });

    it("Should deactivate organization successfully", async function () {
      await membership.connect(admin).activateOrganization(testOrgId);

      await expect(membership.connect(admin).deactivateOrganization(testOrgId))
        .to.emit(membership, "OrganizationDeactivated")
        .withArgs(testOrgId);

      expect(await membership.isOrganizationActive(testOrgId)).to.be.false;
    });

    it("Should prevent non-admin from activating organization", async function () {
      await expect(
        membership.connect(member1).activateOrganization(testOrgId)
      ).to.be.revertedWith("AccessControl:");
    });

    it("Should handle organization membership fee", async function () {
      const membershipFee = ethers.parseEther("100");

      await expect(membership.connect(admin).setOrganizationMembershipFee(testOrgId, membershipFee))
        .to.emit(membership, "MembershipFeeSet")
        .withArgs(testOrgId, membershipFee);

      expect(await membership.getOrganizationMembershipFee(testOrgId)).to.equal(membershipFee);
    });
  });

  describe("Member Management", function () {
    beforeEach(async function () {
      // Activate organization for member management
      await membership.connect(admin).activateOrganization(testOrgId);
    });

    it("Should add member successfully", async function () {
      await expect(
        membership.connect(admin).addMember(testOrgId, member1.address, 0) // MembershipTier.STANDARD
      ).to.emit(membership, "MemberAdded")
        .withArgs(testOrgId, member1.address, 0);

      expect(await membership.isMember(testOrgId, member1.address)).to.be.true;
    });

    it("Should remove member successfully", async function () {
      await membership.connect(admin).addMember(testOrgId, member1.address, 0);

      await expect(
        membership.connect(admin).removeMember(testOrgId, member1.address)
      ).to.emit(membership, "MemberRemoved")
        .withArgs(testOrgId, member1.address);

      expect(await membership.isMember(testOrgId, member1.address)).to.be.false;
    });

    it("Should allow member to remove themselves", async function () {
      await membership.connect(admin).addMember(testOrgId, member1.address, 0);

      await expect(
        membership.connect(member1).removeMember(testOrgId, member1.address)
      ).to.emit(membership, "MemberRemoved")
        .withArgs(testOrgId, member1.address);

      expect(await membership.isMember(testOrgId, member1.address)).to.be.false;
    });

    it("Should prevent duplicate member addition", async function () {
      await membership.connect(admin).addMember(testOrgId, member1.address, 0);

      await expect(
        membership.connect(admin).addMember(testOrgId, member1.address, 0)
      ).to.be.revertedWith("Member already exists");
    });

    it("Should prevent removing non-existent member", async function () {
      await expect(
        membership.connect(admin).removeMember(testOrgId, member1.address)
      ).to.be.revertedWith("Member does not exist");
    });

    it("Should prevent non-authorized member removal", async function () {
      await membership.connect(admin).addMember(testOrgId, member1.address, 0);

      await expect(
        membership.connect(member2).removeMember(testOrgId, member1.address)
      ).to.be.revertedWith("Not authorized to remove member");
    });

    it("Should get member details correctly", async function () {
      const tier = 1; // MembershipTier.PREMIUM
      await membership.connect(admin).addMember(testOrgId, member1.address, tier);

      const memberData = await membership.getMember(testOrgId, member1.address);
      expect(memberData.account).to.equal(member1.address);
      expect(memberData.tier).to.equal(tier);
      expect(memberData.joinedAt).to.be.gt(0);
      expect(memberData.isActive).to.be.true;
    });

    it("Should get all members correctly", async function () {
      await membership.connect(admin).addMember(testOrgId, member1.address, 0);
      await membership.connect(admin).addMember(testOrgId, member2.address, 1);
      await membership.connect(admin).addMember(testOrgId, member3.address, 2);

      const members = await membership.getMembers(testOrgId);
      expect(members.length).to.equal(3);
      expect(members).to.include(member1.address);
      expect(members).to.include(member2.address);
      expect(members).to.include(member3.address);
    });

    it("Should get member count correctly", async function () {
      expect(await membership.getMemberCount(testOrgId)).to.equal(0);

      await membership.connect(admin).addMember(testOrgId, member1.address, 0);
      expect(await membership.getMemberCount(testOrgId)).to.equal(1);

      await membership.connect(admin).addMember(testOrgId, member2.address, 0);
      expect(await membership.getMemberCount(testOrgId)).to.equal(2);

      await membership.connect(admin).removeMember(testOrgId, member1.address);
      expect(await membership.getMemberCount(testOrgId)).to.equal(1);
    });
  });

  describe("Membership Tiers", function () {
    beforeEach(async function () {
      await membership.connect(admin).activateOrganization(testOrgId);
    });

    it("Should add members with different tiers", async function () {
      await membership.connect(admin).addMember(testOrgId, member1.address, 0); // STANDARD
      await membership.connect(admin).addMember(testOrgId, member2.address, 1); // PREMIUM
      await membership.connect(admin).addMember(testOrgId, member3.address, 2); // VIP

      const member1Data = await membership.getMember(testOrgId, member1.address);
      const member2Data = await membership.getMember(testOrgId, member2.address);
      const member3Data = await membership.getMember(testOrgId, member3.address);

      expect(member1Data.tier).to.equal(0); // STANDARD
      expect(member2Data.tier).to.equal(1); // PREMIUM
      expect(member3Data.tier).to.equal(2); // VIP
    });

    it("Should update member tier successfully", async function () {
      await membership.connect(admin).addMember(testOrgId, member1.address, 0);

      await expect(
        membership.connect(admin).updateMemberTier(testOrgId, member1.address, 2)
      ).to.emit(membership, "MemberTierUpdated")
        .withArgs(testOrgId, member1.address, 2);

      const memberData = await membership.getMember(testOrgId, member1.address);
      expect(memberData.tier).to.equal(2);
    });

    it("Should prevent updating tier of non-member", async function () {
      await expect(
        membership.connect(admin).updateMemberTier(testOrgId, member1.address, 1)
      ).to.be.revertedWith("Member does not exist");
    });

    it("Should prevent non-authorized tier updates", async function () {
      await membership.connect(admin).addMember(testOrgId, member1.address, 0);

      await expect(
        membership.connect(member2).updateMemberTier(testOrgId, member1.address, 1)
      ).to.be.revertedWith("AccessControl:");
    });
  });

  describe("Voting Power", function () {
    beforeEach(async function () {
      await membership.connect(admin).activateOrganization(testOrgId);
      await membership.connect(admin).addMember(testOrgId, member1.address, 0); // STANDARD
      await membership.connect(admin).addMember(testOrgId, member2.address, 1); // PREMIUM
      await membership.connect(admin).addMember(testOrgId, member3.address, 2); // VIP
    });

    it("Should calculate voting power based on tier", async function () {
      const votingPower1 = await membership.getVotingPower(testOrgId, member1.address);
      const votingPower2 = await membership.getVotingPower(testOrgId, member2.address);
      const votingPower3 = await membership.getVotingPower(testOrgId, member3.address);

      // VIP should have more voting power than PREMIUM, which should have more than STANDARD
      expect(votingPower3).to.be.gt(votingPower2);
      expect(votingPower2).to.be.gt(votingPower1);
    });

    it("Should return zero voting power for non-members", async function () {
      const votingPower = await membership.getVotingPower(testOrgId, nonMember.address);
      expect(votingPower).to.equal(0);
    });

    it("Should calculate total voting power correctly", async function () {
      const totalVotingPower = await membership.getTotalVotingPower(testOrgId);
      const individual1 = await membership.getVotingPower(testOrgId, member1.address);
      const individual2 = await membership.getVotingPower(testOrgId, member2.address);
      const individual3 = await membership.getVotingPower(testOrgId, member3.address);

      expect(totalVotingPower).to.equal(individual1 + individual2 + individual3);
    });

    it("Should update voting power when member tier changes", async function () {
      const initialVotingPower = await membership.getVotingPower(testOrgId, member1.address);

      await membership.connect(admin).updateMemberTier(testOrgId, member1.address, 2); // Upgrade to VIP

      const newVotingPower = await membership.getVotingPower(testOrgId, member1.address);
      expect(newVotingPower).to.be.gt(initialVotingPower);
    });
  });

  describe("Voting Power Delegation", function () {
    beforeEach(async function () {
      await membership.connect(admin).activateOrganization(testOrgId);
      await membership.connect(admin).addMember(testOrgId, member1.address, 0);
      await membership.connect(admin).addMember(testOrgId, member2.address, 0);
    });

    it("Should allow voting power delegation", async function () {
      const delegationAmount = ethers.parseEther("100");

      await expect(
        membership.connect(member1).delegateVotingPower(testOrgId, member2.address, delegationAmount)
      ).to.emit(membership, "VotingPowerDelegated")
        .withArgs(testOrgId, member1.address, member2.address, delegationAmount);
    });

    it("Should allow undelegation of voting power", async function () {
      const delegationAmount = ethers.parseEther("100");
      await membership.connect(member1).delegateVotingPower(testOrgId, member2.address, delegationAmount);

      await expect(
        membership.connect(member1).undelegateVotingPower(testOrgId, member2.address, delegationAmount)
      ).to.emit(membership, "VotingPowerUndelegated")
        .withArgs(testOrgId, member1.address, member2.address, delegationAmount);
    });

    it("Should prevent delegation to non-members", async function () {
      const delegationAmount = ethers.parseEther("100");

      await expect(
        membership.connect(member1).delegateVotingPower(testOrgId, nonMember.address, delegationAmount)
      ).to.be.revertedWith("Delegatee is not a member");
    });

    it("Should prevent self-delegation", async function () {
      const delegationAmount = ethers.parseEther("100");

      await expect(
        membership.connect(member1).delegateVotingPower(testOrgId, member1.address, delegationAmount)
      ).to.be.revertedWith("Cannot delegate to self");
    });

    it("Should track delegated voting power correctly", async function () {
      const delegationAmount = ethers.parseEther("100");
      await membership.connect(member1).delegateVotingPower(testOrgId, member2.address, delegationAmount);

      const delegatedAmount = await membership.getDelegatedVotingPower(testOrgId, member1.address, member2.address);
      expect(delegatedAmount).to.equal(delegationAmount);
    });
  });

  describe("Member Status Management", function () {
    beforeEach(async function () {
      await membership.connect(admin).activateOrganization(testOrgId);
      await membership.connect(admin).addMember(testOrgId, member1.address, 0);
    });

    it("Should suspend member successfully", async function () {
      await expect(
        membership.connect(admin).suspendMember(testOrgId, member1.address)
      ).to.emit(membership, "MemberSuspended")
        .withArgs(testOrgId, member1.address);

      const memberData = await membership.getMember(testOrgId, member1.address);
      expect(memberData.isActive).to.be.false;
    });

    it("Should reactivate suspended member", async function () {
      await membership.connect(admin).suspendMember(testOrgId, member1.address);

      await expect(
        membership.connect(admin).reactivateMember(testOrgId, member1.address)
      ).to.emit(membership, "MemberReactivated")
        .withArgs(testOrgId, member1.address);

      const memberData = await membership.getMember(testOrgId, member1.address);
      expect(memberData.isActive).to.be.true;
    });

    it("Should return zero voting power for suspended members", async function () {
      const initialVotingPower = await membership.getVotingPower(testOrgId, member1.address);
      expect(initialVotingPower).to.be.gt(0);

      await membership.connect(admin).suspendMember(testOrgId, member1.address);

      const suspendedVotingPower = await membership.getVotingPower(testOrgId, member1.address);
      expect(suspendedVotingPower).to.equal(0);
    });

    it("Should prevent suspended members from actions", async function () {
      await membership.connect(admin).suspendMember(testOrgId, member1.address);

      // Suspended members should not be able to delegate voting power
      await expect(
        membership.connect(member1).delegateVotingPower(testOrgId, member2.address, ethers.parseEther("100"))
      ).to.be.revertedWith("Member is suspended");
    });
  });

  describe("Access Control", function () {
    it("Should have correct role assignments", async function () {
      const DEFAULT_ADMIN_ROLE = await membership.DEFAULT_ADMIN_ROLE();
      expect(await membership.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
      expect(await membership.hasRole(ORGANIZATION_MANAGER_ROLE, admin.address)).to.be.true;
    });

    it("Should prevent non-authorized member management", async function () {
      await membership.connect(admin).activateOrganization(testOrgId);

      await expect(
        membership.connect(nonMember).addMember(testOrgId, member1.address, 0)
      ).to.be.revertedWith("AccessControl:");
    });

    it("Should allow role-based organization management", async function () {
      // Grant role to creator
      await membership.grantRole(ORGANIZATION_MANAGER_ROLE, creator.address);

      // Creator should now be able to manage organizations
      await expect(
        membership.connect(creator).activateOrganization(testOrgId)
      ).to.not.be.reverted;
    });
  });

  describe("Integration with Other Modules", function () {
    beforeEach(async function () {
      await membership.connect(admin).activateOrganization(testOrgId);
      await membership.connect(admin).addMember(testOrgId, member1.address, 0);
    });

    it("Should provide member validation for other modules", async function () {
      // This tests the interface that other modules would use
      expect(await membership.isMember(testOrgId, member1.address)).to.be.true;
      expect(await membership.isMember(testOrgId, nonMember.address)).to.be.false;
    });

    it("Should provide voting power for governance modules", async function () {
      const votingPower = await membership.getVotingPower(testOrgId, member1.address);
      expect(votingPower).to.be.gt(0);
    });

    it("Should track member activity for reputation modules", async function () {
      const memberData = await membership.getMember(testOrgId, member1.address);
      expect(memberData.joinedAt).to.be.gt(0);
      expect(memberData.isActive).to.be.true;
    });
  });

  describe("Error Handling and Edge Cases", function () {
    it("Should handle inactive organization operations", async function () {
      // Organization not activated
      await expect(
        membership.connect(admin).addMember(testOrgId, member1.address, 0)
      ).to.be.revertedWith("Organization not active");
    });

    it("Should handle zero address operations", async function () {
      await membership.connect(admin).activateOrganization(testOrgId);

      await expect(
        membership.connect(admin).addMember(testOrgId, ethers.ZeroAddress, 0)
      ).to.be.revertedWith("Invalid member address");
    });

    it("Should handle invalid organization ID", async function () {
      const invalidOrgId = "0x0000000000000000";

      await expect(
        membership.connect(admin).activateOrganization(invalidOrgId)
      ).to.be.revertedWith("Invalid organization ID");
    });

    it("Should handle large member counts", async function () {
      await membership.connect(admin).activateOrganization(testOrgId);

      // Add multiple members to test scalability
      const memberCount = 50;
      for (let i = 0; i < memberCount; i++) {
        const wallet = ethers.Wallet.createRandom();
        await membership.connect(admin).addMember(testOrgId, wallet.address, 0);
      }

      expect(await membership.getMemberCount(testOrgId)).to.equal(memberCount);
    });
  });
});
