import { LocalStorageProvider } from './local-storage'
import { SupabaseStorageProvider } from './supabase-storage'
import { StorageProvider, StorageConfig } from './types'
import { ConfigurationService } from '@/lib/config'
import { prisma } from '@/lib/db'

// Cache for storage providers
let currentStorageProvider: StorageProvider | null = null
let currentStorageType: string | null = null

// Configuration service instance
let configService: ConfigurationService | null = null

/**
 * Initialize configuration service
 */
function initConfigService(): ConfigurationService {
  if (!configService) {
    configService = new ConfigurationService(prisma)
  }
  return configService
}

/**
 * Get storage configuration from dynamic config
 */
async function getStorageConfig(): Promise<StorageConfig> {
  try {
    const config = initConfigService()
    
    const [
      provider,
      localPath,
      localPublicUrl,
      supabaseUrl,
      supabaseServiceKey,
      supabaseBucket
    ] = await Promise.all([
      config.get('storage.provider', 'local'),
      config.get('storage.local.path', './uploads'),
      config.get('storage.local.public_url', 'http://localhost:3000/uploads'),
      config.get('database.supabase.url', ''),
      config.get('database.supabase.service_role_key', ''),
      config.get('storage.supabase.bucket', 'documents')
    ])

    return {
      provider: provider as 'local' | 'supabase',
      localPath,
      publicUrl: localPublicUrl,
      supabaseUrl,
      supabaseKey: supabaseServiceKey, // Use service role key for storage
      bucket: supabaseBucket
    }
  } catch (error) {
    console.warn('Failed to load storage configuration, falling back to environment variables:', error)
    
    // Fallback to environment variables
    return {
      provider: (process.env.STORAGE_PROVIDER as 'local' | 'supabase') || 'local',
      localPath: process.env.STORAGE_PATH || './uploads',
      publicUrl: process.env.STORAGE_PUBLIC_URL || 'http://localhost:3000/uploads',
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY, // Use service role for storage
      bucket: process.env.SUPABASE_STORAGE_BUCKET || 'documents'
    }
  }
}

/**
 * Initialize storage provider based on configuration
 */
async function initializeStorageProvider(config: StorageConfig): Promise<StorageProvider> {
  if (config.provider === 'local') {
    if (!config.localPath || !config.publicUrl) {
      throw new Error('Local storage requires localPath and publicUrl')
    }
    return new LocalStorageProvider(config.localPath, config.publicUrl)
  } else if (config.provider === 'supabase') {
    if (!config.supabaseUrl || !config.supabaseKey || !config.bucket) {
      throw new Error('Supabase storage requires supabaseUrl, supabaseKey, and bucket')
    }
    return new SupabaseStorageProvider(
      config.supabaseUrl,
      config.supabaseKey,
      config.bucket
    )
  } else {
    throw new Error(`Unknown storage provider: ${config.provider}`)
  }
}

/**
 * Get dynamic storage provider based on configuration
 */
export async function getStorageProvider(): Promise<StorageProvider> {
  const config = await getStorageConfig()
  
  // Return cached provider if type hasn't changed
  if (currentStorageType === config.provider && currentStorageProvider) {
    return currentStorageProvider
  }

  try {
    // Initialize new provider
    currentStorageProvider = await initializeStorageProvider(config)
    currentStorageType = config.provider
    
    console.log(`✅ Initialized ${config.provider} storage provider`)
    return currentStorageProvider
  } catch (error) {
    console.error(`Failed to initialize ${config.provider} storage provider:`, error)
    
    // Fallback to local storage on error
    if (config.provider !== 'local') {
      console.log('Falling back to local storage...')
      const fallbackConfig: StorageConfig = {
        provider: 'local',
        localPath: './uploads',
        publicUrl: 'http://localhost:3000/uploads'
      }
      
      currentStorageProvider = await initializeStorageProvider(fallbackConfig)
      currentStorageType = 'local'
      
      return currentStorageProvider
    }
    
    throw error
  }
}

/**
 * Execute storage operation with dynamic provider selection
 */
export async function withStorageProvider<T>(
  operation: (provider: StorageProvider) => Promise<T>
): Promise<T> {
  const provider = await getStorageProvider()
  return operation(provider)
}

/**
 * Clear storage provider cache (useful when configuration changes)
 */
export function clearStorageCache(): void {
  currentStorageProvider = null
  currentStorageType = null
}

/**
 * Test storage provider connection and permissions
 */
export async function testStorageProvider(): Promise<{ 
  success: boolean
  message: string
  provider: string
  details?: any 
}> {
  try {
    const config = await getStorageConfig()
    const provider = await getStorageProvider()
    
    if (config.provider === 'local') {
      // Test local storage - try to create a test file
      const fs = require('fs')
      const path = require('path')
      
      const testPath = path.resolve(config.localPath!)
      
      // Check if directory exists and is writable
      if (!fs.existsSync(testPath)) {
        try {
          fs.mkdirSync(testPath, { recursive: true })
        } catch (error) {
          return {
            success: false,
            message: `Cannot create storage directory: ${error instanceof Error ? error.message : 'Unknown error'}`,
            provider: 'local',
            details: { path: testPath }
          }
        }
      }
      
      // Test write permissions
      const testFile = path.join(testPath, '.write-test')
      try {
        fs.writeFileSync(testFile, 'test')
        fs.unlinkSync(testFile)
      } catch (error) {
        return {
          success: false,
          message: `Storage directory is not writable: ${error instanceof Error ? error.message : 'Unknown error'}`,
          provider: 'local',
          details: { path: testPath }
        }
      }
      
      return {
        success: true,
        message: 'Local storage is accessible and writable',
        provider: 'local',
        details: { path: testPath }
      }
    } else if (config.provider === 'supabase') {
      // Test Supabase storage - try to list files
      try {
        const testResult = await provider.list('')
        
        return {
          success: true,
          message: 'Supabase storage connection successful',
          provider: 'supabase',
          details: { 
            bucket: config.bucket,
            filesFound: testResult.files.length 
          }
        }
      } catch (error) {
        return {
          success: false,
          message: `Supabase storage test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          provider: 'supabase',
          details: { bucket: config.bucket }
        }
      }
    }
    
    return {
      success: false,
      message: 'Unknown storage provider',
      provider: config.provider
    }
  } catch (error) {
    return {
      success: false,
      message: `Storage test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      provider: 'unknown'
    }
  }
}

/**
 * Get current storage configuration
 */
export async function getCurrentStorageConfig(): Promise<StorageConfig & { type: string }> {
  const config = await getStorageConfig()
  return {
    ...config,
    type: currentStorageType || config.provider
  }
}

// Export original functions for backward compatibility
export * from './index'