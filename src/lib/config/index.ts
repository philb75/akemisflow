import { PrismaClient, SystemConfigCategory, SystemConfigEnvironment, SystemConfigDataType } from '@prisma/client'
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

// Configuration cache
let configCache: Map<string, any> = new Map()
let cacheExpiry: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Encryption configuration
const ENCRYPTION_ALGORITHM = 'aes-256-gcm'
const ENCRYPTION_KEY = process.env.CONFIG_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || 'default-key-change-in-production'

export interface ConfigValue {
  key: string
  value: any
  category: SystemConfigCategory
  subcategory?: string
  description?: string
  isSecret: boolean
  dataType: SystemConfigDataType
  environment?: SystemConfigEnvironment
}

export interface ConfigUpdate {
  key: string
  value: string
  category: SystemConfigCategory
  subcategory?: string
  description?: string
  isSecret?: boolean
  dataType?: SystemConfigDataType
  environment?: SystemConfigEnvironment
}

// Environment detection
export function getCurrentEnvironment(): 'LOCAL' | 'PRODUCTION' {
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    return 'PRODUCTION'
  }
  return 'LOCAL'
}

// Encryption utilities
function encrypt(text: string): { encrypted: string; iv: string; tag: string } {
  const iv = randomBytes(16)
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv)
  
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  const tag = cipher.getAuthTag()
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex')
  }
}

function decrypt(encryptedData: { encrypted: string; iv: string; tag: string }): string {
  const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 32)), Buffer.from(encryptedData.iv, 'hex'))
  decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'))
  
  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}

// Configuration service class
export class ConfigurationService {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  // Get configuration value with caching
  async get<T = string>(key: string, defaultValue?: T): Promise<T> {
    // Check cache first
    if (Date.now() < cacheExpiry && configCache.has(key)) {
      return configCache.get(key) as T
    }

    try {
      const config = await this.prisma.systemConfiguration.findFirst({
        where: {
          key,
          isActive: true,
          OR: [
            { environment: 'BOTH' },
            { environment: getCurrentEnvironment() as any }
          ]
        }
      })

      if (!config || !config.value) {
        return defaultValue as T
      }

      let value: any = config.value

      // Decrypt if secret
      if (config.isSecret && config.value) {
        try {
          const encryptedData = JSON.parse(config.value)
          value = decrypt(encryptedData)
        } catch (error) {
          console.error(`Failed to decrypt config value for key: ${key}`, error)
          return defaultValue as T
        }
      }

      // Parse based on data type
      switch (config.dataType) {
        case 'NUMBER':
          value = parseFloat(value)
          break
        case 'BOOLEAN':
          value = value === 'true' || value === true
          break
        case 'JSON':
          try {
            value = JSON.parse(value)
          } catch {
            value = defaultValue
          }
          break
        default:
          // STRING and ENCRYPTED are already strings
          break
      }

      // Cache the result
      configCache.set(key, value)
      cacheExpiry = Date.now() + CACHE_DURATION

      return value as T
    } catch (error) {
      console.error(`Failed to get config value for key: ${key}`, error)
      return defaultValue as T
    }
  }

  // Set configuration value
  async set(key: string, config: ConfigUpdate, userId?: string): Promise<void> {
    try {
      let processedValue = config.value

      // Encrypt if secret
      if (config.isSecret && processedValue) {
        const encryptedData = encrypt(processedValue)
        processedValue = JSON.stringify(encryptedData)
      }

      await this.prisma.systemConfiguration.upsert({
        where: { key },
        update: {
          value: processedValue,
          category: config.category,
          subcategory: config.subcategory,
          description: config.description,
          isSecret: config.isSecret || false,
          dataType: config.dataType || 'STRING',
          environment: config.environment || 'BOTH',
          lastModifiedBy: userId,
          lastModifiedAt: new Date()
        },
        create: {
          key,
          value: processedValue,
          category: config.category,
          subcategory: config.subcategory,
          description: config.description,
          isSecret: config.isSecret || false,
          dataType: config.dataType || 'STRING',
          environment: config.environment || 'BOTH',
          lastModifiedBy: userId
        }
      })

      // Clear cache
      this.clearCache()
    } catch (error) {
      console.error(`Failed to set config value for key: ${key}`, error)
      throw error
    }
  }

