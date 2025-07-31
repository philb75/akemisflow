import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { createClient } from '@supabase/supabase-js'

// Environment-aware database client
// Use Supabase if we have the URL configured (production), otherwise use Prisma (local)
const useSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)

// Initialize Supabase client for production
let supabase: any = null
if (useSupabase) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  supabase = createClient(supabaseUrl, supabaseServiceKey)
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get suppliers (environment-aware)
    let suppliers
    if (useSupabase) {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      suppliers = data
    } else {
      suppliers = await prisma.supplier.findMany({
        orderBy: {
          createdAt: 'desc'
        }
      })
    }

    return NextResponse.json(suppliers)
  } catch (error) {
    console.error("Error fetching suppliers:", error)
    return NextResponse.json(
      { error: "Failed to fetch suppliers" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
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
      idDocument
    } = body

    // Basic validation
    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: "First name, last name, and email are required" },
        { status: 400 }
      )
    }

    // Create supplier data with environment-aware field names
    const supplierData = useSupabase ? {
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
      status: 'ACTIVE'
    } : {
      // Prisma uses camelCase
      firstName,
      lastName,
      email,
      phone: phone || null,
      companyName: company || null,
      vatNumber: vatNumber || null,
      address: address || null,
      city: city || null,
      postalCode: postalCode || null,
      country: country || null,
      status: 'ACTIVE',
      metadata: {
        documents: {
          proofOfAddress: proofOfAddress ? {
            url: proofOfAddress.url,
            name: proofOfAddress.name,
            type: proofOfAddress.type,
            size: proofOfAddress.size
          } : null,
          idDocument: idDocument ? {
            url: idDocument.url,
            name: idDocument.name,
            type: idDocument.type,
            size: idDocument.size
          } : null
        }
      }
    }
    
    // Create supplier (environment-aware)
    let supplier
    if (useSupabase) {
      const { data, error } = await supabase
        .from('suppliers')
        .insert(supplierData)
        .select()
        .single()
      
      if (error) throw error
      supplier = data
    } else {
      supplier = await prisma.supplier.create({
        data: supplierData
      })
    }

    return NextResponse.json(supplier, { status: 201 })
  } catch (error: any) {
    console.error("Error creating supplier:", error)
    console.error("Error details:", {
      code: error.code,
      message: error.message,
      stack: error.stack
    })
    
    if (error.code === '23505') { // Postgres unique violation
      return NextResponse.json(
        { error: "A supplier with this email already exists" },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { 
        error: "Failed to create supplier", 
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      },
      { status: 500 }
    )
  }
}