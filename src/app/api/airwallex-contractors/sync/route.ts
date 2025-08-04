import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🗑️ Deleting all Airwallex contractors...')
    
    // Delete all Airwallex contractors
    const deleteResult = await prisma.airwallexContractor.deleteMany({})
    
    console.log(`✅ Deleted ${deleteResult.count} Airwallex contractors`)
    
    return NextResponse.json({
      success: true,
      message: 'Airwallex contractors deleted successfully',
      data: {
        deletedCount: deleteResult.count
      }
    }, { status: 200 })
  } catch (error) {
    console.error('❌ Failed to delete Airwallex contractors:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Failed to delete Airwallex contractors',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔄 Re-importing Airwallex contractors...')
    
    // Trigger the contractors sync endpoint
    const syncResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/contractors/sync-airwallex`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (!syncResponse.ok) {
      const error = await syncResponse.json()
      throw new Error(error.error || 'Sync failed')
    }
    
    const syncResult = await syncResponse.json()
    
    return NextResponse.json({
      success: true,
      message: 'Airwallex contractors re-imported successfully',
      data: syncResult.data
    }, { status: 200 })
  } catch (error) {
    console.error('❌ Failed to re-import Airwallex contractors:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Failed to re-import Airwallex contractors',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}