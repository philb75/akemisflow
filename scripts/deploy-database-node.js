#!/usr/bin/env node

/**
 * Node.js Database Deployment Script
 * Execute schema and data deployment using node-postgres
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

class NodeDatabaseDeployer {
  constructor() {
    this.config = {
      // Direct connection with updated password
      connectionConfig: {
        user: 'postgres',
        password: 'Philb921056$',
        host: 'db.wflcaapznpczlxjaeyfd.supabase.co',
        port: 5432,
        database: 'postgres',
        ssl: {
          rejectUnauthorized: false // Accept self-signed certificates
        }
      },
      schemaFile: './deploy-to-production.sql',
      dataFile: './migrations/local-export/20250729_214852_local_data.sql',
      logFile: './logs/database-deployment.log'
    };
    
    this.client = new Client(this.config.connectionConfig);
    this.ensureDirectories();
  }

  ensureDirectories() {
    if (!fs.existsSync('./logs')) {
      fs.mkdirSync('./logs', { recursive: true });
    }
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}`;
    console.log(logEntry);
    
    fs.appendFileSync(this.config.logFile, logEntry + '\n');
  }

  async connect() {
    try {
      this.log('🔗 Connecting to database...');
      await this.client.connect();
      this.log('✅ Database connection established');
      return true;
    } catch (error) {
      this.log(`❌ Connection failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  async disconnect() {
    try {
      await this.client.end();
      this.log('🔌 Database connection closed');
    } catch (error) {
      this.log(`⚠️ Error closing connection: ${error.message}`, 'WARN');
    }
  }

  async executeSQL(sqlFile, description) {
    if (!fs.existsSync(sqlFile)) {
      throw new Error(`SQL file not found: ${sqlFile}`);
    }

    this.log(`📝 Executing ${description}...`);
    this.log(`📁 File: ${sqlFile}`);
    
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    
    try {
      const result = await this.client.query(sqlContent);
      this.log(`✅ ${description} completed successfully`);
      
      if (result.rows && result.rows.length > 0) {
        this.log(`📊 Result: ${JSON.stringify(result.rows)}`);
      }
      
      return result;
    } catch (error) {
      this.log(`❌ ${description} failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  async testConnection() {
    try {
      this.log('🔍 Testing database connection...');
      
      const result = await this.client.query('SELECT current_database(), current_user, version()');
      
      if (result.rows && result.rows.length > 0) {
        const info = result.rows[0];
        this.log('✅ Database connection successful');
        this.log(`📊 Database: ${info.current_database}`);
        this.log(`👤 User: ${info.current_user}`);
        this.log(`🗄️ Version: ${info.version.split(' ').slice(0, 2).join(' ')}`);
      }
      
      return true;
    } catch (error) {
      this.log(`❌ Connection test failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  async deploySchema() {
    try {
      await this.executeSQL(this.config.schemaFile, 'Schema Deployment');
      
      // Verify schema deployment
      const result = await this.client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `);
      
      const tables = result.rows.map(row => row.table_name);
      this.log(`✅ Schema deployed successfully. Tables created: ${tables.length}`);
      this.log(`📋 Tables: ${tables.join(', ')}`);
      
      return tables;
    } catch (error) {
      throw new Error(`Schema deployment failed: ${error.message}`);
    }
  }

  async importData() {
    try {
      await this.executeSQL(this.config.dataFile, 'Data Import');
      
      // Verify data import
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
      
      this.log('✅ Data import completed successfully');
      this.log('📊 Record counts:');
      Object.entries(counts).forEach(([table, count]) => {
        this.log(`   ${table}: ${count} records`);
      });
      
      return counts;
    } catch (error) {
      throw new Error(`Data import failed: ${error.message}`);
    }
  }

  async fullDeployment() {
    const startTime = Date.now();
    
    try {
      this.log('🚀 Starting full database deployment...');
      
      // Step 1: Connect and test
      await this.connect();
      await this.testConnection();
      
      // Step 2: Deploy schema
      const tables = await this.deploySchema();
      
      // Step 3: Import data
      const dataCounts = await this.importData();
      
      const duration = Math.round((Date.now() - startTime) / 1000);
      
      this.log('🎉 Full deployment completed successfully!');
      this.log(`⏱️ Total time: ${duration} seconds`);
      
      return {
        success: true,
        duration,
        tables: tables.length,
        tableList: tables,
        dataCounts,
        message: 'Database deployment completed successfully'
      };
      
    } catch (error) {
      const duration = Math.round((Date.now() - startTime) / 1000);
      this.log(`💥 Deployment failed after ${duration} seconds: ${error.message}`, 'ERROR');
      
      return {
        success: false,
        duration,
        error: error.message,
        message: 'Database deployment failed'
      };
    } finally {
      await this.disconnect();
    }
  }

  async run(command = 'deploy') {
    this.log(`🚀 Node Database Deployer starting: ${command}`);
    
    try {
      switch (command) {
        case 'test':
          await this.connect();
          const testResult = await this.testConnection();
          await this.disconnect();
          return { success: true, message: 'Connection test successful' };
          
        case 'schema':
          await this.connect();
          const tables = await this.deploySchema();
          await this.disconnect();
          return { success: true, tables: tables.length, tableList: tables };
          
        case 'data':
          await this.connect();
          const counts = await this.importData();
          await this.disconnect();
          return { success: true, dataCounts: counts };
          
        case 'deploy':
          return await this.fullDeployment();
          
        default:
          throw new Error(`Unknown command: ${command}`);
      }
    } catch (error) {
      this.log(`💥 Deployer error: ${error.message}`, 'ERROR');
      await this.disconnect();
      return { success: false, error: error.message };
    }
  }
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2] || 'deploy';
  const deployer = new NodeDatabaseDeployer();
  
  deployer.run(command).then(result => {
    console.log('\n📋 Final Result:');
    console.log(JSON.stringify(result, null, 2));
    
    process.exit(result && result.success !== false ? 0 : 1);
  }).catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

module.exports = NodeDatabaseDeployer;