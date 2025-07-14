import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

/**
 * Simplified Testnet Deployment Script
 * Deploys GameDAO v3 contracts with hierarchical ID system
 */
async function deployToTestnet(): Promise<void> {
    console.log("🚀 GameDAO v3 Testnet Deployment");
    console.log("=" .repeat(60));

    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();

    console.log(`📋 Deployment Info:`);
    console.log(`   Network: ${network.name} (${network.chainId})`);
    console.log(`   Deployer: ${deployer.address}`);
    console.log();

    const deploymentAddresses: any = {};
    let totalGasUsed = 0;

    try {
        // Deploy GameId library
        console.log("📚 Deploying GameId library...");
        const GameIdFactory = await ethers.getContractFactory("GameId");
        const gameId = await GameIdFactory.deploy();
        await gameId.waitForDeployment();
        const gameIdAddress = await gameId.getAddress();

        deploymentAddresses.GameId = gameIdAddress;
        console.log(`   ✅ GameId deployed at: ${gameIdAddress}`);

        // Deploy Registry
        console.log("🏛️  Deploying GameDAORegistry...");
        const RegistryFactory = await ethers.getContractFactory("GameDAORegistry");
        const registry = await RegistryFactory.deploy(deployer.address);
        await registry.waitForDeployment();
        const registryAddress = await registry.getAddress();

        deploymentAddresses.GameDAORegistry = registryAddress;
        console.log(`   ✅ Registry deployed at: ${registryAddress}`);

        // Deploy Control with GameId linked
        console.log("🎛️  Deploying Control module...");
        const ControlFactory = await ethers.getContractFactory("Control", {
            libraries: {
                GameId: gameIdAddress,
            },
        });
        const control = await ControlFactory.deploy();
        await control.waitForDeployment();
        const controlAddress = await control.getAddress();

        deploymentAddresses.Control = controlAddress;
        console.log(`   ✅ Control deployed at: ${controlAddress}`);

        // Deploy Signal (GameId is inlined by compiler)
        console.log("📡 Deploying Signal module...");
        const SignalFactory = await ethers.getContractFactory("Signal");
        const signal = await SignalFactory.deploy();
        await signal.waitForDeployment();
        const signalAddress = await signal.getAddress();

        deploymentAddresses.Signal = signalAddress;
        console.log(`   ✅ Signal deployed at: ${signalAddress}`);

        // Deploy Treasury
        console.log("💰 Deploying Treasury module...");
        const TreasuryFactory = await ethers.getContractFactory("Treasury");
        const treasury = await TreasuryFactory.deploy();
        await treasury.waitForDeployment();
        const treasuryAddress = await treasury.getAddress();

        deploymentAddresses.Treasury = treasuryAddress;
        console.log(`   ✅ Treasury deployed at: ${treasuryAddress}`);

                // Initialize contracts
        console.log("⚙️  Initializing Contracts...");

        console.log("   🔧 Initializing modules...");
        await control.initialize(registryAddress);
        await signal.initialize(registryAddress);
        await treasury.initialize(registryAddress);

        console.log("   📝 Registering modules...");
        await registry.registerModule(controlAddress);
        await registry.registerModule(signalAddress);
        await registry.registerModule(treasuryAddress);

        console.log("   ✅ Getting module IDs...");
        const controlModuleId = await control.moduleId();
        const signalModuleId = await signal.moduleId();
        const treasuryModuleId = await treasury.moduleId();

        console.log("   ✅ Enabling modules...");
        await registry.enableModule(controlModuleId);
        await registry.enableModule(signalModuleId);
        await registry.enableModule(treasuryModuleId);

        // Basic validation
        console.log("✅ Validating Deployment...");

        const isControlInit = await control.isInitialized();
        const isSignalInit = await signal.isInitialized();
        const isTreasuryInit = await treasury.isInitialized();

        if (!isControlInit || !isSignalInit || !isTreasuryInit) {
            throw new Error("Contract initialization failed");
        }

        const isControlEnabled = await registry.isModuleEnabled(controlModuleId);
        const isSignalEnabled = await registry.isModuleEnabled(signalModuleId);
        const isTreasuryEnabled = await registry.isModuleEnabled(treasuryModuleId);

        if (!isControlEnabled || !isSignalEnabled || !isTreasuryEnabled) {
            throw new Error("Module registration failed");
        }

        // Test basic functionality
        console.log("🧪 Testing Basic Functionality...");

        const createOrgTx = await control.createOrganization(
            "Test Organization",
            "ipfs://test-metadata",
            0, // Individual
            0, // Open
            0, // NoFees
            100, // memberLimit
            0, // membershipFee
            0  // gameStakeRequired
        );

        const createOrgReceipt = await createOrgTx.wait();
        const orgEvent = createOrgReceipt?.logs.find((log: any) => {
            try {
                const parsed = control.interface.parseLog(log);
                return parsed?.name === 'OrganizationCreated';
            } catch {
                return false;
            }
        });

        if (!orgEvent) {
            throw new Error("Organization creation failed");
        }

        console.log("   ✅ Organization creation test passed");

        // Save deployment results
        const deploymentResult = {
            network: network.name,
            chainId: Number(network.chainId),
            deployer: deployer.address,
            timestamp: new Date().toISOString(),
            contracts: deploymentAddresses,
        };

        const deploymentPath = path.join(__dirname, "..", "deployment-addresses.json");
        fs.writeFileSync(deploymentPath, JSON.stringify(deploymentResult, null, 2));

        console.log("=" .repeat(60));
        console.log("🎉 DEPLOYMENT SUCCESSFUL!");
        console.log("=" .repeat(60));
        console.log(`📄 Results saved to: deployment-addresses.json`);
        console.log();

        console.log("📋 Contract Addresses:");
        Object.entries(deploymentAddresses).forEach(([name, address]) => {
            console.log(`   ${name}: ${address}`);
        });

        console.log("\n🔗 Next Steps:");
        console.log("   1. Verify contracts on block explorer");
        console.log("   2. Run end-to-end tests");
        console.log("   3. Setup frontend configuration");
        console.log("   4. Deploy subgraph");

    } catch (error) {
        console.error("💥 Deployment failed:", error);
        process.exit(1);
    }
}

// Run deployment
if (require.main === module) {
    deployToTestnet()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

export { deployToTestnet };
