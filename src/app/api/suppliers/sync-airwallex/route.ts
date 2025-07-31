import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { AirwallexClientStandalone } from '@/lib/airwallex-client-standalone'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/db'

// Environment-aware database client
// Use Supabase if we have the URL configured (production), otherwise use Prisma (local)
const useSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)

// Initialize Supabase client for production
let supabase: any = null
if (useSupabase) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  supabase = createClient(supabaseUrl, supabaseServiceKey)
  console.log('🔵 Using Supabase database client')
} else {
  console.log('🟡 Using Prisma database client')
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if Airwallex is configured
    const isConfigured = process.env.AIRWALLEX_CLIENT_ID && process.env.AIRWALLEX_API_KEY
    
    if (!isConfigured) {
      console.error('[Airwallex Sync] API credentials not configured')
      return NextResponse.json({
        success: false,
        message: 'Airwallex API not configured',
        error: 'Missing AIRWALLEX_CLIENT_ID or AIRWALLEX_API_KEY environment variables.'
      }, { status: 503 })
    }

    console.log('🔄 Starting Airwallex supplier sync...')
    
    // Initialize Airwallex client
    const airwallex = new AirwallexClientStandalone()
    await airwallex.initialize()
    
    // Fetch beneficiaries from Airwallex
    const beneficiaries = await airwallex.getBeneficiaries()
    console.log(`Found ${beneficiaries.length} beneficiaries in Airwallex`)
    
    let created = 0
    let updated = 0
    let errors = 0
    const errorDetails: any[] = []
    const syncedSuppliers: any[] = []
    
    for (const beneficiary of beneficiaries) {
      try {
        // Check if supplier exists (environment-aware)
        let existingSupplier: any = null
        
        if (useSupabase) {
          const { data } = await supabase
            .from('suppliers')
            .select('id, airwallexBeneficiaryId')
            .eq('email', beneficiary.email)
            .single()
          existingSupplier = data
        } else {
          existingSupplier = await prisma.supplier.findFirst({
            where: { email: beneficiary.email },
            select: { id: true, airwallexBeneficiaryId: true }
          })
        }
        
        // Create supplier data with environment-aware field names
        const supplierData = useSupabase ? {
          // Supabase uses snake_case
          first_name: beneficiary.first_name || '',
          last_name: beneficiary.last_name || '',
          email: beneficiary.email,
          phone: beneficiary.phone_number || null,
          company: beneficiary.company_name || null,
          address: beneficiary.address?.street_address || null,
          city: beneficiary.address?.city || null,
          country: beneficiary.address?.country || null,
          postal_code: beneficiary.address?.postcode || null,
          bank_account_name: beneficiary.bank_details?.account_name || null,
          bank_account_number: beneficiary.bank_details?.account_number || null,
          bank_name: beneficiary.bank_details?.bank_name || null,
          swift_code: beneficiary.bank_details?.swift_code || null,
          airwallex_beneficiary_id: beneficiary.id,
          status: 'ACTIVE' as const,
          airwallex_sync_status: 'SYNCED',
          airwallex_last_sync_at: new Date().toISOString(),
          airwallex_raw_data: {
            beneficiaryId: beneficiary.id,
            entityType: beneficiary.entity_type,
            paymentMethods: beneficiary.payment_methods,
            lastSynced: new Date().toISOString()
          }
        } : {
          // Prisma uses camelCase
          firstName: beneficiary.first_name || '',
          lastName: beneficiary.last_name || '',
          companyName: beneficiary.company_name || null,
          email: beneficiary.email,
          phone: beneficiary.phone_number || null,
          address: beneficiary.address?.street_address || null,
          city: beneficiary.address?.city || null,
          state: beneficiary.address?.state || null,
          country: beneficiary.address?.country || null,
          postalCode: beneficiary.address?.postcode || null,
          accountNumber: beneficiary.bank_details?.account_number || null,
          accountName: beneficiary.bank_details?.account_name || null,
          bankName: beneficiary.bank_details?.bank_name || null,
          swiftCode: beneficiary.bank_details?.swift_code || null,
          airwallexBeneficiaryId: beneficiary.id,
          status: 'ACTIVE' as const,
          metadata: {
            airwallex: {
              beneficiaryId: beneficiary.id,
              entityType: beneficiary.entity_type,
              paymentMethods: beneficiary.payment_methods,
              lastSynced: new Date().toISOString()
            }
          }
        }
        
        if (existingSupplier) {
          // Update existing supplier (environment-aware)
          if (useSupabase) {
            const { data: updatedSupplier, error: updateError } = await supabase
              .from('suppliers')
              .update(supplierData)
              .eq('id', existingSupplier.id)
              .select()
              .single()
            
            if (updateError) throw updateError
            updated++
            syncedSuppliers.push(updatedSupplier)
          } else {
            const updatedSupplier = await prisma.supplier.update({
              where: { id: existingSupplier.id },
              data: supplierData
            })
            updated++
            syncedSuppliers.push(updatedSupplier)
          }
          console.log(`✓ Updated supplier: ${beneficiary.email}`)
        } else {
          // Create new supplier (environment-aware)
          if (useSupabase) {
            const { data: newSupplier, error: insertError } = await supabase
              .from('suppliers')
              .insert(supplierData)
              .select()
              .single()
            
            if (insertError) throw insertError
            created++
            syncedSuppliers.push(newSupplier)
          } else {
            const newSupplier = await prisma.supplier.create({
              data: supplierData
            })
            created++
            syncedSuppliers.push(newSupplier)
          }
          console.log(`✓ Created supplier: ${beneficiary.email}`)
        }
        
      } catch (error: any) {
        errors++
        console.error(`Error processing beneficiary ${beneficiary.id}:`, error)
        errorDetails.push({
          beneficiaryId: beneficiary.id,
          email: beneficiary.email,
          error: error.message
        })
      }
    }
    
    const response = {
      success: true,
      message: 'Supplier sync completed',
      data: {
        sync_results: {
          total_beneficiaries: beneficiaries.length,
          new_suppliers: created,
          updated_suppliers: updated,
          errors: errors,
          suppliers_processed: syncedSuppliers.length
        },
        synced_suppliers: syncedSuppliers,
        error_details: errors > 0 ? errorDetails : undefined
      }
    }
    
    console.log('✅ Supplier sync completed')
    console.log(`📊 Summary: ${created} new, ${updated} updated, ${errors} errors`)
    
    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error('❌ Supplier sync failed:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Supplier sync failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if Airwallex is configured
    const isConfigured = process.env.AIRWALLEX_CLIENT_ID && process.env.AIRWALLEX_API_KEY
    
    // Get supplier statistics (environment-aware)
    let totalSuppliers = 0
    let syncedSuppliers = 0
    let airwallexSuppliers: any[] = []
    
    if (useSupabase) {
      const { count: total } = await supabase
        .from('suppliers')
        .select('*', { count: 'exact', head: true })
      
      const { count: synced } = await supabase
        .from('suppliers')
        .select('*', { count: 'exact', head: true })
        .not('airwallex_beneficiary_id', 'is', null)
      
      const { data: suppliers } = await supabase
        .from('suppliers')
        .select('id, first_name, last_name, email, airwallex_beneficiary_id, status, updated_at')
        .not('airwallex_beneficiary_id', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(10)
      
      totalSuppliers = total || 0
      syncedSuppliers = synced || 0
      airwallexSuppliers = suppliers || []
    } else {
      totalSuppliers = await prisma.supplier.count()
      syncedSuppliers = await prisma.supplier.count({
        where: { airwallexBeneficiaryId: { not: null } }
      })
      airwallexSuppliers = await prisma.supplier.findMany({
        where: { airwallexBeneficiaryId: { not: null } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          airwallexBeneficiaryId: true,
          status: true,
          updatedAt: true
        },
        orderBy: { updatedAt: 'desc' },
        take: 10
      })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Supplier sync summary retrieved',
      configured: isConfigured,
      data: {
        database_summary: {
          totalSuppliers: totalSuppliers || 0,
          syncedSuppliers: syncedSuppliers || 0,
          pendingSuppliers: (totalSuppliers || 0) - (syncedSuppliers || 0),
          notConfigured: !isConfigured
        },
        recent_synced_suppliers: (airwallexSuppliers || []).map(supplier => ({
          id: supplier.id,
          name: useSupabase ? `${supplier.first_name} ${supplier.last_name}` : `${supplier.firstName} ${supplier.lastName}`,
          email: supplier.email,
          airwallexBeneficiaryId: useSupabase ? supplier.airwallex_beneficiary_id : supplier.airwallexBeneficiaryId,
          status: supplier.status,
          lastSyncAt: useSupabase ? supplier.updated_at : supplier.updatedAt
        }))
      }
    }, { status: 200 })
  } catch (error) {
    console.error('❌ Failed to get supplier sync summary:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Failed to get supplier sync summary',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}