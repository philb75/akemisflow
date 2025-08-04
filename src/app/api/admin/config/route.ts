import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ConfigurationService, DEFAULT_CONFIGURATIONS, getCurrentEnvironment, getEnvironmentDefaults, getEnvironmentRules } from '@/lib/config'
import { SystemConfigCategory } from '@prisma/client'

const configService = new ConfigurationService(prisma)

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') as SystemConfigCategory | null

    if (category) {
      // Get configurations by category
      const configs = await configService.getByCategory(category)
      return NextResponse.json({
        success: true,
        category,
        configurations: configs,
        environment: getCurrentEnvironment()
      })
    } else {
      // Get all categories with their configurations
      const categories = ['DATABASE', 'STORAGE', 'INTEGRATIONS', 'SECURITY', 'SYSTEM'] as SystemConfigCategory[]
      const allConfigs: Record<string, any> = {}

      for (const cat of categories) {
        allConfigs[cat] = await configService.getByCategory(cat)
      }

      return NextResponse.json({
        success: true,
        configurations: allConfigs,
        environment: getCurrentEnvironment(),
        environmentRules: getEnvironmentRules(),
        availableCategories: categories
      })
    }
  } catch (error) {
    console.error('Failed to get configurations:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve configurations'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { configurations } = body

    if (!Array.isArray(configurations)) {
      return NextResponse.json({
        success: false,
        error: 'Configurations must be an array'
      }, { status: 400 })
    }

    const results = []
    const errors = []

    for (const config of configurations) {
      try {
        // Validate configuration
        const validation = await configService.testConfiguration(
          config.key,
          config.value,
          config.dataType || 'STRING'
        )

        if (!validation.valid) {
          errors.push({
            key: config.key,
            error: validation.error || 'Invalid configuration'
          })
          continue
        }

        // Save configuration
        await configService.set(config.key, config, session.user.id)
        results.push({
          key: config.key,
          status: 'saved'
        })
      } catch (error) {
        errors.push({
          key: config.key,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      saved: results,
      errors: errors,
      message: errors.length === 0 
        ? `${results.length} configurations saved successfully` 
        : `${results.length} saved, ${errors.length} failed`
    })
  } catch (error) {
    console.error('Failed to save configurations:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to save configurations'
    }, { status: 500 })
  }
}

// Initialize default configurations
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔄 Initializing default system configurations...')

    let initialized = 0
    let skipped = 0

    // Use environment-specific defaults
    const environmentDefaults = getEnvironmentDefaults()
    
    for (const config of environmentDefaults) {
      try {
        // Check if configuration already exists
        const existing = await prisma.systemConfiguration.findFirst({
          where: { key: config.key }
        })

        if (existing) {
          skipped++
          continue
        }

        // Create new configuration
        await configService.set(config.key, config, session.user.id)
        initialized++
      } catch (error) {
        console.error(`Failed to initialize config ${config.key}:`, error)
      }
    }

    // Load current environment values into configurations
    await loadEnvironmentDefaults(session.user.id)

    console.log(`✅ Initialized ${initialized} configurations, skipped ${skipped} existing`)

    return NextResponse.json({
      success: true,
      message: `Initialized ${initialized} configurations, skipped ${skipped} existing`,
      initialized,
      skipped
    })
  } catch (error) {
    console.error('Failed to initialize configurations:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to initialize configurations'
    }, { status: 500 })
  }
}

// Helper function to load current environment values
async function loadEnvironmentDefaults(userId: string) {
  const configService = new ConfigurationService(prisma)
  
  const envMappings = [
    // Database
    { key: 'database.supabase.url', env: 'NEXT_PUBLIC_SUPABASE_URL' },
    { key: 'database.supabase.anon_key', env: 'NEXT_PUBLIC_SUPABASE_ANON_KEY' },
    { key: 'database.supabase.service_role_key', env: 'SUPABASE_SERVICE_ROLE_KEY' },
    
    // Storage
    { key: 'storage.local.path', env: 'STORAGE_PATH' },
    { key: 'storage.local.public_url', env: 'STORAGE_PUBLIC_URL' },
    { key: 'storage.supabase.bucket', env: 'SUPABASE_STORAGE_BUCKET' },
    
    // Integrations
    { key: 'integrations.airwallex.client_id', env: 'AIRWALLEX_CLIENT_ID' },
    { key: 'integrations.airwallex.api_key', env: 'AIRWALLEX_API_KEY' },
    { key: 'integrations.airwallex.base_url', env: 'AIRWALLEX_BASE_URL' },
    
    // System
    { key: 'system.max_file_size', env: 'MAX_FILE_SIZE' }
  ]

  for (const mapping of envMappings) {
    const envValue = process.env[mapping.env]
    if (envValue) {
      try {
        const existing = await prisma.systemConfiguration.findFirst({
          where: { key: mapping.key }
        })

        if (existing && !existing.value) {
          // Update empty configuration with environment value
          const defaultConfig = DEFAULT_CONFIGURATIONS.find(c => c.key === mapping.key)
          if (defaultConfig) {
            await configService.set(mapping.key, {
              ...defaultConfig,
              value: envValue
            }, userId)
          }
        }
      } catch (error) {
        console.error(`Failed to load env default for ${mapping.key}:`, error)
      }
    }
  }

  // Set database type based on environment
  const hasSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  if (hasSupabaseUrl) {
    await configService.set('database.type', {
      key: 'database.type',
      value: 'supabase',
      category: 'DATABASE',
      dataType: 'STRING'
    }, userId)
  }

  // Set storage provider based on environment  
  const storageProvider = process.env.STORAGE_PROVIDER || (hasSupabaseUrl ? 'supabase' : 'local')
  await configService.set('storage.provider', {
    key: 'storage.provider',
    value: storageProvider,
    category: 'STORAGE',
    dataType: 'STRING'
  }, userId)
}