#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Paths
const deploymentPath = path.join(__dirname, '..', '..', 'contracts-solidity', 'deployment-addresses.json');
const addressesPath = path.join(__dirname, '..', 'src', 'addresses.ts');

console.log('🔄 Updating addresses in shared package...');

// Read deployment addresses
if (!fs.existsSync(deploymentPath)) {
  console.error(`❌ Deployment file not found at: ${deploymentPath}`);
  console.error('💡 Run deployment first: make deploy');
  process.exit(1);
}

const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
console.log(`📄 Reading addresses from: ${deploymentPath}`);

// Read current addresses file
const currentAddresses = fs.readFileSync(addressesPath, 'utf8');

// Update LOCAL_ADDRESSES
const newLocalAddresses = {
  "REGISTRY": deploymentData.contracts?.Registry || "",
  "CONTROL": deploymentData.contracts?.Control || "",
  "FACTORY": deploymentData.contracts?.Factory || "",
  "MEMBERSHIP": deploymentData.contracts?.Membership || "",
  "FLOW": deploymentData.contracts?.Flow || "",
  "SIGNAL": deploymentData.contracts?.Signal || "",
  "SENSE": deploymentData.contracts?.Sense || "",
  "IDENTITY": deploymentData.contracts?.Identity || "",
  "STAKING": deploymentData.contracts?.Staking || "",
  "TREASURY": "", // Treasury contracts are created dynamically by Factory
  "GAME_TOKEN": deploymentData.contracts?.GameToken || "",
  "USDC_TOKEN": deploymentData.contracts?.MockUSDC || ""
};

// Replace LOCAL_ADDRESSES in the file
const updatedAddresses = currentAddresses.replace(
  /export const LOCAL_ADDRESSES: NetworkAddresses = \{[\s\S]*?\};/,
  `export const LOCAL_ADDRESSES: NetworkAddresses = ${JSON.stringify(newLocalAddresses, null, 2)};`
);

// Write updated addresses
fs.writeFileSync(addressesPath, updatedAddresses);

console.log('✅ Updated addresses:');
Object.entries(newLocalAddresses).forEach(([key, value]) => {
  if (value) {
    console.log(`  ${key}: ${value}`);
  } else {
    console.log(`  ${key}: (empty)`);
  }
});

console.log('🎉 Addresses updated successfully!');
console.log('💡 Run "npm run build" to rebuild the package');
