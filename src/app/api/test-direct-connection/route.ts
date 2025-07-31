import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

export async function GET() {
  console.log('Testing direct connection vs pooled connection')
  
  const results: any = {
    timestamp: new Date().toISOString(),
    tests: {}
  }
  
  // Test 1: Try with DIRECT_URL (no pooler)
  try {
    const directPrisma = new PrismaClient({
      datasourceUrl: process.env.DIRECT_URL
    })
    
    const count = await directPrisma.supplier.count()
    await directPrisma.$disconnect()
    
    results.tests.directConnection = {
      success: true,
      supplierCount: count,
      message: 'Direct connection (port 5432) works!'
    }
  } catch (error: any) {
    results.tests.directConnection = {
      success: false,
      error: error.message,
      code: error.code
    }
  }
  
  // Test 2: Try with DATABASE_URL (pooled)
  try {
    const pooledPrisma = new PrismaClient({
      datasourceUrl: process.env.DATABASE_URL
    })
    
    const count = await pooledPrisma.supplier.count()
    await pooledPrisma.$disconnect()
    
    results.tests.pooledConnection = {
      success: true,
      supplierCount: count,
      message: 'Pooled connection (port 6543) works!'
    }
  } catch (error: any) {
    results.tests.pooledConnection = {
      success: false,
      error: error.message,
      code: error.code
    }
  }
  
  // Test 3: Try alternative pooler format
  try {
    // Try without the AWS subdomain
    const dbUrl = process.env.DATABASE_URL || ''
    const alternativeUrl = dbUrl.replace('aws-0-eu-west-3.pooler.supabase.com', 'db.wflcaapznpczlxjaeyfd.supabase.co')
    
    if (alternativeUrl !== dbUrl) {
      const altPrisma = new PrismaClient({
        datasourceUrl: alternativeUrl
      })
      
      const count = await altPrisma.supplier.count()
      await altPrisma.$disconnect()
      
      results.tests.alternativePooler = {
        success: true,
        supplierCount: count,
        message: 'Alternative host works!'
      }
    }
  } catch (error: any) {
    results.tests.alternativePooler = {
      success: false,
      error: error.message
    }
  }
  
  // Recommendations based on results
  results.recommendations = []
  
  if (results.tests.directConnection?.success && !results.tests.pooledConnection?.success) {
    results.recommendations.push('Use DIRECT_URL for DATABASE_URL in Vercel (temporary fix)')
    results.recommendations.push('Contact Supabase support about PgBouncer connection issues')
  }
  
  return NextResponse.json(results)
}