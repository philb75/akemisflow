const { PrismaClient } = require('@prisma/client');

async function checkAirwallexAccounts() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Checking Airwallex accounts and contacts...');
    
    // Check unique account/entity information in AirwallexSupplier table
    const uniqueEntities = await prisma.airwallexSupplier.groupBy({
      by: ['entityType', 'company'],
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      }
    });
    
    console.log('\n📊 Unique entities in AirwallexSupplier table:');
    uniqueEntities.forEach((entity, index) => {
      console.log(`${index + 1}. Entity: ${entity.entityType}, Company: ${entity.company || 'N/A'}, Count: ${entity._count.id}`);
    });
    
    // Show details of each company
    const companyEntities = await prisma.airwallexSupplier.findMany({
      where: {
        entityType: 'COMPANY'
      },
      select: {
        beneficiaryId: true,
        firstName: true,
        lastName: true,
        email: true,
        company: true,
        entityType: true,
        payerEntityType: true
      }
    });
    
    console.log('\n🏢 Company entities details:');
    companyEntities.forEach((contact, index) => {
      console.log(`${index + 1}. ${contact.firstName} ${contact.lastName} (${contact.email})`);
      console.log(`    Company: ${contact.company || 'N/A'}`);
      console.log(`    Beneficiary ID: ${contact.beneficiaryId}`);
      console.log(`    Payer Entity: ${contact.payerEntityType || 'N/A'}`);
      console.log('');
    });
    
    // Check specific Akemis Limited contacts
    const akemisContacts = await prisma.airwallexSupplier.findMany({
      where: {
        company: 'Akemis Limited'
      },
      select: {
        id: true,
        beneficiaryId: true,
        firstName: true,
        lastName: true,
        email: true,
        company: true,
        entityType: true,
        payerEntityType: true
      }
    });
    
    console.log(`\n🎯 Akemis Limited contacts: ${akemisContacts.length}`);
    akemisContacts.forEach((contact, index) => {
      console.log(`${index + 1}. ${contact.firstName} ${contact.lastName} (${contact.email})`);
      console.log(`    Beneficiary ID: ${contact.beneficiaryId}`);
    });
    
    // Check personal entities (these might be from other accounts)
    const personalSample = await prisma.airwallexSupplier.findMany({
      where: {
        entityType: 'PERSONAL'
      },
      select: {
        beneficiaryId: true,
        firstName: true,
        lastName: true,
        email: true,
        company: true,
        payerEntityType: true
      },
      take: 10 // Just show first 10
    });
    
    console.log(`\n👤 Sample personal entities (first 10 of 27):`);
    personalSample.forEach((contact, index) => {
      console.log(`${index + 1}. ${contact.firstName} ${contact.lastName} (${contact.email})`);
      console.log(`    Beneficiary ID: ${contact.beneficiaryId}`);
      console.log(`    Payer Entity: ${contact.payerEntityType || 'N/A'}`);
      console.log('');
    });
    
    // Check total counts
    const totalAirwallex = await prisma.airwallexSupplier.count();
    const totalSuppliers = await prisma.supplier.count();
    
    console.log(`\n📈 Total counts:`);
    console.log(`- AirwallexSupplier: ${totalAirwallex}`);
    console.log(`- Supplier: ${totalSuppliers}`);
    
  } catch (error) {
    console.error('Error checking Airwallex accounts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAirwallexAccounts();