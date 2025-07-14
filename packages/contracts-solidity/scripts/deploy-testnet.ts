import { ethers } from "hardhat";
import { Contract } from "ethers";
import fs from "fs";
import path from "path";

interface DeploymentResult {
    network: string;
    chainId: number;
    deployer: string;
    timestamp: string;
    contracts: {
        [key: string]: {
            address: string;
            txHash: string;
            gasUsed: number;
            blockNumber: number;
        };
    };
    verification: {
        [key: string]: boolean;
    };
    totalGasUsed: number;
    totalDeploymentCost: string;
}

/**
 * Comprehensive Testnet Deployment Script
 * Deploys GameDAO v3 contracts with hierarchical ID system
 * Includes validation, monitoring, and post-deployment verification
 */
async function deployToTestnet(): Promise<void> {
    console.log("🚀 GameDAO v3 Testnet Deployment");
    console.log("=" .repeat(60));

    const startTime = Date.now();
    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();

    console.log(`📋 Deployment Info:`);
    console.log(`   Network: ${network.name} (${network.chainId})`);
    console.log(`   Deployer: ${deployer.address}`);
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);
    console.log();

    const deploymentResult: DeploymentResult = {
        network: network.name,
        chainId: network.chainId,
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        contracts: {},
        verification: {},
        totalGasUsed: 0,
        totalDeploymentCost: "0"
    };

    try {
        // Pre-deployment checks
        await performPreDeploymentChecks(deployer);

        // Deploy contracts in order
        console.log("🏗️  Deploying Contracts...");

        const gameId = await deployGameId(deploymentResult);
        const registry = await deployRegistry(deploymentResult);
        const control = await deployControl(gameId.address, deploymentResult);
        const signal = await deploySignal(gameId.address, deploymentResult);
        const treasury = await deployTreasury(deploymentResult);

        // Initialize contracts
        console.log("⚙️  Initializing Contracts...");
        await initializeContracts(registry, control, signal, treasury, deploymentResult);

        // Post-deployment validation
        console.log("✅ Validating Deployment...");
        await validateDeployment(registry, control, signal, treasury, deploymentResult);

        // Save deployment results
        await saveDeploymentResults(deploymentResult);

        // Final summary
        const duration = Date.now() - startTime;
        const totalCostEth = ethers.utils.formatEther(deploymentResult.totalDeploymentCost);

        console.log("=" .repeat(60));
        console.log("🎉 DEPLOYMENT SUCCESSFUL!");
        console.log("=" .repeat(60));
        console.log(`⏱️  Duration: ${duration}ms`);
        console.log(`⛽ Total Gas: ${deploymentResult.totalGasUsed.toLocaleString()}`);
        console.log(`💰 Total Cost: ${totalCostEth} ETH`);
        console.log(`📄 Results saved to: deployment-addresses.json`);
        console.log();

        console.log("📋 Contract Addresses:");
        Object.entries(deploymentResult.contracts).forEach(([name, info]) => {
            console.log(`   ${name}: ${info.address}`);
        });

        console.log("\n🔗 Next Steps:");
        console.log("   1. Verify contracts on block explorer");
        console.log("   2. Run end-to-end tests: make test-e2e-testnet");
        console.log("   3. Setup frontend configuration");
        console.log("   4. Deploy subgraph");

    } catch (error) {
        console.error("💥 Deployment failed:", error);

        // Save partial deployment results
        deploymentResult.timestamp = new Date().toISOString();
        await saveDeploymentResults(deploymentResult);

        process.exit(1);
    }
}

