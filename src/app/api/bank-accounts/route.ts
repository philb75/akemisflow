import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const bankAccounts = await prisma.bankAccount.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ bankAccounts })
    
  } catch (error: any) {
    console.error("Error fetching bank accounts:", error)
    return NextResponse.json(
      { 
        error: "Failed to fetch bank accounts",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const {
      accountName,
      bankName,
      accountNumber,
      iban,
      swiftBic,
      currency,
      accountType,
      status = 'ACTIVE'
    } = body

    // Validate required fields
    if (!accountName || !bankName || !currency) {
      return NextResponse.json({ 
        error: "Missing required fields: accountName, bankName, currency" 
      }, { status: 400 })
    }

    const bankAccount = await prisma.bankAccount.create({
      data: {
        accountName,
        bankName,
        accountNumber: accountNumber || null,
        iban: iban || null,
        swiftBic: swiftBic || null,
        currency,
        accountType: accountType || 'BUSINESS',
        status: status || 'ACTIVE'
      }
    })

    return NextResponse.json({ bankAccount }, { status: 201 })
    
  } catch (error: any) {
    console.error("Error creating bank account:", error)
    return NextResponse.json(
      { 
        error: "Failed to create bank account",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}