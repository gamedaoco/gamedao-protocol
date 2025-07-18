const fs = require('fs');
const path = require('path');

// Import addresses from shared package
const { LOCAL_ADDRESSES } = require('@gamedao/evm/dist/addresses');

const subgraphYamlPath = path.join(__dirname, '..', 'subgraph.yaml');

// Read subgraph.yaml
let subgraphYaml = fs.readFileSync(subgraphYamlPath, 'utf8');

// Address mapping from shared package to subgraph.yaml
const addressMapping = {
  'Registry': LOCAL_ADDRESSES.REGISTRY,
  'Control': LOCAL_ADDRESSES.CONTROL,
  'Membership': LOCAL_ADDRESSES.MEMBERSHIP,
  'Flow': LOCAL_ADDRESSES.FLOW,
  'Signal': LOCAL_ADDRESSES.SIGNAL,
  'Sense': LOCAL_ADDRESSES.SENSE,
  'Identity': LOCAL_ADDRESSES.IDENTITY,
  'Staking': LOCAL_ADDRESSES.STAKING,
  'Treasury': LOCAL_ADDRESSES.TREASURY
};

// Update addresses in subgraph.yaml
Object.entries(addressMapping).forEach(([contractName, address]) => {
  if (address && address !== '') {
    // Find and replace address for this contract
    const addressRegex = new RegExp(`(name: ${contractName}[\\s\\S]*?address: ")([^"]*)"`, 'g');
    subgraphYaml = subgraphYaml.replace(addressRegex, `$1${address}"`);
    console.log(`✅ Updated ${contractName} address to ${address}`);
  } else {
    console.log(`⚠️  No address found for ${contractName} in shared package`);
  }
});

// Write updated subgraph.yaml
fs.writeFileSync(subgraphYamlPath, subgraphYaml);

console.log('🎉 All contract addresses updated from packages/shared!');
