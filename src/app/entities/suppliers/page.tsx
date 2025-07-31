"use client"

import React, { useEffect, useState, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ArrowUpIcon, 
  ArrowDownIcon,
  Download,
  Upload,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Trash2,
  X,
  Eye,
  EyeOff,
  Users,
  Building,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Save,
  Database,
  ExternalLink,
  ArrowRight
} from 'lucide-react'
import Link from 'next/link'

interface Supplier {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  company?: string
  vatNumber?: string
  address?: string
  city?: string
  postalCode?: string
  country?: string
  
  // Airwallex fields
  airwallexBeneficiaryId?: string
  airwallexEntityType?: string
  airwallexPaymentMethods?: string
  airwallexPayerEntityType?: string
  
  // Bank details
  bankAccountName?: string
  bankAccountNumber?: string
  bankAccountCurrency?: string
  bankName?: string
  bankCountryCode?: string
  swiftCode?: string
  iban?: string
  localClearingSystem?: string
  
  // Address details
  addressState?: string
  addressCountryCode?: string
  
  // Personal info
  personalEmail?: string
  personalNationality?: string
  personalOccupation?: string
  personalIdNumber?: string
  personalFirstNameChinese?: string
  personalLastNameChinese?: string
  
  // Legal representative
  legalRepFirstName?: string
  legalRepLastName?: string
  legalRepEmail?: string
  legalRepMobileNumber?: string
  legalRepNationality?: string
  legalRepOccupation?: string
  legalRepIdType?: string
  legalRepAddress?: string
  legalRepCity?: string
  legalRepState?: string
  legalRepPostalCode?: string
  legalRepCountryCode?: string
  
  // Business info
  businessRegistrationNumber?: string
  businessRegistrationType?: string
  
  // Sync status
  airwallexSyncStatus?: string
  airwallexLastSyncAt?: string
  airwallexSyncError?: string
  airwallexRawData?: any
  preferredCurrency?: string
  
  // Documents
  proofOfAddressUrl?: string
  proofOfAddressName?: string
  proofOfAddressType?: string
  proofOfAddressSize?: number
  idDocumentUrl?: string
  idDocumentName?: string
  idDocumentType?: string
  idDocumentSize?: number
  
  status: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface SupplierStats {
  totalSuppliers: number
  airwallexLinkedSuppliers: number
  syncedSuppliers: number
  pendingSync: number
  syncErrors: number
}

// Define all available fields for the field selector
const ALL_FIELDS = {
  // Core fields
  name: { key: 'name', label: 'Name', category: 'Core', width: 200 },
  email: { key: 'email', label: 'Email', category: 'Core', width: 200 },
  phone: { key: 'phone', label: 'Phone', category: 'Core', width: 140 },
  company: { key: 'company', label: 'Company', category: 'Core', width: 160 },
  status: { key: 'status', label: 'Status', category: 'Core', width: 100 },
  
  // Address fields
  address: { key: 'address', label: 'Address', category: 'Address', width: 200 },
  city: { key: 'city', label: 'City', category: 'Address', width: 120 },
  country: { key: 'country', label: 'Country', category: 'Address', width: 120 },
  postalCode: { key: 'postalCode', label: 'Postal Code', category: 'Address', width: 100 },
  
  // Airwallex fields
  airwallexEntityType: { key: 'airwallexEntityType', label: 'Entity Type', category: 'Airwallex', width: 120 },
  airwallexSyncStatus: { key: 'airwallexSyncStatus', label: 'Sync Status', category: 'Airwallex', width: 120 },
  airwallexLastSyncAt: { key: 'airwallexLastSyncAt', label: 'Last Sync', category: 'Airwallex', width: 140 },
  
  // Bank fields
  bankName: { key: 'bankName', label: 'Bank Name', category: 'Banking', width: 160 },
  bankAccountCurrency: { key: 'bankAccountCurrency', label: 'Currency', category: 'Banking', width: 80 },
  swiftCode: { key: 'swiftCode', label: 'SWIFT', category: 'Banking', width: 100 },
  iban: { key: 'iban', label: 'IBAN', category: 'Banking', width: 150 },
  
  // Business fields
  vatNumber: { key: 'vatNumber', label: 'VAT Number', category: 'Business', width: 120 },
  businessRegistrationNumber: { key: 'businessRegistrationNumber', label: 'Reg Number', category: 'Business', width: 120 },
  
  // Dates
  createdAt: { key: 'createdAt', label: 'Created', category: 'Metadata', width: 120 },
  updatedAt: { key: 'updatedAt', label: 'Updated', category: 'Metadata', width: 120 }
}

// Default visible fields
const DEFAULT_VISIBLE_FIELDS = ['name', 'email', 'company', 'country', 'bankAccountCurrency', 'airwallexSyncStatus', 'status']

type SortField = keyof Supplier | 'name'
type SortDirection = 'asc' | 'desc'

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [stats, setStats] = useState<SupplierStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [visibleFields, setVisibleFields] = useState<string[]>(DEFAULT_VISIBLE_FIELDS)
  const [showFieldSelector, setShowFieldSelector] = useState(false)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [editingSupplier, setEditingSupplier] = useState<string | null>(null)
  const [editFormData, setEditFormData] = useState<Partial<Supplier>>({})

