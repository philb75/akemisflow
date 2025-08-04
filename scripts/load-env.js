#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Get the environment from command line argument
const env = process.argv[2];

if (!env) {
  console.error('Usage: node scripts/load-env.js <environment>');
  console.error('Available environments: local, supabase, production');
  process.exit(1);
}

const envFiles = {
  'local': '.env.local',
  'supabase': '.env.local.supabase', 
  'production': '.env.production.local'
};

const sourceFile = envFiles[env];
const targetFile = '.env';

if (!sourceFile) {
  console.error(`Unknown environment: ${env}`);
  console.error('Available environments: local, supabase, production');
  process.exit(1);
}

if (!fs.existsSync(sourceFile)) {
  console.error(`Environment file not found: ${sourceFile}`);
  process.exit(1);
}

try {
  // Copy the environment file
  fs.copyFileSync(sourceFile, targetFile);
  console.log(`✅ Loaded ${sourceFile} → ${targetFile}`);
  console.log(`🚀 Environment: ${env.toUpperCase()}`);
} catch (error) {
  console.error(`❌ Failed to load environment: ${error.message}`);
  process.exit(1);
}