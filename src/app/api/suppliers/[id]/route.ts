import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { createClient } from '@supabase/supabase-js'
import { formatSupplierNames } from '@/lib/name-formatter'

// Environment-aware database client
const useSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)

// Initialize Supabase client for production
let supabase: any = null
if (useSupabase) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  supabase = createClient(supabaseUrl, supabaseServiceKey)
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get supplier (environment-aware)
    let supplier
    if (useSupabase) {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', params.id)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') {
          return NextResponse.json(
            { error: "Supplier not found" },
            { status: 404 }
          )
        }
        throw error
      }
      
      // Transform snake_case to camelCase for frontend
      supplier = {
        id: data.id,
        firstName: data.first_name,
        lastName: data.last_name,
        email: data.email,
        phone: data.phone,
        company: data.company,
        vatNumber: data.vat_number,
        address: data.address,
        city: data.city,
        postalCode: data.postal_code,
        country: data.country,
        status: data.status,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        airwallexBeneficiaryId: data.airwallex_beneficiary_id,
        airwallexSyncStatus: data.airwallex_sync_status,
        airwallexLastSyncAt: data.airwallex_last_sync_at
      }
    } else {
      supplier = await prisma.supplier.findUnique({
        where: {
          id: params.id
        }
      })
    }

    if (!supplier) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(supplier)
  } catch (error) {
    console.error("Error fetching supplier:", error)
    return NextResponse.json(
      { error: "Failed to fetch supplier" },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const {
      firstName,
      lastName,
      email,
      phone,
      company,
      vatNumber,
      address,
      city,
      postalCode,
      country,
      proofOfAddress,
      idDocument,
      isActive
    } = body

    // Basic validation
    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: "First name, last name, and email are required" },
        { status: 400 }
      )
    }

    // Prepare update data with environment-aware field names
    const baseUpdateData = useSupabase ? {
      // Supabase uses snake_case
      first_name: firstName,
      last_name: lastName,
      email,
      phone: phone || null,
      company: company || null,
      vat_number: vatNumber || null,
      address: address || null,
      city: city || null,
      postal_code: postalCode || null,
      country: country || null,
      is_active: isActive !== undefined ? isActive : true,
      status: isActive === false ? 'INACTIVE' : 'ACTIVE'
    } : {
      // Prisma uses camelCase
      firstName,
      lastName,
      email,
      phone: phone || null,
      company: company || null,
      vatNumber: vatNumber || null,
      address: address || null,
      city: city || null,
      postalCode: postalCode || null,
      country: country || null,
      proofOfAddressUrl: proofOfAddress?.url || null,
      proofOfAddressName: proofOfAddress?.name || null,
      proofOfAddressType: proofOfAddress?.type || null,
      proofOfAddressSize: proofOfAddress?.size || null,
      idDocumentUrl: idDocument?.url || null,
      idDocumentName: idDocument?.name || null,
      idDocumentType: idDocument?.type || null,
      idDocumentSize: idDocument?.size || null,
      isActive: isActive !== undefined ? isActive : true,
      status: isActive === false ? 'INACTIVE' : 'ACTIVE'
    }
    
    // Apply name formatting
    const updateData = formatSupplierNames(baseUpdateData)
    
    // Update supplier (environment-aware)
    let supplier
    if (useSupabase) {
      const { data, error } = await supabase
        .from('suppliers')
        .update(updateData)
        .eq('id', params.id)
        .select()
        .single()
      
      if (error) throw error
      supplier = data
    } else {
      supplier = await prisma.supplier.update({
        where: {
          id: params.id
        },
        data: updateData
      })
    }

    return NextResponse.json(supplier)
  } catch (error: any) {
    console.error("Error updating supplier:", error)
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: "A supplier with this email already exists" },
        { status: 409 }
      )
    }
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: "Failed to update supplier" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Delete supplier (environment-aware)
    if (useSupabase) {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', params.id)
      
      if (error) throw error
    } else {
      await prisma.supplier.delete({
        where: {
          id: params.id
        }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error deleting supplier:", error)
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: "Failed to delete supplier" },
      { status: 500 }
    )
  }
}