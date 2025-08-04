import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { createClient } from '@supabase/supabase-js'
import logger from "@/lib/logger-adaptive"
import { withErrorHandler } from "@/middleware/error-handler"
import environmentDetector from "@/lib/environment"
import localStorage from "@/lib/storage-local"

// Environment-aware database client using our environment detector
const useSupabase = environmentDetector.canUseSupabase()

logger.info('Document upload API initialized', {
  category: 'API',
  metadata: {
    environment: environmentDetector.getMode(),
    useSupabase,
    canUsePrisma: environmentDetector.canUsePrisma()
  }
})

// Initialize Supabase client for production
let supabase: any = null
if (useSupabase) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  supabase = createClient(supabaseUrl, supabaseServiceKey)
}

async function handleDocumentUpload(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  logger.api('Document upload request received', {
    metadata: { supplierId: id }
  })
    
  const session = await auth()
  
  if (!session) {
    logger.warn('Unauthorized document upload attempt', {
      category: 'AUTH',
      metadata: { supplierId: id }
    })
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
    
  const formData = await req.formData()
  
  const file = formData.get('file') as File
  const documentType = formData.get('documentType') as string
  
  logger.info('Document upload details', {
    category: 'API',
    metadata: {
      supplierId: id,
      fileName: file?.name,
      fileType: file?.type,
      fileSize: file?.size,
      documentType
    }
  })
  
  if (!file || !documentType) {
    logger.warn('Invalid document upload request', {
      category: 'API',
      metadata: {
        supplierId: id,
        hasFile: !!file,
        hasDocumentType: !!documentType
      }
    })
    return NextResponse.json(
      { error: "File and document type are required" },
      { status: 400 }
    )
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
  if (!allowedTypes.includes(file.type)) {
    logger.warn('Invalid file type uploaded', {
      category: 'API',
      metadata: {
        supplierId: id,
        fileType: file.type,
        allowedTypes
      }
    })
    return NextResponse.json(
      { error: "Only PDF, JPG, JPEG, and PNG files are allowed" },
      { status: 400 }
    )
  }

  // Validate file size (5MB limit)
  const maxSize = 5 * 1024 * 1024 // 5MB
  if (file.size > maxSize) {
    logger.warn('File size too large', {
      category: 'API',
      metadata: {
        supplierId: id,
        fileSize: file.size,
        maxSize,
        fileName: file.name
      }
    })
    return NextResponse.json(
      { error: "File size must be less than 5MB" },
      { status: 400 }
    )
  }

  try {
    let documentUrl: string
    let fileName: string = file.name
    let fileType: string = file.type
    let fileSize: number = file.size

    if (useSupabase) {
      try {
        // Try to upload to Supabase Storage
        const fileExt = file.name.split('.').pop()
        const storageFileName = `${id}/${documentType}_${Date.now()}.${fileExt}`
        
        const { data, error } = await supabase.storage
          .from('supplier-documents')
          .upload(storageFileName, file, {
            cacheControl: '3600',
            upsert: false
          })

        if (error) {
          logger.error('Supabase storage error, falling back to base64', {
            category: 'STORAGE',
            metadata: {
              supplierId: id,
              fileName: file.name,
              storageFileName,
              error: error.message
            }
          })
          // Fallback to local storage if Supabase storage fails
          const storageResult = await localStorage.storeFile(file, id, documentType)
          documentUrl = storageResult.url
          logger.info('Using local storage fallback', {
            category: 'STORAGE',
            metadata: {
              supplierId: id,
              documentType,
              fileName: file.name,
              storedUrl: documentUrl
            }
          })
        } else {
          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('supplier-documents')
            .getPublicUrl(storageFileName)

          documentUrl = publicUrl
        }
      } catch (storageError) {
        logger.error('Storage operation failed, falling back to base64', {
          category: 'STORAGE',
          metadata: {
            supplierId: id,
            fileName: file.name,
            error: storageError instanceof Error ? storageError.message : 'Unknown storage error'
          }
        })
        // Fallback to local storage
        const storageResult = await localStorage.storeFile(file, id, documentType)
        documentUrl = storageResult.url
        logger.info('Using local storage fallback after Supabase error', {
          category: 'STORAGE',
          metadata: {
            supplierId: id,
            documentType,
            fileName: file.name,
            storedUrl: documentUrl
          }
        })
      }
    } else {
      // For local development, store as file using local storage
      const storageResult = await localStorage.storeFile(file, id, documentType)
      documentUrl = storageResult.url
      logger.info('Document stored locally', {
        category: 'STORAGE',
        metadata: {
          supplierId: id,
          documentType,
          fileName: file.name,
          storedUrl: documentUrl,
          storedFileName: storageResult.fileName
        }
      })
    }

    // Update supplier with document information
    const documentField = getDocumentField(documentType)
    logger.info('Mapping document type to database field', {
      category: 'API',
      metadata: {
        supplierId: id,
        documentType,
        mappedField: documentField
      }
    })
    
    if (!documentField) {
      logger.warn('Invalid document type provided', {
        category: 'API',
        metadata: {
          supplierId: id,
          documentType,
          availableTypes: Object.keys({
            'proofOfAddress': 'proofOfAddress',
            'idDocument': 'idDocument',
            'bankStatement': 'bankStatement',
            'contract': 'contract',
            'identity': 'idDocument',
            'banking': 'bankStatement',
            'legal': 'contract',
            'address': 'proofOfAddress',
            'tax': 'contract',
            'other': 'contract'
          })
        }
      })
      return NextResponse.json(
        { error: "Invalid document type" },
        { status: 400 }
      )
    }

    let updatedSupplier
    if (useSupabase) {
      // For Supabase, we need to check which fields actually exist
      // Based on the supplier update route, let's use the correct field mapping
      const supabaseUpdateData: any = {}
      
      // Map document fields to the actual Supabase column names
      if (documentField === 'proofOfAddress') {
        supabaseUpdateData.proof_of_address_url = documentUrl
        supabaseUpdateData.proof_of_address_name = fileName
        supabaseUpdateData.proof_of_address_type = fileType
        supabaseUpdateData.proof_of_address_size = fileSize
      } else if (documentField === 'idDocument') {
        supabaseUpdateData.id_document_url = documentUrl
        supabaseUpdateData.id_document_name = fileName
        supabaseUpdateData.id_document_type = fileType
        supabaseUpdateData.id_document_size = fileSize
      } else {
        // For other document types, use snake_case conversion
        const snakeField = documentField.replace(/([A-Z])/g, '_$1').toLowerCase()
        supabaseUpdateData[`${snakeField}_url`] = documentUrl
        supabaseUpdateData[`${snakeField}_name`] = fileName
        supabaseUpdateData[`${snakeField}_type`] = fileType
        supabaseUpdateData[`${snakeField}_size`] = fileSize
      }

      logger.info('Updating supplier document in Supabase', {
        category: 'DATABASE',
        metadata: {
          supplierId: id,
          updateFields: Object.keys(supabaseUpdateData),
          documentType
        }
      })

      const { data, error } = await supabase
        .from('contractors')
        .update(supabaseUpdateData)
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      updatedSupplier = data
    } else {
      // For Prisma, use camelCase field names
      const updateData = {
        [`${documentField}Url`]: documentUrl,
        [`${documentField}Name`]: fileName,
        [`${documentField}Type`]: fileType,
        [`${documentField}Size`]: fileSize
      }
      
      logger.info('Updating supplier document in Prisma', {
        category: 'DATABASE',
        metadata: {
          supplierId: id,
          updateFields: Object.keys(updateData),
          documentType
        }
      })

      updatedSupplier = await prisma.contractor.update({
        where: { id },
        data: updateData
      })
    }

    logger.success('Document upload completed successfully', {
      category: 'API',
      metadata: {
        supplierId: id,
        documentType,
        fileName,
        fileSize,
        useSupabase: useSupabase
      }
    })
    
    return NextResponse.json({
      success: true,
      document: {
        url: documentUrl,
        name: fileName,
        type: fileType,
        size: fileSize
      },
      supplier: updatedSupplier
    })
  } catch (error) {
    logger.error('Document upload failed', {
      category: 'API',
      metadata: {
        supplierId: id,
        documentType: formData?.get('documentType') as string,
        fileName: (formData?.get('file') as File)?.name,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          code: (error as any)?.code,
          name: (error as any)?.name
        }
      }
    })
    
    return NextResponse.json(
      { error: "Failed to upload document" },
      { status: 500 }
    )
  }
}

function getDocumentField(documentType: string): string | null {
  const fieldMap: { [key: string]: string } = {
    // Original field mappings
    'proofOfAddress': 'proofOfAddress',
    'idDocument': 'idDocument',
    'bankStatement': 'bankStatement',
    'contract': 'contract',
    
    // Category-based mappings from UI
    'identity': 'idDocument',
    'banking': 'bankStatement',
    'legal': 'contract',
    'address': 'proofOfAddress',
    'tax': 'contract',
    'other': 'contract'
  }
  
  return fieldMap[documentType.toLowerCase()] || null
}

// Export the route handler with error handling middleware
export const POST = withErrorHandler(handleDocumentUpload)