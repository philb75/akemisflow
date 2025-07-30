import { PrismaClient } from '@prisma/client'
import { getAirwallexClient, AirwallexBeneficiary } from './airwallex-api'

const prisma = new PrismaClient()

export interface SupplierSyncResult {
  totalBeneficiaries: number
  newSuppliers: number
  updatedSuppliers: number
  errors: string[]
  conflicts: ConflictInfo[]
  syncedSuppliers: SyncedSupplierInfo[]
}

export interface ConflictInfo {
  supplierId: string
  supplierName: string
  airwallexId: string
  conflictType: 'DATA_MISMATCH' | 'DUPLICATE' | 'SYNC_ERROR'
  conflictFields: string[]
  dbValue: any
  airwallexValue: any
  resolution?: 'USE_DB' | 'USE_AIRWALLEX' | 'MANUAL'
}

export interface SyncedSupplierInfo {
  id: string
  name: string
  email?: string
  airwallexBeneficiaryId: string
  airwallexEntityType: string
  bankAccountCurrency?: string
  syncStatus: 'SYNCED' | 'PENDING' | 'ERROR'
  lastSyncAt: Date
  syncError?: string
}

export interface SupplierAirwallexData {
  // Basic supplier info
  firstName: string
  lastName: string
  email?: string
  phone?: string
  company?: string
  
  // Address
  address?: string
  city?: string
  postalCode?: string
  country?: string
  addressState?: string
  addressCountryCode?: string
  
  // Airwallex specific fields
  airwallexBeneficiaryId: string
  airwallexEntityType: string
  airwallexPaymentMethods?: string
  airwallexPayerEntityType?: string
  
  // Bank details
  bankAccountName?: string
  bankAccountNumber?: string
  bankAccountCurrency?: string
  bankName?: string
  bankCountryCode?: string
  swiftCode?: string
  iban?: string
  localClearingSystem?: string
  
  // Personal info
  personalEmail?: string
  personalNationality?: string
  personalOccupation?: string
  personalIdNumber?: string
  personalFirstNameChinese?: string
  personalLastNameChinese?: string
  
  // Legal representative
  legalRepFirstName?: string
  legalRepLastName?: string
  legalRepEmail?: string
  legalRepMobileNumber?: string
  legalRepNationality?: string
  legalRepOccupation?: string
  legalRepIdType?: string
  legalRepAddress?: string
  legalRepCity?: string
  legalRepState?: string
  legalRepPostalCode?: string
  legalRepCountryCode?: string
  
  // Business info
  businessRegistrationNumber?: string
  businessRegistrationType?: string
  
  // Sync status
  airwallexSyncStatus: string
  airwallexRawData: any
  preferredCurrency?: string
}

export class AirwallexSupplierSync {
  private airwallexClient = getAirwallexClient()

  async syncSuppliersFromAirwallex(): Promise<SupplierSyncResult> {
    const result: SupplierSyncResult = {
      totalBeneficiaries: 0,
      newSuppliers: 0,
      updatedSuppliers: 0,
      errors: [],
      conflicts: [],
      syncedSuppliers: []
    }

    try {
      console.log('🔄 Starting supplier sync from Airwallex...')
      
      // Fetch all beneficiaries from Airwallex
      const beneficiaries = await this.airwallexClient.getAllBeneficiaries()
      result.totalBeneficiaries = beneficiaries.length
      console.log(`Found ${beneficiaries.length} beneficiaries in Airwallex`)

      // Process each beneficiary
      for (const beneficiary of beneficiaries) {
        try {
          const supplierData = this.transformAirwallexToSupplier(beneficiary)
          const syncResult = await this.syncSupplier(supplierData, beneficiary)
          
          if (syncResult.isNew) {
            result.newSuppliers++
          } else if (syncResult.isUpdated) {
            result.updatedSuppliers++
          }

          if (syncResult.conflicts) {
            result.conflicts.push(...syncResult.conflicts)
          }

          if (syncResult.supplier) {
            result.syncedSuppliers.push({
              id: syncResult.supplier.id,
              name: `${syncResult.supplier.firstName} ${syncResult.supplier.lastName}`,
              email: syncResult.supplier.email,
              airwallexBeneficiaryId: syncResult.supplier.airwallexBeneficiaryId!,
              airwallexEntityType: syncResult.supplier.airwallexEntityType!,
              bankAccountCurrency: syncResult.supplier.bankAccountCurrency,
              syncStatus: syncResult.supplier.airwallexSyncStatus as any,
              lastSyncAt: syncResult.supplier.airwallexLastSyncAt || new Date(),
              syncError: syncResult.supplier.airwallexSyncError
            })
          }

        } catch (error) {
          console.error(`Error processing beneficiary ${beneficiary.beneficiary_id}:`, error)
          result.errors.push(`Beneficiary ${beneficiary.beneficiary_id}: ${error.message}`)
        }
      }

      console.log('✅ Supplier sync completed')
      console.log(`📊 Summary: ${result.newSuppliers} new, ${result.updatedSuppliers} updated, ${result.conflicts.length} conflicts, ${result.errors.length} errors`)

    } catch (error) {
      console.error('❌ Supplier sync failed:', error)
      result.errors.push(`Sync failed: ${error.message}`)
    }

    return result
  }

