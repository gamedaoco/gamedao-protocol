import { ethers } from "hardhat";
import { GameStaking, MockGameToken } from "../typechain-types";
import * as fs from "fs";
import * as path from "path";

// Load deployment addresses
function loadDeploymentAddresses() {
  const deploymentFile = path.join(__dirname, '..', 'deployment-addresses.json');
  if (!fs.existsSync(deploymentFile)) {
    throw new Error("Deployment addresses not found. Run deployment script first.");
  }
  return JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
}

// Staking purposes enum
const StakingPurpose = {
  GOVERNANCE: 0,
  DAO_CREATION: 1,
  TREASURY_BOND: 2,
  LIQUIDITY_MINING: 3
};

// Unstaking strategies enum
const UnstakingStrategy = {
  RAGE_QUIT: 0,
  STANDARD: 1,
  PATIENT: 2
};

// Purpose names for display
const PurposeNames = {
  [StakingPurpose.GOVERNANCE]: "Governance",
  [StakingPurpose.DAO_CREATION]: "DAO Creation",
  [StakingPurpose.TREASURY_BOND]: "Treasury Bond",
  [StakingPurpose.LIQUIDITY_MINING]: "Liquidity Mining"
};

// Strategy names for display
const StrategyNames = {
  [UnstakingStrategy.RAGE_QUIT]: "Rage Quit (Instant, 20% penalty)",
  [UnstakingStrategy.STANDARD]: "Standard (7 days, normal rewards)",
  [UnstakingStrategy.PATIENT]: "Patient (30 days, 5% bonus)"
};

// Helper functions
function getUnstakingDelay(strategy: number): number {
  if (strategy === UnstakingStrategy.RAGE_QUIT) {
    return 0;
  } else if (strategy === UnstakingStrategy.STANDARD) {
    return 7 * 24 * 60 * 60; // 7 days in seconds
  } else {
    return 30 * 24 * 60 * 60; // 30 days in seconds
  }
}

function calculateUnlockTime(request: any): number {
  const requestTime = Number(request.requestTime);
  const delay = getUnstakingDelay(Number(request.strategy));
  return requestTime + delay;
}

