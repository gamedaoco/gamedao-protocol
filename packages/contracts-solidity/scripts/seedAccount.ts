import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

function getDeployment(): any {
  const deploymentPath = path.join(__dirname, "../deployment-addresses.json");
  if (!fs.existsSync(deploymentPath)) {
    throw new Error("deployment-addresses.json not found. Deploy contracts first.");
  }
  return JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
}

export async function seedAccount(
  recipient: string,
  ethAmount: string = "10.0",
  gameAmount: string = "100000",
  usdcAmount: string = "10000"
) {
  if (!ethers.isAddress(recipient)) {
    throw new Error(`Invalid address: ${recipient}`);
  }

  const deployment = getDeployment();
  const [deployer] = await ethers.getSigners();

  console.log(`\n💰 Seeding account ${recipient}`);
  console.log(`📋 From deployer: ${deployer.address}`);
  console.log("─".repeat(60));

  // Send ETH
  const ethWei = ethers.parseEther(ethAmount);
  const ethTx = await deployer.sendTransaction({ to: recipient, value: ethWei });
  await ethTx.wait();
  console.log(`  ETH:  ${ethAmount} ✅`);

  // Send GAME tokens
  const gameTokenAddress = deployment.contracts.GameToken || deployment.contracts.MockGameToken;
  if (gameTokenAddress) {
    const gameToken = await ethers.getContractAt("MockGameToken", gameTokenAddress);
    const gameWei = ethers.parseEther(gameAmount);

    const balance = await gameToken.balanceOf(deployer.address);
    if (balance < gameWei) {
      const mintAmount = gameWei - balance;
      await (await (gameToken as any).connect(deployer).mint(deployer.address, mintAmount)).wait();
    }
    await (await (gameToken as any).connect(deployer).transfer(recipient, gameWei)).wait();
    console.log(`  GAME: ${gameAmount} ✅`);
  } else {
    console.log("  GAME: ⚠️  no GameToken in deployment");
  }

  // Send USDC
  const usdcAddress = deployment.contracts.MockUSDC;
  if (usdcAddress) {
    const usdc = await ethers.getContractAt("MockUSDC", usdcAddress);
    const usdcWei = ethers.parseUnits(usdcAmount, 6);

    const balance = await usdc.balanceOf(deployer.address);
    if (balance < usdcWei) {
      const mintAmount = usdcWei - balance;
      await (await (usdc as any).connect(deployer).mint(deployer.address, mintAmount)).wait();
    }
    await (await (usdc as any).connect(deployer).transfer(recipient, usdcWei)).wait();
    console.log(`  USDC: ${usdcAmount} ✅`);
  } else {
    console.log("  USDC: ⚠️  no MockUSDC in deployment");
  }

  console.log(`\n✅ Account seeded successfully\n`);
}
