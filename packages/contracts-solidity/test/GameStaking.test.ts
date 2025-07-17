import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { Staking, MockGameToken } from "../typechain-types";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("Staking", function () {
  let staking: Staking;
  let gameToken: MockGameToken;
  let deployer: SignerWithAddress;
  let treasury: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let slasher: SignerWithAddress;

  const INITIAL_SUPPLY = ethers.parseEther("1000000"); // 1M tokens
  const STAKE_AMOUNT = ethers.parseEther("1000"); // 1k tokens
  const REWARD_AMOUNT = ethers.parseEther("10000"); // 10k tokens for rewards

  // Staking purposes enum values
  const StakingPurpose = {
    GOVERNANCE: 0,
    DAO_CREATION: 1,
    TREASURY_BOND: 2,
    LIQUIDITY_MINING: 3
  };

  // Unstaking strategies enum values
  const UnstakingStrategy = {
    RAGE_QUIT: 0,
    STANDARD: 1,
    PATIENT: 2
  };

  beforeEach(async function () {
    [deployer, treasury, user1, user2, slasher] = await ethers.getSigners();

    // Deploy MockGameToken
    const GameTokenFactory = await ethers.getContractFactory("MockGameToken");
    gameToken = await GameTokenFactory.deploy();
    await gameToken.waitForDeployment();

    // Deploy GameStaking
    const StakingFactory = await ethers.getContractFactory("Staking");
    staking = await StakingFactory.deploy(
      await gameToken.getAddress(),
      treasury.address,
      1000 // 10% protocol fee share
    );
    await staking.waitForDeployment();

    // Setup roles
    const SLASHER_ROLE = await staking.SLASHER_ROLE();
    await staking.grantRole(SLASHER_ROLE, slasher.address);

    // Distribute tokens to users
    await gameToken.transfer(user1.address, ethers.parseEther("50000"));
    await gameToken.transfer(user2.address, ethers.parseEther("50000"));
    await gameToken.transfer(await staking.getAddress(), REWARD_AMOUNT);
  });

  describe("Deployment", function () {
    it("Should set the correct game token", async function () {
      expect(await staking.gameToken()).to.equal(await gameToken.getAddress());
    });

    it("Should set the correct treasury", async function () {
      expect(await staking.treasury()).to.equal(treasury.address);
    });

    it("Should initialize staking pools with correct rates", async function () {
      const governancePool = await staking.getPoolInfo(StakingPurpose.GOVERNANCE);
      expect(governancePool.rewardRate).to.equal(300); // 3% APY

      const daoCreationPool = await staking.getPoolInfo(StakingPurpose.DAO_CREATION);
      expect(daoCreationPool.rewardRate).to.equal(800); // 8% APY

      const treasuryBondPool = await staking.getPoolInfo(StakingPurpose.TREASURY_BOND);
      expect(treasuryBondPool.rewardRate).to.equal(1200); // 12% APY

      const liquidityMiningPool = await staking.getPoolInfo(StakingPurpose.LIQUIDITY_MINING);
      expect(liquidityMiningPool.rewardRate).to.equal(600); // 6% APY
    });
  });

  describe("Staking", function () {
    it("Should allow users to stake tokens", async function () {
      await gameToken.connect(user1).approve(await staking.getAddress(), STAKE_AMOUNT);

      await expect(
        staking.connect(user1).stake(
          StakingPurpose.DAO_CREATION,
          STAKE_AMOUNT,
          UnstakingStrategy.STANDARD
        )
      ).to.emit(staking, "Staked");

      const stakeInfo = await staking.getStakeInfo(user1.address, StakingPurpose.DAO_CREATION);
      expect(stakeInfo.amount).to.equal(STAKE_AMOUNT);
      expect(stakeInfo.strategy).to.equal(UnstakingStrategy.STANDARD);
    });

    it("Should reject staking below minimum amount", async function () {
      const smallAmount = ethers.parseEther("0.5"); // Below 1 GAME minimum
      await gameToken.connect(user1).approve(await staking.getAddress(), smallAmount);

      await expect(
        staking.connect(user1).stake(
          StakingPurpose.GOVERNANCE,
          smallAmount,
          UnstakingStrategy.STANDARD
        )
      ).to.be.revertedWith("Amount too small");
    });

    it("Should update pool total staked amount", async function () {
      await gameToken.connect(user1).approve(await staking.getAddress(), STAKE_AMOUNT);
      await staking.connect(user1).stake(
        StakingPurpose.DAO_CREATION,
        STAKE_AMOUNT,
        UnstakingStrategy.STANDARD
      );

      const poolInfo = await staking.getPoolInfo(StakingPurpose.DAO_CREATION);
      expect(poolInfo.totalStaked).to.equal(STAKE_AMOUNT);
    });
  });

  describe("Unstaking", function () {
    beforeEach(async function () {
      // Stake some tokens first
      await gameToken.connect(user1).approve(await staking.getAddress(), STAKE_AMOUNT);
      await staking.connect(user1).stake(
        StakingPurpose.DAO_CREATION,
        STAKE_AMOUNT,
        UnstakingStrategy.STANDARD
      );
    });

    it("Should allow users to request unstaking", async function () {
      const unstakeAmount = ethers.parseEther("500");

      await expect(
        staking.connect(user1).requestUnstake(
          StakingPurpose.DAO_CREATION,
          unstakeAmount,
          UnstakingStrategy.STANDARD
        )
      ).to.emit(staking, "UnstakeRequested");

      const request = await staking.unstakeRequests(user1.address, 0);
      expect(request.amount).to.equal(unstakeAmount);
      expect(request.strategy).to.equal(UnstakingStrategy.STANDARD);
      expect(request.processed).to.be.false;
    });

    it("Should process unstake request after delay", async function () {
      const unstakeAmount = ethers.parseEther("500");

      // Request unstaking
      await staking.connect(user1).requestUnstake(
        StakingPurpose.DAO_CREATION,
        unstakeAmount,
        UnstakingStrategy.STANDARD
      );

      // Fast forward 7 days for STANDARD strategy
      await time.increase(7 * 24 * 60 * 60);

      const balanceBefore = await gameToken.balanceOf(user1.address);

      await expect(
        staking.connect(user1).processUnstake(StakingPurpose.DAO_CREATION, 0)
      ).to.emit(staking, "Unstaked")
        .withArgs(user1.address, StakingPurpose.DAO_CREATION, unstakeAmount, 0, await time.latest() + 1);

      const balanceAfter = await gameToken.balanceOf(user1.address);
      expect(balanceAfter - balanceBefore).to.equal(unstakeAmount);
    });

    it("Should apply penalty for rage quit", async function () {
      const unstakeAmount = ethers.parseEther("500");

      // Request rage quit
      await staking.connect(user1).requestUnstake(
        StakingPurpose.DAO_CREATION,
        unstakeAmount,
        UnstakingStrategy.RAGE_QUIT
      );

      const balanceBefore = await gameToken.balanceOf(user1.address);
      const treasuryBalanceBefore = await gameToken.balanceOf(treasury.address);

      // Process immediately (no delay for rage quit)
      await staking.connect(user1).processUnstake(StakingPurpose.DAO_CREATION, 0);

      const balanceAfter = await gameToken.balanceOf(user1.address);
      const treasuryBalanceAfter = await gameToken.balanceOf(treasury.address);

      const expectedPenalty = (unstakeAmount * 2000n) / 10000n; // 20% penalty
      const expectedReceived = unstakeAmount - expectedPenalty;

      expect(balanceAfter - balanceBefore).to.equal(expectedReceived);
      expect(treasuryBalanceAfter - treasuryBalanceBefore).to.equal(expectedPenalty);
    });

    it("Should not allow processing before delay", async function () {
      const unstakeAmount = ethers.parseEther("500");

      await staking.connect(user1).requestUnstake(
        StakingPurpose.DAO_CREATION,
        unstakeAmount,
        UnstakingStrategy.STANDARD
      );

      // Try to process immediately (should fail for STANDARD strategy)
      await expect(
        staking.connect(user1).processUnstake(StakingPurpose.DAO_CREATION, 0)
      ).to.be.revertedWith("Cannot process yet");
    });
  });

  describe("Rewards", function () {
    beforeEach(async function () {
      // Stake some tokens
      await gameToken.connect(user1).approve(await staking.getAddress(), STAKE_AMOUNT);
      await staking.connect(user1).stake(
        StakingPurpose.DAO_CREATION,
        STAKE_AMOUNT,
        UnstakingStrategy.PATIENT
      );
    });

    it("Should accumulate rewards over time", async function () {
      // Fast forward 30 days
      await time.increase(30 * 24 * 60 * 60);

      const pendingRewards = await staking.getPendingRewards(user1.address, StakingPurpose.DAO_CREATION);
      expect(pendingRewards).to.be.gt(0);
    });

    it("Should allow claiming rewards", async function () {
      // Fast forward to accumulate rewards
      await time.increase(30 * 24 * 60 * 60);

      const balanceBefore = await gameToken.balanceOf(user1.address);
      const pendingRewards = await staking.getPendingRewards(user1.address, StakingPurpose.DAO_CREATION);

      await expect(
        staking.connect(user1).claimRewards(StakingPurpose.DAO_CREATION)
      ).to.emit(staking, "RewardsClaimed");

      const balanceAfter = await gameToken.balanceOf(user1.address);
      expect(balanceAfter - balanceBefore).to.be.gt(pendingRewards); // Should be more due to PATIENT bonus
    });

    it("Should apply patient strategy bonus", async function () {
      // Fast forward to accumulate rewards
      await time.increase(30 * 24 * 60 * 60);

      const pendingRewards = await staking.getPendingRewards(user1.address, StakingPurpose.DAO_CREATION);
      const balanceBefore = await gameToken.balanceOf(user1.address);

      await staking.connect(user1).claimRewards(StakingPurpose.DAO_CREATION);

      const balanceAfter = await gameToken.balanceOf(user1.address);
      const received = balanceAfter - balanceBefore;

      // PATIENT strategy should give 5% bonus - check that we got more than base rewards
      expect(received).to.be.gt(pendingRewards);
    });

    it("Should distribute external rewards", async function () {
      const REWARD_DISTRIBUTOR_ROLE = await staking.REWARD_DISTRIBUTOR_ROLE();
      await staking.grantRole(REWARD_DISTRIBUTOR_ROLE, deployer.address);

      const distributionAmount = ethers.parseEther("1000");
      await gameToken.approve(await staking.getAddress(), distributionAmount);

      await expect(
        staking.distributeRewards(StakingPurpose.DAO_CREATION, distributionAmount)
      ).to.emit(staking, "RewardsDistributed");

      const poolInfo = await staking.getPoolInfo(StakingPurpose.DAO_CREATION);
      expect(poolInfo.totalRewardsDistributed).to.be.gt(0);
    });
  });

  describe("Slashing", function () {
    beforeEach(async function () {
      // Stake some tokens
      await gameToken.connect(user1).approve(await staking.getAddress(), STAKE_AMOUNT);
      await staking.connect(user1).stake(
        StakingPurpose.DAO_CREATION,
        STAKE_AMOUNT,
        UnstakingStrategy.STANDARD
      );
    });

    it("Should allow slashers to slash stakes", async function () {
      const slashAmount = ethers.parseEther("200");
      const treasuryBalanceBefore = await gameToken.balanceOf(treasury.address);

      await expect(
        staking.connect(slasher).slash(
          user1.address,
          StakingPurpose.DAO_CREATION,
          slashAmount,
          "Bad behavior"
        )
      ).to.emit(staking, "Slashed")
        .withArgs(user1.address, StakingPurpose.DAO_CREATION, slashAmount, slasher.address, "Bad behavior", await time.latest() + 1);

      const stakeInfo = await staking.getStakeInfo(user1.address, StakingPurpose.DAO_CREATION);
      expect(stakeInfo.amount).to.equal(STAKE_AMOUNT - slashAmount);

      const treasuryBalanceAfter = await gameToken.balanceOf(treasury.address);
      expect(treasuryBalanceAfter - treasuryBalanceBefore).to.equal(slashAmount);

      expect(await staking.slashedUsers(user1.address)).to.be.true;
    });

    it("Should prevent slashed users from staking", async function () {
      // Slash user first
      await staking.connect(slasher).slash(
        user1.address,
        StakingPurpose.DAO_CREATION,
        ethers.parseEther("100"),
        "Bad behavior"
      );

      // Try to stake more
      await gameToken.connect(user1).approve(await staking.getAddress(), STAKE_AMOUNT);
      await expect(
        staking.connect(user1).stake(
          StakingPurpose.GOVERNANCE,
          STAKE_AMOUNT,
          UnstakingStrategy.STANDARD
        )
      ).to.be.revertedWith("User is slashed");
    });

    it("Should not allow non-slashers to slash", async function () {
      await expect(
        staking.connect(user2).slash(
          user1.address,
          StakingPurpose.DAO_CREATION,
          ethers.parseEther("100"),
          "Bad behavior"
        )
      ).to.be.reverted;
    });
  });

  describe("Pool Management", function () {
    it("Should allow admin to update pool settings", async function () {
      const newRewardRate = 500; // 5% APY

      await expect(
        staking.updatePool(StakingPurpose.GOVERNANCE, newRewardRate, true)
      ).to.emit(staking, "PoolUpdated")
        .withArgs(StakingPurpose.GOVERNANCE, newRewardRate, true);

      const poolInfo = await staking.getPoolInfo(StakingPurpose.GOVERNANCE);
      expect(poolInfo.rewardRate).to.equal(newRewardRate);
      expect(poolInfo.active).to.be.true;
    });

    it("Should not allow setting reward rate too high", async function () {
      const tooHighRate = 1500; // 15% APY (above 10% max)

      await expect(
        staking.updatePool(StakingPurpose.GOVERNANCE, tooHighRate, true)
      ).to.be.revertedWith("Rate too high");
    });

    it("Should prevent staking in inactive pools", async function () {
      // Deactivate pool
      await staking.updatePool(StakingPurpose.GOVERNANCE, 300, false);

      await gameToken.connect(user1).approve(await staking.getAddress(), STAKE_AMOUNT);
      await expect(
        staking.connect(user1).stake(
          StakingPurpose.GOVERNANCE,
          STAKE_AMOUNT,
          UnstakingStrategy.STANDARD
        )
      ).to.be.revertedWith("Pool not active");
    });
  });

  describe("Emergency Functions", function () {
    it("Should allow admin to pause contract", async function () {
      await staking.pause();
      expect(await staking.paused()).to.be.true;

      await gameToken.connect(user1).approve(await staking.getAddress(), STAKE_AMOUNT);
      await expect(
        staking.connect(user1).stake(
          StakingPurpose.GOVERNANCE,
          STAKE_AMOUNT,
          UnstakingStrategy.STANDARD
        )
      ).to.be.reverted;
    });

    it("Should allow admin to update treasury", async function () {
      const newTreasury = user2.address;
      await staking.setTreasury(newTreasury);
      expect(await staking.treasury()).to.equal(newTreasury);
    });

    it("Should allow emergency token withdrawal", async function () {
      const emergencyAmount = ethers.parseEther("1000");
      const treasuryBalanceBefore = await gameToken.balanceOf(treasury.address);

      await staking.emergencyWithdraw(await gameToken.getAddress(), emergencyAmount);

      const treasuryBalanceAfter = await gameToken.balanceOf(treasury.address);
      expect(treasuryBalanceAfter - treasuryBalanceBefore).to.equal(emergencyAmount);
    });
  });
});
