#!/usr/bin/env node

/**
 * Local Database Deployment Script
 * Execute schema and data deployment from your local machine
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

class LocalDatabaseDeployer {
  constructor() {
    this.config = {
      // Direct connection with updated password
      connectionString: 'postgresql://postgres:Philb921056$@db.wflcaapznpczlxjaeyfd.supabase.co:5432/postgres',
      schemaFile: './deploy-to-production.sql',
      dataFile: './migrations/local-export/20250729_214852_local_data.sql',
      logFile: './logs/database-deployment.log'
    };
    
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

  async executeSQL(sqlFile, description) {
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(sqlFile)) {
        reject(new Error(`SQL file not found: ${sqlFile}`));
        return;
      }

      this.log(`📝 Executing ${description}...`);
      this.log(`📁 File: ${sqlFile}`);
      
      // Use psql command to execute SQL file
      const command = `psql "${this.config.connectionString}" -f "${sqlFile}"`;
      
      exec(command, (error, stdout, stderr) => {
        if (error) {
          this.log(`❌ ${description} failed: ${error.message}`, 'ERROR');
          if (stderr) {
            this.log(`📄 Error details: ${stderr}`, 'ERROR');
          }
          reject(error);
          return;
        }

        if (stderr && !stderr.includes('NOTICE')) {
          this.log(`⚠️ ${description} warnings: ${stderr}`, 'WARN');
        }

        if (stdout) {
          this.log(`✅ ${description} output: ${stdout}`);
        }

        this.log(`✅ ${description} completed successfully`);
        resolve({ stdout, stderr });
      });
    });
  }

  async testConnection() {
    return new Promise((resolve, reject) => {
      this.log('🔍 Testing database connection...');
      
      const testCommand = `psql "${this.config.connectionString}" -c "SELECT current_database(), current_user, version();"`;
      
      exec(testCommand, (error, stdout, stderr) => {
        if (error) {
          this.log(`❌ Connection test failed: ${error.message}`, 'ERROR');
          reject(error);
          return;
        }

        this.log('✅ Database connection successful');
        if (stdout) {
          this.log(`📊 Connection details: ${stdout.trim()}`);
        }
        resolve(true);
      });
    });
  }

  async deploySchema() {
    try {
      await this.executeSQL(this.config.schemaFile, 'Schema Deployment');
      
      // Verify schema deployment
      return new Promise((resolve, reject) => {
        const verifyCommand = `psql "${this.config.connectionString}" -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"`;
        
        exec(verifyCommand, (error, stdout, stderr) => {
          if (error) {
            reject(error);
            return;
          }
          
          const tables = stdout.split('\n').filter(line => line.trim() && !line.includes('table_name') && !line.includes('---'));
          this.log(`✅ Schema deployed successfully. Tables created: ${tables.length}`);
          this.log(`📋 Tables: ${tables.join(', ')}`);
          resolve(tables);
        });
      });
    } catch (error) {
      throw new Error(`Schema deployment failed: ${error.message}`);
    }
  }

  async importData() {
    try {
      await this.executeSQL(this.config.dataFile, 'Data Import');
      
      // Verify data import
      return new Promise((resolve, reject) => {
        const tables = ['contacts', 'suppliers', 'bank_accounts', 'transactions'];
        const countQueries = tables.map(table => `SELECT '${table}' as table_name, COUNT(*) as count FROM ${table}`).join(' UNION ALL ');
        const verifyCommand = `psql "${this.config.connectionString}" -c "${countQueries};"`;
        
        exec(verifyCommand, (error, stdout, stderr) => {
          if (error) {
            reject(error);
            return;
          }
          
          this.log('✅ Data import completed successfully');
          this.log(`📊 Record counts: ${stdout}`);
          resolve(stdout);
        });
      });
    } catch (error) {
      throw new Error(`Data import failed: ${error.message}`);
    }
  }

  async fullDeployment() {
    const startTime = Date.now();
    
    try {
      this.log('🚀 Starting full database deployment...');
      
      // Step 1: Test connection
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
    }
  }

  async run(command = 'deploy') {
    this.log(`🚀 Local Database Deployer starting: ${command}`);
    
    try {
      switch (command) {
        case 'test':
          return await this.testConnection();
        case 'schema':
          return await this.deploySchema();
        case 'data':
          return await this.importData();
        case 'deploy':
          return await this.fullDeployment();
        default:
          throw new Error(`Unknown command: ${command}`);
      }
    } catch (error) {
      this.log(`💥 Deployer error: ${error.message}`, 'ERROR');
      return { success: false, error: error.message };
    }
  }
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2] || 'deploy';
  const deployer = new LocalDatabaseDeployer();
  
  deployer.run(command).then(result => {
    if (typeof result === 'object') {
      console.log('\n📋 Final Result:');
      console.log(JSON.stringify(result, null, 2));
    }
    
    process.exit(result && result.success !== false ? 0 : 1);
  }).catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

module.exports = LocalDatabaseDeployer;