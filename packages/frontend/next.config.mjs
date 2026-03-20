/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@gamedao/evm'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Remove legacy experimental flags incompatible with Next 15 defaults
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
