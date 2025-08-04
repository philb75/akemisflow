"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Search, 
  Plus, 
  Link2, 
  ExternalLink,
  Users,
  Mail,
  Phone,
  MapPin,
  Building2,
  CreditCard,
  Calendar,
  Loader2,
  Check,
  X,
  ArrowRight,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { toast } from 'sonner'

interface AirwallexContractor {
  id: string
  beneficiaryId: string
  beneficiary_id?: string
  firstName: string
  first_name?: string
  lastName: string
  last_name?: string
  email: string
  phone?: string
  company?: string
  address?: string
  city?: string
  state?: string
  postalCode?: string
  postal_code?: string
  countryCode?: string
  country_code?: string
  bankAccountName?: string
  bank_account_name?: string
  bankAccountNumber?: string
  bank_account_number?: string
  bankName?: string
  bank_name?: string
  iban?: string
  swiftCode?: string
  swift_code?: string
  currency?: string
  entityType?: string
  entity_type?: string
  status: string
  paymentMethods?: string
  payment_methods?: string
  lastFetchedAt: string
  last_fetched_at?: string
  linkedContractorId?: string
  linked_contractor_id?: string
  linkedContractor?: {
    id: string
    firstName: string
    first_name?: string
    lastName: string
    last_name?: string
    email: string
  }
  linked_contractor?: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
}

