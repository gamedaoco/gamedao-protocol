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
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("🚀 Deploying GameDAO v3 with Governance Settings Architecture");
  console.log("Network:", network.name);
  console.log("Deployer:", deployer.address);
  console.log("Deployer balance:", ethers.utils.formatEther(await deployer.getBalance()));

  const addresses: Partial<DeploymentAddresses> = {
    network: network.name,
    deployer: deployer.address,
    deployedAt: new Date().toISOString()
  };

  // 1. Deploy GameToken (Mock for testing)
  console.log("\n📄 Deploying GameToken...");
  const GameToken = await ethers.getContractFactory("MockGameToken");
  const gameToken = await GameToken.deploy(
    "GameDAO Token",
    "GAME",
    ethers.utils.parseEther("1000000000") // 1B tokens
  );
  await gameToken.deployed();
  addresses.gameToken = gameToken.address;
  console.log("✅ GameToken deployed to:", gameToken.address);

  // 2. Deploy GameStaking
  console.log("\n🏦 Deploying GameStaking...");
  const GameStaking = await ethers.getContractFactory("GameStaking");
  const gameStaking = await GameStaking.deploy(gameToken.address);
  await gameStaking.deployed();
  addresses.gameStaking = gameStaking.address;
  console.log("✅ GameStaking deployed to:", gameStaking.address);

  // 3. Deploy OrganizationSettings (Core governance contract)
  console.log("\n⚙️ Deploying OrganizationSettings...");
  const OrganizationSettings = await ethers.getContractFactory("OrganizationSettings");
  const organizationSettings = await OrganizationSettings.deploy();
  await organizationSettings.deployed();
  addresses.organizationSettings = organizationSettings.address;
  console.log("✅ OrganizationSettings deployed to:", organizationSettings.address);

  // 4. Deploy GameDAOMembership with Settings integration
  console.log("\n👥 Deploying GameDAOMembership...");
  const GameDAOMembership = await ethers.getContractFactory("GameDAOMembershipWithSettings");
  const gameDAOMembership = await GameDAOMembership.deploy(
    ethers.constants.AddressZero, // identityContract - will be set later
    ethers.constants.AddressZero, // controlContract - will be set later
    gameToken.address,
    organizationSettings.address
  );
  await gameDAOMembership.deployed();
  addresses.gameDAOMembership = gameDAOMembership.address;
  console.log("✅ GameDAOMembership deployed to:", gameDAOMembership.address);

  // 5. Deploy GameDAORegistry
  console.log("\n📋 Deploying GameDAORegistry...");
  const GameDAORegistry = await ethers.getContractFactory("GameDAORegistry");
  const gameDAORegistry = await GameDAORegistry.deploy();
  await gameDAORegistry.deployed();
  addresses.gameDAORegistry = gameDAORegistry.address;
  console.log("✅ GameDAORegistry deployed to:", gameDAORegistry.address);

  // 6. Deploy Control with Settings integration
  console.log("\n🎮 Deploying Control...");
  const Control = await ethers.getContractFactory("ControlWithSettings");
  const control = await Control.deploy(
    gameStaking.address,
    gameDAOMembership.address,
    organizationSettings.address
  );
  await control.deployed();
  addresses.control = control.address;
  console.log("✅ Control deployed to:", control.address);

  // 7. Deploy Signal with Governance integration
  console.log("\n📢 Deploying Signal...");
  const Signal = await ethers.getContractFactory("SignalWithGovernance");
  const signal = await Signal.deploy();
  await signal.deployed();
  addresses.signal = signal.address;
  console.log("✅ Signal deployed to:", signal.address);

  // 8. Deploy Flow (using existing contract)
  console.log("\n💰 Deploying Flow...");
  const Flow = await ethers.getContractFactory("Flow");
  const flow = await Flow.deploy();
  await flow.deployed();
  addresses.flow = flow.address;
  console.log("✅ Flow deployed to:", flow.address);

  // 9. Deploy Sense (using existing contract)
  console.log("\n🔍 Deploying Sense...");
  const Sense = await ethers.getContractFactory("Sense");
  const sense = await Sense.deploy();
  await sense.deployed();
  addresses.sense = sense.address;
  console.log("✅ Sense deployed to:", sense.address);

  // 10. Deploy Treasury
  console.log("\n💎 Deploying Treasury...");
  const Treasury = await ethers.getContractFactory("Treasury");
  const treasury = await Treasury.deploy(
    ethers.utils.keccak256(ethers.utils.toUtf8Bytes("DEFAULT")),
    control.address,
    deployer.address
  );
  await treasury.deployed();
  addresses.treasury = treasury.address;
  console.log("✅ Treasury deployed to:", treasury.address);

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

  // 14. Set up Signal contract references
  console.log("\n📢 Setting up Signal references...");
  await signal.setOrganizationSettings(organizationSettings.address);
  await signal.setMembershipContract(gameDAOMembership.address);
  console.log("✅ Signal references set");

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

  // 17. Test governance settings
  console.log("\n🗳️ Testing governance settings...");

  // Get initial voting parameters
  const initialVotingParams = await organizationSettings.getVotingParameters(testOrgId);
  console.log("Initial voting period:", initialVotingParams.votingPeriod.toString());

  // Get membership configuration
  const membershipConfig = await organizationSettings.getMembershipConfig(testOrgId);
  console.log("Membership fee:", ethers.utils.formatEther(membershipConfig.membershipFee));
  console.log("Member limit:", membershipConfig.memberLimit.toString());

  console.log("✅ Governance settings tested");

  // 18. Save deployment addresses
  console.log("\n💾 Saving deployment addresses...");
  const deploymentFile = join(__dirname, "../deployment-addresses-governance.json");
  writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
  console.log("✅ Deployment addresses saved to:", deploymentFile);

  // 19. Display summary
  console.log("\n📊 DEPLOYMENT SUMMARY");
  console.log("=====================");
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
  console.log("\n🎯 Key Features Deployed:");
  console.log("- Organization settings require governance approval");
  console.log("- Voting parameters controlled by governance");
  console.log("- Membership configuration controlled by governance");
  console.log("- Treasury settings controlled by governance");
  console.log("- Staking requirements controlled by governance");
  console.log("- Reputation system controlled by governance");
  console.log("- Emergency settings update capability");
  console.log("- Settings change history tracking");
  console.log("- Pause/unpause functionality");

  console.log("\n📋 Next Steps:");
  console.log("1. Update frontend to use new governance settings");
  console.log("2. Create governance proposals for initial settings");
  console.log("3. Test governance flows with real users");
  console.log("4. Deploy subgraph with new governance events");
  console.log("5. Update documentation with governance processes");

  return addresses as DeploymentAddresses;
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
