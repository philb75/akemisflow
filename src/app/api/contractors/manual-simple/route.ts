import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { suppliers } = body
    
    if (!suppliers || !Array.isArray(suppliers)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid request body. Expected { suppliers: [...] }'
      }, { status: 400 })
    }
    
    console.log(`📝 Creating ${suppliers.length} manual suppliers...`)
    
    const created = []
    const errors = []
    
    for (const supplier of suppliers) {
      try {
        const supplierRecord = await prisma.contractor.create({
          data: {
            firstName: supplier.firstName,
            lastName: supplier.lastName,
            email: supplier.email,
            phone: supplier.phone || null,
            company: supplier.company || null,
            vatNumber: supplier.vatNumber || null,
            
            // Address fields
            address: supplier.address || null,
            city: supplier.city || null,
            postalCode: supplier.postalCode || null,
            country: supplier.country || null,
            addressCountryCode: supplier.addressCountryCode || null,
            addressState: supplier.addressState || null,
            
            // Personal details
            birthDate: supplier.birthDate ? new Date(supplier.birthDate) : null,
            birthPlace: supplier.birthPlace || null,
            position: supplier.position || null,
            nationality: supplier.nationality || null,
            
            // Airwallex fields - THIS IS THE KEY FOR MATCHING
            airwallexContactId: supplier.airwallexContactId || null,
            
            // Bank details
            bankAccountName: supplier.bankAccountName || null,
            bankAccountNumber: supplier.bankAccountNumber || null,
            bankAccountCurrency: supplier.bankAccountCurrency || 'EUR',
            bankName: supplier.bankName || null,
            bankCountryCode: supplier.bankCountryCode || null,
            swiftCode: supplier.swiftCode || null,
            iban: supplier.iban || null,
            
            // Documents
            proofOfAddressUrl: supplier.proofOfAddressUrl || null,
            proofOfAddressName: supplier.proofOfAddressName || null,
            proofOfAddressType: supplier.proofOfAddressType || null,
            proofOfAddressSize: supplier.proofOfAddressSize || null,
            idDocumentUrl: supplier.idDocumentUrl || null,
            idDocumentName: supplier.idDocumentName || null,
            idDocumentType: supplier.idDocumentType || null,
            idDocumentSize: supplier.idDocumentSize || null,
            
            status: supplier.status || 'ACTIVE',
            isActive: supplier.isActive !== false,
            preferredCurrency: supplier.preferredCurrency || 'EUR'
          }
        })
        
        created.push(supplierRecord)
        console.log(`✅ Created supplier: ${supplier.firstName} ${supplier.lastName} (${supplier.email})`)
        
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        errors.push({
          supplier: `${supplier.firstName} ${supplier.lastName}`,
          error: errorMsg
        })
        console.error(`❌ Failed to create supplier ${supplier.firstName} ${supplier.lastName}:`, errorMsg)
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Created ${created.length} suppliers, ${errors.length} errors`,
      data: {
        created: created.length,
        errors: errors.length,
        errorDetails: errors
      }
    }, { status: 200 })
    
  } catch (error) {
    console.error('❌ Failed to create manual suppliers:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Failed to create manual suppliers',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Return sample supplier format
    const sampleSuppliers = [
      {
        firstName: "Philippe",
        lastName: "BARTHELEMY", 
        email: "philippe@akemis.com",
        phone: "+33123456780",
        company: "Freelance Developer",
        country: "France",
        
        // KEY: This links to the Airwallex contact
        airwallexContactId: "philippe-001", // This should match the beneficiaryId from Airwallex
        
        bankAccountName: "Philippe BARTHELEMY",
        bankAccountCurrency: "EUR",
        bankName: "Sample Bank",
        iban: "FR7610011000201234567890124",
        swiftCode: "SAMPFRPP",
        
        status: "ACTIVE",
        isActive: true
      }
    ]
    
    return NextResponse.json({
      success: true,
      message: 'Sample supplier format (simplified)',
      data: {
        sampleSuppliers,
        instructions: [
          'POST to this endpoint with { "suppliers": [...] }',
          'Each supplier should have at least: firstName, lastName, email',
          'IMPORTANT: Set airwallexContactId to match the beneficiaryId from Airwallex contacts',
          'This is how the system will match suppliers to Airwallex contacts'
        ]
      }
    }, { status: 200 })
    
  } catch (error) {
    console.error('❌ Failed to get sample suppliers:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Failed to get sample suppliers',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}