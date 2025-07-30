import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { getAirwallexClient } from '@/lib/airwallex-api'

const prisma = new PrismaClient()
const airwallexApi = getAirwallexClient()

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const invoiceId = params.id

    // Fetch the invoice with client information
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        client: true
      }
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    if (!invoice.client) {
      return NextResponse.json({ error: 'Invoice has no associated client' }, { status: 400 })
    }

    // Check if a payment link already exists for this invoice
    const existingPaymentLink = invoice.metadata as any
    if (existingPaymentLink?.airwallex_payment_link_id) {
      try {
        // Check if the existing payment link is still valid
        const existingLink = await airwallexApi.getPaymentLink(existingPaymentLink.airwallex_payment_link_id)
        if (existingLink.status === 'ACTIVE' || existingLink.status === 'CREATED') {
          return NextResponse.json({
            success: true,
            message: 'Payment link already exists and is active',
            data: {
              payment_link: existingLink,
              invoice_id: invoice.id,
              invoice_number: invoice.invoiceNumber,
              existing: true
            }
          })
        }
      } catch (error) {
        console.log('Existing payment link not found or expired, creating new one')
      }
    }

    console.log(`🔗 Creating payment link for invoice ${invoice.invoiceNumber}`)

    // Create payment link via Airwallex
    const paymentLink = await airwallexApi.createInvoicePaymentLink({
      invoiceNumber: invoice.invoiceNumber || `INV-${invoice.id.slice(-8)}`,
      clientName: invoice.client.name,
      clientEmail: invoice.client.email || undefined,
      amount: Number(invoice.amount),
      currency: invoice.currency,
      dueDate: invoice.dueDate ? new Date(invoice.dueDate) : undefined,
      description: `Payment for Invoice ${invoice.invoiceNumber}`,
      clientId: invoice.client.airwallexPayerAccountId || undefined
    })

    // Update invoice with payment link information
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        metadata: {
          ...((invoice.metadata as any) || {}),
          airwallex_payment_link_id: paymentLink.id,
          airwallex_payment_link_url: paymentLink.url,
          payment_link_created_at: new Date().toISOString(),
          payment_link_expires_at: paymentLink.expires_at
        }
      }
    })

    console.log(`✅ Payment link created successfully: ${paymentLink.url}`)

    const response = {
      success: true,
      message: 'Payment link created successfully',
      data: {
        payment_link: paymentLink,
        invoice_id: invoice.id,
        invoice_number: invoice.invoiceNumber,
        client_name: invoice.client.name,
        client_email: invoice.client.email,
        amount: Number(invoice.amount),
        currency: invoice.currency,
        due_date: invoice.dueDate,
        existing: false
      }
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('❌ Failed to create payment link:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Failed to create payment link',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const invoiceId = params.id

    // Fetch the invoice with payment link information
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        client: true
      }
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    const metadata = invoice.metadata as any
    if (!metadata?.airwallex_payment_link_id) {
      return NextResponse.json({
        success: false,
        message: 'No payment link found for this invoice'
      }, { status: 404 })
    }

    // Fetch current payment link status from Airwallex
    try {
      const paymentLink = await airwallexApi.getPaymentLink(metadata.airwallex_payment_link_id)
      
      return NextResponse.json({
        success: true,
        message: 'Payment link retrieved successfully',
        data: {
          payment_link: paymentLink,
          invoice_id: invoice.id,
          invoice_number: invoice.invoiceNumber,
          client_name: invoice.client?.name,
          client_email: invoice.client?.email,
          amount: Number(invoice.amount),
          currency: invoice.currency
        }
      })
    } catch (error) {
      return NextResponse.json({
        success: false,
        message: 'Payment link not found or expired',
        error: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 404 })
    }
  } catch (error) {
    console.error('❌ Failed to retrieve payment link:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve payment link',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}