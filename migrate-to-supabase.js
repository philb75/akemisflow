const { PrismaClient } = require('@prisma/client')
const fs = require('fs')

// Manual Supabase migration script
async function migrateToSupabase() {
  // Use direct connection string for Supabase
  const DATABASE_URL = "postgresql://postgres.wflcaapznpczlxjaeyfd:DEV_DB_2024_akemis!@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"
  
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: DATABASE_URL
      }
    }
  })

  try {
    console.log('🔄 Testing Supabase database connection...')
    
    // First test basic connection
    const result = await prisma.$queryRaw`SELECT version()`
    console.log('✅ Connected to Supabase PostgreSQL:', result[0].version)
    
    // Check if tables already exist
    console.log('🔍 Checking existing tables...')
    const existingTables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `
    
    console.log(`📊 Found ${existingTables.length} existing tables`)
    
    if (existingTables.length === 0) {
      console.log('📝 No tables found. Need to execute migration manually in Supabase dashboard.')
      console.log('📋 Copy the SQL from supabase-migration.sql to Supabase SQL Editor')
    } else {
      console.log('🗂️ Existing tables:')
      existingTables.forEach(table => console.log(`  - ${table.table_name}`))
    }
    
    // Test if we can create a simple table to verify permissions
    console.log('🔐 Testing database permissions...')
    try {
      await prisma.$queryRaw`
        CREATE TABLE IF NOT EXISTS test_connection (
          id SERIAL PRIMARY KEY,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `
      console.log('✅ Database write permissions OK')
      
      await prisma.$queryRaw`DROP TABLE IF EXISTS test_connection`
      console.log('✅ Database drop permissions OK')
    } catch (permError) {
      console.log('❌ Database permissions error:', permError.message)
    }
    
    await prisma.$disconnect()
    console.log('✅ Migration check completed')
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    await prisma.$disconnect()
    process.exit(1)
  }
}

migrateToSupabase()