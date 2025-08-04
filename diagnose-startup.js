#!/usr/bin/env node

/**
 * AkemisFlow Startup Diagnosis and Fix Script
 * 
 * This script identifies why the application fails to start properly
 * and provides actionable fixes for recurrent startup issues.
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');

console.log('🔍 AkemisFlow Startup Diagnosis\n');

class StartupDiagnostic {
    constructor() {
        this.issues = [];
        this.fixes = [];
        this.logs = [];
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = type === 'error' ? '❌' : type === 'warn' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
        const logMessage = `${prefix} ${message}`;
        console.log(logMessage);
        this.logs.push(`[${timestamp}] ${type.toUpperCase()}: ${message}`);
    }

    addIssue(issue, fix) {
        this.issues.push(issue);
        this.fixes.push(fix);
        this.log(`Issue identified: ${issue}`, 'warn');
        this.log(`Suggested fix: ${fix}`, 'info');
    }

    async checkPortAvailability(port) {
        return new Promise((resolve) => {
            const server = net.createServer();
            server.listen(port, () => {
                server.close();
                resolve(true);
            });
            server.on('error', () => {
                resolve(false);
            });
        });
    }

    async checkProcesses() {
        this.log('Checking for running processes...');
        
        return new Promise((resolve) => {
            exec('ps aux | grep -E "(next|dev)" | grep -v grep', (error, stdout) => {
                if (stdout.trim()) {
                    this.log(`Found running processes:\n${stdout}`, 'warn');
                    this.addIssue(
                        'Previous Next.js processes may be running',
                        'Kill existing processes: pkill -f "next dev"'
                    );
                } else {
                    this.log('No conflicting processes found', 'success');
                }
                resolve();
            });
        });
    }

    async checkPorts() {
        this.log('Checking port availability...');
        
        const ports = [3000, 3001, 3002];
        for (const port of ports) {
            const available = await this.checkPortAvailability(port);
            if (!available) {
                this.log(`Port ${port} is in use`, 'warn');
                this.addIssue(
                    `Port ${port} is occupied`,
                    `Kill process using port: lsof -ti :${port} | xargs kill`
                );
            } else {
                this.log(`Port ${port} is available`, 'success');
            }
        }
    }

    async checkDockerServices() {
        this.log('Checking Docker services...');
        
        return new Promise((resolve) => {
            exec('docker-compose ps', (error, stdout) => {
                if (error) {
                    this.addIssue(
                        'Docker is not running or docker-compose is not available',
                        'Start Docker and run: docker-compose up -d'
                    );
                } else {
                    const isPostgresUp = stdout.includes('postgres') && stdout.includes('Up');
                    const isRedisUp = stdout.includes('redis') && stdout.includes('Up');
                    
                    if (!isPostgresUp) {
                        this.addIssue(
                            'PostgreSQL container is not running',
                            'Start PostgreSQL: docker-compose up -d postgres'
                        );
                    } else {
                        this.log('PostgreSQL container is running', 'success');
                    }
                    
                    if (!isRedisUp) {
                        this.addIssue(
                            'Redis container is not running',
                            'Start Redis: docker-compose up -d redis'
                        );
                    } else {
                        this.log('Redis container is running', 'success');
                    }
                }
                resolve();
            });
        });
    }

    async checkEnvironmentFiles() {
        this.log('Checking environment configuration...');
        
        const envFiles = ['.env.local', '.env'];
        let hasValidEnv = false;
        
        for (const envFile of envFiles) {
            if (fs.existsSync(envFile)) {
                this.log(`Found ${envFile}`, 'success');
                
                const content = fs.readFileSync(envFile, 'utf8');
                const requiredVars = ['DATABASE_URL', 'NEXTAUTH_SECRET', 'NEXTAUTH_URL'];
                
                for (const varName of requiredVars) {
                    if (content.includes(`${varName}=`)) {
                        this.log(`${varName} is configured`, 'success');
                        hasValidEnv = true;
                    } else {
                        this.addIssue(
                            `Missing environment variable: ${varName}`,
                            `Add ${varName} to ${envFile}`
                        );
                    }
                }
            } else {
                this.log(`${envFile} not found`, 'warn');
            }
        }
        
        if (!hasValidEnv) {
            this.addIssue(
                'No valid environment configuration found',
                'Create .env.local with required variables'
            );
        }
    }

    async checkDatabaseConnection() {
        this.log('Testing database connection...');
        
        return new Promise((resolve) => {
            exec('node -e "const { PrismaClient } = require(\'@prisma/client\'); const prisma = new PrismaClient(); prisma.$connect().then(() => { console.log(\'DB_OK\'); prisma.$disconnect(); }).catch(e => { console.log(\'DB_ERROR:\', e.message); });"', 
                (error, stdout) => {
                    if (stdout.includes('DB_OK')) {
                        this.log('Database connection successful', 'success');
                    } else {
                        this.addIssue(
                            'Database connection failed',
                            'Check DATABASE_URL and ensure PostgreSQL is running'
                        );
                        this.log(`Database error: ${stdout}`, 'error');
                    }
                    resolve();
                });
        });
    }

    async checkFilePermissions() {
        this.log('Checking file permissions...');
        
        const directories = ['uploads', 'logs', '.next'];
        
        for (const dir of directories) {
            try {
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                
                // Test write access
                const testFile = path.join(dir, '.write-test');
                fs.writeFileSync(testFile, 'test');
                fs.unlinkSync(testFile);
                
                this.log(`${dir}/ directory is writable`, 'success');
            } catch (error) {
                this.addIssue(
                    `Cannot write to ${dir}/ directory`,
                    `Fix permissions: chmod 755 ${dir}`
                );
            }
        }
    }

    async checkNodeModules() {
        this.log('Checking node modules...');
        
        if (!fs.existsSync('node_modules')) {
            this.addIssue(
                'node_modules directory missing',
                'Install dependencies: npm install'
            );
        } else {
            const criticalPackages = ['next', '@prisma/client', 'prisma'];
            for (const pkg of criticalPackages) {
                if (!fs.existsSync(`node_modules/${pkg}`)) {
                    this.addIssue(
                        `Missing critical package: ${pkg}`,
                        'Reinstall dependencies: npm install'
                    );
                } else {
                    this.log(`${pkg} is installed`, 'success');
                }
            }
        }
    }

    async testStartupProcess() {
        this.log('Testing Next.js startup process...');
        
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                this.addIssue(
                    'Next.js takes too long to start',
                    'Check for TypeScript errors or infinite loops in middleware'
                );
                process.kill(-child.pid);
                resolve();
            }, 15000);
            
            const child = spawn('npm', ['run', 'dev', '--', '-p', '3001'], {
                detached: true,
                stdio: 'pipe',
                env: { ...process.env, AKEMIS_ENV: 'local' }
            });
            
            let startupOutput = '';
            let hasReady = false;
            
            child.stdout.on('data', (data) => {
                startupOutput += data.toString();
                if (data.toString().includes('Ready in')) {
                    hasReady = true;
                    this.log('Next.js startup completed successfully', 'success');
                    clearTimeout(timeout);
                    
                    // Test connectivity
                    setTimeout(() => {
                        this.testConnectivity(3001).then(() => {
                            process.kill(-child.pid);
                            resolve();
                        });
                    }, 2000);
                }
            });
            
            child.stderr.on('data', (data) => {
                const error = data.toString();
                if (error.includes('EADDRINUSE')) {
                    this.addIssue(
                        'Port already in use',
                        'Kill processes using the port or use a different port'
                    );
                } else if (error.includes('Error:')) {
                    this.addIssue(
                        'Next.js startup error',
                        `Fix the error: ${error.trim()}`
                    );
                }
                startupOutput += error;
            });
            
            child.on('exit', (code) => {
                if (!hasReady) {
                    this.addIssue(
                        'Next.js process exited before becoming ready',
                        'Check startup logs for errors'
                    );
                    this.log(`Startup output:\n${startupOutput}`, 'error');
                }
                clearTimeout(timeout);
                resolve();
            });
        });
    }

    async testConnectivity(port = 3000) {
        this.log(`Testing HTTP connectivity on port ${port}...`);
        
        return new Promise((resolve) => {
            const { exec } = require('child_process');
            exec(`curl -s -o /dev/null -w "%{http_code}" http://localhost:${port}/api/health`, 
                (error, stdout) => {
                    if (stdout.trim() === '200') {
                        this.log('HTTP connectivity test passed', 'success');
                    } else {
                        this.addIssue(
                            'HTTP server not responding properly',
                            'Check if the server process is actually listening on the port'
                        );
                    }
                    resolve();
                });
        });
    }

    async generateReport() {
        const reportPath = 'startup-diagnosis-report.txt';
        const report = [
            '=== AkemisFlow Startup Diagnosis Report ===',
            `Generated: ${new Date().toISOString()}`,
            '',
            '=== Issues Found ===',
            ...this.issues.map((issue, i) => `${i + 1}. ${issue}`),
            '',
            '=== Recommended Fixes ===',
            ...this.fixes.map((fix, i) => `${i + 1}. ${fix}`),
            '',
            '=== Detailed Logs ===',
            ...this.logs,
            ''
        ].join('\n');
        
        fs.writeFileSync(reportPath, report);
        this.log(`Diagnosis report saved to: ${reportPath}`, 'success');
    }

    async run() {
        try {
            await this.checkProcesses();
            await this.checkPorts();
            await this.checkDockerServices();
            await this.checkEnvironmentFiles();
            await this.checkDatabaseConnection();
            await this.checkFilePermissions();
            await this.checkNodeModules();
            await this.testStartupProcess();
            
            console.log('\n=== Diagnosis Summary ===');
            if (this.issues.length === 0) {
                this.log('No issues found! The application should start properly.', 'success');
            } else {
                this.log(`Found ${this.issues.length} issue(s) that may prevent proper startup:`, 'warn');
                this.issues.forEach((issue, i) => {
                    console.log(`  ${i + 1}. ${issue}`);
                });
                
                console.log('\n=== Quick Fix Commands ===');
                this.fixes.forEach((fix, i) => {
                    console.log(`  ${i + 1}. ${fix}`);
                });
            }
            
            await this.generateReport();
            
        } catch (error) {
            this.log(`Diagnosis failed: ${error.message}`, 'error');
        }
    }
}

// Run the diagnostic
const diagnostic = new StartupDiagnostic();
diagnostic.run().catch(console.error);