import { NextRequest, NextResponse } from "next/server"
import { prisma as db } from "@/lib/db"

export async function GET() {
  try {
    // Test basic database connection
    const result = await db.$queryRaw`SELECT 1 as test`
    
    return NextResponse.json({
      message: "Database connection successful",
      result,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error("Database connection test error:", error)
    return NextResponse.json(
      { 
        error: "Database connection failed", 
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}