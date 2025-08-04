/**
 * Adaptive Logger for All Deployment Modes
 * 
 * Automatically adapts to:
 * 1. Local Server + Prisma + Local DB
 * 2. Local Server + Supabase + Filesystem  
 * 3. Vercel Server + Supabase (Edge Runtime)
 */

import environmentDetector from '@/lib/environment'

// Conditional imports for Node.js environments
let fs: any = null
let path: any = null

if (environmentDetector.canUseFileSystem()) {
  try {
    fs = require('fs')
    path = require('path')
  } catch (error) {
    // File system not available
  }
}

export enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG'
}

export interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  category?: string
  metadata?: Record<string, any>
  stack?: string
  requestId?: string
  environment: {
    mode: string
    runtime: string
  }
}

class AdaptiveLogger {
  private isDevelopment: boolean
  private logsDir: string
  private maxFileSize: number = 10 * 1024 * 1024 // 10MB
  private maxFiles: number = 5
  private config: any

  constructor() {
    this.config = environmentDetector.getConfig()
    this.isDevelopment = this.config.logging.level === 'debug'
    
    // Set logs directory based on environment
    if (environmentDetector.canUseFileSystem() && path) {
      try {
        this.logsDir = path.join(process.cwd(), 'logs')
        this.ensureLogsDirectory()
      } catch (error) {
        this.logsDir = '/tmp/logs'
      }
    } else {
      this.logsDir = '/tmp/logs'
    }
  }

  private ensureLogsDirectory(): void {
    if (environmentDetector.canUseFileSystem() && fs) {
      try {
        if (!fs.existsSync(this.logsDir)) {
          fs.mkdirSync(this.logsDir, { recursive: true })
        }
      } catch (error) {
        // Silently fail - logging continues to console
      }
    }
  }

  private formatMessage(entry: LogEntry): string {
    const { timestamp, level, message, category, metadata, stack, requestId, environment } = entry
    
    let formatted = `[${timestamp}] ${level}`
    
    if (requestId) {
      formatted += ` [${requestId}]`
    }
    
    if (category) {
      formatted += ` [${category}]`
    }
    
    formatted += `: ${message}`
    
    if (metadata && Object.keys(metadata).length > 0) {
      formatted += `\n  Metadata: ${JSON.stringify(metadata, null, 2)}`
    }
    
    if (stack) {
      formatted += `\n  Stack: ${stack}`
    }
    
    // Add environment info in development
    if (this.isDevelopment) {
      formatted += `\n  Environment: ${environment.mode} (${environment.runtime})`
    }
    
    return formatted
  }

  private writeToFile(entry: LogEntry): void {
    if (!environmentDetector.shouldLogToFile() || !fs || !path) return

    try {
      const filename = `app-${new Date().toISOString().split('T')[0]}.log`
      const filepath = path.join(this.logsDir, filename)
      const logLine = this.formatMessage(entry) + '\n'

      // Check file size and rotate if necessary
      if (fs.existsSync(filepath)) {
        const stats = fs.statSync(filepath)
        if (stats.size > this.maxFileSize) {
          this.rotateLogFile(filepath)
        }
      }

      fs.appendFileSync(filepath, logLine, 'utf8')
    } catch (error) {
      // Silently fail - logging continues to console
    }
  }

  private rotateLogFile(filepath: string): void {
    if (!environmentDetector.shouldLogToFile() || !fs || !path) return
    
    try {
      const dir = path.dirname(filepath)
      const basename = path.basename(filepath, '.log')
      
      // Remove oldest rotated files
      for (let i = this.maxFiles; i >= 1; i--) {
        const oldFile = path.join(dir, `${basename}.${i}.log`)
        if (fs.existsSync(oldFile)) {
          if (i === this.maxFiles) {
            fs.unlinkSync(oldFile)
          } else {
            fs.renameSync(oldFile, path.join(dir, `${basename}.${i + 1}.log`))
          }
        }
      }
      
      // Rename current file to .1
      fs.renameSync(filepath, path.join(dir, `${basename}.1.log`))
    } catch (error) {
      // Silently fail - logging continues to console
    }
  }

