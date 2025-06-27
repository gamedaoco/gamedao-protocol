#!/usr/bin/env node

/**
 * GameDAO Protocol - Contract Address Updater
 *
 * This script helps update contract addresses in the .env file after deployments.
 * It can read from deployment artifacts or accept manual input.
 *
 * Usage:
 *   node scripts/update-contract-addresses.js --network local
 *   node scripts/update-contract-addresses.js --network sepolia --manual
 *   node scripts/update-contract-addresses.js --help
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Network configurations
const NETWORKS = {
  local: {
    chainId: 31337,
    suffix: '_LOCAL',
    name: 'Hardhat Local'
  },
  sepolia: {
    chainId: 11155111,
    suffix: '_SEPOLIA',
    name: 'Sepolia Testnet'
  },
  mainnet: {
    chainId: 1,
    suffix: '_MAINNET',
    name: 'Ethereum Mainnet'
  },
  polygon: {
    chainId: 137,
    suffix: '_POLYGON',
    name: 'Polygon'
  },
  arbitrum: {
    chainId: 42161,
    suffix: '_ARBITRUM',
    name: 'Arbitrum One'
  }
};

const CONTRACTS = ['REGISTRY', 'CONTROL', 'FLOW', 'SIGNAL', 'SENSE'];

// File paths
const ENV_FILE = path.join(process.cwd(), '.env.local');
const ENV_TEMPLATE_FILE = path.join(process.cwd(), 'env.template');
const DEPLOYMENT_DIR = path.join(process.cwd(), 'packages/contracts-solidity/deployments');

/**
 * Create readline interface for user input
 */
function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

/**
 * Prompt user for input
 */
