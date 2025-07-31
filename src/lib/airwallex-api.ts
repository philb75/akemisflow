interface AirwallexTransaction {
  id: string
  created_at: string
  updated_at: string
  amount: number
  currency: string
  description: string
  status: string
  type: string
  reference?: string
  balance_snapshot?: {
    available_balance: number
    total_balance: number
  }
  source_of_funds?: {
    type: string
    details?: Record<string, any>
  }
  fees?: Array<{
    amount: number
    currency: string
    type: string
  }>
}

interface AirwallexBalance {
  currency: string
  available_balance: number
  total_balance: number
  reserved_balance: number
}

interface AirwallexTransactionResponse {
  items: AirwallexTransaction[]
  has_more: boolean
  next_cursor?: string
}

interface AirwallexBalanceHistoryItem {
  currency: string
  available_balance?: number
  total_balance?: number
  balance?: number
  created_at?: string
  posted_at?: string
  transaction_id?: string
  amount?: number
  description?: string
  source_type?: string
  source?: string
  fee?: number
}

interface AirwallexBalanceHistoryResponse {
  items: AirwallexBalanceHistoryItem[]
  page_before?: string
  page_after?: string
}

interface AirwallexBeneficiary {
  beneficiary_id: string
  nickname?: string
  beneficiary: {
    entity_type: 'PERSONAL' | 'COMPANY'
    first_name?: string
    last_name?: string
    company_name?: string
    address?: {
      country_code?: string
      state?: string
      city?: string
      street_address?: string
      postcode?: string
    }
    bank_details?: {
      account_name?: string
      account_number?: string
      account_currency?: string
      bank_name?: string
      swift_code?: string
      iban?: string
      bank_country_code?: string
      local_clearing_system?: string
    }
    additional_info?: {
      personal_email?: string
      personal_first_name_in_chinese?: string
      personal_last_name_in_chinese?: string
      personal_nationality?: string
      personal_occupation?: string
      personal_id_number?: string
      legal_rep_first_name?: string
      legal_rep_last_name?: string
      legal_rep_email?: string
      legal_rep_mobile_number?: string
      legal_rep_nationality?: string
      legal_rep_occupation?: string
      legal_rep_id_type?: string
      legal_rep_address?: {
        country_code?: string
        state?: string
        city?: string
        street_address?: string
        postcode?: string
      }
      business_registration_number?: string
      business_registration_type?: string
    }
  }
  payer_entity_type?: string
  payment_methods?: string[]
}

interface AirwallexBeneficiaryResponse {
  items: AirwallexBeneficiary[]
  has_more?: boolean
  next_cursor?: string
}

interface AirwallexCounterparty {
  id: string
  name?: string
  entity_type?: 'INDIVIDUAL' | 'COMPANY'
  contact_details?: {
    email?: string
    phone_number?: string
  }
  address?: {
    country_code?: string
    state?: string
    city?: string
    street_address?: string
    postal_code?: string
  }
  created_at?: string
  updated_at?: string
}

interface AirwallexPaymentLink {
  id: string
  url: string
  title: string
  description?: string
  amount?: number
  currency?: string
  status: 'CREATED' | 'ACTIVE' | 'EXPIRED' | 'COMPLETED'
  reusable: boolean
  created_at: string
  updated_at: string
  expires_at?: string
}

interface CreatePaymentLinkRequest {
  title: string
  description?: string
  amount?: number
  currency?: string
  supported_currencies?: string[]
  default_currency?: string
  reusable?: boolean
  expires_at?: string
  customer_id?: string
  collectable_shopper_info?: {
    message?: boolean
    phone_number?: boolean
    reference?: boolean
    shipping_address?: boolean
  }
  metadata?: Record<string, any>
}

export class AirwallexAPIClient {
  private clientId: string
  private apiKey: string
  private baseUrl: string
  private authToken?: string
  private tokenExpiry?: Date

