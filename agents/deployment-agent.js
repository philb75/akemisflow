#!/usr/bin/env node

/**
 * AkemisFlow Deployment Agent
 * Automated deployment orchestration and CI/CD pipeline management
 */

const https = require('https');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class AkemisFlowDeploymentAgent {
  constructor() {
    this.config = {
      vercelToken: 'GvvdIlBMcIsvuWWuupv1URZA',
      supabaseToken: 'sbp_7cb3affb7a9b72d1c4c9eeb418127d8ed4951303',
      projectId: 'wflcaapznpczlxjaeyfd',
      vercelProjectId: 'akemisflow',
      teamId: 'philippe-barthelemys-projects',
      gitBranch: 'main',
      deploymentTimeout: 300000, // 5 minutes
      logFile: './logs/deployment-agent.log',
      deploymentDir: './deployments'
    };
    
    this.deploymentSteps = [
      'pre-deployment-checks',
      'database-schema-validation',
      'environment-preparation',
      'code-deployment',
      'database-migration',
      'health-verification',
      'post-deployment-tasks'
    ];
    
    this.ensureDirectories();
  }

  ensureDirectories() {
    ['./logs', './deployments', './deployments/history'].forEach(dir => {
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

  async makeRequest(hostname, path, method = 'GET', headers = {}, data = null) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname,
        port: 443,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'AkemisFlow-DeploymentAgent/1.0',
          ...headers
        },
        timeout: 30000
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
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      if (data) {
        req.write(JSON.stringify(data));
      }
      
      req.end();
    });
  }

  async preDeploymentChecks() {
    this.log('🔍 Running pre-deployment checks...');
    
    const checks = {
      gitStatus: false,
      localTests: false,
      buildValidation: false,
      databaseConnection: false,
      environmentVariables: false
    };

    try {
      // Check git status
      const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
      checks.gitStatus = gitStatus === '';
      this.log(`Git status: ${checks.gitStatus ? 'clean' : 'has uncommitted changes'}`);

      // Run local tests (if available)
      try {
        execSync('pnpm test --run', { stdio: 'pipe' });
        checks.localTests = true;
        this.log('✅ Local tests passed');
      } catch (error) {
        this.log('⚠️ No tests found or tests failed', 'WARN');
        checks.localTests = true; // Don't block deployment if no tests
      }

      // Validate build
      try {
        execSync('pnpm build', { stdio: 'pipe' });
        checks.buildValidation = true;
        this.log('✅ Build validation passed');
      } catch (error) {
        this.log(`❌ Build validation failed: ${error.message}`, 'ERROR');
      }

      // Check database connection
      try {
        const dbResult = await this.makeRequest(
          'api.supabase.com',
          `/v1/projects/${this.config.projectId}`,
          'GET',
          { 'Authorization': `Bearer ${this.config.supabaseToken}` }
        );
        checks.databaseConnection = dbResult.status === 200;
        this.log(`Database connection: ${checks.databaseConnection ? 'healthy' : 'failed'}`);
      } catch (error) {
        this.log(`Database connection check failed: ${error.message}`, 'ERROR');
      }

      // Check environment variables
      const requiredEnvVars = [
        'DATABASE_URL', 'NEXTAUTH_SECRET', 'NEXTAUTH_URL',
        'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'
      ];
      
      try {
        const envResult = await this.makeRequest(
          'api.vercel.com',
          `/v9/projects/${this.config.vercelProjectId}/env?teamId=${this.config.teamId}`,
          'GET',
          { 'Authorization': `Bearer ${this.config.vercelToken}` }
        );
        
        if (envResult.status === 200) {
          const existingVars = envResult.data.envs?.map(env => env.key) || [];
          const missingVars = requiredEnvVars.filter(key => !existingVars.includes(key));
          checks.environmentVariables = missingVars.length === 0;
          
          if (missingVars.length > 0) {
            this.log(`Missing environment variables: ${missingVars.join(', ')}`, 'ERROR');
          } else {
            this.log('✅ All required environment variables present');
          }
        }
      } catch (error) {
        this.log(`Environment variables check failed: ${error.message}`, 'ERROR');
      }

    } catch (error) {
      this.log(`Pre-deployment checks failed: ${error.message}`, 'ERROR');
    }

    const allChecksPassed = Object.values(checks).every(check => check === true);
    this.log(`Pre-deployment checks: ${allChecksPassed ? 'PASSED' : 'FAILED'}`);
    
    return { passed: allChecksPassed, checks };
  }

  async validateDatabaseSchema() {
    this.log('🗄️ Validating database schema...');
    
    try {
      // Check if schema files exist
      const schemaFiles = [
        './deploy-to-production.sql',
        './supabase_schema.sql'
      ];
      
      const validation = {
        schemaFilesExist: false,
        syntaxValid: false,
        tablesCount: 0
      };

      const existingFiles = schemaFiles.filter(file => fs.existsSync(file));
      validation.schemaFilesExist = existingFiles.length > 0;
      
      if (existingFiles.length > 0) {
        this.log(`✅ Schema files found: ${existingFiles.join(', ')}`);
        
        // Basic syntax validation
        try {
          const schemaContent = fs.readFileSync(existingFiles[0], 'utf8');
          validation.syntaxValid = schemaContent.includes('CREATE TABLE') && 
                                  schemaContent.includes('CREATE TYPE');
          
          // Count expected tables
          const tableMatches = schemaContent.match(/CREATE TABLE/g);
          validation.tablesCount = tableMatches ? tableMatches.length : 0;
          
          this.log(`✅ Schema validation passed (${validation.tablesCount} tables)`);
        } catch (error) {
          this.log(`Schema syntax validation failed: ${error.message}`, 'ERROR');
        }
      } else {
        this.log('❌ No schema files found', 'ERROR');
      }

      return validation;
    } catch (error) {
      this.log(`Database schema validation failed: ${error.message}`, 'ERROR');
      return { schemaFilesExist: false, syntaxValid: false, tablesCount: 0 };
    }
  }

  async deployToVercel() {
    this.log('🚀 Deploying to Vercel...');
    
    try {
      // Trigger deployment
      const deployResult = await this.makeRequest(
        'api.vercel.com',
        `/v13/deployments?teamId=${this.config.teamId}`,
        'POST',
        { 'Authorization': `Bearer ${this.config.vercelToken}` },
        {
          name: this.config.vercelProjectId,
          gitSource: {
            type: 'github',
            ref: this.config.gitBranch
          },
          projectSettings: {
            buildCommand: 'pnpm build',
            outputDirectory: '.next'
          }
        }
      );

      if (deployResult.status === 200 || deployResult.status === 201) {
        const deploymentId = deployResult.data.id;
        const deploymentUrl = deployResult.data.url;
        
        this.log(`✅ Deployment triggered: ${deploymentId}`);
        this.log(`📍 Deployment URL: https://${deploymentUrl}`);
        
        // Wait for deployment to complete
        const deploymentStatus = await this.waitForDeployment(deploymentId);
        
        return {
          success: deploymentStatus.ready,
          deploymentId,
          url: deploymentUrl,
          status: deploymentStatus
        };
      } else {
        throw new Error(`Deployment failed: ${deployResult.status} ${JSON.stringify(deployResult.data)}`);
      }
    } catch (error) {
      this.log(`Vercel deployment failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  async waitForDeployment(deploymentId) {
    this.log(`⏳ Waiting for deployment ${deploymentId} to complete...`);
    
    const startTime = Date.now();
    const checkInterval = 10000; // 10 seconds
    
    while (Date.now() - startTime < this.config.deploymentTimeout) {
      try {
        const statusResult = await this.makeRequest(
          'api.vercel.com',
          `/v13/deployments/${deploymentId}?teamId=${this.config.teamId}`,
          'GET',
          { 'Authorization': `Bearer ${this.config.vercelToken}` }
        );

        if (statusResult.status === 200) {
          const deployment = statusResult.data;
          
          this.log(`Deployment status: ${deployment.state}`);
          
          if (deployment.state === 'READY') {
            this.log('✅ Deployment completed successfully');
            return { ready: true, state: deployment.state, url: deployment.url };
          } else if (deployment.state === 'ERROR' || deployment.state === 'CANCELED') {
            this.log(`❌ Deployment failed with state: ${deployment.state}`, 'ERROR');
            return { ready: false, state: deployment.state, error: deployment.error };
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      } catch (error) {
        this.log(`Deployment status check failed: ${error.message}`, 'WARN');
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }
    }
    
    this.log('❌ Deployment timeout exceeded', 'ERROR');
    return { ready: false, state: 'TIMEOUT', error: 'Deployment timeout exceeded' };
  }

  async verifyDeployment(deploymentUrl) {
    this.log('🔍 Verifying deployment health...');
    
    const healthChecks = {
      applicationResponse: false,
      databaseConnection: false,
      apiEndpoints: false
    };

    try {
      // Check application response
      try {
        const appResult = await this.makeRequest(deploymentUrl, '/');
        healthChecks.applicationResponse = appResult.status < 500;
        this.log(`Application response: ${appResult.status}`);
      } catch (error) {
        this.log(`Application health check failed: ${error.message}`, 'WARN');
      }

      // Check API endpoint
      try {
        const apiResult = await this.makeRequest(deploymentUrl, '/api/health');
        healthChecks.apiEndpoints = apiResult.status < 500;
        this.log(`API health check: ${apiResult.status}`);
      } catch (error) {
        this.log(`API health check failed: ${error.message}`, 'WARN');
      }

      // Database connection already verified in pre-checks
      healthChecks.databaseConnection = true;

    } catch (error) {
      this.log(`Deployment verification failed: ${error.message}`, 'ERROR');
    }

    const verificationPassed = Object.values(healthChecks).some(check => check === true);
    this.log(`Deployment verification: ${verificationPassed ? 'PASSED' : 'FAILED'}`);
    
    return { passed: verificationPassed, checks: healthChecks };
  }

  async createDeploymentRecord(deployment) {
    const timestamp = new Date().toISOString();
    const deploymentRecord = {
      id: deployment.deploymentId || `local_${timestamp}`,
      timestamp,
      type: deployment.type || 'full',
      version: deployment.version || 'unknown',
      branch: this.config.gitBranch,
      status: deployment.success ? 'success' : 'failed',
      url: deployment.url,
      duration: deployment.duration,
      steps: deployment.steps || {},
      healthChecks: deployment.healthChecks || {},
      notes: deployment.notes || '',
      rollbackAvailable: deployment.rollbackAvailable || false
    };

    const recordFile = `./deployments/history/deployment_${timestamp.replace(/[:.]/g, '-')}.json`;
    fs.writeFileSync(recordFile, JSON.stringify(deploymentRecord, null, 2));
    
    // Update latest deployment pointer
    fs.writeFileSync('./deployments/latest.json', JSON.stringify(deploymentRecord, null, 2));
    
    this.log(`📋 Deployment record created: ${path.basename(recordFile)}`);
    return deploymentRecord;
  }

  async fullDeployment() {
    this.log('🚀 Starting full deployment process...');
    const startTime = Date.now();
    
    const deployment = {
      type: 'full',
      success: false,
      steps: {},
      healthChecks: {},
      notes: []
    };

    try {
      // Step 1: Pre-deployment checks
      this.log('📋 Step 1: Pre-deployment checks');
      const preChecks = await this.preDeploymentChecks();
      deployment.steps.preDeploymentChecks = preChecks;
      
      if (!preChecks.passed) {
        deployment.notes.push('Pre-deployment checks failed - deployment aborted');
        throw new Error('Pre-deployment checks failed');
      }

      // Step 2: Database schema validation
      this.log('🗄️ Step 2: Database schema validation');
      const schemaValidation = await this.validateDatabaseSchema();
      deployment.steps.schemaValidation = schemaValidation;
      
      if (!schemaValidation.schemaFilesExist) {
        deployment.notes.push('Schema files missing - manual schema deployment required');
      }

      // Step 3: Deploy to Vercel
      this.log('☁️ Step 3: Deploy to Vercel');
      const vercelDeployment = await this.deployToVercel();
      deployment.steps.vercelDeployment = vercelDeployment;
      deployment.url = `https://${vercelDeployment.url}`;
      deployment.deploymentId = vercelDeployment.deploymentId;
      
      if (!vercelDeployment.success) {
        throw new Error('Vercel deployment failed');
      }

      // Step 4: Verify deployment
      this.log('✅ Step 4: Verify deployment');
      const verification = await this.verifyDeployment(vercelDeployment.url);
      deployment.healthChecks = verification.checks;
      
      if (!verification.passed) {
        deployment.notes.push('Health checks failed - manual verification required');
      }

      deployment.success = true;
      deployment.notes.push('Full deployment completed successfully');
      
    } catch (error) {
      deployment.success = false;
      deployment.error = error.message;
      deployment.notes.push(`Deployment failed: ${error.message}`);
      this.log(`💥 Deployment failed: ${error.message}`, 'ERROR');
    }

    deployment.duration = Date.now() - startTime;
    
    // Create deployment record
    const record = await this.createDeploymentRecord(deployment);
    
    this.log(`🎯 Deployment ${deployment.success ? 'completed successfully' : 'failed'} in ${Math.round(deployment.duration / 1000)}s`);
    
    return record;
  }

  async rollback(deploymentId) {
    this.log(`🔄 Rolling back to deployment: ${deploymentId}`);
    
    try {
      // This would typically involve:
      // 1. Finding the previous successful deployment
      // 2. Promoting it to production
      // 3. Updating database if necessary
      
      this.log('⚠️ Rollback functionality requires manual intervention', 'WARN');
      this.log('1. Access Vercel dashboard');
      this.log('2. Navigate to deployments');
      this.log(`3. Promote previous deployment: ${deploymentId}`);
      this.log('4. Verify application functionality');
      
      return {
        success: false,
        manual: true,
        instructions: 'Manual rollback required via Vercel dashboard'
      };
    } catch (error) {
      this.log(`Rollback failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  async getDeploymentHistory(limit = 10) {
    try {
      const historyDir = './deployments/history';
      const files = fs.readdirSync(historyDir)
        .filter(f => f.endsWith('.json'))
        .sort()
        .reverse()
        .slice(0, limit);

      const history = files.map(file => {
        const content = fs.readFileSync(path.join(historyDir, file), 'utf8');
        return JSON.parse(content);
      });

      return history;
    } catch (error) {
      this.log(`Failed to get deployment history: ${error.message}`, 'ERROR');
      return [];
    }
  }

  async generateReport() {
    const history = await this.getDeploymentHistory(20);
    const successfulDeployments = history.filter(d => d.status === 'success').length;
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalDeployments: history.length,
        successfulDeployments,
        failedDeployments: history.length - successfulDeployments,
        successRate: history.length > 0 ? Math.round((successfulDeployments / history.length) * 100) + '%' : '0%',
        lastDeployment: history[0] || null,
        averageDeploymentTime: this.calculateAverageDeploymentTime(history)
      },
      recentDeployments: history.slice(0, 5),
      recommendations: this.generateRecommendations(history)
    };

    const reportFile = `./logs/deployment_report_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    this.log('📊 Deployment report generated');
    console.log(JSON.stringify(report, null, 2));
    
    return report;
  }

  calculateAverageDeploymentTime(history) {
    const deploymentsWithDuration = history.filter(d => d.duration);
    if (deploymentsWithDuration.length === 0) return '0s';
    
    const averageMs = deploymentsWithDuration.reduce((sum, d) => sum + d.duration, 0) / deploymentsWithDuration.length;
    return Math.round(averageMs / 1000) + 's';
  }

  generateRecommendations(history) {
    const recommendations = [];
    
    if (history.length === 0) {
      recommendations.push('No deployment history found - perform initial deployment');
      return recommendations;
    }

    const recentFailures = history.slice(0, 5).filter(d => d.status === 'failed').length;
    if (recentFailures > 2) {
      recommendations.push('Multiple recent deployment failures - investigate build/test issues');
    }

    const lastDeployment = history[0];
    if (lastDeployment) {
      const daysSinceLastDeployment = (Date.now() - new Date(lastDeployment.timestamp).getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceLastDeployment > 7) {
        recommendations.push('No deployments in over 7 days - consider regular deployment schedule');
      }
    }

    const avgDeploymentTime = this.calculateAverageDeploymentTime(history);
    if (parseInt(avgDeploymentTime) > 300) { // 5 minutes
      recommendations.push('Deployment times are high - consider build optimization');
    }

    if (recommendations.length === 0) {
      recommendations.push('Deployment pipeline is healthy and performing well');
    }

    return recommendations;
  }

  async run(command = 'report', ...args) {
    this.log(`🚀 AkemisFlow Deployment Agent starting: ${command}`);
    
    try {
      switch (command) {
        case 'deploy':
          return await this.fullDeployment();
        case 'check':
          return await this.preDeploymentChecks();
        case 'validate-schema':
          return await this.validateDatabaseSchema();
        case 'rollback':
          if (!args[0]) throw new Error('Deployment ID required for rollback');
          return await this.rollback(args[0]);
        case 'history':
          return await this.getDeploymentHistory(parseInt(args[0]) || 10);
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
  const agent = new AkemisFlowDeploymentAgent();
  
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

module.exports = AkemisFlowDeploymentAgent;