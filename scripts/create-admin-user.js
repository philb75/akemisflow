const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function createAdminUser() {
  // Use production database URL
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: "postgresql://postgres.wflcaapznpczlxjaeyfd:Philbn921056%24@aws-0-us-west-1.pooler.supabase.com:5432/postgres"
      }
    }
  });

  try {
    console.log('🔐 Hashing password...');
    const hashedPassword = await bcrypt.hash('Philb123$', 12);
    
    console.log('👤 Creating admin user...');
    const user = await prisma.user.create({
      data: {
        email: 'philb75@gmail.com',
        name: 'Philippe Barthelemy',
        firstName: 'Philippe',
        lastName: 'Barthelemy',
        password: hashedPassword,
        role: 'ADMINISTRATOR',
        isActive: true,
        emailVerified: new Date(),
        timezone: 'Europe/Paris',
        language: 'en'
      }
    });

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email:', user.email);
    console.log('👑 Role:', user.role);
    console.log('🆔 User ID:', user.id);
    
  } catch (error) {
    if (error.code === 'P2002') {
      console.log('ℹ️  User already exists, updating role to ADMINISTRATOR...');
      
      const updatedUser = await prisma.user.update({
        where: { email: 'philb75@gmail.com' },
        data: {
          role: 'ADMINISTRATOR',
          isActive: true,
          firstName: 'Philippe',
          lastName: 'Barthelemy',
          name: 'Philippe Barthelemy'
        }
      });
      
      console.log('✅ User updated to Administrator successfully!');
      console.log('📧 Email:', updatedUser.email);
      console.log('👑 Role:', updatedUser.role);
    } else {
      console.error('❌ Error creating user:', error);
      throw error;
    }
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser()
  .then(() => {
    console.log('🎉 Admin user setup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Failed to create admin user:', error);
    process.exit(1);
  });