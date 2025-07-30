import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Fetch transactions from the database
    const dbTransactions = await prisma.transaction.findMany({
      include: {
        bankAccount: {
          select: {
            accountName: true,
            bankName: true,
          },
        },
      },
      orderBy: {
        transactionDate: 'desc',
      },
    });

    // Transform to match the expected format
    const transactions = dbTransactions.map(t => ({
      id: t.id,
      transactionDate: t.transactionDate.toISOString(),
      description: t.description || '',
      amount: parseFloat(t.amount.toString()),
      currency: t.currency,
      transactionType: t.transactionType,
      category: t.category,
      status: t.status,
      bankAccount: {
        accountName: t.bankAccount?.accountName || '',
        bankName: t.bankAccount?.bankName || '',
      },
      referenceNumber: t.referenceNumber,
      airwallexTransactionId: t.airwallexTransactionId,
      feeAmount: t.feeAmount ? parseFloat(t.feeAmount.toString()) : null,
      feeCurrency: t.feeCurrency,
      source: t.source,
      exchangeRate: t.exchangeRate ? parseFloat(t.exchangeRate.toString()) : null,
      originalAmount: t.originalAmount ? parseFloat(t.originalAmount.toString()) : null,
      originalCurrency: t.originalCurrency,
    }));
    
    // Calculate transaction statistics
    const stats = {
      totalTransactions: transactions.length,
      totalCredits: transactions
        .filter(t => t.transactionType === 'CREDIT')
        .reduce((sum, t) => sum + t.amount, 0),
      totalDebits: transactions
        .filter(t => t.transactionType === 'DEBIT')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0),
      netFlow: transactions.reduce((sum, t) => {
        return sum + (t.transactionType === 'CREDIT' ? t.amount : t.amount); // amount is already negative for debits
      }, 0),
      currencies: [...new Set(transactions.map(t => t.currency))],
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
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}