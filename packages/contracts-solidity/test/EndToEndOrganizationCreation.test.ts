import { ethers } from "hardhat";
import { expect } from "chai";
import { Control, Registry, MockGameToken } from "../typechain-types";
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
  let registry: Registry;
  let control: Control;
  let gameToken: MockGameToken;
  let admin: SignerWithAddress;
  let creator: SignerWithAddress;
  let member1: SignerWithAddress;

  const MODULE_ID = ethers.keccak256(ethers.toUtf8Bytes("CONTROL"));

  beforeEach(async function () {
    [admin, creator, member1] = await ethers.getSigners();

    // Deploy Game Token
    const MockGameTokenFactory = await ethers.getContractFactory("MockGameToken");
    gameToken = await MockGameTokenFactory.deploy();
    await gameToken.waitForDeployment();

    // Deploy Registry
    const RegistryFactory = await ethers.getContractFactory("Registry");
    registry = await RegistryFactory.deploy(admin.address);
    await registry.waitForDeployment();

    // Deploy Control Module
    const ControlFactory = await ethers.getContractFactory("Control");
    control = await ControlFactory.deploy(await gameToken.getAddress(), await registry.getAddress());
    await control.waitForDeployment();

    // Register Control module
    await registry.registerModule(await control.getAddress());

    // Transfer tokens to test accounts
    const transferAmount = ethers.parseEther("100000");
    await gameToken.transfer(creator.address, transferAmount);
    await gameToken.transfer(member1.address, transferAmount);
  });

  // Skip member-related tests until member management functions are implemented
  it.skip("Should create organization, emit correct events, and verify data", async function () {
    // Test implementation skipped until member functions are added
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