  private transformAirwallexToSupplier(beneficiaryData: AirwallexBeneficiary): SupplierAirwallexData {
    const beneficiary = beneficiaryData.beneficiary

    // Determine name based on entity type
    let firstName: string
    let lastName: string
    let company: string | undefined

    if (beneficiary.entity_type === 'COMPANY' && beneficiary.company_name) {
      // For companies, use company name as last name and set company field
      firstName = 'Company'
      lastName = beneficiary.company_name
      company = beneficiary.company_name
    } else if (beneficiary.entity_type === 'PERSONAL') {
      firstName = beneficiary.first_name || 'Unknown'
      lastName = beneficiary.last_name || 'Person'
      
      // If name is empty, try the account name from bank details
      if (!firstName || !lastName || (firstName === 'Unknown' && lastName === 'Person')) {
        if (beneficiary.bank_details?.account_name) {
          const nameParts = beneficiary.bank_details.account_name.split(' ')
          if (nameParts.length >= 2) {
            firstName = nameParts[0]
            lastName = nameParts.slice(1).join(' ')
          } else {
            lastName = beneficiary.bank_details.account_name
          }
        }
      }
    } else {
      firstName = 'Unknown'
      lastName = beneficiary.bank_details?.account_name || `Contact ${beneficiaryData.beneficiary_id.slice(-8)}`
    }

    // Get email from various sources
    const email = beneficiary.additional_info?.personal_email || 
                  beneficiary.additional_info?.legal_rep_email

    // Get phone from additional_info
    const phone = beneficiary.additional_info?.legal_rep_mobile_number

    return {
      firstName,
      lastName,
      email,
      phone,
      company,
      
      // Address
      address: beneficiary.address?.street_address,
      city: beneficiary.address?.city,
      postalCode: beneficiary.address?.postcode,
      country: this.mapCountryCodeToName(beneficiary.address?.country_code),
      addressState: beneficiary.address?.state,
      addressCountryCode: beneficiary.address?.country_code,
      
      // Airwallex specific
      airwallexBeneficiaryId: beneficiaryData.beneficiary_id,
      airwallexEntityType: beneficiary.entity_type,
      airwallexPaymentMethods: JSON.stringify(beneficiaryData.payment_methods || []),
      airwallexPayerEntityType: beneficiaryData.payer_entity_type,
      
      // Bank details
      bankAccountName: beneficiary.bank_details?.account_name,
      bankAccountNumber: beneficiary.bank_details?.account_number,
      bankAccountCurrency: beneficiary.bank_details?.account_currency,
      bankName: beneficiary.bank_details?.bank_name,
      bankCountryCode: beneficiary.bank_details?.bank_country_code,
      swiftCode: beneficiary.bank_details?.swift_code,
      iban: beneficiary.bank_details?.iban,
      localClearingSystem: beneficiary.bank_details?.local_clearing_system,
      
      // Personal information
      personalEmail: beneficiary.additional_info?.personal_email,
      personalNationality: beneficiary.additional_info?.personal_nationality,
      personalOccupation: beneficiary.additional_info?.personal_occupation,
      personalIdNumber: beneficiary.additional_info?.personal_id_number,
      personalFirstNameChinese: beneficiary.additional_info?.personal_first_name_in_chinese,
      personalLastNameChinese: beneficiary.additional_info?.personal_last_name_in_chinese,
      
      // Legal representative
      legalRepFirstName: beneficiary.additional_info?.legal_rep_first_name,
      legalRepLastName: beneficiary.additional_info?.legal_rep_last_name,
      legalRepEmail: beneficiary.additional_info?.legal_rep_email,
      legalRepMobileNumber: beneficiary.additional_info?.legal_rep_mobile_number,
      legalRepNationality: beneficiary.additional_info?.legal_rep_nationality,
      legalRepOccupation: beneficiary.additional_info?.legal_rep_occupation,
      legalRepIdType: beneficiary.additional_info?.legal_rep_id_type,
      legalRepAddress: beneficiary.additional_info?.legal_rep_address?.street_address,
      legalRepCity: beneficiary.additional_info?.legal_rep_address?.city,
      legalRepState: beneficiary.additional_info?.legal_rep_address?.state,
      legalRepPostalCode: beneficiary.additional_info?.legal_rep_address?.postcode,
      legalRepCountryCode: beneficiary.additional_info?.legal_rep_address?.country_code,
      
      // Business information
      businessRegistrationNumber: beneficiary.additional_info?.business_registration_number,
      businessRegistrationType: beneficiary.additional_info?.business_registration_type,
      
      // Sync status
      airwallexSyncStatus: 'SYNCED',
      airwallexRawData: beneficiaryData,
      preferredCurrency: beneficiary.bank_details?.account_currency || 'EUR'
    }
  }

