import { NextRequest, NextResponse } from 'next/server'
import { auth } from "@/lib/auth"

import { prisma } from '@/lib/db'
import { getStorageProvider } from '@/lib/storage'
import { checkDocumentAccess, checkDeletePermission, checkVerifyPermission } from '@/middleware/document-security'

interface RouteParams {
  params: {
    id: string
  }
}

// GET /api/documents/[id] - Get document details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const document = await prisma.document.findUnique({
      where: { id: params.id },
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
        }
      }
    })

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Check document access permission
    const accessCheck = await checkDocumentAccess(session.user.id, params.id)
    
    if (!accessCheck.allowed) {
      return NextResponse.json(
        { error: accessCheck.reason || 'Access denied' },
        { status: 403 }
      )
    }

    return NextResponse.json(document)
  } catch (error) {
    console.error('Document fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/documents/[id] - Delete document
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const document = await prisma.document.findUnique({
      where: { id: params.id }
    })

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Check delete permission
    const deletePermission = await checkDeletePermission(session.user.id, params.id)
    
    if (!deletePermission.allowed) {
      return NextResponse.json(
        { error: deletePermission.reason || 'Delete permission denied' },
        { status: 403 }
      )
    }

    // Delete from storage
    const storage = getStorageProvider()
    await storage.delete(document.storagePath)

    // Soft delete in database
    await prisma.document.update({
      where: { id: params.id },
      data: {
        deletedAt: new Date(),
        isActive: false
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Document delete error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/documents/[id] - Update document metadata
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { description, expiryDate, isVerified, tags } = body

    const document = await prisma.document.findUnique({
      where: { id: params.id }
    })

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Check document access permission
    const accessCheck = await checkDocumentAccess(session.user.id, params.id)
    
    if (!accessCheck.allowed) {
      return NextResponse.json(
        { error: accessCheck.reason || 'Access denied' },
        { status: 403 }
      )
    }

    // Check verify permission if trying to verify
    if (isVerified !== undefined) {
      const verifyPermission = await checkVerifyPermission(session.user.id, params.id)
      
      if (!verifyPermission.allowed) {
        return NextResponse.json(
          { error: verifyPermission.reason || 'Verify permission denied' },
          { status: 403 }
        )
      }
    }

    // Update document
    const updatedDocument = await prisma.document.update({
      where: { id: params.id },
      data: {
        ...(description !== undefined && { description }),
        ...(expiryDate !== undefined && { expiryDate: expiryDate ? new Date(expiryDate) : null }),
        ...(tags !== undefined && { tags }),
        ...(isVerified !== undefined && isAdmin && {
          isVerified,
          verifiedBy: isVerified ? session.user.id : null,
          verifiedAt: isVerified ? new Date() : null
        })
      }
    })

    return NextResponse.json(updatedDocument)
  } catch (error) {
    console.error('Document update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}