/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@gamedao/evm'],
  experimental: {
    esmExternals: 'loose',
  },
//   webpack: (config, { isServer }) => {
//     // Handle workspace packages
//     config.resolve.alias = {
//       ...config.resolve.alias,
//       '@gamedao/evm': require.resolve('@gamedao/evm'),
//     }

//     return config
//   },
};

export default nextConfig;
