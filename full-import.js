const { PrismaClient } = require('@prisma/client')
const { parse } = require('csv-parse/sync')
const fs = require('fs')

const prisma = new PrismaClient()

async function fullImport() {
  try {
    console.log('🔗 Connecting to database...')
    await prisma.$connect()
    console.log('✅ Database connected')

    console.log('📁 Reading CSV file...')
    const filePath = './Balance_Activity_Report_2025-06-14.csv'
    
    if (!fs.existsSync(filePath)) {
      console.error('❌ CSV file not found:', filePath)
      return
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    })

    console.log(`📊 Found ${records.length} records in CSV`)

    // Get or create Airwallex bank account
    let bankAccount = await prisma.bankAccount.findFirst({
      where: { bankName: 'Airwallex' },
    })

    if (!bankAccount) {
      console.log('🏦 Creating Airwallex bank account...')
      bankAccount = await prisma.bankAccount.create({
        data: {
          accountName: 'Airwallex Main Account',
          bankName: 'Airwallex',
          currency: 'EUR',
          accountType: 'BUSINESS',
          status: 'ACTIVE',
        },
      })
    }

    let imported = 0
    let skipped = 0
    const errors = []

    console.log('🚀 Starting import...')

    for (let i = 0; i < records.length; i++) {
      const record = records[i]
      try {
        // Check if transaction already exists
        const existing = await prisma.transaction.findFirst({
          where: {
            airwallexTransactionId: record['Transaction Id'],
          },
        })

        if (existing) {
          skipped++
          continue
        }

        // Parse amount
        const debitAmount = parseAmount(record['Debit Net Amount'])
        const creditAmount = parseAmount(record['Credit Net Amount'])
        
        let transactionType = 'CREDIT'
        let amount = 0
        
        if (creditAmount > 0) {
          transactionType = 'CREDIT'
          amount = creditAmount
        } else if (debitAmount > 0) {
          transactionType = 'DEBIT'
          amount = -debitAmount
        }

        // Create transaction
        await prisma.transaction.create({
          data: {
            bankAccountId: bankAccount.id,
            transactionType,
            amount,
            currency: record['Wallet Currency'] || 'EUR',
            description: record.Description || '',
            category: categorizeTransaction(record['Financial Transaction Type']),
            status: 'COMPLETED',
            exchangeRate: record['Conversion Rate'] ? parseFloat(record['Conversion Rate']) : null,
            airwallexTransactionId: record['Transaction Id'],
            source: 'AIRWALLEX',
            transactionDate: new Date(record.Time),
            referenceNumber: record.Reference || null,
            rawData: record,
          },
        })

        imported++
        
        if ((i + 1) % 10 === 0) {
          console.log(`📈 Progress: ${i + 1}/${records.length} processed...`)
        }

      } catch (error) {
        errors.push(`Error processing transaction ${record['Transaction Id']}: ${error.message}`)
        console.error(`❌ Error on record ${i + 1}:`, error.message)
      }
    }

    console.log('\n🎉 Import completed!')
    console.log(`✅ Imported: ${imported} transactions`)
    console.log(`⏭️  Skipped: ${skipped} transactions`)
    
    if (errors.length > 0) {
      console.log(`⚠️  Errors: ${errors.length}`)
      errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`)
      })
    }

  } catch (error) {
    console.error('❌ Import failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

function parseAmount(amountStr) {
  if (!amountStr || amountStr.trim() === '') return 0
  const cleaned = amountStr.replace(/[,\s]/g, '')
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : parsed
}

function categorizeTransaction(type) {
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

fullImport()