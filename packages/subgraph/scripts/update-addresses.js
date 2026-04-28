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
// underlying contract (e.g. GameToken/MockGameToken alias). The Sense data
// source is intentionally commented out in subgraph.yaml today (schema is
// being reworked) — re-add it here when re-enabled.
const sourceMap = {
  Registry: 'Registry',
  Control: 'Control',
  Factory: 'Factory',
  Membership: 'Membership',
  Flow: 'Flow',
  Signal: 'Signal',
  Identity: 'Identity',
  Staking: 'Staking',
  StakingRewards: 'StakingRewards',
  GameToken: 'GameToken',
  MockGameToken: 'GameToken',
  MockUSDC: 'MockUSDC',
};

// Anchor the patterns on the data-source indent level (4 spaces for `name:`,
// 6 spaces for `address:` and `startBlock:`). The abis block under each data
// source uses `        - name: ...` at indent 8 — those lines must NOT be
// matched, otherwise the lazy `[\s\S]*?` cascades into the next data source
// and clobbers its address. The previous regex was unscoped and produced
// scrambled YAML on every run.
let updated = 0;
let skipped = 0;
for (const [sourceName, manifestName] of Object.entries(sourceMap)) {
  const c = contracts[manifestName];
  if (!c || !c.address) {
    console.log(`⚠️  ${sourceName}: no address in manifest — skipped`);
    skipped += 1;
    continue;
  }
  const startBlock = typeof c.deployBlock === 'number' ? c.deployBlock : 0;
  // Match: data-source-level `    name: <X>` then any content up to the
  // first 6-space-indented `      address: "..."` (which is inside `source:`).
  const addrPattern = new RegExp(
    `(^    name: ${sourceName}\\n[\\s\\S]*?^      address: ")[^"]*(")`,
    'm',
  );
  const startPattern = new RegExp(
    `(^    name: ${sourceName}\\n[\\s\\S]*?^      startBlock:\\s*)\\d+`,
    'm',
  );
  if (!addrPattern.test(subgraphYaml)) {
    console.log(`⚠️  ${sourceName}: data source not found in subgraph.yaml — skipped`);
    skipped += 1;
    continue;
  }
  subgraphYaml = subgraphYaml.replace(addrPattern, `$1${c.address}$2`);
  subgraphYaml = subgraphYaml.replace(startPattern, `$1${startBlock}`);
  console.log(`✅ ${sourceName} -> ${c.address} (startBlock ${startBlock})`);
  updated += 1;
}

fs.writeFileSync(subgraphYamlPath, subgraphYaml);
console.log(`🎉 subgraph.yaml updated: ${updated} sources, ${skipped} skipped`);
