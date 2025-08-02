/**
 * Comprehensive Supplier Data Model
 * Supports both Airwallex sync and manual data entry
 */

export interface SupplierData {
  // Basic identification
  id: string
  
  // Personal Information (Airwallex syncable)
  firstName: string                    // ✅ Airwallex: first_name
  lastName: string                     // ✅ Airwallex: last_name  
  email: string                        // ✅ Airwallex: email
  phone?: string                       // ✅ Airwallex: phone_number
  
  // Personal Information (Manual only)
  birthDate?: string                   // ❌ Manual only
  birthPlace?: string                  // ❌ Manual only
  position?: string                    // ❌ Manual only - job title/role
  
  // Address Information (Airwallex syncable)
  address?: string                     // ✅ Airwallex: address.street_address
  city?: string                        // ✅ Airwallex: address.city
  zipCode?: string                     // ✅ Airwallex: address.postcode
  state?: string                       // ✅ Airwallex: address.state
  country?: string                     // ✅ Airwallex: address.country
  
  // Company Information (Airwallex syncable)
  companyName?: string                 // ✅ Airwallex: company_name
  vatNumber?: string                   // ❌ Manual only
  
  // Banking Information (Airwallex syncable)
  bankAccountName?: string             // ✅ Airwallex: bank_details.account_name
  bankAccountNumber?: string           // ✅ Airwallex: bank_details.account_number
  bankName?: string                    // ✅ Airwallex: bank_details.bank_name
  swiftCode?: string                   // ✅ Airwallex: bank_details.swift_code
  iban?: string                        // ✅ Same as account_number usually
  currency?: string                    // 🟡 Derived from payment_methods
  
  // Airwallex Integration
  airwallexBeneficiaryId?: string      // ✅ Airwallex: id
  airwallexContactId?: string          // ✅ Airwallex contact ID stored in AkemisFlow
  airwallexEntityType?: 'COMPANY' | 'PERSONAL'  // ✅ Airwallex: entity_type
  airwallexSyncStatus?: 'NONE' | 'PENDING' | 'SYNCED' | 'ERROR'
  airwallexLastSyncAt?: string
  airwallexSyncError?: string
  airwallexRawData?: any               // Full Airwallex response
  
  // System Information
  status: 'ACTIVE' | 'INACTIVE'
  isActive: boolean
  createdAt: string
  updatedAt: string
  
  // Documents (Manual only)
  proofOfAddressUrl?: string
  proofOfAddressName?: string
  proofOfAddressType?: string
  proofOfAddressSize?: number
  idDocumentUrl?: string
  idDocumentName?: string
  idDocumentType?: string
  idDocumentSize?: number
}

export interface AirwallexSyncableFields {
  // Fields that can be automatically synced from Airwallex
  firstName: boolean
  lastName: boolean
  email: boolean
  phone: boolean
  address: boolean
  city: boolean
  zipCode: boolean
  state: boolean
  country: boolean
  companyName: boolean
  bankAccountName: boolean
  bankAccountNumber: boolean
  bankName: boolean
  swiftCode: boolean
  iban: boolean
  airwallexBeneficiaryId: boolean
  airwallexEntityType: boolean
}

export interface SupplierSyncOptions {
  // Which fields to sync from Airwallex
  syncFields: Partial<AirwallexSyncableFields>
  
  // Whether to overwrite existing data
  overwriteExisting: boolean
  
  // Whether to apply name formatting
  applyNameFormatting: boolean
}

export interface SupplierValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
  missingRequired: string[]
}

// Field categories for UI organization
export const SUPPLIER_FIELD_CATEGORIES = {
  personal: {
    title: 'Personal Information',
    fields: ['firstName', 'lastName', 'email', 'phone', 'birthDate', 'birthPlace', 'position']
  },
  address: {
    title: 'Address Information', 
    fields: ['address', 'city', 'zipCode', 'state', 'country']
  },
  company: {
    title: 'Company Information',
    fields: ['companyName', 'vatNumber']
  },
  banking: {
    title: 'Banking Information',
    fields: ['bankAccountName', 'bankAccountNumber', 'bankName', 'swiftCode', 'iban', 'currency']
  },
  airwallex: {
    title: 'Airwallex Integration',
    fields: ['airwallexBeneficiaryId', 'airwallexEntityType', 'airwallexSyncStatus', 'airwallexLastSyncAt']
  },
  system: {
    title: 'System Information',
    fields: ['status', 'isActive', 'createdAt', 'updatedAt']
  },
  documents: {
    title: 'Documents',
    fields: ['proofOfAddressUrl', 'idDocumentUrl']
  }
} as const

// Required fields for supplier creation
export const REQUIRED_SUPPLIER_FIELDS = [
  'firstName',
  'lastName', 
  'email'
] as const

// Fields that can be automatically synced from Airwallex
export const AIRWALLEX_SYNCABLE_FIELDS = [
  'firstName',
  'lastName',
  'email', 
  'phone',
  'address',
  'city',
  'zipCode',
  'state', 
  'country',
  'companyName',
  'bankAccountName',
  'bankAccountNumber',
  'bankName',
  'swiftCode',
  'airwallexBeneficiaryId',
  'airwallexEntityType'
] as const