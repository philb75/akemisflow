const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkCategories() {
  try {
    console.log('🔗 Checking transaction categories in database...')
    
    const transactions = await prisma.transaction.findMany({
      select: {
        id: true,
        category: true,
        description: true,
        amount: true,
        airwallexTransactionId: true,
      },
    })

    const categoryStats = {}
    transactions.forEach(t => {
      categoryStats[t.category] = (categoryStats[t.category] || 0) + 1
    })

    console.log('📊 Category breakdown:')
    Object.entries(categoryStats).forEach(([category, count]) => {
      console.log(`   ${category}: ${count}`)
    })

    console.log('\n🔍 Sample transactions by category:')
    Object.keys(categoryStats).forEach(category => {
      const sample = transactions.find(t => t.category === category)
      console.log(`\n${category}:`)
      console.log(`   Description: ${sample.description}`)
      console.log(`   Amount: ${sample.amount}`)
      console.log(`   Transaction ID: ${sample.airwallexTransactionId}`)
    })

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkCategories()