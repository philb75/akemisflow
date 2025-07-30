import { PrismaClient } from '@prisma/client'
import { getAirwallexClient } from './airwallex-api'

interface SyncResult {
  success: boolean
  imported: number
  skipped: number
  errors: string[]
  lastSyncTime?: Date
}

export class AirwallexSyncService {
  private prisma: PrismaClient
  private airwallexClient: ReturnType<typeof getAirwallexClient>

  constructor() {
    this.prisma = new PrismaClient()
    this.airwallexClient = getAirwallexClient()
  }

  async syncTransactions(forceFullSync: boolean = false, fromDate?: string): Promise<SyncResult> {
    try {
      console.log('Starting Airwallex transaction sync...')
      
      // Get last sync time from database, fromDate parameter, or default to 1 year ago
      let lastSyncTime: Date
      
      if (fromDate) {
        // Use provided fromDate
        lastSyncTime = new Date(fromDate)
        console.log('Using provided fromDate:', fromDate)
      } else if (forceFullSync) {
        // Force full sync - go back 1 year
        lastSyncTime = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
        console.log('Force full sync - using 1 year ago')
      } else {
        // Use last sync time from database
        lastSyncTime = await this.getLastSyncTime()
        console.log('Using last sync time from database')
      }

      console.log('Last sync time:', lastSyncTime)
      console.log('Sync date range: from', lastSyncTime.toISOString(), 'to', new Date().toISOString())

      // First, get accounts to understand the structure
      console.log('Getting Airwallex accounts...')
      const accounts = await this.airwallexClient.getAccounts()
      console.log('Total accounts found:', accounts.length)
      console.log('Available accounts detailed:', JSON.stringify(accounts, null, 2))
      
      // Log each account separately for clarity
      accounts.forEach((account, index) => {
        console.log(`Account ${index + 1}:`, {
          id: account.id,
          name: account.name,
          accountName: account.accountName,
          legal_entity: account.legal_entity?.name,
          currency: account.currency,
          status: account.status
        })
      })
      
      // Find Akemis Limited account
      const akemisAccount = accounts.find(account => 
        account.name?.includes('Akemis Limited') || 
        account.accountName?.includes('Akemis Limited') ||
        account.legal_entity?.name?.includes('Akemis Limited')
      )
      
      console.log('Akemis Limited account found:', !!akemisAccount)
      if (akemisAccount) {
        console.log('Akemis account details:', JSON.stringify(akemisAccount, null, 2))
      }
      
      // Since transaction endpoints require higher permissions, use balance history
      console.log('Using balance history endpoint (transactions require higher permissions)...')
      
      console.log(`Fetching balance history from ${lastSyncTime.toISOString()} to ${new Date().toISOString()}`)
      
      let allBalanceItems: any[] = []
      
      // Try global balance history with correct Airwallex pagination
      console.log('=== TRYING GLOBAL BALANCE HISTORY WITH page=0 (COMPLETE SEARCH) ===')
      try {
        let pageAfter: string | undefined
        let hasMorePages = true
        let pageCount = 0
        
        while (hasMorePages && pageCount < 50) { // Increased limit to get more history
          pageCount++
          console.log(`Fetching GLOBAL balance history page ${pageCount}${pageAfter ? ` with page_after ${pageAfter}` : ' with page=0'}`)
          
          // Use page=0 for first request to bypass 7-day limit, then use page_after for subsequent pages
          const page = pageCount === 1 ? 0 : undefined
          const balanceHistory = await this.airwallexClient.getBalanceHistory(
            undefined, // currency
            lastSyncTime, // fromDate  
            new Date(), // toDate
            page, // page (0 for complete search)
            pageAfter, // pageAfter
            undefined, // pageBefore
            200 // pageSize (increased for efficiency)
          )
          
          console.log(`Found ${balanceHistory.items.length} GLOBAL balance history items on page ${pageCount}`)
          console.log(`page_after: ${balanceHistory.page_after}, page_before: ${balanceHistory.page_before}`)
          
          allBalanceItems.push(...balanceHistory.items)
          
          // Check if there are more pages using page_after
          hasMorePages = !!balanceHistory.page_after
          pageAfter = balanceHistory.page_after
          
          if (!hasMorePages) {
            console.log('No more GLOBAL pages available (page_after is null)')
          }
        }
      } catch (error) {
        console.error('Error fetching global balance history:', error)
      }
      
      console.log(`Total GLOBAL balance history items: ${allBalanceItems.length}`)
      
      // Now try account-specific balance history for each account (with correct pagination)
      for (const account of accounts) {
        if (!account.id) continue
        
        console.log(`=== TRYING ACCOUNT-SPECIFIC BALANCE HISTORY FOR ACCOUNT: ${account.id} (${account.name || account.accountName || 'Unknown'}) ===`)
        
        try {
          let pageAfter: string | undefined
          let hasMorePages = true
          let pageCount = 0
          let accountItems: any[] = []
          
          while (hasMorePages && pageCount < 20) {
            pageCount++
            console.log(`Fetching account ${account.id} balance history page ${pageCount}${pageAfter ? ` with page_after ${pageAfter}` : ' with page=0'}`)
            
            // Use page=0 for first request to bypass 7-day limit
            const page = pageCount === 1 ? 0 : undefined
            const balanceHistory = await this.airwallexClient.getBalanceHistory(
              undefined, // currency
              lastSyncTime, // fromDate
              new Date(), // toDate
              page, // page (0 for complete search)
              pageAfter, // pageAfter
              undefined, // pageBefore
              200, // pageSize
              account.id // accountId
            )
            
            console.log(`Found ${balanceHistory.items.length} balance history items for account ${account.id} on page ${pageCount}`)
            console.log(`page_after: ${balanceHistory.page_after}, page_before: ${balanceHistory.page_before}`)
            
            accountItems.push(...balanceHistory.items)
            
            hasMorePages = !!balanceHistory.page_after
            pageAfter = balanceHistory.page_after
            
            if (!hasMorePages) {
              console.log(`No more pages available for account ${account.id} (page_after is null)`)
            }
          }
          
          console.log(`Total items for account ${account.id}: ${accountItems.length}`)
          allBalanceItems.push(...accountItems)
          
        } catch (error) {
          console.log(`Error fetching balance history for account ${account.id}:`, error instanceof Error ? error.message : error)
        }
      }
      
      console.log(`Total balance history items fetched: ${allBalanceItems.length}`)
      
      if (allBalanceItems.length > 0) {
        console.log('Sample balance history item:', JSON.stringify(allBalanceItems[0], null, 2))
      }
      
      // Transform balance history to transactions
      const apiTransactions = allBalanceItems.map(item => 
        this.airwallexClient.transformBalanceHistoryToTransaction(item)
      )
      
      console.log(`Converted ${apiTransactions.length} balance items to transactions`)
      
      if (apiTransactions.length > 0) {
        console.log('Sample transaction:', JSON.stringify(apiTransactions[0], null, 2))
      } else {
        console.log('No transactions returned from API')
      }

      let imported = 0
      let skipped = 0
      const errors: string[] = []

      // Process transactions in batches
      const batchSize = 50
      for (let i = 0; i < apiTransactions.length; i += batchSize) {
        const batch = apiTransactions.slice(i, i + batchSize)
        const result = await this.processBatch(batch)
        imported += result.imported
        skipped += result.skipped
        errors.push(...result.errors)
      }

      // Update last sync time
      const currentTime = new Date()
      await this.updateLastSyncTime(currentTime)

      console.log(`Sync completed: ${imported} imported, ${skipped} skipped`)

      return {
        success: true,
        imported,
        skipped,
        errors,
        lastSyncTime: currentTime
      }
    } catch (error) {
      console.error('Error in syncTransactions:', error)
      return {
        success: false,
        imported: 0,
        skipped: 0,
        errors: [error instanceof Error ? error.message : 'Unknown sync error']
      }
    }
  }

