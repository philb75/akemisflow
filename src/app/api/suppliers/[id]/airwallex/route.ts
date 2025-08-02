import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createSupabaseClient } from '@/lib/supabase'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// Determine if we should use Supabase or Prisma
const useSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    let airwallexData = null

    if (useSupabase) {
      const supabase = createSupabaseClient()
      
      // Get Airwallex supplier linked to this supplier
      const { data, error } = await supabase
        .from('airwallex_suppliers')
        .select('*')
        .eq('linked_supplier_id', id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Supabase error fetching Airwallex data:', error)
        return NextResponse.json({ error: 'Failed to fetch Airwallex data' }, { status: 500 })
      }
      
      airwallexData = data
    } else {
      // Use Prisma for local development
      airwallexData = await prisma.airwallexSupplier.findFirst({
        where: { linkedSupplierId: id }
      })
    }

    return NextResponse.json({ airwallexData })
  } catch (error) {
    console.error('Error fetching Airwallex supplier data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    
    const { beneficiaryId, ...airwallexData } = body

    if (!beneficiaryId) {
      return NextResponse.json(
        { error: 'Beneficiary ID is required' },
        { status: 400 }
      )
    }

    let result = null

    if (useSupabase) {
      const supabase = createSupabaseClient()
      
      // Check if Airwallex supplier already exists
      const { data: existing } = await supabase
        .from('airwallex_suppliers')
        .select('id')
        .eq('beneficiary_id', beneficiaryId)
        .single()

      if (existing) {
        // Update existing Airwallex supplier
        const { data, error } = await supabase
          .from('airwallex_suppliers')
          .update({
            ...airwallexData,
            linked_supplier_id: id,
            last_fetched_at: new Date().toISOString()
          })
          .eq('beneficiary_id', beneficiaryId)
          .select()
          .single()

        if (error) {
          console.error('Supabase error updating Airwallex supplier:', error)
          return NextResponse.json({ error: 'Failed to update Airwallex supplier' }, { status: 500 })
        }
        
        result = data
      } else {
        // Create new Airwallex supplier
        const { data, error } = await supabase
          .from('airwallex_suppliers')
          .insert({
            beneficiary_id: beneficiaryId,
            ...airwallexData,
            linked_supplier_id: id,
            last_fetched_at: new Date().toISOString()
          })
          .select()
          .single()

        if (error) {
          console.error('Supabase error creating Airwallex supplier:', error)
          return NextResponse.json({ error: 'Failed to create Airwallex supplier' }, { status: 500 })
        }
        
        result = data
      }
    } else {
      // Use Prisma for local development
      result = await prisma.airwallexSupplier.upsert({
        where: { beneficiaryId },
        update: {
          ...airwallexData,
          linkedSupplierId: id,
          lastFetchedAt: new Date()
        },
        create: {
          beneficiaryId,
          ...airwallexData,
          linkedSupplierId: id
        }
      })
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Error creating/updating Airwallex supplier:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    if (useSupabase) {
      const supabase = createSupabaseClient()
      
      const { error } = await supabase
        .from('airwallex_suppliers')
        .delete()
        .eq('linked_supplier_id', id)

      if (error) {
        console.error('Supabase error deleting Airwallex supplier:', error)
        return NextResponse.json({ error: 'Failed to delete Airwallex supplier' }, { status: 500 })
      }
    } else {
      // Use Prisma for local development
      await prisma.airwallexSupplier.deleteMany({
        where: { linkedSupplierId: id }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting Airwallex supplier:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}