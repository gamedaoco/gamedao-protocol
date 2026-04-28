// Backwards-compatibility shim over the new per-network manifest system.
// New code should import from './config' and use getConfig(chainId) instead.
// These exports remain for existing frontend / subgraph callers.
//
// The shape mirrors what the previous hand-maintained NetworkAddresses /
// LOCAL_ADDRESSES tables provided. Source of truth is now the per-chain
// JSON manifests under src/deployments/, surfaced via DEPLOYMENTS in
// deployments.ts.

import { DEPLOYMENTS, ContractDeployment } from './deployments';
import { CHAINS } from './chains';

export interface NetworkAddresses {
  REGISTRY: string;
  CONTROL: string;
  FACTORY: string;
  MEMBERSHIP: string;
  FLOW: string;
  SIGNAL: string;
  SENSE: string;
  IDENTITY: string;
  STAKING: string;
  TREASURY: string;
  GAME_TOKEN: string;
  USDC_TOKEN: string;
}

const EMPTY_ADDRESSES: NetworkAddresses = {
  REGISTRY: '',
  CONTROL: '',
  FACTORY: '',
  MEMBERSHIP: '',
  FLOW: '',
  SIGNAL: '',
  SENSE: '',
  IDENTITY: '',
  STAKING: '',
  TREASURY: '',
  GAME_TOKEN: '',
  USDC_TOKEN: '',
};

function pick(c: Record<string, ContractDeployment>, name: string): string {
  return c[name]?.address ?? '';
}

function flatten(chainId: number): NetworkAddresses {
  const d = DEPLOYMENTS[chainId];
  if (!d) return EMPTY_ADDRESSES;
  const c = d.contracts;
  return {
    REGISTRY: pick(c, 'Registry'),
    CONTROL: pick(c, 'Control'),
    FACTORY: pick(c, 'Factory'),
    MEMBERSHIP: pick(c, 'Membership'),
    FLOW: pick(c, 'Flow'),
    SIGNAL: pick(c, 'Signal'),
    SENSE: pick(c, 'Sense'),
    IDENTITY: pick(c, 'Identity'),
    STAKING: pick(c, 'Staking'),
    // Treasury is created dynamically per organization by Factory.
    TREASURY: '',
    GAME_TOKEN: pick(c, 'GameToken'),
    USDC_TOKEN: pick(c, 'MockUSDC'),
  };
}

export const LOCAL_ADDRESSES: NetworkAddresses = flatten(31337);
export const AMOY_ADDRESSES: NetworkAddresses = flatten(80002);
export const POLYGON_ADDRESSES: NetworkAddresses = flatten(137);

/** @deprecated Use AMOY_ADDRESSES (Phase 2 retired Sepolia from supported chains). */
export const TESTNET_ADDRESSES: NetworkAddresses = AMOY_ADDRESSES;

/** @deprecated Use POLYGON_ADDRESSES (Phase 2 retired Ethereum mainnet). */
export const MAINNET_ADDRESSES: NetworkAddresses = POLYGON_ADDRESSES;

export const NETWORK_CONFIG = {
  31337: { name: 'localhost', addresses: LOCAL_ADDRESSES },
  80002: { name: 'amoy', addresses: AMOY_ADDRESSES },
  137: { name: 'polygon', addresses: POLYGON_ADDRESSES },
  // Frontier dev chain — shares the local Hardhat manifest by convention.
  42: { name: 'frontier', addresses: LOCAL_ADDRESSES },
} as const;

export function getAddressesForNetwork(chainId: number): NetworkAddresses {
  // Cast to the union type the lookup table expects.
  const cfg = NETWORK_CONFIG[chainId as keyof typeof NETWORK_CONFIG];
  if (!cfg) throw new Error(`Unsupported network: ${chainId}`);
  return cfg.addresses;
}

export function getContractAddress(
  contractName: keyof NetworkAddresses,
  chainId: number,
): string {
  return getAddressesForNetwork(chainId)[contractName];
}

// Re-export new API for callers that want richer data than the flat shim.
export { CHAINS, DEPLOYMENTS };
