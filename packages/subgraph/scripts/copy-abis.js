const fs = require('fs');
const path = require('path');

// Import ABIs from shared package
const {
  REGISTRY_ABI,
  CONTROL_ABI,
  FACTORY_ABI,
  MEMBERSHIP_ABI,
  FLOW_ABI,
  SIGNAL_ABI,
  SENSE_ABI,
  IDENTITY_ABI,
  STAKING_ABI,
  TREASURY_ABI,
  GAME_TOKEN_ABI,
  MOCK_GAME_TOKEN_ABI,
  MOCK_USDC_ABI
} = require('@gamedao/evm/dist/abis');

const abisDir = path.join(__dirname, '..', 'abis');

// Ensure abis directory exists
if (!fs.existsSync(abisDir)) {
  fs.mkdirSync(abisDir, { recursive: true });
}

// ABI mapping
const abiMap = {
  'Registry.json': REGISTRY_ABI,
  'Control.json': CONTROL_ABI,
  'Factory.json': FACTORY_ABI,
  'Membership.json': MEMBERSHIP_ABI,
  'Flow.json': FLOW_ABI,
  'Signal.json': SIGNAL_ABI,
  'Sense.json': SENSE_ABI,
  'Identity.json': IDENTITY_ABI,
  'Staking.json': STAKING_ABI,
  'Treasury.json': TREASURY_ABI,
  'GameToken.json': GAME_TOKEN_ABI,
  'MockGameToken.json': MOCK_GAME_TOKEN_ABI,
  'MockUSDC.json': MOCK_USDC_ABI
};

// Copy ABIs
Object.entries(abiMap).forEach(([filename, abi]) => {
  const filePath = path.join(abisDir, filename);

  // Convert ABI to contract artifact format expected by The Graph
  const contractArtifact = {
    "_format": "hh-sol-artifact-1",
    "contractName": filename.replace('.json', ''),
    "sourceName": `contracts/${filename.replace('.json', '')}.sol`,
    "abi": abi,
    "bytecode": "0x", // Not needed for subgraph
    "deployedBytecode": "0x", // Not needed for subgraph
    "linkReferences": {},
    "deployedLinkReferences": {}
  };

  fs.writeFileSync(filePath, JSON.stringify(contractArtifact, null, 2));
  console.log(`✅ Copied ${filename} from shared package`);
});

console.log('🎉 All ABIs copied from packages/shared to subgraph/abis/');
