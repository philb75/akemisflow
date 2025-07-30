"use client"

import React, { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  RefreshCw,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Trash2,
  X,
  Eye,
  Users,
  Building,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Save,
  Database,
  ExternalLink,
  FileText,
  Clock,
  AlertCircle
} from 'lucide-react'

interface Client {
  id: string
  name: string
  email?: string
  phone?: string
  contactType: string
  status: string
  
  // Address
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  
  // Business info
  taxId?: string
  currencyPreference?: string
  parentCompanyId?: string
  parentCompany?: {
    id: string
    name: string
    contactType: string
  }
  subContacts?: Array<{
    id: string
    name: string
    contactType: string
    email?: string
  }>
  profitSharePercentage?: number
  notes?: string
  
  // Client-specific fields
  clientOnboardingStatus?: string
  clientCategory?: string
  clientRiskRating?: string
  preferredPaymentMethod?: string
  invoiceDeliveryMethod?: string
  autoInvoiceGeneration?: boolean
  
  // Airwallex fields (for counterparties/payers)
  airwallexPayerAccountId?: string
  airwallexEntityType?: string
  airwallexPaymentMethods?: string
  airwallexCapabilities?: string
  
  // Payment history metadata
  paymentHistory?: {
    total_paid?: number
    payment_count?: number
    last_payment?: string
    verified_client?: boolean
  }
  
  // Note: Removed receiving bank details as counterparties send TO us, not receive FROM us
  
  // Sync status
  airwallexSyncStatus?: string
  airwallexLastSyncAt?: string
  airwallexSyncError?: string
  airwallexRawData?: any
  
  // Financial data
  clientInvoices?: Array<{
    id: string
    invoiceNumber?: string
    amount: number
    currency: string
    status: string
    issueDate: string
    dueDate: string
    paidDate?: string
  }>
  
  users?: Array<{
    id: string
    name?: string
    email: string
    role: string
  }>
  
  createdAt: string
  updatedAt: string
}

interface ClientStats {
  totalClients: number
  activeClients: number
  airwallexLinkedClients: number
  companiesCount: number
  contactsCount: number
  totalInvoiceAmount: number
  outstandingAmount: number
  currencies: string[]
  onboardingStatuses: string[]
}

// Define all available fields for the field selector
const ALL_FIELDS = {
  // Core fields
  name: { key: 'name', label: 'Name', category: 'Core', width: 200 },
  email: { key: 'email', label: 'Email', category: 'Core', width: 200 },
  phone: { key: 'phone', label: 'Phone', category: 'Core', width: 140 },
  contactType: { key: 'contactType', label: 'Type', category: 'Core', width: 120 },
  status: { key: 'status', label: 'Status', category: 'Core', width: 100 },
  
  // Address fields
  city: { key: 'city', label: 'City', category: 'Address', width: 120 },
  country: { key: 'country', label: 'Country', category: 'Address', width: 120 },
  state: { key: 'state', label: 'State', category: 'Address', width: 100 },
  
  // Business fields
  taxId: { key: 'taxId', label: 'Tax ID', category: 'Business', width: 120 },
  currencyPreference: { key: 'currencyPreference', label: 'Currency', category: 'Business', width: 80 },
  clientCategory: { key: 'clientCategory', label: 'Category', category: 'Business', width: 100 },
  clientRiskRating: { key: 'clientRiskRating', label: 'Risk Rating', category: 'Business', width: 100 },
  
  // Financial fields
  totalInvoiced: { key: 'totalInvoiced', label: 'Total Invoiced', category: 'Financial', width: 120 },
  outstandingAmount: { key: 'outstandingAmount', label: 'Outstanding', category: 'Financial', width: 120 },
  invoiceCount: { key: 'invoiceCount', label: 'Invoices', category: 'Financial', width: 80 },
  preferredPaymentMethod: { key: 'preferredPaymentMethod', label: 'Payment Method', category: 'Financial', width: 140 },
  
  // Airwallex fields
  airwallexEntityType: { key: 'airwallexEntityType', label: 'Entity Type', category: 'Airwallex', width: 120 },
  airwallexSyncStatus: { key: 'airwallexSyncStatus', label: 'Sync Status', category: 'Airwallex', width: 120 },
  airwallexLastSyncAt: { key: 'airwallexLastSyncAt', label: 'Last Sync', category: 'Airwallex', width: 140 },
  
  // Client management
  clientOnboardingStatus: { key: 'clientOnboardingStatus', label: 'Onboarding', category: 'Management', width: 120 },
  invoiceDeliveryMethod: { key: 'invoiceDeliveryMethod', label: 'Invoice Delivery', category: 'Management', width: 120 },
  
  // Dates
  createdAt: { key: 'createdAt', label: 'Created', category: 'Metadata', width: 120 },
  updatedAt: { key: 'updatedAt', label: 'Updated', category: 'Metadata', width: 120 }
}

