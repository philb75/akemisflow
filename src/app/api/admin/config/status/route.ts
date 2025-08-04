import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
// Removed dynamic imports - using simple architecture
import { ConfigurationService, getCurrentEnvironment } from '@/lib/config'
import { prisma } from '@/lib/db'

const configService = new ConfigurationService(prisma)

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current configuration status (simplified)
    const databaseType = 'local'
    const storageProvider = 'local'
    
    // Test database connection
    const databaseTest = await (async () => {
      try {
        await prisma.$queryRaw`SELECT 1`
        return { success: true, message: 'Database connection successful' }
      } catch (error) {
        return { 
          success: false, 
          message: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }
      }
    })()
    
    const storageTest = { success: true, message: 'Storage simplified in basic architecture' }

    return NextResponse.json({
      success: true,
      environment: getCurrentEnvironment(),
      status: {
        database: {
          type: databaseType,
          connection: databaseTest
        },
        storage: {
          provider: storageProvider,
          connection: storageTest
        }
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Failed to get configuration status:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve configuration status'
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
    const { action } = body

    if (action === 'refresh') {
      // Clear cache (simplified)
      configService.clearCache()

      // Test connections (simplified)
      const databaseTest = await (async () => {
        try {
          await prisma.$queryRaw`SELECT 1`
          return { success: true, message: 'Database connection successful' }
        } catch (error) {
          return { 
            success: false, 
            message: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }
        }
      })()
      
      const storageTest = { success: true, message: 'Storage simplified in basic architecture' }

      return NextResponse.json({
        success: true,
        message: 'Configuration refreshed successfully',
        tests: {
          database: databaseTest,
          storage: storageTest
        }
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Unknown action'
    }, { status: 400 })
  } catch (error) {
    console.error('Failed to process configuration action:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to process configuration action'
    }, { status: 500 })
  }
}