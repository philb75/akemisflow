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
    
    // Get linked Airwallex supplier
    let airwallexSupplier = null
    
    if (useSupabase) {
      const supabase = createSupabaseClient()
      
      const { data, error } = await supabase
        .from('airwallex_suppliers')
        .select('*')
        .eq('linked_supplier_id', id)
        .single()

      if (error) {
        console.error('Supabase error fetching Airwallex supplier:', error)
        return NextResponse.json({ error: 'Linked Airwallex supplier not found' }, { status: 404 })
      }
      
      airwallexSupplier = data
    } else {
      airwallexSupplier = await prisma.airwallexSupplier.findFirst({
        where: { linkedSupplierId: id }
      })
    }

    if (!airwallexSupplier) {
      return NextResponse.json({ 
        error: 'No linked Airwallex supplier found. Cannot sync from Airwallex.' 
      }, { status: 400 })
    }

    // Get current AkemisFlow supplier data
    let currentSupplier = null
    
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
      
      currentSupplier = data
    } else {
      currentSupplier = await prisma.supplier.findUnique({
        where: { id }
      })
    }

    if (!currentSupplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    // Format names from Airwallex data according to business rules
    const formattedNames = formatSupplierNames({
      firstName: airwallexSupplier.first_name || airwallexSupplier.firstName,
      lastName: airwallexSupplier.last_name || airwallexSupplier.lastName
    })

    // Prepare data to update AkemisFlow supplier
    const supplierUpdateData = {
      firstName: formattedNames.firstName,
      lastName: formattedNames.lastName,
      email: airwallexSupplier.email,
      phone: airwallexSupplier.phone,
      company: airwallexSupplier.company,
      // Address
      address: airwallexSupplier.address,
      city: airwallexSupplier.city,
      addressState: airwallexSupplier.state,
      postalCode: airwallexSupplier.postal_code || airwallexSupplier.postalCode,
      addressCountryCode: airwallexSupplier.country_code || airwallexSupplier.countryCode,
      // Banking
      bankAccountName: airwallexSupplier.bank_account_name || airwallexSupplier.bankAccountName,
      bankAccountNumber: airwallexSupplier.bank_account_number || airwallexSupplier.bankAccountNumber,
      bankName: airwallexSupplier.bank_name || airwallexSupplier.bankName,
      bankCountryCode: airwallexSupplier.bank_country_code || airwallexSupplier.bankCountryCode,
      bankAccountCurrency: airwallexSupplier.currency,
      iban: airwallexSupplier.iban,
      swiftCode: airwallexSupplier.swift_code || airwallexSupplier.swiftCode,
      // Airwallex contact ID - establish direct link
      airwallexContactId: airwallexSupplier.beneficiary_id || airwallexSupplier.beneficiaryId,
      updatedAt: new Date()
    }

    // Update the AkemisFlow supplier
    if (useSupabase) {
      const supabase = createSupabaseClient()
      
      const { data, error } = await supabase
        .from('suppliers')
        .update({
          first_name: supplierUpdateData.firstName,
          last_name: supplierUpdateData.lastName,
          email: supplierUpdateData.email,
          phone: supplierUpdateData.phone,
          company: supplierUpdateData.company,
          address: supplierUpdateData.address,
          city: supplierUpdateData.city,
          address_state: supplierUpdateData.addressState,
          postal_code: supplierUpdateData.postalCode,
          address_country_code: supplierUpdateData.addressCountryCode,
          bank_account_name: supplierUpdateData.bankAccountName,
          bank_account_number: supplierUpdateData.bankAccountNumber,
          bank_name: supplierUpdateData.bankName,
          bank_country_code: supplierUpdateData.bankCountryCode,
          bank_account_currency: supplierUpdateData.bankAccountCurrency,
          iban: supplierUpdateData.iban,
          swift_code: supplierUpdateData.swiftCode,
          airwallex_contact_id: supplierUpdateData.airwallexContactId,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Supabase error updating supplier:', error)
        return NextResponse.json({ error: 'Failed to update supplier' }, { status: 500 })
      }
      
      return NextResponse.json({ 
        success: true, 
        message: 'Successfully synced data from Airwallex to AkemisFlow',
        data: data
      })
    } else {
      const updatedSupplier = await prisma.supplier.update({
        where: { id },
        data: supplierUpdateData
      })

      return NextResponse.json({ 
        success: true, 
        message: 'Successfully synced data from Airwallex to AkemisFlow',
        data: updatedSupplier
      })
    }

  } catch (error) {
    console.error('Error syncing from Airwallex:', error)
    
    // Update sync error in Airwallex supplier record
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    if (useSupabase) {
      const supabase = createSupabaseClient()
      await supabase
        .from('airwallex_suppliers')
        .update({ sync_error: errorMessage })
        .eq('linked_supplier_id', params.id)
    } else {
      await prisma.airwallexSupplier.updateMany({
        where: { linkedSupplierId: params.id },
        data: { syncError: errorMessage }
      }).catch(() => {}) // Ignore errors in error logging
    }

    return NextResponse.json(
      { error: 'Failed to sync from Airwallex', details: errorMessage },
      { status: 500 }
    )
  }
}