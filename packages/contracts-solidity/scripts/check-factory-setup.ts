import { ethers } from "hardhat"
import * as fs from "fs"

async function checkFactorySetup() {
  console.log("🔍 Checking Factory Configuration...")

  try {
    // Load deployment addresses
    const deploymentData = JSON.parse(fs.readFileSync("deployment-addresses.json", "utf8"))
    const addresses = deploymentData.contracts

    console.log("📋 Deployment addresses:")
    console.log(`   Control: ${addresses.Control}`)
    console.log(`   Factory: ${addresses.Factory}`)
    console.log(`   Staking: ${addresses.Staking}`)
    console.log("")

    // Connect to contracts
    const control = await ethers.getContractAt("Control", addresses.Control)
    const factory = await ethers.getContractAt("Factory", addresses.Factory)
    const staking = await ethers.getContractAt("Staking", addresses.Staking)

    // Check factory in Control contract
    console.log("🏭 Checking factory configuration in Control contract...")
    let factoryAddress
    try {
      factoryAddress = await control.factory()
      console.log(`   Factory address in Control: ${factoryAddress}`)

      if (factoryAddress === ethers.ZeroAddress) {
        console.log("   ❌ Factory not set in Control contract!")
      } else if (factoryAddress.toLowerCase() === addresses.Factory.toLowerCase()) {
        console.log("   ✅ Factory correctly set in Control contract")
      } else {
        console.log(`   ⚠️  Factory address mismatch! Expected: ${addresses.Factory}, Got: ${factoryAddress}`)
      }
    } catch (error: any) {
      console.log(`   ❌ Error getting factory address: ${error.message}`)
    }

    // Check registry in Factory contract
    console.log("\n📋 Checking registry configuration in Factory contract...")
    try {
      const registryAddress = await factory.organizationRegistry()
      console.log(`   Registry address in Factory: ${registryAddress}`)

      if (registryAddress === ethers.ZeroAddress) {
        console.log("   ❌ Registry not set in Factory contract!")
      } else if (registryAddress.toLowerCase() === addresses.Control.toLowerCase()) {
        console.log("   ✅ Registry correctly set in Factory contract")
      } else {
        console.log(`   ⚠️  Registry address mismatch! Expected: ${addresses.Control}, Got: ${registryAddress}`)
      }
        } catch (error: any) {
      console.log(`   ❌ Error getting registry address: ${error.message}`)
    }

    // Check role permissions
    console.log("\n🔐 Checking role permissions...")
    try {
      const ORGANIZATION_MANAGER_ROLE = await staking.ORGANIZATION_MANAGER_ROLE()
      const hasRole = await staking.hasRole(ORGANIZATION_MANAGER_ROLE, addresses.Factory)
      console.log(`   Factory has ORGANIZATION_MANAGER_ROLE: ${hasRole ? '✅ Yes' : '❌ No'}`)
    } catch (error: any) {
      console.log(`   ❌ Error checking roles: ${error.message}`)
    }

    // Test organization creation capability
    console.log("\n🧪 Testing organization creation capability...")
    const [signer] = await ethers.getSigners()

    try {
      // This should fail if factory is not set
      await control.connect(signer).createOrganization.staticCall(
        "Test Organization",
        "ipfs://test-metadata",
        0, // OrgType.Individual
        0, // AccessModel.Open
        0, // FeeModel.NoFees
        100, // memberLimit
        0, // membershipFee
        0  // gameStakeRequired
      )
      console.log("   ✅ Organization creation test passed")
    } catch (error: any) {
      console.log(`   ❌ Organization creation test failed: ${error.message}`)
    }

  } catch (error: any) {
    console.error("❌ Error:", error.message)
  }
}

checkFactorySetup()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
