/**
 * Comprehensive Supplier Service
 * Handles CRUD operations, Airwallex sync, and data validation
 */

import { SupplierData, SupplierSyncOptions, SupplierValidation, REQUIRED_SUPPLIER_FIELDS, AIRWALLEX_SYNCABLE_FIELDS } from '@/types/supplier'
import { AirwallexClientStandalone } from './airwallex-client-standalone'
import { formatSupplierNames } from './name-formatter'
import { createClient } from '@supabase/supabase-js'
import { prisma } from './db'

// Environment-aware database client
const useSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)

let supabase: any = null
if (useSupabase) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  supabase = createClient(supabaseUrl, supabaseServiceKey)
}

export class SupplierService {
  
  /**
   * Validate supplier data
   */
  static validateSupplier(data: Partial<SupplierData>): SupplierValidation {
    const errors: string[] = []
    const warnings: string[] = []
    const missingRequired: string[] = []
    
    // Check required fields
    for (const field of REQUIRED_SUPPLIER_FIELDS) {
      if (!data[field]) {
        missingRequired.push(field)
        errors.push(`${field} is required`)
      }
    }
    
    // Validate email format
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push('Invalid email format')
    }
    
    // Validate phone format (basic)
    if (data.phone && data.phone.length < 8) {
      warnings.push('Phone number seems too short')
    }
    
