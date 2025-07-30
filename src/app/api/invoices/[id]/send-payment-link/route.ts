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
    const body = await request.json()
    const { email, message } = body

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

    // Check if payment link exists
    const metadata = invoice.metadata as any
    if (!metadata?.airwallex_payment_link_id) {
      return NextResponse.json({ 
        error: 'No payment link found for this invoice. Create a payment link first.' 
      }, { status: 400 })
    }

    // Use provided email or client's email
    const recipientEmail = email || invoice.client.email
    if (!recipientEmail) {
      return NextResponse.json({ 
        error: 'No email address provided and client has no email on file' 
      }, { status: 400 })
    }

    console.log(`📧 Sending payment link for invoice ${invoice.invoiceNumber} to ${recipientEmail}`)

    // Create a custom message if none provided
    const customMessage = message || `
Dear ${invoice.client.name},

Please find attached your invoice ${invoice.invoiceNumber} for ${invoice.currency} ${Number(invoice.amount).toLocaleString()}.

You can securely pay this invoice using the payment link below. The payment link accepts multiple payment methods including bank transfers and cards.

Invoice Details:
- Invoice Number: ${invoice.invoiceNumber}
- Amount: ${invoice.currency} ${Number(invoice.amount).toLocaleString()}
- Due Date: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'Upon receipt'}

If you have any questions about this invoice, please don't hesitate to contact us.

Best regards,
AkemisFlow Team
    `.trim()

    // Send payment link notification via Airwallex
    await airwallexApi.sendPaymentLinkNotification(
      metadata.airwallex_payment_link_id,
      recipientEmail,
      customMessage
    )

    // Log the notification in invoice metadata
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        metadata: {
          ...metadata,
          payment_link_notifications: [
            ...((metadata.payment_link_notifications as any[]) || []),
            {
              email: recipientEmail,
              sent_at: new Date().toISOString(),
              message: customMessage,
              sent_by: session.user?.email || 'system'
            }
          ]
        }
      }
    })

    console.log(`✅ Payment link notification sent successfully to ${recipientEmail}`)

    const response = {
      success: true,
      message: 'Payment link notification sent successfully',
      data: {
        invoice_id: invoice.id,
        invoice_number: invoice.invoiceNumber,
        recipient_email: recipientEmail,
        payment_link_id: metadata.airwallex_payment_link_id,
        sent_at: new Date().toISOString()
      }
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error('❌ Failed to send payment link notification:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Failed to send payment link notification',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}