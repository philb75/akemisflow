import { PrismaClient } from '@prisma/client'
import { formatContractorNames } from '../src/lib/name-formatter'

const prisma = new PrismaClient()

interface OldSupplierData {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  company?: string
  address?: string
  city?: string
  addressState?: string
  postalCode?: string
  country?: string
  addressCountryCode?: string
  airwallexBeneficiaryId?: string
  airwallexEntityType?: string
  airwallexLastSyncAt?: Date
  airwallexPayerEntityType?: string
  airwallexPaymentMethods?: string
  airwallexRawData?: any
  airwallexSyncError?: string
  airwallexSyncStatus?: string
  bankAccountCurrency?: string
  bankAccountName?: string
  bankAccountNumber?: string
  bankCountryCode?: string
  bankName?: string
  businessRegistrationNumber?: string
  businessRegistrationType?: string
  iban?: string
  legalRepAddress?: string
  legalRepCity?: string
  legalRepCountryCode?: string
  legalRepEmail?: string
  legalRepFirstName?: string
  legalRepIdType?: string
  legalRepLastName?: string
  legalRepMobileNumber?: string
  legalRepNationality?: string
  legalRepOccupation?: string
  legalRepPostalCode?: string
  legalRepState?: string
  localClearingSystem?: string
  personalEmail?: string
  personalFirstNameChinese?: string
  personalIdNumber?: string
  personalLastNameChinese?: string
  personalNationality?: string
  personalOccupation?: string
  swiftCode?: string
}