async function performPreDeploymentChecks(deployer: any): Promise<void> {
    console.log("🔍 Pre-deployment Checks...");

    // Check balance
    const balance = await deployer.getBalance();
    const minBalance = ethers.utils.parseEther("0.1"); // 0.1 ETH minimum

    if (balance.lt(minBalance)) {
        throw new Error(`Insufficient balance: ${ethers.utils.formatEther(balance)} ETH (minimum: 0.1 ETH)`);
    }

    // Check network
    const network = await ethers.provider.getNetwork();
    const supportedNetworks = [1337, 31337, 5, 11155111, 80001]; // localhost, goerli, sepolia, mumbai

    if (!supportedNetworks.includes(network.chainId)) {
        console.warn(`⚠️  Deploying to unsupported network: ${network.name} (${network.chainId})`);
    }

    // Check gas price
    const gasPrice = await ethers.provider.getGasPrice();
    console.log(`   Gas Price: ${ethers.utils.formatUnits(gasPrice, "gwei")} gwei`);

    console.log("   ✅ Pre-deployment checks passed");
}

async function deployGameId(deploymentResult: DeploymentResult): Promise<Contract> {
    console.log("   📚 Deploying GameId library...");

    const GameIdFactory = await ethers.getContractFactory("GameId");
    const gameId = await GameIdFactory.deploy();
    const receipt = await gameId.deployTransaction.wait();

    deploymentResult.contracts.GameId = {
        address: gameId.address,
        txHash: gameId.deployTransaction.hash,
        gasUsed: receipt.gasUsed.toNumber(),
        blockNumber: receipt.blockNumber
    };

    deploymentResult.totalGasUsed += receipt.gasUsed.toNumber();

    console.log(`      ✅ GameId deployed at: ${gameId.address}`);
    console.log(`      ⛽ Gas used: ${receipt.gasUsed.toNumber().toLocaleString()}`);

    return gameId;
}

async function deployRegistry(deploymentResult: DeploymentResult): Promise<Contract> {
    console.log("   🏛️  Deploying GameDAORegistry...");

    const RegistryFactory = await ethers.getContractFactory("GameDAORegistry");
    const registry = await RegistryFactory.deploy();
    const receipt = await registry.deployTransaction.wait();

    deploymentResult.contracts.GameDAORegistry = {
        address: registry.address,
        txHash: registry.deployTransaction.hash,
        gasUsed: receipt.gasUsed.toNumber(),
        blockNumber: receipt.blockNumber
    };

    deploymentResult.totalGasUsed += receipt.gasUsed.toNumber();

    console.log(`      ✅ Registry deployed at: ${registry.address}`);
    console.log(`      ⛽ Gas used: ${receipt.gasUsed.toNumber().toLocaleString()}`);

    return registry;
}

async function deployControl(gameIdAddress: string, deploymentResult: DeploymentResult): Promise<Contract> {
    console.log("   🎛️  Deploying Control module...");

    const ControlFactory = await ethers.getContractFactory("Control", {
        libraries: {
            GameId: gameIdAddress,
        },
    });
    const control = await ControlFactory.deploy();
    const receipt = await control.deployTransaction.wait();

    deploymentResult.contracts.Control = {
        address: control.address,
        txHash: control.deployTransaction.hash,
        gasUsed: receipt.gasUsed.toNumber(),
        blockNumber: receipt.blockNumber
    };

    deploymentResult.totalGasUsed += receipt.gasUsed.toNumber();

    console.log(`      ✅ Control deployed at: ${control.address}`);
    console.log(`      ⛽ Gas used: ${receipt.gasUsed.toNumber().toLocaleString()}`);

    return control;
}

async function deploySignal(gameIdAddress: string, deploymentResult: DeploymentResult): Promise<Contract> {
    console.log("   📡 Deploying Signal module...");

    const SignalFactory = await ethers.getContractFactory("Signal");
    const signal = await SignalFactory.deploy();
    const receipt = await signal.deployTransaction.wait();

    deploymentResult.contracts.Signal = {
        address: signal.address,
        txHash: signal.deployTransaction.hash,
        gasUsed: receipt.gasUsed.toNumber(),
        blockNumber: receipt.blockNumber
    };

    deploymentResult.totalGasUsed += receipt.gasUsed.toNumber();

    // Check contract size
    const code = await ethers.provider.getCode(signal.address);
    const size = (code.length - 2) / 2; // Remove 0x prefix and convert to bytes
    console.log(`      📏 Contract size: ${size.toLocaleString()} bytes`);

    if (size > 24576) { // 24KB
        console.warn(`      ⚠️  Contract size exceeds mainnet limit (${size} > 24576 bytes)`);
    }

    console.log(`      ✅ Signal deployed at: ${signal.address}`);
    console.log(`      ⛽ Gas used: ${receipt.gasUsed.toNumber().toLocaleString()}`);

    return signal;
}

