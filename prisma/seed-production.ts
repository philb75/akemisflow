import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding production database...')
  
  // Check if we already have data
  const userCount = await prisma.user.count()
  
  if (userCount > 0) {
    console.log('✅ Database already has users, skipping seed')
    return
  }
  
  // Create default admin user (should be changed immediately)
  const hashedPassword = await bcrypt.hash('ChangeMe123!', 10)
  
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@akemisflow.com',
      name: 'Admin User',
      firstName: 'Admin',
      lastName: 'User',
      password: hashedPassword,
      role: 'ADMINISTRATOR',
      isActive: true,
      emailVerified: new Date(),
    }
  })
  
  console.log('✅ Created default admin user:')
  console.log('   Email: admin@akemisflow.com')
  console.log('   Password: ChangeMe123!')
  console.log('   ⚠️  IMPORTANT: Change this password immediately!')
  
  // Create sample data only if explicitly requested
  if (process.env.SEED_SAMPLE_DATA === 'true') {
    console.log('📋 Creating sample data...')
    
    // Add sample bank account
    await prisma.bankAccount.create({
      data: {
        accountName: 'Main Business Account',
        bankName: 'Example Bank',
        currency: 'EUR',
        accountType: 'BUSINESS',
        status: 'ACTIVE'
      }
    })
    
    console.log('✅ Sample data created')
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })