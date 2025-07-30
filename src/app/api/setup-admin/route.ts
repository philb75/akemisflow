import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"

export async function POST(req: NextRequest) {
  try {
    // Security check - only allow in development or with special key
    const { searchParams } = new URL(req.url)
    const setupKey = searchParams.get('key')
    
    if (setupKey !== 'admin-setup-2024') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { email, password, firstName, lastName } = body

    if (!email || !password) {
      return NextResponse.json({ 
        error: "Email and password are required" 
      }, { status: 400 })
    }

    console.log('🔐 Hashing password...')
    const hashedPassword = await bcrypt.hash(password, 12)
    
    try {
      console.log('👤 Creating admin user...')
      const user = await prisma.user.create({
        data: {
          email,
          name: `${firstName || ''} ${lastName || ''}`.trim() || email,
          firstName: firstName || null,
          lastName: lastName || null,
          password: hashedPassword,
          role: 'ADMINISTRATOR',
          isActive: true,
          emailVerified: new Date(),
          timezone: 'Europe/Paris',
          language: 'en'
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true
        }
      })

      console.log('✅ Admin user created successfully!')
      return NextResponse.json({ 
        message: "Admin user created successfully",
        user: user
      })
      
    } catch (error: any) {
      if (error.code === 'P2002') {
        console.log('ℹ️  User already exists, updating role to ADMINISTRATOR...')
        
        const updatedUser = await prisma.user.update({
          where: { email },
          data: {
            role: 'ADMINISTRATOR',
            isActive: true,
            firstName: firstName || undefined,
            lastName: lastName || undefined,
            name: `${firstName || ''} ${lastName || ''}`.trim() || email
          },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
            updatedAt: true
          }
        })
        
        console.log('✅ User updated to Administrator successfully!')
        return NextResponse.json({ 
          message: "User updated to Administrator successfully",
          user: updatedUser
        })
      } else {
        throw error
      }
    }
    
  } catch (error: any) {
    console.error("Error setting up admin user:", error)
    return NextResponse.json(
      { 
        error: "Failed to setup admin user",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}