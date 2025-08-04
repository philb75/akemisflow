const { PrismaClient } = require('@prisma/client');

async function checkAirwallexAccounts() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Checking Airwallex accounts and contacts...');
    
    // Check unique account/entity information in AirwallexContractor table
    const uniqueEntities = await prisma.airwallexContractor.groupBy({
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
    
    console.log('\n📊 Unique entities in AirwallexContractor table:');
    uniqueEntities.forEach((entity, index) => {
      console.log(`${index + 1}. Entity: ${entity.entityType}, Company: ${entity.company || 'N/A'}, Count: ${entity._count.id}`);
    });
    
    // Check for any payer entity information (this field might not exist)
    try {
      const payerEntities = await prisma.airwallexContractor.findMany({
        where: {
          payerEntityType: {
            not: null
          }
        },
        select: {
          payerEntityType: true
        },
        distinct: ['payerEntityType']
      });
      
      if (payerEntities.length > 0) {
        console.log('\n💳 Unique payer entities:');
        payerEntities.forEach((entity, index) => {
          console.log(`${index + 1}. Payer Entity: ${entity.payerEntityType}`);
        });
      }
    } catch (error) {
      console.log('\n💳 No payer entity field found or error:', error.message);
    }
    
    // Check specific company matches for Akemis
    const akemisContacts = await prisma.airwallexContractor.findMany({
      where: {
        OR: [
          { company: { contains: 'Akemis', mode: 'insensitive' } },
          { company: { contains: 'AKEMIS', mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        beneficiaryId: true,
        firstName: true,
        lastName: true,
        email: true,
        company: true,
        entityType: true,
        airwallexPayerEntityType: true
      }
    });
    
    console.log(`\n🏢 Akemis-related contacts: ${akemisContacts.length}`);
    akemisContacts.forEach((contact, index) => {
      console.log(`${index + 1}. ${contact.firstName} ${contact.lastName} (${contact.email}) - Company: ${contact.company}, Entity: ${contact.entityType}`);
    });
    
    // Check total counts
    const totalAirwallex = await prisma.airwallexContractor.count();
    const totalContractors = await prisma.contractor.count();
    
    console.log(`\n📈 Total counts:`);
    console.log(`- AirwallexContractor: ${totalAirwallex}`);
    console.log(`- Contractor: ${totalContractors}`);
    
  } catch (error) {
    console.error('Error checking Airwallex accounts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAirwallexAccounts();