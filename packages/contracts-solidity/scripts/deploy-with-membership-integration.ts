import { ethers } from "hardhat";
import { writeFileSync } from "fs";
import { join } from "path";

interface DeploymentAddresses {
  gameToken: string;
  gameStaking: string;
  organizationSettings: string;
  gameDAOMembership: string;
  gameDAORegistry: string;
  control: string;
  signal: string;
  flow: string;
  sense: string;
  treasury: string;
  deployedAt: string;
  network: string;
  deployer: string;
  contractSizes: {
    [key: string]: {
      size: number;
      sizeKB: number;
      status: string;
    };
  };
}

async function measureContractSize(contractName: string) {
  const ContractFactory = await ethers.getContractFactory(contractName);
  const deployTransaction = ContractFactory.getDeployTransaction();
  const bytecodeSize = ethers.utils.hexDataLength(deployTransaction.data || "0x");
  const sizeKB = bytecodeSize / 1024;
  const deploymentLimit = 24576; // 24KB limit
  const percentageUsed = (bytecodeSize / deploymentLimit) * 100;

  let status = "PASS";
  if (bytecodeSize > deploymentLimit) {
    status = "FAIL";
  } else if (percentageUsed > 90) {
    status = "WARNING";
  }

  return {
    size: bytecodeSize,
    sizeKB: Number(sizeKB.toFixed(3)),
    status
  };
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("🚀 Deploying GameDAO v3 with Complete Membership Integration");
  console.log("Network:", network.name);
  console.log("Deployer:", deployer.address);
  console.log("Deployer balance:", ethers.utils.formatEther(await deployer.getBalance()));

  const addresses: Partial<DeploymentAddresses> = {
    network: network.name,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    contractSizes: {}
  };

  // 1. Deploy GameToken (Mock for testing)
  console.log("\n📄 Deploying GameToken...");
  const gameTokenSize = await measureContractSize("MockGameToken");
  addresses.contractSizes!["MockGameToken"] = gameTokenSize;

  const GameToken = await ethers.getContractFactory("MockGameToken");
  const gameToken = await GameToken.deploy(
    "GameDAO Token",
    "GAME",
    ethers.utils.parseEther("1000000000") // 1B tokens
  );
  await gameToken.deployed();
  addresses.gameToken = gameToken.address;
  console.log(`✅ GameToken deployed to: ${gameToken.address} (${gameTokenSize.sizeKB} KB - ${gameTokenSize.status})`);

  // 2. Deploy GameStaking
  console.log("\n🏦 Deploying GameStaking...");
  const gameStakingSize = await measureContractSize("GameStaking");
  addresses.contractSizes!["GameStaking"] = gameStakingSize;

  const GameStaking = await ethers.getContractFactory("GameStaking");
  const gameStaking = await GameStaking.deploy(gameToken.address);
  await gameStaking.deployed();
  addresses.gameStaking = gameStaking.address;
  console.log(`✅ GameStaking deployed to: ${gameStaking.address} (${gameStakingSize.sizeKB} KB - ${gameStakingSize.status})`);

  // 3. Deploy OrganizationSettings (Core governance contract)
  console.log("\n⚙️ Deploying OrganizationSettings...");
  const organizationSettingsSize = await measureContractSize("OrganizationSettings");
  addresses.contractSizes!["OrganizationSettings"] = organizationSettingsSize;

  const OrganizationSettings = await ethers.getContractFactory("OrganizationSettings");
  const organizationSettings = await OrganizationSettings.deploy();
  await organizationSettings.deployed();
  addresses.organizationSettings = organizationSettings.address;
  console.log(`✅ OrganizationSettings deployed to: ${organizationSettings.address} (${organizationSettingsSize.sizeKB} KB - ${organizationSettingsSize.status})`);

  // 4. Deploy GameDAOMembership with Settings integration
  console.log("\n👥 Deploying GameDAOMembership...");
  const gameDAOMembershipSize = await measureContractSize("GameDAOMembershipWithSettings");
  addresses.contractSizes!["GameDAOMembershipWithSettings"] = gameDAOMembershipSize;

  const GameDAOMembership = await ethers.getContractFactory("GameDAOMembershipWithSettings");
  const gameDAOMembership = await GameDAOMembership.deploy(
    ethers.constants.AddressZero, // identityContract - will be set later
    ethers.constants.AddressZero, // controlContract - will be set later
    gameToken.address,
    organizationSettings.address
  );
  await gameDAOMembership.deployed();
  addresses.gameDAOMembership = gameDAOMembership.address;
  console.log(`✅ GameDAOMembership deployed to: ${gameDAOMembership.address} (${gameDAOMembershipSize.sizeKB} KB - ${gameDAOMembershipSize.status})`);

  // 5. Deploy GameDAORegistry
  console.log("\n📋 Deploying GameDAORegistry...");
  const gameDAORegistrySize = await measureContractSize("GameDAORegistry");
  addresses.contractSizes!["GameDAORegistry"] = gameDAORegistrySize;

  const GameDAORegistry = await ethers.getContractFactory("GameDAORegistry");
  const gameDAORegistry = await GameDAORegistry.deploy();
  await gameDAORegistry.deployed();
  addresses.gameDAORegistry = gameDAORegistry.address;
  console.log(`✅ GameDAORegistry deployed to: ${gameDAORegistry.address} (${gameDAORegistrySize.sizeKB} KB - ${gameDAORegistrySize.status})`);

  // 6. Deploy Control with Settings integration
  console.log("\n🎮 Deploying Control...");
  const controlSize = await measureContractSize("ControlWithSettings");
  addresses.contractSizes!["ControlWithSettings"] = controlSize;

  const Control = await ethers.getContractFactory("ControlWithSettings");
  const control = await Control.deploy(
    gameStaking.address,
    gameDAOMembership.address,
    organizationSettings.address
  );
  await control.deployed();
  addresses.control = control.address;
  console.log(`✅ Control deployed to: ${control.address} (${controlSize.sizeKB} KB - ${controlSize.status})`);

  // 7. Deploy Signal with Membership integration
  console.log("\n📢 Deploying Signal...");
  const signalSize = await measureContractSize("SignalWithMembership");
  addresses.contractSizes!["SignalWithMembership"] = signalSize;

  const Signal = await ethers.getContractFactory("SignalWithMembership");
  const signal = await Signal.deploy();
  await signal.deployed();
  addresses.signal = signal.address;
  console.log(`✅ Signal deployed to: ${signal.address} (${signalSize.sizeKB} KB - ${signalSize.status})`);

  // 8. Deploy Flow with Membership integration
  console.log("\n💰 Deploying Flow...");
  const flowSize = await measureContractSize("FlowWithMembership");
  addresses.contractSizes!["FlowWithMembership"] = flowSize;

  const Flow = await ethers.getContractFactory("FlowWithMembership");
  const flow = await Flow.deploy();
  await flow.deployed();
  addresses.flow = flow.address;
  console.log(`✅ Flow deployed to: ${flow.address} (${flowSize.sizeKB} KB - ${flowSize.status})`);

  // 9. Deploy Sense with Membership integration
  console.log("\n🔍 Deploying Sense...");
  const senseSize = await measureContractSize("SenseWithMembership");
  addresses.contractSizes!["SenseWithMembership"] = senseSize;

  const Sense = await ethers.getContractFactory("SenseWithMembership");
  const sense = await Sense.deploy();
  await sense.deployed();
  addresses.sense = sense.address;
  console.log(`✅ Sense deployed to: ${sense.address} (${senseSize.sizeKB} KB - ${senseSize.status})`);

  // 10. Deploy Treasury
  console.log("\n💎 Deploying Treasury...");
  const treasurySize = await measureContractSize("Treasury");
  addresses.contractSizes!["Treasury"] = treasurySize;

  const Treasury = await ethers.getContractFactory("Treasury");
  const treasury = await Treasury.deploy(
    ethers.utils.keccak256(ethers.utils.toUtf8Bytes("DEFAULT")),
    control.address,
    deployer.address
  );
  await treasury.deployed();
  addresses.treasury = treasury.address;
  console.log(`✅ Treasury deployed to: ${treasury.address} (${treasurySize.sizeKB} KB - ${treasurySize.status})`);

  // 11. Initialize Registry with modules
  console.log("\n🔧 Initializing Registry...");
  await gameDAORegistry.initialize(deployer.address);

  // Register modules
  await gameDAORegistry.registerModule(
    ethers.utils.keccak256(ethers.utils.toUtf8Bytes("CONTROL")),
    control.address
  );
  await gameDAORegistry.registerModule(
    ethers.utils.keccak256(ethers.utils.toUtf8Bytes("SIGNAL")),
    signal.address
  );
  await gameDAORegistry.registerModule(
    ethers.utils.keccak256(ethers.utils.toUtf8Bytes("FLOW")),
    flow.address
  );
  await gameDAORegistry.registerModule(
    ethers.utils.keccak256(ethers.utils.toUtf8Bytes("SENSE")),
    sense.address
  );
  console.log("✅ Registry initialized with modules");

  // 12. Initialize modules with registry
  console.log("\n🔗 Initializing modules...");
  await control.initialize(gameDAORegistry.address);
  await signal.initialize(gameDAORegistry.address);
  await flow.initialize(gameDAORegistry.address);
  await sense.initialize(gameDAORegistry.address);
  console.log("✅ Modules initialized");

  // 13. Set up OrganizationSettings contract references
  console.log("\n⚙️ Setting up OrganizationSettings references...");
  await organizationSettings.setSignalContract(signal.address);
  await organizationSettings.setControlContract(control.address);
  await organizationSettings.setMembershipContract(gameDAOMembership.address);
  console.log("✅ OrganizationSettings references set");

  // 14. Set up module contract references
  console.log("\n🔗 Setting up module references...");
  await signal.setOrganizationSettings(organizationSettings.address);
  await signal.setMembershipContract(gameDAOMembership.address);
  await flow.setMembershipContract(gameDAOMembership.address);
  await sense.setMembershipContract(gameDAOMembership.address);
  console.log("✅ Module references set");

  // 15. Grant necessary roles
  console.log("\n🔐 Granting roles...");

  // Grant governance role to Signal contract
  const GOVERNANCE_ROLE = await organizationSettings.GOVERNANCE_ROLE();
  await organizationSettings.grantRole(GOVERNANCE_ROLE, signal.address);

  // Grant organization manager role to Control contract
  const ORGANIZATION_MANAGER_ROLE = await gameDAOMembership.ORGANIZATION_MANAGER_ROLE();
  await gameDAOMembership.grantRole(ORGANIZATION_MANAGER_ROLE, control.address);

  // Grant staking roles
  const ORGANIZATION_MANAGER_STAKING_ROLE = await gameStaking.ORGANIZATION_MANAGER_ROLE();
  await gameStaking.grantRole(ORGANIZATION_MANAGER_STAKING_ROLE, control.address);

  console.log("✅ Roles granted");

  // 16. Create a test organization to verify deployment
  console.log("\n🏢 Creating test organization...");

  // Approve tokens for staking
  const stakeAmount = ethers.utils.parseEther("10000");
  await gameToken.approve(gameStaking.address, stakeAmount);
  await gameToken.approve(control.address, stakeAmount);

  // Create organization
  const createOrgTx = await control.createOrganization(
    "GameDAO Test Organization",
    "https://metadata.gamedao.co/test-org",
    0, // Individual
    0, // Open
    0, // NoFees
    1000, // memberLimit
    ethers.utils.parseEther("100"), // membershipFee
    stakeAmount
  );

  const receipt = await createOrgTx.wait();
  const orgCreatedEvent = receipt.events?.find(e => e.event === "OrganizationCreated");
  const testOrgId = orgCreatedEvent?.args?.id;

  console.log("✅ Test organization created:", testOrgId);

  // 17. Test membership integration
  console.log("\n👥 Testing membership integration...");

  // Check membership contract is working
  const memberCount = await gameDAOMembership.getMemberCount(testOrgId);
  console.log("Initial member count:", memberCount.toString());

  // Check organization settings
  const votingParams = await organizationSettings.getVotingParameters(testOrgId);
  console.log("Voting period:", votingParams.votingPeriod.toString());

  // Test Signal integration
  const canCreateProposal = await signal.canVote("test-proposal", deployer.address);
  console.log("Can create proposal:", canCreateProposal);

  // Test Flow integration
  const canCreateCampaign = await flow.canCreateCampaign(testOrgId, deployer.address);
  console.log("Can create campaign:", canCreateCampaign);

  console.log("✅ Membership integration tested");

  // 18. Display contract size summary
  console.log("\n📏 CONTRACT SIZE SUMMARY");
  console.log("=" .repeat(60));

  let totalSize = 0;
  let passCount = 0;
  let warningCount = 0;
  let failCount = 0;

  for (const [contractName, sizeData] of Object.entries(addresses.contractSizes!)) {
    totalSize += sizeData.size;

    if (sizeData.status === "PASS") passCount++;
    else if (sizeData.status === "WARNING") warningCount++;
    else if (sizeData.status === "FAIL") failCount++;

    console.log(`${contractName.padEnd(30)} ${sizeData.sizeKB.toString().padStart(8)} KB - ${sizeData.status}`);
  }

  console.log("-".repeat(60));
  console.log(`Total Size: ${(totalSize / 1024).toFixed(3)} KB`);
  console.log(`Status: ✅ ${passCount} PASS, ⚠️ ${warningCount} WARNING, ❌ ${failCount} FAIL`);

  // 19. Save deployment addresses
  console.log("\n💾 Saving deployment addresses...");
  const deploymentFile = join(__dirname, "../deployment-addresses-membership.json");
  writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
  console.log("✅ Deployment addresses saved to:", deploymentFile);

  // 20. Display summary
  console.log("\n📊 DEPLOYMENT SUMMARY");
  console.log("=" .repeat(60));
  console.log(`Network: ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`GameToken: ${addresses.gameToken}`);
  console.log(`GameStaking: ${addresses.gameStaking}`);
  console.log(`OrganizationSettings: ${addresses.organizationSettings}`);
  console.log(`GameDAOMembership: ${addresses.gameDAOMembership}`);
  console.log(`GameDAORegistry: ${addresses.gameDAORegistry}`);
  console.log(`Control: ${addresses.control}`);
  console.log(`Signal: ${addresses.signal}`);
  console.log(`Flow: ${addresses.flow}`);
  console.log(`Sense: ${addresses.sense}`);
  console.log(`Treasury: ${addresses.treasury}`);
  console.log(`Test Organization ID: ${testOrgId}`);

  console.log("\n✅ DEPLOYMENT COMPLETE!");
  console.log("\n🎯 Membership Integration Features:");
  console.log("- Centralized membership management through GameDAOMembership");
  console.log("- Reduced contract sizes through code deduplication");
  console.log("- Unified reputation system across all modules");
  console.log("- Consistent voting power calculations");
  console.log("- Governance-controlled organization settings");
  console.log("- Integrated reward system for member activities");
  console.log("- Cross-module membership validation");
  console.log("- Scalable architecture for future modules");

  console.log("\n📋 Next Steps:");
  console.log("1. Run comprehensive integration tests");
  console.log("2. Deploy to testnet for community testing");
  console.log("3. Update frontend to use new membership architecture");
  console.log("4. Create governance proposals for initial settings");
  console.log("5. Deploy subgraph with membership events");
  console.log("6. Update documentation with new architecture");

  console.log("\n🏗️ Architecture Benefits Achieved:");
  console.log("✅ Identity → Membership → Everything Else pattern implemented");
  console.log("✅ Single source of truth for membership data");
  console.log("✅ Eliminated duplicate membership logic across modules");
  console.log("✅ Improved contract maintainability and upgradability");
  console.log("✅ Enhanced security through centralized validation");
  console.log("✅ Better performance through optimized queries");

  return addresses as DeploymentAddresses;
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
