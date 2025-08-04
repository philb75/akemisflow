import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createSupabaseClient } from '@/lib/supabase'
import { formatContractorNames } from '@/lib/name-formatter'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// Determine if we should use Supabase or Prisma
const useSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    
    // Get linked Airwallex contractor
    let airwallexContractor = null
    
    if (useSupabase) {
      const supabase = createSupabaseClient()
      
      const { data, error } = await supabase
        .from('airwallex_contractors')
        .select('*')
        .eq('linked_contractor_id', id)
        .single()

      if (error) {
        console.error('Supabase error fetching Airwallex contractor:', error)
        return NextResponse.json({ error: 'Linked Airwallex contractor not found' }, { status: 404 })
      }
      
      airwallexContractor = data
    } else {
      airwallexContractor = await prisma.airwallexContractor.findFirst({
        where: { linkedContractorId: id }
      })
    }

    if (!airwallexContractor) {
      return NextResponse.json({ 
        error: 'No linked Airwallex contractor found. Cannot sync from Airwallex.' 
      }, { status: 400 })
    }

    // Get current AkemisFlow contractor data
    let currentContractor = null
    
    if (useSupabase) {
      const supabase = createSupabaseClient()
      
      const { data, error } = await supabase
        .from('contractors')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Supabase error fetching contractor:', error)
        return NextResponse.json({ error: 'Contractor not found' }, { status: 404 })
      }
      
      currentContractor = data
    } else {
      currentContractor = await prisma.contractor.findUnique({
        where: { id }
      })
    }

    if (!currentContractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 })
    }

    // Format names from Airwallex data according to business rules
    const formattedNames = formatContractorNames({
      firstName: airwallexContractor.first_name || airwallexContractor.firstName,
      lastName: airwallexContractor.last_name || airwallexContractor.lastName
    })

    // Prepare data to update AkemisFlow contractor
    const contractorUpdateData = {
      firstName: formattedNames.firstName,
      lastName: formattedNames.lastName,
      email: airwallexContractor.email,
      phone: airwallexContractor.phone,
      company: airwallexContractor.company,
      // Address
      address: airwallexContractor.address,
      city: airwallexContractor.city,
      addressState: airwallexContractor.state,
      postalCode: airwallexContractor.postal_code || airwallexContractor.postalCode,
      addressCountryCode: airwallexContractor.country_code || airwallexContractor.countryCode,
      // Banking
      bankAccountName: airwallexContractor.bank_account_name || airwallexContractor.bankAccountName,
      bankAccountNumber: airwallexContractor.bank_account_number || airwallexContractor.bankAccountNumber,
      bankName: airwallexContractor.bank_name || airwallexContractor.bankName,
      bankCountryCode: airwallexContractor.bank_country_code || airwallexContractor.bankCountryCode,
      bankAccountCurrency: airwallexContractor.currency,
      iban: airwallexContractor.iban,
      swiftCode: airwallexContractor.swift_code || airwallexContractor.swiftCode,
      // Airwallex contact ID - establish direct link
      airwallexContactId: airwallexContractor.beneficiary_id || airwallexContractor.beneficiaryId,
      updatedAt: new Date()
    }

    // Update the AkemisFlow contractor
    if (useSupabase) {
      const supabase = createSupabaseClient()
      
      const { data, error } = await supabase
        .from('contractors')
        .update({
          first_name: contractorUpdateData.firstName,
          last_name: contractorUpdateData.lastName,
          email: contractorUpdateData.email,
          phone: contractorUpdateData.phone,
          company: contractorUpdateData.company,
          address: contractorUpdateData.address,
          city: contractorUpdateData.city,
          address_state: contractorUpdateData.addressState,
          postal_code: contractorUpdateData.postalCode,
          address_country_code: contractorUpdateData.addressCountryCode,
          bank_account_name: contractorUpdateData.bankAccountName,
          bank_account_number: contractorUpdateData.bankAccountNumber,
          bank_name: contractorUpdateData.bankName,
          bank_country_code: contractorUpdateData.bankCountryCode,
          bank_account_currency: contractorUpdateData.bankAccountCurrency,
          iban: contractorUpdateData.iban,
          swift_code: contractorUpdateData.swiftCode,
          airwallex_contact_id: contractorUpdateData.airwallexContactId,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Supabase error updating contractor:', error)
        return NextResponse.json({ error: 'Failed to update contractor' }, { status: 500 })
      }
      
      return NextResponse.json({ 
        success: true, 
        message: 'Successfully synced data from Airwallex to AkemisFlow',
        data: data
      })
    } else {
      const updatedContractor = await prisma.contractor.update({
        where: { id },
        data: contractorUpdateData
      })

      return NextResponse.json({ 
        success: true, 
        message: 'Successfully synced data from Airwallex to AkemisFlow',
        data: updatedContractor
      })
    }

  } catch (error) {
    console.error('Error syncing from Airwallex:', error)
    
    // Update sync error in Airwallex contractor record
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    if (useSupabase) {
      const supabase = createSupabaseClient()
      await supabase
        .from('airwallex_contractors')
        .update({ sync_error: errorMessage })
        .eq('linked_contractor_id', id)
    } else {
      await prisma.airwallexContractor.updateMany({
        where: { linkedContractorId: id },
        data: { syncError: errorMessage }
      }).catch(() => {}) // Ignore errors in error logging
    }

    return NextResponse.json(
      { error: 'Failed to sync from Airwallex', details: errorMessage },
      { status: 500 }
    )
  }
}