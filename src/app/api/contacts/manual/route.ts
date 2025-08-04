import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { contacts } = body
    
    if (!contacts || !Array.isArray(contacts)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid request body. Expected { contacts: [...] }'
      }, { status: 400 })
    }
    
    console.log(`📝 Creating ${contacts.length} manual Airwallex contacts...`)
    
    const created = []
    const errors = []
    
    for (const contact of contacts) {
      try {
        // Generate a mock beneficiary ID if not provided
        const beneficiaryId = contact.beneficiaryId || `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        
        const airwallexContractor = await prisma.airwallexContractor.create({
          data: {
            beneficiaryId,
            entityType: contact.entityType || 'COMPANY',
            firstName: contact.firstName,
            lastName: contact.lastName,
            email: contact.email,
            phone: contact.phone || null,
            company: contact.company || null,
            
            // Address fields
            address: contact.address || null,
            city: contact.city || null,
            state: contact.state || null,
            postalCode: contact.postalCode || null,
            countryCode: contact.countryCode || null,
            
            // Banking fields
            bankAccountName: contact.bankAccountName || null,
            bankAccountNumber: contact.bankAccountNumber || null,
            bankName: contact.bankName || null,
            bankCountryCode: contact.bankCountryCode || null,
            currency: contact.currency || 'EUR',
            iban: contact.iban || null,
            swiftCode: contact.swiftCode || null,
            localClearingSystem: contact.localClearingSystem || null,
            
            // Business registration
            businessRegistrationNumber: contact.businessRegistrationNumber || null,
            businessRegistrationType: contact.businessRegistrationType || null,
            
            // Legal representative
            legalRepFirstName: contact.legalRepFirstName || null,
            legalRepLastName: contact.legalRepLastName || null,
            legalRepEmail: contact.legalRepEmail || null,
            legalRepMobileNumber: contact.legalRepMobileNumber || null,
            legalRepAddress: contact.legalRepAddress || null,
            legalRepCity: contact.legalRepCity || null,
            legalRepState: contact.legalRepState || null,
            legalRepPostalCode: contact.legalRepPostalCode || null,
            legalRepCountryCode: contact.legalRepCountryCode || null,
            legalRepNationality: contact.legalRepNationality || null,
            legalRepOccupation: contact.legalRepOccupation || null,
            legalRepIdType: contact.legalRepIdType || null,
            
            // Personal fields
            personalEmail: contact.personalEmail || null,
            personalIdNumber: contact.personalIdNumber || null,
            personalNationality: contact.personalNationality || null,
            personalOccupation: contact.personalOccupation || null,
            personalFirstNameChinese: contact.personalFirstNameChinese || null,
            personalLastNameChinese: contact.personalLastNameChinese || null,
            
            // Airwallex specific
            paymentMethods: contact.paymentMethods || null,
            capabilities: contact.capabilities || null,
            payerEntityType: contact.payerEntityType || 'COMPANY',
            status: contact.status || 'ACTIVE',
            rawData: contact.rawData || {},
            
            // Sync tracking
            syncError: null,
            linkedContractorId: null
          }
        })
        
        created.push(airwallexContractor)
        console.log(`✅ Created: ${contact.firstName} ${contact.lastName} (${contact.email})`)
        
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        errors.push({
          contact: `${contact.firstName} ${contact.lastName}`,
          error: errorMsg
        })
        console.error(`❌ Failed to create ${contact.firstName} ${contact.lastName}:`, errorMsg)
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Created ${created.length} contacts, ${errors.length} errors`,
      data: {
        created: created.length,
        errors: errors.length,
        errorDetails: errors
      }
    }, { status: 200 })
    
  } catch (error) {
    console.error('❌ Failed to create manual contacts:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Failed to create manual contacts',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Return sample contact format
    const sampleContacts = [
      {
        firstName: "Company",
        lastName: "AKEMIS LIMITED",
        email: "contact@akemis.com",
        phone: "+33123456789",
        company: "Akemis Limited",
        entityType: "COMPANY",
        currency: "EUR",
        countryCode: "FR",
        bankAccountName: "AKEMIS LIMITED",
        bankName: "Sample Bank",
        iban: "FR7610011000201234567890123",
        swiftCode: "SAMPFRPP",
        payerEntityType: "COMPANY",
        beneficiaryId: "akemis-company-001"
      },
      {
        firstName: "Philippe",
        lastName: "BARTHELEMY",
        email: "philippe@akemis.com",
        phone: "+33123456780",
        company: null,
        entityType: "PERSONAL",
        currency: "EUR",
        countryCode: "FR",
        bankAccountName: "Philippe BARTHELEMY",
        bankName: "Sample Bank",
        iban: "FR7610011000201234567890124",
        swiftCode: "SAMPFRPP",
        payerEntityType: "COMPANY",
        beneficiaryId: "philippe-001"
      }
    ]
    
    return NextResponse.json({
      success: true,
      message: 'Sample contact format',
      data: {
        sampleContacts,
        instructions: [
          'POST to this endpoint with { "contacts": [...] }',
          'Each contact should have at least: firstName, lastName, email',
          'Optional fields: company, phone, bankAccountName, iban, etc.',
          'beneficiaryId will be auto-generated if not provided'
        ]
      }
    }, { status: 200 })
    
  } catch (error) {
    console.error('❌ Failed to get sample contacts:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Failed to get sample contacts',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}