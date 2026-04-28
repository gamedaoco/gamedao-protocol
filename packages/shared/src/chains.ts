// Chain metadata: hand-written, infrequently changed.
// Keyed by chainId. Lookup via getChain(chainId) or via getConfig(chainId).chain.

export interface ChainConfig {
  chainId: number;
  /** Internal short name, matches Hardhat network name. */
  name: 'localhost' | 'amoy' | 'polygon';
  /** Human-readable label for the UI. */
  displayName: string;
  /** Default RPC URL. Overridable via env in deploy/runtime contexts. */
  rpcDefault: string;
  /** Block explorer base URL (no trailing slash). */
  explorer?: string;
  /** Etherscan-compatible verify API base URL (used by hardhat-verify). */
  verifyApi?: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  isTestnet: boolean;
}

export const CHAINS: Record<number, ChainConfig> = {
  31337: {
    chainId: 31337,
    name: 'localhost',
    displayName: 'Hardhat Local',
    rpcDefault: 'http://127.0.0.1:8545',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    isTestnet: true,
  },
  80002: {
    chainId: 80002,
    name: 'amoy',
    displayName: 'Polygon Amoy',
    rpcDefault: 'https://rpc-amoy.polygon.technology',
    explorer: 'https://amoy.polygonscan.com',
    verifyApi: 'https://api-amoy.polygonscan.com/api',
    nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
    isTestnet: true,
  },
  137: {
    chainId: 137,
    name: 'polygon',
    displayName: 'Polygon',
    rpcDefault: 'https://polygon-rpc.com',
    explorer: 'https://polygonscan.com',
    verifyApi: 'https://api.polygonscan.com/api',
    nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
    isTestnet: false,
  },
};

export function getChain(chainId: number): ChainConfig {
  const c = CHAINS[chainId];
  if (!c) throw new Error(`Unsupported chain: ${chainId}`);
  return c;
}
