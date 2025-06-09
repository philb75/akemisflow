import { PrismaClient, ContactType, BankAccountType, BankAccountStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create Akemis Partners
  const philippe = await prisma.contact.create({
    data: {
      contactType: ContactType.PARTNER,
      name: 'Philippe Barthelemy',
      email: 'philippe@akemis.com',
      phone: '+33 6 12 34 56 78',
      addressLine1: 'Unit 905-906, 9th Floor',
      addressLine2: '30 Canton Road, Tsim Sha Tsui',
      city: 'Hong Kong',
      country: 'HK',
      currencyPreference: 'EUR',
      profitSharePercentage: 50.00,
      notes: 'Founder and Managing Partner',
    },
  });

  const partner2 = await prisma.contact.create({
    data: {
      contactType: ContactType.PARTNER,
      name: 'Partner Two',
      email: 'partner2@akemis.com',
      currencyPreference: 'EUR',
      profitSharePercentage: 30.00,
      notes: 'Investment Partner',
    },
  });

  const partner3 = await prisma.contact.create({
    data: {
      contactType: ContactType.PARTNER,
      name: 'Partner Three',
      email: 'partner3@akemis.com',
      currencyPreference: 'EUR',
      profitSharePercentage: 20.00,
      notes: 'Strategic Partner',
    },
  });

  console.log('✅ Created Akemis partners');

  // Create Client Companies
  const techCorp = await prisma.contact.create({
    data: {
      contactType: ContactType.CLIENT_COMPANY,
      name: 'TechCorp Ltd',
      email: 'contact@techcorp.com',
      phone: '+44 20 7123 4567',
      addressLine1: '123 Tech Street',
      city: 'London',
      country: 'GB',
      currencyPreference: 'GBP',
      taxId: 'GB123456789',
      notes: 'Technology consulting client',
    },
  });

  const openItConsulting = await prisma.contact.create({
    data: {
      contactType: ContactType.CLIENT_COMPANY,
      name: 'OpenIT Consulting',
      email: 'contact@openit.fr',
      phone: '+33 1 42 34 56 78',
      addressLine1: '45 Avenue des Champs-Élysées',
      city: 'Paris',
      postalCode: '75008',
      country: 'FR',
      currencyPreference: 'EUR',
      taxId: 'FR12345678901',
      notes: 'French IT consulting firm - PHP development projects',
    },
  });

  const globalSolutions = await prisma.contact.create({
    data: {
      contactType: ContactType.CLIENT_COMPANY,
      name: 'Global Solutions Inc',
      email: 'info@globalsolutions.com',
      phone: '+1 555 123 4567',
      addressLine1: '789 Business Ave',
      city: 'New York',
      state: 'NY',
      postalCode: '10001',
      country: 'US',
      currencyPreference: 'USD',
      taxId: 'US987654321',
      notes: 'Enterprise software solutions',
    },
  });

  console.log('✅ Created client companies');

  // Create Client Contacts
  const chihabAbdelillah = await prisma.contact.create({
    data: {
      contactType: ContactType.CLIENT_CONTACT,
      name: 'Chihab Abdelillah',
      email: 'chihab@openit.fr',
      phone: '+33 6 78 90 12 34',
      parentCompanyId: openItConsulting.id,
      currencyPreference: 'EUR',
      notes: 'Technical Lead at OpenIT Consulting',
    },
  });

  const johnSmith = await prisma.contact.create({
    data: {
      contactType: ContactType.CLIENT_CONTACT,
      name: 'John Smith',
      email: 'john@techcorp.com',
      phone: '+44 7700 900123',
      parentCompanyId: techCorp.id,
      currencyPreference: 'GBP',
      notes: 'Project Manager at TechCorp',
    },
  });

  console.log('✅ Created client contacts');

  // Create Consultants
  const consultant1 = await prisma.contact.create({
    data: {
      contactType: ContactType.CONSULTANT,
      name: 'Marie Dubois',
      email: 'marie.dubois@freelance.fr',
      phone: '+33 6 98 76 54 32',
      addressLine1: '12 Rue de la Paix',
      city: 'Lyon',
      postalCode: '69000',
      country: 'FR',
      currencyPreference: 'EUR',
      notes: 'Senior PHP Developer - 8 years experience',
    },
  });

  const consultant2 = await prisma.contact.create({
    data: {
      contactType: ContactType.CONSULTANT,
      name: 'Ahmed Hassan',
      email: 'ahmed.hassan@techexpert.com',
      phone: '+971 50 123 4567',
      city: 'Dubai',
      country: 'AE',
      currencyPreference: 'USD',
      notes: 'Full-stack developer with React/Node.js expertise',
    },
  });

  console.log('✅ Created consultants');

  // Create Bank Accounts
  const airwallexEur = await prisma.bankAccount.create({
    data: {
      accountName: 'Akemis EUR Operations',
      bankName: 'Airwallex',
      accountNumber: 'AWX-EUR-001',
      currency: 'EUR',
      iban: 'GB29NWBK60161331926819',
      swiftBic: 'NWBKGB2L',
      accountType: BankAccountType.BUSINESS,
      status: BankAccountStatus.ACTIVE,
      contactId: philippe.id,
      airwallexAccountId: 'awx_eur_main_001',
      dailyLimit: 50000.00,
      monthlyLimit: 1000000.00,
    },
  });

  const airwallexUsd = await prisma.bankAccount.create({
    data: {
      accountName: 'Akemis USD Operations',
      bankName: 'Airwallex',
      accountNumber: 'AWX-USD-001',
      currency: 'USD',
      iban: 'GB76NWBK60161331926820',
      swiftBic: 'NWBKGB2L',
      accountType: BankAccountType.BUSINESS,
      status: BankAccountStatus.ACTIVE,
      contactId: philippe.id,
      airwallexAccountId: 'awx_usd_main_001',
      dailyLimit: 60000.00,
      monthlyLimit: 1200000.00,
    },
  });

  const hsbcHk = await prisma.bankAccount.create({
    data: {
      accountName: 'Akemis Hong Kong Operations',
      bankName: 'HSBC Hong Kong',
      accountNumber: 'HSBC-HK-001',
      currency: 'HKD',
      accountType: BankAccountType.BUSINESS,
      status: BankAccountStatus.ACTIVE,
      contactId: philippe.id,
      dailyLimit: 400000.00,
      monthlyLimit: 8000000.00,
      metadata: {
        importMethod: 'spreadsheet',
        lastImportDate: null,
      },
    },
  });

  console.log('✅ Created bank accounts');

  // Create Exchange Rates
  const exchangeRates = [
    { fromCurrency: 'USD', toCurrency: 'EUR', rate: 0.92 },
    { fromCurrency: 'EUR', toCurrency: 'USD', rate: 1.09 },
    { fromCurrency: 'GBP', toCurrency: 'EUR', rate: 1.17 },
    { fromCurrency: 'EUR', toCurrency: 'GBP', rate: 0.85 },
    { fromCurrency: 'USD', toCurrency: 'GBP', rate: 0.79 },
    { fromCurrency: 'GBP', toCurrency: 'USD', rate: 1.27 },
    { fromCurrency: 'HKD', toCurrency: 'EUR', rate: 0.12 },
    { fromCurrency: 'EUR', toCurrency: 'HKD', rate: 8.50 },
  ];

  for (const rate of exchangeRates) {
    await prisma.exchangeRate.create({
      data: {
        ...rate,
        rateDate: new Date(),
        bidRate: rate.rate * 0.999,
        askRate: rate.rate * 1.001,
        spread: rate.rate * 0.002,
      },
    });
  }

  console.log('✅ Created exchange rates');

  // Create Sample Transactions
  await prisma.transaction.create({
    data: {
      bankAccountId: airwallexEur.id,
      transactionType: 'CREDIT',
      amount: 4779.93,
      currency: 'EUR',
      description: 'Payment from OpenIT Consulting - Invoice INV-2025043045',
      referenceNumber: 'INV-2025043045',
      category: 'INVOICE_PAYMENT',
      counterpartyContactId: openItConsulting.id,
      transactionDate: new Date('2025-06-01'),
      source: 'AIRWALLEX',
      airwallexTransactionId: 'awx_txn_001',
    },
  });

  await prisma.transaction.create({
    data: {
      bankAccountId: airwallexUsd.id,
      transactionType: 'CREDIT',
      amount: 15000.00,
      currency: 'USD',
      description: 'Payment from Global Solutions Inc - Project milestone',
      referenceNumber: 'GS-2025-Q2-001',
      category: 'INVOICE_PAYMENT',
      counterpartyContactId: globalSolutions.id,
      transactionDate: new Date('2025-06-05'),
      source: 'AIRWALLEX',
      airwallexTransactionId: 'awx_txn_002',
    },
  });

  console.log('✅ Created sample transactions');

  // Create Sample Invoice
  const sampleInvoice = await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-2025043045',
      displayNumber: '2025043045',
      clientContactId: chihabAbdelillah.id,
      amount: 4779.93,
      currency: 'EUR',
      subtotal: 4779.93,
      totalTax: 0.00,
      totalAmount: 4779.93,
      status: 'PAID',
      issueDate: new Date('2025-05-30'),
      dueDate: new Date('2025-05-30'), // Due upon receipt
      sentDate: new Date('2025-05-30'),
      paidDate: new Date('2025-06-01'),
      bankAccountId: airwallexEur.id,
      paymentTermsText: 'Due Upon Receipt',
      projectName: 'Tech LEAD PHP Development',
      referenceNumber: 'OPENIT-2025-Q2',
      lineItems: [
        {
          lineNumber: 1,
          description: 'Tech LEAD PHP Development',
          quantity: 9.10,
          unit: 'hours',
          unitPrice: 525.00,
          lineTotal: 4779.93,
          taxRate: 0.00,
          taxAmount: 0.00,
        },
      ],
    },
  });

  console.log('✅ Created sample invoice');

  // Create Sample Consultant Payment
  await prisma.consultantPayment.create({
    data: {
      consultantContactId: consultant1.id,
      relatedInvoiceId: sampleInvoice.id,
      amount: 3600.00, // Consultant gets €3600 from €4779.93 (after Akemis fees)
      currency: 'EUR',
      netAmount: 3600.00,
      commissionRate: 75.00, // Consultant gets 75% after Akemis fees
      status: 'PAID',
      paymentMethod: 'BANK_TRANSFER',
      paymentDate: new Date('2025-06-02'),
      description: 'Payment for Tech LEAD PHP Development - 9.10 hours',
    },
  });

  console.log('✅ Created sample consultant payment');

  console.log('🎉 Database seeded successfully!');
  console.log('\n📊 Summary:');
  console.log(`- Partners: 3 (Philippe: 50%, Partner2: 30%, Partner3: 20%)`);
  console.log(`- Client Companies: 3 (TechCorp, OpenIT, Global Solutions)`);
  console.log(`- Client Contacts: 2 (Chihab, John)`);
  console.log(`- Consultants: 2 (Marie, Ahmed)`);
  console.log(`- Bank Accounts: 3 (Airwallex EUR/USD, HSBC HK)`);
  console.log(`- Exchange Rates: 8 currency pairs`);
  console.log(`- Transactions: 2 sample payments`);
  console.log(`- Invoices: 1 sample invoice (paid)`);
  console.log(`- Consultant Payments: 1 sample payment`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error seeding database:', e);
    await prisma.$disconnect();
    process.exit(1);
  });