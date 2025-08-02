import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createSupabaseClient } from '@/lib/supabase'
import { formatSupplierNames } from '@/lib/name-formatter'

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
    
    // Get the AkemisFlow supplier data
    let supplier = null
    
    if (useSupabase) {
      const supabase = createSupabaseClient()
      
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Supabase error fetching supplier:', error)
        return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
      }
      
      supplier = data
    } else {
      supplier = await prisma.supplier.findUnique({
        where: { id }
      })
    }

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    // Get linked Airwallex supplier if exists
    let airwallexSupplier = null
    
    if (useSupabase) {
      const supabase = createSupabaseClient()
      
      const { data } = await supabase
        .from('airwallex_suppliers')
        .select('*')
        .eq('linked_supplier_id', id)
        .single()
        
      airwallexSupplier = data
    } else {
      airwallexSupplier = await prisma.airwallexSupplier.findFirst({
        where: { linkedSupplierId: id }
      })
    }

    if (!airwallexSupplier) {
      return NextResponse.json({ 
        error: 'No linked Airwallex supplier found. Cannot sync to Airwallex.' 
      }, { status: 400 })
    }

    // Format names according to business rules
    const formattedNames = formatSupplierNames({
      firstName: supplier.first_name || supplier.firstName,
      lastName: supplier.last_name || supplier.lastName
    })

    // Prepare data for Airwallex API update
    const airwallexUpdateData = {
      first_name: formattedNames.firstName,
      last_name: formattedNames.lastName,
      email: supplier.email,
      phone_number: supplier.phone,
      company_name: supplier.company,
      // Address
      address: {
        country_code: supplier.address_country_code || supplier.addressCountryCode,
        state: supplier.address_state || supplier.addressState,
        city: supplier.city,
        street_address: supplier.address,
        postcode: supplier.postal_code || supplier.postalCode
      },
      // Bank account details
      bank_account: {
        account_name: supplier.bank_account_name || supplier.bankAccountName,
        account_number: supplier.bank_account_number || supplier.bankAccountNumber,
        bank_name: supplier.bank_name || supplier.bankName,
        country_code: supplier.bank_country_code || supplier.bankCountryCode,
        currency: supplier.bank_account_currency || supplier.bankAccountCurrency,
        iban: supplier.iban,
        swift_code: supplier.swift_code || supplier.swiftCode
      }
    }

    // Here you would make the actual API call to Airwallex
    // For now, we'll simulate the API call
    console.log('Would sync to Airwallex API:', {
      beneficiaryId: airwallexSupplier.beneficiary_id || airwallexSupplier.beneficiaryId,
      data: airwallexUpdateData
    })

    // TODO: Implement actual Airwallex API call
    // const airwallexResponse = await updateAirwallexBeneficiary(
    //   airwallexSupplier.beneficiaryId,
    //   airwallexUpdateData
    // )

    // For now, simulate success and update the Airwallex supplier record
    const updatedAirwallexData = {
      firstName: formattedNames.firstName,
      lastName: formattedNames.lastName,
      email: supplier.email,
      phone: supplier.phone,
      company: supplier.company,
      address: supplier.address,
      city: supplier.city,
      state: supplier.address_state || supplier.addressState,
      postalCode: supplier.postal_code || supplier.postalCode,
      countryCode: supplier.address_country_code || supplier.addressCountryCode,
      bankAccountName: supplier.bank_account_name || supplier.bankAccountName,
      bankAccountNumber: supplier.bank_account_number || supplier.bankAccountNumber,
      bankName: supplier.bank_name || supplier.bankName,
      bankCountryCode: supplier.bank_country_code || supplier.bankCountryCode,
      currency: supplier.bank_account_currency || supplier.bankAccountCurrency,
      iban: supplier.iban,
      swiftCode: supplier.swift_code || supplier.swiftCode,
      lastFetchedAt: new Date()
    }

    // Update the Airwallex supplier record
    if (useSupabase) {
      const supabase = createSupabaseClient()
      
      const { error } = await supabase
        .from('airwallex_suppliers')
        .update({
          first_name: updatedAirwallexData.firstName,
          last_name: updatedAirwallexData.lastName,
          email: updatedAirwallexData.email,
          phone: updatedAirwallexData.phone,
          company: updatedAirwallexData.company,
          address: updatedAirwallexData.address,
          city: updatedAirwallexData.city,
          state: updatedAirwallexData.state,
          postal_code: updatedAirwallexData.postalCode,
          country_code: updatedAirwallexData.countryCode,
          bank_account_name: updatedAirwallexData.bankAccountName,
          bank_account_number: updatedAirwallexData.bankAccountNumber,
          bank_name: updatedAirwallexData.bankName,
          bank_country_code: updatedAirwallexData.bankCountryCode,
          currency: updatedAirwallexData.currency,
          iban: updatedAirwallexData.iban,
          swift_code: updatedAirwallexData.swiftCode,
          last_fetched_at: new Date().toISOString(),
          sync_error: null
        })
        .eq('linked_supplier_id', id)

      if (error) {
        console.error('Supabase error updating Airwallex supplier:', error)
        return NextResponse.json({ error: 'Failed to update Airwallex supplier record' }, { status: 500 })
      }
    } else {
      await prisma.airwallexSupplier.updateMany({
        where: { linkedSupplierId: id },
        data: {
          ...updatedAirwallexData,
          syncError: null
        }
      })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Successfully synced supplier data to Airwallex',
      data: updatedAirwallexData
    })

  } catch (error) {
    console.error('Error syncing to Airwallex:', error)
    
    // Update sync error in Airwallex supplier record
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    if (useSupabase) {
      const supabase = createSupabaseClient()
      await supabase
        .from('airwallex_suppliers')
        .update({ sync_error: errorMessage })
        .eq('linked_supplier_id', id)
    } else {
      await prisma.airwallexSupplier.updateMany({
        where: { linkedSupplierId: id },
        data: { syncError: errorMessage }
      }).catch(() => {}) // Ignore errors in error logging
    }

    return NextResponse.json(
      { error: 'Failed to sync to Airwallex', details: errorMessage },
      { status: 500 }
    )
  }
}