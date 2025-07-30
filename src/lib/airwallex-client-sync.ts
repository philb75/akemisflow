import { PrismaClient } from '@prisma/client'
import { getAirwallexClient } from './airwallex-api'

const getAirwallexApi = () => getAirwallexClient()

const prisma = new PrismaClient()

export interface AirwallexPayer {
  id: string
  entity_type: 'INDIVIDUAL' | 'COMPANY'
  name?: string
  email?: string
  phone_number?: string
  address?: {
    country_code: string
    state?: string
    city?: string
    postal_code?: string
    street_address?: string
  }
  contact_details?: {
    email?: string
    phone_number?: string
  }
  payment_methods?: string[]
  capabilities?: string[]
  status?: string
  created_at?: string
  updated_at?: string
}

export interface ClientSyncResult {
  totalPayers: number
  newClients: number
  updatedClients: number
  conflicts: ClientSyncConflict[]
  errors: number
  syncedClients: any[]
}

export interface ClientSyncConflict {
  airwallexPayerId: string
  clientId: string
  field: string
  airwallexValue: any
  databaseValue: any
  resolution?: 'AIRWALLEX_WINS' | 'DATABASE_WINS' | 'MANUAL_REVIEW'
}

export interface ClientSyncSummary {
  totalClients: number
  airwallexLinkedClients: number
  syncedClients: number
  pendingSync: number
  syncErrors: number
}

class AirwallexClientSync {
  /**
   * Sync clients from Airwallex counterparties and transaction analysis
   */
  async syncClientsFromAirwallex(): Promise<ClientSyncResult> {
    try {
      console.log('🔄 Starting client sync from Airwallex...')
      
      // First, analyze real payment history to identify actual clients
      const paymentAnalysis = await this.analyzeIncomingPayments()
      console.log(`📈 Transaction analysis: ${paymentAnalysis.realClients.length} entities with payments`)
      
      // Fetch counterparties from Airwallex 
      const payers = await this.fetchAirwallexPayers()
      console.log(`🏢 Found ${payers.length} counterparties in Airwallex`)
      
      const result: ClientSyncResult = {
        totalPayers: payers.length,
        newClients: 0,
        updatedClients: 0,
        conflicts: [],
        errors: 0,
        syncedClients: []
      }
      
      // Prioritize clients with actual payment history
      for (const clientWithPayments of paymentAnalysis.clientsWithPayments) {
        if (clientWithPayments.contact) {
          try {
            // Mark existing clients with payment history as verified
            await prisma.contact.update({
              where: { id: clientWithPayments.contact.id },
              data: {
                clientOnboardingStatus: 'ACTIVE',
                clientRiskRating: clientWithPayments.totalPaid > 10000 ? 'LOW' : 'MEDIUM',
                metadata: {
                  ...clientWithPayments.contact.metadata,
                  payment_history: {
                    total_paid: clientWithPayments.totalPaid,
                    payment_count: clientWithPayments.paymentCount,
                    last_payment: clientWithPayments.lastPayment,
                    verified_client: true
                  }
                }
              }
            })
            result.updatedClients++
          } catch (error) {
            console.error(`Error updating client with payment history ${clientWithPayments.contact.id}:`, error)
            result.errors++
          }
        }
      }
      
      // Then sync Airwallex counterparties
      for (const payer of payers) {
        try {
          const syncedClient = await this.syncClient(payer)
          if (syncedClient) {
            result.syncedClients.push(syncedClient)
            if (syncedClient.isNew) {
              result.newClients++
            } else {
              result.updatedClients++
            }
          }
        } catch (error) {
          console.error(`Error syncing client for counterparty ${payer.id}:`, error)
          result.errors++
        }
      }
      
      console.log('✅ Client sync completed')
      console.log(`📊 Summary: ${result.newClients} new, ${result.updatedClients} updated, ${result.conflicts.length} conflicts, ${result.errors} errors`)
      console.log(`💰 Verified clients with payments: ${paymentAnalysis.clientsWithPayments.length}`)
      
      return result
    } catch (error) {
      console.error('❌ Client sync failed:', error)
      throw error
    }
  }

  /**
   * Fetch payers from Airwallex API using counterparties (entities that pay us)
   */
  private async fetchAirwallexPayers(): Promise<AirwallexPayer[]> {
    try {
      console.log('Fetching payers from Airwallex counterparties...')
      
      const counterparties = await getAirwallexApi().getAllCounterparties()
      
      if (counterparties && counterparties.length > 0) {
        // Transform counterparty data to payer format for client sync
        return counterparties.map((counterparty: any): AirwallexPayer => {
          return {
            id: counterparty.id,
            entity_type: counterparty.entity_type || 'INDIVIDUAL',
            name: counterparty.name || 'Unknown Client',
            email: counterparty.contact_details?.email,
            phone_number: counterparty.contact_details?.phone_number,
            address: counterparty.address,
            contact_details: counterparty.contact_details,
            payment_methods: ['BANK_TRANSFER'], // Default for counterparties
            capabilities: ['SEND_PAYMENTS'], // Counterparties send payments to us
            status: 'ACTIVE',
            created_at: counterparty.created_at,
            updated_at: counterparty.updated_at
          }
        })
      }
      
      return []
    } catch (error) {
      console.error('Error fetching counterparties from Airwallex:', error)
      throw error
    }
  }

