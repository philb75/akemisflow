// Conditional imports for Edge runtime compatibility
let fs: any = null
let path: any = null

if (typeof window === 'undefined') {
  try {
    fs = require('fs')
    path = require('path')
  } catch (error) {
    // Edge runtime - file operations not available
    console.warn('File system operations not available in Edge runtime')
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
}

class Logger {
  private logsDir: string
  private maxFileSize: number = 10 * 1024 * 1024 // 10MB
  private maxFiles: number = 5
  private isDevelopment: boolean

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development'
    
    // Handle Edge runtime environment
    try {
      this.logsDir = path ? path.join(process.cwd(), 'logs') : '/tmp/logs'
    } catch (error) {
      // Edge runtime doesn't support process.cwd()
      this.logsDir = '/tmp/logs'
    }
    
    this.ensureLogsDirectory()
  }

  private ensureLogsDirectory(): void {
    if (typeof window === 'undefined' && fs) {
      try {
        if (!fs.existsSync(this.logsDir)) {
          fs.mkdirSync(this.logsDir, { recursive: true })
        }
      } catch (error) {
        // Silently fail in Edge runtime - file operations not available
        // console.error('Failed to create logs directory:', error)
      }
    }
  }

  private formatMessage(entry: LogEntry): string {
    const { timestamp, level, message, category, metadata, stack, requestId } = entry
    
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
    
    return formatted
  }

  private writeToFile(entry: LogEntry): void {
    if (typeof window !== 'undefined' || !fs || !path) return // Skip file writing in browser or Edge runtime

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
      // Silently fail in Edge runtime - file operations not available
      // console.error('Failed to write to log file:', error)
    }
  }

  private rotateLogFile(filepath: string): void {
    if (!fs || !path) return // Skip rotation in Edge runtime
    
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
      console.error('Failed to rotate log file:', error)
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
      requestId: options.requestId
    }

    // Always write to console in development
    if (this.isDevelopment) {
      const consoleMethod = level === LogLevel.ERROR ? console.error :
                           level === LogLevel.WARN ? console.warn :
                           console.log

      consoleMethod(this.formatMessage(entry))
    }

    // Write to file
    this.writeToFile(entry)
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
    if (this.isDevelopment) {
      this.log(LogLevel.DEBUG, message, options)
    }
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
    this.info(message, { category: 'STARTUP', metadata })
  }

  performance(message: string, metadata?: Record<string, any>, requestId?: string): void {
    this.info(message, { category: 'PERFORMANCE', metadata, requestId })
  }

  // Get log files for debugging
  getLogFiles(): string[] {
    if (typeof window !== 'undefined' || !fs || !path) return []
    
    try {
      return fs.readdirSync(this.logsDir)
        .filter(file => file.endsWith('.log'))
        .map(file => path.join(this.logsDir, file))
    } catch (error) {
      console.error('Failed to read log directory:', error)
      return []
    }
  }

  // Read recent log entries
  getRecentLogs(lines: number = 100): string[] {
    if (typeof window !== 'undefined' || !fs || !path) return []
    
    try {
      const logFiles = this.getLogFiles()
      if (logFiles.length === 0) return []
      
      // Get the most recent log file
      const latestFile = logFiles
        .map(file => ({ file, stat: fs.statSync(file) }))
        .sort((a, b) => b.stat.mtime.getTime() - a.stat.mtime.getTime())[0]
      
      const content = fs.readFileSync(latestFile.file, 'utf8')
      const allLines = content.split('\n').filter(line => line.trim())
      
      return allLines.slice(-lines)
    } catch (error) {
      console.error('Failed to read recent logs:', error)
      return []
    }
  }
}

// Create singleton instance
const logger = new Logger()

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