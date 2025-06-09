import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db-simple';

export async function GET(request: NextRequest) {
  try {
    const [summary, recentTransactions, recentInvoices] = await Promise.all([
      db.getDashboardSummary(),
      db.getRecentTransactions(5),
      db.getRecentInvoices(5),
    ]);

    return NextResponse.json({
      summary,
      recentTransactions,
      recentInvoices,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to fetch dashboard data',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}