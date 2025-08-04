import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
// Removed dynamic imports - using simple architecture
import { ConfigurationService } from '@/lib/config'
import { prisma } from '@/lib/db'

const configService = new ConfigurationService(prisma)

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Test database connection using Prisma
    const databaseResult = await (async () => {
      try {
        const userCount = await prisma.user.count()
        return {
          type: 'local',
          success: true,
          userCount,
          message: 'Connected to local PostgreSQL'
        }
      } catch (error) {
        return {
          type: 'local',
          success: false,
          userCount: 0,
          message: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      }
    })()

    // Test storage (simplified - no dynamic provider)
    const storageResult = {
      success: true,
      fileCount: 0,
      folderCount: 0,
      message: 'Storage testing simplified in basic architecture'
    }

    // Get current configuration
    const [databaseType, storageProvider] = await Promise.all([
      configService.get('database.type', 'local'),
      configService.get('storage.provider', 'local')
    ])

    return NextResponse.json({
      success: true,
      message: 'Dynamic configuration demo successful',
      configuration: {
        database: databaseType,
        storage: storageProvider
      },
      tests: {
        database: databaseResult,
        storage: storageResult
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Demo failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Demo failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}