function canProcessUnstake(request: any): boolean {
  const unlockTime = calculateUnlockTime(request);
  const currentTime = Math.floor(Date.now() / 1000);
  return currentTime >= unlockTime;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const addresses = loadDeploymentAddresses();

  // Get contract instances
  const gameToken = await ethers.getContractAt("MockGameToken", addresses.gameToken) as MockGameToken;
  const gameStaking = await ethers.getContractAt("GameStaking", addresses.gameStaking) as GameStaking;

  console.log("🎯 GameDAO Staking Management Utility");
  console.log("====================================");
  console.log("GAME Token:", addresses.gameToken);
  console.log("GameStaking:", addresses.gameStaking);
  console.log("Current User:", deployer.address);
  console.log("");

  // Check user's GAME token balance
  const gameBalance = await gameToken.balanceOf(deployer.address);
  console.log("💰 Your GAME Balance:", ethers.formatEther(gameBalance), "GAME");
  console.log("");

  // Display all staking pools
  console.log("📊 STAKING POOLS OVERVIEW");
  console.log("========================");

  for (let purpose = 0; purpose <= 3; purpose++) {
    const poolInfo = await gameStaking.getPoolInfo(purpose);
    const userStake = await gameStaking.getStakeInfo(deployer.address, purpose);
    const pendingRewards = await gameStaking.getPendingRewards(deployer.address, purpose);

    console.log(`\n🎯 ${PurposeNames[purpose]}`);
    console.log(`   APY: ${Number(poolInfo.rewardRate) / 100}%`);
    console.log(`   Total Staked: ${ethers.formatEther(poolInfo.totalStaked)} GAME`);
    console.log(`   Active: ${poolInfo.active ? '✅' : '❌'}`);
    console.log(`   Your Stake: ${ethers.formatEther(userStake.amount)} GAME`);

    if (userStake.amount > 0) {
      console.log(`   Your Strategy: ${StrategyNames[Number(userStake.strategy)]}`);
      console.log(`   Pending Rewards: ${ethers.formatEther(pendingRewards)} GAME`);
    }
  }
  console.log("");

    // Check for pending unstake requests
  console.log("⏳ PENDING UNSTAKE REQUESTS");
  console.log("==========================");

  let hasRequests = false;
  try {
    let requestIndex = 0;
    while (true) {
      const request = await gameStaking.unstakeRequests(deployer.address, requestIndex);
      if (request.amount === 0n) break;

      hasRequests = true;
      const canProcess = await canProcessUnstake(request);
      const unlockTime = calculateUnlockTime(request);
      const timeLeft = unlockTime > Math.floor(Date.now() / 1000)
        ? unlockTime - Math.floor(Date.now() / 1000)
        : 0;

      console.log(`\n📋 Request #${requestIndex}`);
      console.log(`   Amount: ${ethers.formatEther(request.amount)} GAME`);
      console.log(`   Strategy: ${StrategyNames[Number(request.strategy)]}`);
      console.log(`   Status: ${request.processed ? '✅ Processed' : canProcess ? '🟢 Ready' : `⏳ ${Math.ceil(timeLeft / 3600)} hours left`}`);

      requestIndex++;
    }
  } catch (error) {
    // No more requests
  }

  if (!hasRequests) {
    console.log("No pending unstake requests");
  }
  console.log("");

  // Example operations
  console.log("🛠️  EXAMPLE OPERATIONS");
  console.log("======================");
  console.log("1. Stake 1000 GAME for DAO Creation:");
  console.log("   npx hardhat run scripts/staking-utils.ts --network localhost -- stake 1 1000 1");
  console.log("");
  console.log("2. Claim rewards from Governance pool:");
  console.log("   npx hardhat run scripts/staking-utils.ts --network localhost -- claim 0");
  console.log("");
  console.log("3. Request unstaking 500 GAME from DAO Creation with Standard strategy:");
  console.log("   npx hardhat run scripts/staking-utils.ts --network localhost -- unstake 1 500 1");
  console.log("");
  console.log("4. Process unstake request #0 for DAO Creation:");
  console.log("   npx hardhat run scripts/staking-utils.ts --network localhost -- process 1 0");
  console.log("");

        console.log("📈 STAKING REWARDS ACCRUING");
  console.log("===========================");
  console.log("Rewards are now accruing for your staked tokens!");
  console.log("• Governance Pool: 3% APY with Patient strategy (5% bonus)");
  console.log("• Treasury Bond Pool: 12% APY with Standard strategy");
  console.log("• You have an active unstake request that can be processed");
  console.log("");

  // Handle command line arguments (skip hardhat run and script name)
  const args = process.argv.slice(4); // Skip node, hardhat, run, script.ts
  if (args.length > 0) {
    const command = args[0];

    switch (command) {
      case "stake":
        if (args.length !== 4) {
          console.log("❌ Usage: stake <purpose> <amount> <strategy>");
          console.log("   purpose: 0=Governance, 1=DAO_Creation, 2=Treasury_Bond, 3=Liquidity_Mining");
          console.log("   amount: Amount in GAME tokens");
          console.log("   strategy: 0=Rage_Quit, 1=Standard, 2=Patient");
          break;
        }
        await stakeTokens(gameToken, gameStaking, parseInt(args[1]), args[2], parseInt(args[3]));
        break;

      case "claim":
        if (args.length !== 2) {
          console.log("❌ Usage: claim <purpose>");
          break;
        }
        await claimRewards(gameStaking, parseInt(args[1]));
        break;

      case "unstake":
        if (args.length !== 4) {
          console.log("❌ Usage: unstake <purpose> <amount> <strategy>");
          break;
        }
        await requestUnstake(gameStaking, parseInt(args[1]), args[2], parseInt(args[3]));
        break;

      case "process":
        if (args.length !== 3) {
          console.log("❌ Usage: process <purpose> <requestIndex>");
          break;
        }
        await processUnstake(gameStaking, parseInt(args[1]), parseInt(args[2]));
        break;

      default:
        console.log("❌ Unknown command:", command);
        console.log("Available commands: stake, claim, unstake, process");
    }
  }
}

