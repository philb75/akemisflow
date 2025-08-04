#!/usr/bin/env node

/**
 * AkemisFlow Startup Health Check
 * 
 * This script performs comprehensive pre-flight checks before starting the application
 * to ensure all dependencies and services are ready.
 */

const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')
const { promisify } = require('util')

const execAsync = promisify(exec)

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bright: '\x1b[1m'
}

// Logging utilities
const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  step: (msg) => console.log(`${colors.cyan}🔄${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bright}${colors.magenta}=== ${msg} ===${colors.reset}`)
}

// Load environment variables from .env.local if it exists
function loadEnvironmentVariables() {
  const envFiles = ['.env.local', '.env']
  
  for (const envFile of envFiles) {
    const envPath = path.join(process.cwd(), envFile)
    if (fs.existsSync(envPath)) {
      try {
        const envContent = fs.readFileSync(envPath, 'utf8')
        envContent.split('\n').forEach(line => {
          const trimmedLine = line.trim()
          if (trimmedLine && !trimmedLine.startsWith('#')) {
            const [key, ...valueParts] = trimmedLine.split('=')
            if (key && valueParts.length > 0) {
              const value = valueParts.join('=').replace(/^"(.*)"$/, '$1')
              if (!process.env[key]) {
                process.env[key] = value
              }
            }
          }
        })
        log.info(`Loaded environment from ${envFile}`)
        break
      } catch (error) {
        log.warning(`Could not load ${envFile}: ${error.message}`)
      }
    }
  }
}

// Load environment variables at startup
loadEnvironmentVariables()

class StartupChecker {
  constructor() {
    this.checks = []
    this.failures = []
    this.warnings = []
  }

  async checkNodeVersion() {
    log.step('Checking Node.js version...')
    
    try {
      const { stdout } = await execAsync('node --version')
      const version = stdout.trim()
      const majorVersion = parseInt(version.substring(1).split('.')[0])
      
      if (majorVersion >= 18) {
        log.success(`Node.js version: ${version}`)
        return true
      } else {
        log.error(`Node.js version ${version} is too old. Requires Node.js 18+`)
        this.failures.push('Node.js version requirement not met')
        return false
      }
    } catch (error) {
      log.error(`Failed to check Node.js version: ${error.message}`)
      this.failures.push('Could not verify Node.js version')
      return false
    }
  }

  async checkEnvironmentVariables() {
    log.step('Checking environment variables...')
    
    const required = [
      'DATABASE_URL',
      'NEXTAUTH_SECRET',
      'NEXTAUTH_URL'
    ]
    
    const optional = [
      'AIRWALLEX_CLIENT_ID',
      'AIRWALLEX_API_KEY',
      'AIRWALLEX_BASE_URL'
    ]
    
    let allRequired = true
    
    for (const envVar of required) {
      if (!process.env[envVar]) {
        log.error(`Missing required environment variable: ${envVar}`)
        this.failures.push(`Missing environment variable: ${envVar}`)
        allRequired = false
      } else {
        log.success(`${envVar}: configured`)
      }
    }
    
    for (const envVar of optional) {
      if (!process.env[envVar]) {
        log.warning(`Optional environment variable not set: ${envVar}`)
        this.warnings.push(`Optional variable missing: ${envVar}`)
      } else {
        log.success(`${envVar}: configured`)
      }
    }
    
    return allRequired
  }

  async checkDatabaseConnection() {
    log.step('Testing database connection...')
    
    if (!process.env.DATABASE_URL) {
      log.error('DATABASE_URL not configured')
      this.failures.push('Database URL not configured')
      return false
    }
    
    try {
      // Import Prisma client and test connection
      const { PrismaClient } = require('@prisma/client')
      const prisma = new PrismaClient()
      
      await prisma.$connect()
      await prisma.$queryRaw`SELECT 1 as test`
      await prisma.$disconnect()
      
      log.success('Database connection successful')
      return true
    } catch (error) {
      log.error(`Database connection failed: ${error.message}`)
      this.failures.push(`Database connection error: ${error.message}`)
      return false
    }
  }

  async checkDockerServices() {
    log.step('Checking Docker services...')
    
    try {
      // Check if Docker is running
      await execAsync('docker info')
      log.success('Docker is running')
      
      // Check if PostgreSQL container is running
      const { stdout } = await execAsync('docker ps --filter "name=akemisflow_postgres" --format "{{.Status}}"')
      
      if (stdout.includes('Up')) {
        log.success('PostgreSQL container is running')
        return true
      } else {
        log.warning('PostgreSQL container is not running')
        this.warnings.push('PostgreSQL container not running')
        return false
      }
    } catch (error) {
      log.warning(`Docker check failed: ${error.message}`)
      log.info('This is normal if not using Docker for development')
      this.warnings.push('Docker services not available')
      return false
    }
  }

  async checkFileSystemPermissions() {
    log.step('Checking file system permissions...')
    
    const directories = [
      path.join(process.cwd(), 'uploads'),
      path.join(process.cwd(), 'logs'),
      path.join(process.cwd(), '.next')
    ]
    
    let allGood = true
    
    for (const dir of directories) {
      try {
        // Create directory if it doesn't exist
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true })
          log.success(`Created directory: ${dir}`)
        }
        
        // Test write permissions
        const testFile = path.join(dir, '.write-test')
        fs.writeFileSync(testFile, 'test', 'utf8')
        fs.unlinkSync(testFile)
        