async function deployTreasury(deploymentResult: DeploymentResult): Promise<Contract> {
    console.log("   💰 Deploying Treasury module...");

    const TreasuryFactory = await ethers.getContractFactory("Treasury");
    const treasury = await TreasuryFactory.deploy();
    const receipt = await treasury.deployTransaction.wait();

    deploymentResult.contracts.Treasury = {
        address: treasury.address,
        txHash: treasury.deployTransaction.hash,
        gasUsed: receipt.gasUsed.toNumber(),
        blockNumber: receipt.blockNumber
    };

    deploymentResult.totalGasUsed += receipt.gasUsed.toNumber();

    console.log(`      ✅ Treasury deployed at: ${treasury.address}`);
    console.log(`      ⛽ Gas used: ${receipt.gasUsed.toNumber().toLocaleString()}`);

    return treasury;
}

async function initializeContracts(
    registry: Contract,
    control: Contract,
    signal: Contract,
    treasury: Contract,
    deploymentResult: DeploymentResult
): Promise<void> {
    console.log("   🔧 Initializing registry...");
    const initRegistryTx = await registry.initialize();
    const initRegistryReceipt = await initRegistryTx.wait();
    deploymentResult.totalGasUsed += initRegistryReceipt.gasUsed.toNumber();

    console.log("   🔧 Initializing modules...");
    const initControlTx = await control.initialize(registry.address);
    const initControlReceipt = await initControlTx.wait();
    deploymentResult.totalGasUsed += initControlReceipt.gasUsed.toNumber();

    const initSignalTx = await signal.initialize(registry.address);
    const initSignalReceipt = await initSignalTx.wait();
    deploymentResult.totalGasUsed += initSignalReceipt.gasUsed.toNumber();

    const initTreasuryTx = await treasury.initialize(registry.address);
    const initTreasuryReceipt = await initTreasuryTx.wait();
    deploymentResult.totalGasUsed += initTreasuryReceipt.gasUsed.toNumber();

    console.log("   📝 Registering modules...");
    const controlModuleId = await control.moduleId();
    const signalModuleId = await signal.moduleId();
    const treasuryModuleId = await treasury.moduleId();

    const regControlTx = await registry.registerModule(controlModuleId, control.address);
    const regControlReceipt = await regControlTx.wait();
    deploymentResult.totalGasUsed += regControlReceipt.gasUsed.toNumber();

    const regSignalTx = await registry.registerModule(signalModuleId, signal.address);
    const regSignalReceipt = await regSignalTx.wait();
    deploymentResult.totalGasUsed += regSignalReceipt.gasUsed.toNumber();

    const regTreasuryTx = await registry.registerModule(treasuryModuleId, treasury.address);
    const regTreasuryReceipt = await regTreasuryTx.wait();
    deploymentResult.totalGasUsed += regTreasuryReceipt.gasUsed.toNumber();

    console.log("   ✅ Enabling modules...");
    const enableControlTx = await registry.enableModule(controlModuleId);
    const enableControlReceipt = await enableControlTx.wait();
    deploymentResult.totalGasUsed += enableControlReceipt.gasUsed.toNumber();

    const enableSignalTx = await registry.enableModule(signalModuleId);
    const enableSignalReceipt = await enableSignalTx.wait();
    deploymentResult.totalGasUsed += enableSignalReceipt.gasUsed.toNumber();

    const enableTreasuryTx = await registry.enableModule(treasuryModuleId);
    const enableTreasuryReceipt = await enableTreasuryTx.wait();
    deploymentResult.totalGasUsed += enableTreasuryReceipt.gasUsed.toNumber();

    console.log("   ✅ Contracts initialized successfully");
}

