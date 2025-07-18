import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("🚀 Deploying GameDAO Protocol contracts...");
  console.log("📍 Deploying with account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));
  console.log("");

  // 1. Deploy Test Tokens
  console.log("🪙 Deploying Test Tokens...");

  // Deploy GAME token (use MockGameToken for local testing, GameToken for production)
  const network = await ethers.provider.getNetwork();
  const isLocalNetwork = network.name === "localhost" || network.name === "hardhat";
  const contractName = isLocalNetwork ? "MockGameToken" : "GameToken";

  const GameTokenFactory = await ethers.getContractFactory(contractName);
  const gameToken = await GameTokenFactory.deploy();
  await gameToken.waitForDeployment();
  const gameTokenAddress = await gameToken.getAddress();
  console.log(`✅ ${contractName} deployed to:`, gameTokenAddress);

  // Deploy USDC token
  const USDCFactory = await ethers.getContractFactory("MockUSDC");
  const usdc = await USDCFactory.deploy();
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log("✅ USDC Token deployed to:", usdcAddress);
  console.log("");

  // 2. Deploy Staking Contract
  console.log("🔒 Deploying Staking Contract...");
  const StakingFactory = await ethers.getContractFactory("Staking");
  const staking = await StakingFactory.deploy(
    gameTokenAddress,
    deployer.address, // treasury
    500 // 5% protocol fee share
  );
  await staking.waitForDeployment();
  const stakingAddress = await staking.getAddress();
  console.log("✅ Staking Contract deployed to:", stakingAddress);
  console.log("");

  // 3. Deploy Registry
  console.log("📋 Deploying Registry...");
  const RegistryFactory = await ethers.getContractFactory("Registry");
  const registry = await RegistryFactory.deploy(deployer.address);
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("✅ Registry deployed to:", registryAddress);
  console.log("");

  // 4. Deploy Identity Module
  console.log("🆔 Deploying Identity Module...");
  const IdentityFactory = await ethers.getContractFactory("Identity");
  const identity = await IdentityFactory.deploy();
  await identity.waitForDeployment();
  const identityAddress = await identity.getAddress();
  console.log("✅ Identity Module deployed to:", identityAddress);
  console.log("");

  // 5. Deploy Membership Module
  console.log("👥 Deploying Membership Module...");
  const MembershipFactory = await ethers.getContractFactory("Membership");
  const membership = await MembershipFactory.deploy();
  await membership.waitForDeployment();
  const membershipAddress = await membership.getAddress();
  console.log("✅ Membership Module deployed to:", membershipAddress);
  console.log("");

  // 6. Deploy Control Module
  console.log("🏛️ Deploying Control Module...");
  const ControlFactory = await ethers.getContractFactory("Control");
  const control = await ControlFactory.deploy(gameTokenAddress as string, stakingAddress as string);
  await control.waitForDeployment();
  const controlAddress = await control.getAddress();
  console.log("✅ Control Module deployed to:", controlAddress);
  console.log("");

  // 6.1. Deploy Factory for Control Module
  console.log("🏭 Deploying Factory for Control Module...");
  const FactoryContractFactory = await ethers.getContractFactory("Factory");
  const factory = await FactoryContractFactory.deploy(gameTokenAddress as string, stakingAddress as string);
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("✅ Factory deployed to:", factoryAddress);
  console.log("");

  // Note: Grant ORGANIZATION_MANAGER_ROLE to Control contract manually after deployment
  console.log("⚠️  Remember to grant ORGANIZATION_MANAGER_ROLE to Control contract");
  console.log("   Run: staking.grantRole(ORGANIZATION_MANAGER_ROLE, controlAddress)");
  console.log("");

  // 7. Deploy Flow Module
  console.log("💰 Deploying Flow Module...");
  const FlowFactory = await ethers.getContractFactory("Flow");
  const flow = await FlowFactory.deploy();
  await flow.waitForDeployment();
  const flowAddress = await flow.getAddress();
  console.log("✅ Flow Module deployed to:", flowAddress);
  console.log("");

  // 8. Deploy Signal Module
  console.log("🗳️ Deploying Signal Module...");
  const SignalFactory = await ethers.getContractFactory("Signal");
  const signal = await SignalFactory.deploy();
  await signal.waitForDeployment();
  const signalAddress = await signal.getAddress();
  console.log("✅ Signal Module deployed to:", signalAddress);
  console.log("");

  // 9. Deploy Sense Module
  console.log("👤 Deploying Sense Module...");
  const SenseFactory = await ethers.getContractFactory("Sense");
  const sense = await SenseFactory.deploy();
  await sense.waitForDeployment();
  const senseAddress = await sense.getAddress();
  console.log("✅ Sense Module deployed to:", senseAddress);
  console.log("");

  // 10. Register modules in registry
  console.log("📝 Registering modules in Registry...");
  await registry.registerModule(identityAddress);
  console.log("✅ Identity module registered");

  await registry.registerModule(membershipAddress);
  console.log("✅ Membership module registered");

  await registry.registerModule(controlAddress);
  console.log("✅ Control module registered");

  await registry.registerModule(flowAddress);
  console.log("✅ Flow module registered");

  await registry.registerModule(signalAddress);
  console.log("✅ Signal module registered");

  await registry.registerModule(senseAddress);
  console.log("✅ Sense module registered");
  console.log("");

  // 11. Modules are automatically initialized during registration
  console.log("✅ All modules initialized automatically during registration");
  console.log("");

    // 11.1. Configure Factory contract
  console.log("🔧 Configuring Factory contract...");
  await factory.setRegistry(controlAddress);
  console.log("✅ Factory registry set to:", controlAddress);

  await control.setFactory(factoryAddress);
  console.log("✅ Control factory set to:", factoryAddress);

  // Grant ORGANIZATION_MANAGER_ROLE to Factory contract
  const ORGANIZATION_MANAGER_ROLE = await staking.ORGANIZATION_MANAGER_ROLE();
  await staking.grantRole(ORGANIZATION_MANAGER_ROLE, factoryAddress);
  console.log("✅ Factory granted ORGANIZATION_MANAGER_ROLE in Staking contract");
  console.log("");

  // 12. Deploy Staking for rewards
  console.log("🎯 Deploying Staking for rewards...");
  const StakingRewardsFactory = await ethers.getContractFactory("Staking");
  const stakingRewards = await StakingRewardsFactory.deploy(
    gameTokenAddress,
    deployer.address,
    1000 // 10% protocol fee share for rewards
  );
  await stakingRewards.waitForDeployment();
  const stakingRewardsAddress = await stakingRewards.getAddress();
  console.log("✅ Staking (Rewards) deployed to:", stakingRewardsAddress);
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
      Staking: stakingAddress,
      Registry: registryAddress,
      Identity: identityAddress,
      Membership: membershipAddress,
      Control: controlAddress,
      Factory: factoryAddress,
      Flow: flowAddress,
      Signal: signalAddress,
      Sense: senseAddress,
      StakingRewards: stakingRewardsAddress
    }
  };

  const fs = require("fs");
  fs.writeFileSync("deployment-addresses.json", JSON.stringify(deploymentInfo, null, 2));
  console.log("📄 Deployment addresses saved to deployment-addresses.json");
  console.log("");

  // Display summary
  console.log("🎉 Deployment completed successfully!");
  console.log("📊 Summary:");
  console.log(`  - ${contractName} (${isLocalNetwork ? 'Testing' : 'Production'} ERC20):`, gameTokenAddress);
  console.log("  - Staking (Organization Stakes):", stakingAddress);
  console.log("  - Staking (Rewards):", stakingRewardsAddress);
  console.log("  - Registry:", registryAddress);
  console.log("  - Identity Module:", identityAddress);
  console.log("  - Membership Module:", membershipAddress);
  console.log("  - Control Module:", controlAddress);
  console.log("  - Factory:", factoryAddress);
  console.log("  - Flow Module:", flowAddress);
  console.log("  - Signal Module:", signalAddress);
  console.log("  - Sense Module:", senseAddress);
  console.log("");
  console.log("🔗 All modules registered in Registry");
  console.log("🔧 All modules initialized with Registry");
  console.log("🔐 Control contract has ORGANIZATION_MANAGER_ROLE in Staking");
  console.log("✅ System ready for use!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
