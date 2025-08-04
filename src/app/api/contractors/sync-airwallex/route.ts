import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { AirwallexClientStandalone } from '@/lib/airwallex-client-standalone'
import { createSupabaseClient } from '@/lib/supabase'
import { prisma } from '@/lib/db'
import { formatContractorNames } from '@/lib/name-formatter'

// Environment-aware database client
// Use Supabase if we have the URL configured (production), otherwise use Prisma (local)
// TEMPORARY: Force use of Prisma for debugging
const useSupabase = false // !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)

console.log(useSupabase ? '🔵 Using Supabase database client' : '🟡 Using Prisma database client')

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    // TEMPORARY: Allow access for debugging (remove this later)
    if (!session && process.env.NODE_ENV === 'development') {
      console.log('⚠️ TEMPORARY: Allowing unauthenticated access for debugging')
    } else if (!session) {
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

    console.log('🔄 Starting Airwallex contractor sync (New Architecture)...')
    console.log(`🗄️  Environment: ${useSupabase ? 'Production (Supabase)' : 'Local (Prisma)'}`)
    
    // Initialize Airwallex client
    const airwallex = new AirwallexClientStandalone()
    await airwallex.initialize()
    
    // Fetch beneficiaries from Airwallex
    const allBeneficiaries = await airwallex.getBeneficiaries()
    console.log(`📋 Found ${allBeneficiaries.length} total beneficiaries in Airwallex`)
    
    // TEMPORARY: Show all beneficiaries for debugging (remove filtering)
    console.log('🔍 DEBUG: Showing all beneficiaries to identify filtering issues...')
    
    if (allBeneficiaries.length > 0) {
      console.log('📋 Sample beneficiaries found:')
      allBeneficiaries.slice(0, 5).forEach((beneficiary, index) => {
        console.log(`${index + 1}. ${beneficiary.first_name} ${beneficiary.last_name}`)
        console.log(`   Company: ${beneficiary.company_name || 'N/A'}`)
        console.log(`   Entity: ${beneficiary.entity_type}`)
        console.log(`   Email: ${beneficiary.email || 'N/A'}`)
        console.log('')
      })
      
      // Check for any Akemis-related contacts
      const akemisRelated = allBeneficiaries.filter(b => 
        (b.company_name && b.company_name.toLowerCase().includes('akemis')) ||
        (b.first_name && b.first_name.toLowerCase().includes('akemis')) ||
        (b.last_name && b.last_name.toLowerCase().includes('akemis'))
      )
      console.log(`🎯 Found ${akemisRelated.length} Akemis-related beneficiaries`)
    }
    
    // For now, use all beneficiaries to test the import process
    const beneficiaries = allBeneficiaries
    
    console.log(`🎯 Using ${beneficiaries.length} beneficiaries (all, for debugging)`)
    
    let created = 0
    let updated = 0
    let errors = 0
    let akemisContractorCreated = 0
    let akemisContractorLinked = 0
    const errorDetails: any[] = []
    const syncedAirwallexContractors: any[] = []
    
    const supabase = useSupabase ? createSupabaseClient() : null
    
    for (const beneficiary of beneficiaries) {
      try {
        // Apply name formatting rules
        const formattedNames = formatContractorNames({
          firstName: beneficiary.first_name || '',
          lastName: beneficiary.last_name || ''
        })
        
        // Prepare Airwallex contractor data
        const airwallexContractorData = {
          beneficiaryId: beneficiary.beneficiary_id,
          entityType: beneficiary.beneficiary?.entity_type,
          firstName: formattedNames.firstName,
          lastName: formattedNames.lastName,
          email: beneficiary.beneficiary?.additional_info?.personal_email,
          phone: beneficiary.beneficiary?.phone_number,
          company: beneficiary.beneficiary?.company_name,
          
          // Address fields
          address: beneficiary.beneficiary?.address?.street_address,
          city: beneficiary.beneficiary?.address?.city,
          state: beneficiary.beneficiary?.address?.state,
          postalCode: beneficiary.beneficiary?.address?.postcode,
          countryCode: beneficiary.beneficiary?.address?.country_code,
          
          // Banking fields
          bankAccountName: beneficiary.beneficiary?.bank_details?.account_name,
          bankAccountNumber: beneficiary.beneficiary?.bank_details?.account_number,
          bankName: beneficiary.beneficiary?.bank_details?.bank_name,
          bankCountryCode: beneficiary.beneficiary?.bank_details?.bank_country_code,
          currency: beneficiary.beneficiary?.bank_details?.account_currency,
          iban: beneficiary.beneficiary?.bank_details?.iban,
          swiftCode: beneficiary.beneficiary?.bank_details?.swift_code,
          localClearingSystem: beneficiary.beneficiary?.bank_details?.local_clearing_system,
          
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
        
        // Check if Airwallex contractor already exists
        let existingAirwallexContractor: any = null
        
        if (useSupabase) {
          const { data, error: lookupError } = await supabase!
            .from('airwallex_contractors')
            .select('*')
            .eq('beneficiary_id', beneficiary.beneficiary_id)
            .single()
          
          if (lookupError && lookupError.code !== 'PGRST116') {
            console.error(`❌ Error looking up Airwallex contractor ${beneficiary.beneficiary_id}:`, lookupError)
          }
          existingAirwallexContractor = data
        } else {
          existingAirwallexContractor = await prisma.airwallexContractor.findUnique({
            where: { beneficiaryId: beneficiary.beneficiary_id }
          })
        }
        
        if (existingAirwallexContractor) {
          // Update existing Airwallex contractor
          if (useSupabase) {
            const updateData = {
              entity_type: airwallexContractorData.entityType,
              first_name: airwallexContractorData.firstName,
              last_name: airwallexContractorData.lastName,
              email: airwallexContractorData.email,
              phone: airwallexContractorData.phone,
              company: airwallexContractorData.company,
              address: airwallexContractorData.address,
              city: airwallexContractorData.city,
              state: airwallexContractorData.state,
              postal_code: airwallexContractorData.postalCode,
              country_code: airwallexContractorData.countryCode,
              bank_account_name: airwallexContractorData.bankAccountName,
              bank_account_number: airwallexContractorData.bankAccountNumber,
              bank_name: airwallexContractorData.bankName,
              bank_country_code: airwallexContractorData.bankCountryCode,
              currency: airwallexContractorData.currency,
              iban: airwallexContractorData.iban,
              swift_code: airwallexContractorData.swiftCode,
              local_clearing_system: airwallexContractorData.localClearingSystem,
              business_registration_number: airwallexContractorData.businessRegistrationNumber,
              business_registration_type: airwallexContractorData.businessRegistrationType,
              legal_rep_first_name: airwallexContractorData.legalRepFirstName,
              legal_rep_last_name: airwallexContractorData.legalRepLastName,
              legal_rep_email: airwallexContractorData.legalRepEmail,
              legal_rep_mobile_number: airwallexContractorData.legalRepMobileNumber,
              legal_rep_address: airwallexContractorData.legalRepAddress,
              legal_rep_city: airwallexContractorData.legalRepCity,
              legal_rep_state: airwallexContractorData.legalRepState,
              legal_rep_postal_code: airwallexContractorData.legalRepPostalCode,
              legal_rep_country_code: airwallexContractorData.legalRepCountryCode,
              legal_rep_nationality: airwallexContractorData.legalRepNationality,
              legal_rep_occupation: airwallexContractorData.legalRepOccupation,
              legal_rep_id_type: airwallexContractorData.legalRepIdType,
              personal_email: airwallexContractorData.personalEmail,
              personal_id_number: airwallexContractorData.personalIdNumber,
              personal_nationality: airwallexContractorData.personalNationality,
              personal_occupation: airwallexContractorData.personalOccupation,
              personal_first_name_chinese: airwallexContractorData.personalFirstNameChinese,
              personal_last_name_chinese: airwallexContractorData.personalLastNameChinese,
              payment_methods: airwallexContractorData.paymentMethods,
              capabilities: airwallexContractorData.capabilities,
              payer_entity_type: airwallexContractorData.payerEntityType,
              status: airwallexContractorData.status,
              raw_data: airwallexContractorData.rawData,
              last_fetched_at: new Date().toISOString(),
              sync_error: null
            }
            
            const { data: updatedContractor, error: updateError } = await supabase!
              .from('airwallex_contractors')
              .update(updateData)
              .eq('beneficiary_id', beneficiary.beneficiary_id)
              .select()
              .single()
            
            if (updateError) {
              console.error(`❌ Update error for Airwallex contractor ${beneficiary.beneficiary_id}:`, updateError)
              throw updateError
            }
            
            updated++
            syncedAirwallexContractors.push(updatedContractor)
          } else {
            const updatedContractor = await prisma.airwallexContractor.update({
              where: { beneficiaryId: beneficiary.beneficiary_id },
              data: { ...airwallexContractorData, syncError: null }
            })
            updated++
            syncedAirwallexContractors.push(updatedContractor)
          }
          console.log(`✓ Updated Airwallex contractor: ${beneficiary.beneficiary?.additional_info?.personal_email || beneficiary.beneficiary_id}`)
        } else {
          // Create new Airwallex contractor
          if (useSupabase) {
            const insertData = {
              beneficiary_id: airwallexContractorData.beneficiaryId,
              entity_type: airwallexContractorData.entityType,
              first_name: airwallexContractorData.firstName,
              last_name: airwallexContractorData.lastName,
              email: airwallexContractorData.email,
              phone: airwallexContractorData.phone,
              company: airwallexContractorData.company,
              address: airwallexContractorData.address,
              city: airwallexContractorData.city,
              state: airwallexContractorData.state,
              postal_code: airwallexContractorData.postalCode,
              country_code: airwallexContractorData.countryCode,
              bank_account_name: airwallexContractorData.bankAccountName,
              bank_account_number: airwallexContractorData.bankAccountNumber,
              bank_name: airwallexContractorData.bankName,
              bank_country_code: airwallexContractorData.bankCountryCode,
              currency: airwallexContractorData.currency,
              iban: airwallexContractorData.iban,
              swift_code: airwallexContractorData.swiftCode,
              local_clearing_system: airwallexContractorData.localClearingSystem,
              business_registration_number: airwallexContractorData.businessRegistrationNumber,
              business_registration_type: airwallexContractorData.businessRegistrationType,
              legal_rep_first_name: airwallexContractorData.legalRepFirstName,
              legal_rep_last_name: airwallexContractorData.legalRepLastName,
              legal_rep_email: airwallexContractorData.legalRepEmail,
              legal_rep_mobile_number: airwallexContractorData.legalRepMobileNumber,
              legal_rep_address: airwallexContractorData.legalRepAddress,
              legal_rep_city: airwallexContractorData.legalRepCity,
              legal_rep_state: airwallexContractorData.legalRepState,
              legal_rep_postal_code: airwallexContractorData.legalRepPostalCode,
              legal_rep_country_code: airwallexContractorData.legalRepCountryCode,
              legal_rep_nationality: airwallexContractorData.legalRepNationality,
              legal_rep_occupation: airwallexContractorData.legalRepOccupation,
              legal_rep_id_type: airwallexContractorData.legalRepIdType,
              personal_email: airwallexContractorData.personalEmail,
              personal_id_number: airwallexContractorData.personalIdNumber,
              personal_nationality: airwallexContractorData.personalNationality,
              personal_occupation: airwallexContractorData.personalOccupation,
              personal_first_name_chinese: airwallexContractorData.personalFirstNameChinese,
              personal_last_name_chinese: airwallexContractorData.personalLastNameChinese,
              payment_methods: airwallexContractorData.paymentMethods,
              capabilities: airwallexContractorData.capabilities,
              payer_entity_type: airwallexContractorData.payerEntityType,
              status: airwallexContractorData.status,
              raw_data: airwallexContractorData.rawData,
              last_fetched_at: new Date().toISOString()
            }
            
            const { data: newContractor, error: insertError } = await supabase!
              .from('airwallex_contractors')
              .insert(insertData)
              .select()
              .single()
            
            if (insertError) {
              console.error(`❌ Insert error for Airwallex contractor ${beneficiary.beneficiary_id}:`, {
                message: insertError.message,
                code: insertError.code,
                hint: insertError.hint,
                details: insertError.details
              })
              throw insertError
            }
            
            created++
            syncedAirwallexContractors.push(newContractor)
          } else {
            const newContractor = await prisma.airwallexContractor.create({
              data: airwallexContractorData
            })
            created++
            syncedAirwallexContractors.push(newContractor)
          }
          console.log(`✓ Created Airwallex contractor: ${beneficiary.beneficiary?.additional_info?.personal_email || beneficiary.beneficiary_id}`)
        }

        // Auto-create AkemisFlow contractor if it doesn't exist
        try {
          const beneficiaryId = beneficiary.beneficiary_id
          
          // Check if an AkemisFlow contractor already exists with this airwallexContactId
          let existingContractor: any = null
          
          if (useSupabase) {
            const { data, error: lookupError } = await supabase!
              .from('contractors')
              .select('*')
              .eq('airwallex_contact_id', beneficiaryId)
              .single()
            
            if (lookupError && lookupError.code !== 'PGRST116') {
              console.error(`❌ Error looking up AkemisFlow contractor with airwallexContactId ${beneficiaryId}:`, lookupError)
            }
            existingContractor = data
          } else {
            existingContractor = await prisma.contractor.findFirst({
              where: { airwallexContactId: beneficiaryId }
            })
          }

          if (!existingContractor) {
            // Create new AkemisFlow contractor from Airwallex data
            const contractorData = {
              firstName: formattedNames.firstName,
              lastName: formattedNames.lastName,
              email: beneficiary.beneficiary?.additional_info?.personal_email || `${beneficiaryId}@airwallex.com`,
              phone: beneficiary.beneficiary?.phone_number,
              company: beneficiary.beneficiary?.company_name,
              
              // Address fields  
              address: beneficiary.beneficiary?.address?.street_address,
              city: beneficiary.beneficiary?.address?.city,
              postalCode: beneficiary.beneficiary?.address?.postcode,
              country: beneficiary.beneficiary?.address?.country_code,
              addressState: beneficiary.beneficiary?.address?.state,
              addressCountryCode: beneficiary.beneficiary?.address?.country_code,
              
              // Banking fields
              bankAccountName: beneficiary.beneficiary?.bank_details?.account_name,
              bankAccountNumber: beneficiary.beneficiary?.bank_details?.account_number,
              bankAccountCurrency: beneficiary.beneficiary?.bank_details?.account_currency || 'EUR',
              bankName: beneficiary.beneficiary?.bank_details?.bank_name,
              bankCountryCode: beneficiary.beneficiary?.bank_details?.bank_country_code,
              swiftCode: beneficiary.beneficiary?.bank_details?.swift_code,
              iban: beneficiary.beneficiary?.bank_details?.iban,
              
              // Link to Airwallex
              airwallexContactId: beneficiaryId,
              
              // Default values
              status: 'ACTIVE',
              isActive: true,
              preferredCurrency: beneficiary.bank_details?.currency || 'EUR'
            }

            if (useSupabase) {
              const insertData = {
                first_name: contractorData.firstName,
                last_name: contractorData.lastName,
                email: contractorData.email,
                phone: contractorData.phone,
                company: contractorData.company,
                address: contractorData.address,
                city: contractorData.city,
                postal_code: contractorData.postalCode,
                country: contractorData.country,
                address_state: contractorData.addressState,
                address_country_code: contractorData.addressCountryCode,
                bank_account_name: contractorData.bankAccountName,
                bank_account_number: contractorData.bankAccountNumber,
                bank_account_currency: contractorData.bankAccountCurrency,
                bank_name: contractorData.bankName,
                bank_country_code: contractorData.bankCountryCode,
                swift_code: contractorData.swiftCode,
                iban: contractorData.iban,
                airwallex_contact_id: contractorData.airwallexContactId,
                status: contractorData.status,
                is_active: contractorData.isActive,
                preferred_currency: contractorData.preferredCurrency
              }
              
              const { data: newContractor, error: insertError } = await supabase!
                .from('contractors')
                .insert(insertData)
                .select()
                .single()
              
              if (insertError) {
                console.error(`❌ Failed to create AkemisFlow contractor for ${beneficiaryId}:`, insertError)
              } else {
                akemisContractorCreated++
                console.log(`✓ Auto-created AkemisFlow contractor: ${contractorData.email} (linked to ${beneficiaryId})`)
              }
            } else {
              const newContractor = await prisma.contractor.create({
                data: contractorData
              })
              akemisContractorCreated++
              console.log(`✓ Auto-created AkemisFlow contractor: ${contractorData.email} (linked to ${beneficiaryId})`)
            }
          } else {
            akemisContractorLinked++
            console.log(`✓ AkemisFlow contractor already exists for ${beneficiaryId}: ${existingContractor.email || existingContractor.first_name + ' ' + existingContractor.last_name}`)
          }
        } catch (contractorError: any) {
          console.error(`❌ Failed to auto-create AkemisFlow contractor for ${beneficiary.beneficiary_id}:`, {
            message: contractorError.message,
            code: contractorError.code
          })
          // Don't increment errors count for this as it's a secondary operation
        }
        
      } catch (error: any) {
        errors++
        console.error(`❌ Error processing beneficiary ${beneficiary.beneficiary_id} (${beneficiary.beneficiary?.additional_info?.personal_email}):`, {
          message: error.message,
          code: error.code,
          stack: useSupabase ? undefined : error.stack
        })
        errorDetails.push({
          beneficiaryId: beneficiary.beneficiary_id,
          email: beneficiary.beneficiary?.additional_info?.personal_email,
          error: error.message,
          errorCode: error.code
        })
      }
    }
    
    const response = {
      success: true,
      message: 'Airwallex contractor sync completed with auto-creation of AkemisFlow contractors',
      data: {
        sync_results: {
          total_beneficiaries: beneficiaries.length,
          new_airwallex_contractors: created,
          updated_airwallex_contractors: updated,
          new_akemis_contractors: akemisContractorCreated,
          existing_akemis_contractors: akemisContractorLinked,
          errors: errors,
          airwallex_contractors_processed: syncedAirwallexContractors.length
        },
        synced_airwallex_contractors: syncedAirwallexContractors,
        error_details: errors > 0 ? errorDetails : undefined
      }
    }
    
    console.log('✅ Airwallex contractor sync completed with auto-creation')
    console.log(`📊 Summary: ${created} new Airwallex, ${updated} updated Airwallex, ${akemisContractorCreated} new AkemisFlow, ${akemisContractorLinked} existing AkemisFlow, ${errors} errors`)
    
    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error('❌ Airwallex contractor sync failed:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Airwallex contractor sync failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    // TEMPORARY: Allow access for debugging (remove this later)
    if (!session && process.env.NODE_ENV === 'development') {
      console.log('⚠️ TEMPORARY: Allowing unauthenticated access for debugging')
    } else if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if Airwallex is configured
    const isConfigured = process.env.AIRWALLEX_CLIENT_ID && process.env.AIRWALLEX_API_KEY
    
    const supabase = useSupabase ? createSupabaseClient() : null
    
    // Get statistics (environment-aware)
    let totalContractors = 0
    let totalAirwallexContractors = 0
    let linkedContractors = 0
    let airwallexContractors: any[] = []
    
    if (useSupabase) {
      // Get total contractors
      const { count: total } = await supabase!
        .from('contractors')
        .select('*', { count: 'exact', head: true })
      
      // Get total Airwallex contractors
      const { count: airwallexTotal } = await supabase!
        .from('airwallex_contractors')
        .select('*', { count: 'exact', head: true })
      
      // Get linked contractors
      const { count: linked } = await supabase!
        .from('airwallex_contractors')
        .select('*', { count: 'exact', head: true })
        .not('linked_contractor_id', 'is', null)
      
      // Get recent Airwallex contractors
      const { data: contractors } = await supabase!
        .from('airwallex_contractors')
        .select(`
          id, 
          beneficiary_id, 
          first_name, 
          last_name, 
          email, 
          status, 
          last_fetched_at,
          linked_contractor_id,
          linked_contractor:contractors(id, first_name, last_name)
        `)
        .order('last_fetched_at', { ascending: false })
        .limit(10)
      
      totalContractors = total || 0
      totalAirwallexContractors = airwallexTotal || 0
      linkedContractors = linked || 0
      airwallexContractors = contractors || []
    } else {
      totalContractors = await prisma.contractor.count()
      totalAirwallexContractors = await prisma.airwallexContractor.count()
      linkedContractors = await prisma.airwallexContractor.count({
        where: { linkedContractorId: { not: null } }
      })
      
      airwallexContractors = await prisma.airwallexContractor.findMany({
        select: {
          id: true,
          beneficiaryId: true,
          firstName: true,
          lastName: true,
          email: true,
          status: true,
          lastFetchedAt: true,
          linkedContractorId: true,
          linkedContractor: {
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
      message: 'Contractor sync summary retrieved (New Architecture)',
      configured: isConfigured,
      data: {
        database_summary: {
          totalContractors: totalContractors || 0,
          totalAirwallexContractors: totalAirwallexContractors || 0,
          linkedContractors: linkedContractors || 0,
          unlinkedAirwallexContractors: (totalAirwallexContractors || 0) - (linkedContractors || 0),
          notConfigured: !isConfigured
        },
        recent_airwallex_contractors: (airwallexContractors || []).map(contractor => ({
          id: contractor.id,
          beneficiaryId: useSupabase ? contractor.beneficiary_id : contractor.beneficiaryId,
          name: useSupabase ? `${contractor.first_name} ${contractor.last_name}` : `${contractor.firstName} ${contractor.lastName}`,
          email: contractor.email,
          status: contractor.status,
          lastSyncAt: useSupabase ? contractor.last_fetched_at : contractor.lastFetchedAt,
          isLinked: useSupabase ? !!contractor.linked_contractor_id : !!contractor.linkedContractorId,
          linkedContractor: contractor.linked_contractor ? {
            id: contractor.linked_contractor.id,
            name: useSupabase 
              ? `${contractor.linked_contractor.first_name} ${contractor.linked_contractor.last_name}`
              : `${contractor.linked_contractor.firstName} ${contractor.linked_contractor.lastName}`
          } : null
        }))
      }
    }, { status: 200 })
  } catch (error) {
    console.error('❌ Failed to get contractor sync summary:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Failed to get contractor sync summary',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}