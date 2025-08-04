import { prisma } from '@/lib/db'
import { DocumentType } from '@prisma/client'

/**
 * Migrate existing document URLs from the Contractor model to the new Document model
 */
async function migrateDocumentUrls() {
  console.log('Starting document URL migration...')

  try {
    // Find all contractors with document URLs
    const contractors = await prisma.contractor.findMany({
      where: {
        OR: [
          { proofOfAddressUrl: { not: null } },
          { idDocumentUrl: { not: null } }
        ]
      }
    })

    console.log(`Found ${contractors.length} contractors with document URLs to migrate`)

    let migratedCount = 0
    let errorCount = 0

    for (const contractor of contractors) {
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
        if (contractor.proofOfAddressUrl) {
          // Check if document already exists
          const existingProofOfAddress = await prisma.document.findFirst({
            where: {
              contractorId: contractor.id,
              documentType: 'PROOF_OF_ADDRESS',
              publicUrl: contractor.proofOfAddressUrl
            }
          })

          if (!existingProofOfAddress) {
            await prisma.document.create({
              data: {
                fileName: contractor.proofOfAddressName || 'proof_of_address.pdf',
                originalName: contractor.proofOfAddressName || 'proof_of_address.pdf',
                fileType: contractor.proofOfAddressType || 'pdf',
                fileSize: contractor.proofOfAddressSize || 0,
                mimeType: contractor.proofOfAddressType === 'pdf' ? 'application/pdf' : 'application/octet-stream',
                storageProvider: 'supabase', // Assuming existing URLs are from production
                storagePath: contractor.proofOfAddressUrl,
                publicUrl: contractor.proofOfAddressUrl,
                documentType: 'PROOF_OF_ADDRESS',
                contractorId: contractor.id,
                userId: adminUser.id,
                description: 'Migrated from contractor record',
                isVerified: true, // Assume existing documents were verified
                verifiedBy: adminUser.id,
                verifiedAt: new Date()
              }
            })
            console.log(`✓ Migrated proof of address for contractor ${contractor.email}`)
            migratedCount++
          } else {
            console.log(`- Proof of address already migrated for contractor ${contractor.email}`)
          }
        }

        // Migrate ID document
        if (contractor.idDocumentUrl) {
          // Check if document already exists
          const existingIdDocument = await prisma.document.findFirst({
            where: {
              contractorId: contractor.id,
              documentType: 'ID_DOCUMENT',
              publicUrl: contractor.idDocumentUrl
            }
          })

          if (!existingIdDocument) {
            await prisma.document.create({
              data: {
                fileName: contractor.idDocumentName || 'id_document.pdf',
                originalName: contractor.idDocumentName || 'id_document.pdf',
                fileType: contractor.idDocumentType || 'pdf',
                fileSize: contractor.idDocumentSize || 0,
                mimeType: contractor.idDocumentType === 'pdf' ? 'application/pdf' : 'application/octet-stream',
                storageProvider: 'supabase', // Assuming existing URLs are from production
                storagePath: contractor.idDocumentUrl,
                publicUrl: contractor.idDocumentUrl,
                documentType: 'ID_DOCUMENT',
                contractorId: contractor.id,
                userId: adminUser.id,
                description: 'Migrated from contractor record',
                isVerified: true, // Assume existing documents were verified
                verifiedBy: adminUser.id,
                verifiedAt: new Date()
              }
            })
            console.log(`✓ Migrated ID document for contractor ${contractor.email}`)
            migratedCount++
          } else {
            console.log(`- ID document already migrated for contractor ${contractor.email}`)
          }
        }
      } catch (error) {
        console.error(`✗ Error migrating documents for contractor ${contractor.email}:`, error)
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