async function validateDeployment(
    registry: Contract,
    control: Contract,
    signal: Contract,
    treasury: Contract,
    deploymentResult: DeploymentResult
): Promise<void> {
    console.log("   🔍 Validating contract initialization...");

    // Check initialization
    const isControlInit = await control.isInitialized();
    const isSignalInit = await signal.isInitialized();
    const isTreasuryInit = await treasury.isInitialized();

    deploymentResult.verification.controlInitialized = isControlInit;
    deploymentResult.verification.signalInitialized = isSignalInit;
    deploymentResult.verification.treasuryInitialized = isTreasuryInit;

    if (!isControlInit || !isSignalInit || !isTreasuryInit) {
        throw new Error("Contract initialization failed");
    }

    console.log("   🔍 Validating module registration...");

    // Check module registration
    const controlModuleId = await control.moduleId();
    const signalModuleId = await signal.moduleId();
    const treasuryModuleId = await treasury.moduleId();

    const isControlEnabled = await registry.isModuleEnabled(controlModuleId);
    const isSignalEnabled = await registry.isModuleEnabled(signalModuleId);
    const isTreasuryEnabled = await registry.isModuleEnabled(treasuryModuleId);

    deploymentResult.verification.controlEnabled = isControlEnabled;
    deploymentResult.verification.signalEnabled = isSignalEnabled;
    deploymentResult.verification.treasuryEnabled = isTreasuryEnabled;

    if (!isControlEnabled || !isSignalEnabled || !isTreasuryEnabled) {
        throw new Error("Module registration failed");
    }

    console.log("   🔍 Testing basic functionality...");

    // Test basic functionality
    try {
        // Test organization creation
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
        const orgEvent = createOrgReceipt.events?.find(e => e.event === 'OrganizationCreated');

        if (!orgEvent) {
            throw new Error("Organization creation event not found");
        }

        const orgId = orgEvent.args?.id;
        deploymentResult.verification.organizationCreation = true;

        // Test proposal creation
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
            ethers.constants.AddressZero
        );

        const createProposalReceipt = await createProposalTx.wait();
        const proposalEvent = createProposalReceipt.events?.find(e => e.event === 'ProposalCreatedHierarchical');

        if (!proposalEvent) {
            throw new Error("Proposal creation event not found");
        }

        deploymentResult.verification.proposalCreation = true;

        console.log("   ✅ Basic functionality test passed");

    } catch (error) {
        console.error("   ❌ Basic functionality test failed:", error);
        deploymentResult.verification.basicFunctionality = false;
        throw error;
    }

    deploymentResult.verification.basicFunctionality = true;
    console.log("   ✅ Deployment validation completed");
}

async function saveDeploymentResults(deploymentResult: DeploymentResult): Promise<void> {
    // Calculate total deployment cost
    const gasPrice = await ethers.provider.getGasPrice();
    const totalCost = gasPrice.mul(deploymentResult.totalGasUsed);
    deploymentResult.totalDeploymentCost = totalCost.toString();

    // Save to deployment-addresses.json
    const deploymentPath = path.join(__dirname, "..", "deployment-addresses.json");
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentResult, null, 2));

    // Save to logs directory
    const logsDir = path.join(__dirname, "..", "..", "..", "logs");
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }

    const logPath = path.join(logsDir, `deployment-${Date.now()}.json`);
    fs.writeFileSync(logPath, JSON.stringify(deploymentResult, null, 2));

    console.log(`   💾 Deployment results saved to: ${deploymentPath}`);
    console.log(`   📝 Deployment log saved to: ${logPath}`);
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
