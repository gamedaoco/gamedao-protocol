import { ethers } from "hardhat";
import fs from "fs";

async function main() {
  console.log("🔍 Validating GameDAO Protocol Deployment with Hierarchical IDs");
  console.log("================================================================");

  // Load deployment addresses
  const deploymentFile = "./deployment-addresses.json";
  if (!fs.existsSync(deploymentFile)) {
    console.error("❌ Deployment addresses not found. Run deployment first.");
    process.exit(1);
  }

  const addresses = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));

  // Validation checklist
  const validationResults = {
    contractsDeployed: false,
    libraryLinked: false,
    legacyFunctionsWork: false,
    hierarchicalFunctionsWork: false,
    idFormatsCorrect: false,
    votingWorks: false,
    performanceAcceptable: false,
    backwardCompatible: false
  };

  console.log("📋 Deployment Addresses:");
  Object.entries(addresses).forEach(([name, address]) => {
    console.log(`   ${name}: ${address}`);
  });
  console.log("");

  // Test 1: Contract Deployment Validation
  console.log("🏗️  Test 1: Contract Deployment Validation");
  try {
    const [deployer] = await ethers.getSigners();

    // Check if all contracts are deployed
    const requiredContracts = ['gameToken', 'usdc', 'registry', 'control', 'flow', 'signal', 'sense', 'gameStaking', 'gameId'];
    for (const contractName of requiredContracts) {
      if (!addresses[contractName]) {
        throw new Error(`Missing contract address: ${contractName}`);
      }

      const code = await ethers.provider.getCode(addresses[contractName]);
      if (code === '0x') {
        throw new Error(`Contract not deployed: ${contractName}`);
      }
    }

    console.log("   ✅ All contracts deployed successfully");
    validationResults.contractsDeployed = true;
  } catch (error) {
    console.log("   ❌ Contract deployment validation failed:", error.message);
  }
  console.log("");

  // Test 2: Library Linking Validation
  console.log("🔗 Test 2: Library Linking Validation");
  try {
    const signal = await ethers.getContractAt("Signal", addresses.signal, {
      libraries: {
        GameId: addresses.gameId
      }
    });

    // Try to call a function that uses the library
    const proposalCount = await signal.getProposalCount();
    console.log("   ✅ Signal contract linked with GameId library");
    console.log(`   📊 Current proposal count: ${proposalCount}`);
    validationResults.libraryLinked = true;
  } catch (error) {
    console.log("   ❌ Library linking validation failed:", error.message);
  }
  console.log("");

  // Test 3: Legacy Functions Validation
  console.log("📜 Test 3: Legacy Functions Validation");
  try {
    const [deployer, user1] = await ethers.getSigners();
    const control = await ethers.getContractAt("Control", addresses.control);
    const signal = await ethers.getContractAt("Signal", addresses.signal, {
      libraries: {
        GameId: addresses.gameId
      }
    });

    // Create test organization
    const orgTx = await control.connect(user1).createOrganization(
      "Validation Test DAO",
      "Testing legacy functions",
      "https://test.com/validation",
      0,
      user1.address
    );
    const orgReceipt = await orgTx.wait();
    const orgEvent = orgReceipt?.logs.find(log => {
      try {
        const parsed = control.interface.parseLog(log);
        return parsed?.name === "OrganizationCreated";
      } catch {
        return false;
      }
    });

    if (!orgEvent) {
      throw new Error("Organization creation event not found");
    }

    const parsedOrgEvent = control.interface.parseLog(orgEvent);
    const orgId = parsedOrgEvent?.args.organizationId;

    // Test legacy proposal creation
    const legacyTx = await signal.connect(user1).createProposal(
      orgId,
      "Legacy Validation Proposal",
      "Testing legacy proposal creation",
      "https://test.com/legacy-validation",
      0, 0, 1, 86400, "0x", ethers.ZeroAddress
    );

    const legacyReceipt = await legacyTx.wait();
    const legacyEvent = legacyReceipt?.logs.find(log => {
      try {
        const parsed = signal.interface.parseLog(log);
        return parsed?.name === "ProposalCreated";
      } catch {
        return false;
      }
    });

    if (!legacyEvent) {
      throw new Error("Legacy proposal creation event not found");
    }

    const parsedLegacyEvent = signal.interface.parseLog(legacyEvent);
    const legacyProposalId = parsedLegacyEvent?.args.proposalId;

    console.log("   ✅ Legacy proposal creation successful");
    console.log(`   📝 Legacy proposal ID: ${legacyProposalId}`);
    validationResults.legacyFunctionsWork = true;

    // Store for later tests
    (global as any).testData = { orgId, legacyProposalId };
  } catch (error) {
    console.log("   ❌ Legacy functions validation failed:", error.message);
  }
  console.log("");

  // Test 4: Hierarchical Functions Validation
  console.log("🔗 Test 4: Hierarchical Functions Validation");
  try {
    const [deployer, user1] = await ethers.getSigners();
    const signal = await ethers.getContractAt("Signal", addresses.signal, {
      libraries: {
        GameId: addresses.gameId
      }
    });

    const testData = (global as any).testData;
    if (!testData) {
      throw new Error("Test data not available from previous test");
    }

    // Test hierarchical proposal creation
    const hierarchicalTx = await signal.connect(user1).createProposalV2(
      testData.orgId,
      "Hierarchical Validation Proposal",
      "Testing hierarchical proposal creation",
      "https://test.com/hierarchical-validation",
      0, 0, 1, 86400, "0x", ethers.ZeroAddress
    );

    const hierarchicalReceipt = await hierarchicalTx.wait();
    const hierarchicalEvent = hierarchicalReceipt?.logs.find(log => {
      try {
        const parsed = signal.interface.parseLog(log);
        return parsed?.name === "ProposalCreated";
      } catch {
        return false;
      }
    });

    if (!hierarchicalEvent) {
      throw new Error("Hierarchical proposal creation event not found");
    }

    const parsedHierarchicalEvent = signal.interface.parseLog(hierarchicalEvent);
    const hierarchicalProposalId = parsedHierarchicalEvent?.args.proposalId;

    console.log("   ✅ Hierarchical proposal creation successful");
    console.log(`   🔗 Hierarchical proposal ID: ${hierarchicalProposalId}`);
    validationResults.hierarchicalFunctionsWork = true;

    // Store for later tests
    testData.hierarchicalProposalId = hierarchicalProposalId;
  } catch (error) {
    console.log("   ❌ Hierarchical functions validation failed:", error.message);
  }
  console.log("");

  // Test 5: ID Format Validation
  console.log("🔍 Test 5: ID Format Validation");
  try {
    const testData = (global as any).testData;
    if (!testData) {
      throw new Error("Test data not available");
    }

    // Validate legacy ID format
    const legacyIdValid = /^0x[a-fA-F0-9]{64}$/.test(testData.legacyProposalId);
    console.log(`   📜 Legacy ID format valid: ${legacyIdValid ? '✅' : '❌'}`);

    // Validate hierarchical ID format
    const hierarchicalIdValid = /^[A-Z0-9]{8}-P-[A-Z0-9]{8}$/.test(testData.hierarchicalProposalId);
    console.log(`   🔗 Hierarchical ID format valid: ${hierarchicalIdValid ? '✅' : '❌'}`);

    if (hierarchicalIdValid) {
      const orgPart = testData.hierarchicalProposalId.substring(0, 8);
      const typePart = testData.hierarchicalProposalId.substring(8, 11);
      const proposalPart = testData.hierarchicalProposalId.substring(11);

      console.log(`   📊 ID breakdown:`);
      console.log(`      Organization: ${orgPart}`);
      console.log(`      Type: ${typePart}`);
      console.log(`      Proposal: ${proposalPart}`);
    }

    validationResults.idFormatsCorrect = legacyIdValid && hierarchicalIdValid;
  } catch (error) {
    console.log("   ❌ ID format validation failed:", error.message);
  }
  console.log("");

  // Test 6: Voting Validation
  console.log("🗳️  Test 6: Voting Validation");
  try {
    const [deployer, user1, user2] = await ethers.getSigners();
    const signal = await ethers.getContractAt("Signal", addresses.signal, {
      libraries: {
        GameId: addresses.gameId
      }
    });

    const testData = (global as any).testData;
    if (!testData) {
      throw new Error("Test data not available");
    }

    // Test legacy voting
    const legacyVoteTx = await signal.connect(user2).castVote(
      testData.legacyProposalId,
      1,
      "Supporting legacy proposal"
    );
    await legacyVoteTx.wait();
    console.log("   ✅ Legacy voting successful");

    // Test hierarchical voting
    const hierarchicalVoteTx = await signal.connect(user2).castVoteV2(
      testData.hierarchicalProposalId,
      1,
      "Supporting hierarchical proposal"
    );
    await hierarchicalVoteTx.wait();
    console.log("   ✅ Hierarchical voting successful");

    validationResults.votingWorks = true;
  } catch (error) {
    console.log("   ❌ Voting validation failed:", error.message);
  }
  console.log("");

  // Test 7: Performance Validation
  console.log("⚡ Test 7: Performance Validation");
  try {
    const [deployer, user1] = await ethers.getSigners();
    const signal = await ethers.getContractAt("Signal", addresses.signal, {
      libraries: {
        GameId: addresses.gameId
      }
    });

    const testData = (global as any).testData;
    if (!testData) {
      throw new Error("Test data not available");
    }

    // Performance test: Legacy proposal creation
    const legacyStart = Date.now();
    const legacyPerfTx = await signal.connect(user1).createProposal(
      testData.orgId,
      "Legacy Performance Test",
      "Testing legacy performance",
      "https://test.com/legacy-perf",
      0, 0, 1, 86400, "0x", ethers.ZeroAddress
    );
    await legacyPerfTx.wait();
    const legacyTime = Date.now() - legacyStart;

    // Performance test: Hierarchical proposal creation
    const hierarchicalStart = Date.now();
    const hierarchicalPerfTx = await signal.connect(user1).createProposalV2(
      testData.orgId,
      "Hierarchical Performance Test",
      "Testing hierarchical performance",
      "https://test.com/hierarchical-perf",
      0, 0, 1, 86400, "0x", ethers.ZeroAddress
    );
    await hierarchicalPerfTx.wait();
    const hierarchicalTime = Date.now() - hierarchicalStart;

    console.log(`   📊 Performance metrics:`);
    console.log(`      Legacy creation: ${legacyTime}ms`);
    console.log(`      Hierarchical creation: ${hierarchicalTime}ms`);
    console.log(`      Difference: ${hierarchicalTime - legacyTime}ms`);

    // Performance is acceptable if hierarchical is not more than 50% slower
    const performanceAcceptable = hierarchicalTime <= legacyTime * 1.5;
    console.log(`   ⚡ Performance acceptable: ${performanceAcceptable ? '✅' : '❌'}`);

    validationResults.performanceAcceptable = performanceAcceptable;
  } catch (error) {
    console.log("   ❌ Performance validation failed:", error.message);
  }
  console.log("");

  // Test 8: Backward Compatibility Validation
  console.log("🔄 Test 8: Backward Compatibility Validation");
  try {
    const signal = await ethers.getContractAt("Signal", addresses.signal, {
      libraries: {
        GameId: addresses.gameId
      }
    });

    // Check that both legacy and V2 functions exist
    const legacyExists = typeof signal.createProposal === 'function';
    const v2Exists = typeof signal.createProposalV2 === 'function';
    const legacyVoteExists = typeof signal.castVote === 'function';
    const v2VoteExists = typeof signal.castVoteV2 === 'function';

    console.log(`   📜 Legacy createProposal exists: ${legacyExists ? '✅' : '❌'}`);
    console.log(`   🔗 V2 createProposalV2 exists: ${v2Exists ? '✅' : '❌'}`);
    console.log(`   📜 Legacy castVote exists: ${legacyVoteExists ? '✅' : '❌'}`);
    console.log(`   🔗 V2 castVoteV2 exists: ${v2VoteExists ? '✅' : '❌'}`);

    const backwardCompatible = legacyExists && v2Exists && legacyVoteExists && v2VoteExists;
    console.log(`   🔄 Backward compatibility: ${backwardCompatible ? '✅' : '❌'}`);

    validationResults.backwardCompatible = backwardCompatible;
  } catch (error) {
    console.log("   ❌ Backward compatibility validation failed:", error.message);
  }
  console.log("");

  // Validation Summary
  console.log("📊 VALIDATION SUMMARY");
  console.log("=====================");

  let passedTests = 0;
  const totalTests = Object.keys(validationResults).length;

  Object.entries(validationResults).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
    if (passed) passedTests++;
  });

  console.log("");
  console.log(`📈 Overall Score: ${passedTests}/${totalTests} tests passed`);

  if (passedTests === totalTests) {
    console.log("🎉 ALL VALIDATION TESTS PASSED!");
    console.log("✅ GIP-006 implementation is ready for production");
  } else {
    console.log("⚠️  Some validation tests failed");
    console.log("❌ Please review and fix issues before production deployment");
  }

  // Save validation results
  const validationReport = {
    timestamp: new Date().toISOString(),
    deploymentAddresses: addresses,
    validationResults,
    score: `${passedTests}/${totalTests}`,
    status: passedTests === totalTests ? 'PASSED' : 'FAILED'
  };

  fs.writeFileSync("validation-report.json", JSON.stringify(validationReport, null, 2));
  console.log("💾 Validation report saved to validation-report.json");

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

main()
  .then(() => {
    console.log("\n✨ Validation completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Validation failed:", error);
    process.exit(1);
  });