    // Check birth date format
    if (data.birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(data.birthDate)) {
      errors.push('Birth date must be in YYYY-MM-DD format')
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      missingRequired
    }
  }
  
  /**
   * Sync single supplier with Airwallex
   */
  static async syncSupplierWithAirwallex(
    supplierId: string, 
    options: SupplierSyncOptions = {
      syncFields: {},
      overwriteExisting: true,
      applyNameFormatting: true
    }
  ): Promise<{
    success: boolean
    supplier?: SupplierData
    error?: string
    syncedFields: string[]
  }> {
    try {
      // Get current supplier
      const currentSupplier = await this.getSupplier(supplierId)
      if (!currentSupplier) {
        return { success: false, error: 'Supplier not found', syncedFields: [] }
      }
      
      // Check if we have Airwallex beneficiary ID
      if (!currentSupplier.airwallexBeneficiaryId) {
        return { 
          success: false, 
          error: 'No Airwallex beneficiary ID - use bulk sync first', 
          syncedFields: [] 
        }
      }
      
      // Initialize Airwallex client
      const airwallex = new AirwallexClientStandalone()
      await airwallex.initialize()
      
      // Get specific beneficiary
      const beneficiary = await airwallex.getBeneficiary(currentSupplier.airwallexBeneficiaryId)
      if (!beneficiary) {
        return { 
          success: false, 
          error: 'Beneficiary not found in Airwallex', 
          syncedFields: [] 
        }
      }
      
      // Prepare update data
      const updateData: Partial<SupplierData> = {
        airwallexLastSyncAt: new Date().toISOString(),
        airwallexSyncStatus: 'SYNCED',
        airwallexRawData: beneficiary
      }
      
      const syncedFields: string[] = []
      
      // Map Airwallex data to supplier fields
      const fieldMappings = {
        firstName: beneficiary.first_name,
        lastName: beneficiary.last_name,
        email: beneficiary.email,
        phone: beneficiary.phone_number,
        address: beneficiary.address?.street_address,
        city: beneficiary.address?.city,
        zipCode: beneficiary.address?.postcode,
        state: beneficiary.address?.state,
        country: beneficiary.address?.country,
        companyName: beneficiary.company_name,
        bankAccountName: beneficiary.bank_details?.account_name,
        bankAccountNumber: beneficiary.bank_details?.account_number,
        bankName: beneficiary.bank_details?.bank_name,
        swiftCode: beneficiary.bank_details?.swift_code,
        airwallexEntityType: beneficiary.entity_type
      }
      
      // Apply field mappings based on options
      for (const [field, value] of Object.entries(fieldMappings)) {
        const shouldSync = options.syncFields[field as keyof typeof options.syncFields] !== false
        const hasValue = value !== null && value !== undefined && value !== ''
        const shouldOverwrite = options.overwriteExisting || !currentSupplier[field as keyof SupplierData]
        
        if (shouldSync && hasValue && shouldOverwrite) {
          updateData[field as keyof SupplierData] = value
          syncedFields.push(field)
        }
      }
      
      // Apply name formatting if requested
      if (options.applyNameFormatting) {
        updateData.firstName = updateData.firstName ? formatSupplierNames({ firstName: updateData.firstName }).firstName : updateData.firstName
        updateData.lastName = updateData.lastName ? formatSupplierNames({ lastName: updateData.lastName }).lastName : updateData.lastName
      }
      
      // Update supplier
      const updatedSupplier = await this.updateSupplier(supplierId, updateData)
      
      return {
        success: true,
        supplier: updatedSupplier,
        syncedFields
      }
      
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        syncedFields: []
      }
    }
  }
  
  /**
   * Get supplier by ID
   */
  static async getSupplier(id: string): Promise<SupplierData | null> {
    try {
      if (useSupabase) {
        const { data, error } = await supabase
          .from('suppliers')
          .select('*')
          .eq('id', id)
          .single()
        
        if (error || !data) return null
        
        // Transform snake_case to camelCase
        return this.transformSupplierFromDB(data, true)
      } else {
        const supplier = await prisma.supplier.findUnique({
          where: { id }
        })
        
        if (!supplier) return null
        return this.transformSupplierFromDB(supplier, false)
      }
    } catch (error) {
      return null
    }
  }
  
  /**
   * Update supplier
   */
  static async updateSupplier(id: string, data: Partial<SupplierData>): Promise<SupplierData> {
    const validation = this.validateSupplier(data)
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`)
    }
    
    if (useSupabase) {
      const dbData = this.transformSupplierToDB(data, true)
      const { data: updated, error } = await supabase
        .from('suppliers')
        .update(dbData)
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw new Error(error.message)
      return this.transformSupplierFromDB(updated, true)
    } else {
      const dbData = this.transformSupplierToDB(data, false)
      const updated = await prisma.supplier.update({
        where: { id },
        data: dbData
      })
      
      return this.transformSupplierFromDB(updated, false)
    }
  }

  /**
   * Transform supplier data from database format to application format
   */
  private static transformSupplierFromDB(dbData: any, isSupabase: boolean): SupplierData {
    if (isSupabase) {
      // Transform snake_case to camelCase
      return {
        id: dbData.id,
        firstName: dbData.first_name || '',
        lastName: dbData.last_name || '',
        email: dbData.email || '',
        phone: dbData.phone,
        birthDate: dbData.birth_date,
        birthPlace: dbData.birth_place,
        position: dbData.position,
        address: dbData.address,
        city: dbData.city,
        zipCode: dbData.zip_code || dbData.postal_code,
        state: dbData.state,
        country: dbData.country,
        companyName: dbData.company || dbData.company_name,
        vatNumber: dbData.vat_number,
        bankAccountName: dbData.bank_account_name,
        bankAccountNumber: dbData.bank_account_number,
        bankName: dbData.bank_name,
        swiftCode: dbData.swift_code,
        iban: dbData.iban,
        currency: dbData.currency || dbData.bank_account_currency,
        airwallexBeneficiaryId: dbData.airwallex_beneficiary_id,
        airwallexEntityType: dbData.airwallex_entity_type,
        airwallexSyncStatus: dbData.airwallex_sync_status || 'NONE',
        airwallexLastSyncAt: dbData.airwallex_last_sync_at,
        airwallexSyncError: dbData.airwallex_sync_error,
        airwallexRawData: dbData.airwallex_raw_data,
        status: dbData.status || 'ACTIVE',
        isActive: dbData.is_active !== false,
        createdAt: dbData.created_at,
        updatedAt: dbData.updated_at,
        proofOfAddressUrl: dbData.proof_of_address_url,
        proofOfAddressName: dbData.proof_of_address_name,
        proofOfAddressType: dbData.proof_of_address_type,
        proofOfAddressSize: dbData.proof_of_address_size,
        idDocumentUrl: dbData.id_document_url,
        idDocumentName: dbData.id_document_name,
        idDocumentType: dbData.id_document_type,
        idDocumentSize: dbData.id_document_size
      }
    } else {
      // Prisma data (already camelCase)
      return dbData as SupplierData
    }
  }
  
  /**
   * Transform supplier data to database format
   */
  private static transformSupplierToDB(data: Partial<SupplierData>, isSupabase: boolean): any {
    if (isSupabase) {
      // Transform camelCase to snake_case
      const transformed: any = {}
      
      if (data.firstName !== undefined) transformed.first_name = data.firstName
      if (data.lastName !== undefined) transformed.last_name = data.lastName
      if (data.email !== undefined) transformed.email = data.email
      if (data.phone !== undefined) transformed.phone = data.phone
      if (data.birthDate !== undefined) transformed.birth_date = data.birthDate
      if (data.birthPlace !== undefined) transformed.birth_place = data.birthPlace
      if (data.position !== undefined) transformed.position = data.position
      if (data.address !== undefined) transformed.address = data.address
      if (data.city !== undefined) transformed.city = data.city
      if (data.zipCode !== undefined) transformed.postal_code = data.zipCode
      if (data.state !== undefined) transformed.state = data.state
      if (data.country !== undefined) transformed.country = data.country
      if (data.companyName !== undefined) transformed.company = data.companyName
      if (data.vatNumber !== undefined) transformed.vat_number = data.vatNumber
      if (data.bankAccountName !== undefined) transformed.bank_account_name = data.bankAccountName
      if (data.bankAccountNumber !== undefined) transformed.bank_account_number = data.bankAccountNumber
      if (data.bankName !== undefined) transformed.bank_name = data.bankName
      if (data.swiftCode !== undefined) transformed.swift_code = data.swiftCode
      if (data.iban !== undefined) transformed.iban = data.iban
      if (data.currency !== undefined) transformed.bank_account_currency = data.currency
      if (data.airwallexBeneficiaryId !== undefined) transformed.airwallex_beneficiary_id = data.airwallexBeneficiaryId
      if (data.airwallexEntityType !== undefined) transformed.airwallex_entity_type = data.airwallexEntityType
      if (data.airwallexSyncStatus !== undefined) transformed.airwallex_sync_status = data.airwallexSyncStatus
      if (data.airwallexLastSyncAt !== undefined) transformed.airwallex_last_sync_at = data.airwallexLastSyncAt
      if (data.airwallexSyncError !== undefined) transformed.airwallex_sync_error = data.airwallexSyncError
      if (data.airwallexRawData !== undefined) transformed.airwallex_raw_data = data.airwallexRawData
      if (data.status !== undefined) transformed.status = data.status
      if (data.isActive !== undefined) transformed.is_active = data.isActive
      if (data.updatedAt !== undefined) transformed.updated_at = data.updatedAt
      
      return transformed
    } else {
      // Prisma data (keep camelCase)
      return data
    }
  }
}