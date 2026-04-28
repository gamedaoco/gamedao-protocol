import { ethers } from "hardhat"
import { parseEther, parseUnits } from "ethers"
import { getDeployment } from "./lib/deployment"

// Load addresses from the per-network manifest in @gamedao/evm. Returns
// a flat { GameToken: address, MockUSDC: address, ... } map for the rest
// of this script which expects that shape.
async function loadDeploymentAddresses(): Promise<Record<string, string>> {
  const manifest = await getDeployment()
  const flat: Record<string, string> = {}
  for (const [name, entry] of Object.entries(manifest.contracts)) {
    if (entry?.address) flat[name] = entry.address
  }
  return flat
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

    // Load addresses from deployment file
    const addresses = await loadDeploymentAddresses()

    // Validate token addresses
    if (!addresses.GameToken || addresses.GameToken === "") {
      console.error("❌ Error: GameToken address not found in deployment file")
      console.log("Please run deployment first:")
      console.log("  make deploy")
      process.exit(1)
    }

    if (!addresses.MockUSDC || addresses.MockUSDC === "") {
      console.error("❌ Error: MockUSDC address not found in deployment file")
      console.log("Please run deployment first:")
      console.log("  make deploy")
      process.exit(1)
    }

    console.log(`📍 GAME Token: ${addresses.GameToken}`)
    console.log(`📍 USDC Token: ${addresses.MockUSDC}`)
    console.log("")

    // Get token contracts
    const gameToken = await ethers.getContractAt("MockGameToken", addresses.GameToken)
    const usdcToken = await ethers.getContractAt("MockUSDC", addresses.MockUSDC)

    // Verify contracts are actually deployed
    console.log("🔍 Verifying contract deployment...")
    try {
      const gameTokenCode = await ethers.provider.getCode(addresses.GameToken)
      const usdcTokenCode = await ethers.provider.getCode(addresses.MockUSDC)

      if (gameTokenCode === "0x") {
        console.error("❌ Error: GameToken contract not found at address " + addresses.GameToken)
        console.log("💡 Solution: Deploy contracts first with: make deploy NETWORK=localhost")
        process.exit(1)
      }

      if (usdcTokenCode === "0x") {
        console.error("❌ Error: MockUSDC contract not found at address " + addresses.MockUSDC)
        console.log("💡 Solution: Deploy contracts first with: make deploy NETWORK=localhost")
        process.exit(1)
      }

      console.log("✅ Contract deployment verified")
    } catch (error) {
      console.error("❌ Error verifying contracts:", error)
      console.log("💡 Make sure Hardhat node is running: make dev")
      process.exit(1)
    }

    // Check deployer balances before transfer
    const deployerEthBalance = await ethers.provider.getBalance(deployer.address)
    const deployerGameBalance = await gameToken.balanceOf(deployer.address)
    const deployerUsdcBalance = await usdcToken.balanceOf(deployer.address)

    console.log("💰 Deployer Balances (Before):")
    console.log(`   ETH: ${ethers.formatEther(deployerEthBalance)}`)
    console.log(`   GAME: ${ethers.formatEther(deployerGameBalance)}`)
    console.log(`   USDC: ${ethers.formatUnits(deployerUsdcBalance, 6)}`)
    console.log("")

    // Check if deployer has enough GAME tokens, if not mint more
    const gameAmountWei = parseEther(gameAmount)
    if (deployerGameBalance < gameAmountWei) {
      const neededAmount = gameAmountWei - deployerGameBalance
      console.log(`⚠️  Deployer has insufficient GAME tokens`)
      console.log(`   Required: ${ethers.formatEther(gameAmountWei)}`)
      console.log(`   Available: ${ethers.formatEther(deployerGameBalance)}`)
      console.log(`   Needed: ${ethers.formatEther(neededAmount)}`)
      console.log(`🪙 Minting additional GAME tokens...`)

      const mintTx = await gameToken.mint(deployer.address, neededAmount)
      await mintTx.wait()
      console.log(`✅ Minted ${ethers.formatEther(neededAmount)} GAME tokens to deployer`)
    }

    // Check if deployer has enough USDC tokens, if not mint more
    const usdcAmountWei = parseUnits(usdcAmount, 6)
    if (deployerUsdcBalance < usdcAmountWei) {
      const neededAmount = usdcAmountWei - deployerUsdcBalance
      console.log(`⚠️  Deployer has insufficient USDC tokens`)
      console.log(`   Required: ${ethers.formatUnits(usdcAmountWei, 6)}`)
      console.log(`   Available: ${ethers.formatUnits(deployerUsdcBalance, 6)}`)
      console.log(`   Needed: ${ethers.formatUnits(neededAmount, 6)}`)
      console.log(`🪙 Minting additional USDC tokens...`)

      const mintTx = await usdcToken.mint(deployer.address, neededAmount)
      await mintTx.wait()
      console.log(`✅ Minted ${ethers.formatUnits(neededAmount, 6)} USDC tokens to deployer`)
    }

    // Get updated balances after minting
    const updatedGameBalance = await gameToken.balanceOf(deployer.address)
    const updatedUsdcBalance = await usdcToken.balanceOf(deployer.address)

    console.log("💰 Deployer Balances (After Minting):")
    console.log(`   ETH: ${ethers.formatEther(deployerEthBalance)}`)
    console.log(`   GAME: ${ethers.formatEther(updatedGameBalance)}`)
    console.log(`   USDC: ${ethers.formatUnits(updatedUsdcBalance, 6)}`)
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