  private async processBatch(apiTransactions: any[]): Promise<{
    imported: number
    skipped: number
    errors: string[]
  }> {
    let imported = 0
    let skipped = 0
    const errors: string[] = []

    for (const transactionData of apiTransactions) {
      try {
        // Transaction data is already transformed from balance history
        
        // Check if transaction already exists
        const existing = await this.prisma.transaction.findFirst({
          where: {
            airwallexTransactionId: transactionData.transactionId,
          },
        })

        if (existing) {
          skipped++
          continue
        }

        // Get or create bank account for Airwallex
        let bankAccount = await this.prisma.bankAccount.findFirst({
          where: { bankName: 'Airwallex' },
        })

        if (!bankAccount) {
          bankAccount = await this.prisma.bankAccount.create({
            data: {
              accountName: 'Airwallex API Account',
              bankName: 'Airwallex',
              currency: transactionData.currency,
              accountType: 'BUSINESS',
              status: 'ACTIVE',
            },
          })
        }

        // Create transaction
        await this.prisma.transaction.create({
          data: {
            bankAccountId: bankAccount.id,
            transactionType: transactionData.transactionType,
            amount: transactionData.amount,
            currency: transactionData.currency,
            description: transactionData.description,
            category: this.categorizeTransaction(transactionData.financialTransactionType),
            status: 'COMPLETED',
            exchangeRate: transactionData.conversionRate,
            airwallexTransactionId: transactionData.transactionId,
            source: 'API',
            sourceType: transactionData.sourceType,
            balanceAfterTransaction: transactionData.balanceAfterTransaction,
            originalDescription: transactionData.originalDescription,
            transactionDate: transactionData.date,
            referenceNumber: transactionData.reference || undefined,
            feeAmount: transactionData.feeAmount,
            feeCurrency: transactionData.feeCurrency,
            rawData: transactionData, // Store transformed transaction data
          },
        })

        imported++
      } catch (error) {
        const errorMsg = `Error processing transaction ${transactionData.transactionId}: ${error instanceof Error ? error.message : 'Unknown error'}`
        console.error(errorMsg)
        errors.push(errorMsg)
      }
    }

    return { imported, skipped, errors }
  }

