// Helper that resolves contract addresses from the per-network deployment
// manifest in @gamedao/evm. Reads the JSON source directly so scripts work
// without a `pnpm run build:shared` step between deploy and use.

import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

export interface ContractDeployment {
  address: string;
  deployBlock: number;
  txHash?: string;
  gasUsed?: string;
}

export interface DeploymentManifest {
  network: string;
  chainId: number;
  deployedAt: string | null;
  deployer: string | null;
  contracts: Record<string, ContractDeployment>;
}

const CHAIN_TO_NETWORK_NAME: Record<number, string> = {
  31337: "localhost",
  // Frontier shares the localhost manifest — same chain layout, different chainId.
  42: "localhost",
  80002: "amoy",
  137: "polygon",
};

function manifestPath(networkName: string): string {
  return path.resolve(
    __dirname,
    "..", "..", "..", "shared", "src", "deployments", `${networkName}.json`,
  );
}

export async function getDeployment(): Promise<DeploymentManifest> {
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  const networkName = CHAIN_TO_NETWORK_NAME[chainId];
  if (!networkName) {
    throw new Error(`Unsupported chain ${chainId}. Supported: ${Object.keys(CHAIN_TO_NETWORK_NAME).join(", ")}`);
  }
  const filePath = manifestPath(networkName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Deployment manifest not found at ${filePath}.\n   Run \`make deploy-local\` (or deploy:${networkName}) first.`);
  }
  const manifest: DeploymentManifest = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!manifest.contracts || Object.keys(manifest.contracts).length === 0) {
    throw new Error(`Manifest at ${filePath} is empty. Deploy contracts to ${networkName} first.`);
  }
  return manifest;
}

export async function getContractAddress(name: string): Promise<string> {
  const d = await getDeployment();
  const c = d.contracts[name];
  if (!c?.address) {
    throw new Error(`Contract ${name} not deployed on chain ${d.chainId} (manifest: ${d.network})`);
  }
  return c.address;
}
