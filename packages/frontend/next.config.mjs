// Workspace-root env bridge.
// Next.js only auto-loads .env files from the package directory
// (`packages/frontend/.env.local`). In a monorepo it's natural to keep one
// .env.local at the workspace root so the BFF, scripts, and frontend share
// it. This loader reads the repo-root file and fills any vars that aren't
// already set — package-local .env.local still wins on conflict.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function loadEnvFromRoot(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8')
    for (const rawLine of content.split('\n')) {
      const line = rawLine.trim()
      if (!line || line.startsWith('#')) continue
      const eq = line.indexOf('=')
      if (eq <= 0) continue
      const key = line.slice(0, eq).trim()
      let value = line.slice(eq + 1).trim()
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      if (process.env[key] === undefined) {
        process.env[key] = value
      }
    }
  } catch {
    // No root .env.local — nothing to bridge.
  }
}

loadEnvFromRoot(path.resolve(__dirname, '../../.env.local'))

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
