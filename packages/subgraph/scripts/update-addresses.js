#!/usr/bin/env node
// Reads the per-network deployment manifest from @gamedao/evm and rewrites
// addresses + startBlocks into subgraph.yaml. Network is selected via the
// HARDHAT_NETWORK env var (defaults to "localhost") so this works for the
// local Docker Hardhat as well as Polygon Amoy / Polygon mainnet runs.

const fs = require('fs');
const path = require('path');

const network = process.env.HARDHAT_NETWORK || process.env.SUBGRAPH_NETWORK || 'localhost';

// Load the manifest directly from the shared package source. We avoid the
// compiled dist so this script doesn't require a `pnpm run build:shared` to
// see updates from a fresh deploy.
const manifestPath = path.join(
  __dirname,
  '..', '..', 'shared', 'src', 'deployments', `${network}.json`,
);

if (!fs.existsSync(manifestPath)) {
  console.error(`❌ No deployment manifest found at ${manifestPath}`);
  console.error(`   Run \`pnpm run deploy:${network}\` first, or override with HARDHAT_NETWORK=<name>.`);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const contracts = manifest.contracts || {};

console.log(`📄 Reading deployment manifest: ${manifestPath}`);
console.log(`📍 Network: ${manifest.network} (chainId ${manifest.chainId})`);

const subgraphYamlPath = path.join(__dirname, '..', 'subgraph.yaml');
let subgraphYaml = fs.readFileSync(subgraphYamlPath, 'utf8');

// Subgraph data source name -> manifest contract name. Some sources share an
// underlying contract (e.g. GameToken/MockGameToken alias).
const sourceMap = {
  Registry: 'Registry',
  Control: 'Control',
  Factory: 'Factory',
  Membership: 'Membership',
  Flow: 'Flow',
  Signal: 'Signal',
  Sense: 'Sense',
  Identity: 'Identity',
  Staking: 'Staking',
  StakingRewards: 'StakingRewards',
  GameToken: 'GameToken',
  MockGameToken: 'GameToken',
  MockUSDC: 'MockUSDC',
};

let updated = 0;
let skipped = 0;
for (const [sourceName, manifestName] of Object.entries(sourceMap)) {
  const c = contracts[manifestName];
  if (!c || !c.address) {
    console.log(`⚠️  ${sourceName}: no address in manifest — skipped`);
    skipped += 1;
    continue;
  }
  // Update both the address and the startBlock for this source. Block 0 is
  // fine for localhost; for live chains the deploy script writes the actual
  // deploy block so the subgraph doesn't waste time scanning history.
  const startBlock = typeof c.deployBlock === 'number' ? c.deployBlock : 0;
  const addrPattern = new RegExp(`(name: ${sourceName}[\\s\\S]*?address: ")([^"]*)"`, 'g');
  const startPattern = new RegExp(`(name: ${sourceName}[\\s\\S]*?startBlock:\\s*)\\d+`, 'g');
  subgraphYaml = subgraphYaml.replace(addrPattern, `$1${c.address}"`);
  subgraphYaml = subgraphYaml.replace(startPattern, `$1${startBlock}`);
  console.log(`✅ ${sourceName} -> ${c.address} (startBlock ${startBlock})`);
  updated += 1;
}

fs.writeFileSync(subgraphYamlPath, subgraphYaml);
console.log(`🎉 subgraph.yaml updated: ${updated} sources, ${skipped} skipped`);
