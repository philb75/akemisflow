// Edge Runtime Compatible Logger
// This version works in both Node.js and Edge Runtime environments

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

class EdgeLogger {
  private isDevelopment: boolean
  private isEdgeRuntime: boolean

  constructor() {
    this.isDevelopment = typeof process !== 'undefined' && process.env?.NODE_ENV === 'development'
    this.isEdgeRuntime = typeof EdgeRuntime !== 'undefined' || typeof window === 'undefined' && typeof global === 'undefined'
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

    // Always log to console
    const consoleMethod = level === LogLevel.ERROR ? console.error :
                         level === LogLevel.WARN ? console.warn :
                         console.log

    consoleMethod(this.formatMessage(entry))
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
}

// Create singleton instance
const logger = new EdgeLogger()

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