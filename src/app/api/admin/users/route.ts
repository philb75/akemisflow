import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"

// GET /api/admin/users - List all users
export async function GET() {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user has admin privileges
    if (session.user?.role !== 'ADMINISTRATOR') {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 })
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        lastLoginAt: true,
        // Note: firstName and lastName are not in the current Prisma schema
        // but we'll include them when they're added
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ 
      users: users.map(user => ({
        ...user,
        // Map role to match frontend expectations
        role: user.role || 'UNASSIGNED'
      }))
    })
  } catch (error) {
    console.error("Failed to fetch users:", error)
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    )
  }
}

// POST /api/admin/users - Create new user
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user has admin privileges
    if (session.user?.role !== 'ADMINISTRATOR') {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 })
    }

    const body = await request.json()
    const { email, password, name, firstName, lastName, role = 'UNASSIGNED' } = body

    // Validate required fields
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Email, password, and name are required" },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role,
        // Note: firstName and lastName are not in current schema
        // We'll add them when schema is updated
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      }
    })

    return NextResponse.json({ 
      message: "User created successfully",
      user: {
        ...user,
        role: user.role || 'UNASSIGNED'
      }
    })
  } catch (error) {
    console.error("Failed to create user:", error)
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    )
  }
}