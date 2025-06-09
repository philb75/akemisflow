import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db-simple';

export async function GET(request: NextRequest) {
  try {
    const transactions = await db.getTransactions();
    
    // Calculate transaction statistics
    const stats = {
      total: transactions.length,
      credits: transactions.filter(t => t.transaction_type === 'CREDIT').length,
      debits: transactions.filter(t => t.transaction_type === 'DEBIT').length,
      netFlowEUR: transactions
        .filter(t => t.currency === 'EUR')
        .reduce((sum, t) => {
          return sum + (t.transaction_type === 'CREDIT' ? t.amount : -t.amount);
        }, 0),
      categories: [...new Set(transactions.map(t => t.category))],
    };

    return NextResponse.json({
      transactions,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Transactions API error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to fetch transactions data',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}