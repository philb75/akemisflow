import logger from '@/lib/logger-adaptive'
import environmentDetector from '@/lib/environment'

// Conditional Prisma import based on environment detection
let prisma: any = null
if (environmentDetector.canUsePrisma()) {
  try {
    prisma = require('@/lib/db').prisma
  } catch (error) {
    logger.warn('Prisma not available in current runtime', { 
      metadata: { 
        error: error instanceof Error ? error.message : 'Unknown error',
        mode: environmentDetector.getMode()
      } 
    })
  }
}

export interface HealthCheck {
  name: string
  status: 'healthy' | 'unhealthy' | 'degraded'
  responseTime?: number
  message?: string
  error?: string
  metadata?: Record<string, any>
}

export interface SystemHealth {
  status: 'healthy' | 'unhealthy' | 'degraded'
  timestamp: string
  uptime: number
  checks: HealthCheck[]
  version?: string
}

class HealthService {
  private startTime: number

  constructor() {
    this.startTime = Date.now()
  }

  async checkDatabase(): Promise<HealthCheck> {
    const start = Date.now()
    const mode = environmentDetector.getMode()
    const dbProvider = environmentDetector.getDatabaseProvider()
    
    // Check Prisma connection for local-prisma mode
    if (dbProvider === 'prisma') {
      if (!prisma) {
        return {
          name: 'database',
          status: 'unhealthy',
          responseTime: 0,
          message: 'Prisma client not available',
          metadata: {
            provider: 'prisma',
            mode,
            configured: false
          }
        }
      }
      
      try {
        // Simple query to test database connectivity
        await prisma.$queryRaw`SELECT 1 as test`
        
        const responseTime = Date.now() - start
        
        return {
          name: 'database',
          status: responseTime < 1000 ? 'healthy' : 'degraded',
          responseTime,
          message: responseTime < 1000 ? 'Prisma database responding normally' : 'Prisma database responding slowly',
          metadata: {
            provider: 'prisma',
            mode,
            responseTime: `${responseTime}ms`
          }
        }
      } catch (error) {
        const responseTime = Date.now() - start
        
        logger.error('Prisma database health check failed', {
          category: 'HEALTH',
          error: error as Error,
          metadata: { responseTime, mode }
        })
        
        return {
          name: 'database',
          status: 'unhealthy',
          responseTime,
          message: 'Prisma database connection failed',
          error: error instanceof Error ? error.message : 'Unknown database error',
          metadata: {
            provider: 'prisma',
            mode,
            responseTime: `${responseTime}ms`
          }
        }
      }
    }
    
    // Check Supabase connection for supabase modes
    if (dbProvider === 'supabase') {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      if (!supabaseUrl || !supabaseAnonKey) {
        return {
          name: 'database',
          status: 'unhealthy',
          responseTime: 0,
          message: 'Supabase configuration missing',
          metadata: {
            provider: 'supabase',
            mode,
            configured: false,
            hasUrl: !!supabaseUrl,
            hasKey: !!supabaseAnonKey
          }
        }
      }
      
      try {
        // Simple health check to Supabase REST API
        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
          method: 'HEAD',
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`
          },
          signal: AbortSignal.timeout(5000)
        })
        
        const responseTime = Date.now() - start
        
        return {
          name: 'database',
          status: response.ok && responseTime < 1000 ? 'healthy' : 'degraded',
          responseTime,
          message: response.ok 
            ? (responseTime < 1000 ? 'Supabase responding normally' : 'Supabase responding slowly')
            : `Supabase returned ${response.status}`,
          metadata: {
            provider: 'supabase',
            mode,
            statusCode: response.status,
            responseTime: `${responseTime}ms`
          }
        }
      } catch (error) {
        const responseTime = Date.now() - start
        
        logger.error('Supabase database health check failed', {
          category: 'HEALTH',
          error: error as Error,
          metadata: { responseTime, mode }
        })
        
        return {
          name: 'database',
          status: 'unhealthy',
          responseTime,
          message: 'Supabase connection failed',
          error: error instanceof Error ? error.message : 'Unknown database error',
          metadata: {
            provider: 'supabase',
            mode,
            responseTime: `${responseTime}ms`
          }
        }
      }
    }
    
    // Fallback for unknown provider
    return {
      name: 'database',
      status: 'unhealthy',
      responseTime: 0,
      message: 'Unknown database provider',
      metadata: {
        provider: dbProvider,
        mode
      }
    }
  }

  async checkEnvironment(): Promise<HealthCheck> {
    const mode = environmentDetector.getMode()
    const dbProvider = environmentDetector.getDatabaseProvider()
    
    // Different required variables for different deployment modes
    let requiredEnvVars: string[] = [
      'NEXTAUTH_SECRET',
      'NEXTAUTH_URL'
    ]
    
    // Add database-specific variables
    if (dbProvider === 'prisma') {
      requiredEnvVars.push('DATABASE_URL')
    } else if (dbProvider === 'supabase') {
      requiredEnvVars.push(
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY'
      )
    }
    
    // Add Vercel-specific variables if needed
    if (environmentDetector.isVercelMode()) {
      // Vercel usually provides these automatically
      requiredEnvVars = requiredEnvVars.filter(v => v !== 'NEXTAUTH_URL')
    }

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
    
    if (missingVars.length > 0) {
      return {
        name: 'environment',
        status: 'unhealthy',
        message: 'Missing required environment variables',
        error: `Missing: ${missingVars.join(', ')}`,
        metadata: {
          missing: missingVars,
          total: requiredEnvVars.length,
          mode,
          dbProvider
        }
      }
    }

    return {
      name: 'environment',
      status: 'healthy',
      message: 'All required environment variables present',
      metadata: {
        checked: requiredEnvVars.length,
        nodeEnv: process.env.NODE_ENV,
        mode,
        dbProvider,
        variables: requiredEnvVars
      }
    }
  }

  async checkFileSystem(): Promise<HealthCheck> {
    const mode = environmentDetector.getMode()
    const storageProvider = environmentDetector.getStorageProvider()
    
    // For Supabase storage, check Supabase storage API
    if (storageProvider === 'supabase') {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      if (!supabaseUrl || !supabaseAnonKey) {
        return {
          name: 'filesystem',
          status: 'unhealthy',
          message: 'Supabase storage not configured',
          metadata: {
            provider: 'supabase',
            mode,
            configured: false
          }
        }
      }
      
      try {
        // Check Supabase storage API availability
        const response = await fetch(`${supabaseUrl}/storage/v1/`, {
          method: 'HEAD',
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`
          },
          signal: AbortSignal.timeout(5000)
        })
        
