export interface TokenConfig {
  gameToken: string;
  paymentTokens: {
    [symbol: string]: {
      address: string;
      decimals: number;
      name: string;
    };
  };
}

export interface NetworkTokenConfig {
  [networkName: string]: TokenConfig;
}

/**
 * Token addresses for different networks
 * Update these with real addresses as they become available
 */
export const TOKEN_CONFIG: NetworkTokenConfig = {
  // Local development
  localhost: {
    gameToken: "0x0000000000000000000000000000000000000000", // Will be set by deployment
    paymentTokens: {
      USDC: {
        address: "0x0000000000000000000000000000000000000000", // Will be set by deployment
        decimals: 6,
        name: "USD Coin"
      },
      USDT: {
        address: "0x0000000000000000000000000000000000000000", // Mock USDT for testing
        decimals: 6,
        name: "Tether USD"
      }
    }
  },

  // Hardhat network
  hardhat: {
    gameToken: "0x0000000000000000000000000000000000000000", // Will be set by deployment
    paymentTokens: {
      USDC: {
        address: "0x0000000000000000000000000000000000000000", // Will be set by deployment
        decimals: 6,
        name: "USD Coin"
      }
    }
  },

  // Ethereum Mainnet
  mainnet: {
    gameToken: "0x0000000000000000000000000000000000000000", // TODO: Add real GAME token address
    paymentTokens: {
      USDC: {
        address: "0xA0b86a33E6441e6c6C8c0c3c4e6c4c4e6c4c4e6c", // Real USDC on mainnet
        decimals: 6,
        name: "USD Coin"
      },
      USDT: {
        address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", // Real USDT on mainnet
        decimals: 6,
        name: "Tether USD"
      },
      DAI: {
        address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", // Real DAI on mainnet
        decimals: 18,
        name: "Dai Stablecoin"
      }
    }
  },

  // Polygon
  polygon: {
    gameToken: "0x0000000000000000000000000000000000000000", // TODO: Add GAME token address on Polygon
    paymentTokens: {
      USDC: {
        address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", // USDC on Polygon
        decimals: 6,
        name: "USD Coin"
      },
      USDT: {
        address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", // USDT on Polygon
        decimals: 6,
        name: "Tether USD"
      }
    }
  },

  // Arbitrum
  arbitrum: {
    gameToken: "0x0000000000000000000000000000000000000000", // TODO: Add GAME token address on Arbitrum
    paymentTokens: {
      USDC: {
        address: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8", // USDC on Arbitrum
        decimals: 6,
        name: "USD Coin"
      },
      USDT: {
        address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", // USDT on Arbitrum
        decimals: 6,
        name: "Tether USD"
      }
    }
  },

  // Optimism
  optimism: {
    gameToken: "0x0000000000000000000000000000000000000000", // TODO: Add GAME token address on Optimism
    paymentTokens: {
      USDC: {
        address: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607", // USDC on Optimism
        decimals: 6,
        name: "USD Coin"
      },
      USDT: {
        address: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58", // USDT on Optimism
        decimals: 6,
        name: "Tether USD"
      }
    }
  },

  // Base
  base: {
    gameToken: "0x0000000000000000000000000000000000000000", // TODO: Add GAME token address on Base
    paymentTokens: {
      USDC: {
        address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
        decimals: 6,
        name: "USD Coin"
      }
    }
  },

  // Sepolia Testnet
  sepolia: {
    gameToken: "0x0000000000000000000000000000000000000000", // TODO: Deploy test GAME token
    paymentTokens: {
      USDC: {
        address: "0x0000000000000000000000000000000000000000", // TODO: Deploy test USDC
        decimals: 6,
        name: "USD Coin (Test)"
      }
    }
  }
};

/**
 * Get token configuration for a specific network
 */
export function getTokenConfig(networkName: string): TokenConfig {
  const config = TOKEN_CONFIG[networkName];
  if (!config) {
    throw new Error(`Token configuration not found for network: ${networkName}`);
  }
  return config;
}

/**
 * Get GAME token address for a network
 */
export function getGameTokenAddress(networkName: string): string {
  const config = getTokenConfig(networkName);
  if (config.gameToken === "0x0000000000000000000000000000000000000000") {
    throw new Error(`GAME token address not configured for network: ${networkName}`);
  }
  return config.gameToken;
}

/**
 * Get payment token addresses for a network
 */
export function getPaymentTokens(networkName: string): TokenConfig['paymentTokens'] {
  const config = getTokenConfig(networkName);
  return config.paymentTokens;
}

/**
 * Get specific payment token address
 */
export function getPaymentTokenAddress(networkName: string, symbol: string): string {
  const paymentTokens = getPaymentTokens(networkName);
  const token = paymentTokens[symbol];
  if (!token) {
    throw new Error(`Payment token ${symbol} not configured for network: ${networkName}`);
  }
  if (token.address === "0x0000000000000000000000000000000000000000") {
    throw new Error(`Payment token ${symbol} address not configured for network: ${networkName}`);
  }
  return token.address;
}

/**
 * Check if a token is supported on a network
 */
export function isTokenSupported(networkName: string, symbol: string): boolean {
  try {
    const config = getTokenConfig(networkName);
    return symbol === 'GAME' ?
      config.gameToken !== "0x0000000000000000000000000000000000000000" :
      config.paymentTokens[symbol]?.address !== "0x0000000000000000000000000000000000000000";
  } catch {
    return false;
  }
}

/**
 * Get all supported payment tokens for a network
 */
export function getSupportedPaymentTokens(networkName: string): string[] {
  try {
    const paymentTokens = getPaymentTokens(networkName);
    return Object.keys(paymentTokens).filter(symbol =>
      paymentTokens[symbol].address !== "0x0000000000000000000000000000000000000000"
    );
  } catch {
    return [];
  }
}

/**
 * Update token address in configuration (for deployment scripts)
 */
export function updateTokenAddress(networkName: string, tokenType: 'GAME' | string, address: string): void {
  if (!TOKEN_CONFIG[networkName]) {
    throw new Error(`Network ${networkName} not found in configuration`);
  }

  if (tokenType === 'GAME') {
    TOKEN_CONFIG[networkName].gameToken = address;
  } else {
    if (!TOKEN_CONFIG[networkName].paymentTokens[tokenType]) {
      throw new Error(`Payment token ${tokenType} not found in configuration for ${networkName}`);
    }
    TOKEN_CONFIG[networkName].paymentTokens[tokenType].address = address;
  }
}
