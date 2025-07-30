import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    console.log('=== DELETE API CALLED ===')
    const session = await auth()
    console.log('Session check:', !!session)
    
    if (!session) {
      console.log('No session - returning unauthorized')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('Request body:', body)
    const { fromDate, source, bank } = body

    if (!fromDate) {
      return NextResponse.json({ error: 'fromDate is required' }, { status: 400 })
    }

    // Build the where clause
    const whereClause: any = {
      transactionDate: {
        gte: new Date(fromDate)
      }
    }

    // Delete from the specified date onwards (no end date)

    // Add source filter if provided (API, CSV, etc.)
    if (source) {
      whereClause.source = source
    }

    // Add bank filter if provided (Airwallex, HSBC, etc.)
    if (bank) {
      whereClause.bankAccount = {
        bankName: bank
      }
    }

    console.log('Deleting transactions with criteria:', JSON.stringify(whereClause, null, 2))

    // First, count how many transactions will be deleted
    console.log('Counting transactions...')
    const countResult = await prisma.transaction.count({
      where: whereClause
    })
    console.log('Found', countResult, 'transactions to delete')

    if (countResult === 0) {
      console.log('No transactions found - returning success')
      return NextResponse.json({ 
        success: true, 
        message: 'No transactions found matching the criteria',
        deleted: 0 
      })
    }

    // Delete the transactions
    console.log('Deleting', countResult, 'transactions...')
    const deleteResult = await prisma.transaction.deleteMany({
      where: whereClause
    })
    console.log('Delete result:', deleteResult)

    console.log(`Deleted ${deleteResult.count} transactions`)

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deleteResult.count} transactions`,
      deleted: deleteResult.count
    })

  } catch (error) {
    console.error('=== DELETE ERROR ===')
    console.error('Error deleting transactions:', error)
    console.error('Error type:', typeof error)
    console.error('Error name:', error instanceof Error ? error.name : 'Unknown')
    console.error('Error message:', error instanceof Error ? error.message : error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack')
    return NextResponse.json(
      { error: 'Failed to delete transactions', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}