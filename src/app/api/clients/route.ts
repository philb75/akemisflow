import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db-simple';

export async function GET(request: NextRequest) {
  try {
    const clients = await db.getClients();
    
    // Calculate client statistics
    const stats = {
      totalClients: clients.length,
      activeClients: clients.length, // All are active for now
      currencies: [...new Set(clients.map(c => c.currency_preference))],
    };

    return NextResponse.json({
      clients,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Clients API error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to fetch clients data',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // TODO: Implement client creation when database is fully connected
    console.log('Create client request:', body);
    
    return NextResponse.json({
      message: 'Client creation endpoint ready (pending database integration)',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Create client error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to create client',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}