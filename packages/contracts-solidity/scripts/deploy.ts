import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("🚀 Deploying GameDAO Protocol contracts...");
  console.log("📍 Deploying with account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));
  console.log("");

  // 1. Deploy Test Tokens
  console.log("🪙 Deploying Test Tokens...");

  // Deploy GAME token
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

  // 2. Deploy GameDAO Registry
  console.log("📋 Deploying GameDAO Registry...");
  const GameDAORegistryFactory = await ethers.getContractFactory("GameDAORegistry");
  const registry = await GameDAORegistryFactory.deploy(deployer.address);
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("✅ GameDAO Registry deployed to:", registryAddress);
  console.log("");

  // 3. Deploy Control Module
  console.log("🏛️ Deploying Control Module...");
  const ControlFactory = await ethers.getContractFactory("Control");
  const control = await ControlFactory.deploy(gameTokenAddress);
  await control.waitForDeployment();
  const controlAddress = await control.getAddress();
  console.log("✅ Control Module deployed to:", controlAddress);
  console.log("");

  // 4. Deploy Flow Module
  console.log("💰 Deploying Flow Module...");
  const FlowFactory = await ethers.getContractFactory("Flow");
  const flow = await FlowFactory.deploy();
  await flow.waitForDeployment();
  const flowAddress = await flow.getAddress();
  console.log("✅ Flow Module deployed to:", flowAddress);
  console.log("");

  // 5. Deploy GameId Library
  console.log("🔧 Deploying GameId Library...");
  const GameIdFactory = await ethers.getContractFactory("GameId");
  const gameId = await GameIdFactory.deploy();
  await gameId.waitForDeployment();
  const gameIdAddress = await gameId.getAddress();
  console.log("✅ GameId Library deployed to:", gameIdAddress);
  console.log("");

  // 6. Deploy Signal Module (GameId is inlined by compiler)
  console.log("🗳️ Deploying Signal Module with Hierarchical ID support...");
  const SignalFactory = await ethers.getContractFactory("Signal");
  const signal = await SignalFactory.deploy();
  await signal.waitForDeployment();
  const signalAddress = await signal.getAddress();
  console.log("✅ Signal Module deployed to:", signalAddress);
  console.log("🔗 Signal Module uses inlined GameId library");
  console.log("");

  // 7. Deploy Identity Module
  console.log("🆔 Deploying Identity Module with GameId integration...");
  const IdentityFactory = await ethers.getContractFactory("Identity");
  const identity = await IdentityFactory.deploy();
  await identity.waitForDeployment();
  const identityAddress = await identity.getAddress();
  console.log("✅ Identity Module deployed to:", identityAddress);
  console.log("🔗 Identity Module uses GameId library for hierarchical IDs");
  console.log("");

  // 8. Deploy SenseSimplified Module
  console.log("🧠 Deploying SenseSimplified Module (reputation, XP, trust)...");
  const SenseSimplifiedFactory = await ethers.getContractFactory("SenseSimplified");
  const senseSimplified = await SenseSimplifiedFactory.deploy();
  await senseSimplified.waitForDeployment();
  const senseSimplifiedAddress = await senseSimplified.getAddress();
  console.log("✅ SenseSimplified Module deployed to:", senseSimplifiedAddress);
  console.log("🎯 Focused on reputation, experience, and trust scoring");
  console.log("");

  // 8. Register and Enable Modules
  console.log("🔗 Registering Control Module with Registry...");
  const CONTROL_MODULE_ID = ethers.keccak256(ethers.toUtf8Bytes("CONTROL"));

  await registry.registerModule(controlAddress);
  console.log("📝 Control Module registered and initialized");

  await registry.enableModule(CONTROL_MODULE_ID);
  console.log("⚡ Control Module enabled");
  console.log("");

  console.log("🔗 Registering Flow Module with Registry...");
  const FLOW_MODULE_ID = ethers.keccak256(ethers.toUtf8Bytes("FLOW"));

  await registry.registerModule(flowAddress);
  console.log("📝 Flow Module registered and initialized");

  await registry.enableModule(FLOW_MODULE_ID);
  console.log("⚡ Flow Module enabled");
  console.log("");

  console.log("🔗 Registering Signal Module with Registry...");
  const SIGNAL_MODULE_ID = ethers.keccak256(ethers.toUtf8Bytes("SIGNAL"));

  await registry.registerModule(signalAddress);
  console.log("📝 Signal Module registered and initialized");

  await registry.enableModule(SIGNAL_MODULE_ID);
  console.log("⚡ Signal Module enabled");
  console.log("");

  console.log("🔗 Registering Identity Module with Registry...");
  const IDENTITY_MODULE_ID = ethers.keccak256(ethers.toUtf8Bytes("IDENTITY"));

  await registry.registerModule(identityAddress);
  console.log("📝 Identity Module registered and initialized");

  await registry.enableModule(IDENTITY_MODULE_ID);
  console.log("⚡ Identity Module enabled");
  console.log("");

  console.log("🔗 Registering SenseSimplified Module with Registry...");
  const SENSE_MODULE_ID = ethers.keccak256(ethers.toUtf8Bytes("SENSE"));

  await registry.registerModule(senseSimplifiedAddress);
  console.log("📝 SenseSimplified Module registered and initialized");

  await registry.enableModule(SENSE_MODULE_ID);
  console.log("⚡ SenseSimplified Module enabled");
  console.log("");

  // 9. Deploy GameStaking Contract
  console.log("🎯 Deploying GameStaking Contract...");
  const GameStakingFactory = await ethers.getContractFactory("GameStaking");
  const gameStaking = await GameStakingFactory.deploy(
    gameTokenAddress,
    deployer.address, // Treasury address (using deployer for now)
    1000 // 10% of protocol fees go to staking rewards
  );
  await gameStaking.waitForDeployment();
  const gameStakingAddress = await gameStaking.getAddress();
  console.log("✅ GameStaking Contract deployed to:", gameStakingAddress);
  console.log("");

  // 10. Save deployment addresses
  const deploymentData = {
    gameToken: gameTokenAddress,
    usdc: usdcAddress,
    gameStaking: gameStakingAddress,
    registry: registryAddress,
    control: controlAddress,
    flow: flowAddress,
    signal: signalAddress,
    gameId: gameIdAddress,
    identity: identityAddress,
    sense: senseSimplifiedAddress, // New simplified Sense module
  };

  // Write deployment addresses to file
  const fs = require('fs');
  const path = require('path');
  const deploymentFile = path.join(__dirname, '..', 'deployment-addresses.json');
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentData, null, 2));

  console.log("📄 Deployment addresses saved to deployment-addresses.json");
  console.log("");

  // 11. Summary
  console.log("📊 DEPLOYMENT SUMMARY");
  console.log("=" .repeat(50));
  console.log("GAME Token Address:  ", gameTokenAddress);
  console.log("USDC Token Address:  ", usdcAddress);
  console.log("GameStaking Address: ", gameStakingAddress);
  console.log("Registry Address:    ", registryAddress);
  console.log("Control Address:     ", controlAddress);
  console.log("Flow Address:        ", flowAddress);
  console.log("Signal Address:      ", signalAddress);
  console.log("GameId Library:     ", gameIdAddress);
  console.log("");
  console.log("🚀 GameDAO Protocol successfully deployed!");
  console.log("✅ Signal contract GameId library linking issue FIXED");
  console.log("⚠️  Sense module disabled due to size limit (needs optimization)");

  return deploymentData;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