  private log(level: LogLevel, message: string, options: {
    category?: string
    metadata?: Record<string, any>
    error?: Error
    requestId?: string
  } = {}): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      category: options.category,
      metadata: options.metadata,
      stack: options.error?.stack,
      requestId: options.requestId,
      environment: {
        mode: environmentDetector.getMode(),
        runtime: environmentDetector.getRuntimeEnvironment()
      }
    }

    // Always log to console if enabled
    if (this.config.logging.console) {
      const consoleMethod = level === LogLevel.ERROR ? console.error :
                           level === LogLevel.WARN ? console.warn :
                           console.log

      consoleMethod(this.formatMessage(entry))
    }

    // Write to file if supported
    if (this.config.logging.file) {
      this.writeToFile(entry)
    }

    // In Vercel/production, also send to external logging service if configured
    if (environmentDetector.isVercelMode() && process.env.LOGGING_WEBHOOK_URL) {
      this.sendToExternalService(entry).catch(() => {
        // Silently fail - don't break application flow
      })
    }
  }

  private async sendToExternalService(entry: LogEntry): Promise<void> {
    if (!process.env.LOGGING_WEBHOOK_URL) return

    try {
      await fetch(process.env.LOGGING_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry),
      })
    } catch (error) {
      // Silently fail - don't break application flow
    }
  }

  error(message: string, options?: {
    category?: string
    metadata?: Record<string, any>
    error?: Error
    requestId?: string
  }): void {
    this.log(LogLevel.ERROR, message, options)
  }

  warn(message: string, options?: {
    category?: string
    metadata?: Record<string, any>
    requestId?: string
  }): void {
    this.log(LogLevel.WARN, message, options)
  }

  info(message: string, options?: {
    category?: string
    metadata?: Record<string, any>
    requestId?: string
  }): void {
    this.log(LogLevel.INFO, message, options)
  }

  debug(message: string, options?: {
    category?: string
    metadata?: Record<string, any>
    requestId?: string
  }): void {
    if (this.isDevelopment || this.config.logging.level === 'debug') {
      this.log(LogLevel.DEBUG, message, options)
    }
  }

  success(message: string, options?: {
    category?: string
    metadata?: Record<string, any>
    requestId?: string
  }): void {
    this.log(LogLevel.INFO, `✅ ${message}`, options)
  }

  // Specific logging methods for common scenarios
  database(message: string, metadata?: Record<string, any>, requestId?: string): void {
    this.info(message, { category: 'DATABASE', metadata, requestId })
  }

  auth(message: string, metadata?: Record<string, any>, requestId?: string): void {
    this.info(message, { category: 'AUTH', metadata, requestId })
  }

  api(message: string, metadata?: Record<string, any>, requestId?: string): void {
    this.info(message, { category: 'API', metadata, requestId })
  }

  startup(message: string, metadata?: Record<string, any>): void {
    this.info(message, { 
      category: 'STARTUP', 
      metadata: {
        ...metadata,
        environment: environmentDetector.getEnvironmentInfo()
      }
    })
  }

  performance(message: string, metadata?: Record<string, any>, requestId?: string): void {
    this.info(message, { category: 'PERFORMANCE', metadata, requestId })
  }

  // Environment-specific logging
  deployment(message: string, metadata?: Record<string, any>): void {
    this.info(message, { 
      category: 'DEPLOYMENT', 
      metadata: {
        ...metadata,
        mode: environmentDetector.getMode(),
        runtime: environmentDetector.getRuntimeEnvironment()
      }
    })
  }

  // Get log files for debugging (only in file-system enabled environments)
  getLogFiles(): string[] {
    if (!environmentDetector.canUseFileSystem() || !fs || !path) return []
    
    try {
      return fs.readdirSync(this.logsDir)
        .filter((file: string) => file.endsWith('.log'))
        .map((file: string) => path.join(this.logsDir, file))
    } catch (error) {
      return []
    }
  }

  // Get environment information for debugging
  getEnvironmentInfo(): any {
    return environmentDetector.getEnvironmentInfo()
  }
}

// Create singleton instance
const logger = new AdaptiveLogger()

export default logger

// Export convenience functions
export const logError = (message: string, error?: Error, metadata?: Record<string, any>, requestId?: string) => {
  logger.error(message, { error, metadata, requestId })
}

export const logWarn = (message: string, metadata?: Record<string, any>, requestId?: string) => {
  logger.warn(message, { metadata, requestId })
}

export const logInfo = (message: string, metadata?: Record<string, any>, requestId?: string) => {
  logger.info(message, { metadata, requestId })
}

export const logDebug = (message: string, metadata?: Record<string, any>, requestId?: string) => {
  logger.debug(message, { metadata, requestId })
}

// Specialized logging functions
export const logDatabase = (message: string, metadata?: Record<string, any>, requestId?: string) => {
  logger.database(message, metadata, requestId)
}

export const logAuth = (message: string, metadata?: Record<string, any>, requestId?: string) => {
  logger.auth(message, metadata, requestId)
}

export const logAPI = (message: string, metadata?: Record<string, any>, requestId?: string) => {
  logger.api(message, metadata, requestId)
}

export const logStartup = (message: string, metadata?: Record<string, any>) => {
  logger.startup(message, metadata)
}

export const logPerformance = (message: string, metadata?: Record<string, any>, requestId?: string) => {
  logger.performance(message, metadata, requestId)
}

export const logDeployment = (message: string, metadata?: Record<string, any>) => {
  logger.deployment(message, metadata)
}

export const logSuccess = (message: string, metadata?: Record<string, any>, requestId?: string) => {
  logger.success(message, { metadata, requestId })
}