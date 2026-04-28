// Unified per-chain configuration entry point.
// getConfig(chainId) returns chain metadata + deployment manifest in one call.
// Frontend, subgraph build scripts, and Hardhat scripts should consume this
// instead of reading addresses from env vars or hand-maintained tables.

import { CHAINS, ChainConfig, getChain } from './chains';
import {
  DEPLOYMENTS,
  DeploymentManifest,
  ContractDeployment,
  getDeployment,
} from './deployments';

export interface NetworkConfig {
  chain: ChainConfig;
  deployment: DeploymentManifest;
}

export function getConfig(chainId: number): NetworkConfig {
  return { chain: getChain(chainId), deployment: getDeployment(chainId) };
}

export function isChainSupported(chainId: number): boolean {
  return chainId in CHAINS;
}

export function listSupportedChains(): ChainConfig[] {
  return Object.values(CHAINS).sort((a, b) => a.chainId - b.chainId);
}

/**
 * Convenience: contract address by name for a chain. Throws if either the
 * chain or the contract is not deployed.
 */
export function getContractAddressByName(chainId: number, name: string): string {
  const c = getDeployment(chainId).contracts[name];
  if (!c || !c.address) {
    throw new Error(`Contract ${name} not deployed on chain ${chainId}`);
  }
  return c.address;
}

/**
 * Convenience: deployment record (address + block + optional tx hash) for a
 * named contract on a chain.
 */
export function getContractDeployment(
  chainId: number,
  name: string,
): ContractDeployment {
  const c = getDeployment(chainId).contracts[name];
  if (!c) {
    throw new Error(`Contract ${name} not deployed on chain ${chainId}`);
  }
  return c;
}
