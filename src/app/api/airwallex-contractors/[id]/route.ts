import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createSupabaseClient } from '@/lib/supabase'
import { auth } from '@/lib/auth'

// Determine if we should use Supabase or Prisma
const useSupabase = false // Force Prisma for now

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    if (useSupabase) {
      const supabase = createSupabaseClient()
      
      // First check if the contractor exists
      const { data: contractor, error: fetchError } = await supabase
        .from('airwallex_contractors')
        .select('id, beneficiary_id')
        .eq('id', id)
        .single()
      
      if (fetchError || !contractor) {
        return NextResponse.json(
          { error: "Airwallex contractor not found" },
          { status: 404 }
        )
      }

      // Delete the contractor
      const { error: deleteError } = await supabase
        .from('airwallex_contractors')
        .delete()
        .eq('id', id)
      
      if (deleteError) {
        console.error('Error deleting Airwallex contractor:', deleteError)
        return NextResponse.json(
          { error: "Failed to delete Airwallex contractor" },
          { status: 500 }
        )
      }
    } else {
      // Use Prisma for local development
      
      // First check if the contractor exists
      const contractor = await prisma.airwallexContractor.findUnique({
        where: { id },
        select: { 
          id: true, 
          beneficiaryId: true,
          linkedContractorId: true 
        }
      })

      if (!contractor) {
        return NextResponse.json(
          { error: "Airwallex contractor not found" },
          { status: 404 }
        )
      }

      // If linked to a local contractor, unlink it first
      if (contractor.linkedContractorId) {
        await prisma.contractor.update({
          where: { id: contractor.linkedContractorId },
          data: { airwallexContactId: null }
        })
      }

      // Delete the Airwallex contractor
      await prisma.airwallexContractor.delete({
        where: { id }
      })
    }

    return NextResponse.json({ 
      success: true,
      message: "Airwallex contractor deleted successfully" 
    })
  } catch (error: any) {
    console.error("Error deleting Airwallex contractor:", error)
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: "Airwallex contractor not found" },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: "Failed to delete Airwallex contractor" },
      { status: 500 }
    )
  }
}