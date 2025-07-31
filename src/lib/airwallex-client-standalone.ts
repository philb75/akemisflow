// Standalone Airwallex client without Prisma dependencies
import { airwallexConfig } from './airwallex-config'

interface AirwallexTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
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
      this.accessToken = data.access_token
      this.tokenExpiry = new Date(Date.now() + (data.expires_in - 60) * 1000)
      
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

  async getBeneficiaries(limit: number = 100): Promise<AirwallexBeneficiary[]> {
    await this.ensureAuthenticated()

    try {
      const url = `${this.baseUrl}/api/v1/beneficiaries?limit=${limit}`
      console.log(`Fetching beneficiaries from: /api/v1/beneficiaries?limit=${limit}`)

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
      const beneficiaries = data.items || []
      
      console.log(`Found ${beneficiaries.length} beneficiaries in Airwallex`)
      return beneficiaries
    } catch (error) {
      console.error('[Airwallex] Error fetching beneficiaries:', error)
      throw error
    }
  }
}