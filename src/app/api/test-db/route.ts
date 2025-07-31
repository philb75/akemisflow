import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  console.log('Test DB Route - Starting connection test')
  
  // Log environment variables (without exposing sensitive data)
  const envCheck = {
    hasDbUrl: !!process.env.DATABASE_URL,
    hasDirectUrl: !!process.env.DIRECT_URL,
    dbUrlLength: process.env.DATABASE_URL?.length || 0,
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
  }
  
  console.log('Environment check:', envCheck)
  
  try {
    // Test 1: Simple count query
    console.log('Attempting database connection...')
    const supplierCount = await prisma.supplier.count()
    console.log('Supplier count successful:', supplierCount)
    
    // Test 2: Try to fetch Prisma version
    const prismaVersion = await prisma.$queryRaw`SELECT version()`
    console.log('Database version query successful')
    
    return NextResponse.json({ 
      success: true, 
      tests: {
        supplierCount,
        databaseVersion: prismaVersion,
      },
      environment: envCheck,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('Database test error:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      clientVersion: error.clientVersion,
    })
    
    // Extract useful error details
    const errorDetails = {
      name: error.name,
      message: error.message,
      code: error.code,
      meta: error.meta,
      clientVersion: error.clientVersion,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }
    
    // Check for specific error types
    if (error.code === 'P1001') {
      errorDetails.hint = 'Cannot reach database server. Check if the database is running and accessible.'
    } else if (error.code === 'P1002') {
      errorDetails.hint = 'Database server was reached but timed out.'
    } else if (error.code === 'P1003') {
      errorDetails.hint = 'Database does not exist.'
    } else if (error.code === 'P1008') {
      errorDetails.hint = 'Operations timed out.'
    } else if (error.code === 'P1009') {
      errorDetails.hint = 'Database already exists.'
    } else if (error.code === 'P1010') {
      errorDetails.hint = 'User was denied access on the database.'
    }
    
    return NextResponse.json({ 
      success: false, 
      error: errorDetails,
      environment: envCheck,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}