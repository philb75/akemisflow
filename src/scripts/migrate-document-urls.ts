import { prisma } from '@/lib/prisma'
import { DocumentType } from '@prisma/client'

/**
 * Migrate existing document URLs from the Supplier model to the new Document model
 */
async function migrateDocumentUrls() {
  console.log('Starting document URL migration...')

  try {
    // Find all suppliers with document URLs
    const suppliers = await prisma.supplier.findMany({
      where: {
        OR: [
          { proofOfAddressUrl: { not: null } },
          { idDocumentUrl: { not: null } }
        ]
      }
    })

    console.log(`Found ${suppliers.length} suppliers with document URLs to migrate`)

    let migratedCount = 0
    let errorCount = 0

    for (const supplier of suppliers) {
      try {
        // Get the first admin user as the uploader (for migration purposes)
        const adminUser = await prisma.user.findFirst({
          where: { role: 'ADMINISTRATOR' },
          select: { id: true }
        })

        if (!adminUser) {
          console.error('No admin user found for migration')
          continue
        }

        // Migrate proof of address
        if (supplier.proofOfAddressUrl) {
          // Check if document already exists
          const existingProofOfAddress = await prisma.document.findFirst({
            where: {
              supplierId: supplier.id,
              documentType: 'PROOF_OF_ADDRESS',
              publicUrl: supplier.proofOfAddressUrl
            }
          })

          if (!existingProofOfAddress) {
            await prisma.document.create({
              data: {
                fileName: supplier.proofOfAddressName || 'proof_of_address.pdf',
                originalName: supplier.proofOfAddressName || 'proof_of_address.pdf',
                fileType: supplier.proofOfAddressType || 'pdf',
                fileSize: supplier.proofOfAddressSize || 0,
                mimeType: supplier.proofOfAddressType === 'pdf' ? 'application/pdf' : 'application/octet-stream',
                storageProvider: 'supabase', // Assuming existing URLs are from production
                storagePath: supplier.proofOfAddressUrl,
                publicUrl: supplier.proofOfAddressUrl,
                documentType: 'PROOF_OF_ADDRESS',
                supplierId: supplier.id,
                userId: adminUser.id,
                description: 'Migrated from supplier record',
                isVerified: true, // Assume existing documents were verified
                verifiedBy: adminUser.id,
                verifiedAt: new Date()
              }
            })
            console.log(`✓ Migrated proof of address for supplier ${supplier.email}`)
            migratedCount++
          } else {
            console.log(`- Proof of address already migrated for supplier ${supplier.email}`)
          }
        }

        // Migrate ID document
        if (supplier.idDocumentUrl) {
          // Check if document already exists
          const existingIdDocument = await prisma.document.findFirst({
            where: {
              supplierId: supplier.id,
              documentType: 'ID_DOCUMENT',
              publicUrl: supplier.idDocumentUrl
            }
          })

          if (!existingIdDocument) {
            await prisma.document.create({
              data: {
                fileName: supplier.idDocumentName || 'id_document.pdf',
                originalName: supplier.idDocumentName || 'id_document.pdf',
                fileType: supplier.idDocumentType || 'pdf',
                fileSize: supplier.idDocumentSize || 0,
                mimeType: supplier.idDocumentType === 'pdf' ? 'application/pdf' : 'application/octet-stream',
                storageProvider: 'supabase', // Assuming existing URLs are from production
                storagePath: supplier.idDocumentUrl,
                publicUrl: supplier.idDocumentUrl,
                documentType: 'ID_DOCUMENT',
                supplierId: supplier.id,
                userId: adminUser.id,
                description: 'Migrated from supplier record',
                isVerified: true, // Assume existing documents were verified
                verifiedBy: adminUser.id,
                verifiedAt: new Date()
              }
            })
            console.log(`✓ Migrated ID document for supplier ${supplier.email}`)
            migratedCount++
          } else {
            console.log(`- ID document already migrated for supplier ${supplier.email}`)
          }
        }
      } catch (error) {
        console.error(`✗ Error migrating documents for supplier ${supplier.email}:`, error)
        errorCount++
      }
    }

    console.log('\nMigration Summary:')
    console.log(`- Successfully migrated: ${migratedCount} documents`)
    console.log(`- Errors encountered: ${errorCount}`)
    console.log('Migration complete!')
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the migration
migrateDocumentUrls().catch(console.error)