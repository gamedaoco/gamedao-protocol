import { ethers } from "hardhat"

function loadDeploymentAddresses() {
  const fs = require('fs')
  const path = require('path')

  const addressesPath = path.join(__dirname, '..', 'deployment-addresses.json')
  if (!fs.existsSync(addressesPath)) {
    throw new Error('Deployment addresses not found. Run deployment first.')
  }

  return JSON.parse(fs.readFileSync(addressesPath, 'utf8'))
}

async function main() {
  console.log("🧪 Testing Frontend Parameter Simulation...")

  // Get signers
  const [deployer, user1] = await ethers.getSigners()
  console.log("📍 Using user1:", user1.address)

  // Load contract addresses
  const addresses = loadDeploymentAddresses()
  console.log("📋 Loaded addresses:", addresses)

  // Get contract instances
  const control = await ethers.getContractAt("Control", addresses.control)
  const gameToken = await ethers.getContractAt("MockGameToken", addresses.gameToken)

  console.log("🔗 Contract instances created")

  // Check user1 GAME balance
  const gameBalance = await gameToken.balanceOf(user1.address)
  console.log("💰 User1 GAME balance:", ethers.formatEther(gameBalance), "GAME")

  // Simulate EXACT frontend parameters
  const frontendParams = {
    name: "Frontend Test DAO",
    metadataURI: "",
    orgType: 2, // DAO
    accessModel: 0, // Open
    feeModel: 0, // No Fees
    memberLimit: 100,
    membershipFee: "0", // String like frontend
    gameStakeRequired: "0", // String like frontend
  }

  console.log("🎯 Frontend params:", frontendParams)

  // Convert exactly like the frontend hook does
  const safeBigInt = (value: string | number, fallback = '0'): bigint => {
    if (value === null || value === undefined || value === '') {
      return BigInt(fallback)
    }

    const stringValue = String(value).trim()
    if (stringValue === '' || stringValue === 'null' || stringValue === 'undefined') {
      return BigInt(fallback)
    }

    // Check for invalid patterns
    if (!/^\d+$/.test(stringValue)) {
      console.warn(`Invalid BigInt value: "${value}", using fallback: ${fallback}`)
      return BigInt(fallback)
    }

    try {
      return BigInt(stringValue)
    } catch (error) {
      console.warn(`BigInt conversion failed for: "${value}", using fallback: ${fallback}`)
      return BigInt(fallback)
    }
  }

  const membershipFeeBigInt = safeBigInt(frontendParams.membershipFee, '0')
  const gameStakeRequiredBigInt = safeBigInt(frontendParams.gameStakeRequired, '0')

  console.log("🔧 BigInt conversions:", {
    membershipFee: `${frontendParams.membershipFee} -> ${membershipFeeBigInt}`,
    gameStakeRequired: `${frontendParams.gameStakeRequired} -> ${gameStakeRequiredBigInt}`,
  })

  // Call createOrganization with exact frontend parameters
  console.log("🏗️  Creating DAO with frontend-style parameters...")

  try {
    const tx = await control.connect(user1).createOrganization(
      frontendParams.name,
      frontendParams.metadataURI,
      frontendParams.orgType,
      frontendParams.accessModel,
      frontendParams.feeModel,
      Number(frontendParams.memberLimit),
      membershipFeeBigInt,
      gameStakeRequiredBigInt
    )

    console.log("📝 Transaction submitted:", tx.hash)

    const receipt = await tx.wait()
    console.log("✅ Transaction confirmed in block:", receipt?.blockNumber)

    // Check total organizations
    const orgCount = await control.getOrganizationCount()
    console.log("📊 Total organizations:", orgCount.toString())

    console.log("🎉 Frontend parameter simulation successful!")

  } catch (error) {
    console.error("❌ Frontend parameter simulation failed:", error)
    throw error
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
