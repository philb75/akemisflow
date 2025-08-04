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
    
    // Verify the contractor exists
    let contractor = null
    
    if (useSupabase) {
      const supabase = createSupabaseClient()
      
      const { data, error } = await supabase
        .from('contractors')
        .select('id, first_name, last_name')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Supabase error fetching contractor:', error)
        return NextResponse.json({ error: 'Contractor not found' }, { status: 404 })
      }
      
      contractor = data
    } else {
      contractor = await prisma.contractor.findUnique({
        where: { id },
        select: { id: true, firstName: true, lastName: true }
      })
    }

    if (!contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 })
    }

    // Check if Airwallex contractor exists
    let airwallexContractor = null
    
    if (useSupabase) {
      const supabase = createSupabaseClient()
      
      const { data, error } = await supabase
        .from('airwallex_contractors')
        .select('*')
        .eq('beneficiary_id', beneficiaryId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Supabase error fetching Airwallex contractor:', error)
        return NextResponse.json({ error: 'Failed to check Airwallex contractor' }, { status: 500 })
      }
      
      airwallexContractor = data
    } else {
      airwallexContractor = await prisma.airwallexContractor.findUnique({
        where: { beneficiaryId }
      })
    }

    if (!airwallexContractor) {
      return NextResponse.json({ 
        error: 'Airwallex contractor not found. Make sure to sync from Airwallex first.' 
      }, { status: 404 })
    }

    // Check if this Airwallex contractor is already linked to another contractor
    if (airwallexContractor.linked_contractor_id || airwallexContractor.linkedContractorId) {
      const linkedId = airwallexContractor.linked_contractor_id || airwallexContractor.linkedContractorId
      if (linkedId !== id) {
        return NextResponse.json({ 
          error: `This Airwallex contractor is already linked to another contractor (ID: ${linkedId})` 
        }, { status: 400 })
      } else {
        return NextResponse.json({ 
          message: 'Contractor is already linked to this Airwallex beneficiary',
          data: airwallexContractor
        })
      }
    }

    // Link the contractors
    if (useSupabase) {
      const supabase = createSupabaseClient()
      
      const { data, error } = await supabase
        .from('airwallex_contractors')
        .update({ linked_contractor_id: id })
        .eq('beneficiary_id', beneficiaryId)
        .select()
        .single()

      if (error) {
        console.error('Supabase error linking contractors:', error)
        return NextResponse.json({ error: 'Failed to link contractors' }, { status: 500 })
      }
      
      return NextResponse.json({ 
        success: true,
        message: `Successfully linked contractor ${contractor.first_name} ${contractor.last_name} to Airwallex beneficiary ${beneficiaryId}`,
        data: data
      })
    } else {
      const updatedAirwallexContractor = await prisma.airwallexContractor.update({
        where: { beneficiaryId },
        data: { linkedContractorId: id }
      })

      return NextResponse.json({ 
        success: true,
        message: `Successfully linked contractor ${contractor.firstName} ${contractor.lastName} to Airwallex beneficiary ${beneficiaryId}`,
        data: updatedAirwallexContractor
      })
    }

  } catch (error) {
    console.error('Error linking contractors:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, beneficiaryId } = await params
    
    // Unlink the contractors
    if (useSupabase) {
      const supabase = createSupabaseClient()
      
      const { data, error } = await supabase
        .from('airwallex_contractors')
        .update({ linked_contractor_id: null })
        .eq('beneficiary_id', beneficiaryId)
        .eq('linked_contractor_id', id)
        .select()
        .single()

      if (error) {
        console.error('Supabase error unlinking contractors:', error)
        return NextResponse.json({ error: 'Failed to unlink contractors' }, { status: 500 })
      }
      
      if (!data) {
        return NextResponse.json({ error: 'Link not found or already removed' }, { status: 404 })
      }
      
      return NextResponse.json({ 
        success: true,
        message: `Successfully unlinked contractor from Airwallex beneficiary ${beneficiaryId}`,
        data: data
      })
    } else {
      const updatedAirwallexContractor = await prisma.airwallexContractor.updateMany({
        where: { 
          beneficiaryId,
          linkedContractorId: id
        },
        data: { linkedContractorId: null }
      })

      if (updatedAirwallexContractor.count === 0) {
        return NextResponse.json({ error: 'Link not found or already removed' }, { status: 404 })
      }

      return NextResponse.json({ 
        success: true,
        message: `Successfully unlinked contractor from Airwallex beneficiary ${beneficiaryId}`
      })
    }

  } catch (error) {
    console.error('Error unlinking contractors:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}