async function stakeTokens(
  gameToken: MockGameToken,
  gameStaking: GameStaking,
  purpose: number,
  amountStr: string,
  strategy: number
) {
  console.log(`\n🔄 Staking ${amountStr} GAME for ${PurposeNames[purpose]}...`);

  const amount = ethers.parseEther(amountStr);

  // Check balance
  const [deployer] = await ethers.getSigners();
  const balance = await gameToken.balanceOf(deployer.address);
  if (balance < amount) {
    console.log("❌ Insufficient GAME balance");
    return;
  }

  // Approve tokens
  console.log("📝 Approving tokens...");
  const approveTx = await gameToken.approve(await gameStaking.getAddress(), amount);
  await approveTx.wait();

  // Stake tokens
  console.log("🎯 Staking tokens...");
  const stakeTx = await gameStaking.stake(purpose, amount, strategy);
  await stakeTx.wait();

  console.log("✅ Staking successful!");
  console.log(`   Purpose: ${PurposeNames[purpose]}`);
  console.log(`   Amount: ${amountStr} GAME`);
  console.log(`   Strategy: ${StrategyNames[strategy]}`);
}

async function claimRewards(gameStaking: GameStaking, purpose: number) {
  console.log(`\n🎁 Claiming rewards from ${PurposeNames[purpose]}...`);

  const [deployer] = await ethers.getSigners();
  const pendingRewards = await gameStaking.getPendingRewards(deployer.address, purpose);

  if (pendingRewards === 0n) {
    console.log("❌ No rewards to claim");
    return;
  }

  console.log(`💰 Pending rewards: ${ethers.formatEther(pendingRewards)} GAME`);

  const claimTx = await gameStaking.claimRewards(purpose);
  await claimTx.wait();

  console.log("✅ Rewards claimed successfully!");
}

async function requestUnstake(
  gameStaking: GameStaking,
  purpose: number,
  amountStr: string,
  strategy: number
) {
  console.log(`\n⏳ Requesting unstake of ${amountStr} GAME from ${PurposeNames[purpose]}...`);

  const amount = ethers.parseEther(amountStr);

  // Check stake
  const [deployer] = await ethers.getSigners();
  const stakeInfo = await gameStaking.getStakeInfo(deployer.address, purpose);
  if (stakeInfo.amount < amount) {
    console.log("❌ Insufficient staked amount");
    return;
  }

  const unstakeTx = await gameStaking.requestUnstake(purpose, amount, strategy);
  await unstakeTx.wait();

  console.log("✅ Unstake request submitted!");
  console.log(`   Purpose: ${PurposeNames[purpose]}`);
  console.log(`   Amount: ${amountStr} GAME`);
  console.log(`   Strategy: ${StrategyNames[strategy]}`);

  if (strategy === UnstakingStrategy.RAGE_QUIT) {
    console.log("⚡ You can process this immediately (with 20% penalty)");
  } else if (strategy === UnstakingStrategy.STANDARD) {
    console.log("⏰ You can process this in 7 days");
  } else {
    console.log("⏰ You can process this in 30 days (with 5% bonus)");
  }
}

async function processUnstake(gameStaking: GameStaking, purpose: number, requestIndex: number) {
  console.log(`\n🔄 Processing unstake request #${requestIndex} for ${PurposeNames[purpose]}...`);

      const [deployer] = await ethers.getSigners();
  const unstakeRequest = await gameStaking.unstakeRequests(deployer.address, requestIndex);
  const canProcess = canProcessUnstake(unstakeRequest);

  if (!canProcess) {
    console.log("❌ Cannot process unstake request yet");
    return;
  }

  if (unstakeRequest.processed) {
    console.log("❌ Request already processed");
    return;
  }

  const processTx = await gameStaking.processUnstake(purpose, requestIndex);
  await processTx.wait();

  console.log("✅ Unstake processed successfully!");
  console.log(`   Amount: ${ethers.formatEther(unstakeRequest.amount)} GAME`);
  console.log(`   Strategy: ${StrategyNames[Number(unstakeRequest.strategy)]}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
