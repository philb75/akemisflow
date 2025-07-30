# AkemisFlow Automation Agents

Comprehensive automation suite for AkemisFlow deployment, monitoring, and maintenance operations.

## 🤖 Available Agents

### 1. **Sync Agent** (`sync-agent.js`)
Bidirectional synchronization between local and production environments.

```bash
# Generate sync report
node agents/sync-agent.js report

# Sync local data to production
node agents/sync-agent.js local-to-prod

# Sync production data to local
node agents/sync-agent.js prod-to-local

# Check production database health
node agents/sync-agent.js health
```

**Features:**
- Health monitoring for Supabase database
- Automated backup creation before sync
- Data export/import orchestration
- Sync history tracking and reporting

### 2. **Monitoring Agent** (`monitoring-agent.js`)
Continuous health monitoring and alerting for production environment.

```bash
# Single health check
node agents/monitoring-agent.js check

# Generate monitoring report
node agents/monitoring-agent.js report

# Start continuous monitoring (5-minute intervals)
node agents/monitoring-agent.js monitor

# View recent alerts
node agents/monitoring-agent.js alerts
```

**Features:**
- Multi-service health checks (Supabase, Vercel, Application)
- Response time monitoring
- Uptime calculation and alerting
- Automated alert generation and logging
- Comprehensive metrics collection

### 3. **Backup Agent** (`backup-agent.js`)
Automated backup management for local and production environments.

```bash
# Create local database backup
node agents/backup-agent.js create-local

# Generate production backup instructions
node agents/backup-agent.js create-production-instructions

# List all backups
node agents/backup-agent.js list

# List specific category (local/production/archive)
node agents/backup-agent.js list local

# Restore from backup
node agents/backup-agent.js restore ./backups/local/backup_file.sql

# Cleanup old backups
node agents/backup-agent.js cleanup

# Generate backup report
node agents/backup-agent.js report
```

**Features:**
- Automated local database backups with Docker
- Production backup instruction generation
- Backup verification with SHA256 hashing
- Automatic cleanup and archiving
- Restore capabilities with safety backups
- Comprehensive backup reporting

### 4. **Deployment Agent** (`deployment-agent.js`)
Automated deployment orchestration and CI/CD pipeline management.

```bash
# Full deployment process
node agents/deployment-agent.js deploy

# Pre-deployment checks only
node agents/deployment-agent.js check

# Database schema validation
node agents/deployment-agent.js validate-schema

# View deployment history
node agents/deployment-agent.js history

# Rollback to previous deployment
node agents/deployment-agent.js rollback DEPLOYMENT_ID

# Generate deployment report
node agents/deployment-agent.js report
```

**Features:**
- Comprehensive pre-deployment validation
- Automated Vercel deployment with status monitoring
- Database schema validation
- Health verification post-deployment
- Deployment history tracking
- Rollback capabilities (manual process)

## 🔧 Configuration

All agents use shared configuration stored in each agent file:

```javascript
this.config = {
  supabaseToken: 'sbp_7cb3affb7a9b72d1c4c9eeb418127d8ed4951303',
  vercelToken: 'GvvdIlBMcIsvuWWuupv1URZA',
  projectId: 'wflcaapznpczlxjaeyfd',
  // ... other configurations
};
```

## 📊 Logging and Reports

### Log Files
- `./logs/sync-agent.log` - Sync operations
- `./logs/monitoring-agent.log` - Health monitoring
- `./logs/backup-agent.log` - Backup operations  
- `./logs/deployment-agent.log` - Deployment activities

### Report Files
- `./logs/sync_report_*.json` - Sync status and recommendations
- `./logs/monitoring_report_*.json` - Health metrics and alerts
- `./logs/backup_report_*.json` - Backup inventory and status
- `./logs/deployment_report_*.json` - Deployment history and metrics

### Metrics Files
- `./logs/metrics.json` - Continuous monitoring metrics
- `./deployments/latest.json` - Latest deployment information
- `./alerts/alert_*.json` - Alert notifications

## 🚦 Usage Patterns

### Daily Operations
```bash
# Morning health check
node agents/monitoring-agent.js check

# Create daily backup
node agents/backup-agent.js create-local

# Sync latest data if needed
node agents/sync-agent.js local-to-prod
```

### Deployment Workflow
```bash
# Pre-deployment validation
node agents/deployment-agent.js check

# Create backup before deployment
node agents/backup-agent.js create-local

# Deploy to production
node agents/deployment-agent.js deploy

# Monitor deployment health
node agents/monitoring-agent.js check
```

### Weekly Maintenance
```bash
# Generate comprehensive reports
node agents/sync-agent.js report
node agents/monitoring-agent.js report
node agents/backup-agent.js report
node agents/deployment-agent.js report

# Cleanup old backups
node agents/backup-agent.js cleanup
```

## 🔍 Troubleshooting

### Common Issues

**Database Connection Failures:**
```bash
# Check Supabase status
node agents/monitoring-agent.js check

# Verify configuration
node agents/sync-agent.js health
```

**Deployment Failures:**
```bash
# Run pre-deployment checks
node agents/deployment-agent.js check

# Check deployment history
node agents/deployment-agent.js history
```

**Backup Issues:**
```bash
# Verify Docker containers
docker ps | grep akemisflow

# Check backup permissions
ls -la ./backups/
```

## 🚀 Advanced Usage

### Continuous Monitoring
```bash
# Start continuous monitoring (runs until Ctrl+C)
node agents/monitoring-agent.js monitor
```

### Scheduled Operations (with cron)
```bash
# Add to crontab for automated operations
# Daily backup at 2 AM
0 2 * * * cd /path/to/akemisflow && node agents/backup-agent.js create-local

# Health check every 15 minutes
*/15 * * * * cd /path/to/akemisflow && node agents/monitoring-agent.js check
```

### Custom Workflows
```bash
# Chain operations for complete sync
node agents/backup-agent.js create-local && \
node agents/sync-agent.js local-to-prod && \
node agents/monitoring-agent.js check
```

## 📋 Agent Integration

Agents can be integrated with external systems:

- **Slack/Discord**: Alert notifications
- **GitHub Actions**: CI/CD integration
- **Monitoring Tools**: Metrics export
- **Email**: Report delivery

## 🔐 Security Considerations

- API tokens are stored in agent configuration
- Backup files may contain sensitive data
- Logs should be secured and rotated
- Network access required for cloud operations

## 📞 Support

For issues or questions:
1. Check agent logs in `./logs/`
2. Run diagnostic commands with each agent
3. Review configuration and permissions
4. Consult the main project documentation

---

**Last Updated:** January 30, 2025  
**Agent Version:** 1.0  
**Compatible with:** AkemisFlow Production Environment