  constructor() {
    this.clientId = process.env.AIRWALLEX_CLIENT_ID || ''
    this.apiKey = process.env.AIRWALLEX_API_KEY || ''
    this.baseUrl = process.env.AIRWALLEX_BASE_URL || 'https://api.airwallex.com'

    // Log configuration status for debugging
    if (!this.clientId || !this.apiKey) {
      console.warn('[Airwallex] API credentials not configured:', {
        hasClientId: !!this.clientId,
        hasApiKey: !!this.apiKey,
        baseUrl: this.baseUrl
      })
    } else {
      console.log('[Airwallex] API client initialized successfully')
    }
  }

  private checkCredentials() {
    if (!this.clientId || !this.apiKey) {
      throw new Error('Airwallex API credentials not configured - please set AIRWALLEX_CLIENT_ID and AIRWALLEX_API_KEY environment variables')
    }
  }

  private async authenticate(): Promise<string> {
    this.checkCredentials()
    
    // Check if we have a valid token
    if (this.authToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.authToken
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/authentication/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-version': '2020-09-22',
          'x-client-id': this.clientId,
          'x-api-key': this.apiKey
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Authentication failed: ${response.status} ${errorText}`)
      }

      const data = await response.json()
      this.authToken = data.token
      // Airwallex tokens typically expire in 1 hour, set expiry slightly earlier
      this.tokenExpiry = new Date(Date.now() + 55 * 60 * 1000) // 55 minutes

      return this.authToken
    } catch (error) {
      console.error('Airwallex authentication error:', error)
      throw error
    }
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await this.authenticate()
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-api-version': '2020-09-22',
        ...options.headers
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API request failed: ${response.status} ${errorText}`)
    }

