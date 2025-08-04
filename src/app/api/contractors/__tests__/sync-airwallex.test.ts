import { POST } from '../sync-airwallex/route'
import { NextRequest } from 'next/server'
import { AirwallexClientStandalone } from '@/lib/airwallex-client-standalone'

// Mock dependencies
jest.mock('@/lib/auth', () => ({
  auth: jest.fn()
}))

jest.mock('@/lib/airwallex-client-standalone')

jest.mock('@/lib/db', () => ({
  prisma: {
    airwallexContractor: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn()
    },
    contractor: {
      findFirst: jest.fn(),
      create: jest.fn(),
      count: jest.fn()
    }
  }
}))

jest.mock('@/lib/supabase', () => ({
  createSupabaseClient: jest.fn()
}))

describe('POST /api/contractors/sync-airwallex', () => {
  const mockAuth = require('@/lib/auth').auth
  const mockPrisma = require('@/lib/db').prisma
  
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock authenticated session
    mockAuth.mockResolvedValue({ user: { id: 'test-user' } })
    
    // Mock environment variables
    process.env.AIRWALLEX_CLIENT_ID = 'test-client-id'
    process.env.AIRWALLEX_API_KEY = 'test-api-key'
  })

  it('should successfully sync all beneficiaries with pagination', async () => {
    // Create 27 mock beneficiaries to simulate the real scenario
    const mockBeneficiaries = Array.from({ length: 27 }, (_, i) => ({
      beneficiary_id: `ben_${i + 1}`,
      first_name: `First${i + 1}`,
      last_name: `Last${i + 1}`,
      entity_type: i % 2 === 0 ? 'PERSONAL' : 'COMPANY',
      beneficiary: {
        entity_type: i % 2 === 0 ? 'PERSONAL' : 'COMPANY',
        additional_info: {
          personal_email: `test${i + 1}@example.com`
        },
        phone_number: `+1234567890${i}`,
        company_name: i % 2 === 1 ? `Company${i + 1}` : null,
        address: {
          street_address: `${i + 1} Test St`,
          city: 'Test City',
          state: 'TS',
          postcode: '12345',
          country_code: 'US'
        },
        bank_details: {
          account_name: `Account ${i + 1}`,
          account_number: `ACC${i + 1}`,
          bank_name: `Bank ${i + 1}`,
          bank_country_code: 'US',
          account_currency: 'USD',
          swift_code: `SWIFT${i + 1}`
        }
      }
    }))

    // Mock AirwallexClientStandalone
    const mockGetAllBeneficiaries = jest.fn().mockResolvedValue(mockBeneficiaries)
    const mockInitialize = jest.fn().mockResolvedValue(undefined)
    
    ;(AirwallexClientStandalone as jest.Mock).mockImplementation(() => ({
      initialize: mockInitialize,
      getAllBeneficiaries: mockGetAllBeneficiaries
    }))

    // Mock database responses
    mockPrisma.airwallexContractor.findUnique.mockResolvedValue(null)
    mockPrisma.airwallexContractor.create.mockImplementation((args: any) => 
      Promise.resolve({ ...args.data, id: `awc_${args.data.beneficiaryId}` })
    )
    mockPrisma.contractor.findFirst.mockResolvedValue(null)
    mockPrisma.contractor.create.mockImplementation((args: any) =>
      Promise.resolve({ ...args.data, id: `con_${args.data.airwallexContactId}` })
    )

    const request = new NextRequest('http://localhost:3000/api/contractors/sync-airwallex', {
      method: 'POST'
    })

    const response = await POST(request)
    const result = await response.json()

    // Verify the response
    expect(response.status).toBe(200)
    expect(result.success).toBe(true)
    expect(result.data.sync_results.total_beneficiaries).toBe(27)
    
    // Verify that getAllBeneficiaries was called (not getBeneficiaries)
    expect(mockGetAllBeneficiaries).toHaveBeenCalledTimes(1)
    expect(mockInitialize).toHaveBeenCalledTimes(1)
    
    // Verify that all 27 beneficiaries were processed
    expect(mockPrisma.airwallexContractor.findUnique).toHaveBeenCalledTimes(27)
  })

  it('should handle mixed create and update operations', async () => {
    const existingBeneficiaries = [
      { beneficiary_id: 'ben_1', first_name: 'Existing', last_name: 'User' }
    ]
    
    const newBeneficiaries = [
      { beneficiary_id: 'ben_2', first_name: 'New', last_name: 'User' }
    ]

    const mockBeneficiaries = [...existingBeneficiaries, ...newBeneficiaries].map(b => ({
      ...b,
      entity_type: 'PERSONAL',
      beneficiary: {
        entity_type: 'PERSONAL',
        additional_info: { personal_email: `${b.first_name.toLowerCase()}@example.com` }
      }
    }))

    const mockGetAllBeneficiaries = jest.fn().mockResolvedValue(mockBeneficiaries)
    const mockInitialize = jest.fn().mockResolvedValue(undefined)
    
    ;(AirwallexClientStandalone as jest.Mock).mockImplementation(() => ({
      initialize: mockInitialize,
      getAllBeneficiaries: mockGetAllBeneficiaries
    }))

    // First beneficiary exists, second doesn't
    mockPrisma.airwallexContractor.findUnique
      .mockResolvedValueOnce({ id: 'awc_1', beneficiaryId: 'ben_1' })
      .mockResolvedValueOnce(null)
    
    mockPrisma.airwallexContractor.update.mockResolvedValue({ id: 'awc_1' })
    mockPrisma.airwallexContractor.create.mockResolvedValue({ id: 'awc_2' })
    
    mockPrisma.contractor.findFirst.mockResolvedValue(null)
    mockPrisma.contractor.create.mockImplementation((args: any) =>
      Promise.resolve({ ...args.data, id: `con_${args.data.airwallexContactId}` })
    )

    const request = new NextRequest('http://localhost:3000/api/contractors/sync-airwallex', {
      method: 'POST'
    })

    const response = await POST(request)
    const result = await response.json()

    expect(response.status).toBe(200)
    expect(result.success).toBe(true)
    expect(mockPrisma.airwallexContractor.update).toHaveBeenCalledTimes(1)
    expect(mockPrisma.airwallexContractor.create).toHaveBeenCalledTimes(1)
  })

  it('should handle empty beneficiaries list', async () => {
    const mockGetAllBeneficiaries = jest.fn().mockResolvedValue([])
    const mockInitialize = jest.fn().mockResolvedValue(undefined)
    
    ;(AirwallexClientStandalone as jest.Mock).mockImplementation(() => ({
      initialize: mockInitialize,
      getAllBeneficiaries: mockGetAllBeneficiaries
    }))

    const request = new NextRequest('http://localhost:3000/api/contractors/sync-airwallex', {
      method: 'POST'
    })

    const response = await POST(request)
    const result = await response.json()

    expect(response.status).toBe(200)
    expect(result.success).toBe(true)
    expect(result.data.sync_results.total_beneficiaries).toBe(0)
    expect(result.data.sync_results.new_airwallex_contractors).toBe(0)
    expect(result.data.sync_results.updated_airwallex_contractors).toBe(0)
  })

  it('should handle API configuration errors', async () => {
    // Remove API credentials
    delete process.env.AIRWALLEX_CLIENT_ID
    delete process.env.AIRWALLEX_API_KEY

    const request = new NextRequest('http://localhost:3000/api/contractors/sync-airwallex', {
      method: 'POST'
    })

    const response = await POST(request)
    const result = await response.json()

    expect(response.status).toBe(503)
    expect(result.success).toBe(false)
    expect(result.message).toBe('Airwallex API not configured')
  })

  it('should handle authentication errors', async () => {
    mockAuth.mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/contractors/sync-airwallex', {
      method: 'POST'
    })

    const response = await POST(request)
    const result = await response.json()

    expect(response.status).toBe(401)
    expect(result.error).toBe('Unauthorized')
  })

  it('should continue processing despite individual beneficiary errors', async () => {
    const mockBeneficiaries = [
      { beneficiary_id: 'ben_1', first_name: 'Good', last_name: 'User', beneficiary: { entity_type: 'PERSONAL' } },
      { beneficiary_id: 'ben_2', first_name: 'Bad', last_name: 'User', beneficiary: { entity_type: 'PERSONAL' } },
      { beneficiary_id: 'ben_3', first_name: 'Another', last_name: 'Good', beneficiary: { entity_type: 'PERSONAL' } }
    ]

    const mockGetAllBeneficiaries = jest.fn().mockResolvedValue(mockBeneficiaries)
    const mockInitialize = jest.fn().mockResolvedValue(undefined)
    
    ;(AirwallexClientStandalone as jest.Mock).mockImplementation(() => ({
      initialize: mockInitialize,
      getAllBeneficiaries: mockGetAllBeneficiaries
    }))

    // Second beneficiary will cause an error
    mockPrisma.airwallexContractor.findUnique
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(new Error('Database error'))
      .mockResolvedValueOnce(null)
    
    mockPrisma.airwallexContractor.create
      .mockResolvedValueOnce({ id: 'awc_1' })
      .mockResolvedValueOnce({ id: 'awc_3' })
    
    mockPrisma.contractor.findFirst.mockResolvedValue(null)
    mockPrisma.contractor.create.mockResolvedValue({ id: 'con_1' })

    const request = new NextRequest('http://localhost:3000/api/contractors/sync-airwallex', {
      method: 'POST'
    })

    const response = await POST(request)
    const result = await response.json()

    expect(response.status).toBe(200)
    expect(result.success).toBe(true)
    expect(result.data.sync_results.total_beneficiaries).toBe(3)
    expect(result.data.sync_results.errors).toBe(1)
    expect(result.data.error_details).toHaveLength(1)
  })

  it('should verify that pagination logging is working', async () => {
    const consoleSpy = jest.spyOn(console, 'log')
    
    const mockBeneficiaries = Array.from({ length: 27 }, (_, i) => ({
      beneficiary_id: `ben_${i + 1}`,
      first_name: `First${i + 1}`,
      last_name: `Last${i + 1}`,
      entity_type: 'PERSONAL',
      beneficiary: { entity_type: 'PERSONAL' }
    }))

    const mockGetAllBeneficiaries = jest.fn().mockResolvedValue(mockBeneficiaries)
    const mockInitialize = jest.fn().mockResolvedValue(undefined)
    
    ;(AirwallexClientStandalone as jest.Mock).mockImplementation(() => ({
      initialize: mockInitialize,
      getAllBeneficiaries: mockGetAllBeneficiaries
    }))

    mockPrisma.airwallexContractor.findUnique.mockResolvedValue(null)
    mockPrisma.airwallexContractor.create.mockImplementation((args: any) => 
      Promise.resolve({ ...args.data, id: `awc_${args.data.beneficiaryId}` })
    )
    mockPrisma.contractor.findFirst.mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/contractors/sync-airwallex', {
      method: 'POST'
    })

    await POST(request)

    // Check that the correct log message appears
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('📋 Found 27 total beneficiaries in Airwallex (after pagination)')
    )

    consoleSpy.mockRestore()
  })
})