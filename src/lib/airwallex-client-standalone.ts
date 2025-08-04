// Standalone Airwallex client without Prisma dependencies
import { airwallexConfig } from './airwallex-config'

interface AirwallexTokenResponse {
  token: string
  expires_at: string
}

interface AirwallexBeneficiary {
  id: string
  email: string
  first_name?: string
  last_name?: string
  company_name?: string
  phone_number?: string
  entity_type: 'COMPANY' | 'PERSONAL'
  address?: {
    street_address?: string
    city?: string
    state?: string
    country?: string
    postcode?: string
  }
  bank_details?: {
    account_number?: string
    account_name?: string
    bank_name?: string
    swift_code?: string
  }
  payment_methods?: string[]
  metadata?: any
}

interface AirwallexBeneficiariesResponse {
  items: AirwallexBeneficiary[]
  has_more?: boolean
  next_cursor?: string
}

export class AirwallexClientStandalone {
  private accessToken: string = ''
  private tokenExpiry: Date = new Date()
  private baseUrl: string

  constructor() {
    this.baseUrl = airwallexConfig.baseUrl
  }

  async initialize(): Promise<void> {
    if (!airwallexConfig.isConfigured) {
      throw new Error('Airwallex API not configured. Missing CLIENT_ID or API_KEY.')
    }

    console.log('[Airwallex] Initializing standalone client...')
    await this.authenticate()
    console.log('[Airwallex] Standalone client initialized successfully')
  }

  private async authenticate(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/authentication/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': airwallexConfig.clientId,
          'x-api-key': airwallexConfig.apiKey,
        },
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Authentication failed: ${response.status} - ${error}`)
      }

      const data: AirwallexTokenResponse = await response.json()
      this.accessToken = data.token
      // Parse the expires_at string and subtract 60 seconds for safety margin
      this.tokenExpiry = new Date(new Date(data.expires_at).getTime() - 60 * 1000)
      
      console.log('[Airwallex] Authentication successful')
    } catch (error) {
      console.error('[Airwallex] Authentication error:', error)
      throw error
    }
  }

  private async ensureAuthenticated(): Promise<void> {
    if (new Date() >= this.tokenExpiry) {
      console.log('[Airwallex] Token expired, re-authenticating...')
      await this.authenticate()
    }
  }

  // Get a single page of beneficiaries
  private async getBeneficiariesPage(cursor?: string, limit: number = 100): Promise<AirwallexBeneficiariesResponse> {
    await this.ensureAuthenticated()

    try {
      let url = `${this.baseUrl}/api/v1/beneficiaries?limit=${limit}`
      if (cursor) {
        url += `&cursor=${encodeURIComponent(cursor)}`
      }
      
      console.log(`Fetching beneficiaries page from: /api/v1/beneficiaries${cursor ? ` with cursor=${cursor}` : ''}`)

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Failed to fetch beneficiaries: ${response.status} - ${error}`)
      }

      const data = await response.json()
      return {
        items: data.items || [],
        has_more: data.has_more,
        next_cursor: data.next_cursor
      }
    } catch (error) {
      console.error('[Airwallex] Error fetching beneficiaries page:', error)
      throw error
    }
  }

  // Get all beneficiaries with pagination
  async getAllBeneficiaries(): Promise<AirwallexBeneficiary[]> {
    const allBeneficiaries: AirwallexBeneficiary[] = []
    let cursor: string | undefined
    let hasMore = true
    let pageCount = 0

    console.log('[Airwallex] Starting to fetch all beneficiaries with pagination...')

    while (hasMore) {
      pageCount++
      const response = await this.getBeneficiariesPage(cursor)
      
      allBeneficiaries.push(...response.items)
      
      console.log(`[Airwallex] Page ${pageCount}: fetched ${response.items.length} beneficiaries (total so far: ${allBeneficiaries.length})`)
      
      hasMore = response.has_more || false
      cursor = response.next_cursor
      
      if (!hasMore || !cursor) {
        console.log(`[Airwallex] No more pages. Pagination complete.`)
        break
      }
    }
    
    console.log(`[Airwallex] ✅ Total beneficiaries fetched: ${allBeneficiaries.length}`)
    return allBeneficiaries
  }

  // Legacy method for backward compatibility - gets first page only
  async getBeneficiaries(limit: number = 100): Promise<AirwallexBeneficiary[]> {
    console.log('[Airwallex] WARNING: getBeneficiaries() only returns first page. Use getAllBeneficiaries() for complete list.')
    const response = await this.getBeneficiariesPage(undefined, limit)
    return response.items
  }

  async getBeneficiary(beneficiaryId: string): Promise<AirwallexBeneficiary | null> {
    await this.ensureAuthenticated()

    try {
      const url = `${this.baseUrl}/api/v1/beneficiaries/${beneficiaryId}`
      console.log(`Fetching beneficiary: ${beneficiaryId}`)

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        if (response.status === 404) {
          console.log(`Beneficiary ${beneficiaryId} not found`)
          return null
        }
        const error = await response.text()
        throw new Error(`Failed to fetch beneficiary: ${response.status} - ${error}`)
      }

      const beneficiary = await response.json()
      console.log(`Found beneficiary: ${beneficiary.email}`)
      return beneficiary
    } catch (error) {
      console.error(`[Airwallex] Error fetching beneficiary ${beneficiaryId}:`, error)
      throw error
    }
  }
}