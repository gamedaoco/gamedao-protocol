import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import "hardhat-contract-sizer";
import "hardhat-gas-reporter";
import "solidity-coverage";
import * as dotenv from "dotenv";
import { task } from "hardhat/config";
import * as path from "path";

dotenv.config();

// Docker-aware configuration
const dockerMode = process.env.DOCKER_DEV_MODE === 'true';
const isInContainer = process.env.NODE_ENV === 'development' && process.env.DOCKER_DEV_MODE === 'true';

// Determine paths based on environment
const getPath = (relativePath: string) => {
  if (dockerMode && !isInContainer) {
    // Running from host but targeting Docker
    return path.join('./local-dev/contracts', relativePath);
  } else if (isInContainer) {
    // Running inside Docker container
    return path.join('/app/contracts-output', relativePath);
  } else {
    // Traditional host-based development
    return `./${relativePath}`;
  }
};

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 800, // Reduced from 10000 to balance size and compilation
        details: {
          yulDetails: {
            optimizerSteps: "u",
          },
        },
      },
      viaIR: true, // Re-enabled to handle stack too deep
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
      mining: {
        auto: true,
        // interval: 2000
      },
      // loggingEnabled: true,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    "docker-localhost": {
      url: "http://hardhat-node:8545",
      chainId: 31337,
    },
    sepolia: {
      url: process.env.SEPOLIA_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111,
    },
    mainnet: {
      url: process.env.MAINNET_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 1,
    },
    polygon: {
      url: process.env.POLYGON_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 137,
    },
    arbitrum: {
      url: process.env.ARBITRUM_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 42161,
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
    gasPrice: 20,
  },
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: false, // Don't fail on size limit exceeded for local development
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY || "",
      sepolia: process.env.ETHERSCAN_API_KEY || "",
      polygon: process.env.POLYGONSCAN_API_KEY || "",
      arbitrumOne: process.env.ARBISCAN_API_KEY || "",
    },
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
    alwaysGenerateOverloads: false,
    discriminateTypes: true,
  },

  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: getPath("cache"),
    artifacts: getPath("artifacts"),
  },
};

// Custom task for sending tokens
task("send-tokens", "Send tokens to a specific address")
  .addParam("recipient", "The recipient address")
  .addOptionalParam("eth", "Amount of ETH to send", "1.0")
  .addOptionalParam("game", "Amount of GAME tokens to send", "10000")
  .addOptionalParam("usdc", "Amount of USDC tokens to send", "5000")
  .setAction(async (taskArgs, hre) => {
    // Ensure we're using localhost network if not specified
    if (hre.network.name === "hardhat") {
      console.log("⚠️  Note: Using hardhat network. Consider using --network localhost for deployed contracts");
    }

    // Set environment variables for the script
    process.env.RECIPIENT = taskArgs.recipient;
    process.env.ETH = taskArgs.eth;
    process.env.GAME = taskArgs.game;
    process.env.USDC = taskArgs.usdc;

    // Import and run the send-tokens script
    const { sendTokens } = await import("./scripts/send-tokens");
    await sendTokens();
  });

export default config;
