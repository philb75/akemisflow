// API route to serve uploaded documents in development mode
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { auth } from '@/lib/auth'
import logger from '@/lib/logger-adaptive'
import environmentDetector from '@/lib/environment'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: urlPath } = await params
  
  // Only allow in development mode
  if (environmentDetector.getMode() === 'vercel-supabase') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }
  
  try {
    // Check authentication
    const session = await auth()
    if (!session) {
      logger.warn('Unauthorized file access attempt', {
        category: 'AUTH',
        metadata: {
          path: urlPath.join('/'),
          userAgent: request.headers.get('user-agent') || 'Unknown',
          ip: request.headers.get('x-forwarded-for') || 'Unknown'
        }
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Construct file path
    const uploadsDir = path.join(process.cwd(), 'uploads', 'documents')
    const filePath = path.join(uploadsDir, ...urlPath)
    
    // Security check: ensure the path is within uploads directory
    const normalizedFilePath = path.normalize(filePath)
    const normalizedUploadsDir = path.normalize(uploadsDir)
    
    if (!normalizedFilePath.startsWith(normalizedUploadsDir)) {
      logger.warn('Suspicious file access attempt (path traversal)', {
        category: 'SECURITY',
        metadata: {
          requestedPath: urlPath.join('/'),
          resolvedPath: normalizedFilePath,
          uploadsDir: normalizedUploadsDir
        }
      })
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }
    
    // Check if file exists
    if (!fs.existsSync(normalizedFilePath)) {
      logger.warn('File not found', {
        category: 'STORAGE',
        metadata: {
          requestedPath: urlPath.join('/'),
          filePath: normalizedFilePath
        }
      })
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }
    
    // Read file
    const fileBuffer = fs.readFileSync(normalizedFilePath)
    const stats = fs.statSync(normalizedFilePath)
    
    // Determine content type based on file extension
    const ext = path.extname(normalizedFilePath).toLowerCase()
    const contentType = getContentType(ext)
    
    logger.info('File served successfully', {
      category: 'STORAGE',
      metadata: {
        path: urlPath.join('/'),
        fileSize: stats.size,
        contentType
      }
    })
    
    // Return file with appropriate headers
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': stats.size.toString(),
        'Cache-Control': 'private, max-age=3600',
        'Content-Disposition': `inline; filename="${path.basename(normalizedFilePath)}"`
      }
    })
    
  } catch (error) {
    logger.error('File serving error', {
      category: 'STORAGE',
      metadata: {
        path: urlPath.join('/'),
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    })
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function getContentType(ext: string): string {
  const contentTypes: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg', 
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  }
  
  return contentTypes[ext] || 'application/octet-stream'
}