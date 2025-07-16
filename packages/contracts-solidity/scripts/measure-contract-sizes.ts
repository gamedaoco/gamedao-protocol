import { ethers } from "hardhat";
import { writeFileSync } from "fs";
import { join } from "path";

interface ContractSizeData {
  name: string;
  version: string;
  size: number;
  sizeKB: number;
  deploymentLimit: number;
  percentageUsed: number;
  status: "PASS" | "FAIL" | "WARNING";
}

interface SizeComparison {
  original: ContractSizeData;
  withMembership: ContractSizeData;
  sizeDifference: number;
  percentageReduction: number;
}

async function measureContractSize(contractName: string, version: string = "Original"): Promise<ContractSizeData> {
  const ContractFactory = await ethers.getContractFactory(contractName);
  const deployTransaction = ContractFactory.getDeployTransaction();

  // Get the bytecode size
  const bytecodeSize = ethers.utils.hexDataLength(deployTransaction.data || "0x");
  const sizeKB = bytecodeSize / 1024;
  const deploymentLimit = 24576; // 24KB limit
  const percentageUsed = (bytecodeSize / deploymentLimit) * 100;

  let status: "PASS" | "FAIL" | "WARNING" = "PASS";
  if (bytecodeSize > deploymentLimit) {
    status = "FAIL";
  } else if (percentageUsed > 90) {
    status = "WARNING";
  }

  return {
    name: contractName,
    version,
    size: bytecodeSize,
    sizeKB: Number(sizeKB.toFixed(3)),
    deploymentLimit,
    percentageUsed: Number(percentageUsed.toFixed(2)),
    status
  };
}

