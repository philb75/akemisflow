import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = params
    const body = await req.json()
    const {
      accountName,
      bankName,
      accountNumber,
      iban,
      swiftBic,
      currency,
      accountType,
      status
    } = body

    // Check if bank account exists
    const existingAccount = await prisma.bankAccount.findUnique({
      where: { id }
    })

    if (!existingAccount) {
      return NextResponse.json({ error: "Bank account not found" }, { status: 404 })
    }

    const bankAccount = await prisma.bankAccount.update({
      where: { id },
      data: {
        accountName: accountName || existingAccount.accountName,
        bankName: bankName || existingAccount.bankName,
        accountNumber: accountNumber !== undefined ? accountNumber : existingAccount.accountNumber,
        iban: iban !== undefined ? iban : existingAccount.iban,
        swiftBic: swiftBic !== undefined ? swiftBic : existingAccount.swiftBic,
        currency: currency || existingAccount.currency,
        accountType: accountType || existingAccount.accountType,
        status: status || existingAccount.status
      }
    })

    return NextResponse.json({ bankAccount })
    
  } catch (error: any) {
    console.error("Error updating bank account:", error)
    return NextResponse.json(
      { 
        error: "Failed to update bank account",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = params

    // Check if bank account exists
    const existingAccount = await prisma.bankAccount.findUnique({
      where: { id }
    })

    if (!existingAccount) {
      return NextResponse.json({ error: "Bank account not found" }, { status: 404 })
    }

    // Check if bank account is being used in transactions or invoices
    const [transactionCount, invoiceCount] = await Promise.all([
      prisma.transaction.count({ where: { bankAccountId: id } }),
      prisma.invoice.count({ where: { bankAccountId: id } })
    ])

    if (transactionCount > 0 || invoiceCount > 0) {
      return NextResponse.json({ 
        error: "Cannot delete bank account with existing transactions or invoices" 
      }, { status: 400 })
    }

    await prisma.bankAccount.delete({
      where: { id }
    })

    return NextResponse.json({ message: "Bank account deleted successfully" })
    
  } catch (error: any) {
    console.error("Error deleting bank account:", error)
    return NextResponse.json(
      { 
        error: "Failed to delete bank account",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}