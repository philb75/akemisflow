import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    
    // Get basic stats
    const [contactCount, bankAccountCount, transactionCount] = await Promise.all([
      prisma.contact.count(),
      prisma.bankAccount.count(),
      prisma.transaction.count(),
    ]);

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      stats: {
        contacts: contactCount,
        bankAccounts: bankAccountCount,
        transactions: transactionCount,
      },
      version: '0.1.0',
    });
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Database connection failed',
        version: '0.1.0',
      },
      { status: 503 }
    );
  }
}