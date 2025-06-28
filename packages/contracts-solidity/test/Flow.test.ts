import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { GameDAORegistry, Control, Flow, Treasury } from "../typechain-types";

describe("Flow Module", function () {
  let registry: GameDAORegistry;
  let control: Control;
  let flow: Flow;
  let admin: SignerWithAddress;
  let creator: SignerWithAddress;
  let contributor1: SignerWithAddress;
  let contributor2: SignerWithAddress;
  let contributor3: SignerWithAddress;

  const CONTROL_MODULE_ID = ethers.keccak256(ethers.toUtf8Bytes("CONTROL"));
  const FLOW_MODULE_ID = ethers.keccak256(ethers.toUtf8Bytes("FLOW"));

  let testOrgId: string;

  beforeEach(async function () {
    [admin, creator, contributor1, contributor2, contributor3] = await ethers.getSigners();

    // Deploy Registry
    const GameDAORegistryFactory = await ethers.getContractFactory("GameDAORegistry");
    registry = await GameDAORegistryFactory.deploy(admin.address);
    await registry.waitForDeployment();

    // Deploy Control Module
    const ControlFactory = await ethers.getContractFactory("Control");
    control = await ControlFactory.deploy();
    await control.waitForDeployment();

    // Deploy Flow Module
    const FlowFactory = await ethers.getContractFactory("Flow");
    flow = await FlowFactory.deploy();
    await flow.waitForDeployment();

    // Register and enable modules
    await registry.registerModule(await control.getAddress());
    await registry.enableModule(CONTROL_MODULE_ID);

    await registry.registerModule(await flow.getAddress());
    await registry.enableModule(FLOW_MODULE_ID);

    // Create test organization
    const orgTx = await control.connect(creator).createOrganization(
      "Test DAO",
      "ipfs://test-metadata",
      2, // DAO
      0, // Open access
      0, // No fees
      100, // Member limit
      0, // No membership fee
      0  // No GAME stake required
    );

    const receipt = await orgTx.wait();
    const event = receipt?.logs.find((log: any) =>
      control.interface.parseLog(log)?.name === "OrganizationCreated"
    );
    const parsedEvent = control.interface.parseLog(event as any);
    testOrgId = parsedEvent?.args[0];
  });

  describe("Campaign Creation", function () {
    it("Should create campaign successfully", async function () {
      const campaignTx = await flow.connect(creator).createCampaign(
        testOrgId,
        "Test Campaign",
        "A test crowdfunding campaign",
        "ipfs://campaign-metadata",
        0, // Grant type
        ethers.ZeroAddress, // ETH payments
        ethers.parseEther("10"), // Target: 10 ETH
        ethers.parseEther("5"),  // Min: 5 ETH
        ethers.parseEther("20"), // Max: 20 ETH
        86400 * 30, // 30 days duration
        true // Auto-finalize
      );

      const receipt = await campaignTx.wait();
      const event = receipt?.logs.find((log: any) =>
        flow.interface.parseLog(log)?.name === "CampaignCreated"
      );

      expect(event).to.not.be.undefined;

      const parsedEvent = flow.interface.parseLog(event as any);
      const campaignId = parsedEvent?.args[0];

      // Verify campaign data
      const campaign = await flow.getCampaign(campaignId);
      expect(campaign.title).to.equal("Test Campaign");
      expect(campaign.creator).to.equal(creator.address);
      expect(campaign.organizationId).to.equal(testOrgId);
      expect(campaign.target).to.equal(ethers.parseEther("10"));
      expect(campaign.min).to.equal(ethers.parseEther("5"));
      expect(campaign.max).to.equal(ethers.parseEther("20"));
      expect(campaign.flowType).to.equal(0); // Grant
      expect(campaign.state).to.equal(0); // Created
      expect(campaign.raised).to.equal(0);
      expect(campaign.contributorCount).to.equal(0);
      expect(campaign.autoFinalize).to.be.true;
    });

    it("Should reject campaign with invalid parameters", async function () {
      // Empty title
      await expect(
        flow.connect(creator).createCampaign(
          testOrgId,
          "",
          "Description",
          "ipfs://metadata",
          0,
          ethers.ZeroAddress,
          ethers.parseEther("10"),
          ethers.parseEther("5"),
          ethers.parseEther("20"),
          86400,
          false
        )
      ).to.be.revertedWithCustomError(flow, "InvalidCampaignParameters");

      // Min > Target
      await expect(
        flow.connect(creator).createCampaign(
          testOrgId,
          "Test Campaign",
          "Description",
          "ipfs://metadata",
          0,
          ethers.ZeroAddress,
          ethers.parseEther("5"),
          ethers.parseEther("10"),
          ethers.parseEther("20"),
          86400,
          false
        )
      ).to.be.revertedWithCustomError(flow, "InvalidCampaignParameters");

      // Max < Target
      await expect(
        flow.connect(creator).createCampaign(
          testOrgId,
          "Test Campaign",
          "Description",
          "ipfs://metadata",
          0,
          ethers.ZeroAddress,
          ethers.parseEther("10"),
          ethers.parseEther("5"),
          ethers.parseEther("8"),
          86400,
          false
        )
      ).to.be.revertedWithCustomError(flow, "InvalidCampaignParameters");

      // Zero duration
      await expect(
        flow.connect(creator).createCampaign(
          testOrgId,
          "Test Campaign",
          "Description",
          "ipfs://metadata",
          0,
          ethers.ZeroAddress,
          ethers.parseEther("10"),
          ethers.parseEther("5"),
          ethers.parseEther("20"),
          0,
          false
        )
      ).to.be.revertedWithCustomError(flow, "InvalidCampaignParameters");
    });

    it("Should reject campaign for non-existent organization", async function () {
      const fakeOrgId = ethers.keccak256(ethers.toUtf8Bytes("fake"));

      await expect(
        flow.connect(creator).createCampaign(
          fakeOrgId,
          "Test Campaign",
          "Description",
          "ipfs://metadata",
          0,
          ethers.ZeroAddress,
          ethers.parseEther("10"),
          ethers.parseEther("5"),
          ethers.parseEther("20"),
          86400,
          false
        )
      ).to.be.revertedWithCustomError(flow, "OrganizationNotFound");
    });

    it("Should create campaign with struct parameters successfully", async function () {
      const params = {
        title: "Struct Campaign",
        description: "A campaign created with struct parameters",
        metadataURI: "ipfs://struct-metadata",
        flowType: 1, // Crowdfunding
        paymentToken: ethers.ZeroAddress,
        target: ethers.parseEther("15"),
        min: ethers.parseEther("8"),
        max: ethers.parseEther("25"),
        duration: 86400 * 45, // 45 days
        autoFinalize: false
      };

      const campaignTx = await flow.connect(creator).createCampaignWithParams(
        creator.address,
        testOrgId,
        params
      );

      const receipt = await campaignTx.wait();
      const event = receipt?.logs.find((log: any) =>
        flow.interface.parseLog(log)?.name === "CampaignCreated"
      );

      expect(event).to.not.be.undefined;

      const parsedEvent = flow.interface.parseLog(event as any);
      const campaignId = parsedEvent?.args[0];

      // Verify campaign data matches struct parameters
      const campaign = await flow.getCampaign(campaignId);
      expect(campaign.title).to.equal(params.title);
      expect(campaign.description).to.equal(params.description);
      expect(campaign.metadataURI).to.equal(params.metadataURI);
      expect(campaign.creator).to.equal(creator.address);
      expect(campaign.organizationId).to.equal(testOrgId);
      expect(campaign.target).to.equal(params.target);
      expect(campaign.min).to.equal(params.min);
      expect(campaign.max).to.equal(params.max);
      expect(campaign.flowType).to.equal(params.flowType);
      expect(campaign.autoFinalize).to.equal(params.autoFinalize);
      expect(campaign.state).to.equal(0); // Created
      expect(campaign.raised).to.equal(0);
      expect(campaign.contributorCount).to.equal(0);
    });

    it("Should create campaign with different creator address", async function () {
      const params = {
        title: "Third Party Campaign",
        description: "Campaign created on behalf of another user",
        metadataURI: "ipfs://third-party-metadata",
        flowType: 0, // Grant
        paymentToken: ethers.ZeroAddress,
        target: ethers.parseEther("5"),
        min: ethers.parseEther("2"),
        max: ethers.parseEther("10"),
        duration: 86400 * 14, // 14 days
        autoFinalize: true
      };

      // Admin creates campaign on behalf of contributor1
      const campaignTx = await flow.connect(admin).createCampaignWithParams(
        contributor1.address,
        testOrgId,
        params
      );

      const receipt = await campaignTx.wait();
      const event = receipt?.logs.find((log: any) =>
        flow.interface.parseLog(log)?.name === "CampaignCreated"
      );

      const parsedEvent = flow.interface.parseLog(event as any);
      const campaignId = parsedEvent?.args[0];

      // Verify the creator is set to contributor1, not admin
      const campaign = await flow.getCampaign(campaignId);
      expect(campaign.creator).to.equal(contributor1.address);
      expect(campaign.admin).to.equal(contributor1.address);
    });

    it("Should reject struct campaign with invalid parameters", async function () {
      // Empty title
      const invalidParams1 = {
        title: "",
        description: "Valid description",
        metadataURI: "ipfs://metadata",
        flowType: 0,
        paymentToken: ethers.ZeroAddress,
        target: ethers.parseEther("10"),
        min: ethers.parseEther("5"),
        max: ethers.parseEther("20"),
        duration: 86400,
        autoFinalize: false
      };

      await expect(
        flow.connect(creator).createCampaignWithParams(
          creator.address,
          testOrgId,
          invalidParams1
        )
      ).to.be.revertedWithCustomError(flow, "InvalidCampaignParameters");

      // Min > Target
      const invalidParams2 = {
        title: "Valid Title",
        description: "Valid description",
        metadataURI: "ipfs://metadata",
        flowType: 0,
        paymentToken: ethers.ZeroAddress,
        target: ethers.parseEther("5"),
        min: ethers.parseEther("10"),
        max: ethers.parseEther("20"),
        duration: 86400,
        autoFinalize: false
      };

      await expect(
        flow.connect(creator).createCampaignWithParams(
          creator.address,
          testOrgId,
          invalidParams2
        )
      ).to.be.revertedWithCustomError(flow, "InvalidCampaignParameters");
    });
  });

  describe("Campaign Management", function () {
    let campaignId: string;

    beforeEach(async function () {
      const campaignTx = await flow.connect(creator).createCampaign(
        testOrgId,
        "Test Campaign",
        "A test campaign",
        "ipfs://metadata",
        0,
        ethers.ZeroAddress,
        ethers.parseEther("10"),
        ethers.parseEther("5"),
        ethers.parseEther("20"),
        86400 * 30,
        false
      );

      const receipt = await campaignTx.wait();
      const event = receipt?.logs.find((log: any) =>
        flow.interface.parseLog(log)?.name === "CampaignCreated"
      );
      const parsedEvent = flow.interface.parseLog(event as any);
      campaignId = parsedEvent?.args[0];
    });

    it("Should update campaign successfully", async function () {
      await flow.connect(creator).updateCampaign(
        campaignId,
        "Updated Campaign",
        "Updated description",
        ethers.parseEther("15"),
        ethers.parseEther("7"),
        ethers.parseEther("25"),
        Math.floor(Date.now() / 1000) + 86400 * 60 // 60 days from now
      );

      const campaign = await flow.getCampaign(campaignId);
      expect(campaign.title).to.equal("Updated Campaign");
      expect(campaign.description).to.equal("Updated description");
      expect(campaign.target).to.equal(ethers.parseEther("15"));
      expect(campaign.min).to.equal(ethers.parseEther("7"));
      expect(campaign.max).to.equal(ethers.parseEther("25"));
    });

    it("Should prevent non-creator from updating campaign", async function () {
      await expect(
        flow.connect(contributor1).updateCampaign(
          campaignId,
          "Hacked Campaign",
          "Malicious update",
          ethers.parseEther("1"),
          ethers.parseEther("1"),
          ethers.parseEther("1"),
          Math.floor(Date.now() / 1000) + 86400
        )
      ).to.be.revertedWithCustomError(flow, "UnauthorizedCampaignAccess");
    });

    it("Should allow admin to change campaign state", async function () {
      await flow.connect(admin).setCampaignState(campaignId, 2); // Paused

      const campaign = await flow.getCampaign(campaignId);
      expect(campaign.state).to.equal(2); // Paused
    });

    it("Should prevent non-admin from changing campaign state", async function () {
      await expect(
        flow.connect(creator).setCampaignState(campaignId, 2)
      ).to.be.reverted;
    });
  });

  describe("Contributions", function () {
    let campaignId: string;

    beforeEach(async function () {
      const campaignTx = await flow.connect(creator).createCampaign(
        testOrgId,
        "Test Campaign",
        "A test campaign",
        "ipfs://metadata",
        0,
        ethers.ZeroAddress,
        ethers.parseEther("10"),
        ethers.parseEther("5"),
        ethers.parseEther("20"),
        86400 * 30,
        false
      );

      const receipt = await campaignTx.wait();
      const event = receipt?.logs.find((log: any) =>
        flow.interface.parseLog(log)?.name === "CampaignCreated"
      );
      const parsedEvent = flow.interface.parseLog(event as any);
      campaignId = parsedEvent?.args[0];
    });

    it("Should accept ETH contributions", async function () {
      const contributionAmount = ethers.parseEther("2");

      await flow.connect(contributor1).contribute(
        campaignId,
        contributionAmount,
        "First contribution",
        { value: contributionAmount }
      );

      const campaign = await flow.getCampaign(campaignId);
      expect(campaign.raised).to.equal(contributionAmount);
      expect(campaign.contributorCount).to.equal(1);
      expect(campaign.state).to.equal(1); // Active (auto-activated on first contribution)

      const contribution = await flow.getContribution(campaignId, contributor1.address);
      expect(contribution.amount).to.equal(contributionAmount);
      expect(contribution.contributor).to.equal(contributor1.address);
      expect(contribution.state).to.equal(1); // Active
      expect(contribution.metadata).to.equal("First contribution");
    });

    it("Should handle multiple contributions from same contributor", async function () {
      const firstAmount = ethers.parseEther("1");
      const secondAmount = ethers.parseEther("2");

      await flow.connect(contributor1).contribute(
        campaignId,
        firstAmount,
        "First",
        { value: firstAmount }
      );

      await flow.connect(contributor1).contribute(
        campaignId,
        secondAmount,
        "Second",
        { value: secondAmount }
      );

      const campaign = await flow.getCampaign(campaignId);
      expect(campaign.raised).to.equal(firstAmount + secondAmount);
      expect(campaign.contributorCount).to.equal(1); // Same contributor

      const contribution = await flow.getContribution(campaignId, contributor1.address);
      expect(contribution.amount).to.equal(firstAmount + secondAmount);
    });

    it("Should handle multiple contributors", async function () {
      const amount1 = ethers.parseEther("2");
      const amount2 = ethers.parseEther("3");

      await flow.connect(contributor1).contribute(
        campaignId,
        amount1,
        "Contributor 1",
        { value: amount1 }
      );

      await flow.connect(contributor2).contribute(
        campaignId,
        amount2,
        "Contributor 2",
        { value: amount2 }
      );

      const campaign = await flow.getCampaign(campaignId);
      expect(campaign.raised).to.equal(amount1 + amount2);
      expect(campaign.contributorCount).to.equal(2);

      const contributors = await flow.getCampaignContributors(campaignId);
      expect(contributors).to.include(contributor1.address);
      expect(contributors).to.include(contributor2.address);
    });

    it("Should reject contributions exceeding maximum", async function () {
      const maxExceedingAmount = ethers.parseEther("25"); // Max is 20 ETH

      await expect(
        flow.connect(contributor1).contribute(
          campaignId,
          maxExceedingAmount,
          "Too much",
          { value: maxExceedingAmount }
        )
      ).to.be.revertedWithCustomError(flow, "ContributionExceedsMax");
    });

    it("Should reject zero contributions", async function () {
      await expect(
        flow.connect(contributor1).contribute(
          campaignId,
          0,
          "Zero contribution"
        )
      ).to.be.revertedWithCustomError(flow, "InvalidContributionAmount");
    });

    it("Should reject contributions with mismatched ETH value", async function () {
      await expect(
        flow.connect(contributor1).contribute(
          campaignId,
          ethers.parseEther("2"),
          "Mismatched value",
          { value: ethers.parseEther("1") }
        )
      ).to.be.revertedWithCustomError(flow, "InvalidContributionAmount");
    });
  });

  describe("Campaign Finalization", function () {
    let campaignId: string;

    beforeEach(async function () {
      const campaignTx = await flow.connect(creator).createCampaign(
        testOrgId,
        "Test Campaign",
        "A test campaign",
        "ipfs://metadata",
        0,
        ethers.ZeroAddress,
        ethers.parseEther("10"),
        ethers.parseEther("5"),
        ethers.parseEther("20"),
        86400 * 30,
        false
      );

      const receipt = await campaignTx.wait();
      const event = receipt?.logs.find((log: any) =>
        flow.interface.parseLog(log)?.name === "CampaignCreated"
      );
      const parsedEvent = flow.interface.parseLog(event as any);
      campaignId = parsedEvent?.args[0];
    });

    it("Should finalize successful campaign", async function () {
      // Contribute enough to reach minimum
      await flow.connect(contributor1).contribute(
        campaignId,
        ethers.parseEther("6"),
        "Success contribution",
        { value: ethers.parseEther("6") }
      );

      await flow.connect(creator).finalizeCampaign(campaignId);

      const campaign = await flow.getCampaign(campaignId);
      expect(campaign.state).to.equal(6); // Finalized
    });

    it("Should finalize failed campaign", async function () {
      // Contribute less than minimum
      await flow.connect(contributor1).contribute(
        campaignId,
        ethers.parseEther("3"),
        "Insufficient contribution",
        { value: ethers.parseEther("3") }
      );

      await flow.connect(creator).finalizeCampaign(campaignId);

      const campaign = await flow.getCampaign(campaignId);
      expect(campaign.state).to.equal(6); // Finalized
    });

    it("Should auto-finalize when target reached", async function () {
      // Create campaign with auto-finalize enabled
      const autoFinalizeTx = await flow.connect(creator).createCampaign(
        testOrgId,
        "Auto Finalize Campaign",
        "Auto-finalizes on target",
        "ipfs://metadata",
        0,
        ethers.ZeroAddress,
        ethers.parseEther("5"),
        ethers.parseEther("3"),
        ethers.parseEther("10"),
        86400 * 30,
        true // Auto-finalize enabled
      );

      const receipt = await autoFinalizeTx.wait();
      const event = receipt?.logs.find((log: any) =>
        flow.interface.parseLog(log)?.name === "CampaignCreated"
      );
      const parsedEvent = flow.interface.parseLog(event as any);
      const autoFinalizeId = parsedEvent?.args[0];

      // Contribute exactly the target amount
      await flow.connect(contributor1).contribute(
        autoFinalizeId,
        ethers.parseEther("5"),
        "Target reached",
        { value: ethers.parseEther("5") }
      );

      const campaign = await flow.getCampaign(autoFinalizeId);
      expect(campaign.state).to.equal(6); // Should be finalized automatically
    });

    it("Should prevent unauthorized finalization", async function () {
      await expect(
        flow.connect(contributor1).finalizeCampaign(campaignId)
      ).to.be.revertedWithCustomError(flow, "UnauthorizedCampaignAccess");
    });
  });

  describe("Protocol Fees", function () {
    let campaignId: string;

    beforeEach(async function () {
      const campaignTx = await flow.connect(creator).createCampaign(
        testOrgId,
        "Fee Test Campaign",
        "Testing protocol fees",
        "ipfs://metadata",
        0,
        ethers.ZeroAddress,
        ethers.parseEther("10"),
        ethers.parseEther("5"),
        ethers.parseEther("20"),
        86400 * 30,
        false
      );

      const receipt = await campaignTx.wait();
      const event = receipt?.logs.find((log: any) =>
        flow.interface.parseLog(log)?.name === "CampaignCreated"
      );
      const parsedEvent = flow.interface.parseLog(event as any);
      campaignId = parsedEvent?.args[0];
    });

    it("Should calculate protocol fee correctly", async function () {
      const amount = ethers.parseEther("10");
      const feeRate = await flow.getProtocolFeeRate();
      const expectedFee = (amount * feeRate) / 10000n;

      const calculatedFee = await flow.calculateProtocolFee(amount);
      expect(calculatedFee).to.equal(expectedFee);
    });

    it("Should collect protocol fee on successful campaign", async function () {
      const contributionAmount = ethers.parseEther("8");

      // Make contribution
      await flow.connect(contributor1).contribute(
        campaignId,
        contributionAmount,
        "Fee test",
        { value: contributionAmount }
      );

      // Finalize campaign
      const finalizeTx = await flow.connect(creator).finalizeCampaign(campaignId);
      const receipt = await finalizeTx.wait();

      // Check for protocol fee collection event
      const feeEvent = receipt?.logs.find((log: any) =>
        flow.interface.parseLog(log)?.name === "ProtocolFeeCollected"
      );

      expect(feeEvent).to.not.be.undefined;
    });

    it("Should allow admin to update protocol fee rate", async function () {
      const newRate = 500; // 5%

      await flow.connect(admin).setProtocolFeeRate(newRate);

      const updatedRate = await flow.getProtocolFeeRate();
      expect(updatedRate).to.equal(newRate);
    });

    it("Should reject invalid protocol fee rate", async function () {
      const invalidRate = 1500; // 15% (above 10% max)

      await expect(
        flow.connect(admin).setProtocolFeeRate(invalidRate)
      ).to.be.revertedWithCustomError(flow, "InvalidProtocolFee");
    });
  });

  describe("View Functions", function () {
    let campaignId: string;

    beforeEach(async function () {
      const campaignTx = await flow.connect(creator).createCampaign(
        testOrgId,
        "View Test Campaign",
        "Testing view functions",
        "ipfs://metadata",
        0,
        ethers.ZeroAddress,
        ethers.parseEther("10"),
        ethers.parseEther("5"),
        ethers.parseEther("20"),
        86400 * 30,
        false
      );

      const receipt = await campaignTx.wait();
      const event = receipt?.logs.find((log: any) =>
        flow.interface.parseLog(log)?.name === "CampaignCreated"
      );
      const parsedEvent = flow.interface.parseLog(event as any);
      campaignId = parsedEvent?.args[0];
    });

    it("Should return correct campaign progress", async function () {
      await flow.connect(contributor1).contribute(
        campaignId,
        ethers.parseEther("3"),
        "Progress test",
        { value: ethers.parseEther("3") }
      );

      const [raised, target, percentage] = await flow.getCampaignProgress(campaignId);
      expect(raised).to.equal(ethers.parseEther("3"));
      expect(target).to.equal(ethers.parseEther("10"));
      expect(percentage).to.equal(30); // 30%
    });

    it("Should return campaigns by organization", async function () {
      const campaigns = await flow.getCampaignsByOrganization(testOrgId);
      expect(campaigns).to.include(campaignId);
    });

    it("Should return campaigns by state", async function () {
      const createdCampaigns = await flow.getCampaignsByState(0); // Created
      expect(createdCampaigns).to.include(campaignId);
    });

    it("Should check if campaign is active", async function () {
      expect(await flow.isCampaignActive(campaignId)).to.be.false; // Created state

      // Make a contribution to activate
      await flow.connect(contributor1).contribute(
        campaignId,
        ethers.parseEther("1"),
        "Activate",
        { value: ethers.parseEther("1") }
      );

      expect(await flow.isCampaignActive(campaignId)).to.be.true; // Now active
    });

    it("Should check contribution eligibility", async function () {
      expect(await flow.canContribute(campaignId, contributor1.address)).to.be.true;
    });

    it("Should return correct campaign count", async function () {
      const initialCount = await flow.getCampaignCount();

      // Create another campaign
      await flow.connect(creator).createCampaign(
        testOrgId,
        "Second Campaign",
        "Another campaign",
        "ipfs://metadata2",
        1,
        ethers.ZeroAddress,
        ethers.parseEther("5"),
        ethers.parseEther("2"),
        ethers.parseEther("10"),
        86400 * 15,
        false
      );

      const newCount = await flow.getCampaignCount();
      expect(newCount).to.equal(initialCount + 1n);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle non-existent campaign queries", async function () {
      const fakeCampaignId = ethers.keccak256(ethers.toUtf8Bytes("fake"));

      const campaign = await flow.getCampaign(fakeCampaignId);
      expect(campaign.creator).to.equal(ethers.ZeroAddress);

      expect(await flow.isCampaignActive(fakeCampaignId)).to.be.false;
      expect(await flow.canContribute(fakeCampaignId, contributor1.address)).to.be.false;
    });

    it("Should handle campaign with zero max (unlimited)", async function () {
      const unlimitedTx = await flow.connect(creator).createCampaign(
        testOrgId,
        "Unlimited Campaign",
        "No maximum limit",
        "ipfs://metadata",
        0,
        ethers.ZeroAddress,
        ethers.parseEther("10"),
        ethers.parseEther("5"),
        0, // No maximum
        86400 * 30,
        false
      );

      const receipt = await unlimitedTx.wait();
      const event = receipt?.logs.find((log: any) =>
        flow.interface.parseLog(log)?.name === "CampaignCreated"
      );
      const parsedEvent = flow.interface.parseLog(event as any);
      const unlimitedId = parsedEvent?.args[0];

      // Should allow large contributions
      await flow.connect(contributor1).contribute(
        unlimitedId,
        ethers.parseEther("50"),
        "Large contribution",
        { value: ethers.parseEther("50") }
      );

      const campaign = await flow.getCampaign(unlimitedId);
      expect(campaign.raised).to.equal(ethers.parseEther("50"));
    });
  });
});
