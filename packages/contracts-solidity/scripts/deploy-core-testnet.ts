import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

/**
 * Core Testnet Deployment Script
 * Deploys GameDAO v3 core contracts with hierarchical ID system
 */
async function deployToTestnet(): Promise<void> {
    console.log("🚀 GameDAO v3 Core Testnet Deployment");
    console.log("=" .repeat(60));

    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();

    console.log(`📋 Deployment Info:`);
    console.log(`   Network: ${network.name} (${network.chainId})`);
    console.log(`   Deployer: ${deployer.address}`);
    console.log();

    const deploymentAddresses: any = {};

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

        // Deploy Control (needs game token address)
        console.log("🎛️  Deploying Control module...");
        const ControlFactory = await ethers.getContractFactory("Control");
        const control = await ControlFactory.deploy(ethers.ZeroAddress); // Use zero address for testing
        await control.waitForDeployment();
        const controlAddress = await control.getAddress();

        deploymentAddresses.Control = controlAddress;
        console.log(`   ✅ Control deployed at: ${controlAddress}`);

        // Deploy Signal (try without library linking first)
        console.log("📡 Deploying Signal module...");
        const SignalFactory = await ethers.getContractFactory("Signal");
        const signal = await SignalFactory.deploy();
        await signal.waitForDeployment();
        const signalAddress = await signal.getAddress();

        deploymentAddresses.Signal = signalAddress;
        console.log(`   ✅ Signal deployed at: ${signalAddress}`);

                // Initialize modules
        console.log("⚙️  Initializing Modules...");

        console.log("   🔧 Initializing Control...");
        try {
            const controlInitTx = await control.initialize(registryAddress);
            await controlInitTx.wait();
            console.log("   ✅ Control initialization successful");
        } catch (error: any) {
            console.error("   ❌ Control initialization failed:", error.message);
            throw error;
        }

        console.log("   🔧 Initializing Signal...");
        try {
            const signalInitTx = await signal.initialize(registryAddress);
            await signalInitTx.wait();
            console.log("   ✅ Signal initialization successful");
        } catch (error: any) {
            console.error("   ❌ Signal initialization failed:", error.message);
            throw error;
        }

        // Register modules
        console.log("   📝 Registering modules...");
        try {
            await registry.registerModule(controlAddress);
            console.log("   ✅ Control module registered");
            await registry.registerModule(signalAddress);
            console.log("   ✅ Signal module registered");
        } catch (error: any) {
            console.error("   ❌ Module registration failed:", error.message);
            throw error;
        }

        // Get module IDs
        const controlModuleId = await control.moduleId();
        const signalModuleId = await signal.moduleId();

        console.log(`   📋 Control module ID: ${controlModuleId}`);
        console.log(`   📋 Signal module ID: ${signalModuleId}`);

        // Enable modules
        console.log("   ✅ Enabling modules...");
        try {
            const enableControlTx = await registry.enableModule(controlModuleId);
            await enableControlTx.wait();
            console.log("   ✅ Control module enabled");

            const enableSignalTx = await registry.enableModule(signalModuleId);
            await enableSignalTx.wait();
            console.log("   ✅ Signal module enabled");
        } catch (error: any) {
            console.error("   ❌ Module enabling failed:", error.message);
            throw error;
        }

                // Basic validation
        console.log("✅ Validating Deployment...");

        const isControlInit = await control.isInitialized();
        const isSignalInit = await signal.isInitialized();

        console.log(`   Control initialized: ${isControlInit}`);
        console.log(`   Signal initialized: ${isSignalInit}`);

        if (!isControlInit || !isSignalInit) {
            throw new Error(`Module initialization failed - Control: ${isControlInit}, Signal: ${isSignalInit}`);
        }

        const isControlEnabled = await registry.isModuleEnabled(controlModuleId);
        const isSignalEnabled = await registry.isModuleEnabled(signalModuleId);

        console.log(`   Control enabled: ${isControlEnabled}`);
        console.log(`   Signal enabled: ${isSignalEnabled}`);

        if (!isControlEnabled || !isSignalEnabled) {
            throw new Error(`Module registration failed - Control enabled: ${isControlEnabled}, Signal enabled: ${isSignalEnabled}`);
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

        const parsedEvent = control.interface.parseLog(orgEvent);
        const orgId = parsedEvent?.args?.id;

        console.log("   ✅ Organization creation test passed");

        // Test proposal creation
        console.log("   🧪 Testing proposal creation...");

        const createProposalTx = await signal.createProposal(
            orgId,
            "Test Proposal",
            "This is a test proposal for deployment validation",
            "ipfs://test-proposal-metadata",
            0, // Simple
            0, // Relative
            0, // Democratic
            86400, // 1 day voting period
            "0x", // no execution data
            ethers.ZeroAddress
        );

        const createProposalReceipt = await createProposalTx.wait();
        const proposalEvent = createProposalReceipt?.logs.find((log: any) => {
            try {
                const parsed = signal.interface.parseLog(log);
                return parsed?.name === 'ProposalCreatedHierarchical';
            } catch {
                return false;
            }
        });

        if (!proposalEvent) {
            throw new Error("Proposal creation failed");
        }

        const parsedProposalEvent = signal.interface.parseLog(proposalEvent);
        const hierarchicalId = parsedProposalEvent?.args?.hierarchicalId;

        console.log(`   ✅ Proposal created with ID: ${hierarchicalId}`);

        // Save deployment results
        const deploymentResult = {
            network: network.name,
            chainId: Number(network.chainId),
            deployer: deployer.address,
            timestamp: new Date().toISOString(),
            contracts: deploymentAddresses,
            testResults: {
                organizationCreation: true,
                proposalCreation: true,
                hierarchicalId: hierarchicalId
            }
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

        console.log("\n🧪 Test Results:");
        console.log(`   ✅ Organization created successfully`);
        console.log(`   ✅ Proposal created with hierarchical ID: ${hierarchicalId}`);

        console.log("\n🔗 Next Steps:");
        console.log("   1. Run: make test-e2e-testnet");
        console.log("   2. Deploy to actual testnet");
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