    return response.json()
  }

  async getCurrentBalances(): Promise<AirwallexBalance[]> {
    try {
      const data = await this.makeRequest<{ items: AirwallexBalance[] }>('/api/v1/balances/current')
      return data.items || []
    } catch (error) {
      console.error('Error fetching current balances:', error)
      throw error
    }
  }

  async getBalanceHistory(
    currency?: string,
    fromDate?: Date,
    toDate?: Date,
    page?: number,
    pageAfter?: string,
    pageBefore?: string,
    pageSize: number = 100,
    accountId?: string
  ): Promise<AirwallexBalanceHistoryResponse> {
    try {
      const params = new URLSearchParams()
      if (currency) params.append('currency', currency)
      if (fromDate) params.append('from', fromDate.toISOString())
      if (toDate) params.append('to', toDate.toISOString())
      
      // Use correct Airwallex pagination parameters
      // Only use page=0 for the initial request to bypass 7-day limit
      // For subsequent requests with page_after, don't include page parameter
      if (page !== undefined && !pageAfter) {
        params.append('page', page.toString())
      } else if (!pageAfter) {
        // Default to page=0 to bypass 7-day limit for complete search
        params.append('page', '0')
      }
      
      if (pageAfter) params.append('page_after', pageAfter)
      if (pageBefore) params.append('page_before', pageBefore)
      params.append('page_size', pageSize.toString())
      
      // Try account-specific balance history if accountId is provided
      let endpoint: string
      if (accountId) {
        endpoint = `/api/v1/accounts/${accountId}/balances/history?${params.toString()}`
        console.log('Fetching account-specific balance history for account:', accountId)
      } else {
        endpoint = `/api/v1/balances/history?${params.toString()}`
        console.log('Fetching global balance history with page=0 (complete search)')
      }
      
      console.log('API endpoint:', endpoint)
      return await this.makeRequest<AirwallexBalanceHistoryResponse>(endpoint)
    } catch (error) {
      console.error('Error fetching balance history:', error)
      throw error
    }
  }

  async getTransactions(
    accountId?: string,
    fromDate?: Date,
    toDate?: Date,
    cursor?: string,
    limit: number = 100
  ): Promise<AirwallexTransactionResponse> {
    try {
      const params = new URLSearchParams()
      if (fromDate) params.append('from', fromDate.toISOString())
      if (toDate) params.append('to', toDate.toISOString())
      if (cursor) params.append('cursor', cursor)
      params.append('limit', limit.toString())

      // Try different possible endpoints based on Airwallex API structure
      let endpoint: string
      if (accountId) {
        endpoint = `/api/v1/accounts/${accountId}/transactions?${params.toString()}`
      } else {
        endpoint = `/api/v1/transactions?${params.toString()}`
      }

      console.log('Calling Airwallex endpoint:', endpoint)
      console.log('Date range:', fromDate?.toISOString(), 'to', toDate?.toISOString())
      
      const response = await this.makeRequest<AirwallexTransactionResponse>(endpoint)
      console.log('Transaction API response:', response)
      
      return response
    } catch (error) {
      console.error('Error fetching transactions:', error)
      console.error('Endpoint was:', endpoint)
      throw error
    }
  }

  async getAllTransactionsSince(
    lastSyncDate: Date,
    accountId?: string
  ): Promise<AirwallexTransaction[]> {
    const allTransactions: AirwallexTransaction[] = []
    let cursor: string | undefined
    let hasMore = true

    // Airwallex has a 7-day limit, so we need to chunk the requests
    const now = new Date()
    const maxDays = 7
    let currentEndDate = now
    let currentStartDate = new Date(Math.max(
      lastSyncDate.getTime(),
      now.getTime() - (maxDays * 24 * 60 * 60 * 1000)
    ))

    while (currentStartDate < now && hasMore) {
      try {
        const response = await this.getTransactions(
          accountId,
          currentStartDate,
          currentEndDate,
          cursor
        )

        allTransactions.push(...response.items)
        hasMore = response.has_more
        cursor = response.next_cursor

        if (!hasMore) {
          // Move to next 7-day chunk
          currentEndDate = currentStartDate
          currentStartDate = new Date(Math.max(
            lastSyncDate.getTime(),
            currentStartDate.getTime() - (maxDays * 24 * 60 * 60 * 1000)
          ))
          hasMore = currentStartDate >= lastSyncDate
          cursor = undefined
        }
      } catch (error) {
        console.error('Error in getAllTransactionsSince:', error)
        break
      }
    }

    return allTransactions
  }

  async getAccounts(): Promise<any[]> {
    try {
      const data = await this.makeRequest<{ items: any[] }>('/api/v1/accounts')
      return data.items || []
    } catch (error) {
      console.error('Error fetching accounts:', error)
      throw error
    }
  }

  async getBeneficiaries(
    cursor?: string,
    limit: number = 100
  ): Promise<AirwallexBeneficiaryResponse> {
    try {
      const params = new URLSearchParams()
      if (cursor) params.append('cursor', cursor)
      params.append('limit', limit.toString())

      const endpoint = `/api/v1/beneficiaries?${params.toString()}`
      console.log('Fetching beneficiaries from:', endpoint)
      
      return await this.makeRequest<AirwallexBeneficiaryResponse>(endpoint)
    } catch (error) {
      console.error('Error fetching beneficiaries:', error)
      throw error
    }
  }

  async getAllBeneficiaries(): Promise<AirwallexBeneficiary[]> {
    const allBeneficiaries: AirwallexBeneficiary[] = []
    let cursor: string | undefined
    let hasMore = true

    while (hasMore) {
      try {
        const response = await this.getBeneficiaries(cursor)
        allBeneficiaries.push(...response.items)
        hasMore = response.has_more || false
        cursor = response.next_cursor

        if (!hasMore || !cursor) {
          break
        }
      } catch (error) {
        console.error('Error in getAllBeneficiaries:', error)
        break
      }
    }

    return allBeneficiaries
  }

  async getCounterparties(
    cursor?: string,
    limit: number = 100
  ): Promise<{ items: AirwallexCounterparty[], has_more?: boolean, next_cursor?: string }> {
    try {
      const params = new URLSearchParams()
      if (cursor) params.append('cursor', cursor)
      params.append('limit', limit.toString())

      const endpoint = `/api/v1/counterparties?${params.toString()}`
      console.log('Fetching counterparties from:', endpoint)
      
      return await this.makeRequest<{ items: AirwallexCounterparty[], has_more?: boolean, next_cursor?: string }>(endpoint)
    } catch (error) {
      console.error('Error fetching counterparties:', error)
      throw error
    }
  }

  async getAllCounterparties(): Promise<AirwallexCounterparty[]> {
    const allCounterparties: AirwallexCounterparty[] = []
    let cursor: string | undefined
    let hasMore = true

    while (hasMore) {
      try {
        const response = await this.getCounterparties(cursor)
        allCounterparties.push(...response.items)
        hasMore = response.has_more || false
        cursor = response.next_cursor

        if (!hasMore || !cursor) {
          break
        }
      } catch (error) {
        console.error('Error in getAllCounterparties:', error)
        break
      }
    }

    return allCounterparties
  }

  // Payment Links API Methods
  async createPaymentLink(request: CreatePaymentLinkRequest): Promise<AirwallexPaymentLink> {
    try {
      console.log('Creating payment link with request:', request)
      
      const response = await this.makeRequest<AirwallexPaymentLink>('/api/v1/pa/payment_links/create', {
        method: 'POST',
        body: JSON.stringify(request)
      })
      
      console.log('Payment link created successfully:', response.id)
      return response
    } catch (error) {
      console.error('Error creating payment link:', error)
      throw error
    }
  }

  async getPaymentLink(paymentLinkId: string): Promise<AirwallexPaymentLink> {
    try {
      return await this.makeRequest<AirwallexPaymentLink>(`/api/v1/pa/payment_links/${paymentLinkId}`)
    } catch (error) {
      console.error('Error fetching payment link:', error)
      throw error
    }
  }

  async sendPaymentLinkNotification(paymentLinkId: string, email: string, message?: string): Promise<void> {
    try {
      console.log(`Sending payment link ${paymentLinkId} to ${email}`)
      
      await this.makeRequest(`/api/v1/pa/payment_links/${paymentLinkId}/notify_shopper`, {
        method: 'POST',
        body: JSON.stringify({
          email,
          message: message || `Please complete your payment using this secure link.`
        })
      })
      
      console.log('Payment link notification sent successfully')
    } catch (error) {
      console.error('Error sending payment link notification:', error)
      throw error
    }
  }

  async listPaymentLinks(
    cursor?: string,
    limit: number = 100,
    status?: string
  ): Promise<{ items: AirwallexPaymentLink[], has_more?: boolean, next_cursor?: string }> {
    try {
      const params = new URLSearchParams()
      if (cursor) params.append('cursor', cursor)
      if (status) params.append('status', status)
      params.append('limit', limit.toString())

      const endpoint = `/api/v1/pa/payment_links?${params.toString()}`
      console.log('Fetching payment links from:', endpoint)
      
      return await this.makeRequest<{ items: AirwallexPaymentLink[], has_more?: boolean, next_cursor?: string }>(endpoint)
    } catch (error) {
      console.error('Error fetching payment links:', error)
      throw error
    }
  }

  // Helper method to create invoice payment links
  async createInvoicePaymentLink(
    invoiceData: {
      invoiceNumber: string
      clientName: string
      clientEmail?: string
      amount: number
      currency: string
      dueDate?: Date
      description?: string
      clientId?: string
    }
  ): Promise<AirwallexPaymentLink> {
    const expiresAt = invoiceData.dueDate 
      ? invoiceData.dueDate.toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // Default to 30 days

    const paymentLinkRequest: CreatePaymentLinkRequest = {
      title: `Invoice ${invoiceData.invoiceNumber} - ${invoiceData.clientName}`,
      description: invoiceData.description || `Payment for Invoice ${invoiceData.invoiceNumber}`,
      amount: Math.round(invoiceData.amount * 100), // Convert to cents
      currency: invoiceData.currency,
      reusable: false, // One-time payment for invoices
      expires_at: expiresAt,
      customer_id: invoiceData.clientId, // If we have an Airwallex customer ID
      collectable_shopper_info: {
        message: true, // Allow client to add payment reference
        phone_number: false,
        reference: true, // Collect reference for reconciliation
        shipping_address: false
      },
      metadata: {
        invoice_number: invoiceData.invoiceNumber,
        client_name: invoiceData.clientName,
        client_email: invoiceData.clientEmail,
        invoice_type: 'client_invoice',
        created_by: 'akemisflow'
      }
    }

    return await this.createPaymentLink(paymentLinkRequest)
  }

  // Transform Airwallex beneficiary to our internal Contact format
  transformBeneficiaryToContact(beneficiaryData: AirwallexBeneficiary): {
    name: string
    email?: string
    phone?: string
    contactType: 'CLIENT_COMPANY' | 'CLIENT_CONTACT' | 'CONSULTANT' | 'PARTNER'
    status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
    addressLine1?: string
    addressLine2?: string
    city?: string
    state?: string
    postalCode?: string
    country?: string
    currencyPreference?: string
    metadata: any
  } {
    const beneficiary = beneficiaryData.beneficiary

    // Determine name based on entity type
    let name: string
    if (beneficiary.entity_type === 'COMPANY' && beneficiary.company_name) {
      name = beneficiary.company_name
    } else if (beneficiary.entity_type === 'PERSONAL') {
      const firstName = beneficiary.first_name || ''
      const lastName = beneficiary.last_name || ''
      name = `${firstName} ${lastName}`.trim()
      
      // If name is empty, try the account name from bank details
      if (!name && beneficiary.bank_details?.account_name) {
        name = beneficiary.bank_details.account_name
      }
    } else {
      name = beneficiaryData.nickname || beneficiary.bank_details?.account_name || `Airwallex Contact ${beneficiaryData.beneficiary_id}`
    }

    // Determine contact type (default to CLIENT_CONTACT)
    let contactType: 'CLIENT_COMPANY' | 'CLIENT_CONTACT' | 'CONSULTANT' | 'PARTNER'
    if (beneficiary.entity_type === 'COMPANY') {
      contactType = 'CLIENT_COMPANY'
    } else {
      contactType = 'CLIENT_CONTACT'
    }

    // Airwallex beneficiaries are assumed to be active since they're approved for payments
    const status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' = 'ACTIVE'

    // Get email from additional_info
    const email = beneficiary.additional_info?.personal_email || 
                  beneficiary.additional_info?.legal_rep_email

    // Get phone from additional_info
    const phone = beneficiary.additional_info?.legal_rep_mobile_number

    // Get currency preference from bank details
    const currencyPreference = beneficiary.bank_details?.account_currency || 'USD'

    return {
      name,
      email,
      phone,
      contactType,
      status,
      addressLine1: beneficiary.address?.street_address,
      addressLine2: undefined, // Airwallex doesn't have addressLine2
      city: beneficiary.address?.city,
      state: beneficiary.address?.state,
      postalCode: beneficiary.address?.postcode,
      country: beneficiary.address?.country_code,
      currencyPreference,
      metadata: {
        airwallex: {
          id: beneficiaryData.beneficiary_id,
          entity_type: beneficiary.entity_type,
          nickname: beneficiaryData.nickname,
          bank_details: beneficiary.bank_details,
          additional_info: beneficiary.additional_info,
          payer_entity_type: beneficiaryData.payer_entity_type,
          payment_methods: beneficiaryData.payment_methods
        }
      }
    }
  }

  // Transform Airwallex counterparty to our internal Contact format
  transformCounterpartyToContact(counterparty: AirwallexCounterparty): {
    name: string
    email?: string
    phone?: string
    contactType: 'CLIENT_COMPANY' | 'CLIENT_CONTACT' | 'CONSULTANT' | 'PARTNER'
    status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
    addressLine1?: string
    addressLine2?: string
    city?: string
    state?: string
    postalCode?: string
    country?: string
    currencyPreference?: string
    metadata: any
  } {
    // Determine contact type based on entity type
    let contactType: 'CLIENT_COMPANY' | 'CLIENT_CONTACT' | 'CONSULTANT' | 'PARTNER'
    if (counterparty.entity_type === 'COMPANY') {
      contactType = 'CLIENT_COMPANY'
    } else {
      contactType = 'CLIENT_CONTACT'
    }

    return {
      name: counterparty.name || `Counterparty ${counterparty.id}`,
      email: counterparty.contact_details?.email,
      phone: counterparty.contact_details?.phone_number,
      contactType,
      status: 'ACTIVE', // Counterparties are assumed active
      addressLine1: counterparty.address?.street_address,
      addressLine2: undefined,
      city: counterparty.address?.city,
      state: counterparty.address?.state,
      postalCode: counterparty.address?.postal_code,
      country: counterparty.address?.country_code,
      currencyPreference: 'USD', // Default
      metadata: {
        airwallex: {
          id: counterparty.id,
          entity_type: counterparty.entity_type,
          created_at: counterparty.created_at,
          updated_at: counterparty.updated_at
        }
      }
    }
  }

  // Transform Airwallex balance history item to our internal format
  transformBalanceHistoryToTransaction(balanceItem: any): {
    bank: string
    date: Date
    transactionType: 'CREDIT' | 'DEBIT'
    financialTransactionType: string
    transactionId: string
    description: string
    currency: string
    conversionRate: number | null
    amount: number
    balance: number
    reference: string
    note: string
    feeAmount?: number
    feeCurrency?: string
    source: string
    sourceType: string
    balanceAfterTransaction: number
    originalDescription: string
  } {
    // Use posted_at as the primary date field (this is when the transaction was posted)
    const dateStr = balanceItem.posted_at || balanceItem.created_at || balanceItem.timestamp || balanceItem.date
    let transactionDate: Date
    
    if (dateStr) {
      transactionDate = new Date(dateStr)
      if (isNaN(transactionDate.getTime())) {
        console.warn('Invalid date detected:', dateStr, 'for item:', balanceItem)
        transactionDate = new Date() // Fallback to current date
      }
    } else {
      console.warn('No date field found in balance item:', balanceItem)
      transactionDate = new Date() // Fallback to current date
    }
    
    // The amount field contains the actual transaction amount (negative for debits, positive for credits)
    const amount = balanceItem.amount || 0
    const isCredit = amount > 0
    
    return {
      bank: 'Airwallex',
      date: transactionDate,
      transactionType: isCredit ? 'CREDIT' : 'DEBIT',
      financialTransactionType: balanceItem.source_type || 'UNKNOWN',
      transactionId: balanceItem.source || balanceItem.transaction_id || balanceItem.id || `bal_${Date.now()}_${Math.random()}`,
      description: balanceItem.description || `${balanceItem.source_type || 'Unknown'} transaction`,
      currency: balanceItem.currency,
      conversionRate: null,
      amount: amount, // Keep original sign: positive for credits, negative for debits
      balance: balanceItem.balance || balanceItem.total_balance || balanceItem.available_balance || 0,
      reference: '',
      note: '',
      feeAmount: balanceItem.fee || 0,
      feeCurrency: balanceItem.currency,
      source: 'API',
      sourceType: balanceItem.source_type || 'UNKNOWN',
      balanceAfterTransaction: balanceItem.balance || balanceItem.total_balance || balanceItem.available_balance || 0,
      originalDescription: balanceItem.description || ''
    }
  }

  // Transform Airwallex API transaction to our internal format
  transformTransaction(apiTransaction: AirwallexTransaction): {
    bank: string
    date: Date
    transactionType: 'CREDIT' | 'DEBIT'
    financialTransactionType: string
    transactionId: string
    description: string
    currency: string
    conversionRate: number | null
    amount: number
    balance: number
    reference: string
    note: string
    feeAmount?: number
    feeCurrency?: string
    source: string
  } {
    // Determine transaction type based on amount or type
    const isCredit = apiTransaction.amount > 0 || apiTransaction.type?.toLowerCase().includes('credit')
    
    // Calculate fee information
    const primaryFee = apiTransaction.fees?.[0]
    
    return {
      bank: 'Airwallex',
      date: new Date(apiTransaction.created_at),
      transactionType: isCredit ? 'CREDIT' : 'DEBIT',
      financialTransactionType: apiTransaction.type || 'UNKNOWN',
      transactionId: apiTransaction.id,
      description: apiTransaction.description || '',
      currency: apiTransaction.currency,
      conversionRate: null, // May need to extract from source_of_funds if available
      amount: apiTransaction.amount,
      balance: apiTransaction.balance_snapshot?.total_balance || 0,
      reference: apiTransaction.reference || '',
      note: '',
      feeAmount: primaryFee?.amount,
      feeCurrency: primaryFee?.currency,
      source: 'API'
    }
  }
}

// Singleton instance
let airwallexClient: AirwallexAPIClient | null = null

export function getAirwallexClient(): AirwallexAPIClient {
  if (!airwallexClient) {
    airwallexClient = new AirwallexAPIClient()
  }
  return airwallexClient
}