  // Fetch suppliers from API
  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/suppliers')
      if (response.ok) {
        const data = await response.json()
        setSuppliers(data)
      } else {
        console.error('Failed to fetch suppliers')
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch sync stats
  const fetchSyncStats = useCallback(async () => {
    try {
      const response = await fetch('/api/suppliers/sync-airwallex')
      if (response.ok) {
        const data = await response.json()
        setStats(data.data.database_summary)
      }
    } catch (error) {
      console.error('Error fetching sync stats:', error)
    }
  }, [])

  // Load suppliers on component mount
  useEffect(() => {
    fetchSuppliers()
    fetchSyncStats()
  }, [fetchSuppliers, fetchSyncStats])

  // Sync suppliers with Airwallex
  const handleSyncWithAirwallex = async () => {
    try {
      setSyncing(true)
      const response = await fetch('/api/suppliers/sync-airwallex', {
        method: 'POST'
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('Sync result:', result)
        
        // Refresh suppliers and stats
        await fetchSuppliers()
        await fetchSyncStats()
        
        alert(`Sync completed! 
          New suppliers: ${result.data.sync_results.new_suppliers}
          Updated suppliers: ${result.data.sync_results.updated_suppliers}
          Conflicts: ${result.data.sync_results.conflicts}`)
      } else {
        const error = await response.json()
        if (response.status === 503 && error.error?.includes('environment variables')) {
          alert('Airwallex API is not configured. Please add the required environment variables in your deployment settings.')
        } else {
          alert('Sync failed: ' + (error.error || error.message || 'Unknown error'))
        }
      }
    } catch (error) {
      console.error('Sync error:', error)
      alert('Sync failed: ' + (error instanceof Error ? error.message : 'Network error'))
    } finally {
      setSyncing(false)
    }
  }

  // Sort suppliers
  const sortedSuppliers = React.useMemo(() => {
    return [...suppliers].sort((a, b) => {
      let aValue: any
      let bValue: any
      
      if (sortField === 'name') {
        aValue = `${a.firstName} ${a.lastName}`
        bValue = `${b.firstName} ${b.lastName}`
      } else {
        aValue = a[sortField]
        bValue = b[sortField]
      }
      
      if (aValue === null || aValue === undefined) aValue = ''
      if (bValue === null || bValue === undefined) bValue = ''
      
      const comparison = aValue.toString().localeCompare(bValue.toString(), undefined, { numeric: true })
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [suppliers, sortField, sortDirection])

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
  const toggleRowExpansion = (supplierId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(supplierId)) {
      newExpanded.delete(supplierId)
      setEditingSupplier(null)
    } else {
      newExpanded.add(supplierId)
    }
    setExpandedRows(newExpanded)
  }

  // Start editing a supplier
  const startEditing = (supplier: Supplier) => {
    setEditingSupplier(supplier.id)
    setEditFormData(supplier)
  }

  // Save supplier changes
  const handleSaveSupplier = async (supplierId: string) => {
    try {
      const response = await fetch(`/api/suppliers/${supplierId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editFormData)
      })

      if (response.ok) {
        await fetchSuppliers()
        setEditingSupplier(null)
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

  // Delete supplier
  const handleDeleteSupplier = async (supplierId: string) => {
    if (!confirm('Are you sure you want to delete this supplier?')) return

    try {
      const response = await fetch(`/api/suppliers/${supplierId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchSuppliers()
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
  const formatFieldValue = (supplier: Supplier, fieldKey: string) => {
    switch (fieldKey) {
      case 'name':
        return `${supplier.firstName} ${supplier.lastName}`
      case 'status':
        return (
          <Badge variant={supplier.isActive ? 'default' : 'destructive'}>
            {supplier.isActive ? 'Active' : 'Inactive'}
          </Badge>
        )
      case 'airwallexSyncStatus':
        const status = supplier.airwallexSyncStatus || 'NONE'
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
      case 'airwallexLastSyncAt':
        return supplier.airwallexLastSyncAt 
          ? new Date(supplier.airwallexLastSyncAt).toLocaleDateString()
          : '-'
      case 'createdAt':
      case 'updatedAt':
        return new Date(supplier[fieldKey]).toLocaleDateString()
      default:
        const value = supplier[fieldKey as keyof Supplier]
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
          
          const isSortable = ['name', 'email', 'company', 'country', 'createdAt', 'updatedAt'].includes(fieldKey)
          
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

  // Render supplier row
  const renderSupplierRow = (supplier: Supplier) => {
    const isExpanded = expandedRows.has(supplier.id)
    const isEditing = editingSupplier === supplier.id

    return (
      <div key={supplier.id} className="border-b">
        {/* Main row */}
        <div className="grid grid-cols-[40px_1fr] gap-2 p-4 hover:bg-gray-50">
          {/* Expand button */}
          <button
            onClick={() => toggleRowExpansion(supplier.id)}
            className="flex items-center justify-center w-8 h-8 rounded hover:bg-gray-200"
          >
            <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          </button>
          
          {/* Data columns */}
          <div className="grid gap-2" style={{ gridTemplateColumns: visibleFields.map(f => `${ALL_FIELDS[f]?.width || 120}px`).join(' ') }}>
            {visibleFields.map(fieldKey => (
              <div key={fieldKey} className="text-sm truncate">
                {formatFieldValue(supplier, fieldKey)}
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
                  <h3 className="text-lg font-semibold">Database Information</h3>
                  {!isEditing && (
                    <>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => startEditing(supplier)}
                      >
                        Edit
                      </Button>
                      <Link href={`/entities/suppliers/${supplier.id}`}>
                        <Button 
                          size="sm" 
                          variant="outline"
                        >
                          <ArrowRight className="w-4 h-4 mr-1" />
                          View Details
                        </Button>
                      </Link>
                    </>
                  )}
                </div>
                
                {isEditing ? (
                  <div className="space-y-4">
                    {/* Editable form fields */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">First Name</label>
                        <input
                          type="text"
                          value={editFormData.firstName || ''}
                          onChange={(e) => setEditFormData({...editFormData, firstName: e.target.value})}
                          className="w-full px-3 py-2 border rounded-md text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Last Name</label>
                        <input
                          type="text"
                          value={editFormData.lastName || ''}
                          onChange={(e) => setEditFormData({...editFormData, lastName: e.target.value})}
                          className="w-full px-3 py-2 border rounded-md text-sm"
                        />
                      </div>
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
                        <label className="block text-sm font-medium mb-1">Company</label>
                        <input
                          type="text"
                          value={editFormData.company || ''}
                          onChange={(e) => setEditFormData({...editFormData, company: e.target.value})}
                          className="w-full px-3 py-2 border rounded-md text-sm"
                        />
                      </div>
                    </div>
                    
                    <div className="flex space-x-2 pt-4">
                      <Button 
                        size="sm" 
                        onClick={() => handleSaveSupplier(supplier.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Save className="w-4 h-4 mr-1" />
                        Save
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setEditingSupplier(null)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleDeleteSupplier(supplier.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 text-sm">
                    <div><strong>Name:</strong> {supplier.firstName} {supplier.lastName}</div>
                    <div><strong>Email:</strong> {supplier.email}</div>
                    <div><strong>Phone:</strong> {supplier.phone || '-'}</div>
                    <div><strong>Company:</strong> {supplier.company || '-'}</div>
                    <div><strong>VAT Number:</strong> {supplier.vatNumber || '-'}</div>
                    <div><strong>Address:</strong> {supplier.address || '-'}</div>
                    <div><strong>City:</strong> {supplier.city || '-'}</div>
                    <div><strong>Country:</strong> {supplier.country || '-'}</div>
                    <div><strong>Status:</strong> {supplier.isActive ? 'Active' : 'Inactive'}</div>
                    <div><strong>Created:</strong> {new Date(supplier.createdAt).toLocaleString()}</div>
                  </div>
                )}
              </div>

              {/* Airwallex Section */}
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <ExternalLink className="w-5 h-5 text-orange-600" />
                  <h3 className="text-lg font-semibold">Airwallex Information</h3>
                  {supplier.airwallexBeneficiaryId && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {/* Implement sync logic */}}
                    >
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Sync
                    </Button>
                  )}
                </div>
                
                {supplier.airwallexBeneficiaryId ? (
                  <div className="grid grid-cols-1 gap-3 text-sm">
                    <div><strong>Beneficiary ID:</strong> {supplier.airwallexBeneficiaryId}</div>
                    <div><strong>Entity Type:</strong> {supplier.airwallexEntityType || '-'}</div>
                    <div><strong>Sync Status:</strong> {supplier.airwallexSyncStatus || 'NONE'}</div>
                    <div><strong>Last Sync:</strong> {supplier.airwallexLastSyncAt ? new Date(supplier.airwallexLastSyncAt).toLocaleString() : '-'}</div>
                    
                    {/* Bank Details */}
                    <div className="pt-2 border-t">
                      <strong>Bank Details:</strong>
                      <div className="ml-4 mt-1 space-y-1">
                        <div>Account Name: {supplier.bankAccountName || '-'}</div>
                        <div>Account Number: {supplier.bankAccountNumber || '-'}</div>
                        <div>Currency: {supplier.bankAccountCurrency || '-'}</div>
                        <div>Bank Name: {supplier.bankName || '-'}</div>
                        <div>SWIFT: {supplier.swiftCode || '-'}</div>
                        <div>IBAN: {supplier.iban || '-'}</div>
                      </div>
                    </div>
                    
                    {/* Legal Representative (if exists) */}
                    {supplier.legalRepFirstName && (
                      <div className="pt-2 border-t">
                        <strong>Legal Representative:</strong>
                        <div className="ml-4 mt-1 space-y-1">
                          <div>Name: {supplier.legalRepFirstName} {supplier.legalRepLastName}</div>
                          <div>Email: {supplier.legalRepEmail || '-'}</div>
                          <div>Phone: {supplier.legalRepMobileNumber || '-'}</div>
                          <div>Nationality: {supplier.legalRepNationality || '-'}</div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-500 italic">
                    Not linked to Airwallex. Use the sync function to link this supplier with Airwallex beneficiaries.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
          <p className="text-gray-600">Manage supplier information and Airwallex integration</p>
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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Suppliers</p>
                  <p className="text-2xl font-bold">{stats.totalSuppliers}</p>
                </div>
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Airwallex Linked</p>
                  <p className="text-2xl font-bold">{stats.airwallexLinkedSuppliers}</p>
                </div>
                <ExternalLink className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Synced</p>
                  <p className="text-2xl font-bold text-green-600">{stats.syncedSuppliers}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pendingSync}</p>
                </div>
                <RefreshCw className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Errors</p>
                  <p className="text-2xl font-bold text-red-600">{stats.syncErrors}</p>
                </div>
                <X className="w-8 h-8 text-red-600" />
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <p className="text-gray-500">Loading suppliers...</p>
              </div>
            ) : sortedSuppliers.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg text-gray-500 mb-2">No suppliers found</p>
                <p className="text-gray-400">Start by syncing with Airwallex or adding suppliers manually</p>
              </div>
            ) : (
              sortedSuppliers.map(renderSupplierRow)
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}