interface PaginationData {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export function AirwallexContractorList() {
  const [contractors, setContractors] = useState<AirwallexContractor[]>([])
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false
  })
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [linkedFilter, setLinkedFilter] = useState<'all' | 'linked' | 'unlinked'>('all')
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  // Helper function to get values that support both camelCase and snake_case
  const getValue = (contractor: AirwallexContractor, camelCase: string, snakeCase: string) => {
    return (contractor as any)[camelCase] || (contractor as any)[snakeCase] || null
  }

  // Fetch Airwallex contractors
  const fetchContractors = async (page = 1, search = '', linked = 'all') => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        ...(search && { search }),
        ...(linked !== 'all' && { linked: linked === 'linked' ? 'true' : 'false' })
      })

      const response = await fetch(`/api/airwallex-contractors?${params}`, { credentials: 'include' })
      if (!response.ok) throw new Error('Failed to fetch Airwallex contractors')

      const data = await response.json()
      setContractors(data.data)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Error fetching suppliers:', error)
      toast.error('Failed to load Airwallex contractors')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchContractors(1, searchTerm, linkedFilter)
  }, [])

  // Handle search
  const handleSearch = () => {
    fetchContractors(1, searchTerm, linkedFilter)
  }

  // Handle filter change
  const handleFilterChange = (filter: 'all' | 'linked' | 'unlinked') => {
    setLinkedFilter(filter)
    fetchContractors(1, searchTerm, filter)
  }

  // Handle pagination
  const handlePageChange = (page: number) => {
    fetchContractors(page, searchTerm, linkedFilter)
  }

  // Create AkemisFlow contractor from Airwallex data
  const createContractorFromAirwallex = async (airwallexContractor: AirwallexContractor) => {
    const beneficiaryId = getValue(airwallexContractor, 'beneficiaryId', 'beneficiary_id')
    if (!beneficiaryId) return

    try {
      setCreating(beneficiaryId)
      
      // Map Airwallex data to AkemisFlow contractor format
      const contractorData = {
        firstName: getValue(airwallexContractor, 'firstName', 'first_name') || '',
        lastName: getValue(airwallexContractor, 'lastName', 'last_name') || '',
        email: airwallexContractor.email,
        phone: airwallexContractor.phone || null,
        company: airwallexContractor.company || null,
        address: airwallexContractor.address || null,
        city: airwallexContractor.city || null,
        postalCode: getValue(airwallexContractor, 'postalCode', 'postal_code') || null,
        country: getValue(airwallexContractor, 'countryCode', 'country_code') || null,
        // Additional fields that the API might support
        vatNumber: null,
        addressState: airwallexContractor.state || null,
        bankAccountName: getValue(airwallexContractor, 'bankAccountName', 'bank_account_name') || null,
        bankAccountNumber: getValue(airwallexContractor, 'bankAccountNumber', 'bank_account_number') || null,
        bankName: getValue(airwallexContractor, 'bankName', 'bank_name') || null,
        iban: airwallexContractor.iban || null,
        swiftCode: getValue(airwallexContractor, 'swiftCode', 'swift_code') || null,
        bankAccountCurrency: airwallexContractor.currency || null,
        airwallexContactId: beneficiaryId
      }

      const response = await fetch('/api/contractors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contractorData),
        credentials: 'include'
      })

      const result = await response.json()

      if (response.ok) {
        toast.success(`Created contractor for ${contractorData.firstName} ${contractorData.lastName}`)
        await fetchContractors(pagination.page, searchTerm, linkedFilter) // Refresh data
      } else {
        throw new Error(result.error || 'Failed to create contractor')
      }
    } catch (error) {
      console.error('Error creating supplier:', error)
      toast.error(`Failed to create contractor: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setCreating(null)
    }
  }

  // Toggle row expansion
  const toggleRowExpansion = (contractorId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(contractorId)) {
      newExpanded.delete(contractorId)
    } else {
      newExpanded.add(contractorId)
    }
    setExpandedRows(newExpanded)
  }

  // Get linked contractor info
  const getLinkedContractor = (contractor: AirwallexContractor) => {
    return contractor.linkedContractor || contractor.linked_contractor
  }

  // Check if contractor is linked
  const isLinked = (contractor: AirwallexContractor) => {
    return !!(getValue(contractor, 'linkedContractorId', 'linked_contractor_id') || getLinkedContractor(contractor))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">All Airwallex Contacts</h2>
          <p className="text-muted-foreground">
            View all Airwallex beneficiaries and create AkemisFlow contractors from unlinked contacts
          </p>
        </div>
        <Badge variant="outline">
          {pagination.total} total contacts
        </Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or beneficiary ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={linkedFilter} onValueChange={handleFilterChange}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Contacts</SelectItem>
                  <SelectItem value="linked">Linked Only</SelectItem>
                  <SelectItem value="unlinked">Unlinked Only</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleSearch} variant="outline">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Supplier List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5 text-orange-600" />
            Airwallex Beneficiaries
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : contractors.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No contacts found</h3>
              <p className="text-muted-foreground">Try adjusting your search or sync with Airwallex</p>
            </div>
          ) : (
            <div className="space-y-4">
              {contractors.map((contractor) => {
                const beneficiaryId = getValue(contractor, 'beneficiaryId', 'beneficiary_id')
                const firstName = getValue(contractor, 'firstName', 'first_name')
                const lastName = getValue(contractor, 'lastName', 'last_name')
                const linkedContractor = getLinkedContractor(contractor)
                const contractorIsLinked = isLinked(contractor)
                const isExpanded = expandedRows.has(contractor.id)

                return (
                  <div key={contractor.id} className="border rounded-lg">
                    {/* Main Row */}
                    <div className="p-4 hover:bg-muted/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <button
                            onClick={() => toggleRowExpansion(contractor.id)}
                            className="p-1 hover:bg-muted rounded"
                          >
                            <ArrowRight className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                          </button>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="font-medium">
                                {firstName} {lastName}
                              </h3>
                              {contractorIsLinked ? (
                                <Badge variant="default" className="bg-green-100 text-green-800">
                                  <Link2 className="h-3 w-3 mr-1" />
                                  Linked
                                </Badge>
                              ) : (
                                <Badge variant="secondary">
                                  Unlinked
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {contractor.email} • {beneficiaryId}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          {contractorIsLinked && linkedContractor ? (
                            <div className="text-right">
                              <div className="text-sm font-medium">
                                Linked to: {getValue(linkedContractor, 'firstName', 'first_name')} {getValue(linkedContractor, 'lastName', 'last_name')}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {linkedContractor.email}
                              </div>
                            </div>
                          ) : (
                            <Button
                              onClick={() => createContractorFromAirwallex(contractor)}
                              disabled={creating === beneficiaryId}
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              {creating === beneficiaryId ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Creating...
                                </>
                              ) : (
                                <>
                                  <Plus className="h-4 w-4 mr-2" />
                                  Create Contractor
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="border-t bg-muted/20 p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {/* Personal Information */}
                          <div>
                            <h4 className="flex items-center gap-2 text-sm font-semibold mb-3 text-blue-700">
                              <Users className="w-4 h-4" />
                              Personal Information
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div><strong>Name:</strong> {firstName} {lastName}</div>
                              <div><strong>Email:</strong> {contractor.email}</div>
                              <div><strong>Phone:</strong> {contractor.phone || '-'}</div>
                              <div><strong>Company:</strong> {contractor.company || '-'}</div>
                              <div><strong>Entity Type:</strong> {getValue(contractor, 'entityType', 'entity_type') || '-'}</div>
                            </div>
                          </div>

                          {/* Address Information */}
                          <div>
                            <h4 className="flex items-center gap-2 text-sm font-semibold mb-3 text-green-700">
                              <MapPin className="w-4 h-4" />
                              Address Information
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div><strong>Address:</strong> {contractor.address || '-'}</div>
                              <div><strong>City:</strong> {contractor.city || '-'}</div>
                              <div><strong>State:</strong> {contractor.state || '-'}</div>
                              <div><strong>Postal Code:</strong> {getValue(contractor, 'postalCode', 'postal_code') || '-'}</div>
                              <div><strong>Country:</strong> {getValue(contractor, 'countryCode', 'country_code') || '-'}</div>
                            </div>
                          </div>

                          {/* Banking Information */}
                          <div>
                            <h4 className="flex items-center gap-2 text-sm font-semibold mb-3 text-orange-700">
                              <CreditCard className="w-4 h-4" />
                              Banking Information
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div><strong>Account Name:</strong> {getValue(contractor, 'bankAccountName', 'bank_account_name') || '-'}</div>
                              <div><strong>Account Number:</strong> {getValue(contractor, 'bankAccountNumber', 'bank_account_number') || '-'}</div>
                              <div><strong>Bank:</strong> {getValue(contractor, 'bankName', 'bank_name') || '-'}</div>
                              <div><strong>IBAN:</strong> {contractor.iban || '-'}</div>
                              <div><strong>SWIFT:</strong> {getValue(contractor, 'swiftCode', 'swift_code') || '-'}</div>
                              <div><strong>Currency:</strong> {contractor.currency || '-'}</div>
                            </div>
                          </div>
                        </div>

                        {/* System Information */}
                        <div className="mt-4 pt-4 border-t">
                          <h4 className="flex items-center gap-2 text-sm font-semibold mb-3 text-gray-700">
                            <Calendar className="w-4 h-4" />
                            System Information
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div><strong>Beneficiary ID:</strong> <code className="text-xs">{beneficiaryId}</code></div>
                            <div><strong>Status:</strong> {contractor.status}</div>
                            <div><strong>Last Synced:</strong> {new Date(getValue(contractor, 'lastFetchedAt', 'last_fetched_at')).toLocaleString()}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} contacts
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={!pagination.hasPreviousPage}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const page = i + 1
                return (
                  <Button
                    key={page}
                    variant={pagination.page === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(page)}
                  >
                    {page}
                  </Button>
                )
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={!pagination.hasNextPage}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}