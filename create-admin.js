const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createAdmin() {
  try {
    // Check if admin user already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'ADMINISTRATOR' }
    })

    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.email)
      return
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('Philb123$', 10)
    
    const admin = await prisma.user.create({
      data: {
        email: 'philb75@gmail.com',
        password: hashedPassword,
        name: 'Philippe Barthelemy',
        firstName: 'Philippe',
        lastName: 'Barthelemy',
        role: 'ADMINISTRATOR',
        isActive: true,
      }
    })

    console.log('Admin user created successfully:', admin.email)
    console.log('Login credentials:')
    console.log('Email: philb75@gmail.com')
    console.log('Password: Philb123$')
    
  } catch (error) {
    console.error('Error creating admin user:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createAdmin()