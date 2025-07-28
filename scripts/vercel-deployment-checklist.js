#!/usr/bin/env node

/**
 * GameDAO Vercel Deployment Checklist
 * Validates all prerequisites before deploying to Vercel
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 GameDAO Vercel Deployment Checklist\n');

let hasErrors = false;

function checkItem(name, checkFn) {
  try {
    const result = checkFn();
    console.log(`✅ ${name}: ${result || 'OK'}`);
    return true;
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
    hasErrors = true;
    return false;
  }
}

// 1. Check project structure
checkItem('Project Structure', () => {
  const requiredDirs = [
    'packages/contracts-solidity',
    'packages/frontend',
    'packages/subgraph',
    'packages/shared'
  ];

  for (const dir of requiredDirs) {
    if (!fs.existsSync(dir)) {
      throw new Error(`Missing directory: ${dir}`);
    }
  }
  return 'All required directories present';
});

// 2. Check shared package
checkItem('Shared Package Build', () => {
  if (!fs.existsSync('packages/shared/dist')) {
    throw new Error('Shared package not built. Run: cd packages/shared && npm run build');
  }

  // Check if addresses file exists
  if (!fs.existsSync('packages/shared/src/addresses.ts')) {
    throw new Error('Contract addresses file missing');
  }

  return 'Built and addresses available';
});

// 3. Check frontend dependencies
checkItem('Frontend Dependencies', () => {
  if (!fs.existsSync('packages/frontend/node_modules')) {
    throw new Error('Frontend dependencies not installed. Run: cd packages/frontend && npm install');
  }
  return 'Dependencies installed';
});

// 4. Check environment template
checkItem('Environment Configuration', () => {
  if (!fs.existsSync('env.template')) {
    throw new Error('env.template file missing');
  }

  const envTemplate = fs.readFileSync('env.template', 'utf8');
  const requiredVars = [
    'NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID',
    'NEXT_PUBLIC_DEFAULT_CHAIN_ID'
  ];

  for (const varName of requiredVars) {
    if (!envTemplate.includes(varName)) {
      throw new Error(`Missing required variable: ${varName}`);
    }
  }

  return 'Template contains required variables';
});

// 5. Check contract addresses
checkItem('Contract Addresses', () => {
  const addressesPath = 'packages/shared/src/addresses.ts';
  const addressesContent = fs.readFileSync(addressesPath, 'utf8');

  // Check if addresses are not empty for production networks
  if (addressesContent.includes('REGISTRY": ""') && process.env.NODE_ENV === 'production') {
    throw new Error('Contract addresses not set for production networks');
  }

  return 'Addresses configuration valid';
});

// 6. Check Vercel configuration
checkItem('Vercel Configuration', () => {
  if (!fs.existsSync('vercel.json')) {
    throw new Error('vercel.json file missing');
  }

  const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));

  if (!vercelConfig.buildCommand || !vercelConfig.outputDirectory) {
    throw new Error('Invalid Vercel configuration');
  }

  return 'Configuration valid';
});

// 7. Test frontend build
checkItem('Frontend Build Test', () => {
  try {
    console.log('   Testing frontend build...');
    execSync('cd packages/frontend && npm run build', {
      stdio: 'pipe',
      timeout: 120000 // 2 minutes timeout
    });
    return 'Build successful';
  } catch (error) {
    throw new Error(`Build failed: ${error.message}`);
  }
});

// 8. Check Git status
checkItem('Git Status', () => {
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    if (status.trim()) {
      console.log('   Warning: Uncommitted changes detected');
      console.log('   Consider committing changes before deployment');
    }
    return 'Ready for deployment';
  } catch (error) {
    throw new Error('Git not available or not a git repository');
  }
});

console.log('\n' + '='.repeat(50));

if (hasErrors) {
  console.log('❌ Deployment checklist FAILED');
  console.log('   Please fix the issues above before deploying to Vercel');
  process.exit(1);
} else {
  console.log('✅ Deployment checklist PASSED');
  console.log('   Ready to deploy to Vercel!');
  console.log('\n🚀 Next steps:');
  console.log('   1. Set environment variables in Vercel dashboard');
  console.log('   2. Run: vercel --prod');
  console.log('   3. Test deployed application functionality');
}
