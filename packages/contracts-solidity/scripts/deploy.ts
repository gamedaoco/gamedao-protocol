import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("🚀 Deploying GameDAO Protocol contracts...");
  console.log("📍 Deploying with account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));
  console.log("");

  // 1. Deploy GameDAO Registry
  console.log("📋 Deploying GameDAO Registry...");
  const GameDAORegistryFactory = await ethers.getContractFactory("GameDAORegistry");
  const registry = await GameDAORegistryFactory.deploy(deployer.address);
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("✅ GameDAO Registry deployed to:", registryAddress);
  console.log("");

  // 2. Deploy Control Module
  console.log("🏛️ Deploying Control Module...");
  const ControlFactory = await ethers.getContractFactory("Control");
  const control = await ControlFactory.deploy();
  await control.waitForDeployment();
  const controlAddress = await control.getAddress();
  console.log("✅ Control Module deployed to:", controlAddress);
  console.log("");

  // 3. Register and Enable Control Module
  console.log("🔗 Registering Control Module with Registry...");
  const MODULE_ID = ethers.keccak256(ethers.toUtf8Bytes("CONTROL"));

  await registry.registerModule(controlAddress);
  console.log("📝 Control Module registered and initialized");

  await registry.enableModule(MODULE_ID);
  console.log("⚡ Control Module enabled");
  console.log("");

  // 5. Create a Test Organization
  console.log("🏗️ Creating test organization...");
  const createOrgTx = await control.createOrganization(
    "GameDAO Test DAO",
    "ipfs://QmTestMetadata123",
    2, // DAO type
    0, // Open access
    0, // No fees
    100, // Member limit
    0, // No membership fee
    0  // No GAME stake required (for now)
  );

  const receipt = await createOrgTx.wait();
  const event = receipt?.logs.find(log =>
    control.interface.parseLog(log as any)?.name === "OrganizationCreated"
  );

  if (event) {
    const parsedEvent = control.interface.parseLog(event as any);
    const orgId = parsedEvent?.args[0];

    console.log("🎉 Test organization created!");
    console.log("🆔 Organization ID:", orgId);

    // Get organization details
    const org = await control.getOrganization(orgId);
    console.log("📊 Organization Details:");
    console.log("   Name:", org.name);
    console.log("   Creator:", org.creator);
    console.log("   Treasury:", org.treasury);
    console.log("   Member Count:", await control.getMemberCount(orgId));
    console.log("   Is Active:", await control.isOrganizationActive(orgId));
    console.log("");

    // 6. Test Treasury Integration
    console.log("💰 Testing Treasury Integration...");
    const Treasury = await ethers.getContractFactory("Treasury");
    const treasury = Treasury.attach(org.treasury) as any; // Type assertion for treasury methods

    console.log("🏦 Treasury Details:");
    console.log("   Address:", org.treasury);
    console.log("   Organization ID:", await treasury.organizationId());
    console.log("   Control Module:", await treasury.controlModule());
    console.log("");

    // 7. Add a test member
    console.log("👥 Adding test member...");
    const [, testMember] = await ethers.getSigners();

    await control.connect(testMember).addMember(orgId, testMember.address);
    console.log("✅ Test member added:", testMember.address);
    console.log("👥 New member count:", await control.getMemberCount(orgId));
    console.log("✅ Member is active:", await control.isMemberActive(orgId, testMember.address));
    console.log("");

    // 8. Summary
    console.log("🎯 DEPLOYMENT SUMMARY");
    console.log("====================");
    console.log("Registry Address:    ", registryAddress);
    console.log("Control Address:     ", controlAddress);
    console.log("Test Org ID:         ", orgId);
    console.log("Test Treasury:       ", org.treasury);
    console.log("Total Organizations: ", await control.getOrganizationCount());
    console.log("");
    console.log("🚀 GameDAO Protocol successfully deployed and tested!");

    return {
      registry: registryAddress,
      control: controlAddress,
      testOrgId: orgId,
      testTreasury: org.treasury
    };
  } else {
    throw new Error("Organization creation event not found");
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then((deploymentInfo) => {
    console.log("\n✨ Deployment completed successfully!");
    console.log("📋 Save these addresses for frontend integration:");
    console.log(JSON.stringify(deploymentInfo, null, 2));
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