  /**
   * Analyze transaction history to identify real clients from incoming payments
   */
  async analyzeIncomingPayments(): Promise<{
    realClients: any[],
    totalIncoming: number,
    clientsWithPayments: any[]
  }> {
    try {
      console.log('🔍 Analyzing transaction history for real clients...')
      
      // Get all transactions from the database
      const transactions = await prisma.transaction.findMany({
        where: {
          transactionType: 'CREDIT', // Incoming payments
          amount: { gt: 0 } // Positive amounts
        },
        include: {
          counterpartyContact: true
        },
        orderBy: {
          transactionDate: 'desc'
        }
      })

      // Group transactions by counterparty to identify real clients
      const clientPaymentMap = new Map()
      let totalIncoming = 0

      for (const transaction of transactions) {
        const counterpartyId = transaction.counterpartyContactId
        const amount = Number(transaction.amount)
        
        if (counterpartyId) {
          if (!clientPaymentMap.has(counterpartyId)) {
            clientPaymentMap.set(counterpartyId, {
              contact: transaction.counterpartyContact,
              totalPaid: 0,
              paymentCount: 0,
              lastPayment: transaction.transactionDate,
              transactions: []
            })
          }
          
          const clientData = clientPaymentMap.get(counterpartyId)
          clientData.totalPaid += amount
          clientData.paymentCount += 1
          clientData.transactions.push({
            id: transaction.id,
            amount: amount,
            date: transaction.transactionDate,
            description: transaction.description,
            currency: transaction.currency
          })
          
          totalIncoming += amount
        }
      }

      // Convert map to array and sort by total paid
      const realClients = Array.from(clientPaymentMap.values())
        .sort((a, b) => b.totalPaid - a.totalPaid)

      // Filter clients with significant payment history (more than 1 payment or > €1000)
      const clientsWithPayments = realClients.filter(client => 
        client.paymentCount > 1 || client.totalPaid > 1000
      )

      console.log(`📊 Found ${realClients.length} entities with incoming payments`)
      console.log(`💰 Total incoming amount: €${totalIncoming.toLocaleString()}`)
      console.log(`🎯 Significant clients: ${clientsWithPayments.length}`)

      return {
        realClients,
        totalIncoming,
        clientsWithPayments
      }
    } catch (error) {
      console.error('Error analyzing incoming payments:', error)
      throw error
    }
  }

  /**
   * Sync a single client with Airwallex payer data
   */
  private async syncClient(payer: AirwallexPayer): Promise<any> {
    try {
      // Check if client already exists by Airwallex payer ID
      let existingClient = await prisma.contact.findUnique({
        where: { airwallexPayerAccountId: payer.id }
      })
      
      let isNew = false
      
      // If not found by Airwallex ID, try to find by email
      if (!existingClient && payer.email) {
        existingClient = await prisma.contact.findFirst({
          where: {
            email: payer.email,
            contactType: { in: ['CLIENT_COMPANY', 'CLIENT_CONTACT'] }
          }
        })
      }
      
      const clientData = this.transformPayerToClient(payer)
      
      if (existingClient) {
        // Update existing client
        const updatedClient = await prisma.contact.update({
          where: { id: existingClient.id },
          data: {
            ...clientData,
            airwallexPayerAccountId: payer.id,
            airwallexSyncStatus: 'SYNCED',
            airwallexLastSyncAt: new Date(),
            airwallexSyncError: null,
            airwallexRawData: payer
          }
        })
        
        return { ...updatedClient, isNew: false }
      } else {
        // Create new client
        isNew = true
        const newClient = await prisma.contact.create({
          data: {
            ...clientData,
            contactType: payer.entity_type === 'COMPANY' ? 'CLIENT_COMPANY' : 'CLIENT_CONTACT',
            airwallexPayerAccountId: payer.id,
            airwallexSyncStatus: 'SYNCED',
            airwallexLastSyncAt: new Date(),
            airwallexRawData: payer
          }
        })
        
        return { ...newClient, isNew: true }
      }
    } catch (error) {
      console.error(`Error syncing client for payer ${payer.id}:`, error)
      
      // Update sync error if client exists
      if (payer.id) {
        try {
          await prisma.contact.updateMany({
            where: { airwallexPayerAccountId: payer.id },
            data: {
              airwallexSyncStatus: 'ERROR',
              airwallexSyncError: error instanceof Error ? error.message : 'Unknown sync error'
            }
          })
        } catch (updateError) {
          console.error('Failed to update sync error:', updateError)
        }
      }
      
      throw error
    }
  }

