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

    // Fetch clients (contacts with client types) with related data
    const clients = await prisma.contact.findMany({
      where: {
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
            amount: true, 
            currency: true, 
            status: true, 
            issueDate: true,
            dueDate: true,
            paidDate: true 
          }
        },
        users: {
          select: { id: true, name: true, email: true, role: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Calculate client statistics
    const totalInvoiceAmount = clients.reduce((sum, client) => {
      return sum + client.clientInvoices.reduce((invoiceSum, invoice) => {
        return invoiceSum + Number(invoice.amount)
      }, 0)
    }, 0)

    const outstandingAmount = clients.reduce((sum, client) => {
      return sum + client.clientInvoices
        .filter(invoice => invoice.status !== 'PAID')
        .reduce((invoiceSum, invoice) => {
          return invoiceSum + Number(invoice.amount)
        }, 0)
    }, 0)

    const stats = {
      totalClients: clients.length,
      activeClients: clients.filter(c => c.status === 'ACTIVE').length,
      airwallexLinkedClients: clients.filter(c => c.airwallexPayerAccountId).length,
      companiesCount: clients.filter(c => c.contactType === 'CLIENT_COMPANY').length,
      contactsCount: clients.filter(c => c.contactType === 'CLIENT_CONTACT').length,
      totalInvoiceAmount: totalInvoiceAmount,
      outstandingAmount: outstandingAmount,
      currencies: [...new Set(clients.map(c => c.currencyPreference))].filter(Boolean),
      onboardingStatuses: [...new Set(clients.map(c => c.clientOnboardingStatus))].filter(Boolean)
    }

    return NextResponse.json({ clients, stats })
  } catch (error) {
    console.error("Error fetching clients:", error)
    return NextResponse.json(
      { error: "Failed to fetch clients" },
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
      contactType,
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
      clientCategory,
      clientRiskRating,
      preferredPaymentMethod,
      invoiceDeliveryMethod,
      autoInvoiceGeneration
    } = body

    // Basic validation
    if (!name || !contactType) {
      return NextResponse.json(
        { error: "Name and contact type are required" },
        { status: 400 }
      )
    }

    if (!['CLIENT_COMPANY', 'CLIENT_CONTACT'].includes(contactType)) {
      return NextResponse.json(
        { error: "Contact type must be CLIENT_COMPANY or CLIENT_CONTACT" },
        { status: 400 }
      )
    }

    const client = await prisma.contact.create({
      data: {
        contactType,
        name,
        email: email || null,
        phone: phone || null,
        addressLine1: addressLine1 || null,
        addressLine2: addressLine2 || null,
        city: city || null,
        state: state || null,
        postalCode: postalCode || null,
        country: country || null,
        taxId: taxId || null,
        currencyPreference: currencyPreference || 'EUR',
        parentCompanyId: parentCompanyId || null,
        notes: notes || null,
        // Client-specific fields
        clientCategory: clientCategory || null,
        clientRiskRating: clientRiskRating || 'MEDIUM',
        preferredPaymentMethod: preferredPaymentMethod || null,
        invoiceDeliveryMethod: invoiceDeliveryMethod || 'EMAIL',
        autoInvoiceGeneration: autoInvoiceGeneration || false,
        // Initialize Airwallex sync status
        airwallexSyncStatus: 'NONE'
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

    return NextResponse.json(client, { status: 201 })
  } catch (error: any) {
    console.error("Error creating client:", error)
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: "A client with this email or unique field already exists" },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { 
        error: "Failed to create client", 
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      },
      { status: 500 }
    )
  }
}