  // Get all configurations by category
  async getByCategory(category: SystemConfigCategory): Promise<ConfigValue[]> {
    try {
      const configs = await this.prisma.systemConfiguration.findMany({
        where: {
          category,
          isActive: true,
          OR: [
            { environment: 'BOTH' },
            { environment: getCurrentEnvironment() as any }
          ]
        },
        orderBy: [
          { sortOrder: 'asc' },
          { key: 'asc' }
        ]
      })

      return configs.map(config => ({
        key: config.key,
        value: config.isSecret ? '[ENCRYPTED]' : this.parseValue(config.value, config.dataType),
        category: config.category,
        subcategory: config.subcategory || undefined,
        description: config.description || undefined,
        isSecret: config.isSecret,
        dataType: config.dataType,
        environment: config.environment || undefined
      }))
    } catch (error) {
      console.error(`Failed to get configs for category: ${category}`, error)
      return []
    }
  }

  // Test configuration (for real-time validation)
  async testConfiguration(key: string, value: string, dataType: SystemConfigDataType): Promise<{ valid: boolean; error?: string }> {
    try {
      // First, check environment-specific validation
      const envValidation = validateConfigurationForEnvironment(key, value)
      if (!envValidation.valid) {
        return envValidation
      }

      // Then check general validation rules
      switch (key) {
        case 'database.type':
          return { valid: ['local', 'supabase'].includes(value) }
        
        case 'database.supabase.url':
          return { 
            valid: !value || value.startsWith('https://'), 
            error: value && !value.startsWith('https://') ? 'Supabase URL must start with https://' : undefined 
          }
        
        case 'storage.provider':
          return { valid: ['local', 'supabase'].includes(value) }
        
        case 'integrations.airwallex.base_url':
          return { 
            valid: !value || value.startsWith('https://'), 
            error: value && !value.startsWith('https://') ? 'Airwallex URL must start with https://' : undefined 
          }
        
        default:
          return { valid: true }
      }
    } catch (error) {
      return { valid: false, error: 'Validation failed' }
    }
  }

  // Clear configuration cache
  clearCache(): void {
    configCache.clear()
    cacheExpiry = 0
  }

  // Helper method to parse values based on data type
  private parseValue(value: string | null, dataType: SystemConfigDataType): any {
    if (!value) return null

    switch (dataType) {
      case 'NUMBER':
        return parseFloat(value)
      case 'BOOLEAN':
        return value === 'true'
      case 'JSON':
        try {
          return JSON.parse(value)
        } catch {
          return value
        }
      default:
        return value
    }
  }
}

// Environment-specific configuration rules
export const ENVIRONMENT_RULES = {
  LOCAL: {
    allowedDatabaseTypes: ['local', 'supabase'],
    allowedStorageProviders: ['local', 'supabase'],
    defaultDatabase: 'local',
    defaultStorage: 'local',
    requiresSecretValidation: false
  },
  PRODUCTION: {
    allowedDatabaseTypes: ['supabase'], // Production should use Supabase
    allowedStorageProviders: ['supabase'], // Production should use Supabase storage
    defaultDatabase: 'supabase',
    defaultStorage: 'supabase',
    requiresSecretValidation: true
  }
}

// Get environment-specific rules
export function getEnvironmentRules() {
  const env = getCurrentEnvironment()
  return ENVIRONMENT_RULES[env]
}

// Validate configuration against environment rules
export function validateConfigurationForEnvironment(key: string, value: string): { valid: boolean; error?: string } {
  const env = getCurrentEnvironment()
  const rules = ENVIRONMENT_RULES[env]
  
  switch (key) {
    case 'database.type':
      if (!rules.allowedDatabaseTypes.includes(value)) {
        return {
          valid: false,
          error: `Database type '${value}' is not allowed in ${env} environment. Allowed: ${rules.allowedDatabaseTypes.join(', ')}`
        }
      }
      break
      
    case 'storage.provider':
      if (!rules.allowedStorageProviders.includes(value)) {
        return {
          valid: false,
          error: `Storage provider '${value}' is not allowed in ${env} environment. Allowed: ${rules.allowedStorageProviders.join(', ')}`
        }
      }
      break
      
    case 'database.supabase.url':
    case 'database.supabase.anon_key':
    case 'database.supabase.service_role_key':
      if (env === 'PRODUCTION' && !value) {
        return {
          valid: false,
          error: `${key.split('.').pop()} is required in production environment`
        }
      }
      break
  }
  
  return { valid: true }
}

