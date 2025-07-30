import { NextRequest, NextResponse } from 'next/server'
import { importAirwallexCSV } from '@/lib/airwallex-import'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    // Note: Authentication check removed for testing - add back in production
    // const session = await getServerSession()
    // if (!session) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const body = await request.json()
    const { fileName } = body

    if (!fileName) {
      return NextResponse.json({ error: 'File name is required' }, { status: 400 })
    }

    // Construct the file path (assuming CSV is in project root)
    const filePath = path.join(process.cwd(), fileName)

    // Import the CSV
    const result = await importAirwallexCSV(filePath)

    if (!result.success) {
      return NextResponse.json(
        { 
          error: 'Import failed', 
          details: result.errors 
        }, 
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${result.imported} transactions`,
      imported: result.imported,
      skipped: result.skipped,
      errors: result.errors,
    })

  } catch (error) {
    console.error('Import API error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}

// Alternative endpoint for file upload
export async function PUT(request: NextRequest) {
  try {
    // Note: Authentication check removed for testing - add back in production
    // const session = await getServerSession()
    // if (!session) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Save the uploaded file temporarily
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    const tempFilePath = path.join(process.cwd(), 'temp_' + file.name)
    
    // Write file to disk
    const fs = await import('fs')
    fs.writeFileSync(tempFilePath, buffer)

    try {
      // Import the CSV
      const result = await importAirwallexCSV(tempFilePath)

      // Clean up temp file
      fs.unlinkSync(tempFilePath)

      if (!result.success) {
        return NextResponse.json(
          { 
            error: 'Import failed', 
            details: result.errors 
          }, 
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: `Successfully imported ${result.imported} transactions`,
        imported: result.imported,
        skipped: result.skipped,
        errors: result.errors,
      })

    } catch (importError) {
      // Clean up temp file even if import fails
      try {
        fs.unlinkSync(tempFilePath)
      } catch (cleanupError) {
        console.error('Failed to clean up temp file:', cleanupError)
      }
      throw importError
    }

  } catch (error) {
    console.error('File upload import error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}