  /**
   * Transform Airwallex counterparty data to client format
   */
  private transformPayerToClient(payer: AirwallexPayer) {
    return {
      name: payer.name || 'Unknown Client',
      email: payer.contact_details?.email || payer.email || null,
      phone: payer.contact_details?.phone_number || payer.phone_number || null,
      
      // Address information
      addressLine1: payer.address?.street_address || null,
      city: payer.address?.city || null,
      state: payer.address?.state || null,
      postalCode: payer.address?.postal_code || null,
      country: payer.address?.country_code || null,
      
      // Airwallex specific fields (for counterparties/payers)
      airwallexEntityType: payer.entity_type,
      airwallexPaymentMethods: JSON.stringify(payer.payment_methods || []),
      airwallexCapabilities: JSON.stringify(payer.capabilities || []),
      
      // No receiving bank details for counterparties (they send TO us, not receive FROM us)
      receivingBankName: null,
      receivingAccountName: null,
      receivingAccountNumber: null,
      receivingAccountCurrency: null,
      receivingSwiftCode: null,
      receivingIban: null,
      receivingBankCountryCode: null,
      
      // Client defaults
      currencyPreference: 'EUR', // Default since counterparties don't have bank details
      clientOnboardingStatus: 'NEW',
      clientRiskRating: 'MEDIUM',
      invoiceDeliveryMethod: 'EMAIL',
      autoInvoiceGeneration: false,
      preferredPaymentMethod: 'BANK_TRANSFER' // Default for counterparties
    }
  }

  /**
   * Get client sync summary statistics
   */
  async getClientSyncSummary(): Promise<ClientSyncSummary> {
    try {
      const totalClients = await prisma.contact.count({
        where: {
          contactType: { in: ['CLIENT_COMPANY', 'CLIENT_CONTACT'] }
        }
      })
      
      const airwallexLinkedClients = await prisma.contact.count({
        where: {
          contactType: { in: ['CLIENT_COMPANY', 'CLIENT_CONTACT'] },
          airwallexPayerAccountId: { not: null }
        }
      })
      
      const syncedClients = await prisma.contact.count({
        where: {
          contactType: { in: ['CLIENT_COMPANY', 'CLIENT_CONTACT'] },
          airwallexSyncStatus: 'SYNCED'
        }
      })
      
      const pendingSync = await prisma.contact.count({
        where: {
          contactType: { in: ['CLIENT_COMPANY', 'CLIENT_CONTACT'] },
          airwallexSyncStatus: 'PENDING'
        }
      })
      
      const syncErrors = await prisma.contact.count({
        where: {
          contactType: { in: ['CLIENT_COMPANY', 'CLIENT_CONTACT'] },
          airwallexSyncStatus: 'ERROR'
        }
      })
      
      return {
        totalClients,
        airwallexLinkedClients,
        syncedClients,
        pendingSync,
        syncErrors
      }
    } catch (error) {
      console.error('Error getting client sync summary:', error)
      throw error
    }
  }

  /**
   * Get clients with Airwallex data
   */
  async getClientsWithAirwallexData() {
    try {
      return await prisma.contact.findMany({
        where: {
          contactType: { in: ['CLIENT_COMPANY', 'CLIENT_CONTACT'] },
          airwallexPayerAccountId: { not: null }
        },
        select: {
          id: true,
          name: true,
          email: true,
          airwallexPayerAccountId: true,
          airwallexEntityType: true,
          receivingAccountCurrency: true,
          airwallexSyncStatus: true,
          airwallexLastSyncAt: true,
          airwallexSyncError: true
        }
      })
    } catch (error) {
      console.error('Error getting clients with Airwallex data:', error)
      throw error
    }
  }

  /**
   * Sync a single client by ID
   */
  async syncSingleClient(clientId: string): Promise<any> {
    try {
      const client = await prisma.contact.findUnique({
        where: { 
          id: clientId,
          contactType: { in: ['CLIENT_COMPANY', 'CLIENT_CONTACT'] }
        }
      })
      
      if (!client) {
        throw new Error('Client not found')
      }
      
      if (!client.airwallexPayerAccountId) {
        throw new Error('Client not linked to Airwallex')
      }
      
      // Fetch latest data from Airwallex
      const payers = await this.fetchAirwallexPayers()
      const payer = payers.find(p => p.id === client.airwallexPayerAccountId)
      
      if (!payer) {
        throw new Error('Payer not found in Airwallex')
      }
      
      // Sync the client
      return await this.syncClient(payer)
    } catch (error) {
      console.error(`Error syncing single client ${clientId}:`, error)
      
      // Update sync error
      await prisma.contact.update({
        where: { id: clientId },
        data: {
          airwallexSyncStatus: 'ERROR',
          airwallexSyncError: error instanceof Error ? error.message : 'Unknown sync error'
        }
      })
      
      throw error
    }
  }
}

export const airwallexClientSync = new AirwallexClientSync()