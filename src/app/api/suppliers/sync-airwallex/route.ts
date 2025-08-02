import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { AirwallexClientStandalone } from '@/lib/airwallex-client-standalone'
import { createSupabaseClient } from '@/lib/supabase'
import { prisma } from '@/lib/db'
import { formatSupplierNames } from '@/lib/name-formatter'

// Environment-aware database client
// Use Supabase if we have the URL configured (production), otherwise use Prisma (local)
const useSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)

console.log(useSupabase ? '🔵 Using Supabase database client' : '🟡 Using Prisma database client')

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

    console.log('🔄 Starting Airwallex supplier sync (New Architecture)...')
    console.log(`🗄️  Environment: ${useSupabase ? 'Production (Supabase)' : 'Local (Prisma)'}`)
    
    // Initialize Airwallex client
    const airwallex = new AirwallexClientStandalone()
    await airwallex.initialize()
    
    // Fetch beneficiaries from Airwallex
    const beneficiaries = await airwallex.getBeneficiaries()
    console.log(`📋 Found ${beneficiaries.length} beneficiaries in Airwallex`)
    
    let created = 0
    let updated = 0
    let errors = 0
    const errorDetails: any[] = []
    const syncedAirwallexSuppliers: any[] = []
    
    const supabase = useSupabase ? createSupabaseClient() : null
    
    for (const beneficiary of beneficiaries) {
      try {
        // Apply name formatting rules
        const formattedNames = formatSupplierNames({
          firstName: beneficiary.first_name || '',
          lastName: beneficiary.last_name || ''
        })
        
        // Prepare Airwallex supplier data
        const airwallexSupplierData = {
          beneficiaryId: beneficiary.id,
          entityType: beneficiary.entity_type,
          firstName: formattedNames.firstName,
          lastName: formattedNames.lastName,
          email: beneficiary.email,
          phone: beneficiary.phone_number,
          company: beneficiary.company_name,
          
          // Address fields
          address: beneficiary.address?.street_address,
          city: beneficiary.address?.city,
          state: beneficiary.address?.state,
          postalCode: beneficiary.address?.postcode,
          countryCode: beneficiary.address?.country_code,
          
          // Banking fields
          bankAccountName: beneficiary.bank_details?.account_name,
          bankAccountNumber: beneficiary.bank_details?.account_number,
          bankName: beneficiary.bank_details?.bank_name,
          bankCountryCode: beneficiary.bank_details?.bank_country_code,
          currency: beneficiary.bank_details?.currency,
          iban: beneficiary.bank_details?.iban,
          swiftCode: beneficiary.bank_details?.swift_code,
          localClearingSystem: beneficiary.bank_details?.local_clearing_system,
          
          // Business registration (if applicable)
          businessRegistrationNumber: beneficiary.business_registration?.registration_number,
          businessRegistrationType: beneficiary.business_registration?.registration_type,
          
          // Legal representative (if applicable)
          legalRepFirstName: beneficiary.legal_representative?.first_name,
          legalRepLastName: beneficiary.legal_representative?.last_name,
          legalRepEmail: beneficiary.legal_representative?.email,
          legalRepMobileNumber: beneficiary.legal_representative?.mobile_number,
          legalRepAddress: beneficiary.legal_representative?.address?.street_address,
          legalRepCity: beneficiary.legal_representative?.address?.city,
          legalRepState: beneficiary.legal_representative?.address?.state,
          legalRepPostalCode: beneficiary.legal_representative?.address?.postcode,
          legalRepCountryCode: beneficiary.legal_representative?.address?.country_code,
          legalRepNationality: beneficiary.legal_representative?.nationality,
          legalRepOccupation: beneficiary.legal_representative?.occupation,
          legalRepIdType: beneficiary.legal_representative?.id_type,
          
          // Personal fields (if individual)
          personalEmail: beneficiary.personal_details?.email,
          personalIdNumber: beneficiary.personal_details?.id_number,
          personalNationality: beneficiary.personal_details?.nationality,
          personalOccupation: beneficiary.personal_details?.occupation,
          personalFirstNameChinese: beneficiary.personal_details?.first_name_chinese,
          personalLastNameChinese: beneficiary.personal_details?.last_name_chinese,
          
          // Airwallex specific
          paymentMethods: Array.isArray(beneficiary.payment_methods) 
            ? beneficiary.payment_methods.join(',') 
            : beneficiary.payment_methods,
          capabilities: Array.isArray(beneficiary.capabilities) 
            ? beneficiary.capabilities.join(',') 
            : beneficiary.capabilities,
          payerEntityType: beneficiary.payer_entity_type,
          status: beneficiary.status || 'ACTIVE',
          rawData: beneficiary,
          
          lastFetchedAt: new Date()
        }
        
        // Check if Airwallex supplier already exists
        let existingAirwallexSupplier: any = null
        
        if (useSupabase) {
          const { data, error: lookupError } = await supabase!
            .from('airwallex_suppliers')
            .select('*')
            .eq('beneficiary_id', beneficiary.id)
            .single()
          
          if (lookupError && lookupError.code !== 'PGRST116') {
            console.error(`❌ Error looking up Airwallex supplier ${beneficiary.id}:`, lookupError)
          }
          existingAirwallexSupplier = data
        } else {
          existingAirwallexSupplier = await prisma.airwallexSupplier.findUnique({
            where: { beneficiaryId: beneficiary.id }
          })
        }
        
        if (existingAirwallexSupplier) {
          // Update existing Airwallex supplier
          if (useSupabase) {
            const updateData = {
              entity_type: airwallexSupplierData.entityType,
              first_name: airwallexSupplierData.firstName,
              last_name: airwallexSupplierData.lastName,
              email: airwallexSupplierData.email,
              phone: airwallexSupplierData.phone,
              company: airwallexSupplierData.company,
              address: airwallexSupplierData.address,
              city: airwallexSupplierData.city,
              state: airwallexSupplierData.state,
              postal_code: airwallexSupplierData.postalCode,
              country_code: airwallexSupplierData.countryCode,
              bank_account_name: airwallexSupplierData.bankAccountName,
              bank_account_number: airwallexSupplierData.bankAccountNumber,
              bank_name: airwallexSupplierData.bankName,
              bank_country_code: airwallexSupplierData.bankCountryCode,
              currency: airwallexSupplierData.currency,
              iban: airwallexSupplierData.iban,
              swift_code: airwallexSupplierData.swiftCode,
              local_clearing_system: airwallexSupplierData.localClearingSystem,
              business_registration_number: airwallexSupplierData.businessRegistrationNumber,
              business_registration_type: airwallexSupplierData.businessRegistrationType,
              legal_rep_first_name: airwallexSupplierData.legalRepFirstName,
              legal_rep_last_name: airwallexSupplierData.legalRepLastName,
              legal_rep_email: airwallexSupplierData.legalRepEmail,
              legal_rep_mobile_number: airwallexSupplierData.legalRepMobileNumber,
              legal_rep_address: airwallexSupplierData.legalRepAddress,
              legal_rep_city: airwallexSupplierData.legalRepCity,
              legal_rep_state: airwallexSupplierData.legalRepState,
              legal_rep_postal_code: airwallexSupplierData.legalRepPostalCode,
              legal_rep_country_code: airwallexSupplierData.legalRepCountryCode,
              legal_rep_nationality: airwallexSupplierData.legalRepNationality,
              legal_rep_occupation: airwallexSupplierData.legalRepOccupation,
              legal_rep_id_type: airwallexSupplierData.legalRepIdType,
              personal_email: airwallexSupplierData.personalEmail,
              personal_id_number: airwallexSupplierData.personalIdNumber,
              personal_nationality: airwallexSupplierData.personalNationality,
              personal_occupation: airwallexSupplierData.personalOccupation,
              personal_first_name_chinese: airwallexSupplierData.personalFirstNameChinese,
              personal_last_name_chinese: airwallexSupplierData.personalLastNameChinese,
              payment_methods: airwallexSupplierData.paymentMethods,
              capabilities: airwallexSupplierData.capabilities,
              payer_entity_type: airwallexSupplierData.payerEntityType,
              status: airwallexSupplierData.status,
              raw_data: airwallexSupplierData.rawData,
              last_fetched_at: new Date().toISOString(),
              sync_error: null
            }
            
            const { data: updatedSupplier, error: updateError } = await supabase!
              .from('airwallex_suppliers')
              .update(updateData)
              .eq('beneficiary_id', beneficiary.id)
              .select()
              .single()
            
            if (updateError) {
              console.error(`❌ Update error for Airwallex supplier ${beneficiary.id}:`, updateError)
              throw updateError
            }
            
            updated++
            syncedAirwallexSuppliers.push(updatedSupplier)
          } else {
            const updatedSupplier = await prisma.airwallexSupplier.update({
              where: { beneficiaryId: beneficiary.id },
              data: { ...airwallexSupplierData, syncError: null }
            })
            updated++
            syncedAirwallexSuppliers.push(updatedSupplier)
          }
          console.log(`✓ Updated Airwallex supplier: ${beneficiary.email}`)
        } else {
          // Create new Airwallex supplier
          if (useSupabase) {
            const insertData = {
              beneficiary_id: airwallexSupplierData.beneficiaryId,
              entity_type: airwallexSupplierData.entityType,
              first_name: airwallexSupplierData.firstName,
              last_name: airwallexSupplierData.lastName,
              email: airwallexSupplierData.email,
              phone: airwallexSupplierData.phone,
              company: airwallexSupplierData.company,
              address: airwallexSupplierData.address,
              city: airwallexSupplierData.city,
              state: airwallexSupplierData.state,
              postal_code: airwallexSupplierData.postalCode,
              country_code: airwallexSupplierData.countryCode,
              bank_account_name: airwallexSupplierData.bankAccountName,
              bank_account_number: airwallexSupplierData.bankAccountNumber,
              bank_name: airwallexSupplierData.bankName,
              bank_country_code: airwallexSupplierData.bankCountryCode,
              currency: airwallexSupplierData.currency,
              iban: airwallexSupplierData.iban,
              swift_code: airwallexSupplierData.swiftCode,
              local_clearing_system: airwallexSupplierData.localClearingSystem,
              business_registration_number: airwallexSupplierData.businessRegistrationNumber,
              business_registration_type: airwallexSupplierData.businessRegistrationType,
              legal_rep_first_name: airwallexSupplierData.legalRepFirstName,
              legal_rep_last_name: airwallexSupplierData.legalRepLastName,
              legal_rep_email: airwallexSupplierData.legalRepEmail,
              legal_rep_mobile_number: airwallexSupplierData.legalRepMobileNumber,
              legal_rep_address: airwallexSupplierData.legalRepAddress,
              legal_rep_city: airwallexSupplierData.legalRepCity,
              legal_rep_state: airwallexSupplierData.legalRepState,
              legal_rep_postal_code: airwallexSupplierData.legalRepPostalCode,
              legal_rep_country_code: airwallexSupplierData.legalRepCountryCode,
              legal_rep_nationality: airwallexSupplierData.legalRepNationality,
              legal_rep_occupation: airwallexSupplierData.legalRepOccupation,
              legal_rep_id_type: airwallexSupplierData.legalRepIdType,
              personal_email: airwallexSupplierData.personalEmail,
              personal_id_number: airwallexSupplierData.personalIdNumber,
              personal_nationality: airwallexSupplierData.personalNationality,
              personal_occupation: airwallexSupplierData.personalOccupation,
              personal_first_name_chinese: airwallexSupplierData.personalFirstNameChinese,
              personal_last_name_chinese: airwallexSupplierData.personalLastNameChinese,
              payment_methods: airwallexSupplierData.paymentMethods,
              capabilities: airwallexSupplierData.capabilities,
              payer_entity_type: airwallexSupplierData.payerEntityType,
              status: airwallexSupplierData.status,
              raw_data: airwallexSupplierData.rawData,
              last_fetched_at: new Date().toISOString()
            }
            
            const { data: newSupplier, error: insertError } = await supabase!
              .from('airwallex_suppliers')
              .insert(insertData)
              .select()
              .single()
            
            if (insertError) {
              console.error(`❌ Insert error for Airwallex supplier ${beneficiary.id}:`, {
                message: insertError.message,
                code: insertError.code,
                hint: insertError.hint,
                details: insertError.details
              })
              throw insertError
            }
            
            created++
            syncedAirwallexSuppliers.push(newSupplier)
          } else {
            const newSupplier = await prisma.airwallexSupplier.create({
              data: airwallexSupplierData
            })
            created++
            syncedAirwallexSuppliers.push(newSupplier)
          }
          console.log(`✓ Created Airwallex supplier: ${beneficiary.email}`)
        }
        
      } catch (error: any) {
        errors++
        console.error(`❌ Error processing beneficiary ${beneficiary.id} (${beneficiary.email}):`, {
          message: error.message,
          code: error.code,
          stack: useSupabase ? undefined : error.stack
        })
        errorDetails.push({
          beneficiaryId: beneficiary.id,
          email: beneficiary.email,
          error: error.message,
          errorCode: error.code
        })
      }
    }
    
    const response = {
      success: true,
      message: 'Airwallex supplier sync completed (New Architecture)',
      data: {
        sync_results: {
          total_beneficiaries: beneficiaries.length,
          new_airwallex_suppliers: created,
          updated_airwallex_suppliers: updated,
          errors: errors,
          airwallex_suppliers_processed: syncedAirwallexSuppliers.length
        },
        synced_airwallex_suppliers: syncedAirwallexSuppliers,
        error_details: errors > 0 ? errorDetails : undefined
      }
    }
    
    console.log('✅ Airwallex supplier sync completed')
    console.log(`📊 Summary: ${created} new, ${updated} updated, ${errors} errors`)
    
    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error('❌ Airwallex supplier sync failed:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Airwallex supplier sync failed',
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
    
    const supabase = useSupabase ? createSupabaseClient() : null
    
    // Get statistics (environment-aware)
    let totalSuppliers = 0
    let totalAirwallexSuppliers = 0
    let linkedSuppliers = 0
    let airwallexSuppliers: any[] = []
    
    if (useSupabase) {
      // Get total suppliers
      const { count: total } = await supabase!
        .from('suppliers')
        .select('*', { count: 'exact', head: true })
      
      // Get total Airwallex suppliers
      const { count: airwallexTotal } = await supabase!
        .from('airwallex_suppliers')
        .select('*', { count: 'exact', head: true })
      
      // Get linked suppliers
      const { count: linked } = await supabase!
        .from('airwallex_suppliers')
        .select('*', { count: 'exact', head: true })
        .not('linked_supplier_id', 'is', null)
      
      // Get recent Airwallex suppliers
      const { data: suppliers } = await supabase!
        .from('airwallex_suppliers')
        .select(`
          id, 
          beneficiary_id, 
          first_name, 
          last_name, 
          email, 
          status, 
          last_fetched_at,
          linked_supplier_id,
          linked_supplier:suppliers(id, first_name, last_name)
        `)
        .order('last_fetched_at', { ascending: false })
        .limit(10)
      
      totalSuppliers = total || 0
      totalAirwallexSuppliers = airwallexTotal || 0
      linkedSuppliers = linked || 0
      airwallexSuppliers = suppliers || []
    } else {
      totalSuppliers = await prisma.supplier.count()
      totalAirwallexSuppliers = await prisma.airwallexSupplier.count()
      linkedSuppliers = await prisma.airwallexSupplier.count({
        where: { linkedSupplierId: { not: null } }
      })
      
      airwallexSuppliers = await prisma.airwallexSupplier.findMany({
        select: {
          id: true,
          beneficiaryId: true,
          firstName: true,
          lastName: true,
          email: true,
          status: true,
          lastFetchedAt: true,
          linkedSupplierId: true,
          linkedSupplier: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { lastFetchedAt: 'desc' },
        take: 10
      })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Supplier sync summary retrieved (New Architecture)',
      configured: isConfigured,
      data: {
        database_summary: {
          totalSuppliers: totalSuppliers || 0,
          totalAirwallexSuppliers: totalAirwallexSuppliers || 0,
          linkedSuppliers: linkedSuppliers || 0,
          unlinkedAirwallexSuppliers: (totalAirwallexSuppliers || 0) - (linkedSuppliers || 0),
          notConfigured: !isConfigured
        },
        recent_airwallex_suppliers: (airwallexSuppliers || []).map(supplier => ({
          id: supplier.id,
          beneficiaryId: useSupabase ? supplier.beneficiary_id : supplier.beneficiaryId,
          name: useSupabase ? `${supplier.first_name} ${supplier.last_name}` : `${supplier.firstName} ${supplier.lastName}`,
          email: supplier.email,
          status: supplier.status,
          lastSyncAt: useSupabase ? supplier.last_fetched_at : supplier.lastFetchedAt,
          isLinked: useSupabase ? !!supplier.linked_supplier_id : !!supplier.linkedSupplierId,
          linkedSupplier: supplier.linked_supplier ? {
            id: supplier.linked_supplier.id,
            name: useSupabase 
              ? `${supplier.linked_supplier.first_name} ${supplier.linked_supplier.last_name}`
              : `${supplier.linked_supplier.firstName} ${supplier.linked_supplier.lastName}`
          } : null
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