const { PrismaClient } = require('@prisma/client');

async function checkDatabase() {
  const prisma = new PrismaClient();
  
  try {
    console.log('📊 Checking database contents...');
    
    // Check AirwallexSupplier table
    const airwallexSuppliers = await prisma.airwallexSupplier.count();
    console.log(`AirwallexSupplier count: ${airwallexSuppliers}`);
    
    if (airwallexSuppliers > 0) {
      const firstSupplier = await prisma.airwallexSupplier.findFirst();
      console.log('First AirwallexSupplier:', JSON.stringify(firstSupplier, null, 2));
    }
    
    // Check Contact table
    const contacts = await prisma.contact.count();
    console.log(`Contact count: ${contacts}`);
    
    if (contacts > 0) {
      const firstContact = await prisma.contact.findFirst();
      console.log('First Contact:', JSON.stringify(firstContact, null, 2));
    }
    
    // Check Supplier table
    const suppliers = await prisma.supplier.count();
    console.log(`Supplier count: ${suppliers}`);
    
  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();