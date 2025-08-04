#!/usr/bin/env node

/**
 * Enhanced Development Startup Script
 * 
 * This script provides a robust development startup experience with:
 * - Pre-flight health checks
 * - Automatic dependency installation
 * - Service startup coordination
 * - Real-time monitoring
 * - Graceful error handling
 */

const fs = require('fs')
const path = require('path')
const { spawn, exec } = require('child_process')
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
  header: (msg) => console.log(`\n${colors.bright}${colors.magenta}=== ${msg} ===${colors.reset}`),
  dev: (msg) => console.log(`${colors.cyan}[DEV]${colors.reset} ${msg}`)
}

class DevServer {
  constructor(options = {}) {
    this.options = {
      port: options.port || 3000,
      checkHealth: options.checkHealth !== false,
      autoRestart: options.autoRestart !== false,
      logFile: options.logFile || path.join(process.cwd(), 'logs', 'dev-server.log'),
      maxRestarts: options.maxRestarts || 3,
      restartDelay: options.restartDelay || 5000
    }
    
    this.restartCount = 0
    this.serverProcess = null
    this.isShuttingDown = false
    this.healthCheckInterval = null
    
    // Ensure logs directory exists
    const logsDir = path.dirname(this.options.logFile)
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true })
    }
  }

  async runPreflightChecks() {
    log.header('Running Pre-flight Checks')
    
    try {
      const { StartupChecker } = require('./startup-check.js')
      const checker = new StartupChecker()
      
      const success = await checker.runAllChecks()
      
      if (!success) {
        log.error('Pre-flight checks failed. Please fix the issues above.')
        return false
      }
      
      log.success('All pre-flight checks passed')
      return true
    } catch (error) {
      log.error(`Pre-flight check error: ${error.message}`)
      return false
    }
  }

  async installDependencies() {
    log.step('Checking if dependencies need installation...')
    
    const nodeModulesPath = path.join(process.cwd(), 'node_modules')
    const packageJsonPath = path.join(process.cwd(), 'package.json')
    const packageLockPath = path.join(process.cwd(), 'package-lock.json')
    
    // Check if we need to install
    let needsInstall = false
    
    if (!fs.existsSync(nodeModulesPath)) {
      needsInstall = true
      log.step('node_modules not found, installing dependencies...')
    } else {
      // Check if package.json is newer than node_modules
      try {
        const packageStats = fs.statSync(packageJsonPath)
        const nodeModulesStats = fs.statSync(nodeModulesPath)
        
        if (packageStats.mtime > nodeModulesStats.mtime) {
          needsInstall = true
          log.step('package.json is newer than node_modules, reinstalling dependencies...')
        }
      } catch (error) {
        needsInstall = true
        log.step('Could not compare timestamps, installing dependencies...')
      }
    }
    
    if (needsInstall) {
      try {
        log.step('Running npm install...')
        const { stdout, stderr } = await execAsync('npm install', { 
          cwd: process.cwd(),
          env: { ...process.env, NODE_ENV: 'development' }
        })
        
        if (stderr && !stderr.includes('npm WARN')) {
          log.warning(`npm install warnings: ${stderr}`)
        }
        
        log.success('Dependencies installed successfully')
      } catch (error) {
        log.error(`Failed to install dependencies: ${error.message}`)
        throw error
      }
    } else {
      log.success('Dependencies are up to date')
    }
  }

  async generatePrismaClient() {
    log.step('Checking Prisma client...')
    
    try {
      const clientPath = path.join(process.cwd(), 'node_modules', '.prisma', 'client')
      const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma')
      
      let needsGeneration = false
      
      if (!fs.existsSync(clientPath)) {
        needsGeneration = true
        log.step('Prisma client not found, generating...')
      } else {
        // Check if schema is newer than generated client
        try {
          const schemaStats = fs.statSync(schemaPath)
          const clientStats = fs.statSync(clientPath)
          
          if (schemaStats.mtime > clientStats.mtime) {
            needsGeneration = true
            log.step('Schema is newer than client, regenerating...')
          }
        } catch (error) {
          needsGeneration = true
          log.step('Could not compare timestamps, regenerating Prisma client...')
        }
      }
      
      if (needsGeneration) {
        const { stdout, stderr } = await execAsync('npx prisma generate')
        
        if (stderr) {
          log.warning(`Prisma generate warnings: ${stderr}`)
        }
        
        log.success('Prisma client generated successfully')
      } else {
        log.success('Prisma client is up to date')
      }
    } catch (error) {
      log.error(`Failed to generate Prisma client: ${error.message}`)
      throw error
    }
  }

  async startDockerServices() {
    log.step('Checking Docker services...')
    
    try {
      // Check if Docker is available
      await execAsync('docker info')
      
      // Check if services are already running
      const { stdout } = await execAsync('docker ps --filter "name=akemisflow_postgres" --format "{{.Status}}"')
      
      if (stdout.includes('Up')) {
        log.success('Docker services are already running')
        return
      }
      
      log.step('Starting Docker services...')
      await execAsync('docker-compose up -d')
      
      // Wait for PostgreSQL to be ready
      log.step('Waiting for PostgreSQL to be ready...')
      
      let retries = 30
      while (retries > 0) {
        try {
          await execAsync('docker-compose exec -T postgres pg_isready -U akemisflow -d akemisflow_dev')
          break
        } catch (error) {
          retries--
          if (retries === 0) {
            throw new Error('PostgreSQL failed to start within timeout')
          }
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
      
      log.success('Docker services started successfully')
    } catch (error) {
      log.warning(`Docker services not available: ${error.message}`)
      log.info('Continuing without Docker (using external database)')
    }
  }

  createLogStream() {
    return fs.createWriteStream(this.options.logFile, { flags: 'a' })
  }

  async startNextServer() {
    log.header('Starting Next.js Development Server')
    
    return new Promise((resolve, reject) => {
      const env = {
        ...process.env,
        AKEMIS_ENV: 'local',
        NODE_ENV: 'development',
        FORCE_COLOR: '1'
      }
      
      const args = ['run', 'dev']
      
      log.step(`Starting: npm ${args.join(' ')}`)
      
      this.serverProcess = spawn('npm', args, {
        cwd: process.cwd(),
        env,
        stdio: ['pipe', 'pipe', 'pipe']
      })
      
      const logStream = this.createLogStream()
      
      // Log startup
      const startupMsg = `\n=== Server started at ${new Date().toISOString()} ===\n`
      logStream.write(startupMsg)
      console.log(startupMsg.trim())
      
      let hasStarted = false
      let startupTimeout = null
      
      // Set startup timeout
      startupTimeout = setTimeout(() => {
        if (!hasStarted) {
          log.error('Server startup timeout (30 seconds)')
          this.killServer()
          reject(new Error('Startup timeout'))
        }
      }, 30000)
      
      // Handle stdout
      this.serverProcess.stdout.on('data', (data) => {
        const output = data.toString()
        process.stdout.write(output)
        logStream.write(output)
        
        // Check for successful startup
        if (output.includes('Ready in') || output.includes('started server')) {
          if (!hasStarted) {
            hasStarted = true
            clearTimeout(startupTimeout)
            log.success('Next.js server started successfully')
            this.startHealthChecks()
            resolve()
          }
        }
        
        // Check for errors
        if (output.includes('Error:') || output.includes('TypeError:')) {
          logStream.write(`ERROR: ${output}`)
        }
      })
      
      // Handle stderr
      this.serverProcess.stderr.on('data', (data) => {
        const output = data.toString()
        
        // Skip common Next.js warnings that aren't critical
        if (!output.includes('Warning: Found multiple lockfiles') && 
            !output.includes('npm WARN')) {
          process.stderr.write(output)
        }
        
        logStream.write(`STDERR: ${output}`)
      })
      
      // Handle process exit
      this.serverProcess.on('exit', (code, signal) => {
        clearTimeout(startupTimeout)
        logStream.write(`\n=== Server exited with code ${code}, signal ${signal} at ${new Date().toISOString()} ===\n`)
        
        if (!this.isShuttingDown) {
          if (code === 0) {
            log.info('Server exited gracefully')
          } else {
            log.error(`Server exited with code ${code}`)
            
            if (this.options.autoRestart && this.restartCount < this.options.maxRestarts) {
              this.scheduleRestart()
            } else {
              log.error('Maximum restart attempts reached or auto-restart disabled')
              process.exit(1)
            }
          }
        }
        
        logStream.end()
      })
      
      // Handle process errors
      this.serverProcess.on('error', (error) => {
        clearTimeout(startupTimeout)
        log.error(`Server process error: ${error.message}`)
        logStream.write(`ERROR: ${error.message}\n`)
        logStream.end()
        
        if (!hasStarted) {
          reject(error)
        }
      })
    })
  }

  scheduleRestart() {
    this.restartCount++
    log.warning(`Scheduling restart ${this.restartCount}/${this.options.maxRestarts} in ${this.options.restartDelay}ms`)
    
    setTimeout(() => {
      if (!this.isShuttingDown) {
        log.step('Attempting to restart server...')
        this.startNextServer().catch((error) => {
          log.error(`Restart failed: ${error.message}`)
          process.exit(1)
        })
      }
    }, this.options.restartDelay)
  }

  async startHealthChecks() {
    if (!this.options.checkHealth) return
    
    log.step('Starting health monitoring...')
    
    this.healthCheckInterval = setInterval(async () => {
      try {
        const response = await fetch(`http://localhost:${this.options.port}/api/health`)
        if (!response.ok) {
          log.warning(`Health check failed: ${response.status}`)
        }
      } catch (error) {
        // Don't log every health check failure to avoid spam
        // Health checks will naturally fail during restarts
      }
    }, 30000) // Check every 30 seconds
  }

  killServer() {
    if (this.serverProcess && !this.serverProcess.killed) {
      log.step('Stopping server...')
      this.serverProcess.kill('SIGTERM')
      
      // Force kill after 5 seconds
      setTimeout(() => {
        if (this.serverProcess && !this.serverProcess.killed) {
          log.warning('Force killing server...')
          this.serverProcess.kill('SIGKILL')
        }
      }, 5000)
    }
  }

  async shutdown() {
    this.isShuttingDown = true
    
    log.step('Shutting down development server...')
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }
    
    this.killServer()
    
    // Give process time to exit gracefully
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    log.success('Development server shutdown complete')
  }

  async start() {
    try {
      log.header('AkemisFlow Development Server')
      
      // Run pre-flight checks
      if (this.options.checkHealth) {
        const checksPass = await this.runPreflightChecks()
        if (!checksPass) {
          process.exit(1)
        }
      }
      
      // Setup development environment
      await this.installDependencies()
      await this.generatePrismaClient()
      await this.startDockerServices()
      
      // Start the server
      await this.startNextServer()
      
      log.success(`Development server is running on http://localhost:${this.options.port}`)
      log.info(`Logs are being written to: ${this.options.logFile}`)
      log.info('Press Ctrl+C to stop the server')
      
    } catch (error) {
      log.error(`Failed to start development server: ${error.message}`)
      process.exit(1)
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nReceived SIGINT, shutting down gracefully...')
  if (global.devServer) {
    await global.devServer.shutdown()
  }
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('\nReceived SIGTERM, shutting down gracefully...')
  if (global.devServer) {
    await global.devServer.shutdown()
  }
  process.exit(0)
})

// Parse command line arguments
const args = process.argv.slice(2)
const options = {}

args.forEach(arg => {
  if (arg.startsWith('--port=')) {
    options.port = parseInt(arg.split('=')[1])
  } else if (arg === '--no-health-check') {
    options.checkHealth = false
  } else if (arg === '--no-auto-restart') {
    options.autoRestart = false
  }
})

// Start the development server
async function main() {
  const devServer = new DevServer(options)
  global.devServer = devServer
  
  await devServer.start()
}

if (require.main === module) {
  main()
}

module.exports = { DevServer }