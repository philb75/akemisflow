import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { randomUUID } from "crypto"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: "Invalid file type. Only images (JPEG, PNG, GIF) and PDF files are allowed." 
      }, { status: 400 })
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: "File too large. Maximum size is 10MB." 
      }, { status: 400 })
    }

    // Create unique filename
    const fileExtension = file.name.split('.').pop()
    const uniqueFilename = `${randomUUID()}.${fileExtension}`
    
    // Create upload directory if it doesn't exist
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'suppliers')
    await mkdir(uploadDir, { recursive: true })
    
    // Save file
    const filePath = join(uploadDir, uniqueFilename)
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filePath, buffer)
    
    // Return file info
    const fileUrl = `/uploads/suppliers/${uniqueFilename}`
    
    return NextResponse.json({
      url: fileUrl,
      name: file.name,
      type: file.type,
      size: file.size,
      originalName: file.name
    }, { status: 201 })
    
  } catch (error: any) {
    console.error("Error uploading file:", error)
    return NextResponse.json(
      { 
        error: "Failed to upload file",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}