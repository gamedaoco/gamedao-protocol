import { ethers } from "hardhat"
import { parseEther, parseUnits } from "ethers"
import fs from "fs"
import path from "path"

interface DeploymentAddresses {
  gameToken: string
  usdc: string
  [key: string]: string
}

async function loadDeploymentAddresses(): Promise<DeploymentAddresses> {
  const deploymentPath = path.join(__dirname, "..", "deployment-addresses.json")

  if (!fs.existsSync(deploymentPath)) {
    throw new Error("Deployment addresses not found. Please deploy contracts first.")
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"))
  return deployment as DeploymentAddresses
}

async function sendTokens() {
  console.log("🚀 Starting token transfer script...")

  // Get environment variables or defaults
  const recipient = process.env.RECIPIENT
  const ethAmount = process.env.ETH || "1.0"  // Default 1 ETH
  const gameAmount = process.env.GAME || "10000"  // Default 10,000 GAME
  const usdcAmount = process.env.USDC || "5000"  // Default 5,000 USDC

  if (!recipient) {
    console.error("❌ Error: Recipient address is required")
    console.log("Usage: RECIPIENT=0x123... ETH=1.0 GAME=10000 USDC=5000 npm run send-tokens")
    console.log("Or use make command: make send-tokens RECIPIENT=0x123... ETH=2.0 GAME=20000 USDC=10000")
    process.exit(1)
  }

  // Validate recipient address
  if (!ethers.isAddress(recipient)) {
    console.error("❌ Error: Invalid recipient address")
    process.exit(1)
  }

  console.log("📋 Transfer Details:")
  console.log(`   Recipient: ${recipient}`)
  console.log(`   ETH Amount: ${ethAmount}`)
  console.log(`   GAME Amount: ${gameAmount}`)
  console.log(`   USDC Amount: ${usdcAmount}`)
  console.log("")

  try {
    // Get signers
    const [deployer] = await ethers.getSigners()
    console.log(`💼 Using deployer account: ${deployer.address}`)

    // Load deployment addresses
    const addresses = await loadDeploymentAddresses()
    console.log(`📍 GAME Token: ${addresses.gameToken}`)
    console.log(`📍 USDC Token: ${addresses.usdc}`)
    console.log("")

    // Get token contracts
    const gameToken = await ethers.getContractAt("MockGameToken", addresses.gameToken)
    const usdcToken = await ethers.getContractAt("MockUSDC", addresses.usdc)

    // Check deployer balances before transfer
    const deployerEthBalance = await ethers.provider.getBalance(deployer.address)
    const deployerGameBalance = await gameToken.balanceOf(deployer.address)
    const deployerUsdcBalance = await usdcToken.balanceOf(deployer.address)

    console.log("💰 Deployer Balances (Before):")
    console.log(`   ETH: ${ethers.formatEther(deployerEthBalance)}`)
    console.log(`   GAME: ${ethers.formatEther(deployerGameBalance)}`)
    console.log(`   USDC: ${ethers.formatUnits(deployerUsdcBalance, 6)}`)
    console.log("")

    // Check recipient balances before transfer
    const recipientEthBalance = await ethers.provider.getBalance(recipient)
    const recipientGameBalance = await gameToken.balanceOf(recipient)
    const recipientUsdcBalance = await usdcToken.balanceOf(recipient)

    console.log("💰 Recipient Balances (Before):")
    console.log(`   ETH: ${ethers.formatEther(recipientEthBalance)}`)
    console.log(`   GAME: ${ethers.formatEther(recipientGameBalance)}`)
    console.log(`   USDC: ${ethers.formatUnits(recipientUsdcBalance, 6)}`)
    console.log("")

    console.log("🔄 Starting transfers...")

    // 1. Send ETH
    if (parseFloat(ethAmount) > 0) {
      console.log(`📤 Sending ${ethAmount} ETH...`)
      const ethTx = await deployer.sendTransaction({
        to: recipient,
        value: parseEther(ethAmount)
      })
      await ethTx.wait()
      console.log(`✅ ETH transfer completed: ${ethTx.hash}`)
    }

    // 2. Send GAME tokens
    if (parseFloat(gameAmount) > 0) {
      console.log(`📤 Sending ${gameAmount} GAME tokens...`)
      const gameTx = await gameToken.transfer(recipient, parseEther(gameAmount))
      await gameTx.wait()
      console.log(`✅ GAME transfer completed: ${gameTx.hash}`)
    }

    // 3. Send USDC tokens
    if (parseFloat(usdcAmount) > 0) {
      console.log(`📤 Sending ${usdcAmount} USDC tokens...`)
      const usdcTx = await usdcToken.transfer(recipient, parseUnits(usdcAmount, 6))
      await usdcTx.wait()
      console.log(`✅ USDC transfer completed: ${usdcTx.hash}`)
    }

    console.log("")

    // Check final balances
    const finalRecipientEthBalance = await ethers.provider.getBalance(recipient)
    const finalRecipientGameBalance = await gameToken.balanceOf(recipient)
    const finalRecipientUsdcBalance = await usdcToken.balanceOf(recipient)

    console.log("💰 Recipient Balances (After):")
    console.log(`   ETH: ${ethers.formatEther(finalRecipientEthBalance)}`)
    console.log(`   GAME: ${ethers.formatEther(finalRecipientGameBalance)}`)
    console.log(`   USDC: ${ethers.formatUnits(finalRecipientUsdcBalance, 6)}`)
    console.log("")

    // Calculate changes
    const ethChange = finalRecipientEthBalance - recipientEthBalance
    const gameChange = finalRecipientGameBalance - recipientGameBalance
    const usdcChange = finalRecipientUsdcBalance - recipientUsdcBalance

    console.log("📈 Changes:")
    console.log(`   ETH: +${ethers.formatEther(ethChange)}`)
    console.log(`   GAME: +${ethers.formatEther(gameChange)}`)
    console.log(`   USDC: +${ethers.formatUnits(usdcChange, 6)}`)
    console.log("")

    console.log("🎉 Token transfer completed successfully!")

  } catch (error) {
    console.error("❌ Error during token transfer:", error)
    process.exit(1)
  }
}

// Execute the script
if (require.main === module) {
  sendTokens()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}

export { sendTokens }
