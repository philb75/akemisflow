/**
 * Environment Detection and Configuration
 * 
 * Detects deployment mode and configures services accordingly:
 * 1. Local Server + Prisma + Local DB
 * 2. Local Server + Supabase + Filesystem
 * 3. Vercel Server + Supabase (Edge Runtime)
 */

export enum DeploymentMode {
  LOCAL_PRISMA = 'local-prisma',
  LOCAL_SUPABASE = 'local-supabase', 
  VERCEL_SUPABASE = 'vercel-supabase'
}

export enum DatabaseProvider {
  PRISMA = 'prisma',
  SUPABASE = 'supabase'
}

export enum StorageProvider {
  LOCAL = 'local',
  SUPABASE = 'supabase'
}

export enum RuntimeEnvironment {
  NODEJS = 'nodejs',
  EDGE = 'edge'
}

export interface EnvironmentConfig {
  mode: DeploymentMode
  database: DatabaseProvider
  storage: StorageProvider
  runtime: RuntimeEnvironment
  features: {
    fileLogging: boolean
    healthChecks: boolean
    dockerServices: boolean
    middleware: boolean
    prismaClient: boolean
    supabaseClient: boolean
  }
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error'
    console: boolean
    file: boolean
    structured: boolean
  }
}

class EnvironmentDetector {
  private config: EnvironmentConfig

  constructor() {
    this.config = this.detectEnvironment()
  }

  private detectEnvironment(): EnvironmentConfig {
    // Check if running in Edge Runtime
    const isEdgeRuntime = this.isEdgeRuntime()
    
    // Check if Vercel deployment
    const isVercel = this.isVercel()
    
    // Check database configuration
    const hasSupabaseConfig = this.hasSupabaseConfig()
    const hasPrismaConfig = this.hasPrismaConfig()
    
    // Determine deployment mode
    let mode: DeploymentMode
    let database: DatabaseProvider
    let storage: StorageProvider
    let runtime: RuntimeEnvironment
    
    if (isVercel) {
      // Vercel deployment - always Supabase + Edge Runtime
      mode = DeploymentMode.VERCEL_SUPABASE
      database = DatabaseProvider.SUPABASE
      storage = StorageProvider.SUPABASE
      runtime = RuntimeEnvironment.EDGE
    } else if (hasSupabaseConfig && !hasPrismaConfig) {
      // Local development with Supabase
      mode = DeploymentMode.LOCAL_SUPABASE
      database = DatabaseProvider.SUPABASE
      storage = StorageProvider.SUPABASE
      runtime = RuntimeEnvironment.NODEJS
    } else {
      // Local development with Prisma (default)
      mode = DeploymentMode.LOCAL_PRISMA
      database = DatabaseProvider.PRISMA
      storage = StorageProvider.LOCAL
      runtime = RuntimeEnvironment.NODEJS
    }

    return {
      mode,
      database,
      storage,
      runtime,
      features: {
        fileLogging: !isEdgeRuntime && !isVercel,
        healthChecks: true,
        dockerServices: mode === DeploymentMode.LOCAL_PRISMA,
        middleware: !this.isDevelopment() || mode !== DeploymentMode.LOCAL_PRISMA,
        prismaClient: database === DatabaseProvider.PRISMA && !isEdgeRuntime,
        supabaseClient: database === DatabaseProvider.SUPABASE
      },
      logging: {
        level: this.isDevelopment() ? 'debug' : 'info',
        console: true,
        file: !isEdgeRuntime && !isVercel,
        structured: true
      }
    }
  }

  private isEdgeRuntime(): boolean {
    return typeof EdgeRuntime !== 'undefined' || 
           (typeof globalThis !== 'undefined' && 'EdgeRuntime' in globalThis) ||
           (typeof global !== 'undefined' && 'EdgeRuntime' in global)
  }

  private isVercel(): boolean {
    return !!(
      process.env.VERCEL ||
      process.env.VERCEL_ENV ||
      process.env.VERCEL_URL ||
      process.env.NEXT_PUBLIC_VERCEL_URL
    )
  }

  private hasSupabaseConfig(): boolean {
    return !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)
    )
  }

  private hasPrismaConfig(): boolean {
    return !!(
      process.env.DATABASE_URL &&
      !process.env.DATABASE_URL.includes('supabase.co')
    )
  }

  private isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development'
  }

  getConfig(): EnvironmentConfig {
    return this.config
  }

  getMode(): DeploymentMode {
    return this.config.mode
  }

  getDatabaseProvider(): DatabaseProvider {
    return this.config.database
  }

  getStorageProvider(): StorageProvider {
    return this.config.storage
  }

  getRuntimeEnvironment(): RuntimeEnvironment {
    return this.config.runtime
  }

  canUseFileSystem(): boolean {
    return this.config.features.fileLogging
  }

  canUsePrisma(): boolean {
    return this.config.features.prismaClient
  }

  canUseSupabase(): boolean {
    return this.config.features.supabaseClient
  }

  shouldUseMiddleware(): boolean {
    return this.config.features.middleware
  }

  shouldStartDockerServices(): boolean {
    return this.config.features.dockerServices
  }

  getLogLevel(): string {
    return this.config.logging.level
  }

  shouldLogToFile(): boolean {
    return this.config.logging.file
  }

  // Compatibility check methods
  isLocalPrismaMode(): boolean {
    return this.config.mode === DeploymentMode.LOCAL_PRISMA
  }

  isLocalSupabaseMode(): boolean {
    return this.config.mode === DeploymentMode.LOCAL_SUPABASE
  }

  isVercelMode(): boolean {
    return this.config.mode === DeploymentMode.VERCEL_SUPABASE
  }

  // Environment info for debugging
  getEnvironmentInfo(): Record<string, any> {
    return {
      mode: this.config.mode,
      runtime: this.config.runtime,
      database: this.config.database,
      storage: this.config.storage,
      features: this.config.features,
      env: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: !!process.env.VERCEL,
        DATABASE_URL: !!process.env.DATABASE_URL,
        SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        isEdgeRuntime: this.isEdgeRuntime(),
        platform: typeof window !== 'undefined' ? 'browser' : 'server'
      }
    }
  }
}

// Create singleton instance
const environmentDetector = new EnvironmentDetector()

export default environmentDetector
export { EnvironmentDetector }