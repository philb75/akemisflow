import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db-simple';

export async function GET(request: NextRequest) {
  try {
    const invoices = await db.getInvoices();
    
    // Calculate invoice statistics
    const stats = {
      total: invoices.length,
      paid: invoices.filter(inv => inv.status === 'PAID').length,
      sent: invoices.filter(inv => inv.status === 'SENT').length,
      draft: invoices.filter(inv => inv.status === 'DRAFT').length,
      overdue: invoices.filter(inv => {
        if (inv.status === 'SENT' && new Date(inv.due_date) < new Date()) {
          return true;
        }
        return false;
      }).length,
      totalAmount: invoices.reduce((sum, inv) => {
        // Convert to EUR for summary (simplified)
        let amount = inv.amount;
        if (inv.currency === 'USD') amount *= 0.92;
        if (inv.currency === 'GBP') amount *= 1.17;
        return sum + amount;
      }, 0),
    };

    return NextResponse.json({
      invoices,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Invoices API error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to fetch invoices data',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}