  private async syncSupplier(
    supplierData: SupplierAirwallexData, 
    originalBeneficiary: AirwallexBeneficiary
  ): Promise<{ isNew: boolean; isUpdated: boolean; conflicts?: ConflictInfo[]; supplier?: any }> {
    try {
      // Check if supplier already exists based on Airwallex beneficiary ID
      const existingSupplier = await prisma.supplier.findFirst({
        where: {
          airwallexBeneficiaryId: supplierData.airwallexBeneficiaryId
        }
      })

      if (existingSupplier) {
        // Check for conflicts before updating
        const conflicts = this.detectConflicts(existingSupplier, supplierData)
        
        // Update existing supplier
        const updatedSupplier = await prisma.supplier.update({
          where: { id: existingSupplier.id },
          data: {
            // Only update fields that are not null/undefined
            ...(supplierData.firstName && { firstName: supplierData.firstName }),
            ...(supplierData.lastName && { lastName: supplierData.lastName }),
            ...(supplierData.email && { email: supplierData.email }),
            ...(supplierData.phone && { phone: supplierData.phone }),
            ...(supplierData.company && { company: supplierData.company }),
            ...(supplierData.address && { address: supplierData.address }),
            ...(supplierData.city && { city: supplierData.city }),
            ...(supplierData.postalCode && { postalCode: supplierData.postalCode }),
            ...(supplierData.country && { country: supplierData.country }),
            
            // Always update Airwallex fields
            airwallexEntityType: supplierData.airwallexEntityType,
            airwallexPaymentMethods: supplierData.airwallexPaymentMethods,
            airwallexPayerEntityType: supplierData.airwallexPayerEntityType,
            
            // Bank details
            bankAccountName: supplierData.bankAccountName,
            bankAccountNumber: supplierData.bankAccountNumber,
            bankAccountCurrency: supplierData.bankAccountCurrency,
            bankName: supplierData.bankName,
            bankCountryCode: supplierData.bankCountryCode,
            swiftCode: supplierData.swiftCode,
            iban: supplierData.iban,
            localClearingSystem: supplierData.localClearingSystem,
            
            // Address details
            addressState: supplierData.addressState,
            addressCountryCode: supplierData.addressCountryCode,
            
            // Personal info
            personalEmail: supplierData.personalEmail,
            personalNationality: supplierData.personalNationality,
            personalOccupation: supplierData.personalOccupation,
            personalIdNumber: supplierData.personalIdNumber,
            personalFirstNameChinese: supplierData.personalFirstNameChinese,
            personalLastNameChinese: supplierData.personalLastNameChinese,
            
            // Legal representative
            legalRepFirstName: supplierData.legalRepFirstName,
            legalRepLastName: supplierData.legalRepLastName,
            legalRepEmail: supplierData.legalRepEmail,
            legalRepMobileNumber: supplierData.legalRepMobileNumber,
            legalRepNationality: supplierData.legalRepNationality,
            legalRepOccupation: supplierData.legalRepOccupation,
            legalRepIdType: supplierData.legalRepIdType,
            legalRepAddress: supplierData.legalRepAddress,
            legalRepCity: supplierData.legalRepCity,
            legalRepState: supplierData.legalRepState,
            legalRepPostalCode: supplierData.legalRepPostalCode,
            legalRepCountryCode: supplierData.legalRepCountryCode,
            
            // Business info
            businessRegistrationNumber: supplierData.businessRegistrationNumber,
            businessRegistrationType: supplierData.businessRegistrationType,
            
            // Sync info
            airwallexSyncStatus: 'SYNCED',
            airwallexLastSyncAt: new Date(),
            airwallexSyncError: null,
            airwallexRawData: supplierData.airwallexRawData,
            preferredCurrency: supplierData.preferredCurrency,
            
            updatedAt: new Date()
          }
        })
        
        return { isNew: false, isUpdated: true, conflicts, supplier: updatedSupplier }
      } else {
        // Create new supplier
        const newSupplier = await prisma.supplier.create({
          data: {
            firstName: supplierData.firstName,
            lastName: supplierData.lastName,
            email: supplierData.email || `${supplierData.airwallexBeneficiaryId}@airwallex.placeholder`,
            phone: supplierData.phone,
            company: supplierData.company,
            address: supplierData.address,
            city: supplierData.city,
            postalCode: supplierData.postalCode,
            country: supplierData.country,
            
            // Airwallex fields
            airwallexBeneficiaryId: supplierData.airwallexBeneficiaryId,
            airwallexEntityType: supplierData.airwallexEntityType,
            airwallexPaymentMethods: supplierData.airwallexPaymentMethods,
            airwallexPayerEntityType: supplierData.airwallexPayerEntityType,
            
            // Bank details
            bankAccountName: supplierData.bankAccountName,
            bankAccountNumber: supplierData.bankAccountNumber,
            bankAccountCurrency: supplierData.bankAccountCurrency,
            bankName: supplierData.bankName,
            bankCountryCode: supplierData.bankCountryCode,
            swiftCode: supplierData.swiftCode,
            iban: supplierData.iban,
            localClearingSystem: supplierData.localClearingSystem,
            
            // Address details
            addressState: supplierData.addressState,
            addressCountryCode: supplierData.addressCountryCode,
            
            // Personal info
            personalEmail: supplierData.personalEmail,
            personalNationality: supplierData.personalNationality,
            personalOccupation: supplierData.personalOccupation,
            personalIdNumber: supplierData.personalIdNumber,
            personalFirstNameChinese: supplierData.personalFirstNameChinese,
            personalLastNameChinese: supplierData.personalLastNameChinese,
            
            // Legal representative
            legalRepFirstName: supplierData.legalRepFirstName,
            legalRepLastName: supplierData.legalRepLastName,
            legalRepEmail: supplierData.legalRepEmail,
            legalRepMobileNumber: supplierData.legalRepMobileNumber,
            legalRepNationality: supplierData.legalRepNationality,
            legalRepOccupation: supplierData.legalRepOccupation,
            legalRepIdType: supplierData.legalRepIdType,
            legalRepAddress: supplierData.legalRepAddress,
            legalRepCity: supplierData.legalRepCity,
            legalRepState: supplierData.legalRepState,
            legalRepPostalCode: supplierData.legalRepPostalCode,
            legalRepCountryCode: supplierData.legalRepCountryCode,
            
            // Business info
            businessRegistrationNumber: supplierData.businessRegistrationNumber,
            businessRegistrationType: supplierData.businessRegistrationType,
            
            // Sync info
            airwallexSyncStatus: 'SYNCED',
            airwallexLastSyncAt: new Date(),
            airwallexRawData: supplierData.airwallexRawData,
            preferredCurrency: supplierData.preferredCurrency,
            
            status: 'ACTIVE',
            isActive: true
          }
        })
        
        return { isNew: true, isUpdated: false, supplier: newSupplier }
      }
    } catch (error) {
      console.error(`Error syncing supplier for beneficiary ${supplierData.airwallexBeneficiaryId}:`, error)
      throw error
    }
  }

