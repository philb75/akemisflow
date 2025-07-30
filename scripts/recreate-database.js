#!/usr/bin/env node

/**
 * Recreate Database with Correct Schema
 * Drop existing tables and recreate with the correct structure
 */

const { Client } = require('pg');
const fs = require('fs');

class DatabaseRecreator {
  constructor() {
    this.client = new Client({
      user: 'postgres.wflcaapznpczlxjaeyfd',
      password: 'Philb921056$',
      host: 'aws-0-eu-west-3.pooler.supabase.com',
      port: 6543,
      database: 'postgres',
      ssl: { rejectUnauthorized: false }
    });
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}`;
    console.log(logEntry);
  }

  async connect() {
    await this.client.connect();
    this.log('✅ Connected to database');
  }

  async disconnect() {
    await this.client.end();
    this.log('🔌 Disconnected from database');
  }

  async dropAllTables() {
    this.log('🗑️ Dropping all existing tables...');
    
    // Get all table names
    const result = await this.client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    const tables = result.rows.map(row => row.table_name);
    this.log(`📋 Found ${tables.length} tables to drop`);

    // Drop all tables with CASCADE to handle foreign keys
    for (const table of tables) {
      try {
        await this.client.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
        this.log(`   ✅ Dropped table: ${table}`);
      } catch (error) {
        this.log(`   ❌ Failed to drop ${table}: ${error.message}`, 'ERROR');
      }
    }

    // Drop all custom types/enums
    const typesResult = await this.client.query(`
      SELECT typname 
      FROM pg_type 
      WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND typtype = 'e'
    `);

    for (const typeRow of typesResult.rows) {
      try {
        await this.client.query(`DROP TYPE IF EXISTS "${typeRow.typname}" CASCADE`);
        this.log(`   ✅ Dropped type: ${typeRow.typname}`);
      } catch (error) {
        this.log(`   ⚠️ Could not drop type ${typeRow.typname}: ${error.message}`, 'WARN');
      }
    }
  }

  async deploySchema() {
    this.log('📝 Deploying new schema...');
    
    const schemaContent = fs.readFileSync('./deploy-to-production.sql', 'utf8');
    
    try {
      await this.client.query(schemaContent);
      this.log('✅ Schema deployed successfully');
      
      // Verify tables were created
      const result = await this.client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `);
      
      const tables = result.rows.map(row => row.table_name);
      this.log(`📋 Created ${tables.length} tables: ${tables.join(', ')}`);
      
      return tables;
    } catch (error) {
      this.log(`❌ Schema deployment failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  async importData() {
    this.log('📥 Importing data...');
    
    const dataContent = fs.readFileSync('./migrations/local-export/20250729_214852_local_data.sql', 'utf8');
    
    try {
      await this.client.query(dataContent);
      this.log('✅ Data imported successfully');
      
      // Verify data counts
      const tables = ['contacts', 'suppliers', 'bank_accounts', 'transactions'];
      const counts = {};
      
      for (const table of tables) {
        try {
          const result = await this.client.query(`SELECT COUNT(*) as count FROM ${table}`);
          counts[table] = parseInt(result.rows[0].count);
        } catch (error) {
          this.log(`⚠️ Could not count ${table}: ${error.message}`, 'WARN');
          counts[table] = 'unknown';
        }
      }
      
      this.log('📊 Data import verification:');
      Object.entries(counts).forEach(([table, count]) => {
        this.log(`   ${table}: ${count} records`);
      });
      
      return counts;
    } catch (error) {
      this.log(`❌ Data import failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  async fullRecreation() {
    const startTime = Date.now();
    
    try {
      this.log('🚀 Starting full database recreation...');
      
      // Step 1: Connect
      await this.connect();
      
      // Step 2: Drop all existing tables
      await this.dropAllTables();
      
      // Step 3: Deploy new schema
      const tables = await this.deploySchema();
      
      // Step 4: Import data
      const dataCounts = await this.importData();
      
      const duration = Math.round((Date.now() - startTime) / 1000);
      
      this.log('🎉 Database recreation completed successfully!');
      this.log(`⏱️ Total time: ${duration} seconds`);
      
      return {
        success: true,
        duration,
        tables: tables.length,
        tableList: tables,
        dataCounts,
        message: 'Database recreation completed successfully'
      };
      
    } catch (error) {
      const duration = Math.round((Date.now() - startTime) / 1000);
      this.log(`💥 Recreation failed after ${duration} seconds: ${error.message}`, 'ERROR');
      
      return {
        success: false,
        duration,
        error: error.message,
        message: 'Database recreation failed'
      };
    } finally {
      await this.disconnect();
    }
  }
}

// Execute recreation
async function main() {
  const recreator = new DatabaseRecreator();
  
  try {
    const result = await recreator.fullRecreation();
    
    console.log('\n📋 Final Result:');
    console.log(JSON.stringify(result, null, 2));
    
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = DatabaseRecreator;