#!/usr/bin/env node

/**
 * Custom Vercel build script
 * Handles Prisma generation and Next.js build for production
 */

const { execSync } = require('child_process');

console.log('🚀 Starting Vercel build process...');

try {
  // Step 1: Generate Prisma client without database connection
  console.log('📦 Generating Prisma client...');
  try {
    execSync('prisma generate --no-engine', { 
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'production',
        // Skip database validation during build
        SKIP_ENV_VALIDATION: 'true'
      }
    });
  } catch (error) {
    console.log('⚠️ Prisma generation failed, trying alternative approach...');
    execSync('prisma generate', { 
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'production',
        SKIP_ENV_VALIDATION: 'true'
      }
    });
  }
  
  // Step 2: Build Next.js application
  console.log('🏗️ Building Next.js application...');
  execSync('next build', { 
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      // Ensure TypeScript compilation works
      SKIP_ENV_VALIDATION: 'true'
    }
  });
  
  console.log('✅ Vercel build completed successfully!');
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  console.error('\n🔍 Error details:');
  console.error(error.toString());
  
  // Exit with error code
  process.exit(1);
}