import { NextRequest, NextResponse } from "next/server"

export async function GET() {
  try {
    // Use Supabase REST API to wake up the database
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase configuration missing")
    }

    // Make a simple REST API call to wake up the database
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      return NextResponse.json({
        message: "Database wake-up call successful",
        status: response.status,
        timestamp: new Date().toISOString()
      })
    } else {
      const errorText = await response.text()
      return NextResponse.json({
        message: "Database wake-up call made, may need time to activate",
        status: response.status,
        details: errorText,
        timestamp: new Date().toISOString()
      })
    }
  } catch (error) {
    console.error("Database wake-up error:", error)
    return NextResponse.json(
      { 
        error: "Failed to wake database", 
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}