async function migrateAirwallexData() {
  console.log('🚀 Starting Airwallex data migration...')
  
  try {
    // First, get all suppliers that have Airwallex data
    const suppliersWithAirwallex = await prisma.$queryRaw<OldSupplierData[]>`
      SELECT * FROM suppliers 
      WHERE airwallex_beneficiary_id IS NOT NULL
    `
    
    console.log(`📊 Found ${suppliersWithAirwallex.length} suppliers with Airwallex data`)
    
    if (suppliersWithAirwallex.length === 0) {
      console.log('✅ No Airwallex data to migrate')
      return
    }
    
    let migratedCount = 0
    let errorCount = 0
    
    for (const supplier of suppliersWithAirwallex) {
      try {
        // Extract names (could be snake_case or camelCase)
        const firstName = supplier.first_name || supplier.firstName || 'Unknown'
        const lastName = supplier.last_name || supplier.lastName || 'Unknown'
        const beneficiaryId = supplier.airwallex_beneficiary_id || supplier.airwallexBeneficiaryId || `placeholder-${supplier.id}`
        
        console.log(`📦 Migrating supplier: ${firstName} ${lastName} (${supplier.email})`)
        
        // Apply name formatting
        const formattedNames = formatContractorNames({
          firstName: firstName,
          lastName: lastName
        })
        
        // Create AirwallexSupplier record
        await prisma.airwallexContractor.create({
          data: {
            beneficiaryId: beneficiaryId,
            entityType: supplier.airwallex_entity_type || supplier.airwallexEntityType || 'individual',
            
            // Personal information
            firstName: formattedNames.firstName,
            lastName: formattedNames.lastName,
            email: supplier.email,
            phone: supplier.phone,
            company: supplier.company,
            
            // Address fields
            address: supplier.address,
            city: supplier.city,
            state: supplier.addressState,
            postalCode: supplier.postalCode,
            countryCode: supplier.addressCountryCode,
            
            // Banking fields
            bankAccountName: supplier.bankAccountName,
            bankAccountNumber: supplier.bankAccountNumber,
            bankName: supplier.bankName,
            bankCountryCode: supplier.bankCountryCode,
            currency: supplier.bankAccountCurrency,
            iban: supplier.iban,
            swiftCode: supplier.swiftCode,
            localClearingSystem: supplier.localClearingSystem,
            
            // Business registration
            businessRegistrationNumber: supplier.businessRegistrationNumber,
            businessRegistrationType: supplier.businessRegistrationType,
            
            // Legal representative
            legalRepFirstName: supplier.legalRepFirstName,
            legalRepLastName: supplier.legalRepLastName,
            legalRepEmail: supplier.legalRepEmail,
            legalRepMobileNumber: supplier.legalRepMobileNumber,
            legalRepAddress: supplier.legalRepAddress,
            legalRepCity: supplier.legalRepCity,
            legalRepState: supplier.legalRepState,
            legalRepPostalCode: supplier.legalRepPostalCode,
            legalRepCountryCode: supplier.legalRepCountryCode,
            legalRepNationality: supplier.legalRepNationality,
            legalRepOccupation: supplier.legalRepOccupation,
            legalRepIdType: supplier.legalRepIdType,
            
            // Personal fields
            personalEmail: supplier.personalEmail,
            personalIdNumber: supplier.personalIdNumber,
            personalNationality: supplier.personalNationality,
            personalOccupation: supplier.personalOccupation,
            personalFirstNameChinese: supplier.personalFirstNameChinese,
            personalLastNameChinese: supplier.personalLastNameChinese,
            
            // Airwallex specific
            paymentMethods: supplier.airwallexPaymentMethods,
            payerEntityType: supplier.airwallexPayerEntityType,
            status: supplier.airwallexSyncStatus || 'NONE',
            rawData: supplier.airwallexRawData,
            syncError: supplier.airwallexSyncError,
            
            // Link to the original supplier
            linkedSupplierId: supplier.id,
            
            // Set lastFetchedAt to the last sync time if available
            lastFetchedAt: supplier.airwallexLastSyncAt || new Date(),
          }
        })
        
        migratedCount++
        console.log(`✅ Successfully migrated supplier ${supplier.firstName} ${supplier.lastName}`)
        
      } catch (error) {
        errorCount++
        console.error(`❌ Error migrating supplier ${supplier.firstName} ${supplier.lastName}:`, error)
      }
    }
    
    console.log(`\n📈 Migration Summary:`)
    console.log(`✅ Successfully migrated: ${migratedCount} suppliers`)
    console.log(`❌ Errors: ${errorCount} suppliers`)
    
    if (migratedCount > 0) {
      console.log(`\n🗃️  Next step: Run the cleanup script to remove old Airwallex fields from suppliers table`)
      console.log(`⚠️  WARNING: Do not run cleanup until you've verified the migration was successful!`)
    }
    
  } catch (error) {
    console.error('💥 Migration failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

async function cleanupOldAirwallexFields() {
  console.log('🧹 Starting cleanup of old Airwallex fields...')
  
  try {
    // This will be handled by a proper Prisma migration
    // For now, just log what would be cleaned up
    const fieldsToRemove = [
      'airwallex_beneficiary_id',
      'airwallex_entity_type', 
      'airwallex_last_sync_at',
      'airwallex_payer_entity_type',
      'airwallex_payment_methods',
      'airwallex_raw_data',
      'airwallex_sync_error',
      'airwallex_sync_status',
      'business_registration_number',
      'business_registration_type',
      'legal_rep_address',
      'legal_rep_city',
      'legal_rep_country_code',
      'legal_rep_email',
      'legal_rep_first_name',
      'legal_rep_id_type',
      'legal_rep_last_name',
      'legal_rep_mobile_number',
      'legal_rep_nationality',
      'legal_rep_occupation',
      'legal_rep_postal_code',
      'legal_rep_state',
      'local_clearing_system',
      'personal_email',
      'personal_first_name_chinese',
      'personal_id_number',
      'personal_last_name_chinese',
      'personal_nationality',
      'personal_occupation'
    ]
    
    console.log(`📋 Fields to be removed from suppliers table:`)
    fieldsToRemove.forEach(field => console.log(`   - ${field}`))
    
    console.log(`\n⚠️  To complete cleanup, run: npx prisma db push`)
    console.log(`   This will apply the schema changes and remove the old fields.`)
    
  } catch (error) {
    console.error('💥 Cleanup preparation failed:', error)
  }
}

// Main execution
async function main() {
  const command = process.argv[2]
  
  if (command === 'migrate') {
    await migrateAirwallexData()
  } else if (command === 'cleanup') {
    await cleanupOldAirwallexFields()
  } else {
    console.log('📖 Usage:')
    console.log('  npm run migrate:airwallex migrate   # Migrate data to new table')
    console.log('  npm run migrate:airwallex cleanup   # Show cleanup information')
    console.log('')
    console.log('⚠️  Run migrate first, verify data, then update schema with prisma db push')
  }
}

if (require.main === module) {
  main().catch(console.error)
}

export { migrateAirwallexData, cleanupOldAirwallexFields }