import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { airwallexClientSync } from '@/lib/airwallex-client-sync'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔍 Running payment analysis for client identification...')
    
    // Analyze incoming payments to identify real clients
    const analysis = await airwallexClientSync.analyzeIncomingPayments()
    
    const response = {
      success: true,
      message: 'Payment analysis completed',
      data: {
        summary: {
          total_entities_with_payments: analysis.realClients.length,
          total_incoming_amount: analysis.totalIncoming,
          significant_clients: analysis.clientsWithPayments.length,
          analysis_date: new Date().toISOString()
        },
        real_clients: analysis.realClients.map(client => ({
          contact_id: client.contact?.id,
          name: client.contact?.name || 'Unknown',
          email: client.contact?.email,
          total_paid: client.totalPaid,
          payment_count: client.paymentCount,
          last_payment: client.lastPayment,
          average_payment: client.totalPaid / client.paymentCount,
          is_significant: client.paymentCount > 1 || client.totalPaid > 1000
        })),
        significant_clients: analysis.clientsWithPayments.map(client => ({
          contact_id: client.contact?.id,
          name: client.contact?.name || 'Unknown',
          email: client.contact?.email,
          total_paid: client.totalPaid,
          payment_count: client.paymentCount,
          last_payment: client.lastPayment,
          recent_transactions: client.transactions.slice(0, 5) // Last 5 transactions
        }))
      }
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error('❌ Payment analysis failed:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Payment analysis failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}