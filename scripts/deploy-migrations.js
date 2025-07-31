#!/usr/bin/env node

const { execSync } = require('child_process');
const { Client } = require('pg');

console.log('🚀 Production Migration Script');
console.log('==============================\n');

async function checkDatabase() {
  const client = new Client({
    user: 'postgres.wflcaapznpczlxjaeyfd',
    password: 'Philb921056$',
    host: 'aws-0-eu-west-3.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to production database\n');
    
    // Check current migration status
    const result = await client.query(
      'SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 5'
    );
    
    console.log('📋 Recent migrations:');
    result.rows.forEach(row => {
      console.log(`  - ${row.migration_name} (${new Date(row.finished_at).toLocaleDateString()})`);
    });
    
    await client.end();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

async function runMigrations() {
  console.log('\n🔄 Running production migrations...\n');
  
  try {
    // Set production database URL
    process.env.DATABASE_URL = 'postgresql://postgres.wflcaapznpczlxjaeyfd:Philb921056$@aws-0-eu-west-3.pooler.supabase.com:6543/postgres?sslmode=require';
    
    // Run Prisma migrations
    execSync('npx prisma migrate deploy', { 
      stdio: 'inherit',
      env: process.env 
    });
    
    console.log('\n✅ Migrations completed successfully!');
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

async function main() {
  console.log('⚠️  WARNING: This will run migrations on PRODUCTION database!');
  console.log('   Make sure you have tested locally first.\n');
  
  const connected = await checkDatabase();
  if (!connected) {
    process.exit(1);
  }
  
  console.log('\n❓ Do you want to continue? (yes/no)');
  
  process.stdin.resume();
  process.stdin.once('data', async (data) => {
    const answer = data.toString().trim().toLowerCase();
    
    if (answer === 'yes' || answer === 'y') {
      await runMigrations();
    } else {
      console.log('\n❌ Migration cancelled');
    }
    
    process.exit(0);
  });
}

main();