        log.success(`Write access confirmed: ${dir}`)
      } catch (error) {
        log.error(`Cannot write to directory ${dir}: ${error.message}`)
        this.failures.push(`File system permission error: ${dir}`)
        allGood = false
      }
    }
    
    return allGood
  }

  async checkDependencies() {
    log.step('Checking Node.js dependencies...')
    
    try {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')
      )
      
      // Check if node_modules exists
      const nodeModulesPath = path.join(process.cwd(), 'node_modules')
      if (!fs.existsSync(nodeModulesPath)) {
        log.error('node_modules directory not found. Run: npm install')
        this.failures.push('Dependencies not installed')
        return false
      }
      
      // Check critical dependencies
      const criticalDeps = ['next', '@prisma/client', 'prisma']
      let allPresent = true
      
      for (const dep of criticalDeps) {
        const depPath = path.join(nodeModulesPath, dep)
        if (!fs.existsSync(depPath)) {
          log.error(`Critical dependency missing: ${dep}`)
          this.failures.push(`Missing dependency: ${dep}`)
          allPresent = false
        } else {
          log.success(`Dependency found: ${dep}`)
        }
      }
      
      return allPresent
    } catch (error) {
      log.error(`Error checking dependencies: ${error.message}`)
      this.failures.push('Could not verify dependencies')
      return false
    }
  }

  async checkPrismaSchema() {
    log.step('Checking Prisma schema...')
    
    try {
      const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma')
      
      if (!fs.existsSync(schemaPath)) {
        log.error('Prisma schema file not found')
        this.failures.push('Prisma schema missing')
        return false
      }
      
      // Check if Prisma client is generated
      const clientPath = path.join(process.cwd(), 'node_modules', '.prisma', 'client')
      if (!fs.existsSync(clientPath)) {
        log.warning('Prisma client not generated. Run: npx prisma generate')
        this.warnings.push('Prisma client needs generation')
      } else {
        log.success('Prisma client is generated')
      }
      
      log.success('Prisma schema found')
      return true
    } catch (error) {
      log.error(`Error checking Prisma schema: ${error.message}`)
      this.failures.push('Prisma schema verification failed')
      return false
    }
  }

  async checkPortAvailability() {
    log.step('Checking port availability...')
    
    const ports = [3000, 5432] // App port and PostgreSQL port
    let allAvailable = true
    
    for (const port of ports) {
      try {
        const { stdout } = await execAsync(`lsof -i :${port} | grep LISTEN`)
        if (stdout.trim()) {
          if (port === 3000) {
            log.warning(`Port ${port} is already in use`)
            this.warnings.push(`Port ${port} occupied`)
          } else {
            log.success(`Port ${port} is in use (expected for services)`)
          }
        } else {
          log.success(`Port ${port} is available`)
        }
      } catch (error) {
        // lsof returns error code when no processes found (port is free)
        log.success(`Port ${port} is available`)
      }
    }
    
    return allAvailable
  }

  async runAllChecks() {
    log.header('AkemisFlow Startup Health Check')
    
    const checks = [
      { name: 'Node.js Version', fn: () => this.checkNodeVersion() },
      { name: 'Environment Variables', fn: () => this.checkEnvironmentVariables() },
      { name: 'Dependencies', fn: () => this.checkDependencies() },
      { name: 'Prisma Schema', fn: () => this.checkPrismaSchema() },
      { name: 'File System Permissions', fn: () => this.checkFileSystemPermissions() },
      { name: 'Database Connection', fn: () => this.checkDatabaseConnection() },
      { name: 'Docker Services', fn: () => this.checkDockerServices() },
      { name: 'Port Availability', fn: () => this.checkPortAvailability() }
    ]
    
    const results = []
    
    for (const check of checks) {
      try {
        const result = await check.fn()
        results.push({ name: check.name, success: result })
      } catch (error) {
        log.error(`Check "${check.name}" threw an error: ${error.message}`)
        results.push({ name: check.name, success: false })
        this.failures.push(`${check.name}: ${error.message}`)
      }
    }
    
    return this.generateReport(results)
  }

  generateReport(results) {
    log.header('Startup Check Report')
    
    const successful = results.filter(r => r.success).length
    const total = results.length
    
    if (this.failures.length === 0) {
      log.success(`All critical checks passed (${successful}/${total})`)
      
      if (this.warnings.length > 0) {
        log.header('Warnings')
        this.warnings.forEach(warning => log.warning(warning))
        console.log(`\n${colors.yellow}⚠️ Application can start but some features may be limited${colors.reset}`)
      } else {
        console.log(`\n${colors.green}🚀 System is ready! You can start the application.${colors.reset}`)
      }
      
      return true
    } else {
      log.error(`${this.failures.length} critical issues found`)
      
      log.header('Critical Issues')
      this.failures.forEach(failure => log.error(failure))
      
      if (this.warnings.length > 0) {
        log.header('Warnings')
        this.warnings.forEach(warning => log.warning(warning))
      }
      
      console.log(`\n${colors.red}🛑 Please fix the critical issues before starting the application.${colors.reset}`)
      return false
    }
  }
}

// Run the startup check
async function main() {
  const checker = new StartupChecker()
  const success = await checker.runAllChecks()
  
  process.exit(success ? 0 : 1)
}

// Handle unhandled errors
process.on('unhandledRejection', (reason, promise) => {
  log.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`)
  process.exit(1)
})

process.on('uncaughtException', (error) => {
  log.error(`Uncaught Exception: ${error.message}`)
  process.exit(1)
})

if (require.main === module) {
  main()
}

module.exports = { StartupChecker }