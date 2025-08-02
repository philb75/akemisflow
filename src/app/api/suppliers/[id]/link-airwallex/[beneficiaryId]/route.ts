import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createSupabaseClient } from '@/lib/supabase'

interface RouteParams {
  params: Promise<{
    id: string
    beneficiaryId: string
  }>
}

// Determine if we should use Supabase or Prisma
const useSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, beneficiaryId } = await params
    
    // Verify the supplier exists
    let supplier = null
    
    if (useSupabase) {
      const supabase = createSupabaseClient()
      
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, first_name, last_name')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Supabase error fetching supplier:', error)
        return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
      }
      
      supplier = data
    } else {
      supplier = await prisma.supplier.findUnique({
        where: { id },
        select: { id: true, firstName: true, lastName: true }
      })
    }

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    // Check if Airwallex supplier exists
    let airwallexSupplier = null
    
    if (useSupabase) {
      const supabase = createSupabaseClient()
      
      const { data, error } = await supabase
        .from('airwallex_suppliers')
        .select('*')
        .eq('beneficiary_id', beneficiaryId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Supabase error fetching Airwallex supplier:', error)
        return NextResponse.json({ error: 'Failed to check Airwallex supplier' }, { status: 500 })
      }
      
      airwallexSupplier = data
    } else {
      airwallexSupplier = await prisma.airwallexSupplier.findUnique({
        where: { beneficiaryId }
      })
    }

    if (!airwallexSupplier) {
      return NextResponse.json({ 
        error: 'Airwallex supplier not found. Make sure to sync from Airwallex first.' 
      }, { status: 404 })
    }

    // Check if this Airwallex supplier is already linked to another supplier
    if (airwallexSupplier.linked_supplier_id || airwallexSupplier.linkedSupplierId) {
      const linkedId = airwallexSupplier.linked_supplier_id || airwallexSupplier.linkedSupplierId
      if (linkedId !== id) {
        return NextResponse.json({ 
          error: `This Airwallex supplier is already linked to another supplier (ID: ${linkedId})` 
        }, { status: 400 })
      } else {
        return NextResponse.json({ 
          message: 'Supplier is already linked to this Airwallex beneficiary',
          data: airwallexSupplier
        })
      }
    }

    // Link the suppliers
    if (useSupabase) {
      const supabase = createSupabaseClient()
      
      const { data, error } = await supabase
        .from('airwallex_suppliers')
        .update({ linked_supplier_id: id })
        .eq('beneficiary_id', beneficiaryId)
        .select()
        .single()

      if (error) {
        console.error('Supabase error linking suppliers:', error)
        return NextResponse.json({ error: 'Failed to link suppliers' }, { status: 500 })
      }
      
      return NextResponse.json({ 
        success: true,
        message: `Successfully linked supplier ${supplier.first_name} ${supplier.last_name} to Airwallex beneficiary ${beneficiaryId}`,
        data: data
      })
    } else {
      const updatedAirwallexSupplier = await prisma.airwallexSupplier.update({
        where: { beneficiaryId },
        data: { linkedSupplierId: id }
      })

      return NextResponse.json({ 
        success: true,
        message: `Successfully linked supplier ${supplier.firstName} ${supplier.lastName} to Airwallex beneficiary ${beneficiaryId}`,
        data: updatedAirwallexSupplier
      })
    }

  } catch (error) {
    console.error('Error linking suppliers:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, beneficiaryId } = await params
    
    // Unlink the suppliers
    if (useSupabase) {
      const supabase = createSupabaseClient()
      
      const { data, error } = await supabase
        .from('airwallex_suppliers')
        .update({ linked_supplier_id: null })
        .eq('beneficiary_id', beneficiaryId)
        .eq('linked_supplier_id', id)
        .select()
        .single()

      if (error) {
        console.error('Supabase error unlinking suppliers:', error)
        return NextResponse.json({ error: 'Failed to unlink suppliers' }, { status: 500 })
      }
      
      if (!data) {
        return NextResponse.json({ error: 'Link not found or already removed' }, { status: 404 })
      }
      
      return NextResponse.json({ 
        success: true,
        message: `Successfully unlinked supplier from Airwallex beneficiary ${beneficiaryId}`,
        data: data
      })
    } else {
      const updatedAirwallexSupplier = await prisma.airwallexSupplier.updateMany({
        where: { 
          beneficiaryId,
          linkedSupplierId: id
        },
        data: { linkedSupplierId: null }
      })

      if (updatedAirwallexSupplier.count === 0) {
        return NextResponse.json({ error: 'Link not found or already removed' }, { status: 404 })
      }

      return NextResponse.json({ 
        success: true,
        message: `Successfully unlinked supplier from Airwallex beneficiary ${beneficiaryId}`
      })
    }

  } catch (error) {
    console.error('Error unlinking suppliers:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}