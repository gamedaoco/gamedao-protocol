#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Paths
const ARTIFACTS_DIR = path.join(__dirname, '../artifacts/contracts');
const SHARED_DIR = path.join(__dirname, '../../shared/src');
const ADDRESSES_FILE = path.join(__dirname, '../deployment-addresses.json');

// Contract mapping
const CONTRACT_MAPPING = {
  'core/Registry.sol/Registry.json': 'REGISTRY_ABI',
  'modules/Control/Control.sol/Control.json': 'CONTROL_ABI',
  'modules/Membership/Membership.sol/Membership.json': 'MEMBERSHIP_ABI',
  'modules/Flow/Flow.sol/Flow.json': 'FLOW_ABI',
  'modules/Signal/Signal.sol/Signal.json': 'SIGNAL_ABI',
  'modules/Sense/Sense.sol/Sense.json': 'SENSE_ABI',
  'modules/Identity/Identity.sol/Identity.json': 'IDENTITY_ABI',
  'modules/Staking/Staking.sol/Staking.json': 'STAKING_ABI',
  'core/Treasury.sol/Treasury.json': 'TREASURY_ABI',
};

function updateABIs() {
  console.log('📦 Updating shared package ABIs...');

  let abiExports = `import { Abi } from 'viem';\n\n`;
  abiExports += `// Auto-generated ABIs from contract compilation\n`;
  abiExports += `// Do not edit this file manually\n\n`;

  const abiConstants = [];
  const abiCollection = [];

  for (const [artifactPath, constantName] of Object.entries(CONTRACT_MAPPING)) {
    const fullPath = path.join(ARTIFACTS_DIR, artifactPath);

    if (fs.existsSync(fullPath)) {
      const artifact = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      const abi = JSON.stringify(artifact.abi, null, 2);

      abiExports += `export const ${constantName} = ${abi} as const satisfies Abi;\n\n`;
      abiConstants.push(constantName);
      abiCollection.push(`  ${constantName.replace('_ABI', '')}: ${constantName},`);
    } else {
      console.warn(`⚠️  Artifact not found: ${fullPath}`);
    }
  }

  // Add collection export
  abiExports += `// Export all ABIs as a collection\n`;
  abiExports += `export const ABIS = {\n`;
  abiExports += abiCollection.join('\n');
  abiExports += `\n} as const;\n\n`;

  // Add contract names
  abiExports += `// Export contract names for convenience\n`;
  abiExports += `export const CONTRACT_NAMES = {\n`;
  for (const constantName of abiConstants) {
    const contractName = constantName.replace('_ABI', '');
    abiExports += `  ${contractName}: '${contractName.charAt(0) + contractName.slice(1).toLowerCase()}',\n`;
  }
  abiExports += `} as const;\n`;

  // Write ABIs file
  fs.writeFileSync(path.join(SHARED_DIR, 'abis.ts'), abiExports);
  console.log('✅ ABIs updated successfully');
}

function updateAddresses() {
  console.log('📍 Updating contract addresses...');

  // Default address template with all required keys
  const defaultAddresses = {
    REGISTRY: "",
    CONTROL: "",
    MEMBERSHIP: "",
    FLOW: "",
    SIGNAL: "",
    SENSE: "",
    IDENTITY: "",
    STAKING: "",
    TREASURY: "",
  };

  let deploymentAddresses = {};
  if (fs.existsSync(ADDRESSES_FILE)) {
    deploymentAddresses = JSON.parse(fs.readFileSync(ADDRESSES_FILE, 'utf8'));
  } else {
    console.warn('⚠️  No deployment addresses found, using defaults');
  }

  // Helper function to merge addresses with defaults
  function mergeWithDefaults(addresses) {
    return { ...defaultAddresses, ...addresses };
  }

  // Update addresses file
  const addressesContent = `// Auto-generated contract addresses from deployment
// Do not edit this file manually

// Contract addresses for different networks
export interface NetworkAddresses {
  REGISTRY: string;
  CONTROL: string;
  MEMBERSHIP: string;
  FLOW: string;
  SIGNAL: string;
  SENSE: string;
  IDENTITY: string;
  STAKING: string;
  TREASURY: string;
}

// Local/development addresses (hardhat network)
export const LOCAL_ADDRESSES: NetworkAddresses = ${JSON.stringify(mergeWithDefaults(deploymentAddresses.localhost || {}), null, 2)};

// Testnet addresses (Sepolia)
export const TESTNET_ADDRESSES: NetworkAddresses = ${JSON.stringify(mergeWithDefaults(deploymentAddresses.sepolia || {}), null, 2)};

// Mainnet addresses
export const MAINNET_ADDRESSES: NetworkAddresses = ${JSON.stringify(mergeWithDefaults(deploymentAddresses.mainnet || {}), null, 2)};

// Network configuration
export const NETWORK_CONFIG = {
  1: { name: 'mainnet', addresses: MAINNET_ADDRESSES },
  11155111: { name: 'sepolia', addresses: TESTNET_ADDRESSES },
  31337: { name: 'localhost', addresses: LOCAL_ADDRESSES },
} as const;

// Helper function to get addresses for a specific network
export function getAddressesForNetwork(chainId: number): NetworkAddresses {
  const config = NETWORK_CONFIG[chainId as keyof typeof NETWORK_CONFIG];
  if (!config) {
    throw new Error(\`Unsupported network: \${chainId}\`);
  }
  return config.addresses;
}

// Helper function to get contract address
export function getContractAddress(
  contractName: keyof NetworkAddresses,
  chainId: number
): string {
  const addresses = getAddressesForNetwork(chainId);
  return addresses[contractName];
}
`;

  fs.writeFileSync(path.join(SHARED_DIR, 'addresses.ts'), addressesContent);
  console.log('✅ Addresses updated successfully');
}

function main() {
  try {
    updateABIs();
    updateAddresses();
    console.log('🎉 Shared package updated successfully!');
  } catch (error) {
    console.error('❌ Error updating shared package:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { updateABIs, updateAddresses };
