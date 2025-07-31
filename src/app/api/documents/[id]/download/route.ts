import { NextRequest, NextResponse } from 'next/server'
import { auth } from "@/lib/auth"

import { prisma } from '@/lib/db'
import { getStorageProvider } from '@/lib/storage'
import { checkDocumentAccess } from '@/middleware/document-security'

interface RouteParams {
  params: {
    id: string
  }
}

// GET /api/documents/[id]/download - Download document
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

    // Get storage provider
    const storage = getStorageProvider()

    // For local storage with public URLs, redirect to the file
    if (document.publicUrl && process.env.STORAGE_PROVIDER === 'local') {
      return NextResponse.redirect(document.publicUrl)
    }

    // For Supabase or when we need to serve the file directly
    try {
      const fileData = await storage.download(document.storagePath)
      
      // Convert Blob to Buffer if needed
      let buffer: Buffer
      if (fileData instanceof Blob) {
        const arrayBuffer = await fileData.arrayBuffer()
        buffer = Buffer.from(arrayBuffer)
      } else {
        buffer = fileData as Buffer
      }

      // Return file with appropriate headers
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': document.mimeType,
          'Content-Disposition': `attachment; filename="${document.originalName}"`,
          'Content-Length': buffer.length.toString(),
          'Cache-Control': 'private, max-age=3600'
        }
      })
    } catch (error) {
      console.error('File download error:', error)
      
      // If we have a public URL, try redirecting as fallback
      if (document.publicUrl) {
        return NextResponse.redirect(document.publicUrl)
      }
      
      throw error
    }
  } catch (error) {
    console.error('Document download error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}