  private detectConflicts(existingSupplier: any, newData: SupplierAirwallexData): ConflictInfo[] {
    const conflicts: ConflictInfo[] = []
    
    // Check for conflicts in key fields
    const fieldsToCheck = [
      { field: 'email', dbValue: existingSupplier.email, newValue: newData.email },
      { field: 'phone', dbValue: existingSupplier.phone, newValue: newData.phone },
      { field: 'address', dbValue: existingSupplier.address, newValue: newData.address },
      { field: 'bankAccountNumber', dbValue: existingSupplier.bankAccountNumber, newValue: newData.bankAccountNumber }
    ]

    fieldsToCheck.forEach(({ field, dbValue, newValue }) => {
      if (dbValue && newValue && dbValue !== newValue) {
        conflicts.push({
          supplierId: existingSupplier.id,
          supplierName: `${existingSupplier.firstName} ${existingSupplier.lastName}`,
          airwallexId: newData.airwallexBeneficiaryId,
          conflictType: 'DATA_MISMATCH',
          conflictFields: [field],
          dbValue,
          airwallexValue: newValue,
          resolution: 'USE_AIRWALLEX' // Default to Airwallex data
        })
      }
    })

    return conflicts
  }

  private mapCountryCodeToName(countryCode?: string): string | undefined {
    if (!countryCode) return undefined
    
    const countryMap: Record<string, string> = {
      'MA': 'Morocco',
      'CN': 'China',
      'HK': 'Hong Kong',
      'SN': 'Senegal',
      'TN': 'Tunisia',
      'NE': 'Niger',
      'PH': 'Philippines',
      'ES': 'Spain',
      'FR': 'France',
      'DE': 'Germany',
      'IT': 'Italy',
      'GB': 'United Kingdom',
      'NL': 'Netherlands',
      'BE': 'Belgium',
      'LU': 'Luxembourg'
    }
    
    return countryMap[countryCode] || countryCode
  }