        return {
          name: 'filesystem',
          status: response.ok ? 'healthy' : 'degraded',
          message: response.ok ? 'Supabase storage accessible' : `Supabase storage returned ${response.status}`,
          metadata: {
            provider: 'supabase',
            mode,
            statusCode: response.status,
            accessible: response.ok
          }
        }
      } catch (error) {
        logger.error('Supabase storage health check failed', {
          category: 'HEALTH',
          error: error as Error,
          metadata: { mode }
        })
        
        return {
          name: 'filesystem',
          status: 'unhealthy',
          message: 'Supabase storage access failed',
          error: error instanceof Error ? error.message : 'Unknown storage error',
          metadata: {
            provider: 'supabase',
            mode,
            accessible: false
          }
        }
      }
    }
    
    // For local storage, check file system access
    if (storageProvider === 'local') {
      if (!environmentDetector.canUseFileSystem()) {
        return {
          name: 'filesystem',
          status: 'degraded',
          message: 'Local file system not available in current runtime',
          metadata: {
            provider: 'local',
            mode,
            runtime: environmentDetector.getRuntimeEnvironment(),
            accessible: false
          }
        }
      }
      
      try {
        const fs = require('fs')
        const path = require('path')
        
        // Check if we can write to the uploads directory
        const uploadsDir = path.join(process.cwd(), 'uploads')
        
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true })
        }
        
        // Test write access
        const testFile = path.join(uploadsDir, '.health-check')
        fs.writeFileSync(testFile, 'health check', 'utf8')
        fs.unlinkSync(testFile)
        
        return {
          name: 'filesystem',
          status: 'healthy',
          message: 'Local file system access normal',
          metadata: {
            provider: 'local',
            mode,
            uploadsDir,
            writable: true
          }
        }
      } catch (error) {
        logger.error('Local file system health check failed', {
          category: 'HEALTH',
          error: error as Error,
          metadata: { mode }
        })
        
        return {
          name: 'filesystem',
          status: 'unhealthy',
          message: 'Local file system access failed',
          error: error instanceof Error ? error.message : 'Unknown file system error',
          metadata: {
            provider: 'local',
            mode,
            writable: false
          }
        }
      }
    }
    
    // Fallback for unknown storage provider
    return {
      name: 'filesystem',
      status: 'unhealthy',
      message: 'Unknown storage provider',
      metadata: {
        provider: storageProvider,
        mode
      }
    }
  }

  async checkMemory(): Promise<HealthCheck> {
    try {
      const memUsage = process.memoryUsage()
      const memUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024)
      const memTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024)
      const memExternalMB = Math.round(memUsage.external / 1024 / 1024)
      
      // Consider unhealthy if using more than 512MB
      const status = memUsedMB > 512 ? 'degraded' : 'healthy'
      
      return {
        name: 'memory',
        status,
        message: `Memory usage: ${memUsedMB}MB / ${memTotalMB}MB`,
        metadata: {
          heapUsed: `${memUsedMB}MB`,
          heapTotal: `${memTotalMB}MB`,
          external: `${memExternalMB}MB`,
          rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`
        }
      }
    } catch (error) {
      return {
        name: 'memory',
        status: 'unhealthy',
        message: 'Failed to check memory usage',
        error: error instanceof Error ? error.message : 'Unknown memory error'
      }
    }
  }

  async checkAirwallexAPI(): Promise<HealthCheck> {
    const start = Date.now()
    
    if (!process.env.AIRWALLEX_BASE_URL || !process.env.AIRWALLEX_API_KEY) {
      return {
        name: 'airwallex',
        status: 'degraded',
        message: 'Airwallex API not configured',
        metadata: {
          configured: false
        }
      }
    }

    try {
      // Simple connectivity test - just check if the base URL is reachable
      const response = await fetch(`${process.env.AIRWALLEX_BASE_URL}/api/v1/`, {
        method: 'HEAD',
        headers: {
          'Authorization': `Bearer ${process.env.AIRWALLEX_API_KEY}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      })
      
      const responseTime = Date.now() - start
      
      return {
        name: 'airwallex',
        status: response.ok ? 'healthy' : 'degraded',
        responseTime,
        message: response.ok ? 'Airwallex API reachable' : `Airwallex API returned ${response.status}`,
        metadata: {
          configured: true,
          statusCode: response.status,
          responseTime: `${responseTime}ms`
        }
      }
    } catch (error) {
      const responseTime = Date.now() - start
      
      return {
        name: 'airwallex',
        status: 'unhealthy',
        responseTime,
        message: 'Airwallex API unreachable',
        error: error instanceof Error ? error.message : 'Unknown API error',
        metadata: {
          configured: true,
          responseTime: `${responseTime}ms`
        }
      }
    }
  }

  async getSystemHealth(): Promise<SystemHealth> {
    const start = Date.now()
    
    logger.debug('Starting system health check')
    
    const checks = await Promise.all([
      this.checkEnvironment(),
      this.checkDatabase(),
      this.checkFileSystem(),
      this.checkMemory(),
      this.checkAirwallexAPI()
    ])
    
    // Determine overall system status
    const hasUnhealthy = checks.some(check => check.status === 'unhealthy')
    const hasDegraded = checks.some(check => check.status === 'degraded')
    
    const systemStatus = hasUnhealthy ? 'unhealthy' : 
                        hasDegraded ? 'degraded' : 'healthy'
    
    const healthData: SystemHealth = {
      status: systemStatus,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      checks,
      version: process.env.npm_package_version || '0.1.0'
    }
    
    const totalTime = Date.now() - start
    
    logger.info('System health check completed', {
      category: 'HEALTH',
      metadata: {
        status: systemStatus,
        checkCount: checks.length,
        duration: `${totalTime}ms`,
        healthy: checks.filter(c => c.status === 'healthy').length,
        degraded: checks.filter(c => c.status === 'degraded').length,
        unhealthy: checks.filter(c => c.status === 'unhealthy').length
      }
    })
    
    return healthData
  }

  // Quick health check for startup validation
  async isSystemReady(): Promise<{ ready: boolean; issues: string[] }> {
    try {
      const envCheck = await this.checkEnvironment()
      const dbCheck = await this.checkDatabase()
      
      const issues: string[] = []
      
      if (envCheck.status === 'unhealthy') {
        issues.push(`Environment: ${envCheck.error || envCheck.message}`)
      }
      
      if (dbCheck.status === 'unhealthy') {
        issues.push(`Database: ${dbCheck.error || dbCheck.message}`)
      }
      
      return {
        ready: issues.length === 0,
        issues
      }
    } catch (error) {
      logger.error('System ready check failed', {
        category: 'HEALTH',
        error: error as Error
      })
      
      return {
        ready: false,
        issues: ['System health check failed']
      }
    }
  }
}

// Create singleton instance
const healthService = new HealthService()

export default healthService
export { HealthService }