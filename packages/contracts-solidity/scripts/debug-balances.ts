import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  console.log("🔍 Debug: Checking GAME token balances...");

  // Load deployment data
  const deploymentPath = path.join(__dirname, "../deployment-addresses.json");
  if (!fs.existsSync(deploymentPath)) {
    console.error("❌ Deployment file not found. Please run deploy script first.");
    return;
  }

  const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  const gameTokenAddress = deploymentData.gameToken;

  console.log(`📍 GAME Token Address: ${gameTokenAddress}`);

  // Get accounts
  const accounts = await ethers.getSigners();
  const gameToken = await ethers.getContractAt("MockGameToken", gameTokenAddress);

  console.log("\n💰 Token Balances:");
  console.log("=".repeat(80));

  for (let i = 0; i < Math.min(accounts.length, 5); i++) {
    const account = accounts[i];
    const balance = await gameToken.balanceOf(account.address);
    const staked = await gameToken.getTotalStaked(account.address);
    const available = await gameToken.getAvailableBalance(account.address);

    console.log(`Account ${i} (${account.address.slice(0, 8)}...):`);
    console.log(`  Total Balance: ${ethers.formatEther(balance)} GAME`);
    console.log(`  Total Staked:  ${ethers.formatEther(staked)} GAME`);
    console.log(`  Available:     ${ethers.formatEther(available)} GAME`);
    console.log("");
  }

  // Test staking with account 1
  console.log("🧪 Testing GAME token staking with account 1...");
  const testAccount = accounts[1];
  const stakeAmount = ethers.parseEther("1000");

  try {
    console.log(`Attempting to stake ${ethers.formatEther(stakeAmount)} GAME tokens...`);

    const balance = await gameToken.balanceOf(testAccount.address);
    console.log(`Account balance: ${ethers.formatEther(balance)} GAME`);

    if (balance < stakeAmount) {
      console.log("❌ Insufficient balance for staking!");
      return;
    }

    // Try the stake transaction
    const GAME_STAKE_PURPOSE = ethers.keccak256(ethers.toUtf8Bytes("DAO_CREATION"));
    const tx = await gameToken.connect(testAccount).stake(GAME_STAKE_PURPOSE, stakeAmount);
    await tx.wait();

    console.log("✅ Staking successful!");

    const newStaked = await gameToken.getTotalStaked(testAccount.address);
    console.log(`New staked amount: ${ethers.formatEther(newStaked)} GAME`);

  } catch (error: any) {
    console.log(`❌ Staking failed: ${error.message}`);

    // Check if it's a revert with reason
    if (error.reason) {
      console.log(`Revert reason: ${error.reason}`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
