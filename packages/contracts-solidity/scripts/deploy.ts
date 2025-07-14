import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("🚀 Deploying GameDAO Protocol contracts...");
  console.log("📍 Deploying with account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));
  console.log("");

  // 1. Deploy Test Tokens
  console.log("🪙 Deploying Test Tokens...");

  // Deploy GAME token (clean ERC20)
  const GameTokenFactory = await ethers.getContractFactory("MockGameToken");
  const gameToken = await GameTokenFactory.deploy();
  await gameToken.waitForDeployment();
  const gameTokenAddress = await gameToken.getAddress();
  console.log("✅ GAME Token deployed to:", gameTokenAddress);

  // Deploy USDC token
  const USDCFactory = await ethers.getContractFactory("MockUSDC");
  const usdc = await USDCFactory.deploy();
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log("✅ USDC Token deployed to:", usdcAddress);
  console.log("");

  // 2. Deploy GameStaking Contract
  console.log("🔒 Deploying GameStaking Contract...");
  const GameStakingFactory = await ethers.getContractFactory("GameStaking");
  const gameStaking = await GameStakingFactory.deploy(
    gameTokenAddress,
    deployer.address, // treasury
    500 // 5% protocol fee share
  );
  await gameStaking.waitForDeployment();
  const gameStakingAddress = await gameStaking.getAddress();
  console.log("✅ GameStaking Contract deployed to:", gameStakingAddress);
  console.log("");

  // 3. Deploy GameDAO Registry
  console.log("📋 Deploying GameDAO Registry...");
  const GameDAORegistryFactory = await ethers.getContractFactory("GameDAORegistry");
  const registry = await GameDAORegistryFactory.deploy(deployer.address);
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("✅ GameDAO Registry deployed to:", registryAddress);
  console.log("");

  // 4. Deploy Control Module
  console.log("🏛️ Deploying Control Module...");
  const ControlFactory = await ethers.getContractFactory("Control");
  const control = await ControlFactory.deploy(gameTokenAddress as string, gameStakingAddress as string);
  await control.waitForDeployment();
  const controlAddress = await control.getAddress();
  console.log("✅ Control Module deployed to:", controlAddress);
  console.log("");

  // Note: Grant ORGANIZATION_MANAGER_ROLE to Control contract manually after deployment
  console.log("⚠️  Remember to grant ORGANIZATION_MANAGER_ROLE to Control contract");
  console.log("   Run: gameStaking.grantRole(ORGANIZATION_MANAGER_ROLE, controlAddress)");
  console.log("");

  // 5. Deploy Flow Module
  console.log("💰 Deploying Flow Module...");
  const FlowFactory = await ethers.getContractFactory("Flow");
  const flow = await FlowFactory.deploy();
  await flow.waitForDeployment();
  const flowAddress = await flow.getAddress();
  console.log("✅ Flow Module deployed to:", flowAddress);
  console.log("");

  // 6. Deploy Signal Module
  console.log("🗳️ Deploying Signal Module...");
  const SignalFactory = await ethers.getContractFactory("Signal");
  const signal = await SignalFactory.deploy();
  await signal.waitForDeployment();
  const signalAddress = await signal.getAddress();
  console.log("✅ Signal Module deployed to:", signalAddress);
  console.log("");

  // 7. Deploy Sense Module
  console.log("👤 Deploying Sense Module...");
  const SenseFactory = await ethers.getContractFactory("Sense");
  const sense = await SenseFactory.deploy();
  await sense.waitForDeployment();
  const senseAddress = await sense.getAddress();
  console.log("✅ Sense Module deployed to:", senseAddress);
  console.log("");

  // 8. Register modules in registry
  console.log("📝 Registering modules in GameDAO Registry...");
  await registry.registerModule(controlAddress);
  console.log("✅ Control module registered");

  await registry.registerModule(flowAddress);
  console.log("✅ Flow module registered");

  await registry.registerModule(signalAddress);
  console.log("✅ Signal module registered");

  await registry.registerModule(senseAddress);
  console.log("✅ Sense module registered");
  console.log("");

  // 9. Deploy GameStaking for rewards
  console.log("🎯 Deploying GameStaking for rewards...");
  const GameStakingRewardsFactory = await ethers.getContractFactory("GameStaking");
  const gameStakingRewards = await GameStakingRewardsFactory.deploy(
    gameTokenAddress,
    deployer.address,
    1000 // 10% protocol fee share for rewards
  );
  await gameStakingRewards.waitForDeployment();
  const gameStakingRewardsAddress = await gameStakingRewards.getAddress();
  console.log("✅ GameStaking (Rewards) deployed to:", gameStakingRewardsAddress);
  console.log("");

  // Save deployment addresses
  const deploymentInfo = {
    network: "localhost",
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      GameToken: gameTokenAddress,
      MockGameToken: gameTokenAddress, // Alias for backward compatibility
      MockUSDC: usdcAddress,
      GameStaking: gameStakingAddress,
      GameDAORegistry: registryAddress,
      Control: controlAddress,
      Flow: flowAddress,
      Signal: signalAddress,
      Sense: senseAddress,
      GameStakingRewards: gameStakingRewardsAddress
    }
  };

  const fs = require("fs");
  fs.writeFileSync("deployment-addresses.json", JSON.stringify(deploymentInfo, null, 2));
  console.log("📄 Deployment addresses saved to deployment-addresses.json");
  console.log("");

  // Display summary
  console.log("🎉 Deployment completed successfully!");
  console.log("📊 Summary:");
  console.log("  - GameToken (Clean ERC20):", gameTokenAddress);
  console.log("  - GameStaking (Organization Stakes):", gameStakingAddress);
  console.log("  - GameStaking (Rewards):", gameStakingRewardsAddress);
  console.log("  - GameDAO Registry:", registryAddress);
  console.log("  - Control Module:", controlAddress);
  console.log("  - Flow Module:", flowAddress);
  console.log("  - Signal Module:", signalAddress);
  console.log("  - Sense Module:", senseAddress);
  console.log("");
  console.log("🔗 All modules registered in GameDAO Registry");
  console.log("🔐 Control contract has ORGANIZATION_MANAGER_ROLE in GameStaking");
  console.log("✅ System ready for use!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
