import { PrismaClient } from '@prisma/client'
import { getAirwallexClient } from './airwallex-api'

const prisma = new PrismaClient()

export interface ContactSyncResult {
  totalBeneficiaries: number
  totalCounterparties: number
  newContacts: number
  updatedContacts: number
  errors: string[]
  contactsData: Array<{
    source: 'beneficiary' | 'counterparty'
    airwallexId: string
    name: string
    email?: string
    phone?: string
    contactType: string
    status: string
    address?: string
    metadata: any
  }>
}

export class AirwallexContactSync {
  private airwallexClient = getAirwallexClient()

  async syncAllContacts(): Promise<ContactSyncResult> {
    const result: ContactSyncResult = {
      totalBeneficiaries: 0,
      totalCounterparties: 0,
      newContacts: 0,
      updatedContacts: 0,
      errors: [],
      contactsData: []
    }

    try {
      console.log('🔄 Starting Airwallex contact synchronization...')
      
      // Fetch beneficiaries
      console.log('📋 Fetching beneficiaries...')
      const beneficiaries = await this.airwallexClient.getAllBeneficiaries()
      result.totalBeneficiaries = beneficiaries.length
      console.log(`Found ${beneficiaries.length} beneficiaries`)

      // Process beneficiaries
      for (const beneficiary of beneficiaries) {
        try {
          const contactData = this.airwallexClient.transformBeneficiaryToContact(beneficiary)
          const syncResult = await this.syncContact(contactData, 'beneficiary', beneficiary.beneficiary_id)
          
          if (syncResult.isNew) {
            result.newContacts++
          } else if (syncResult.isUpdated) {
            result.updatedContacts++
          }

          // Add to results data
          result.contactsData.push({
            source: 'beneficiary',
            airwallexId: beneficiary.beneficiary_id,
            name: contactData.name,
            email: contactData.email,
            phone: contactData.phone,
            contactType: contactData.contactType,
            status: contactData.status,
            address: this.formatAddress(contactData),
            metadata: contactData.metadata
          })
        } catch (error) {
          console.error(`Error processing beneficiary ${beneficiary.beneficiary_id}:`, error)
          result.errors.push(`Beneficiary ${beneficiary.beneficiary_id}: ${error.message}`)
        }
      }

      // Skip counterparties since endpoint is not available (404)
      console.log('⚠️ Skipping counterparties (endpoint not available)')
      result.totalCounterparties = 0

      console.log('✅ Contact synchronization completed')
      console.log(`📊 Summary: ${result.newContacts} new, ${result.updatedContacts} updated, ${result.errors.length} errors`)

    } catch (error) {
      console.error('❌ Contact sync failed:', error)
      result.errors.push(`Sync failed: ${error.message}`)
    }

    return result
  }

  private async syncContact(
    contactData: any, 
    source: 'beneficiary' | 'counterparty', 
    airwallexId: string
  ): Promise<{ isNew: boolean; isUpdated: boolean; contact?: any }> {
    try {
      // Check if contact already exists based on Airwallex ID in metadata
      const existingContact = await prisma.contact.findFirst({
        where: {
          metadata: {
            path: ['airwallex', 'id'],
            equals: airwallexId
          }
        }
      })

      if (existingContact) {
        // Update existing contact
        const updatedContact = await prisma.contact.update({
          where: { id: existingContact.id },
          data: {
            name: contactData.name,
            email: contactData.email,
            phone: contactData.phone,
            status: contactData.status,
            addressLine1: contactData.addressLine1,
            city: contactData.city,
            state: contactData.state,
            postalCode: contactData.postalCode,
            country: contactData.country,
            currencyPreference: contactData.currencyPreference,
            metadata: contactData.metadata,
            updatedAt: new Date()
          }
        })
        
        return { isNew: false, isUpdated: true, contact: updatedContact }
      } else {
        // Create new contact
        const newContact = await prisma.contact.create({
          data: contactData
        })
        
        return { isNew: true, isUpdated: false, contact: newContact }
      }
    } catch (error) {
      console.error(`Error syncing contact for ${source} ${airwallexId}:`, error)
      throw error
    }
  }

  private formatAddress(contactData: any): string {
    const addressParts = [
      contactData.addressLine1,
      contactData.city,
      contactData.state,
      contactData.postalCode,
      contactData.country
    ].filter(Boolean)
    
    return addressParts.join(', ')
  }

  async deleteAllAirwallexContacts(): Promise<number> {
    try {
      console.log('🗑️ Deleting all Airwallex contacts...')
      
      // Delete all contacts that have Airwallex metadata
      const deleteResult = await prisma.contact.deleteMany({
        where: {
          metadata: {
            path: ['airwallex'],
            not: null
          }
        }
      })

      console.log(`✅ Deleted ${deleteResult.count} Airwallex contacts`)
      return deleteResult.count
    } catch (error) {
      console.error('❌ Error deleting Airwallex contacts:', error)
      throw error
    }
  }

  async getContactsSummary(): Promise<{
    totalContacts: number
    airwallexContacts: number
    beneficiaryContacts: number
    counterpartyContacts: number
  }> {
    const totalContacts = await prisma.contact.count()
    
    const airwallexContacts = await prisma.contact.count({
      where: {
        metadata: {
          path: ['airwallex'],
          not: null
        }
      }
    })

    const beneficiaryContacts = await prisma.contact.count({
      where: {
        metadata: {
          path: ['airwallex', 'id'],
          not: null
        }
      }
    })

    // Counterparties would be in the same count as beneficiaries since they both have airwallex.id
    const counterpartyContacts = 0 // Will need to distinguish in metadata if needed

    return {
      totalContacts,
      airwallexContacts,
      beneficiaryContacts,
      counterpartyContacts
    }
  }
}

// Export singleton instance
export const airwallexContactSync = new AirwallexContactSync()