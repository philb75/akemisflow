#!/usr/bin/env node

/**
 * AkemisFlow Sync Agent
 * Automated bidirectional synchronization between local and production
 */

const https = require('https');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class AkemisFlowSyncAgent {
  constructor() {
    this.config = {
      supabaseToken: 'sbp_7cb3affb7a9b72d1c4c9eeb418127d8ed4951303',
      vercelToken: 'GvvdIlBMcIsvuWWuupv1URZA',
      projectId: 'wflcaapznpczlxjaeyfd',
      localDb: 'postgresql://akemisflow:dev_password_2024@localhost:5432/akemisflow_dev',
      prodDb: 'postgresql://postgres.wflcaapznpczlxjaeyfd:JqQKoxNn1HMm4cThe@aws-0-eu-west-3.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1',
      backupDir: './backups',
      logFile: './logs/sync-agent.log'
    };
    
    this.ensureDirectories();
  }

  ensureDirectories() {
    ['./backups', './logs', './migrations/auto-sync'].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}`;
    console.log(logEntry);
    
    // Append to log file
    fs.appendFileSync(this.config.logFile, logEntry + '\n');
  }

  async makeRequest(hostname, path, method = 'GET', headers = {}, data = null) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname,
        port: 443,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'AkemisFlow-SyncAgent/1.0',
          ...headers
        }
      };

      const req = https.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => responseData += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(responseData);
            resolve({ status: res.statusCode, data: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, data: responseData });
          }
        });
      });

      req.on('error', reject);
      
      if (data) {
        req.write(JSON.stringify(data));
      }
      
      req.end();
    });
  }

  async checkSupabaseHealth() {
    try {
      const result = await this.makeRequest(
        'api.supabase.com',
        `/v1/projects/${this.config.projectId}`,
        'GET',
        { 'Authorization': `Bearer ${this.config.supabaseToken}` }
      );

      if (result.status === 200 && result.data.status === 'ACTIVE_HEALTHY') {
        this.log('✅ Supabase database is healthy');
        return true;
      } else {
        this.log(`⚠️ Supabase status: ${result.data?.status || 'unknown'}`, 'WARN');
        return false;
      }
    } catch (error) {
      this.log(`❌ Supabase health check failed: ${error.message}`, 'ERROR');
      return false;
    }
  }

  createBackup(type = 'local') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(this.config.backupDir, `${type}_backup_${timestamp}.sql`);
    
    try {
      if (type === 'local') {
        this.log('📦 Creating local database backup...');
        execSync(`docker exec akemisflow_postgres pg_dump -U akemisflow -d akemisflow_dev --data-only --no-owner --no-privileges > "${backupFile}"`);
      } else {
        this.log('📦 Creating production database backup...');
        // Production backup would require network access
        this.log('⚠️ Production backup requires manual execution via Supabase dashboard', 'WARN');
        return null;
      }
      
      this.log(`✅ Backup created: ${backupFile}`);
      return backupFile;
    } catch (error) {
      this.log(`❌ Backup failed: ${error.message}`, 'ERROR');
      return null;
    }
  }

  async syncLocalToProduction() {
    this.log('🔄 Starting local → production sync...');
    
    // Step 1: Check production health
    const isHealthy = await this.checkSupabaseHealth();
    if (!isHealthy) {
      this.log('❌ Production database not healthy, aborting sync', 'ERROR');
      return false;
    }

    // Step 2: Create local backup
    const backupFile = this.createBackup('local');
    if (!backupFile) {
      this.log('❌ Could not create backup, aborting sync', 'ERROR');
      return false;
    }

    // Step 3: Export local data
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const exportFile = `./migrations/auto-sync/local_export_${timestamp}.sql`;
    
    try {
      execSync(`docker exec akemisflow_postgres pg_dump -U akemisflow -d akemisflow_dev --data-only --no-owner --no-privileges --format=plain > "${exportFile}"`);
      this.log(`✅ Local data exported: ${exportFile}`);
    } catch (error) {
      this.log(`❌ Local export failed: ${error.message}`, 'ERROR');
      return false;
    }

    // Step 4: Instructions for manual import
    this.log('📋 Manual steps required for production import:');
    this.log(`1. Go to Supabase dashboard: https://supabase.com/dashboard/project/${this.config.projectId}`);
    this.log(`2. Navigate to SQL Editor`);
    this.log(`3. Upload and execute: ${exportFile}`);
    this.log('4. Verify data integrity after import');

    return true;
  }

  async syncProductionToLocal() {
    this.log('🔄 Starting production → local sync...');
    
    // Step 1: Check production health
    const isHealthy = await this.checkSupabaseHealth();
    if (!isHealthy) {
      this.log('❌ Production database not healthy, aborting sync', 'ERROR');
      return false;
    }

    // Step 2: Create local backup
    const backupFile = this.createBackup('local');
    if (!backupFile) {
      this.log('❌ Could not create backup, aborting sync', 'ERROR');
      return false;
    }

    // Step 3: Reset local database
    try {
      this.log('🔄 Resetting local database...');
      execSync('docker exec akemisflow_postgres psql -U akemisflow -d akemisflow_dev -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"');
      
      // Apply current schema
      execSync(`DATABASE_URL="${this.config.localDb}" pnpm prisma db push`);
      this.log('✅ Local database reset and schema applied');
    } catch (error) {
      this.log(`❌ Local database reset failed: ${error.message}`, 'ERROR');
      return false;
    }

    // Step 4: Instructions for manual data sync
    this.log('📋 Manual steps required for production data sync:');
    this.log('1. Export data from Supabase dashboard');
    this.log('2. Save as production_export.sql');
    this.log('3. Run: docker exec -i akemisflow_postgres psql -U akemisflow -d akemisflow_dev < production_export.sql');

    return true;
  }

  generateSyncReport() {
    const timestamp = new Date().toISOString();
    const report = {
      timestamp,
      localStatus: this.checkLocalStatus(),
      productionStatus: 'Manual check required',
      lastSync: this.getLastSyncTime(),
      backupCount: this.getBackupCount(),
      recommendations: this.getRecommendations()
    };

    const reportFile = `./logs/sync_report_${timestamp.replace(/[:.]/g, '-')}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    this.log('📊 Sync report generated');
    console.log(JSON.stringify(report, null, 2));
    
    return report;
  }

  checkLocalStatus() {
    try {
      const result = execSync('docker exec akemisflow_postgres psql -U akemisflow -d akemisflow_dev -c "SELECT COUNT(*) FROM contacts;" -t', { encoding: 'utf8' });
      const contactCount = parseInt(result.trim());
      return {
        status: 'healthy',
        contactCount,
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        lastChecked: new Date().toISOString()
      };
    }
  }

  getLastSyncTime() {
    const syncFiles = fs.readdirSync('./migrations/auto-sync').filter(f => f.includes('local_export'));
    if (syncFiles.length === 0) return null;
    
    const latestFile = syncFiles.sort().pop();
    const stats = fs.statSync(`./migrations/auto-sync/${latestFile}`);
    return stats.mtime.toISOString();
  }

  getBackupCount() {
    return fs.readdirSync(this.config.backupDir).filter(f => f.endsWith('.sql')).length;
  }

  getRecommendations() {
    const recommendations = [];
    
    if (this.getBackupCount() > 10) {
      recommendations.push('Consider cleaning up old backup files');
    }
    
    const lastSync = this.getLastSyncTime();
    if (!lastSync || new Date() - new Date(lastSync) > 24 * 60 * 60 * 1000) {
      recommendations.push('Data sync is overdue (>24 hours)');
    }
    
    return recommendations;
  }

  async run(command = 'report') {
    this.log(`🚀 AkemisFlow Sync Agent starting: ${command}`);
    
    try {
      switch (command) {
        case 'local-to-prod':
          return await this.syncLocalToProduction();
        case 'prod-to-local':
          return await this.syncProductionToLocal();
        case 'report':
          return this.generateSyncReport();
        case 'health':
          return await this.checkSupabaseHealth();
        default:
          this.log(`❌ Unknown command: ${command}`, 'ERROR');
          return false;
      }
    } catch (error) {
      this.log(`💥 Agent error: ${error.message}`, 'ERROR');
      return false;
    }
  }
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2] || 'report';
  const agent = new AkemisFlowSyncAgent();
  
  agent.run(command).then(result => {
    process.exit(result ? 0 : 1);
  }).catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

module.exports = AkemisFlowSyncAgent;