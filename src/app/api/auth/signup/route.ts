import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma as db } from "@/lib/db"
import { z } from "zod"

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name, firstName, lastName } = signupSchema.parse(body)

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email }
    }).catch((error) => {
      console.error("Database connection error:", error)
      throw new Error("Database connection failed")
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    const user = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        firstName,
        lastName,
        role: "UNASSIGNED", // Default role
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      }
    })

    return NextResponse.json({
      message: "User created successfully",
      user,
    })
  } catch (error) {
    console.error("Signup error:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input data", details: error.errors },
        { status: 400 }
      )
    }

    // More specific error for database issues
    if (error instanceof Error) {
      if (error.message.includes("Database connection failed")) {
        return NextResponse.json(
          { error: "Database unavailable. Please try again later." },
          { status: 503 }
        )
      }
    }

    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}