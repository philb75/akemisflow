#!/usr/bin/env node

/**
 * AkemisFlow Backup Agent
 * Automated backup management for local and production environments
 */

const https = require('https');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class AkemisFlowBackupAgent {
  constructor() {
    this.config = {
      supabaseToken: 'sbp_7cb3affb7a9b72d1c4c9eeb418127d8ed4951303',
      projectId: 'wflcaapznpczlxjaeyfd',
      localDb: 'postgresql://akemisflow:dev_password_2024@localhost:5432/akemisflow_dev',
      backupDir: './backups',
      archiveDir: './backups/archive',
      maxBackups: 20,
      maxArchives: 100,
      logFile: './logs/backup-agent.log',
      schedules: {
        local: '0 */6 * * *', // Every 6 hours
        production: '0 2 * * *' // Daily at 2 AM
      }
    };
    
    this.ensureDirectories();
  }

  ensureDirectories() {
    [
      this.config.backupDir,
      this.config.archiveDir,
      './logs',
      './backups/local',
      './backups/production'
    ].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}`;
    console.log(logEntry);
    
    fs.appendFileSync(this.config.logFile, logEntry + '\n');
  }

  generateBackupFilename(type, format = 'sql') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${type}_backup_${timestamp}.${format}`;
  }

  calculateFileHash(filePath) {
    try {
      const data = fs.readFileSync(filePath);
      return crypto.createHash('sha256').update(data).digest('hex');
    } catch (error) {
      this.log(`Failed to calculate hash for ${filePath}: ${error.message}`, 'ERROR');
      return null;
    }
  }

  getFileSize(filePath) {
    try {
      const stats = fs.statSync(filePath);
      return stats.size;
    } catch (error) {
      return 0;
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async createLocalBackup(options = {}) {
    const { includeData = true, includeSchema = true, compress = false } = options;
    
    this.log('📦 Creating local database backup...');
    
    const filename = this.generateBackupFilename('local');
    const backupPath = path.join('./backups/local', filename);
    
    try {
      let pgDumpArgs = [
        '-U akemisflow',
        '-d akemisflow_dev',
        '--no-owner',
        '--no-privileges'
      ];

      if (includeData && !includeSchema) {
        pgDumpArgs.push('--data-only');
      } else if (includeSchema && !includeData) {
        pgDumpArgs.push('--schema-only');
      }

      if (compress) {
        pgDumpArgs.push('--format=custom');
        pgDumpArgs.push('--compress=9');
      } else {
        pgDumpArgs.push('--format=plain');
      }

      const command = `docker exec akemisflow_postgres pg_dump ${pgDumpArgs.join(' ')} > "${backupPath}"`;
      
      this.log(`Executing: ${command}`);
      execSync(command, { stdio: 'pipe' });
      
      const fileSize = this.getFileSize(backupPath);
      const fileHash = this.calculateFileHash(backupPath);
      
      const backupInfo = {
        filename,
        path: backupPath,
        type: 'local',
        timestamp: new Date().toISOString(),
        size: fileSize,
        sizeFormatted: this.formatBytes(fileSize),
        hash: fileHash,
        options,
        tables: await this.getTableCounts('local')
      };

      // Save backup metadata
      const metadataPath = backupPath.replace('.sql', '.json');
      fs.writeFileSync(metadataPath, JSON.stringify(backupInfo, null, 2));
      
      this.log(`✅ Local backup created: ${filename} (${this.formatBytes(fileSize)})`);
      
      // Cleanup old backups
      await this.cleanupOldBackups('local');
      
      return backupInfo;
      
    } catch (error) {
      this.log(`❌ Local backup failed: ${error.message}`, 'ERROR');
      
      // Clean up failed backup file
      if (fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath);
      }
      
      throw error;
    }
  }

  async getTableCounts(environment) {
    const tables = ['contacts', 'suppliers', 'bank_accounts', 'transactions', 'invoices'];
    const counts = {};
    
    try {
      if (environment === 'local') {
        for (const table of tables) {
          const result = execSync(
            `docker exec akemisflow_postgres psql -U akemisflow -d akemisflow_dev -c "SELECT COUNT(*) FROM ${table};" -t`,
            { encoding: 'utf8' }
          );
          counts[table] = parseInt(result.trim()) || 0;
        }
      } else {
        // Production counts would require API call or direct connection
        this.log('Production table counts require manual verification', 'INFO');
      }
    } catch (error) {
      this.log(`Failed to get table counts: ${error.message}`, 'WARN');
    }
    
    return counts;
  }

  async createProductionBackupInstructions() {
    this.log('📋 Generating production backup instructions...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const instructionsFile = `./backups/production/backup_instructions_${timestamp}.md`;
    
    const instructions = `# Production Backup Instructions - ${new Date().toISOString()}

## Automated Backup via Supabase Dashboard

1. **Navigate to Supabase Dashboard**
   - URL: https://supabase.com/dashboard/project/${this.config.projectId}
   - Go to Settings → Database

2. **Create Backup**
   - Click "Create Backup" or "Export Database"
   - Select format: SQL dump
   - Include: Schema + Data
   - Click "Download"

3. **Save Backup**
   - Save as: \`production_backup_${timestamp}.sql\`
   - Location: \`./backups/production/\`

## Manual Backup via psql (if direct access available)

\`\`\`bash
# Full backup
pg_dump "postgresql://postgres.${this.config.projectId}:PASSWORD@aws-0-eu-west-3.pooler.supabase.com:6543/postgres" \\
  --no-owner --no-privileges --format=plain > production_backup_${timestamp}.sql

# Data only
pg_dump "postgresql://postgres.${this.config.projectId}:PASSWORD@aws-0-eu-west-3.pooler.supabase.com:6543/postgres" \\
  --data-only --no-owner --no-privileges --format=plain > production_data_${timestamp}.sql
\`\`\`

## Verification Commands

After creating backup, verify with:
\`\`\`bash
# Check file size
ls -lh ./backups/production/production_backup_${timestamp}.sql

# Count lines
wc -l ./backups/production/production_backup_${timestamp}.sql

# Verify SQL syntax
head -20 ./backups/production/production_backup_${timestamp}.sql
\`\`\`

## Notes
- Backups should be created during low-traffic periods
- Verify backup integrity before archiving
- Keep at least 7 daily backups for disaster recovery
- Consider encrypting backups containing sensitive data

Generated by AkemisFlow Backup Agent on ${new Date().toISOString()}
`;

    fs.writeFileSync(instructionsFile, instructions);
    this.log(`✅ Production backup instructions saved: ${path.basename(instructionsFile)}`);
    
    return {
      instructionsFile,
      instructions,
      timestamp: new Date().toISOString()
    };
  }

  async cleanupOldBackups(type) {
    const backupPath = `./backups/${type}`;
    
    try {
      const files = fs.readdirSync(backupPath)
        .filter(f => f.endsWith('.sql'))
        .map(f => ({
          name: f,
          path: path.join(backupPath, f),
          stats: fs.statSync(path.join(backupPath, f))
        }))
        .sort((a, b) => b.stats.mtime - a.stats.mtime);

      if (files.length > this.config.maxBackups) {
        const filesToDelete = files.slice(this.config.maxBackups);
        
        for (const file of filesToDelete) {
          // Move to archive instead of deleting
          const archivePath = path.join(this.config.archiveDir, file.name);
          fs.renameSync(file.path, archivePath);
          
          // Also move metadata if exists
          const metadataPath = file.path.replace('.sql', '.json');
          const archiveMetadataPath = archivePath.replace('.sql', '.json');
          if (fs.existsSync(metadataPath)) {
            fs.renameSync(metadataPath, archiveMetadataPath);
          }
          
          this.log(`📁 Archived old backup: ${file.name}`);
        }
      }

      // Clean up very old archives
      await this.cleanupArchives();
      
    } catch (error) {
      this.log(`Failed to cleanup old backups: ${error.message}`, 'ERROR');
    }
  }

  async cleanupArchives() {
    try {
      const files = fs.readdirSync(this.config.archiveDir)
        .filter(f => f.endsWith('.sql'))
        .map(f => ({
          name: f,
          path: path.join(this.config.archiveDir, f),
          stats: fs.statSync(path.join(this.config.archiveDir, f))
        }))
        .sort((a, b) => b.stats.mtime - a.stats.mtime);

      if (files.length > this.config.maxArchives) {
        const filesToDelete = files.slice(this.config.maxArchives);
        
        for (const file of filesToDelete) {
          fs.unlinkSync(file.path);
          
          // Also delete metadata
          const metadataPath = file.path.replace('.sql', '.json');
          if (fs.existsSync(metadataPath)) {
            fs.unlinkSync(metadataPath);
          }
          
          this.log(`🗑️ Deleted old archive: ${file.name}`);
        }
      }
    } catch (error) {
      this.log(`Failed to cleanup archives: ${error.message}`, 'ERROR');
    }
  }

  async restoreFromBackup(backupPath, targetEnvironment = 'local') {
    this.log(`🔄 Restoring from backup: ${backupPath} to ${targetEnvironment}`);
    
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupPath}`);
    }

    try {
      if (targetEnvironment === 'local') {
        // Create safety backup before restore
        await this.createLocalBackup({ 
          includeData: true, 
          includeSchema: true 
        });
        
        // Reset database
        this.log('🔄 Resetting local database...');
        execSync('docker exec akemisflow_postgres psql -U akemisflow -d akemisflow_dev -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"');
        
        // Restore from backup
        this.log('📥 Restoring from backup...');
        execSync(`docker exec -i akemisflow_postgres psql -U akemisflow -d akemisflow_dev < "${backupPath}"`);
        
        // Apply current schema if needed
        execSync(`DATABASE_URL="${this.config.localDb}" pnpm prisma db push`);
        
        this.log('✅ Local database restored successfully');
      } else {
        this.log('📋 Production restore requires manual steps:', 'INFO');
        this.log('1. Access Supabase dashboard');
        this.log('2. Go to SQL Editor');
        this.log(`3. Upload and execute: ${backupPath}`);
        this.log('4. Verify data integrity after restore');
      }

      return true;
    } catch (error) {
      this.log(`❌ Restore failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  async listBackups(type = 'all') {
    const backups = {};
    
    const getBackupInfo = (dir, category) => {
      if (!fs.existsSync(dir)) return [];
      
      return fs.readdirSync(dir)
        .filter(f => f.endsWith('.sql'))
        .map(f => {
          const filePath = path.join(dir, f);
          const metadataPath = filePath.replace('.sql', '.json');
          const stats = fs.statSync(filePath);
          
          let metadata = {};
          if (fs.existsSync(metadataPath)) {
            try {
              metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
            } catch (e) {
              // Ignore metadata parsing errors
            }
          }
          
          return {
            filename: f,
            path: filePath,
            category,
            size: stats.size,
            sizeFormatted: this.formatBytes(stats.size),
            created: stats.mtime.toISOString(),
            age: Math.round((Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24)) + ' days',
            ...metadata
          };
        })
        .sort((a, b) => new Date(b.created) - new Date(a.created));
    };

    if (type === 'all' || type === 'local') {
      backups.local = getBackupInfo('./backups/local', 'local');
    }
    
    if (type === 'all' || type === 'production') {
      backups.production = getBackupInfo('./backups/production', 'production');
    }
    
    if (type === 'all' || type === 'archive') {
      backups.archive = getBackupInfo('./backups/archive', 'archive');
    }

    return backups;
  }

  async generateReport() {
    const backups = await this.listBackups();
    const totalBackups = Object.values(backups).reduce((sum, category) => sum + category.length, 0);
    const totalSize = Object.values(backups)
      .flat()
      .reduce((sum, backup) => sum + backup.size, 0);

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalBackups,
        totalSize: this.formatBytes(totalSize),
        categories: {
          local: backups.local?.length || 0,
          production: backups.production?.length || 0,
          archive: backups.archive?.length || 0
        },
        oldestBackup: this.getOldestBackup(backups),
        newestBackup: this.getNewestBackup(backups)
      },
      backups,
      configuration: {
        maxBackups: this.config.maxBackups,
        maxArchives: this.config.maxArchives,
        backupDirectory: this.config.backupDir
      },
      recommendations: this.generateRecommendations(backups)
    };

    const reportFile = `./logs/backup_report_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    this.log('📊 Backup report generated');
    console.log(JSON.stringify(report, null, 2));
    
    return report;
  }

  getOldestBackup(backups) {
    const allBackups = Object.values(backups).flat();
    if (allBackups.length === 0) return null;
    
    return allBackups.reduce((oldest, backup) => 
      new Date(backup.created) < new Date(oldest.created) ? backup : oldest
    );
  }

  getNewestBackup(backups) {
    const allBackups = Object.values(backups).flat();
    if (allBackups.length === 0) return null;
    
    return allBackups.reduce((newest, backup) => 
      new Date(backup.created) > new Date(newest.created) ? backup : newest
    );
  }

  generateRecommendations(backups) {
    const recommendations = [];
    const allBackups = Object.values(backups).flat();
    
    if (allBackups.length === 0) {
      recommendations.push('No backups found - create initial backup immediately');
      return recommendations;
    }

    const newestBackup = this.getNewestBackup(backups);
    const backupAge = Date.now() - new Date(newestBackup.created).getTime();
    const hoursOld = backupAge / (1000 * 60 * 60);
    
    if (hoursOld > 24) {
      recommendations.push('Latest backup is over 24 hours old - consider creating fresh backup');
    }
    
    if (backups.production?.length === 0) {
      recommendations.push('No production backups found - create production backup procedure');
    }
    
    if (backups.local?.length < 3) {
      recommendations.push('Maintain at least 3 local backups for better disaster recovery');
    }

    const totalSize = allBackups.reduce((sum, backup) => sum + backup.size, 0);
    if (totalSize > 1024 * 1024 * 1024) { // 1GB
      recommendations.push('Backup storage exceeds 1GB - consider cleanup or compression');
    }

    if (recommendations.length === 0) {
      recommendations.push('Backup system is healthy and well-maintained');
    }

    return recommendations;
  }

  async run(command = 'report', ...args) {
    this.log(`🚀 AkemisFlow Backup Agent starting: ${command}`);
    
    try {
      switch (command) {
        case 'create-local':
          return await this.createLocalBackup();
        case 'create-production-instructions':
          return await this.createProductionBackupInstructions();
        case 'list':
          return await this.listBackups(args[0] || 'all');
        case 'restore':
          if (!args[0]) throw new Error('Backup path required for restore');
          return await this.restoreFromBackup(args[0], args[1]);
        case 'cleanup':
          await this.cleanupOldBackups('local');
          await this.cleanupOldBackups('production');
          return { message: 'Cleanup completed' };
        case 'report':
          return await this.generateReport();
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
  const [,, command, ...args] = process.argv;
  const agent = new AkemisFlowBackupAgent();
  
  agent.run(command || 'report', ...args).then(result => {
    if (result && typeof result === 'object') {
      console.log(JSON.stringify(result, null, 2));
    }
    
    process.exit(result ? 0 : 1);
  }).catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

module.exports = AkemisFlowBackupAgent;