  async getSuppliersWithAirwallexData(): Promise<any[]> {
    return await prisma.supplier.findMany({
      where: {
        airwallexBeneficiaryId: {
          not: null
        }
      },
      orderBy: {
        airwallexLastSyncAt: 'desc'
      }
    })
  }

  async getSupplierSyncSummary(): Promise<{
    totalSuppliers: number
    airwallexLinkedSuppliers: number
    syncedSuppliers: number
    pendingSync: number
    syncErrors: number
  }> {
    const totalSuppliers = await prisma.supplier.count()
    
    const airwallexLinkedSuppliers = await prisma.supplier.count({
      where: {
        airwallexBeneficiaryId: {
          not: null
        }
      }
    })

    const syncedSuppliers = await prisma.supplier.count({
      where: {
        airwallexSyncStatus: 'SYNCED'
      }
    })

    const pendingSync = await prisma.supplier.count({
      where: {
        airwallexSyncStatus: 'PENDING'
      }
    })

    const syncErrors = await prisma.supplier.count({
      where: {
        airwallexSyncStatus: 'ERROR'
      }
    })

    return {
      totalSuppliers,
      airwallexLinkedSuppliers,
      syncedSuppliers,
      pendingSync,
      syncErrors
    }
  }
}

// Export singleton instance
export const airwallexSupplierSync = new AirwallexSupplierSync()