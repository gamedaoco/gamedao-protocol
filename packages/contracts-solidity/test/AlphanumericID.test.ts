import { expect } from "chai";
import { ethers } from "hardhat";
import { AlphanumericIDTest } from "../typechain-types";

describe("AlphanumericID Library", function () {
  let alphanumericID: AlphanumericIDTest;
  let deployer: any;
  let addr1: any;
  let addr2: any;

  beforeEach(async function () {
    [deployer, addr1, addr2] = await ethers.getSigners();

    // Deploy a test contract that uses the AlphanumericID library
    const AlphanumericIDTest = await ethers.getContractFactory("AlphanumericIDTest");
    alphanumericID = await AlphanumericIDTest.deploy();
    await alphanumericID.waitForDeployment();
  });

  describe("Basic ID Generation", function () {
        it("Should generate 8-character alphanumeric IDs", async function () {
      const hash = ethers.keccak256(ethers.toUtf8Bytes("test"));
      const id = await alphanumericID.testGenerateID(hash);

            // bytes8 is returned as hex string with 0x prefix (18 chars total)
      expect(id).to.have.length(18);
      expect(id).to.match(/^0x[0-9a-fA-F]{16}$/);

      // Convert bytes8 to string for validation
      const idString = await alphanumericID.testToString(id);
      expect(idString).to.have.length(8);
      expect(idString).to.match(/^[0-9A-Z]{8}$/);
    });

    it("Should generate different IDs for different inputs", async function () {
      const hash1 = ethers.keccak256(ethers.toUtf8Bytes("test1"));
      const hash2 = ethers.keccak256(ethers.toUtf8Bytes("test2"));

      const id1 = await alphanumericID.testGenerateID(hash1);
      const id2 = await alphanumericID.testGenerateID(hash2);

      expect(id1).to.not.equal(id2);
    });

    it("Should generate same ID for same input (deterministic)", async function () {
      const hash = ethers.keccak256(ethers.toUtf8Bytes("test"));

      const id1 = await alphanumericID.testGenerateID(hash);
      const id2 = await alphanumericID.testGenerateID(hash);

      expect(id1).to.equal(id2);
    });
  });

  describe("Organization ID Generation", function () {
    it("Should generate unique organization IDs", async function () {
      const moduleId = ethers.keccak256(ethers.toUtf8Bytes("CONTROL"));
      const timestamp = Math.floor(Date.now() / 1000);

      const id1 = await alphanumericID.testGenerateOrganizationID(
        moduleId, 1, deployer.address, timestamp
      );
      const id2 = await alphanumericID.testGenerateOrganizationID(
        moduleId, 2, deployer.address, timestamp
      );

      expect(id1).to.not.equal(id2);
    });

    it("Should generate different IDs for different creators", async function () {
      const moduleId = ethers.keccak256(ethers.toUtf8Bytes("CONTROL"));
      const timestamp = Math.floor(Date.now() / 1000);

      const id1 = await alphanumericID.testGenerateOrganizationID(
        moduleId, 1, deployer.address, timestamp
      );
      const id2 = await alphanumericID.testGenerateOrganizationID(
        moduleId, 1, addr1.address, timestamp
      );

      expect(id1).to.not.equal(id2);
    });

    it("Should generate different IDs for different timestamps", async function () {
      const moduleId = ethers.keccak256(ethers.toUtf8Bytes("CONTROL"));

      const id1 = await alphanumericID.testGenerateOrganizationID(
        moduleId, 1, deployer.address, 1000
      );
      const id2 = await alphanumericID.testGenerateOrganizationID(
        moduleId, 1, deployer.address, 2000
      );

      expect(id1).to.not.equal(id2);
    });
  });

  describe("Campaign ID Generation", function () {
    it("Should generate unique campaign IDs", async function () {
      const orgId = "0x1234567890123456"; // 8-byte organization ID
      const timestamp = Math.floor(Date.now() / 1000);

      const id1 = await alphanumericID.testGenerateCampaignID(
        orgId, deployer.address, "Campaign 1", timestamp, 1
      );
      const id2 = await alphanumericID.testGenerateCampaignID(
        orgId, deployer.address, "Campaign 2", timestamp, 2
      );

      expect(id1).to.not.equal(id2);
    });

    it("Should generate different IDs for different organizations", async function () {
      const orgId1 = "0x1111111111111111";
      const orgId2 = "0x2222222222222222";
      const timestamp = Math.floor(Date.now() / 1000);

      const id1 = await alphanumericID.testGenerateCampaignID(
        orgId1, deployer.address, "Campaign", timestamp, 1
      );
      const id2 = await alphanumericID.testGenerateCampaignID(
        orgId2, deployer.address, "Campaign", timestamp, 1
      );

      expect(id1).to.not.equal(id2);
    });
  });

  describe("String Conversion", function () {
    it("Should convert bytes8 to string correctly", async function () {
      const testString = "ABCD1234";
      const bytes8Value = ethers.encodeBytes32String(testString).slice(0, 18); // Take first 8 bytes

      const result = await alphanumericID.testToString(bytes8Value);
      expect(result).to.equal(testString);
    });

    it("Should convert string to bytes8 correctly", async function () {
      const testString = "ABCD1234";

      const bytes8Value = await alphanumericID.testFromString(testString);
      const backToString = await alphanumericID.testToString(bytes8Value);

      expect(backToString).to.equal(testString);
    });

    it("Should reject invalid string lengths", async function () {
      await expect(
        alphanumericID.testFromString("SHORT")
      ).to.be.revertedWith("Invalid ID length");

      await expect(
        alphanumericID.testFromString("TOOLONGSTRING")
      ).to.be.revertedWith("Invalid ID length");
    });
  });

  describe("ID Validation", function () {
    it("Should validate correct alphanumeric IDs", async function () {
      const validIds = [
        "0x4142434431323334", // "ABCD1234"
        "0x3030303030303030", // "00000000"
        "0x5A5A5A5A5A5A5A5A"  // "ZZZZZZZZ"
      ];

      for (const id of validIds) {
        const isValid = await alphanumericID.testValidateID(id);
        expect(isValid).to.be.true;
      }
    });

    it("Should reject IDs with invalid characters", async function () {
      // Create bytes8 with lowercase letters (invalid)
      const invalidId = "0x6162636431323334"; // "abcd1234" (lowercase)

      const isValid = await alphanumericID.testValidateID(invalidId);
      expect(isValid).to.be.false;
    });
  });

  describe("Collision Resistance", function () {
    it("Should generate unique IDs for large number of iterations", async function () {
      const ids = new Set<string>();
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        const hash = ethers.keccak256(ethers.toUtf8Bytes(`test${i}`));
        const id = await alphanumericID.testGenerateID(hash);

        expect(ids.has(id)).to.be.false, `Collision detected at iteration ${i}`;
        ids.add(id);
      }

      expect(ids.size).to.equal(iterations);
    });

    it("Should generate unique organization IDs for different parameters", async function () {
      const ids = new Set<string>();
      const moduleId = ethers.keccak256(ethers.toUtf8Bytes("CONTROL"));
      const baseTimestamp = Math.floor(Date.now() / 1000);

      // Test with different indices
      for (let i = 1; i <= 100; i++) {
        const id = await alphanumericID.testGenerateOrganizationID(
          moduleId, i, deployer.address, baseTimestamp
        );

        expect(ids.has(id)).to.be.false, `Collision detected for index ${i}`;
        ids.add(id);
      }

      // Test with different addresses
      const addresses = [deployer.address, addr1.address, addr2.address];
      for (const address of addresses) {
        const id = await alphanumericID.testGenerateOrganizationID(
          moduleId, 1, address, baseTimestamp + 1000
        );

        expect(ids.has(id)).to.be.false, `Collision detected for address ${address}`;
        ids.add(id);
      }

      expect(ids.size).to.equal(103); // 100 + 3
    });
  });

  describe("Gas Efficiency", function () {
    it("Should generate IDs with reasonable gas usage", async function () {
      const moduleId = ethers.keccak256(ethers.toUtf8Bytes("CONTROL"));
      const timestamp = Math.floor(Date.now() / 1000);

      const tx = await alphanumericID.testGenerateOrganizationID.populateTransaction(
        moduleId, 1, deployer.address, timestamp
      );

      const gasEstimate = await alphanumericID.testGenerateOrganizationID.estimateGas(
        moduleId, 1, deployer.address, timestamp
      );

      // Should use less than 50k gas for ID generation
      expect(gasEstimate).to.be.lessThan(50000);
    });

    it("Should convert between formats efficiently", async function () {
      const testString = "ABCD1234";

      const toBytes8Gas = await alphanumericID.testFromString.estimateGas(testString);
      expect(toBytes8Gas).to.be.lessThan(30000);

      const bytes8Value = await alphanumericID.testFromString(testString);
      const toStringGas = await alphanumericID.testToString.estimateGas(bytes8Value);
      expect(toStringGas).to.be.lessThan(30000);
    });
  });

  describe("Edge Cases", function () {
        it("Should handle zero hash input", async function () {
      const zeroHash = "0x0000000000000000000000000000000000000000000000000000000000000000";
      const id = await alphanumericID.testGenerateID(zeroHash);

      expect(id).to.have.length(18);
      const idString = await alphanumericID.testToString(id);
      expect(idString).to.match(/^[0-9A-Z]{8}$/);
    });

        it("Should handle max hash input", async function () {
      const maxHash = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
      const id = await alphanumericID.testGenerateID(maxHash);

      expect(id).to.have.length(18);
      const idString = await alphanumericID.testToString(id);
      expect(idString).to.match(/^[0-9A-Z]{8}$/);
    });

        it("Should handle zero timestamp", async function () {
      const moduleId = ethers.keccak256(ethers.toUtf8Bytes("CONTROL"));

      const id = await alphanumericID.testGenerateOrganizationID(
        moduleId, 1, deployer.address, 0
      );

      expect(id).to.have.length(18);
    });

        it("Should handle max timestamp", async function () {
      const moduleId = ethers.keccak256(ethers.toUtf8Bytes("CONTROL"));
      const maxTimestamp = 2**32 - 1; // Max uint32

      const id = await alphanumericID.testGenerateOrganizationID(
        moduleId, 1, deployer.address, maxTimestamp
      );

      expect(id).to.have.length(18);
    });
  });
});
