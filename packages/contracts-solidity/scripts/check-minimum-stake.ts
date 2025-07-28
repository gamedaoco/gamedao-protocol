import { ethers } from "hardhat"
import { getAddressesForNetwork } from "@gamedao/evm"

async function checkMinimumStake() {
  console.log("🔍 Checking minimum stake amount...")

  try {
    const network = await ethers.provider.getNetwork()
    const chainId = Number(network.chainId)
    const addresses = getAddressesForNetwork(chainId)

    const staking = await ethers.getContractAt("Staking", addresses.STAKING)

    // Check if there's a minimum stake function
    try {
      const minStake = await staking.minimumStake()
      console.log(`📋 Minimum stake: ${ethers.formatEther(minStake)} ETH`)
    } catch (error) {
      console.log("No minimumStake function found")
    }

    // Try getMinimumStake
    try {
      const minStake = await staking.getMinimumStake()
      console.log(`📋 Minimum stake (getMinimumStake): ${ethers.formatEther(minStake)} ETH`)
    } catch (error) {
      console.log("No getMinimumStake function found")
    }

    // Try MIN_STAKE constant
    try {
      const minStake = await staking.MIN_STAKE()
      console.log(`📋 MIN_STAKE constant: ${ethers.formatEther(minStake)} ETH`)
    } catch (error) {
      console.log("No MIN_STAKE constant found")
    }

  } catch (error: any) {
    console.error("Error:", error.message)
  }
}

checkMinimumStake().catch(console.error)