// Get environment-specific default configurations
export function getEnvironmentDefaults(): ConfigUpdate[] {
  const env = getCurrentEnvironment()
  const rules = ENVIRONMENT_RULES[env]
  
  const baseDefaults = DEFAULT_CONFIGURATIONS.map(config => ({
    ...config,
    value: getEnvironmentSpecificValue(config.key, config.value, env)
  }))
  
  // Set environment-specific defaults
  const environmentOverrides = baseDefaults.map(config => {
    if (config.key === 'database.type') {
      return { ...config, value: rules.defaultDatabase }
    }
    if (config.key === 'storage.provider') {
      return { ...config, value: rules.defaultStorage }
    }
    return config
  })
  
  return environmentOverrides
}

// Get environment-specific value for a configuration
function getEnvironmentSpecificValue(key: string, defaultValue: string, environment: 'LOCAL' | 'PRODUCTION'): string {
  switch (key) {
    case 'storage.local.public_url':
      return environment === 'LOCAL' 
        ? 'http://localhost:3000/uploads'
        : process.env.VERCEL_URL 
          ? `https://${process.env.VERCEL_URL}/uploads`
          : defaultValue
          
    case 'integrations.airwallex.base_url':
      return environment === 'PRODUCTION' 
        ? 'https://api.airwallex.com'  // Production API
        : 'https://api-demo.airwallex.com' // Demo/sandbox API for local
        
    default:
      return defaultValue
  }
}

// Default configurations for seeding
export const DEFAULT_CONFIGURATIONS: ConfigUpdate[] = [
  // Database Configuration
  {
    key: 'database.type',
    value: 'local',
    category: 'DATABASE',
    description: 'Database provider (local or supabase)',
    dataType: 'STRING',
    environment: 'BOTH'
  },
  {
    key: 'database.supabase.url',
    value: '',
    category: 'DATABASE',
    subcategory: 'supabase',
    description: 'Supabase project URL',
    dataType: 'STRING',
    environment: 'BOTH'
  },
  {
    key: 'database.supabase.anon_key',
    value: '',
    category: 'DATABASE',
    subcategory: 'supabase',
    description: 'Supabase anonymous key',
    dataType: 'ENCRYPTED',
    isSecret: true,
    environment: 'BOTH'
  },
  {
    key: 'database.supabase.service_role_key',
    value: '',
    category: 'DATABASE',
    subcategory: 'supabase',
    description: 'Supabase service role key',
    dataType: 'ENCRYPTED',
    isSecret: true,
    environment: 'BOTH'
  },

  // Storage Configuration  
  {
    key: 'storage.provider',
    value: 'local',
    category: 'STORAGE',
    description: 'Storage provider (local or supabase)',
    dataType: 'STRING',
    environment: 'BOTH'
  },
  {
    key: 'storage.local.path',
    value: './uploads',
    category: 'STORAGE',
    subcategory: 'local',
    description: 'Local storage path',
    dataType: 'STRING',
    environment: 'BOTH'
  },
  {
    key: 'storage.local.public_url',
    value: 'http://localhost:3000/uploads',
    category: 'STORAGE',
    subcategory: 'local',
    description: 'Local storage public URL',
    dataType: 'STRING',
    environment: 'LOCAL'
  },
  {
    key: 'storage.supabase.bucket',
    value: 'documents',
    category: 'STORAGE',
    subcategory: 'supabase',
    description: 'Supabase storage bucket name',
    dataType: 'STRING',
    environment: 'BOTH'
  },

  // Integration Configuration
  {
    key: 'integrations.airwallex.client_id',
    value: '',
    category: 'INTEGRATIONS',
    subcategory: 'airwallex',
    description: 'Airwallex client ID',
    dataType: 'STRING',
    environment: 'BOTH'
  },
  {
    key: 'integrations.airwallex.api_key',
    value: '',
    category: 'INTEGRATIONS',
    subcategory: 'airwallex',
    description: 'Airwallex API key',
    dataType: 'ENCRYPTED',
    isSecret: true,
    environment: 'BOTH'
  },
  {
    key: 'integrations.airwallex.base_url',
    value: 'https://api.airwallex.com',
    category: 'INTEGRATIONS',
    subcategory: 'airwallex',
    description: 'Airwallex API base URL',
    dataType: 'STRING',
    environment: 'BOTH'
  },

  // System Configuration
  {
    key: 'system.max_file_size',
    value: '10485760',
    category: 'SYSTEM',
    description: 'Maximum file upload size in bytes',
    dataType: 'NUMBER',
    environment: 'BOTH'
  }
]