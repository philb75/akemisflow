import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createSupabaseClient } from '@/lib/supabase'

// Environment-aware database client
const useSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)

export async function DELETE(request: NextRequest) {
  try {
    console.log('🗑️ Starting complete contact cleanup...')
    console.log(useSupabase ? '🔵 Using Supabase database client' : '🟡 Using Prisma database client')
    
    let airwallexDeleteResult: any = { count: 0 }
    let contractorDeleteResult: any = { count: 0 }
    
    if (useSupabase) {
      const supabase = createSupabaseClient()
      
      // Get initial counts
      const { count: airwallexInitialCount } = await supabase
        .from('airwallex_contractors')
        .select('*', { count: 'exact', head: true })
      
      const { count: contractorInitialCount } = await supabase
        .from('contractors')
        .select('*', { count: 'exact', head: true })
      
      // Delete all Airwallex contractors
      const { error: airwallexError } = await supabase
        .from('airwallex_contractors')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all (Supabase requires a condition)
      
      if (airwallexError) {
        throw new Error(`Failed to delete Airwallex contractors: ${airwallexError.message}`)
      }
      
      airwallexDeleteResult.count = airwallexInitialCount || 0
      console.log(`✅ Deleted ${airwallexDeleteResult.count} Airwallex contractors`)
      
      // Delete all contractors
      const { error: contractorError } = await supabase
        .from('contractors')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all (Supabase requires a condition)
      
      if (contractorError) {
        throw new Error(`Failed to delete contractors: ${contractorError.message}`)
      }
      
      contractorDeleteResult.count = contractorInitialCount || 0
      console.log(`✅ Deleted ${contractorDeleteResult.count} contractors`)
    } else {
      // Delete all Airwallex contractors
      airwallexDeleteResult = await prisma.airwallexContractor.deleteMany({})
      console.log(`✅ Deleted ${airwallexDeleteResult.count} Airwallex contractors`)
      
      // Delete all contractors
      contractorDeleteResult = await prisma.contractor.deleteMany({})
      console.log(`✅ Deleted ${contractorDeleteResult.count} contractors`)
    }
    
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
    let airwallexCount = 0
    let contractorCount = 0
    
    if (useSupabase) {
      const supabase = createSupabaseClient()
      
      const { count: airwallex } = await supabase
        .from('airwallex_contractors')
        .select('*', { count: 'exact', head: true })
      
      const { count: contractor } = await supabase
        .from('contractors')
        .select('*', { count: 'exact', head: true })
      
      airwallexCount = airwallex || 0
      contractorCount = contractor || 0
    } else {
      airwallexCount = await prisma.airwallexContractor.count()
      contractorCount = await prisma.contractor.count()
    }
    
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