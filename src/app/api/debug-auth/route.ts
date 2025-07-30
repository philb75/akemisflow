import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const debugKey = searchParams.get('key')
    
    if (debugKey !== 'debug-auth-2024') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ 
        error: "Email and password are required" 
      }, { status: 400 })
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    })

    if (!user) {
      return NextResponse.json({
        success: false,
        message: "User not found",
        email: email,
        userExists: false
      })
    }

    // Test password comparison
    const isValidPassword = await bcrypt.compare(password, user.password || '')
    
    return NextResponse.json({
      success: true,
      message: "Debug info retrieved",
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        hasPassword: !!user.password,
        passwordLength: user.password?.length || 0
      },
      passwordTest: {
        providedPassword: password,
        passwordMatches: isValidPassword,
        bcryptHashExists: !!user.password
      }
    })
    
  } catch (error: any) {
    console.error("Debug auth error:", error)
    return NextResponse.json(
      { 
        error: "Debug failed",
        details: error.message
      },
      { status: 500 }
    )
  }
}