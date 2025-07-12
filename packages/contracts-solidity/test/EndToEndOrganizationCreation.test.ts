import { ethers } from "hardhat";
import { expect } from "chai";
import { Control, GameDAORegistry, MockGameToken } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

// ID utility functions (copied from frontend)
function bytes8ToAlphanumericString(bytes8Hex: string): string {
  // Remove 0x prefix if present
  let hex = bytes8Hex.startsWith('0x') ? bytes8Hex.slice(2) : bytes8Hex

  // Ensure it's exactly 16 characters (8 bytes)
  if (hex.length !== 16) {
    console.warn('Invalid bytes8 hex length:', hex.length, 'for', bytes8Hex)
    return bytes8Hex // Return as-is if invalid
  }

  // Convert each pair of hex characters to ASCII character
  let result = ''
  for (let i = 0; i < 16; i += 2) {
    const byte = parseInt(hex.slice(i, i + 2), 16)
    result += String.fromCharCode(byte)
  }

  return result
}

function alphanumericStringToBytes8(alphanumericId: string): string {
  if (alphanumericId.length !== 8) {
    console.warn('Invalid alphanumeric ID length:', alphanumericId.length, 'for', alphanumericId)
    return alphanumericId // Return as-is if invalid
  }

  // Convert each character to hex
  let hex = ''
  for (let i = 0; i < 8; i++) {
    const charCode = alphanumericId.charCodeAt(i)
    hex += charCode.toString(16).padStart(2, '0')
  }

  return '0x' + hex
}

