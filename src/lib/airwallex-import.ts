import { parse } from 'csv-parse/sync'
import { PrismaClient } from '@prisma/client'
import fs from 'fs'

interface AirwallexCSVRow {
  Time: string
  Type: string
  'Financial Transaction Type': string
  'Transaction Id': string
  Description: string
  'Wallet Currency': string
  'Target Currency': string
  'Target Amount': string
  'Conversion Rate': string
  'Mature Date': string
  Amount: string
  Fee: string
  'Debit Net Amount': string
  'Credit Net Amount': string
  'Account Balance': string
  'Available Balance': string
  'Created At': string
  'Request Id': string
  Reference: string
  'Note to Self': string
}

interface TransactionImportData {
  bank: string
  date: Date
  transactionType: 'CREDIT' | 'DEBIT'
  financialTransactionType: string
  transactionId: string
  description: string
  currency: string
  conversionRate: number | null
  amount: number
  balance: number
  reference: string
  note: string
}

export class AirwallexImporter {
  private prisma: PrismaClient

  constructor() {
    this.prisma = new PrismaClient()
  }

  async importFromCSV(filePath: string): Promise<{
    success: boolean
    imported: number
    skipped: number
    errors: string[]
  }> {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8')
      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }) as AirwallexCSVRow[]

      let imported = 0
      let skipped = 0
      const errors: string[] = []

      // Process transactions in batches to avoid memory issues
      const batchSize = 100
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize)
        const result = await this.processBatch(batch)
        imported += result.imported
        skipped += result.skipped
        errors.push(...result.errors)
      }

      return {
        success: true,
        imported,
        skipped,
        errors,
      }
    } catch (error) {
      console.error('Error importing CSV:', error)
      return {
        success: false,
        imported: 0,
        skipped: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      }
    }
  }

  private async processBatch(records: AirwallexCSVRow[]): Promise<{
    imported: number
    skipped: number
    errors: string[]
  }> {
    let imported = 0
    let skipped = 0
    const errors: string[] = []

    for (const record of records) {
      try {
        const transactionData = this.parseRecord(record)
        
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
              accountName: 'Airwallex Main Account',
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
            source: 'AIRWALLEX',
            transactionDate: transactionData.date,
            referenceNumber: transactionData.reference || undefined,
            rawData: record,
          },
        })

        imported++
      } catch (error) {
        errors.push(`Error processing transaction ${record['Transaction Id']}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return { imported, skipped, errors }
  }

  private parseRecord(record: AirwallexCSVRow): TransactionImportData {
    // Parse date - extract only the date part, ignore time
    const fullDate = new Date(record.Time)
    const date = new Date(fullDate.getFullYear(), fullDate.getMonth(), fullDate.getDate())

    // Determine transaction type and amount
    let transactionType: 'CREDIT' | 'DEBIT'
    let amount: number

    const debitAmount = this.parseAmount(record['Debit Net Amount'])
    const creditAmount = this.parseAmount(record['Credit Net Amount'])

    if (creditAmount > 0) {
      transactionType = 'CREDIT'
      amount = creditAmount
    } else if (debitAmount > 0) {
      transactionType = 'DEBIT'
      amount = -debitAmount // Make debit amounts negative
    } else {
      // Fallback to the Amount field
      const baseAmount = this.parseAmount(record.Amount)
      if (baseAmount > 0) {
        transactionType = 'CREDIT'
        amount = baseAmount
      } else {
        transactionType = 'DEBIT'
        amount = baseAmount
      }
    }

    // Parse conversion rate
    const conversionRate = record['Conversion Rate'] 
      ? parseFloat(record['Conversion Rate'])
      : null

    // Parse balance
    const balance = this.parseAmount(record['Account Balance'])

    return {
      bank: 'Airwallex',
      date,
      transactionType,
      financialTransactionType: record['Financial Transaction Type'],
      transactionId: record['Transaction Id'],
      description: record.Description || '',
      currency: record['Wallet Currency'] || 'EUR',
      conversionRate,
      amount,
      balance,
      reference: record.Reference || '',
      note: record['Note to Self'] || '',
    }
  }

  private parseAmount(amountStr: string): number {
    if (!amountStr || amountStr.trim() === '') return 0
    
    // Remove commas and other formatting
    const cleaned = amountStr.replace(/[,\s]/g, '')
    const parsed = parseFloat(cleaned)
    
    return isNaN(parsed) ? 0 : parsed
  }

  private categorizeTransaction(type: string): string {
    const typeUpper = type.toUpperCase()
    
    switch (typeUpper) {
      case 'DEPOSIT':
        return 'INVOICE_PAYMENT'
      case 'PAYOUT':
      case 'PAYOUT_REFUND':
        return 'CONSULTANT_PAYMENT'
      case 'FEE':
        return 'FEE'
      case 'REFUND':
        return 'REFUND'
      case 'TRANSFER':
        return 'TRANSFER'
      default:
        return 'OTHER'
    }
  }

  async disconnect() {
    await this.prisma.$disconnect()
  }
}

// Utility function to import from a specific file
export async function importAirwallexCSV(filePath: string) {
  const importer = new AirwallexImporter()
  try {
    return await importer.importFromCSV(filePath)
  } finally {
    await importer.disconnect()
  }
}