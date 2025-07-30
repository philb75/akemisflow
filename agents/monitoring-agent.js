#!/usr/bin/env node

/**
 * AkemisFlow Monitoring Agent
 * Continuous health monitoring and alerting for production environment
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

class AkemisFlowMonitoringAgent {
  constructor() {
    this.config = {
      supabaseToken: 'sbp_7cb3affb7a9b72d1c4c9eeb418127d8ed4951303',
      vercelToken: 'GvvdIlBMcIsvuWWuupv1URZA',
      projectId: 'wflcaapznpczlxjaeyfd',
      vercelAppUrl: 'https://akemisflow-g0doyamax-philippe-barthelemys-projects.vercel.app',
      checkInterval: 5 * 60 * 1000, // 5 minutes
      alertThresholds: {
        responseTime: 5000, // 5 seconds
        uptime: 0.95, // 95%
        errorRate: 0.05 // 5%
      },
      logFile: './logs/monitoring-agent.log',
      metricsFile: './logs/metrics.json'
    };
    
    this.metrics = {
      checks: 0,
      successes: 0,
      failures: 0,
      averageResponseTime: 0,
      uptime: 100,
      lastCheckTime: null,
      alerts: []
    };
    
    this.ensureDirectories();
    this.loadMetrics();
  }

  ensureDirectories() {
    ['./logs', './alerts'].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  loadMetrics() {
    try {
      if (fs.existsSync(this.config.metricsFile)) {
        const data = fs.readFileSync(this.config.metricsFile, 'utf8');
        this.metrics = { ...this.metrics, ...JSON.parse(data) };
      }
    } catch (error) {
      this.log(`Failed to load metrics: ${error.message}`, 'WARN');
    }
  }

  saveMetrics() {
    try {
      fs.writeFileSync(this.config.metricsFile, JSON.stringify(this.metrics, null, 2));
    } catch (error) {
      this.log(`Failed to save metrics: ${error.message}`, 'ERROR');
    }
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}`;
    console.log(logEntry);
    
    fs.appendFileSync(this.config.logFile, logEntry + '\n');
  }

  async makeRequest(hostname, path, method = 'GET', headers = {}, data = null) {
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const options = {
        hostname,
        port: 443,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'AkemisFlow-MonitoringAgent/1.0',
          ...headers
        },
        timeout: 10000 // 10 second timeout
      };

      const req = https.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => responseData += chunk);
        res.on('end', () => {
          const responseTime = Date.now() - startTime;
          try {
            const parsed = JSON.parse(responseData);
            resolve({ 
              status: res.statusCode, 
              data: parsed, 
              responseTime,
              headers: res.headers 
            });
          } catch (e) {
            resolve({ 
              status: res.statusCode, 
              data: responseData, 
              responseTime,
              headers: res.headers 
            });
          }
        });
      });

      req.on('error', (error) => {
        const responseTime = Date.now() - startTime;
        reject({ error, responseTime });
      });

      req.on('timeout', () => {
        req.destroy();
        const responseTime = Date.now() - startTime;
        reject({ error: new Error('Request timeout'), responseTime });
      });
      
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

      const isHealthy = result.status === 200 && result.data.status === 'ACTIVE_HEALTHY';
      
      return {
        service: 'Supabase',
        healthy: isHealthy,
        status: result.data?.status || 'unknown',
        responseTime: result.responseTime,
        details: {
          region: result.data?.region,
          version: result.data?.database?.version
        }
      };
    } catch (error) {
      return {
        service: 'Supabase',
        healthy: false,
        error: error.error?.message || error.message,
        responseTime: error.responseTime || 0
      };
    }
  }

  async checkVercelHealth() {
    try {
      const result = await this.makeRequest(
        'api.vercel.com',
        `/v9/projects/akemisflow?teamId=philippe-barthelemys-projects`,
        'GET',
        { 'Authorization': `Bearer ${this.config.vercelToken}` }
      );

      const isHealthy = result.status === 200;
      
      return {
        service: 'Vercel',
        healthy: isHealthy,
        responseTime: result.responseTime,
        details: {
          name: result.data?.name,
          framework: result.data?.framework,
          updatedAt: result.data?.updatedAt
        }
      };
    } catch (error) {
      return {
        service: 'Vercel',
        healthy: false,
        error: error.error?.message || error.message,
        responseTime: error.responseTime || 0
      };
    }
  }

  async checkApplicationHealth() {
    try {
      // Note: This will likely fail due to SSO protection, but we can measure response
      const result = await this.makeRequest(
        'akemisflow-g0doyamax-philippe-barthelemys-projects.vercel.app',
        '/api/health',
        'GET'
      );

      // Even a 401/403 means the app is running
      const isHealthy = result.status < 500;
      
      return {
        service: 'Application',
        healthy: isHealthy,
        statusCode: result.status,
        responseTime: result.responseTime,
        ssoProtected: result.status === 401 || result.status === 403
      };
    } catch (error) {
      return {
        service: 'Application',
        healthy: false,
        error: error.error?.message || error.message,
        responseTime: error.responseTime || 0
      };
    }
  }

  async performHealthCheck() {
    this.log('🔍 Starting comprehensive health check...');
    
    const checks = await Promise.allSettled([
      this.checkSupabaseHealth(),
      this.checkVercelHealth(),
      this.checkApplicationHealth()
    ]);

    const results = checks.map(check => 
      check.status === 'fulfilled' ? check.value : { 
        service: 'Unknown', 
        healthy: false, 
        error: check.reason 
      }
    );

    // Update metrics
    this.metrics.checks++;
    this.metrics.lastCheckTime = new Date().toISOString();
    
    const healthyServices = results.filter(r => r.healthy).length;
    const totalServices = results.length;
    const overallHealthy = healthyServices === totalServices;
    
    if (overallHealthy) {
      this.metrics.successes++;
    } else {
      this.metrics.failures++;
    }

    // Calculate uptime percentage
    this.metrics.uptime = (this.metrics.successes / this.metrics.checks) * 100;

    // Calculate average response time
    const responseTimes = results.filter(r => r.responseTime).map(r => r.responseTime);
    if (responseTimes.length > 0) {
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      this.metrics.averageResponseTime = avgResponseTime;
    }

    // Check for alerts
    await this.checkAlerts(results);

    this.saveMetrics();

    return {
      timestamp: this.metrics.lastCheckTime,
      overall: {
        healthy: overallHealthy,
        uptime: this.metrics.uptime,
        averageResponseTime: this.metrics.averageResponseTime
      },
      services: results,
      metrics: this.metrics
    };
  }

  async checkAlerts(results) {
    const alerts = [];

    // Check service failures
    results.forEach(result => {
      if (!result.healthy) {
        alerts.push({
          type: 'SERVICE_DOWN',
          service: result.service,
          message: `${result.service} is not responding: ${result.error}`,
          severity: 'HIGH',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Check response time
    if (this.metrics.averageResponseTime > this.config.alertThresholds.responseTime) {
      alerts.push({
        type: 'HIGH_RESPONSE_TIME',
        message: `Average response time (${this.metrics.averageResponseTime}ms) exceeds threshold (${this.config.alertThresholds.responseTime}ms)`,
        severity: 'MEDIUM',
        timestamp: new Date().toISOString()
      });
    }

    // Check uptime
    if (this.metrics.uptime < this.config.alertThresholds.uptime * 100) {
      alerts.push({
        type: 'LOW_UPTIME',
        message: `Uptime (${this.metrics.uptime.toFixed(2)}%) below threshold (${this.config.alertThresholds.uptime * 100}%)`,
        severity: 'HIGH',
        timestamp: new Date().toISOString()
      });
    }

    if (alerts.length > 0) {
      await this.handleAlerts(alerts);
    }

    return alerts;
  }

  async handleAlerts(alerts) {
    const alertFile = `./alerts/alert_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    
    try {
      fs.writeFileSync(alertFile, JSON.stringify(alerts, null, 2));
      
      alerts.forEach(alert => {
        this.log(`🚨 ALERT [${alert.severity}] ${alert.type}: ${alert.message}`, 'ALERT');
      });

      this.metrics.alerts.push(...alerts);
      
      // Keep only last 100 alerts
      if (this.metrics.alerts.length > 100) {
        this.metrics.alerts = this.metrics.alerts.slice(-100);
      }

    } catch (error) {
      this.log(`Failed to handle alerts: ${error.message}`, 'ERROR');
    }
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalChecks: this.metrics.checks,
        successRate: (this.metrics.successes / this.metrics.checks * 100).toFixed(2) + '%',
        uptime: this.metrics.uptime.toFixed(2) + '%',
        averageResponseTime: Math.round(this.metrics.averageResponseTime) + 'ms',
        lastCheck: this.metrics.lastCheckTime
      },
      recentAlerts: this.metrics.alerts.slice(-10),
      recommendations: this.generateRecommendations()
    };

    const reportFile = `./logs/monitoring_report_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    this.log('📊 Monitoring report generated');
    console.log(JSON.stringify(report, null, 2));
    
    return report;
  }

  generateRecommendations() {
    const recommendations = [];

    if (this.metrics.uptime < 99) {
      recommendations.push('Consider investigating frequent service interruptions');
    }

    if (this.metrics.averageResponseTime > 3000) {
      recommendations.push('High response times detected - consider performance optimization');
    }

    const recentAlerts = this.metrics.alerts.slice(-10);
    const criticalAlerts = recentAlerts.filter(a => a.severity === 'HIGH');
    
    if (criticalAlerts.length > 5) {
      recommendations.push('Multiple critical alerts - immediate investigation recommended');
    }

    if (recommendations.length === 0) {
      recommendations.push('All systems operating normally');
    }

    return recommendations;
  }

  async startContinuousMonitoring() {
    this.log('🚀 Starting continuous monitoring...');
    this.log(`📊 Check interval: ${this.config.checkInterval / 1000} seconds`);
    
    const performCheck = async () => {
      try {
        const result = await this.performHealthCheck();
        
        if (result.overall.healthy) {
          this.log('✅ All systems healthy');
        } else {
          this.log('⚠️ System issues detected', 'WARN');
        }
        
      } catch (error) {
        this.log(`❌ Monitoring check failed: ${error.message}`, 'ERROR');
      }
    };

    // Perform initial check
    await performCheck();

    // Schedule regular checks
    const interval = setInterval(performCheck, this.config.checkInterval);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      this.log('📴 Stopping monitoring agent...');
      clearInterval(interval);
      this.generateReport();
      process.exit(0);
    });

    this.log('✅ Continuous monitoring started. Press Ctrl+C to stop.');
  }

  async run(command = 'check') {
    this.log(`🚀 AkemisFlow Monitoring Agent starting: ${command}`);
    
    try {
      switch (command) {
        case 'check':
          return await this.performHealthCheck();
        case 'report':
          return this.generateReport();
        case 'monitor':
          return await this.startContinuousMonitoring();
        case 'alerts':
          return this.metrics.alerts.slice(-20); // Last 20 alerts
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
  const command = process.argv[2] || 'check';
  const agent = new AkemisFlowMonitoringAgent();
  
  agent.run(command).then(result => {
    if (command === 'monitor') {
      // Continuous monitoring doesn't return
      return;
    }
    
    if (result && typeof result === 'object') {
      console.log(JSON.stringify(result, null, 2));
    }
    
    process.exit(result ? 0 : 1);
  }).catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

module.exports = AkemisFlowMonitoringAgent;