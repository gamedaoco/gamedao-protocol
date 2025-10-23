/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@gamedao/evm'],
  experimental: {
    esmExternals: 'loose',
  },
  webpack: (config) => {
    // Stub React Native AsyncStorage for web builds (used by MetaMask SDK)
    config.resolve = config.resolve || {}
    config.resolve.alias = {
      ...config.resolve.alias,
      '@react-native-async-storage/async-storage': false,
    }

    return config
  },
};

export default nextConfig;
