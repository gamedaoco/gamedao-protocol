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

// Frontier test account (Alith)
const FRONTIER_DEFAULT_KEY = "0x5fb92d6e98884f76de468fa3f6278f8807c48bebc13595d45af5bdc4da702133";

// Hardhat default test accounts (derived from mnemonic "test test test test test test test test test test test junk")
const HARDHAT_DEFAULT_ACCOUNTS = [
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
  "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
  "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
  "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba",
  "0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e",
  "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356",
  "0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97",
  "0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6",
  "0xf214f2b2cd398c806f84e317254e0f0b801d0643303237d97a22a48e01628897",
  "0x701b615bbdfb9de65240bc28bd21bbc0d996645a3dd57e7b12bc2bdf6f192c82",
  "0xa267530f49f8280200edf313ee7af6b827f2a8bce2897751d06a843f644967b1",
  "0x47c99abed3324a2707c28affff1267e45918ec8c3f20b8aa892e8b065d2942dd",
  "0xc526ee95bf44d8fc405a158bb884d9d1238d99f0612e9f33d006bb0789009aaa",
  "0x8166f546bab6da521a8369cab06c5d2b9e46670292d85c875ee9ec20e84ffb61",
  "0xea6c44ac03bff858b476bba40716402b03e41b8e97e276d1baec7c37d42484a0",
  "0x689af8efa8c651a91ad287602527f3af2fe9f6501a7ac4b061667b5a93e037fd",
  "0xde9be858da4a475276426320d5e9262ecfc3ba460bfac56360bfa6c4c28b4ee0",
  "0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e",
];

// localhost defaults to a host-or-Docker Hardhat node (chainId 31337).
// Frontier is a separate named network — use `--network frontier` to target it.
const localhostAccounts = process.env.PRIVATE_KEY
  ? [process.env.PRIVATE_KEY]
  : HARDHAT_DEFAULT_ACCOUNTS;

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
      },
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337, // Hardhat (host or Docker)
      accounts: localhostAccounts,
    },
    frontier: {
      url: "http://127.0.0.1:8545",
      chainId: 42,
      accounts: [process.env.PRIVATE_KEY || FRONTIER_DEFAULT_KEY],
    },
    "docker-localhost": {
      url: "http://hardhat-node:8545",
      chainId: 31337,
    },
    // Polygon Amoy — public-beta testnet target.
    amoy: {
      url: process.env.POLYGON_AMOY_URL || "https://rpc-amoy.polygon.technology",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 80002,
    },
    // Polygon mainnet — production target.
    polygon: {
      url: process.env.POLYGON_URL || "https://polygon-rpc.com",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 137,
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
      polygon: process.env.POLYGONSCAN_API_KEY || "",
      polygonAmoy: process.env.POLYGONSCAN_API_KEY || "",
    },
    customChains: [
      {
        network: "polygonAmoy",
        chainId: 80002,
        urls: {
          apiURL: "https://api-amoy.polygonscan.com/api",
          browserURL: "https://amoy.polygonscan.com",
        },
      },
    ],
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

// Module management tasks
task("module-list", "List all modules and their status")
  .setAction(async (_taskArgs, _hre) => {
    const { listModules } = await import("./scripts/manageModules");
    await listModules();
  });

task("module-enable", "Enable a module (or 'all')")
  .addPositionalParam("name", "Module name (CONTROL, FLOW, IDENTITY, MEMBERSHIP, SENSE, SIGNAL, or 'all')")
  .setAction(async (taskArgs, _hre) => {
    if (taskArgs.name.toLowerCase() === "all") {
      const { enableAllModules } = await import("./scripts/manageModules");
      await enableAllModules();
    } else {
      const { enableModule } = await import("./scripts/manageModules");
      await enableModule(taskArgs.name);
    }
  });

task("module-disable", "Disable a module (or 'all')")
  .addPositionalParam("name", "Module name (CONTROL, FLOW, IDENTITY, MEMBERSHIP, SENSE, SIGNAL, or 'all')")
  .setAction(async (taskArgs, _hre) => {
    if (taskArgs.name.toLowerCase() === "all") {
      const { disableAllModules } = await import("./scripts/manageModules");
      await disableAllModules();
    } else {
      const { disableModule } = await import("./scripts/manageModules");
      await disableModule(taskArgs.name);
    }
  });

// Admin and seeding tasks
task("grant-admin", "Grant protocol admin roles to an account")
  .addPositionalParam("account", "The address to grant admin roles to")
  .setAction(async (taskArgs, _hre) => {
    const { grantProtocolAdmin } = await import("./scripts/grantProtocolAdmin");
    await grantProtocolAdmin(taskArgs.account);
  });

task("seed-account", "Seed an account with ETH, GAME, and USDC")
  .addPositionalParam("account", "The recipient address")
  .addOptionalParam("eth", "Amount of ETH", "10.0")
  .addOptionalParam("game", "Amount of GAME tokens", "100000")
  .addOptionalParam("usdc", "Amount of USDC tokens", "10000")
  .setAction(async (taskArgs, _hre) => {
    const { seedAccount } = await import("./scripts/seedAccount");
    await seedAccount(taskArgs.account, taskArgs.eth, taskArgs.game, taskArgs.usdc);
  });

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
