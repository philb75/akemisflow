import { PrismaClient } from '@prisma/client'
import { getAirwallexClient, AirwallexBeneficiary } from './airwallex-api'

const prisma = new PrismaClient()

export interface ContractorSyncResult {
  totalBeneficiaries: number
  newContractors: number
  updatedContractors: number
  errors: string[]
  conflicts: ConflictInfo[]
  syncedContractors: SyncedContractorInfo[]
}

export interface ConflictInfo {
  contractorId: string
  contractorName: string
  airwallexId: string
  conflictType: 'DATA_MISMATCH' | 'DUPLICATE' | 'SYNC_ERROR'
  conflictFields: string[]
  dbValue: any
  airwallexValue: any
  resolution?: 'USE_DB' | 'USE_AIRWALLEX' | 'MANUAL'
}

export interface SyncedContractorInfo {
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

export interface ContractorAirwallexData {
  // Basic contractor info
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

export class AirwallexContractorSync {
  private airwallexClient = getAirwallexClient()

  async syncContractorsFromAirwallex(): Promise<ContractorSyncResult> {
    const result: ContractorSyncResult = {
      totalBeneficiaries: 0,
      newContractors: 0,
      updatedContractors: 0,
      errors: [],
      conflicts: [],
      syncedContractors: []
    }

    try {
      console.log('🔄 Starting contractor sync from Airwallex...')
      
      // Fetch all beneficiaries from Airwallex
      const beneficiaries = await this.airwallexClient.getAllBeneficiaries()
      result.totalBeneficiaries = beneficiaries.length
      console.log(`Found ${beneficiaries.length} beneficiaries in Airwallex`)

      // Process each beneficiary
      for (const beneficiary of beneficiaries) {
        try {
          const contractorData = this.transformAirwallexToContractor(beneficiary)
          const syncResult = await this.syncContractor(contractorData, beneficiary)
          
          if (syncResult.isNew) {
            result.newContractors++
          } else if (syncResult.isUpdated) {
            result.updatedContractors++
          }

          if (syncResult.conflicts) {
            result.conflicts.push(...syncResult.conflicts)
          }

          if (syncResult.contractor) {
            result.syncedContractors.push({
              id: syncResult.contractor.id,
              name: `${syncResult.contractor.firstName} ${syncResult.contractor.lastName}`,
              email: syncResult.contractor.email,
              airwallexBeneficiaryId: syncResult.contractor.airwallexBeneficiaryId!,
              airwallexEntityType: syncResult.contractor.airwallexEntityType!,
              bankAccountCurrency: syncResult.contractor.bankAccountCurrency,
              syncStatus: syncResult.contractor.airwallexSyncStatus as any,
              lastSyncAt: syncResult.contractor.airwallexLastSyncAt || new Date(),
              syncError: syncResult.contractor.airwallexSyncError
            })
          }

        } catch (error) {
          console.error(`Error processing beneficiary ${beneficiary.beneficiary_id}:`, error)
          result.errors.push(`Beneficiary ${beneficiary.beneficiary_id}: ${error.message}`)
        }
      }

      console.log('✅ Contractor sync completed')
      console.log(`📊 Summary: ${result.newContractors} new, ${result.updatedContractors} updated, ${result.conflicts.length} conflicts, ${result.errors.length} errors`)

    } catch (error) {
      console.error('❌ Contractor sync failed:', error)
      result.errors.push(`Sync failed: ${error.message}`)
    }

    return result
  }

