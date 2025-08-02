import { NextRequest, NextResponse } from 'next/server'
import { auth } from "@/lib/auth"

import { prisma } from '@/lib/db'
import { getStorageProvider, validateFile, generateStoragePath } from '@/lib/storage'
import { DocumentType } from '@prisma/client'
import { checkUploadPermission } from '@/middleware/document-security'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const entityType = formData.get('entityType') as string
    const entityId = formData.get('entityId') as string
    const documentType = formData.get('documentType') as DocumentType
    const description = formData.get('description') as string
    const expiryDate = formData.get('expiryDate') as string

    // Validate required fields
    if (!file || !entityType || !entityId || !documentType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate file
    const validation = validateFile(file)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    // Check upload permission
    const uploadPermission = await checkUploadPermission(
      session.user.id,
      entityType as 'entity' | 'contractor' | 'invoice' | 'supplier',
      entityId
    )
    
    if (!uploadPermission.allowed) {
      return NextResponse.json(
        { error: uploadPermission.reason || 'Upload permission denied' },
        { status: 403 }
      )
    }

    // Generate storage path
    const storagePath = generateStoragePath(
      entityType as 'entity' | 'contractor' | 'invoice' | 'supplier',
      entityId,
      file.name
    )

    // Get storage provider
    const storage = getStorageProvider()

    // Convert File to Buffer for upload
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload file
    const uploadResult = await storage.upload(buffer, storagePath, {
      contentType: file.type,
      metadata: {
        uploadedBy: session.user.id,
        entityType,
        entityId,
        documentType
      }
    })

    if (!uploadResult.success) {
      return NextResponse.json(
        { error: uploadResult.error || 'Upload failed' },
        { status: 500 }
      )
    }

    // Create database record
    const document = await prisma.document.create({
      data: {
        fileName: file.name,
        originalName: file.name,
        fileType: file.name.split('.').pop() || 'unknown',
        fileSize: file.size,
        mimeType: file.type,
        storageProvider: process.env.STORAGE_PROVIDER || 'local',
        storagePath: uploadResult.path || storagePath,
        bucketName: process.env.SUPABASE_STORAGE_BUCKET,
        publicUrl: uploadResult.url,
        documentType,
        description,
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        userId: session.user.id,
        // Set the appropriate relation based on entity type
        ...(entityType === 'entity' && { contactId: entityId }),
        ...(entityType === 'contractor' && { supplierId: entityId }),
        ...(entityType === 'supplier' && { supplierId: entityId }),
        ...(entityType === 'invoice' && { invoiceId: entityId })
      }
    })

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        fileName: document.fileName,
        fileType: document.fileType,
        fileSize: document.fileSize,
        url: document.publicUrl,
        uploadedAt: document.uploadedAt
      }
    })
  } catch (error) {
    console.error('Document upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}