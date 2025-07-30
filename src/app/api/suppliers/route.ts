import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const suppliers = await prisma.supplier.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    })

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

    const supplier = await prisma.supplier.create({
      data: {
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
        // Initialize Airwallex sync status
        airwallexSyncStatus: 'NONE'
      }
    })

    return NextResponse.json(supplier, { status: 201 })
  } catch (error: any) {
    console.error("Error creating supplier:", error)
    console.error("Error details:", {
      code: error.code,
      message: error.message,
      stack: error.stack
    })
    
    if (error.code === 'P2002') {
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