// Default visible fields
const DEFAULT_VISIBLE_FIELDS = ['name', 'email', 'contactType', 'country', 'currencyPreference', 'invoiceCount', 'totalInvoiced', 'airwallexSyncStatus', 'status']

type SortField = keyof Client | 'totalInvoiced' | 'outstandingAmount' | 'invoiceCount'
type SortDirection = 'asc' | 'desc'

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [stats, setStats] = useState<ClientStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [visibleFields, setVisibleFields] = useState<string[]>(DEFAULT_VISIBLE_FIELDS)
  const [showFieldSelector, setShowFieldSelector] = useState(false)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [editingClient, setEditingClient] = useState<string | null>(null)
  const [editFormData, setEditFormData] = useState<Partial<Client>>({})

  // Fetch clients from API
  const fetchClients = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/clients')
      if (response.ok) {
        const data = await response.json()
        setClients(data.clients || [])
        setStats(data.stats || null)
      } else {
        console.error('Failed to fetch clients')
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch sync stats
  const fetchSyncStats = useCallback(async () => {
    try {
      const response = await fetch('/api/clients/sync-airwallex')
      if (response.ok) {
        const data = await response.json()
        setStats(prevStats => ({
          ...prevStats,
          ...data.data.database_summary
        }))
      }
    } catch (error) {
      console.error('Error fetching sync stats:', error)
    }
  }, [])

  // Load clients on component mount
  useEffect(() => {
    fetchClients()
    fetchSyncStats()
  }, [fetchClients, fetchSyncStats])

  // Sync clients with Airwallex
  const handleSyncWithAirwallex = async () => {
    try {
      setSyncing(true)
      const response = await fetch('/api/clients/sync-airwallex', {
        method: 'POST'
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('Client sync result:', result)
        
        // Refresh clients and stats
        await fetchClients()
        await fetchSyncStats()
        
        alert(`Client sync completed! 
          New clients: ${result.data.sync_results.new_clients}
          Updated clients: ${result.data.sync_results.updated_clients}
          Conflicts: ${result.data.sync_results.conflicts}`)
      } else {
        const error = await response.json()
        alert('Client sync failed: ' + error.message)
      }
    } catch (error) {
      console.error('Client sync error:', error)
      alert('Client sync failed: ' + error.message)
    } finally {
      setSyncing(false)
    }
  }

  // Calculate derived fields for each client
  const enrichedClients = React.useMemo(() => {
    return clients.map(client => {
      const totalInvoiced = client.clientInvoices?.reduce((sum, invoice) => sum + Number(invoice.amount), 0) || 0
      const outstandingAmount = client.clientInvoices?.filter(inv => inv.status !== 'PAID').reduce((sum, invoice) => sum + Number(invoice.amount), 0) || 0
      const invoiceCount = client.clientInvoices?.length || 0
      
      return {
        ...client,
        totalInvoiced,
        outstandingAmount,
        invoiceCount
      }
    })
  }, [clients])

  // Sort clients
  const sortedClients = React.useMemo(() => {
    return [...enrichedClients].sort((a, b) => {
      let aValue: any = a[sortField]
      let bValue: any = b[sortField]
      
      if (aValue === null || aValue === undefined) aValue = ''
      if (bValue === null || bValue === undefined) bValue = ''
      
      const comparison = typeof aValue === 'number' 
        ? aValue - bValue
        : aValue.toString().localeCompare(bValue.toString(), undefined, { numeric: true })
      
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [enrichedClients, sortField, sortDirection])

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Toggle field visibility
  const toggleFieldVisibility = (fieldKey: string) => {
    if (visibleFields.includes(fieldKey)) {
      setVisibleFields(visibleFields.filter(f => f !== fieldKey))
    } else {
      setVisibleFields([...visibleFields, fieldKey])
    }
  }

  // Toggle row expansion
  const toggleRowExpansion = (clientId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(clientId)) {
      newExpanded.delete(clientId)
      setEditingClient(null)
    } else {
      newExpanded.add(clientId)
    }
    setExpandedRows(newExpanded)
  }

  // Start editing a client
  const startEditing = (client: Client) => {
    setEditingClient(client.id)
    setEditFormData(client)
  }

  // Save client changes
  const handleSaveClient = async (clientId: string) => {
    try {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editFormData)
      })

      if (response.ok) {
        await fetchClients()
        setEditingClient(null)
        setEditFormData({})
      } else {
        const error = await response.json()
        alert('Save failed: ' + error.message)
      }
    } catch (error) {
      console.error('Save error:', error)
      alert('Save failed: ' + error.message)
    }
  }

  // Delete client
  const handleDeleteClient = async (clientId: string) => {
    if (!confirm('Are you sure you want to delete this client?')) return

    try {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchClients()
        await fetchSyncStats()
      } else {
        const error = await response.json()
        alert('Delete failed: ' + error.message)
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('Delete failed: ' + error.message)
    }
  }

  // Format field value for display
  const formatFieldValue = (client: Client & { totalInvoiced?: number, outstandingAmount?: number, invoiceCount?: number }, fieldKey: string) => {
    switch (fieldKey) {
      case 'status':
        return (
          <Badge variant={client.status === 'ACTIVE' ? 'default' : 'destructive'}>
            {client.status}
          </Badge>
        )
      case 'contactType':
        return client.contactType === 'CLIENT_COMPANY' ? 'Company' : 'Contact'
      case 'airwallexSyncStatus':
        const status = client.airwallexSyncStatus || 'NONE'
        const statusColors = {
          'SYNCED': 'bg-green-100 text-green-800',
          'PENDING': 'bg-yellow-100 text-yellow-800',
          'ERROR': 'bg-red-100 text-red-800',
          'NONE': 'bg-gray-100 text-gray-800'
        }
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status] || statusColors.NONE}`}>
            {status}
          </span>
        )
      case 'clientOnboardingStatus':
        const onboardingColors = {
          'NEW': 'bg-blue-100 text-blue-800',
          'DOCUMENTS_PENDING': 'bg-yellow-100 text-yellow-800',
          'VERIFIED': 'bg-green-100 text-green-800',
          'ACTIVE': 'bg-green-100 text-green-800'
        }
        const onboardingStatus = client.clientOnboardingStatus || 'NEW'
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${onboardingColors[onboardingStatus] || onboardingColors.NEW}`}>
            {onboardingStatus}
          </span>
        )
      case 'clientRiskRating':
        const riskColors = {
          'LOW': 'bg-green-100 text-green-800',
          'MEDIUM': 'bg-yellow-100 text-yellow-800',
          'HIGH': 'bg-red-100 text-red-800'
        }
        const risk = client.clientRiskRating || 'MEDIUM'
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${riskColors[risk] || riskColors.MEDIUM}`}>
            {risk}
          </span>
        )
      case 'totalInvoiced':
        return client.totalInvoiced ? `${client.currencyPreference || 'EUR'} ${client.totalInvoiced.toLocaleString()}` : '-'
      case 'outstandingAmount':
        return client.outstandingAmount ? `${client.currencyPreference || 'EUR'} ${client.outstandingAmount.toLocaleString()}` : '-'
      case 'invoiceCount':
        return client.invoiceCount || 0
      case 'airwallexLastSyncAt':
        return client.airwallexLastSyncAt 
          ? new Date(client.airwallexLastSyncAt).toLocaleDateString()
          : '-'
      case 'createdAt':
      case 'updatedAt':
        return new Date(client[fieldKey]).toLocaleDateString()
      default:
        const value = client[fieldKey as keyof Client]
        return value || '-'
    }
  }

  // Render table header
  const renderTableHeader = () => (
    <div className="grid grid-cols-[40px_1fr] gap-2 p-4 bg-gray-50 border-b font-medium text-sm">
      <div></div> {/* Expand button column */}
      <div className="grid gap-2" style={{ gridTemplateColumns: visibleFields.map(f => `${ALL_FIELDS[f]?.width || 120}px`).join(' ') }}>
        {visibleFields.map(fieldKey => {
          const field = ALL_FIELDS[fieldKey]
          if (!field) return null
          
          const isSortable = ['name', 'email', 'contactType', 'country', 'totalInvoiced', 'outstandingAmount', 'invoiceCount', 'createdAt', 'updatedAt'].includes(fieldKey)
          
          return (
            <div
              key={fieldKey}
              className={`flex items-center space-x-1 ${isSortable ? 'cursor-pointer hover:text-blue-600' : ''}`}
              onClick={() => isSortable && handleSort(fieldKey as SortField)}
            >
              <span>{field.label}</span>
              {isSortable && sortField === fieldKey && (
                <ChevronUp className={`w-4 h-4 transition-transform ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-600">Manage client information and track payments from Airwallex counterparties</p>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={handleSyncWithAirwallex}
            disabled={syncing}
            variant="outline"
            className="text-orange-600 border-orange-300 hover:bg-orange-50"
          >
            {syncing ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            {syncing ? 'Syncing...' : 'Sync with Airwallex'}
          </Button>
          <Button
            onClick={() => setShowFieldSelector(!showFieldSelector)}
            variant="outline"
          >
            <Eye className="w-4 h-4 mr-2" />
            Fields
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Clients</p>
                  <p className="text-2xl font-bold">{stats.totalClients}</p>
                </div>
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Clients</p>
                  <p className="text-2xl font-bold text-green-600">{stats.activeClients}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Airwallex Linked</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.airwallexLinkedClients}</p>
                </div>
                <ExternalLink className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Companies</p>
                  <p className="text-2xl font-bold">{stats.companiesCount}</p>
                </div>
                <Building className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Invoiced</p>
                  <p className="text-2xl font-bold text-blue-600">€{(stats.totalInvoiceAmount || 0).toLocaleString()}</p>
                </div>
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Outstanding</p>
                  <p className="text-2xl font-bold text-red-600">€{(stats.outstandingAmount || 0).toLocaleString()}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Field Selector */}
      {showFieldSelector && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Field Selector
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setShowFieldSelector(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {Object.entries(
                Object.values(ALL_FIELDS).reduce((acc, field) => {
                  if (!acc[field.category]) acc[field.category] = []
                  acc[field.category].push(field)
                  return acc
                }, {} as Record<string, typeof ALL_FIELDS[keyof typeof ALL_FIELDS][]>)
              ).map(([category, fields]) => (
                <div key={category}>
                  <h4 className="font-medium text-sm text-gray-700 mb-2">{category}</h4>
                  <div className="space-y-2">
                    {fields.map(field => (
                      <label key={field.key} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={visibleFields.includes(field.key)}
                          onChange={() => toggleFieldVisibility(field.key)}
                          className="rounded"
                        />
                        <span className="text-sm">{field.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Table */}
      <Card>
        <div className="overflow-hidden">
          {renderTableHeader()}
          
          <div className="max-h-[600px] overflow-y-auto">
            {loading ? (
              <div className="p-12 text-center">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
                <p className="text-gray-500">Loading clients...</p>
              </div>
            ) : sortedClients.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg text-gray-500 mb-2">No clients found</p>
                <p className="text-gray-400">Start by syncing with Airwallex or adding clients manually</p>
              </div>
            ) : (
              sortedClients.map(client => {
                const isExpanded = expandedRows.has(client.id)
                const isEditing = editingClient === client.id

                return (
                  <div key={client.id} className="border-b">
                    {/* Main row */}
                    <div className="grid grid-cols-[40px_1fr] gap-2 p-4 hover:bg-gray-50">
                      {/* Expand button */}
                      <button
                        onClick={() => toggleRowExpansion(client.id)}
                        className="flex items-center justify-center w-8 h-8 rounded hover:bg-gray-200"
                      >
                        <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </button>
                      
                      {/* Data columns */}
                      <div className="grid gap-2" style={{ gridTemplateColumns: visibleFields.map(f => `${ALL_FIELDS[f]?.width || 120}px`).join(' ') }}>
                        {visibleFields.map(fieldKey => (
                          <div key={fieldKey} className="text-sm truncate">
                            {formatFieldValue(client, fieldKey)}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="p-6 bg-gray-50 border-t">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Database Section */}
                          <div>
                            <div className="flex items-center space-x-2 mb-4">
                              <Database className="w-5 h-5 text-blue-600" />
                              <h3 className="text-lg font-semibold">Client Information</h3>
                              {!isEditing && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => startEditing(client)}
                                >
                                  Edit
                                </Button>
                              )}
                            </div>
                            
                            {isEditing ? (
                              <div className="space-y-4">
                                {/* Editable form fields */}
                                <div className="grid grid-cols-1 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium mb-1">Name</label>
                                    <input
                                      type="text"
                                      value={editFormData.name || ''}
                                      onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                                      className="w-full px-3 py-2 border rounded-md text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium mb-1">Email</label>
                                    <input
                                      type="email"
                                      value={editFormData.email || ''}
                                      onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                                      className="w-full px-3 py-2 border rounded-md text-sm"
                                    />
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <label className="block text-sm font-medium mb-1">Phone</label>
                                      <input
                                        type="text"
                                        value={editFormData.phone || ''}
                                        onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                                        className="w-full px-3 py-2 border rounded-md text-sm"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-sm font-medium mb-1">Currency</label>
                                      <select
                                        value={editFormData.currencyPreference || 'EUR'}
                                        onChange={(e) => setEditFormData({...editFormData, currencyPreference: e.target.value})}
                                        className="w-full px-3 py-2 border rounded-md text-sm"
                                      >
                                        <option value="EUR">EUR</option>
                                        <option value="USD">USD</option>
                                        <option value="GBP">GBP</option>
                                      </select>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="flex space-x-2 pt-4">
                                  <Button 
                                    size="sm" 
                                    onClick={() => handleSaveClient(client.id)}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    <Save className="w-4 h-4 mr-1" />
                                    Save
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => setEditingClient(null)}
                                  >
                                    Cancel
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => handleDeleteClient(client.id)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 gap-3 text-sm">
                                <div><strong>Name:</strong> {client.name}</div>
                                <div><strong>Email:</strong> {client.email || '-'}</div>
                                <div><strong>Phone:</strong> {client.phone || '-'}</div>
                                <div><strong>Type:</strong> {client.contactType === 'CLIENT_COMPANY' ? 'Company' : 'Contact'}</div>
                                <div><strong>Currency:</strong> {client.currencyPreference || 'EUR'}</div>
                                <div><strong>Address:</strong> {client.addressLine1 || '-'}</div>
                                <div><strong>City:</strong> {client.city || '-'}</div>
                                <div><strong>Country:</strong> {client.country || '-'}</div>
                                <div><strong>Status:</strong> {client.status}</div>
                                <div><strong>Onboarding:</strong> {client.clientOnboardingStatus || 'NEW'}</div>
                                <div><strong>Risk Rating:</strong> {client.clientRiskRating || 'MEDIUM'}</div>
                                <div><strong>Created:</strong> {new Date(client.createdAt).toLocaleString()}</div>
                                
                                {/* Financial Summary */}
                                {client.clientInvoices && client.clientInvoices.length > 0 && (
                                  <div className="pt-2 border-t">
                                    <strong>Financial Summary:</strong>
                                    <div className="ml-4 mt-1 space-y-1">
                                      <div>Total Invoices: {client.clientInvoices.length}</div>
                                      <div>Total Invoiced: {client.currencyPreference || 'EUR'} {client.clientInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0).toLocaleString()}</div>
                                      <div>Outstanding: {client.currencyPreference || 'EUR'} {client.clientInvoices.filter(inv => inv.status !== 'PAID').reduce((sum, inv) => sum + Number(inv.amount), 0).toLocaleString()}</div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Airwallex Section */}
                          <div>
                            <div className="flex items-center space-x-2 mb-4">
                              <ExternalLink className="w-5 h-5 text-orange-600" />
                              <h3 className="text-lg font-semibold">Airwallex Payment Integration</h3>
                              {client.airwallexPayerAccountId && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={async () => {
                                    try {
                                      const response = await fetch(`/api/clients/${client.id}/sync-airwallex`, { method: 'POST' })
                                      if (response.ok) {
                                        await fetchClients()
                                        alert('Client synced successfully!')
                                      } else {
                                        const error = await response.json()
                                        alert('Sync failed: ' + error.message)
                                      }
                                    } catch (error) {
                                      alert('Sync failed: ' + error.message)
                                    }
                                  }}
                                >
                                  <RefreshCw className="w-4 h-4 mr-1" />
                                  Sync
                                </Button>
                              )}
                            </div>
                            
                            {client.airwallexPayerAccountId ? (
                              <div className="grid grid-cols-1 gap-3 text-sm">
                                <div><strong>Payer Account ID:</strong> {client.airwallexPayerAccountId}</div>
                                <div><strong>Entity Type:</strong> {client.airwallexEntityType || '-'}</div>
                                <div><strong>Sync Status:</strong> {client.airwallexSyncStatus || 'NONE'}</div>
                                <div><strong>Last Sync:</strong> {client.airwallexLastSyncAt ? new Date(client.airwallexLastSyncAt).toLocaleString() : '-'}</div>
                                
                                {/* Payment Methods */}
                                {client.airwallexPaymentMethods && (
                                  <div className="pt-2 border-t">
                                    <strong>Payment Methods:</strong>
                                    <div className="ml-4 mt-1">
                                      {JSON.parse(client.airwallexPaymentMethods).join(', ') || '-'}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Payment History (from transaction analysis) */}
                                {client.paymentHistory && (
                                  <div className="pt-2 border-t">
                                    <strong>Payment History:</strong>
                                    <div className="ml-4 mt-1 space-y-1">
                                      <div>Total Paid: €{client.paymentHistory.total_paid?.toLocaleString() || '0'}</div>
                                      <div>Payment Count: {client.paymentHistory.payment_count || 0}</div>
                                      <div>Last Payment: {client.paymentHistory.last_payment ? new Date(client.paymentHistory.last_payment).toLocaleDateString() : '-'}</div>
                                      <div>Verified Client: {client.paymentHistory.verified_client ? 'Yes' : 'No'}</div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-gray-500 italic">
                                Not linked to Airwallex. Use the sync function to link this client with Airwallex counterparties who send payments to us.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}