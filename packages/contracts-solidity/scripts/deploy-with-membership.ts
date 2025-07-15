import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

/**
 * GameDAO Protocol Deployment Script with Membership Architecture
 * Identity → Membership → Everything Else
 */
async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("🚀 Deploying GameDAO Protocol with Membership Architecture...");
  console.log("📍 Deploying with account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));
  console.log("🏗️  Architecture: Identity → Membership → Everything Else");
  console.log("");

  const deploymentAddresses: any = {};

  // 1. Deploy Test Tokens
  console.log("🪙 Deploying Test Tokens...");

  // Deploy GAME token (clean ERC20)
  const GameTokenFactory = await ethers.getContractFactory("MockGameToken");
  const gameToken = await GameTokenFactory.deploy();
  await gameToken.waitForDeployment();
  const gameTokenAddress = await gameToken.getAddress();
  deploymentAddresses.GameToken = gameTokenAddress;
  console.log("✅ GAME Token deployed to:", gameTokenAddress);

  // Deploy USDC token
  const USDCFactory = await ethers.getContractFactory("MockUSDC");
  const usdc = await USDCFactory.deploy();
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  deploymentAddresses.USDC = usdcAddress;
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
  deploymentAddresses.GameStaking = gameStakingAddress;
  console.log("✅ GameStaking Contract deployed to:", gameStakingAddress);
  console.log("");

  // 3. Deploy GameDAO Registry
  console.log("📋 Deploying GameDAO Registry...");
  const GameDAORegistryFactory = await ethers.getContractFactory("GameDAORegistry");
  const registry = await GameDAORegistryFactory.deploy(deployer.address);
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  deploymentAddresses.GameDAORegistry = registryAddress;
  console.log("✅ GameDAO Registry deployed to:", registryAddress);
  console.log("");

  // 4. Deploy Identity Module (Foundation Layer)
  console.log("👤 Deploying Identity Module (Foundation Layer)...");
  const IdentityFactory = await ethers.getContractFactory("Identity");
  const identity = await IdentityFactory.deploy();
  await identity.waitForDeployment();
  const identityAddress = await identity.getAddress();
  deploymentAddresses.Identity = identityAddress;
  console.log("✅ Identity Module deployed to:", identityAddress);

  // Initialize Identity with registry
  await identity.initialize(registryAddress);
  console.log("✅ Identity Module initialized with registry");
  console.log("");

  // 5. Deploy GameDAOMembership Contract (Core Layer)
  console.log("👥 Deploying GameDAOMembership Contract (Core Layer)...");
  const GameDAOMembershipFactory = await ethers.getContractFactory("GameDAOMembership");
  const membership = await GameDAOMembershipFactory.deploy(
    identityAddress,
    ethers.ZeroAddress, // Control contract will be deployed next
    gameTokenAddress
  );
  await membership.waitForDeployment();
  const membershipAddress = await membership.getAddress();
  deploymentAddresses.GameDAOMembership = membershipAddress;
  console.log("✅ GameDAOMembership Contract deployed to:", membershipAddress);
  console.log("");

  // 6. Deploy Control Module (Refactored)
  console.log("🎛️  Deploying Control Module (Refactored)...");
  const ControlFactory = await ethers.getContractFactory("Control");
  const control = await ControlFactory.deploy(
    gameStakingAddress,
    membershipAddress
  );
  await control.waitForDeployment();
  const controlAddress = await control.getAddress();
  deploymentAddresses.Control = controlAddress;
  console.log("✅ Control Module deployed to:", controlAddress);

  // Initialize Control with registry
  await control.initialize(registryAddress);
  console.log("✅ Control Module initialized with registry");
  console.log("");

  // 7. Update GameDAOMembership with Control contract address
  console.log("🔗 Linking GameDAOMembership with Control Module...");
  // Note: This would require updating the membership contract constructor or adding a setter
  // For now, we'll grant the necessary role to Control
  const ORGANIZATION_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ORGANIZATION_MANAGER_ROLE"));
  await membership.grantRole(ORGANIZATION_MANAGER_ROLE, controlAddress);
  console.log("✅ Control Module granted ORGANIZATION_MANAGER_ROLE in Membership");
  console.log("");

  // 8. Deploy Signal Module (Updated)
  console.log("📊 Deploying Signal Module (Updated)...");
  const SignalFactory = await ethers.getContractFactory("Signal");
  const signal = await SignalFactory.deploy();
  await signal.waitForDeployment();
  const signalAddress = await signal.getAddress();
  deploymentAddresses.Signal = signalAddress;
  console.log("✅ Signal Module deployed to:", signalAddress);

  // Initialize Signal with registry
  await signal.initialize(registryAddress);
  console.log("✅ Signal Module initialized with registry");
  console.log("");

  // 9. Deploy Flow Module (Updated)
  console.log("💰 Deploying Flow Module (Updated)...");
  const FlowFactory = await ethers.getContractFactory("Flow");
  const flow = await FlowFactory.deploy();
  await flow.waitForDeployment();
  const flowAddress = await flow.getAddress();
  deploymentAddresses.Flow = flowAddress;
  console.log("✅ Flow Module deployed to:", flowAddress);

  // Initialize Flow with registry
  await flow.initialize(registryAddress);
  console.log("✅ Flow Module initialized with registry");
  console.log("");

  // 10. Deploy Sense Module (Updated)
  console.log("🧠 Deploying Sense Module (Updated)...");
  const SenseFactory = await ethers.getContractFactory("Sense");
  const sense = await SenseFactory.deploy();
  await sense.waitForDeployment();
  const senseAddress = await sense.getAddress();
  deploymentAddresses.Sense = senseAddress;
  console.log("✅ Sense Module deployed to:", senseAddress);

  // Initialize Sense with registry
  await sense.initialize(registryAddress);
  console.log("✅ Sense Module initialized with registry");
  console.log("");

  // 11. Register all modules with the registry
  console.log("📝 Registering modules with GameDAO Registry...");

  const IDENTITY_MODULE_ID = ethers.keccak256(ethers.toUtf8Bytes("IDENTITY"));
  const CONTROL_MODULE_ID = ethers.keccak256(ethers.toUtf8Bytes("CONTROL"));
  const SIGNAL_MODULE_ID = ethers.keccak256(ethers.toUtf8Bytes("SIGNAL"));
  const FLOW_MODULE_ID = ethers.keccak256(ethers.toUtf8Bytes("FLOW"));
  const SENSE_MODULE_ID = ethers.keccak256(ethers.toUtf8Bytes("SENSE"));
  const MEMBERSHIP_MODULE_ID = ethers.keccak256(ethers.toUtf8Bytes("MEMBERSHIP"));

  await registry.registerModule(IDENTITY_MODULE_ID, identityAddress);
  console.log("✅ Identity Module registered");

  await registry.registerModule(MEMBERSHIP_MODULE_ID, membershipAddress);
  console.log("✅ Membership Module registered");

  await registry.registerModule(CONTROL_MODULE_ID, controlAddress);
  console.log("✅ Control Module registered");

  await registry.registerModule(SIGNAL_MODULE_ID, signalAddress);
  console.log("✅ Signal Module registered");

  await registry.registerModule(FLOW_MODULE_ID, flowAddress);
  console.log("✅ Flow Module registered");

  await registry.registerModule(SENSE_MODULE_ID, senseAddress);
  console.log("✅ Sense Module registered");
  console.log("");

  // 12. Grant necessary roles and permissions
  console.log("🔐 Setting up roles and permissions...");

  // Grant GameStaking permissions
  const ORGANIZATION_MANAGER_ROLE_STAKING = ethers.keccak256(ethers.toUtf8Bytes("ORGANIZATION_MANAGER_ROLE"));
  await gameStaking.grantRole(ORGANIZATION_MANAGER_ROLE_STAKING, controlAddress);
  console.log("✅ Control granted ORGANIZATION_MANAGER_ROLE in GameStaking");

  // Grant Membership permissions
  const REPUTATION_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("REPUTATION_MANAGER_ROLE"));
  await membership.grantRole(REPUTATION_MANAGER_ROLE, senseAddress);
  console.log("✅ Sense granted REPUTATION_MANAGER_ROLE in Membership");

  // Grant Identity permissions
  const IDENTITY_ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("IDENTITY_ADMIN_ROLE"));
  await identity.grantRole(IDENTITY_ADMIN_ROLE, membershipAddress);
  console.log("✅ Membership granted IDENTITY_ADMIN_ROLE in Identity");
  console.log("");

  // 13. Setup initial test data
  console.log("🧪 Setting up initial test data...");

  // Mint tokens to deployer for testing
  await gameToken.mint(deployer.address, ethers.parseEther("1000000"));
  await usdc.mint(deployer.address, ethers.parseEther("1000000"));
  console.log("✅ Minted test tokens to deployer");

  // Create a test organization
  const testOrgTx = await control.createOrganization(
    "Test Organization",
    "ipfs://test-metadata",
    0, // OrgType.Individual
    0, // AccessModel.Open
    0, // FeeModel.NoFees
    100, // memberLimit
    0, // membershipFee
    ethers.parseEther("10000") // gameStakeRequired
  );
  const testOrgReceipt = await testOrgTx.wait();
  console.log("✅ Created test organization");
  console.log("");

  // 14. Save deployment addresses
  console.log("💾 Saving deployment addresses...");

  const deploymentData = {
    network: "localhost",
    chainId: 31337,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    architecture: "Identity → Membership → Everything Else",
    contracts: deploymentAddresses
  };

  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(deploymentsDir, "membership-deployment.json"),
    JSON.stringify(deploymentData, null, 2)
  );
  console.log("✅ Deployment addresses saved to deployments/membership-deployment.json");
  console.log("");

  // 15. Display deployment summary
  console.log("🎉 Deployment Summary");
  console.log("=" .repeat(60));
  console.log("📋 Architecture: Identity → Membership → Everything Else");
  console.log("");
  console.log("🏗️  Foundation Layer:");
  console.log(`   Identity:        ${identityAddress}`);
  console.log("");
  console.log("🏗️  Core Layer:");
  console.log(`   Membership:      ${membershipAddress}`);
  console.log(`   Registry:        ${registryAddress}`);
  console.log(`   GameStaking:     ${gameStakingAddress}`);
  console.log("");
  console.log("🏗️  Module Layer:");
  console.log(`   Control:         ${controlAddress}`);
  console.log(`   Signal:          ${signalAddress}`);
  console.log(`   Flow:            ${flowAddress}`);
  console.log(`   Sense:           ${senseAddress}`);
  console.log("");
  console.log("🪙 Token Layer:");
  console.log(`   GAME Token:      ${gameTokenAddress}`);
  console.log(`   USDC Token:      ${usdcAddress}`);
  console.log("");
  console.log("✅ All contracts deployed successfully!");
  console.log("🔗 Modules are interconnected through the membership system");
  console.log("📊 Ready for subgraph indexing and frontend integration");
  console.log("");

  // 16. Contract size analysis
  console.log("📏 Contract Size Analysis:");
  console.log("=" .repeat(40));
  console.log("🎯 Expected size reductions:");
  console.log("   Control:    24.021 KiB → ~14-16 KiB (✅ Under limit)");
  console.log("   Signal:     19.015 KiB → ~15-16 KiB (✅ Under limit)");
  console.log("   Flow:       19.063 KiB → ~16-17 KiB (✅ Under limit)");
  console.log("   Identity:   13.729 KiB → ~11-12 KiB (✅ Under limit)");
  console.log("   Sense:       8.840 KiB → ~7-8 KiB (✅ Under limit)");
  console.log("   Membership: New contract ~12-15 KiB (✅ Under limit)");
  console.log("");
  console.log("💡 Run 'npx hardhat size-contracts' to verify actual sizes");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