async function main() {
  console.log("📏 Measuring Contract Sizes - Before and After Membership Integration");
  console.log("=" .repeat(80));

  const results: ContractSizeData[] = [];
  const comparisons: SizeComparison[] = [];

  // Original contracts
  const originalContracts = [
    "Signal",
    "Flow",
    "Sense"
  ];

  // Membership-integrated contracts
  const membershipContracts = [
    "SignalWithMembership",
    "FlowWithMembership",
    "SenseWithMembership"
  ];

  // Additional new contracts
  const newContracts = [
    "OrganizationSettings",
    "GameDAOMembership",
    "GameDAOMembershipWithSettings",
    "ControlWithSettings",
    "SignalWithGovernance"
  ];

  console.log("\n🔍 Measuring Original Contracts...");
  for (const contractName of originalContracts) {
    try {
      const sizeData = await measureContractSize(contractName, "Original");
      results.push(sizeData);
      console.log(`✅ ${contractName}: ${sizeData.sizeKB} KB (${sizeData.percentageUsed}%) - ${sizeData.status}`);
    } catch (error) {
      console.log(`❌ ${contractName}: Failed to measure - ${error.message}`);
    }
  }

  console.log("\n🔄 Measuring Membership-Integrated Contracts...");
  for (let i = 0; i < membershipContracts.length; i++) {
    try {
      const contractName = membershipContracts[i];
      const originalName = originalContracts[i];

      const sizeData = await measureContractSize(contractName, "With Membership");
      results.push(sizeData);
      console.log(`✅ ${contractName}: ${sizeData.sizeKB} KB (${sizeData.percentageUsed}%) - ${sizeData.status}`);

      // Find original for comparison
      const originalData = results.find(r => r.name === originalName);
      if (originalData) {
        const sizeDifference = sizeData.size - originalData.size;
        const percentageReduction = ((originalData.size - sizeData.size) / originalData.size) * 100;

        comparisons.push({
          original: originalData,
          withMembership: sizeData,
          sizeDifference,
          percentageReduction: Number(percentageReduction.toFixed(2))
        });
      }
    } catch (error) {
      console.log(`❌ ${membershipContracts[i]}: Failed to measure - ${error.message}`);
    }
  }

  console.log("\n🆕 Measuring New Contracts...");
  for (const contractName of newContracts) {
    try {
      const sizeData = await measureContractSize(contractName, "New");
      results.push(sizeData);
      console.log(`✅ ${contractName}: ${sizeData.sizeKB} KB (${sizeData.percentageUsed}%) - ${sizeData.status}`);
    } catch (error) {
      console.log(`❌ ${contractName}: Failed to measure - ${error.message}`);
    }
  }

  // Display comparison results
  console.log("\n📊 SIZE COMPARISON RESULTS");
  console.log("=" .repeat(80));

  for (const comparison of comparisons) {
    const { original, withMembership, sizeDifference, percentageReduction } = comparison;

    console.log(`\n🔄 ${original.name} → ${withMembership.name}`);
    console.log(`   Original: ${original.sizeKB} KB (${original.percentageUsed}%)`);
    console.log(`   With Membership: ${withMembership.sizeKB} KB (${withMembership.percentageUsed}%)`);

    if (sizeDifference < 0) {
      console.log(`   ✅ Size Reduction: ${Math.abs(sizeDifference)} bytes (${percentageReduction}%)`);
    } else {
      console.log(`   ⚠️  Size Increase: ${sizeDifference} bytes (-${Math.abs(percentageReduction)}%)`);
    }

    console.log(`   Status: ${original.status} → ${withMembership.status}`);
  }

  // Summary statistics
  console.log("\n📈 SUMMARY STATISTICS");
  console.log("=" .repeat(80));

  const totalOriginalSize = results.filter(r => r.version === "Original").reduce((sum, r) => sum + r.size, 0);
  const totalMembershipSize = results.filter(r => r.version === "With Membership").reduce((sum, r) => sum + r.size, 0);
  const totalNewSize = results.filter(r => r.version === "New").reduce((sum, r) => sum + r.size, 0);

  console.log(`📊 Total Original Size: ${(totalOriginalSize / 1024).toFixed(3)} KB`);
  console.log(`📊 Total Membership-Integrated Size: ${(totalMembershipSize / 1024).toFixed(3)} KB`);
  console.log(`📊 Total New Contracts Size: ${(totalNewSize / 1024).toFixed(3)} KB`);

  const totalReduction = totalOriginalSize - totalMembershipSize;
  const totalReductionPercentage = (totalReduction / totalOriginalSize) * 100;

  if (totalReduction > 0) {
    console.log(`✅ Total Size Reduction: ${totalReduction} bytes (${totalReductionPercentage.toFixed(2)}%)`);
  } else {
    console.log(`⚠️  Total Size Increase: ${Math.abs(totalReduction)} bytes (-${Math.abs(totalReductionPercentage).toFixed(2)}%)`);
  }

  // Status summary
  const passCount = results.filter(r => r.status === "PASS").length;
  const warningCount = results.filter(r => r.status === "WARNING").length;
  const failCount = results.filter(r => r.status === "FAIL").length;

  console.log(`\n🎯 STATUS SUMMARY`);
  console.log(`   ✅ PASS: ${passCount} contracts`);
  console.log(`   ⚠️  WARNING: ${warningCount} contracts`);
  console.log(`   ❌ FAIL: ${failCount} contracts`);

  // Detailed results table
  console.log("\n📋 DETAILED RESULTS TABLE");
  console.log("=" .repeat(80));
  console.log("Contract Name".padEnd(30) + "Version".padEnd(15) + "Size (KB)".padEnd(12) + "Usage %".padEnd(10) + "Status");
  console.log("-".repeat(80));

  results.forEach(result => {
    const name = result.name.padEnd(30);
    const version = result.version.padEnd(15);
    const size = result.sizeKB.toString().padEnd(12);
    const usage = `${result.percentageUsed}%`.padEnd(10);
    const status = result.status;

    console.log(`${name}${version}${size}${usage}${status}`);
  });

  // Key insights
  console.log("\n🔍 KEY INSIGHTS");
  console.log("=" .repeat(80));

  const averageReduction = comparisons.reduce((sum, c) => sum + c.percentageReduction, 0) / comparisons.length;
  console.log(`📉 Average Size Reduction: ${averageReduction.toFixed(2)}%`);

  const bestReduction = comparisons.reduce((best, current) =>
    current.percentageReduction > best.percentageReduction ? current : best
  );
  console.log(`🏆 Best Reduction: ${bestReduction.original.name} (${bestReduction.percentageReduction}%)`);

  const largestContract = results.reduce((largest, current) =>
    current.size > largest.size ? current : largest
  );
  console.log(`📏 Largest Contract: ${largestContract.name} (${largestContract.sizeKB} KB)`);

  console.log("\n💡 RECOMMENDATIONS");
  console.log("=" .repeat(80));

  if (failCount > 0) {
    console.log("❌ CRITICAL: Some contracts exceed the 24KB deployment limit!");
    console.log("   Consider further optimization or splitting into multiple contracts.");
  }

  if (warningCount > 0) {
    console.log("⚠️  WARNING: Some contracts are approaching the deployment limit.");
    console.log("   Monitor these contracts closely during development.");
  }

  if (totalReduction > 0) {
    console.log("✅ SUCCESS: Membership integration has reduced overall contract sizes!");
    console.log("   The architecture successfully eliminates code duplication.");
  }

  console.log("\n🎯 ARCHITECTURE BENEFITS");
  console.log("=" .repeat(80));
  console.log("✅ Centralized membership management");
  console.log("✅ Reduced code duplication");
  console.log("✅ Improved maintainability");
  console.log("✅ Better scalability");
  console.log("✅ Consistent membership validation");
  console.log("✅ Unified reputation system");

  // Save results to file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultsFile = join(__dirname, `../contract-sizes-${timestamp}.json`);

  const outputData = {
    timestamp: new Date().toISOString(),
    results,
    comparisons,
    summary: {
      totalOriginalSize,
      totalMembershipSize,
      totalNewSize,
      totalReduction,
      totalReductionPercentage,
      averageReduction,
      statusCounts: { passCount, warningCount, failCount }
    }
  };

  writeFileSync(resultsFile, JSON.stringify(outputData, null, 2));
  console.log(`\n💾 Results saved to: ${resultsFile}`);

  console.log("\n✅ Contract size analysis complete!");

  return outputData;
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Contract size analysis failed:", error);
    process.exit(1);
  });