function question(rl, prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

/**
 * Read deployment artifacts for a network
 */
function readDeploymentArtifacts(network) {
  // Try to read from deployment-addresses.json first (new format)
  const deploymentAddressesPath = path.join(process.cwd(), 'packages/contracts-solidity/deployment-addresses.json');

  if (fs.existsSync(deploymentAddressesPath)) {
    try {
      const deploymentData = JSON.parse(fs.readFileSync(deploymentAddressesPath, 'utf8'));
      console.log(`✅ Found deployment-addresses.json`);

      // Map the deployment data to our contract names
      const addresses = {
        REGISTRY: deploymentData.registry,
        CONTROL: deploymentData.control,
        FLOW: deploymentData.flow,
        SIGNAL: deploymentData.signal,
        SENSE: deploymentData.sense,
      };

      // Filter out undefined addresses
      const validAddresses = {};
      for (const [contract, address] of Object.entries(addresses)) {
        if (address && address !== '0x0000000000000000000000000000000000000000') {
          validAddresses[contract] = address;
        }
      }

      return Object.keys(validAddresses).length > 0 ? validAddresses : null;
    } catch (error) {
      console.log(`⚠️  Could not read deployment-addresses.json: ${error.message}`);
    }
  }

  // Fallback to old deployment artifacts format
  const networkDir = path.join(DEPLOYMENT_DIR, network);
  const addresses = {};

  if (!fs.existsSync(networkDir)) {
    console.log(`❌ No deployment directory found for ${network}: ${networkDir}`);
    return null;
  }

  for (const contract of CONTRACTS) {
    const artifactPath = path.join(networkDir, `${contract}.json`);
    if (fs.existsSync(artifactPath)) {
      try {
        const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
        addresses[contract] = artifact.address;
      } catch (error) {
        console.log(`⚠️  Could not read artifact for ${contract}: ${error.message}`);
      }
    }
  }

  return Object.keys(addresses).length > 0 ? addresses : null;
}

/**
 * Get contract addresses manually from user input
 */
async function getAddressesManually(network) {
  const rl = createReadlineInterface();
  const addresses = {};

  console.log(`\n📝 Enter contract addresses for ${NETWORKS[network].name}:`);
  console.log('(Press Enter to skip a contract)\n');

  for (const contract of CONTRACTS) {
    const address = await question(rl, `${contract}: `);
    if (address.trim()) {
      if (address.match(/^0x[a-fA-F0-9]{40}$/)) {
        addresses[contract] = address.trim();
      } else {
        console.log(`⚠️  Invalid address format for ${contract}, skipping...`);
      }
    }
  }

  rl.close();
  return addresses;
}

/**
 * Read current .env file
 */
function readEnvFile() {
  if (!fs.existsSync(ENV_FILE)) {
    console.log('📄 No .env.local file found, creating from env.template...');
    if (fs.existsSync(ENV_TEMPLATE_FILE)) {
      fs.copyFileSync(ENV_TEMPLATE_FILE, ENV_FILE);
    } else {
      // Create basic .env.local file
      fs.writeFileSync(ENV_FILE, '# GameDAO Protocol Environment Configuration\n\n');
    }
  }

  return fs.readFileSync(ENV_FILE, 'utf8');
}

/**
 * Update environment variables in content
 */
function updateEnvContent(content, network, addresses) {
  const suffix = NETWORKS[network].suffix;
  let updatedContent = content;

  for (const [contract, address] of Object.entries(addresses)) {
    const envVar = `NEXT_PUBLIC_${contract}_ADDRESS${suffix}`;
    const regex = new RegExp(`^${envVar}=.*$`, 'm');
    const newLine = `${envVar}=${address}`;

    if (regex.test(updatedContent)) {
      updatedContent = updatedContent.replace(regex, newLine);
      console.log(`✅ Updated ${envVar}`);
    } else {
      // Add the variable if it doesn't exist
      updatedContent += `\n${newLine}`;
      console.log(`➕ Added ${envVar}`);
    }
  }

  return updatedContent;
}

/**
 * Backup current .env file
 */
function backupEnvFile() {
  if (fs.existsSync(ENV_FILE)) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${ENV_FILE}.backup.${timestamp}`;
    fs.copyFileSync(ENV_FILE, backupPath);
    console.log(`💾 Backed up current .env.local to: ${backupPath}`);
  }
}

/**
 * Display current addresses
 */
function displayAddresses(addresses, network) {
  console.log(`\n🔧 Contract addresses for ${NETWORKS[network].name}:`);
  for (const [contract, address] of Object.entries(addresses)) {
    console.log(`   ${contract.padEnd(10)}: ${address}`);
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  const networkArg = args.find(arg => arg.startsWith('--network='))?.split('=')[1] ||
                    args[args.indexOf('--network') + 1];
  const isManual = args.includes('--manual');
  const showHelp = args.includes('--help') || args.includes('-h');

  if (showHelp) {
    console.log(`
GameDAO Protocol - Contract Address Updater

Usage:
  node scripts/update-contract-addresses.js --network <network> [options]

Networks:
  local     - Hardhat Local (31337)
  sepolia   - Sepolia Testnet (11155111)
  mainnet   - Ethereum Mainnet (1)
  polygon   - Polygon (137)
  arbitrum  - Arbitrum One (42161)

Options:
  --manual  - Enter addresses manually instead of reading from artifacts
  --help    - Show this help message

Examples:
  node scripts/update-contract-addresses.js --network local
  node scripts/update-contract-addresses.js --network sepolia --manual
`);
    return;
  }

  if (!networkArg || !NETWORKS[networkArg]) {
    console.log('❌ Please specify a valid network: local, sepolia, mainnet, polygon, arbitrum');
    console.log('   Use --help for more information');
    return;
  }

  const network = networkArg;
  console.log(`🚀 Updating contract addresses for ${NETWORKS[network].name}...`);

  let addresses;

  if (isManual) {
    addresses = await getAddressesManually(network);
  } else {
    // Try to read from deployment artifacts first
    addresses = readDeploymentArtifacts(network === 'local' ? 'localhost' : network);

    if (!addresses) {
      console.log('📝 No deployment artifacts found, switching to manual input...');
      addresses = await getAddressesManually(network);
    }
  }

  if (!addresses || Object.keys(addresses).length === 0) {
    console.log('❌ No addresses provided, exiting...');
    return;
  }

  displayAddresses(addresses, network);

  // Confirm with user
  const rl = createReadlineInterface();
  const confirm = await question(rl, '\n❓ Update .env.local file with these addresses? (y/N): ');
  rl.close();

  if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
    console.log('❌ Update cancelled');
    return;
  }

  // Backup and update .env.local file
  backupEnvFile();

  const currentContent = readEnvFile();
  const updatedContent = updateEnvContent(currentContent, network, addresses);

  fs.writeFileSync(ENV_FILE, updatedContent);
  console.log(`\n✅ Successfully updated .env.local file!`);
  console.log(`\n💡 Next steps:`);
  console.log(`   1. Restart your development server`);
  console.log(`   2. Verify addresses in your application`);
  console.log(`   3. Test contract interactions`);
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}

module.exports = { main, NETWORKS, CONTRACTS };
