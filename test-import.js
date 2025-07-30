const { PrismaClient } = require('@prisma/client')
const { parse } = require('csv-parse/sync')
const fs = require('fs')

const prisma = new PrismaClient()

async function testImport() {
  try {
    console.log('🔗 Testing database connection...')
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
    console.log('📝 Sample record:', records[0])

    // Create or get Airwallex bank account
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
      console.log('✅ Bank account created:', bankAccount.id)
    } else {
      console.log('✅ Using existing bank account:', bankAccount.id)
    }

    // Test processing one record
    const testRecord = records[0]
    console.log('🧪 Testing with first record...')
    
    // Parse amount
    const debitAmount = parseAmount(testRecord['Debit Net Amount'])
    const creditAmount = parseAmount(testRecord['Credit Net Amount'])
    
    let transactionType = 'CREDIT'
    let amount = 0
    
    if (creditAmount > 0) {
      transactionType = 'CREDIT'
      amount = creditAmount
    } else if (debitAmount > 0) {
      transactionType = 'DEBIT'
      amount = -debitAmount
    }

    console.log(`💰 Parsed amount: ${amount} ${testRecord['Wallet Currency']} (${transactionType})`)

    // Check if transaction already exists
    const existing = await prisma.transaction.findFirst({
      where: {
        airwallexTransactionId: testRecord['Transaction Id'],
      },
    })

    if (existing) {
      console.log('⏭️  Transaction already exists, skipping...')
    } else {
      console.log('💾 Creating transaction...')
      const transaction = await prisma.transaction.create({
        data: {
          bankAccountId: bankAccount.id,
          transactionType,
          amount,
          currency: testRecord['Wallet Currency'] || 'EUR',
          description: testRecord.Description || '',
          category: categorizeTransaction(testRecord['Financial Transaction Type']),
          status: 'COMPLETED',
          exchangeRate: testRecord['Conversion Rate'] ? parseFloat(testRecord['Conversion Rate']) : null,
          airwallexTransactionId: testRecord['Transaction Id'],
          source: 'AIRWALLEX',
          transactionDate: new Date(testRecord.Time),
          referenceNumber: testRecord.Reference || null,
          rawData: testRecord,
        },
      })
      console.log('✅ Transaction created:', transaction.id)
    }

    console.log('🎉 Test completed successfully!')

  } catch (error) {
    console.error('❌ Test failed:', error)
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

testImport()