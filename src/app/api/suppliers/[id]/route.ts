import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supplier = await prisma.supplier.findUnique({
      where: {
        id: params.id
      }
    })

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

    const supplier = await prisma.supplier.update({
      where: {
        id: params.id
      },
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
        isActive: isActive !== undefined ? isActive : true,
        status: isActive === false ? 'INACTIVE' : 'ACTIVE'
      }
    })

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

    await prisma.supplier.delete({
      where: {
        id: params.id
      }
    })

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