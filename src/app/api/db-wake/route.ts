import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

// Database wake-up endpoint
// This endpoint attempts to connect to the database to wake it up if it's paused
export async function GET(req: NextRequest) {
  try {
    console.log("🔄 Attempting to wake up database...")
    
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      }
    })

    // Simple query to wake up the database
    const result = await prisma.$queryRaw`SELECT 1 as wake_up_test, current_timestamp as wake_time`
    
    await prisma.$disconnect()

    console.log("✅ Database wake-up successful:", result)

    return NextResponse.json({ 
      success: true, 
      message: "Database is awake and responding",
      result: result,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error("❌ Database wake-up failed:", error)
    
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Health check endpoint
export async function POST(req: NextRequest) {
  try {
    const prisma = new PrismaClient()
    
    // Test basic database operations
    const tests = {
      connection: false,
      tables: false,
      permissions: false
    }

    // Test 1: Basic connection
    try {
      await prisma.$connect()
      tests.connection = true
    } catch (e) {
      console.error("Connection test failed:", e)
    }

    // Test 2: Check if tables exist
    try {
      await prisma.$queryRaw`SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'`
      tests.tables = true
    } catch (e) {
      console.error("Tables test failed:", e)
    }

    // Test 3: Check permissions
    try {
      await prisma.$queryRaw`SELECT current_user, current_database()`
      tests.permissions = true
    } catch (e) {
      console.error("Permissions test failed:", e)
    }

    await prisma.$disconnect()

    return NextResponse.json({
      success: Object.values(tests).every(Boolean),
      tests,
      database_url: process.env.DATABASE_URL ? "configured" : "missing",
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}