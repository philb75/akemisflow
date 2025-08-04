import { AirwallexClientStandalone } from '../airwallex-client-standalone'

// Mock the fetch function
global.fetch = jest.fn()

// Mock the airwallex config
jest.mock('../airwallex-config', () => ({
  airwallexConfig: {
    baseUrl: 'https://api.airwallex.com',
    clientId: 'test-client-id',
    apiKey: 'test-api-key',
    isConfigured: true
  }
}))

describe('AirwallexClientStandalone', () => {
  let client: AirwallexClientStandalone
  
  beforeEach(() => {
    jest.clearAllMocks()
    client = new AirwallexClientStandalone()
  })

  describe('getAllBeneficiaries', () => {
    it('should fetch all beneficiaries when there is only one page', async () => {
      const mockBeneficiaries = [
        { id: '1', email: 'test1@example.com', entity_type: 'PERSONAL' },
        { id: '2', email: 'test2@example.com', entity_type: 'COMPANY' }
      ]

      ;(global.fetch as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            token: 'test-token',
            expires_at: new Date(Date.now() + 3600000).toISOString()
          })
        }))
        .mockImplementationOnce(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            items: mockBeneficiaries,
            has_more: false,
            next_cursor: null
          })
        }))

      await client.initialize()
      const result = await client.getAllBeneficiaries()

      expect(result).toEqual(mockBeneficiaries)
      expect(global.fetch).toHaveBeenCalledTimes(2) // 1 for auth, 1 for beneficiaries
    })

    it('should fetch all beneficiaries across multiple pages', async () => {
      const page1Beneficiaries = Array.from({ length: 20 }, (_, i) => ({
        id: `${i + 1}`,
        email: `test${i + 1}@example.com`,
        entity_type: i % 2 === 0 ? 'PERSONAL' : 'COMPANY'
      }))
      
      const page2Beneficiaries = Array.from({ length: 7 }, (_, i) => ({
        id: `${i + 21}`,
        email: `test${i + 21}@example.com`,
        entity_type: i % 2 === 0 ? 'PERSONAL' : 'COMPANY'
      }))

      ;(global.fetch as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            token: 'test-token',
            expires_at: new Date(Date.now() + 3600000).toISOString()
          })
        }))
        // First page
        .mockImplementationOnce(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            items: page1Beneficiaries,
            has_more: true,
            next_cursor: 'cursor-page-2'
          })
        }))
        // Second page
        .mockImplementationOnce(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            items: page2Beneficiaries,
            has_more: false,
            next_cursor: null
          })
        }))

      await client.initialize()
      const result = await client.getAllBeneficiaries()

      expect(result).toEqual([...page1Beneficiaries, ...page2Beneficiaries])
      expect(result.length).toBe(27) // Total of 27 beneficiaries
      expect(global.fetch).toHaveBeenCalledTimes(3) // 1 for auth, 2 for pages
      
      // Check that cursor was used for second page
      const secondPageCall = (global.fetch as jest.Mock).mock.calls[2]
      expect(secondPageCall[0]).toContain('cursor=cursor-page-2')
    })

    it('should handle empty results', async () => {
      ;(global.fetch as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            token: 'test-token',
            expires_at: new Date(Date.now() + 3600000).toISOString()
          })
        }))
        .mockImplementationOnce(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            items: [],
            has_more: false,
            next_cursor: null
          })
        }))

      await client.initialize()
      const result = await client.getAllBeneficiaries()

      expect(result).toEqual([])
      expect(result.length).toBe(0)
    })

    it('should handle pagination with three or more pages', async () => {
      const pages = [
        { items: Array.from({ length: 10 }, (_, i) => ({ id: `${i + 1}`, email: `test${i + 1}@example.com`, entity_type: 'PERSONAL' })), has_more: true, next_cursor: 'cursor-2' },
        { items: Array.from({ length: 10 }, (_, i) => ({ id: `${i + 11}`, email: `test${i + 11}@example.com`, entity_type: 'COMPANY' })), has_more: true, next_cursor: 'cursor-3' },
        { items: Array.from({ length: 7 }, (_, i) => ({ id: `${i + 21}`, email: `test${i + 21}@example.com`, entity_type: 'PERSONAL' })), has_more: false, next_cursor: null }
      ]

      ;(global.fetch as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            token: 'test-token',
            expires_at: new Date(Date.now() + 3600000).toISOString()
          })
        }))

      pages.forEach(page => {
        ;(global.fetch as jest.Mock).mockImplementationOnce(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve(page)
        }))
      })

      await client.initialize()
      const result = await client.getAllBeneficiaries()

      const expectedBeneficiaries = pages.flatMap(p => p.items)
      expect(result).toEqual(expectedBeneficiaries)
      expect(result.length).toBe(27)
      expect(global.fetch).toHaveBeenCalledTimes(4) // 1 for auth, 3 for pages
    })

    it('should handle API errors gracefully', async () => {
      ;(global.fetch as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            token: 'test-token',
            expires_at: new Date(Date.now() + 3600000).toISOString()
          })
        }))
        .mockImplementationOnce(() => Promise.resolve({
          ok: false,
          status: 500,
          text: () => Promise.resolve('Internal Server Error')
        }))

      await client.initialize()
      
      await expect(client.getAllBeneficiaries()).rejects.toThrow('Failed to fetch beneficiaries: 500 - Internal Server Error')
    })

    it('should handle malformed pagination response', async () => {
      ;(global.fetch as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            token: 'test-token',
            expires_at: new Date(Date.now() + 3600000).toISOString()
          })
        }))
        .mockImplementationOnce(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            items: [{ id: '1', email: 'test@example.com', entity_type: 'PERSONAL' }],
            // Missing has_more and next_cursor - should default to no more pages
          })
        }))

      await client.initialize()
      const result = await client.getAllBeneficiaries()

      expect(result).toHaveLength(1)
      expect(global.fetch).toHaveBeenCalledTimes(2) // Should not attempt second page
    })

    it('should re-authenticate if token expires during pagination', async () => {
      const page1 = [{ id: '1', email: 'test1@example.com', entity_type: 'PERSONAL' }]
      const page2 = [{ id: '2', email: 'test2@example.com', entity_type: 'COMPANY' }]

      // Set token to expire soon
      const expiresAt = new Date(Date.now() + 100).toISOString()

      ;(global.fetch as jest.Mock)
        // Initial auth
        .mockImplementationOnce(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            token: 'test-token-1',
            expires_at: expiresAt
          })
        }))
        // First page
        .mockImplementationOnce(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            items: page1,
            has_more: true,
            next_cursor: 'cursor-2'
          })
        }))

      await client.initialize()
      
      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 150))

      // Continue mocking
      ;(global.fetch as jest.Mock)
        // Re-authentication
        .mockImplementationOnce(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            token: 'test-token-2',
            expires_at: new Date(Date.now() + 3600000).toISOString()
          })
        }))
        // Second page
        .mockImplementationOnce(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            items: page2,
            has_more: false,
            next_cursor: null
          })
        }))

      const result = await client.getAllBeneficiaries()

      expect(result).toEqual([...page1, ...page2])
      expect(global.fetch).toHaveBeenCalledTimes(4) // 2 auths, 2 pages
    })
  })

  describe('getBeneficiaries (legacy)', () => {
    it('should only return first page with warning', async () => {
      const mockBeneficiaries = Array.from({ length: 20 }, (_, i) => ({
        id: `${i + 1}`,
        email: `test${i + 1}@example.com`,
        entity_type: 'PERSONAL'
      }))

      const consoleSpy = jest.spyOn(console, 'log')

      ;(global.fetch as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            token: 'test-token',
            expires_at: new Date(Date.now() + 3600000).toISOString()
          })
        }))
        .mockImplementationOnce(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            items: mockBeneficiaries,
            has_more: true,
            next_cursor: 'cursor-2'
          })
        }))

      await client.initialize()
      const result = await client.getBeneficiaries()

      expect(result).toEqual(mockBeneficiaries)
      expect(result.length).toBe(20)
      expect(consoleSpy).toHaveBeenCalledWith(
        '[Airwallex] WARNING: getBeneficiaries() only returns first page. Use getAllBeneficiaries() for complete list.'
      )
      
      consoleSpy.mockRestore()
    })
  })
})