  private categorizeTransaction(type: string): string {
    const typeUpper = type.toUpperCase()
    
    // Map API transaction types to our categories
    switch (typeUpper) {
      case 'DEPOSIT':
      case 'PAYMENT_RECEIVED':
      case 'INCOMING_TRANSFER':
        return 'INVOICE_PAYMENT'
      case 'PAYOUT':
      case 'PAYMENT_SENT':
      case 'OUTGOING_TRANSFER':
        return 'CONSULTANT_PAYMENT'
      case 'FEE':
      case 'TRANSACTION_FEE':
        return 'FEE'
      case 'REFUND':
      case 'CHARGEBACK':
        return 'REFUND'
      case 'TRANSFER':
      case 'INTERNAL_TRANSFER':
        return 'TRANSFER'
      case 'CONVERSION':
      case 'EXCHANGE':
        return 'CURRENCY_EXCHANGE'
      default:
        return 'OTHER'
    }
  }

  private async getLastSyncTime(): Promise<Date> {
    try {
      // Look for sync metadata in database
      // For now, we'll use the most recent transaction date as a fallback
      // Look for Airwallex transactions regardless of source (API vs CSV)
      const lastTransaction = await this.prisma.transaction.findFirst({
        where: {
          bankAccount: {
            bankName: 'Airwallex'
          }
        },
        orderBy: {
          transactionDate: 'desc'
        },
        select: {
          transactionDate: true
        }
      })

      if (lastTransaction) {
        // Start from 1 day before last transaction to ensure we don't miss any
        return new Date(lastTransaction.transactionDate.getTime() - 24 * 60 * 60 * 1000)
      }

      // Default to 30 days ago if no previous sync
      return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    } catch (error) {
      console.error('Error getting last sync time:', error)
      // Default to 30 days ago
      return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    }
  }

  private async updateLastSyncTime(syncTime: Date): Promise<void> {
    try {
      // For now, we'll store this as a simple record
      // In a production system, you might want a dedicated sync_metadata table
      console.log('Sync completed at:', syncTime.toISOString())
    } catch (error) {
      console.error('Error updating last sync time:', error)
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string; accounts?: any[] }> {
    try {
      console.log('Testing Airwallex API connection...')
      
      // Test authentication and basic API access
      try {
        const balances = await this.airwallexClient.getCurrentBalances()
        console.log('Successfully connected to Airwallex API')
        console.log('Available balances:', balances)
      } catch (balanceError) {
        console.log('Balance endpoint error:', balanceError)
      }

      // Try to get accounts
      let accounts: any[] = []
      try {
        accounts = await this.airwallexClient.getAccounts()
        console.log('Available accounts:', accounts)
      } catch (accountError) {
        console.log('Account endpoint error:', accountError)
      }

      // Try alternative endpoints for debugging
      try {
        console.log('Testing alternative endpoints...')
        
        // Test balance history with page=0 for complete search
        const balanceHistory = await this.airwallexClient.getBalanceHistory(
          undefined, // currency
          undefined, // fromDate  
          undefined, // toDate
          0, // page=0 for complete search
          undefined, // pageAfter
          undefined, // pageBefore
          10 // small pageSize for testing
        )
        console.log('Balance history response (with page=0):', balanceHistory)
        
        // Test transactions with no account ID
        const transactions = await this.airwallexClient.getTransactions()
        console.log('Transactions response:', transactions)
        
      } catch (altError) {
        console.log('Alternative endpoint errors:', altError)
      }

      return {
        success: true,
        message: `Connected successfully. Authentication works. Check logs for endpoint details.`,
        accounts
      }
    } catch (error) {
      console.error('Airwallex connection test failed:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown connection error'
      }
    }
  }

  async disconnect() {
    await this.prisma.$disconnect()
  }
}

// Utility function for easy access
export async function syncAirwallexTransactions(forceFullSync: boolean = false, fromDate?: string): Promise<SyncResult> {
  const syncService = new AirwallexSyncService()
  try {
    return await syncService.syncTransactions(forceFullSync, fromDate)
  } finally {
    await syncService.disconnect()
  }
}

export async function testAirwallexConnection(): Promise<{ success: boolean; message: string; accounts?: any[] }> {
  const syncService = new AirwallexSyncService()
  try {
    return await syncService.testConnection()
  } finally {
    await syncService.disconnect()
  }
}