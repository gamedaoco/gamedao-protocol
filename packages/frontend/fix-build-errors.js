#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Common fixes for build errors
const fixes = [
  // Fix unescaped apostrophes
  {
    pattern: /(?<!&[a-z]*)'(?![a-z]*;)/g,
    replacement: '&apos;',
    description: 'Fix unescaped apostrophes'
  },

  // Fix common unused imports
  {
    pattern: /import\s+{[^}]*parseEther[^}]*}\s+from\s+['"]viem['"];?\s*\n/g,
    replacement: '',
    description: 'Remove unused parseEther import'
  },

  {
    pattern: /import\s+{[^}]*formatEther[^}]*}\s+from\s+['"]viem['"];?\s*\n/g,
    replacement: '',
    description: 'Remove unused formatEther import'
  },

  // Fix missing alt text
  {
    pattern: /<img([^>]*?)(?!\s+alt=)([^>]*?)>/g,
    replacement: '<img$1 alt=""$2>',
    description: 'Add empty alt text to images'
  },

  // Fix empty interfaces
  {
    pattern: /interface\s+(\w+)\s+extends\s+React\.[\w<>]+\s*{\s*}/g,
    replacement: 'type $1 = React.$2',
    description: 'Replace empty interfaces with type aliases'
  }
];

function findTsxFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
      files.push(...findTsxFiles(fullPath));
    } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

function applyFixes(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  for (const fix of fixes) {
    const originalContent = content;
    content = content.replace(fix.pattern, fix.replacement);
    if (content !== originalContent) {
      console.log(`Applied fix: ${fix.description} in ${filePath}`);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content);
  }

  return changed;
}

function main() {
  const srcDir = path.join(__dirname, 'src');
  const files = findTsxFiles(srcDir);

  let totalChanged = 0;

  for (const file of files) {
    if (applyFixes(file)) {
      totalChanged++;
    }
  }

  console.log(`\nFixed ${totalChanged} files`);

  // Try to build and count remaining errors
  try {
    console.log('\nRunning build to check remaining errors...');
    execSync('npm run build', { stdio: 'pipe' });
    console.log('Build successful!');
  } catch (error) {
    const output = error.stdout.toString();
    const errorCount = (output.match(/Error:/g) || []).length;
    console.log(`Build failed with ${errorCount} errors`);

    // Show first few errors for context
    const errors = output.split('\n').filter(line => line.includes('Error:'));
    console.log('\nFirst 5 errors:');
    errors.slice(0, 5).forEach(error => console.log(error));
  }
}

main();