  private transformAirwallexToContractor(beneficiaryData: AirwallexBeneficiary): ContractorAirwallexData {
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

  private async syncContractor(
    contractorData: ContractorAirwallexData, 
    originalBeneficiary: AirwallexBeneficiary
  ): Promise<{ isNew: boolean; isUpdated: boolean; conflicts?: ConflictInfo[]; contractor?: any }> {
    try {
      // Check if contractor already exists based on Airwallex beneficiary ID
      const existingContractor = await prisma.contractor.findFirst({
        where: {
          airwallexBeneficiaryId: contractorData.airwallexBeneficiaryId
        }
      })

      if (existingContractor) {
        // Check for conflicts before updating
        const conflicts = this.detectConflicts(existingContractor, contractorData)
        
        // Update existing contractor
        const updatedContractor = await prisma.contractor.update({
          where: { id: existingContractor.id },
          data: {
            // Only update fields that are not null/undefined
            ...(contractorData.firstName && { firstName: contractorData.firstName }),
            ...(contractorData.lastName && { lastName: contractorData.lastName }),
            ...(contractorData.email && { email: contractorData.email }),
            ...(contractorData.phone && { phone: contractorData.phone }),
            ...(contractorData.company && { company: contractorData.company }),
            ...(contractorData.address && { address: contractorData.address }),
            ...(contractorData.city && { city: contractorData.city }),
            ...(contractorData.postalCode && { postalCode: contractorData.postalCode }),
            ...(contractorData.country && { country: contractorData.country }),
            
            // Always update Airwallex fields
            airwallexEntityType: contractorData.airwallexEntityType,
            airwallexPaymentMethods: contractorData.airwallexPaymentMethods,
            airwallexPayerEntityType: contractorData.airwallexPayerEntityType,
            
            // Bank details
            bankAccountName: contractorData.bankAccountName,
            bankAccountNumber: contractorData.bankAccountNumber,
            bankAccountCurrency: contractorData.bankAccountCurrency,
            bankName: contractorData.bankName,
            bankCountryCode: contractorData.bankCountryCode,
            swiftCode: contractorData.swiftCode,
            iban: contractorData.iban,
            localClearingSystem: contractorData.localClearingSystem,
            
            // Address details
            addressState: contractorData.addressState,
            addressCountryCode: contractorData.addressCountryCode,
            
            // Personal info
            personalEmail: contractorData.personalEmail,
            personalNationality: contractorData.personalNationality,
            personalOccupation: contractorData.personalOccupation,
            personalIdNumber: contractorData.personalIdNumber,
            personalFirstNameChinese: contractorData.personalFirstNameChinese,
            personalLastNameChinese: contractorData.personalLastNameChinese,
            
            // Legal representative
            legalRepFirstName: contractorData.legalRepFirstName,
            legalRepLastName: contractorData.legalRepLastName,
            legalRepEmail: contractorData.legalRepEmail,
            legalRepMobileNumber: contractorData.legalRepMobileNumber,
            legalRepNationality: contractorData.legalRepNationality,
            legalRepOccupation: contractorData.legalRepOccupation,
            legalRepIdType: contractorData.legalRepIdType,
            legalRepAddress: contractorData.legalRepAddress,
            legalRepCity: contractorData.legalRepCity,
            legalRepState: contractorData.legalRepState,
            legalRepPostalCode: contractorData.legalRepPostalCode,
            legalRepCountryCode: contractorData.legalRepCountryCode,
            
            // Business info
            businessRegistrationNumber: contractorData.businessRegistrationNumber,
            businessRegistrationType: contractorData.businessRegistrationType,
            
            // Sync info
            airwallexSyncStatus: 'SYNCED',
            airwallexLastSyncAt: new Date(),
            airwallexSyncError: null,
            airwallexRawData: contractorData.airwallexRawData,
            preferredCurrency: contractorData.preferredCurrency,
            
            updatedAt: new Date()
          }
        })
        
        return { isNew: false, isUpdated: true, conflicts, contractor: updatedContractor }
      } else {
        // Create new contractor
        const newContractor = await prisma.contractor.create({
          data: {
            firstName: contractorData.firstName,
            lastName: contractorData.lastName,
            email: contractorData.email || `${contractorData.airwallexBeneficiaryId}@airwallex.placeholder`,
            phone: contractorData.phone,
            company: contractorData.company,
            address: contractorData.address,
            city: contractorData.city,
            postalCode: contractorData.postalCode,
            country: contractorData.country,
            
            // Airwallex fields
            airwallexBeneficiaryId: contractorData.airwallexBeneficiaryId,
            airwallexEntityType: contractorData.airwallexEntityType,
            airwallexPaymentMethods: contractorData.airwallexPaymentMethods,
            airwallexPayerEntityType: contractorData.airwallexPayerEntityType,
            
            // Bank details
            bankAccountName: contractorData.bankAccountName,
            bankAccountNumber: contractorData.bankAccountNumber,
            bankAccountCurrency: contractorData.bankAccountCurrency,
            bankName: contractorData.bankName,
            bankCountryCode: contractorData.bankCountryCode,
            swiftCode: contractorData.swiftCode,
            iban: contractorData.iban,
            localClearingSystem: contractorData.localClearingSystem,
            
            // Address details
            addressState: contractorData.addressState,
            addressCountryCode: contractorData.addressCountryCode,
            
            // Personal info
            personalEmail: contractorData.personalEmail,
            personalNationality: contractorData.personalNationality,
            personalOccupation: contractorData.personalOccupation,
            personalIdNumber: contractorData.personalIdNumber,
            personalFirstNameChinese: contractorData.personalFirstNameChinese,
            personalLastNameChinese: contractorData.personalLastNameChinese,
            
            // Legal representative
            legalRepFirstName: contractorData.legalRepFirstName,
            legalRepLastName: contractorData.legalRepLastName,
            legalRepEmail: contractorData.legalRepEmail,
            legalRepMobileNumber: contractorData.legalRepMobileNumber,
            legalRepNationality: contractorData.legalRepNationality,
            legalRepOccupation: contractorData.legalRepOccupation,
            legalRepIdType: contractorData.legalRepIdType,
            legalRepAddress: contractorData.legalRepAddress,
            legalRepCity: contractorData.legalRepCity,
            legalRepState: contractorData.legalRepState,
            legalRepPostalCode: contractorData.legalRepPostalCode,
            legalRepCountryCode: contractorData.legalRepCountryCode,
            
            // Business info
            businessRegistrationNumber: contractorData.businessRegistrationNumber,
            businessRegistrationType: contractorData.businessRegistrationType,
            
            // Sync info
            airwallexSyncStatus: 'SYNCED',
            airwallexLastSyncAt: new Date(),
            airwallexRawData: contractorData.airwallexRawData,
            preferredCurrency: contractorData.preferredCurrency,
            
            status: 'ACTIVE',
            isActive: true
          }
        })
        
        return { isNew: true, isUpdated: false, contractor: newContractor }
      }
    } catch (error) {
      console.error(`Error syncing contractor for beneficiary ${contractorData.airwallexBeneficiaryId}:`, error)
      throw error
    }
  }

  private detectConflicts(existingContractor: any, newData: ContractorAirwallexData): ConflictInfo[] {
    const conflicts: ConflictInfo[] = []
    
    // Check for conflicts in key fields
    const fieldsToCheck = [
      { field: 'email', dbValue: existingContractor.email, newValue: newData.email },
      { field: 'phone', dbValue: existingContractor.phone, newValue: newData.phone },
      { field: 'address', dbValue: existingContractor.address, newValue: newData.address },
      { field: 'bankAccountNumber', dbValue: existingContractor.bankAccountNumber, newValue: newData.bankAccountNumber }
    ]

    fieldsToCheck.forEach(({ field, dbValue, newValue }) => {
      if (dbValue && newValue && dbValue !== newValue) {
        conflicts.push({
          contractorId: existingContractor.id,
          contractorName: `${existingContractor.firstName} ${existingContractor.lastName}`,
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

  async getContractorsWithAirwallexData(): Promise<any[]> {
    return await prisma.contractor.findMany({
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

  async getContractorSyncSummary(): Promise<{
    totalContractors: number
    airwallexLinkedContractors: number
    syncedContractors: number
    pendingSync: number
    syncErrors: number
  }> {
    const totalContractors = await prisma.contractor.count()
    
    const airwallexLinkedContractors = await prisma.contractor.count({
      where: {
        airwallexBeneficiaryId: {
          not: null
        }
      }
    })

    const syncedContractors = await prisma.contractor.count({
      where: {
        airwallexSyncStatus: 'SYNCED'
      }
    })

    const pendingSync = await prisma.contractor.count({
      where: {
        airwallexSyncStatus: 'PENDING'
      }
    })

    const syncErrors = await prisma.contractor.count({
      where: {
        airwallexSyncStatus: 'ERROR'
      }
    })

    return {
      totalContractors,
      airwallexLinkedContractors,
      syncedContractors,
      pendingSync,
      syncErrors
    }
  }
}

// Export singleton instance
export const airwallexContractorSync = new AirwallexContractorSync()