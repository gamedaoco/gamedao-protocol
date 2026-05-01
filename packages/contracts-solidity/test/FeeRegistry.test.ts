import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { FeeRegistry } from "../typechain-types";

const FEE_ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("FEE_ADMIN_ROLE"));
const DEFAULT_ADMIN_ROLE = "0x" + "00".repeat(32);

const FLAT = 0;
const BPS = 1;

// Selectors we exercise — the actual on-chain selectors live on the
// modules; these are arbitrary 4-byte values for the test, since the
// registry just keys on bytes4.
const SEL_CREATE_ORG = "0xaaaaaaaa";
const SEL_CONTRIBUTE = "0xbbbbbbbb";
const SEL_UNCONFIGURED = "0xcccccccc";

describe("FeeRegistry", function () {
  let registry: FeeRegistry;
  let admin: SignerWithAddress;
  let treasury: SignerWithAddress;
  let outsider: SignerWithAddress;
  let nextTreasury: SignerWithAddress;

  beforeEach(async function () {
    [admin, treasury, outsider, nextTreasury] = await ethers.getSigners();
    const RegistryFactory = await ethers.getContractFactory("FeeRegistry");
    registry = (await RegistryFactory.deploy(admin.address, treasury.address)) as FeeRegistry;
    await registry.waitForDeployment();
  });

  describe("deploy", function () {
    it("rejects zero admin", async function () {
      const RegistryFactory = await ethers.getContractFactory("FeeRegistry");
      await expect(
        RegistryFactory.deploy(ethers.ZeroAddress, treasury.address),
      ).to.be.revertedWith("FeeRegistry: admin = 0");
    });

    it("rejects zero treasury", async function () {
      const RegistryFactory = await ethers.getContractFactory("FeeRegistry");
      await expect(
        RegistryFactory.deploy(admin.address, ethers.ZeroAddress),
      ).to.be.revertedWith("FeeRegistry: treasury = 0");
    });

    it("grants admin both DEFAULT_ADMIN_ROLE and FEE_ADMIN_ROLE", async function () {
      expect(await registry.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.equal(true);
      expect(await registry.hasRole(FEE_ADMIN_ROLE, admin.address)).to.equal(true);
    });

    it("stores the initial treasury", async function () {
      expect(await registry.treasury()).to.equal(treasury.address);
    });
  });

  describe("setFee", function () {
    it("sets a FLAT fee and emits FeeSet", async function () {
      const amount = 11_000_000n; // 11 USDC at 6 decimals
      await expect(registry.connect(admin).setFee(SEL_CREATE_ORG, FLAT, amount))
        .to.emit(registry, "FeeSet")
        .withArgs(SEL_CREATE_ORG, FLAT, amount);

      const [kind, stored] = await registry.getFee(SEL_CREATE_ORG);
      expect(kind).to.equal(FLAT);
      expect(stored).to.equal(amount);
    });

    it("sets a BPS fee and emits FeeSet", async function () {
      const bps = 100n; // 1%
      await expect(registry.connect(admin).setFee(SEL_CONTRIBUTE, BPS, bps))
        .to.emit(registry, "FeeSet")
        .withArgs(SEL_CONTRIBUTE, BPS, bps);

      const [kind, stored] = await registry.getFee(SEL_CONTRIBUTE);
      expect(kind).to.equal(BPS);
      expect(stored).to.equal(bps);
    });

    it("rejects BPS values above the denominator", async function () {
      await expect(
        registry.connect(admin).setFee(SEL_CONTRIBUTE, BPS, 10_001),
      ).to.be.revertedWith("FeeRegistry: bps > 10000");
    });

    it("accepts BPS = 10000 (=100%) at the boundary", async function () {
      await registry.connect(admin).setFee(SEL_CONTRIBUTE, BPS, 10_000);
      const [, stored] = await registry.getFee(SEL_CONTRIBUTE);
      expect(stored).to.equal(10_000);
    });

    it("rejects callers without FEE_ADMIN_ROLE", async function () {
      await expect(
        registry.connect(outsider).setFee(SEL_CREATE_ORG, FLAT, 11_000_000n),
      ).to.be.reverted;
    });

    it("can be re-applied to update an existing selector", async function () {
      await registry.connect(admin).setFee(SEL_CONTRIBUTE, BPS, 100);
      await registry.connect(admin).setFee(SEL_CONTRIBUTE, BPS, 200);
      const [, stored] = await registry.getFee(SEL_CONTRIBUTE);
      expect(stored).to.equal(200n);
    });
  });

  describe("clearFee", function () {
    it("removes a previously-set fee and emits FeeCleared", async function () {
      await registry.connect(admin).setFee(SEL_CREATE_ORG, FLAT, 11_000_000n);
      await expect(registry.connect(admin).clearFee(SEL_CREATE_ORG))
        .to.emit(registry, "FeeCleared")
        .withArgs(SEL_CREATE_ORG);

      const [, stored] = await registry.getFee(SEL_CREATE_ORG);
      expect(stored).to.equal(0n);
    });

    it("rejects callers without FEE_ADMIN_ROLE", async function () {
      await expect(registry.connect(outsider).clearFee(SEL_CREATE_ORG)).to.be.reverted;
    });
  });

  describe("setTreasury", function () {
    it("rotates the treasury and emits TreasuryUpdated", async function () {
      await expect(registry.connect(admin).setTreasury(nextTreasury.address))
        .to.emit(registry, "TreasuryUpdated")
        .withArgs(treasury.address, nextTreasury.address);

      expect(await registry.treasury()).to.equal(nextTreasury.address);
    });

    it("rejects zero address", async function () {
      await expect(
        registry.connect(admin).setTreasury(ethers.ZeroAddress),
      ).to.be.revertedWith("FeeRegistry: treasury = 0");
    });

    it("rejects callers without FEE_ADMIN_ROLE", async function () {
      await expect(
        registry.connect(outsider).setTreasury(nextTreasury.address),
      ).to.be.reverted;
    });
  });

  describe("computeFee", function () {
    it("returns 0 for unconfigured selectors regardless of value", async function () {
      expect(await registry.computeFee(SEL_UNCONFIGURED, 0)).to.equal(0n);
      expect(await registry.computeFee(SEL_UNCONFIGURED, ethers.parseEther("1000"))).to.equal(0n);
    });

    it("returns the FLAT amount and ignores `value`", async function () {
      const flat = 11_000_000n;
      await registry.connect(admin).setFee(SEL_CREATE_ORG, FLAT, flat);

      // value should be ignored for FLAT
      expect(await registry.computeFee(SEL_CREATE_ORG, 0)).to.equal(flat);
      expect(await registry.computeFee(SEL_CREATE_ORG, 999n)).to.equal(flat);
      expect(await registry.computeFee(SEL_CREATE_ORG, 10n ** 24n)).to.equal(flat);
    });

    it("returns value * bps / 10000 for BPS fees", async function () {
      // 1% (= 100 BPS)
      await registry.connect(admin).setFee(SEL_CONTRIBUTE, BPS, 100);

      expect(await registry.computeFee(SEL_CONTRIBUTE, 100_000_000n)).to.equal(1_000_000n); // 1% of 100 USDC = 1 USDC
      expect(await registry.computeFee(SEL_CONTRIBUTE, 0)).to.equal(0n);
      expect(await registry.computeFee(SEL_CONTRIBUTE, 9_999n)).to.equal(99n); // floor division
    });

    it("returns 0 when BPS amount is 0 (configured-but-disabled)", async function () {
      await registry.connect(admin).setFee(SEL_CONTRIBUTE, BPS, 0);
      expect(await registry.computeFee(SEL_CONTRIBUTE, 1_000_000_000n)).to.equal(0n);
    });
  });
});
