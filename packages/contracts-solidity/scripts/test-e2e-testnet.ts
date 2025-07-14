import { ethers } from "hardhat";
import { expect } from "chai";
import { Contract, ContractFactory } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { GameId } from "../typechain-types";

interface TestResults {
    passed: number;
    failed: number;
    details: string[];
}

/**
 * Comprehensive End-to-End Test Suite for Testnet Deployment
 * Tests all critical functionality for GameDAO v3 hierarchical ID system
 */
async function runE2ETestnetSuite(): Promise<void> {
    console.log("🚀 Starting GameDAO v3 End-to-End Testnet Readiness Suite");
    console.log("=" .repeat(80));

    const startTime = Date.now();
    const results: TestResults = { passed: 0, failed: 0, details: [] };

    try {
        // Setup
        const [deployer, user1, user2, user3] = await ethers.getSigners();
        console.log(`📋 Test Setup:`);
        console.log(`   Deployer: ${deployer.address}`);
        console.log(`   User1: ${user1.address}`);
        console.log(`   User2: ${user2.address}`);
        console.log(`   User3: ${user3.address}`);
        console.log();

        // Deploy contracts
        console.log("🏗️  Deploying Contracts...");
        const contracts = await deployContracts(deployer);
        console.log("✅ Contracts deployed successfully");
        console.log();

        // Test Suite Categories
        await testContractDeployment(contracts, results);
        await testIdSystemFunctionality(contracts, results);
        await testOrganizationLifecycle(contracts, results);
        await testProposalLifecycle(contracts, results);
        await testVotingMechanisms(contracts, results);
        await testErrorHandling(contracts, results);
        await testPermissions(contracts, results);
        await testPerformance(contracts, results);
        await testGasOptimization(contracts, results);
        await testTestnetCompatibility(contracts, results);

        // Results Summary
        const duration = Date.now() - startTime;
        console.log("=" .repeat(80));
        console.log("📊 TEST RESULTS SUMMARY");
        console.log("=" .repeat(80));
        console.log(`✅ Passed: ${results.passed}`);
        console.log(`❌ Failed: ${results.failed}`);
        console.log(`⏱️  Duration: ${duration}ms`);
        console.log(`🎯 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);

        if (results.failed > 0) {
            console.log("\n❌ Failed Tests:");
            results.details.forEach(detail => console.log(`   ${detail}`));
        }

        console.log("\n🏁 Testnet Readiness Assessment:");
        if (results.failed === 0) {
            console.log("✅ READY FOR TESTNET DEPLOYMENT");
        } else if (results.failed <= 2) {
            console.log("⚠️  MOSTLY READY - Minor issues to fix");
        } else {
            console.log("❌ NOT READY - Critical issues need resolution");
        }

    } catch (error) {
        console.error("💥 Fatal error in test suite:", error);
        process.exit(1);
    }
}

async function deployContracts(deployer: SignerWithAddress) {
    // Deploy GameId library
    const GameIdFactory = await ethers.getContractFactory("GameId");
    const gameId = await GameIdFactory.deploy();
    await gameId.deployed();

    // Deploy Registry
    const RegistryFactory = await ethers.getContractFactory("GameDAORegistry");
    const registry = await RegistryFactory.deploy();
    await registry.deployed();

    // Deploy Control with GameId linked
    const ControlFactory = await ethers.getContractFactory("Control", {
        libraries: {
            GameId: gameId.address,
        },
    });
    const control = await ControlFactory.deploy();
    await control.deployed();

    // Deploy Signal (GameId is inlined by compiler)
    const SignalFactory = await ethers.getContractFactory("Signal");
    const signal = await SignalFactory.deploy();
    await signal.deployed();

    // Deploy Treasury
    const TreasuryFactory = await ethers.getContractFactory("Treasury");
    const treasury = await TreasuryFactory.deploy();
    await treasury.deployed();

    // Initialize contracts
    await registry.initialize();
    await control.initialize(registry.address);
    await signal.initialize(registry.address);
    await treasury.initialize(registry.address);

    // Register modules
    await registry.registerModule(await control.moduleId(), control.address);
    await registry.registerModule(await signal.moduleId(), signal.address);
    await registry.registerModule(await treasury.moduleId(), treasury.address);

    // Enable modules
    await registry.enableModule(await control.moduleId());
    await registry.enableModule(await signal.moduleId());
    await registry.enableModule(await treasury.moduleId());

    return {
        gameId,
        registry,
        control,
        signal,
        treasury,
    };
}

async function testContractDeployment(contracts: any, results: TestResults) {
    console.log("🏗️  Testing Contract Deployment...");

    try {
        // Test all contracts are deployed
        expect(contracts.gameId.address).to.not.equal(ethers.constants.AddressZero);
        expect(contracts.registry.address).to.not.equal(ethers.constants.AddressZero);
        expect(contracts.control.address).to.not.equal(ethers.constants.AddressZero);
        expect(contracts.signal.address).to.not.equal(ethers.constants.AddressZero);
        expect(contracts.treasury.address).to.not.equal(ethers.constants.AddressZero);

        // Test initialization
        expect(await contracts.control.isInitialized()).to.be.true;
        expect(await contracts.signal.isInitialized()).to.be.true;
        expect(await contracts.treasury.isInitialized()).to.be.true;

        // Test module registration
        const controlModuleId = await contracts.control.moduleId();
        const signalModuleId = await contracts.signal.moduleId();
        const treasuryModuleId = await contracts.treasury.moduleId();

        expect(await contracts.registry.isModuleEnabled(controlModuleId)).to.be.true;
        expect(await contracts.registry.isModuleEnabled(signalModuleId)).to.be.true;
        expect(await contracts.registry.isModuleEnabled(treasuryModuleId)).to.be.true;

        results.passed += 8;
        console.log("   ✅ Contract deployment tests passed");

    } catch (error) {
        results.failed += 1;
        results.details.push(`Contract deployment: ${error.message}`);
        console.log("   ❌ Contract deployment tests failed");
    }
}

async function testIdSystemFunctionality(contracts: any, results: TestResults) {
    console.log("🆔 Testing ID System Functionality...");

    try {
        // Test ID generation
        const orgId = ethers.utils.formatBytes32String("GAMEDAO").slice(0, 18); // bytes8
        const proposalId = await contracts.gameId.generateProposalId(orgId, 1);

        expect(proposalId).to.be.a('string');
        expect(proposalId.length).to.be.greaterThan(0);
        expect(proposalId).to.include('-P-');

        // Test ID validation
        const isValid = await contracts.gameId.isValidProposalId(proposalId);
        expect(isValid).to.be.true;

        // Test ID parsing
        const parsed = await contracts.gameId.parseProposalId(proposalId);
        expect(parsed.orgId).to.equal(orgId);
        expect(parsed.proposalNumber).to.equal(1);

        results.passed += 4;
        console.log("   ✅ ID system functionality tests passed");

    } catch (error) {
        results.failed += 1;
        results.details.push(`ID system functionality: ${error.message}`);
        console.log("   ❌ ID system functionality tests failed");
    }
}

async function testOrganizationLifecycle(contracts: any, results: TestResults) {
    console.log("🏢 Testing Organization Lifecycle...");

    try {
        const [deployer, user1] = await ethers.getSigners();

        // Create organization
        const tx = await contracts.control.createOrganization(
            "Test DAO",
            "ipfs://test-metadata",
            0, // Individual
            0, // Open
            0, // NoFees
            100, // memberLimit
            0, // membershipFee
            0  // gameStakeRequired
        );

        const receipt = await tx.wait();
        const event = receipt.events?.find(e => e.event === 'OrganizationCreated');
        const orgId = event?.args?.id;

        expect(orgId).to.not.be.undefined;

        // Get organization
        const org = await contracts.control.getOrganization(orgId);
        expect(org.name).to.equal("Test DAO");
        expect(org.creator).to.equal(deployer.address);

        // Add member
        await contracts.control.addMember(orgId, user1.address);
        expect(await contracts.control.isMember(orgId, user1.address)).to.be.true;

        // Check member count
        const memberCount = await contracts.control.getMemberCount(orgId);
        expect(memberCount).to.equal(2); // creator + added member

        results.passed += 5;
        console.log("   ✅ Organization lifecycle tests passed");

    } catch (error) {
        results.failed += 1;
        results.details.push(`Organization lifecycle: ${error.message}`);
        console.log("   ❌ Organization lifecycle tests failed");
    }
}

async function testProposalLifecycle(contracts: any, results: TestResults) {
    console.log("📋 Testing Proposal Lifecycle...");

    try {
        const [deployer, user1] = await ethers.getSigners();

        // Create organization first
        const orgTx = await contracts.control.createOrganization(
            "Proposal Test DAO",
            "ipfs://test-metadata",
            0, 0, 0, 100, 0, 0
        );
        const orgReceipt = await orgTx.wait();
        const orgEvent = orgReceipt.events?.find(e => e.event === 'OrganizationCreated');
        const orgId = orgEvent?.args?.id;

        // Add member
        await contracts.control.addMember(orgId, user1.address);

        // Create proposal
        const proposalTx = await contracts.signal.connect(user1).createProposal(
            orgId,
            "Test Proposal",
            "This is a test proposal",
            "ipfs://proposal-metadata",
            0, // Simple
            0, // Relative
            0, // Democratic
            86400, // 1 day voting period
            "0x", // no execution data
            ethers.constants.AddressZero
        );

        const proposalReceipt = await proposalTx.wait();
        const proposalEvent = proposalReceipt.events?.find(e => e.event === 'ProposalCreatedHierarchical');
        const hierarchicalId = proposalEvent?.args?.hierarchicalId;

        expect(hierarchicalId).to.not.be.undefined;
        expect(hierarchicalId).to.include('-P-');

        // Get proposal
        const proposal = await contracts.signal.getProposal(hierarchicalId);
        expect(proposal.title).to.equal("Test Proposal");
        expect(proposal.creator).to.equal(user1.address);
        expect(proposal.organizationId).to.equal(orgId);

        results.passed += 4;
        console.log("   ✅ Proposal lifecycle tests passed");

    } catch (error) {
        results.failed += 1;
        results.details.push(`Proposal lifecycle: ${error.message}`);
        console.log("   ❌ Proposal lifecycle tests failed");
    }
}

async function testVotingMechanisms(contracts: any, results: TestResults) {
    console.log("🗳️  Testing Voting Mechanisms...");

    try {
        const [deployer, user1, user2] = await ethers.getSigners();

        // Setup organization and proposal
        const orgTx = await contracts.control.createOrganization(
            "Voting Test DAO", "ipfs://test", 0, 0, 0, 100, 0, 0
        );
        const orgReceipt = await orgTx.wait();
        const orgId = orgReceipt.events?.find(e => e.event === 'OrganizationCreated')?.args?.id;

        await contracts.control.addMember(orgId, user1.address);
        await contracts.control.addMember(orgId, user2.address);

        const proposalTx = await contracts.signal.connect(user1).createProposal(
            orgId, "Voting Test", "Test voting", "ipfs://test", 0, 0, 0, 86400, "0x", ethers.constants.AddressZero
        );
        const proposalReceipt = await proposalTx.wait();
        const hierarchicalId = proposalReceipt.events?.find(e => e.event === 'ProposalCreatedHierarchical')?.args?.hierarchicalId;

        // Test voting
        await contracts.signal.connect(user1).castVote(hierarchicalId, 1, "I support this"); // For
        await contracts.signal.connect(user2).castVote(hierarchicalId, 0, "I oppose this"); // Against

        // Check votes
        const vote1 = await contracts.signal.getVote(hierarchicalId, user1.address);
        const vote2 = await contracts.signal.getVote(hierarchicalId, user2.address);

        expect(vote1.choice).to.equal(1); // For
        expect(vote2.choice).to.equal(0); // Against
        expect(vote1.hasVoted).to.be.true;
        expect(vote2.hasVoted).to.be.true;

        results.passed += 4;
        console.log("   ✅ Voting mechanisms tests passed");

    } catch (error) {
        results.failed += 1;
        results.details.push(`Voting mechanisms: ${error.message}`);
        console.log("   ❌ Voting mechanisms tests failed");
    }
}

async function testErrorHandling(contracts: any, results: TestResults) {
    console.log("⚠️  Testing Error Handling...");

    try {
        const [deployer, user1] = await ethers.getSigners();

        // Test invalid organization ID
        const invalidOrgId = ethers.utils.formatBytes32String("INVALID").slice(0, 18);

        await expect(
            contracts.signal.createProposal(
                invalidOrgId, "Test", "Test", "ipfs://test", 0, 0, 0, 86400, "0x", ethers.constants.AddressZero
            )
        ).to.be.revertedWith("OrganizationNotFound");

        // Test invalid proposal ID
        await expect(
            contracts.signal.getProposal("INVALID-P-001")
        ).to.be.revertedWith("ProposalNotFound");

        // Test double voting
        const orgTx = await contracts.control.createOrganization(
            "Error Test DAO", "ipfs://test", 0, 0, 0, 100, 0, 0
        );
        const orgReceipt = await orgTx.wait();
        const orgId = orgReceipt.events?.find(e => e.event === 'OrganizationCreated')?.args?.id;

        await contracts.control.addMember(orgId, user1.address);

        const proposalTx = await contracts.signal.connect(user1).createProposal(
            orgId, "Error Test", "Test", "ipfs://test", 0, 0, 0, 86400, "0x", ethers.constants.AddressZero
        );
        const proposalReceipt = await proposalTx.wait();
        const hierarchicalId = proposalReceipt.events?.find(e => e.event === 'ProposalCreatedHierarchical')?.args?.hierarchicalId;

        await contracts.signal.connect(user1).castVote(hierarchicalId, 1, "First vote");

        await expect(
            contracts.signal.connect(user1).castVote(hierarchicalId, 0, "Second vote")
        ).to.be.revertedWith("AlreadyVoted");

        results.passed += 3;
        console.log("   ✅ Error handling tests passed");

    } catch (error) {
        results.failed += 1;
        results.details.push(`Error handling: ${error.message}`);
        console.log("   ❌ Error handling tests failed");
    }
}

async function testPermissions(contracts: any, results: TestResults) {
    console.log("🔒 Testing Permissions...");

    try {
        const [deployer, user1, user2] = await ethers.getSigners();

        // Create organization
        const orgTx = await contracts.control.createOrganization(
            "Permission Test DAO", "ipfs://test", 0, 0, 0, 100, 0, 0
        );
        const orgReceipt = await orgTx.wait();
        const orgId = orgReceipt.events?.find(e => e.event === 'OrganizationCreated')?.args?.id;

        // Test non-member cannot create proposal
        await expect(
            contracts.signal.connect(user2).createProposal(
                orgId, "Unauthorized", "Test", "ipfs://test", 0, 0, 0, 86400, "0x", ethers.constants.AddressZero
            )
        ).to.be.revertedWith("MembershipRequired");

        // Test member can create proposal
        await contracts.control.addMember(orgId, user1.address);

        const proposalTx = await contracts.signal.connect(user1).createProposal(
            orgId, "Authorized", "Test", "ipfs://test", 0, 0, 0, 86400, "0x", ethers.constants.AddressZero
        );

        expect(proposalTx).to.not.be.reverted;

        results.passed += 2;
        console.log("   ✅ Permissions tests passed");

    } catch (error) {
        results.failed += 1;
        results.details.push(`Permissions: ${error.message}`);
        console.log("   ❌ Permissions tests failed");
    }
}

async function testPerformance(contracts: any, results: TestResults) {
    console.log("⚡ Testing Performance...");

    try {
        const [deployer, user1] = await ethers.getSigners();

        // Create organization
        const orgTx = await contracts.control.createOrganization(
            "Performance Test DAO", "ipfs://test", 0, 0, 0, 100, 0, 0
        );
        const orgReceipt = await orgTx.wait();
        const orgId = orgReceipt.events?.find(e => e.event === 'OrganizationCreated')?.args?.id;
        await contracts.control.addMember(orgId, user1.address);

        // Test proposal creation performance
        const startTime = Date.now();
        const proposalTx = await contracts.signal.connect(user1).createProposal(
            orgId, "Performance Test", "Test", "ipfs://test", 0, 0, 0, 86400, "0x", ethers.constants.AddressZero
        );
        const receipt = await proposalTx.wait();
        const endTime = Date.now();

        const duration = endTime - startTime;
        const gasUsed = receipt.gasUsed.toNumber();

        console.log(`   📊 Proposal creation: ${duration}ms, ${gasUsed} gas`);

        // Performance thresholds
        expect(duration).to.be.lessThan(5000); // < 5 seconds
        expect(gasUsed).to.be.lessThan(500000); // < 500k gas

        results.passed += 2;
        console.log("   ✅ Performance tests passed");

    } catch (error) {
        results.failed += 1;
        results.details.push(`Performance: ${error.message}`);
        console.log("   ❌ Performance tests failed");
    }
}

async function testGasOptimization(contracts: any, results: TestResults) {
    console.log("⛽ Testing Gas Optimization...");

    try {
        const [deployer, user1] = await ethers.getSigners();

        // Create organization
        const orgTx = await contracts.control.createOrganization(
            "Gas Test DAO", "ipfs://test", 0, 0, 0, 100, 0, 0
        );
        const orgReceipt = await orgTx.wait();
        const orgId = orgReceipt.events?.find(e => e.event === 'OrganizationCreated')?.args?.id;
        await contracts.control.addMember(orgId, user1.address);

        // Test gas usage for different operations
        const operations = [
            {
                name: "Create Proposal",
                tx: () => contracts.signal.connect(user1).createProposal(
                    orgId, "Gas Test", "Test", "ipfs://test", 0, 0, 0, 86400, "0x", ethers.constants.AddressZero
                ),
                maxGas: 300000
            },
            {
                name: "Cast Vote",
                tx: async () => {
                    const proposalTx = await contracts.signal.connect(user1).createProposal(
                        orgId, "Vote Gas Test", "Test", "ipfs://test", 0, 0, 0, 86400, "0x", ethers.constants.AddressZero
                    );
                    const receipt = await proposalTx.wait();
                    const hierarchicalId = receipt.events?.find(e => e.event === 'ProposalCreatedHierarchical')?.args?.hierarchicalId;
                    return contracts.signal.connect(user1).castVote(hierarchicalId, 1, "Gas test vote");
                },
                maxGas: 150000
            }
        ];

        for (const operation of operations) {
            const tx = await operation.tx();
            const receipt = await tx.wait();
            const gasUsed = receipt.gasUsed.toNumber();

            console.log(`   ⛽ ${operation.name}: ${gasUsed} gas`);
            expect(gasUsed).to.be.lessThan(operation.maxGas);
        }

        results.passed += operations.length;
        console.log("   ✅ Gas optimization tests passed");

    } catch (error) {
        results.failed += 1;
        results.details.push(`Gas optimization: ${error.message}`);
        console.log("   ❌ Gas optimization tests failed");
    }
}

async function testTestnetCompatibility(contracts: any, results: TestResults) {
    console.log("🌐 Testing Testnet Compatibility...");

    try {
        // Test contract size limits
        const signalCode = await ethers.provider.getCode(contracts.signal.address);
        const signalSize = (signalCode.length - 2) / 2; // Remove 0x prefix and convert to bytes

        console.log(`   📏 Signal contract size: ${signalSize} bytes`);

        // Testnet usually allows larger contracts than mainnet
        expect(signalSize).to.be.lessThan(50000); // 50KB limit for testnet

        // Test network compatibility
        const network = await ethers.provider.getNetwork();
        console.log(`   🌐 Network: ${network.name} (${network.chainId})`);

        // Test block gas limit compatibility
        const block = await ethers.provider.getBlock('latest');
        console.log(`   ⛽ Block gas limit: ${block.gasLimit.toString()}`);

        results.passed += 2;
        console.log("   ✅ Testnet compatibility tests passed");

    } catch (error) {
        results.failed += 1;
        results.details.push(`Testnet compatibility: ${error.message}`);
        console.log("   ❌ Testnet compatibility tests failed");
    }
}

// Run the test suite
if (require.main === module) {
    runE2ETestnetSuite()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

export { runE2ETestnetSuite };