describe("End-to-End Organization Creation Test", function () {
  let registry: GameDAORegistry;
  let control: Control;
  let gameToken: MockGameToken;
  let admin: SignerWithAddress;
  let creator: SignerWithAddress;
  let member1: SignerWithAddress;

  const MODULE_ID = ethers.keccak256(ethers.toUtf8Bytes("CONTROL"));

  beforeEach(async function () {
    [admin, creator, member1] = await ethers.getSigners();

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

    // Register and enable Control Module
    await registry.connect(admin).registerModule(await control.getAddress());
    await registry.connect(admin).enableModule(MODULE_ID);

    // Initialize Control Module
    await control.connect(admin).initialize(await registry.getAddress());

    // Mint some GAME tokens to creator for testing
    await gameToken.connect(admin).mint(creator.address, ethers.parseEther("10000"));
    await gameToken.connect(admin).mint(member1.address, ethers.parseEther("10000"));
  });

  describe("Complete Organization Creation Flow", function () {
    it("Should create organization, emit correct events, and verify data", async function () {
      console.log("🧪 Starting end-to-end organization creation test...");

      // Step 1: Create organization
      console.log("📝 Step 1: Creating organization...");
      const orgName = "Test DAO";
      const metadataURI = "ipfs://QmTest123";
      const orgType = 2; // DAO
      const accessModel = 0; // Open
      const feeModel = 0; // No Fees
      const memberLimit = 100;
      const membershipFee = ethers.parseEther("10"); // 10 GAME tokens
      const gameStakeRequired = ethers.parseEther("100"); // 100 GAME tokens

      // Approve GAME tokens for staking
      await gameToken.connect(creator).approve(await control.getAddress(), gameStakeRequired);

      const tx = await control.connect(creator).createOrganization(
        orgName,
        metadataURI,
        orgType,
        accessModel,
        feeModel,
        memberLimit,
        membershipFee,
        gameStakeRequired
      );

      const receipt = await tx.wait();
      console.log("✅ Organization created, transaction hash:", receipt?.hash);

      // Step 2: Verify event emission
      console.log("📡 Step 2: Verifying event emission...");
      const events = receipt?.logs || [];
      console.log("📊 Total events emitted:", events.length);

      // Find OrganizationCreated event
      const organizationCreatedEvent = events.find(log => {
        try {
          const parsed = control.interface.parseLog(log as any);
          return parsed?.name === "OrganizationCreated";
        } catch {
          return false;
        }
      });

      expect(organizationCreatedEvent, "OrganizationCreated event should be emitted").to.exist;

      const parsedEvent = control.interface.parseLog(organizationCreatedEvent as any);
      const orgIdBytes8 = parsedEvent?.args[0];
      const emittedName = parsedEvent?.args[1];
      const emittedCreator = parsedEvent?.args[2];
      const emittedTreasury = parsedEvent?.args[3];
      const emittedTimestamp = parsedEvent?.args[4];

      console.log("🎯 Event details:");
      console.log("  - Organization ID (bytes8):", orgIdBytes8);
      console.log("  - Name:", emittedName);
      console.log("  - Creator:", emittedCreator);
      console.log("  - Treasury:", emittedTreasury);
      console.log("  - Timestamp:", emittedTimestamp.toString());

      // Step 3: Convert bytes8 to alphanumeric string
      console.log("🔄 Step 3: Converting ID formats...");
      const orgIdAlphanumeric = bytes8ToAlphanumericString(orgIdBytes8);
      console.log("  - Alphanumeric ID:", orgIdAlphanumeric);

      // Verify conversion is bidirectional
      const convertedBack = alphanumericStringToBytes8(orgIdAlphanumeric);
      expect(convertedBack).to.equal(orgIdBytes8, "ID conversion should be bidirectional");
      console.log("✅ ID conversion verified");

      // Step 4: Verify organization data on-chain
      console.log("🔍 Step 4: Verifying organization data on-chain...");
      const organization = await control.getOrganization(orgIdBytes8);

      expect(organization.id).to.equal(orgIdBytes8);
      expect(organization.name).to.equal(orgName);
      expect(organization.creator).to.equal(creator.address);
      expect(organization.orgType).to.equal(orgType);
      expect(organization.accessModel).to.equal(accessModel);
      expect(organization.feeModel).to.equal(feeModel);
      expect(organization.memberLimit).to.equal(memberLimit);
      expect(organization.membershipFee).to.equal(membershipFee);
      expect(organization.gameStakeRequired).to.equal(gameStakeRequired);
      expect(organization.state).to.equal(1); // Active
      expect(organization.memberCount).to.equal(1); // Creator is first member

      console.log("✅ Organization data verified on-chain");

      // Step 5: Verify member data
      console.log("👥 Step 5: Verifying member data...");
      const isMember = await control.isMember(orgIdBytes8, creator.address);
      expect(isMember).to.be.true;

      const isActive = await control.isMemberActive(orgIdBytes8, creator.address);
      expect(isActive).to.be.true;

      const memberCount = await control.getMemberCount(orgIdBytes8);
      expect(memberCount).to.equal(1);

      console.log("✅ Member data verified");

      // Step 6: Test adding a new member
      console.log("➕ Step 6: Testing member addition...");

      // Member needs to approve GAME tokens for membership fee
      await gameToken.connect(member1).approve(await control.getAddress(), membershipFee);

      const addMemberTx = await control.connect(member1).addMember(orgIdBytes8, member1.address);
      const addMemberReceipt = await addMemberTx.wait();

      // Verify MemberAdded event
      const memberAddedEvent = addMemberReceipt?.logs.find(log => {
        try {
          const parsed = control.interface.parseLog(log as any);
          return parsed?.name === "MemberAdded";
        } catch {
          return false;
        }
      });

      expect(memberAddedEvent, "MemberAdded event should be emitted").to.exist;
      console.log("✅ Member added successfully");

      // Verify updated member count
      const updatedMemberCount = await control.getMemberCount(orgIdBytes8);
      expect(updatedMemberCount).to.equal(2);

      // Step 7: Generate subgraph-compatible data
      console.log("📊 Step 7: Generating subgraph-compatible data...");

      const subgraphData = {
        organization: {
          id: orgIdAlphanumeric, // 8-character alphanumeric ID
          name: organization.name,
          creator: organization.creator,
          treasury: organization.treasury,
          orgType: organization.orgType.toString(),
          accessModel: organization.accessModel.toString(),
          feeModel: organization.feeModel.toString(),
          memberLimit: organization.memberLimit.toString(),
          memberCount: updatedMemberCount.toString(),
          membershipFee: organization.membershipFee.toString(),
          gameStakeRequired: organization.gameStakeRequired.toString(),
          state: organization.state.toString(),
          createdAt: organization.createdAt.toString(),
          updatedAt: organization.updatedAt.toString(),
          totalCampaigns: organization.totalCampaigns.toString(),
          totalProposals: organization.totalProposals.toString(),
        },
        events: {
          organizationCreated: {
            id: orgIdBytes8,
            name: emittedName,
            creator: emittedCreator,
            treasury: emittedTreasury,
            timestamp: emittedTimestamp.toString(),
            blockNumber: receipt?.blockNumber.toString(),
            transactionHash: receipt?.hash,
          },
          memberAdded: {
            organizationId: orgIdBytes8,
            member: member1.address,
            timestamp: addMemberReceipt?.blockNumber.toString(),
            blockNumber: addMemberReceipt?.blockNumber.toString(),
            transactionHash: addMemberReceipt?.hash,
          }
        }
      };

      console.log("📋 Subgraph-compatible data:");
      console.log(JSON.stringify(subgraphData, null, 2));

      // Step 8: Verify frontend ABI compatibility
      console.log("🌐 Step 8: Verifying frontend ABI compatibility...");

      // Test that the organization can be fetched using the frontend ABI format
      const orgData = await control.getOrganization(orgIdBytes8);

      // Simulate frontend data transformation
      const frontendOrganization = {
        id: orgIdAlphanumeric, // Frontend uses alphanumeric ID
        name: orgData.name,
        creator: orgData.creator,
        treasury: orgData.treasury,
        accessModel: Number(orgData.accessModel),
        feeModel: Number(orgData.feeModel),
        memberLimit: Number(orgData.memberLimit),
        memberCount: Number(orgData.memberCount),
        totalCampaigns: Number(orgData.totalCampaigns),
        totalProposals: Number(orgData.totalProposals),
        state: Number(orgData.state),
        createdAt: Number(orgData.createdAt),
      };

      console.log("🎯 Frontend-compatible organization data:");
      console.log(JSON.stringify(frontendOrganization, null, 2));

      console.log("🎉 End-to-end test completed successfully!");

      // Return data for potential use in other tests
      return {
        orgIdBytes8,
        orgIdAlphanumeric,
        organization: frontendOrganization,
        subgraphData,
      };
    });

    it("Should handle ID conversion edge cases", async function () {
      console.log("🧪 Testing ID conversion edge cases...");

      // Test various ID formats
      const testCases = [
        "0x5a5139473845415a", // Valid bytes8
        "Z5139GEZ",           // Valid alphanumeric
        "12345678",           // Valid numeric
        "ABCDEFGH",           // Valid alpha
      ];

      for (const testCase of testCases) {
        console.log(`Testing: ${testCase}`);

        if (testCase.startsWith("0x")) {
          // Convert bytes8 to alphanumeric
          const alphanumeric = bytes8ToAlphanumericString(testCase);
          console.log(`  -> Alphanumeric: ${alphanumeric}`);

          // Convert back
          const backToBytes8 = alphanumericStringToBytes8(alphanumeric);
          console.log(`  -> Back to bytes8: ${backToBytes8}`);

          expect(backToBytes8).to.equal(testCase);
        } else {
          // Convert alphanumeric to bytes8
          const bytes8 = alphanumericStringToBytes8(testCase);
          console.log(`  -> Bytes8: ${bytes8}`);

          // Convert back
          const backToAlphanumeric = bytes8ToAlphanumericString(bytes8);
          console.log(`  -> Back to alphanumeric: ${backToAlphanumeric}`);

          expect(backToAlphanumeric).to.equal(testCase);
        }
      }

      console.log("✅ All ID conversion tests passed");
    });
  });

  describe("Subgraph Event Compatibility", function () {
    it("Should emit events compatible with subgraph schema", async function () {
      console.log("🧪 Testing subgraph event compatibility...");

      // Create organization
      const tx = await control.connect(creator).createOrganization(
        "Subgraph Test DAO",
        "ipfs://QmSubgraphTest",
        2, // DAO
        0, // Open
        0, // No Fees
        50,
        0, // No membership fee
        0  // No stake required
      );

      const receipt = await tx.wait();
      const events = receipt?.logs || [];

      // Parse OrganizationCreated event
      const orgCreatedEvent = events.find(log => {
        try {
          const parsed = control.interface.parseLog(log as any);
          return parsed?.name === "OrganizationCreated";
        } catch {
          return false;
        }
      });

      expect(orgCreatedEvent).to.exist;
      const parsedEvent = control.interface.parseLog(orgCreatedEvent as any);

      // Verify event structure matches subgraph expectations
      console.log("📡 Event structure:");
      console.log("  - args[0] (id):", parsedEvent?.args[0]);
      console.log("  - args[1] (name):", parsedEvent?.args[1]);
      console.log("  - args[2] (creator):", parsedEvent?.args[2]);
      console.log("  - args[3] (treasury):", parsedEvent?.args[3]);
      console.log("  - args[4] (timestamp):", parsedEvent?.args[4].toString());

      // Verify types
      expect(parsedEvent?.args[0]).to.be.a('string'); // bytes8 as hex string
      expect(parsedEvent?.args[1]).to.be.a('string'); // name
      expect(parsedEvent?.args[2]).to.be.a('string'); // creator address
      expect(parsedEvent?.args[3]).to.be.a('string'); // treasury address
      expect(parsedEvent?.args[4]).to.be.a('bigint'); // timestamp

      console.log("✅ Event structure is compatible with subgraph");
    });
  });
});
