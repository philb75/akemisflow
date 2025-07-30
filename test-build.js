#!/usr/bin/env node

/**
 * Test script to verify build configuration
 */

const path = require('path');
const fs = require('fs');

console.log('🧪 Testing build configuration...\n');

// Check if required files exist
const requiredFiles = [
  './src/components/ui/button.tsx',
  './src/components/ui/card.tsx',
  './src/lib/utils.ts',
  './tsconfig.json',
  './next.config.js',
];

console.log('📁 Checking required files:');
requiredFiles.forEach(file => {
  const fullPath = path.resolve(__dirname, file);
  const exists = fs.existsSync(fullPath);
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
});

// Test path resolution
console.log('\n🔗 Testing path resolution:');
const srcPath = path.resolve(__dirname, './src');
const componentsPath = path.resolve(__dirname, './src/components');
console.log(`  @ -> ${srcPath}`);
console.log(`  @/components -> ${componentsPath}`);

// Check Node version
console.log('\n📊 Environment:');
console.log(`  Node version: ${process.version}`);
console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'development'}`);

// Try to resolve modules
console.log('\n🔍 Module resolution test:');
try {
  const tsConfig = require('./tsconfig.json');
  console.log('  ✅ tsconfig.json loaded successfully');
  console.log(`  ✅ Path aliases configured: ${Object.keys(tsConfig.compilerOptions.paths).join(', ')}`);
} catch (error) {
  console.log('  ❌ Failed to load tsconfig.json:', error.message);
}

console.log('\n✨ Test complete!');