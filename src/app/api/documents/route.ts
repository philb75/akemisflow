import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { DocumentType } from '@prisma/client'

// GET /api/documents - List documents with filters
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const entityType = searchParams.get('entityType')
    const entityId = searchParams.get('entityId')
    const documentType = searchParams.get('documentType') as DocumentType | null
    const isActive = searchParams.get('isActive') === 'true'
    const isVerified = searchParams.get('isVerified') === 'true'
    const expiringSoon = searchParams.get('expiringSoon') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const isAdmin = session.user.role === 'ADMINISTRATOR'

    // Build query conditions
    const where: any = {
      deletedAt: null,
      isActive: isActive !== false ? true : undefined,
      ...(documentType && { documentType }),
      ...(isVerified && { isVerified: true }),
      ...(expiringSoon && {
        expiryDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        }
      })
    }

    // Filter by entity
    if (entityType && entityId) {
      if (entityType === 'entity' || entityType === 'contact' || entityType === 'client') {
        where.contactId = entityId
      } else if (entityType === 'contractor' || entityType === 'supplier') {
        where.supplierId = entityId
      } else if (entityType === 'invoice') {
        where.invoiceId = entityId
      }
    }

    // Non-admin users can only see their own documents
    if (!isAdmin) {
      where.userId = session.user.id
    }

    // Count total documents
    const total = await prisma.document.count({ where })

    // Fetch documents with pagination
    const documents = await prisma.document.findMany({
      where,
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        verifiedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        contact: {
          select: {
            id: true,
            name: true,
            contactType: true
          }
        },
        supplier: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            company: true
          }
        },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            amount: true,
            currency: true
          }
        }
      },
      orderBy: {
        uploadedAt: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit
    })

    return NextResponse.json({
      documents,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Documents list error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}