import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { readFile } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const filePath = params.path.join('/')
    const fullPath = join(process.cwd(), 'public', 'uploads', filePath)
    
    // Security check: ensure the path is within the uploads directory
    if (!fullPath.startsWith(join(process.cwd(), 'public', 'uploads'))) {
      return NextResponse.json({ error: "Invalid file path" }, { status: 400 })
    }
    
    // Check if file exists
    if (!existsSync(fullPath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }
    
    // Read and serve the file
    const fileBuffer = await readFile(fullPath)
    const fileName = filePath.split('/').pop() || 'document'
    
    // Determine content type based on file extension
    const ext = fileName.split('.').pop()?.toLowerCase()
    let contentType = 'application/octet-stream'
    
    switch (ext) {
      case 'pdf':
        contentType = 'application/pdf'
        break
      case 'jpg':
      case 'jpeg':
        contentType = 'image/jpeg'
        break
      case 'png':
        contentType = 'image/png'
        break
      case 'gif':
        contentType = 'image/gif'
        break
    }
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    })
    
  } catch (error) {
    console.error("Error downloading file:", error)
    return NextResponse.json(
      { error: "Failed to download file" },
      { status: 500 }
    )
  }
}