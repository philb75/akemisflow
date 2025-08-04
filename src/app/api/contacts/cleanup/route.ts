import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function DELETE(request: NextRequest) {
  try {
    console.log('🗑️ Starting complete contact cleanup...')
    
    // Delete all Airwallex contractors
    const airwallexDeleteResult = await prisma.airwallexContractor.deleteMany({})
    console.log(`✅ Deleted ${airwallexDeleteResult.count} Airwallex contractors`)
    
    // Delete all contractors (optional - comment out if you want to keep contractor records)
    const contractorDeleteResult = await prisma.contractor.deleteMany({})
    console.log(`✅ Deleted ${contractorDeleteResult.count} contractors`)
    
    // Also delete any Contact table records if they exist
    try {
      const contactDeleteResult = await prisma.contact.deleteMany({})
      console.log(`✅ Deleted ${contactDeleteResult.count} contacts`)
    } catch (error) {
      console.log('ℹ️ No Contact table or already empty')
    }
    
    return NextResponse.json({
      success: true,
      message: 'All contacts deleted successfully',
      data: {
        airwallexContractorsDeleted: airwallexDeleteResult.count,
        contractorsDeleted: contractorDeleteResult.count
      }
    }, { status: 200 })
  } catch (error) {
    console.error('❌ Failed to delete contacts:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Failed to delete contacts',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Return current counts
    const airwallexCount = await prisma.airwallexContractor.count()
    const contractorCount = await prisma.contractor.count()
    
    let contactCount = 0
    try {
      contactCount = await prisma.contact.count()
    } catch (error) {
      // Contact table might not exist
    }
    
    return NextResponse.json({
      success: true,
      message: 'Current contact counts',
      data: {
        airwallexContractors: airwallexCount,
        contractors: contractorCount,
        contacts: contactCount
      }
    }, { status: 200 })
  } catch (error) {
    console.error('❌ Failed to get contact counts:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Failed to get contact counts',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}