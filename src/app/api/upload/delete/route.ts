import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { unlink } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const fileUrl = searchParams.get('url')
    
    if (!fileUrl) {
      return NextResponse.json({ error: "File URL is required" }, { status: 400 })
    }

    // Extract file path from URL (e.g., /uploads/suppliers/filename.ext)
    if (!fileUrl.startsWith('/uploads/')) {
      return NextResponse.json({ error: "Invalid file URL" }, { status: 400 })
    }

    const relativePath = fileUrl.replace('/uploads/', '')
    const fullPath = join(process.cwd(), 'public', 'uploads', relativePath)
    
    // Security check: ensure the path is within the uploads directory
    if (!fullPath.startsWith(join(process.cwd(), 'public', 'uploads'))) {
      return NextResponse.json({ error: "Invalid file path" }, { status: 400 })
    }
    
    // Check if file exists
    if (!existsSync(fullPath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }
    
    // Delete the file
    await unlink(fullPath)
    
    return NextResponse.json({ message: "File deleted successfully" })
    
  } catch (error: any) {
    console.error("Error deleting file:", error)
    return NextResponse.json(
      { 
        error: "Failed to delete file",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}