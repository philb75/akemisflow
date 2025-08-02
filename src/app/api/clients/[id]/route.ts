import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const client = await prisma.contact.findUnique({
      where: { 
        id: id,
        contactType: {
          in: ['CLIENT_COMPANY', 'CLIENT_CONTACT']
        }
      },
      include: {
        parentCompany: {
          select: { id: true, name: true, contactType: true }
        },
        subContacts: {
          select: { id: true, name: true, contactType: true, email: true }
        },
        clientInvoices: {
          select: { 
            id: true, 
            invoiceNumber: true,
            amount: true, 
            currency: true, 
            status: true, 
            issueDate: true,
            dueDate: true,
            paidDate: true 
          },
          orderBy: { issueDate: 'desc' }
        },
        users: {
          select: { id: true, name: true, email: true, role: true }
        }
      }
    })

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    return NextResponse.json(client)
  } catch (error) {
    console.error("Error fetching client:", error)
    return NextResponse.json(
      { error: "Failed to fetch client" },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const {
      name,
      email,
      phone,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      taxId,
      currencyPreference,
      parentCompanyId,
      notes,
      status,
      clientCategory,
      clientRiskRating,
      preferredPaymentMethod,
      invoiceDeliveryMethod,
      autoInvoiceGeneration,
      clientOnboardingStatus
    } = body

    // Check if client exists and is a client type
    const existingClient = await prisma.contact.findUnique({
      where: { 
        id: id,
        contactType: {
          in: ['CLIENT_COMPANY', 'CLIENT_CONTACT']
        }
      }
    })

    if (!existingClient) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    const updatedClient = await prisma.contact.update({
      where: { id: id },
      data: {
        ...(name && { name }),
        ...(email !== undefined && { email: email || null }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(addressLine1 !== undefined && { addressLine1: addressLine1 || null }),
        ...(addressLine2 !== undefined && { addressLine2: addressLine2 || null }),
        ...(city !== undefined && { city: city || null }),
        ...(state !== undefined && { state: state || null }),
        ...(postalCode !== undefined && { postalCode: postalCode || null }),
        ...(country !== undefined && { country: country || null }),
        ...(taxId !== undefined && { taxId: taxId || null }),
        ...(currencyPreference && { currencyPreference }),
        ...(parentCompanyId !== undefined && { parentCompanyId: parentCompanyId || null }),
        ...(notes !== undefined && { notes: notes || null }),
        ...(status && { status }),
        ...(clientCategory !== undefined && { clientCategory: clientCategory || null }),
        ...(clientRiskRating !== undefined && { clientRiskRating: clientRiskRating || null }),
        ...(preferredPaymentMethod !== undefined && { preferredPaymentMethod: preferredPaymentMethod || null }),
        ...(invoiceDeliveryMethod !== undefined && { invoiceDeliveryMethod: invoiceDeliveryMethod || null }),
        ...(autoInvoiceGeneration !== undefined && { autoInvoiceGeneration: autoInvoiceGeneration || false }),
        ...(clientOnboardingStatus !== undefined && { clientOnboardingStatus: clientOnboardingStatus || null })
      },
      include: {
        parentCompany: {
          select: { id: true, name: true, contactType: true }
        },
        subContacts: {
          select: { id: true, name: true, contactType: true, email: true }
        }
      }
    })

    return NextResponse.json(updatedClient)
  } catch (error: any) {
    console.error("Error updating client:", error)
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: "A client with this email or unique field already exists" },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { 
        error: "Failed to update client", 
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      },
      { status: 500 }
    )
  }
}

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

    // Check if client exists and is a client type
    const existingClient = await prisma.contact.findUnique({
      where: { 
        id: id,
        contactType: {
          in: ['CLIENT_COMPANY', 'CLIENT_CONTACT']
        }
      },
      include: {
        clientInvoices: { select: { id: true } },
        subContacts: { select: { id: true } }
      }
    })

    if (!existingClient) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    // Check for dependencies before deletion
    if (existingClient.clientInvoices.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete client with existing invoices. Consider marking as inactive instead." },
        { status: 400 }
      )
    }

    if (existingClient.subContacts.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete client company with existing contacts. Remove contacts first." },
        { status: 400 }
      )
    }

    await prisma.contact.delete({
      where: { id: id }
    })

    return NextResponse.json({ message: "Client deleted successfully" })
  } catch (error) {
    console.error("Error deleting client:", error)
    return NextResponse.json(
      { error: "Failed to delete client" },
      { status: 500 }
    )
  }
}