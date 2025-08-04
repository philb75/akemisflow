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
import { ContractorComparison } from '@/components/contractor-comparison'
import { DocumentManager } from '@/components/document-manager'
import { AirwallexContractorList } from '@/components/airwallex-contractor-list'

interface Contractor {
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
  
  // Personal details (requested fields)
  birthDate?: string
  birthPlace?: string
  position?: string
  
  // Airwallex fields
  airwallexBeneficiaryId?: string
  airwallexContactId?: string
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

interface ContractorStats {
  totalContractors: number
  airwallexLinkedContractors: number
  syncedContractors: number
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

type SortField = keyof Contractor | 'name'
type SortDirection = 'asc' | 'desc'

export default function ContractorsPage() {
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [stats, setStats] = useState<ContractorStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [visibleFields, setVisibleFields] = useState<string[]>(DEFAULT_VISIBLE_FIELDS)
  const [showFieldSelector, setShowFieldSelector] = useState(false)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [editingContractor, setEditingContractor] = useState<string | null>(null)
  const [editFormData, setEditFormData] = useState<Partial<Contractor>>({})
  const [activeTab, setActiveTab] = useState<'contractors' | 'airwallex'>('contractors')

  // Fetch contractors from API
  const fetchContractors = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/contractors')
      if (response.ok) {
        const data = await response.json()
        setContractors(data)
      } else {
        console.error('Failed to fetch contractors')
      }
    } catch (error) {
      console.error('Error fetching contractors:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch sync stats
  const fetchSyncStats = useCallback(async () => {
    try {
      const response = await fetch('/api/contractors/sync-airwallex')
      if (response.ok) {
        const data = await response.json()
        setStats(data.data.database_summary)
      }
    } catch (error) {
      console.error('Error fetching sync stats:', error)
    }
  }, [])

  // Load contractors on component mount
  useEffect(() => {
    fetchContractors()
    fetchSyncStats()
  }, [fetchContractors, fetchSyncStats])

  // Sync contractors with Airwallex
  const handleSyncWithAirwallex = async () => {
    try {
      setSyncing(true)
      const response = await fetch('/api/contractors/sync-airwallex', {
        method: 'POST'
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('Sync result:', result)
        
        // Refresh contractors and stats
        await fetchContractors()
        await fetchSyncStats()
        
        const newCount = result.data.sync_results?.new_airwallex_contractors || 0
        const updatedCount = result.data.sync_results?.updated_airwallex_contractors || 0
        const errorCount = result.data.sync_results?.errors || 0
        
        alert(`Sync completed! 
          New contractors: ${newCount || 'none'}
          Updated contractors: ${updatedCount || 'none'}
          Errors: ${errorCount || 'none'}`)
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

  // Sort contractors
  const sortedContractors = React.useMemo(() => {
    return [...contractors].sort((a, b) => {
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
  }, [contractors, sortField, sortDirection])

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
  const toggleRowExpansion = (contractorId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(contractorId)) {
      newExpanded.delete(contractorId)
      setEditingContractor(null)
    } else {
      newExpanded.add(contractorId)
    }
    setExpandedRows(newExpanded)
  }

  // Start editing a contractor
  const startEditing = (contractor: Contractor) => {
    setEditingContractor(contractor.id)
    setEditFormData(contractor)
  }

  // Save contractor changes
  const handleSaveContractor = async (contractorId: string) => {
    try {
      const response = await fetch(`/api/contractors/${contractorId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editFormData)
      })

      if (response.ok) {
        await fetchContractors()
        setEditingContractor(null)
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

  // Delete contractor
  const handleDeleteContractor = async (contractorId: string) => {
    if (!confirm('Are you sure you want to delete this contractor?')) return

    try {
      const response = await fetch(`/api/contractors/${contractorId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchContractors()
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
  const formatFieldValue = (contractor: Contractor, fieldKey: string) => {
    switch (fieldKey) {
      case 'name':
        return `${contractor.firstName} ${contractor.lastName}`
      case 'status':
        return (
          <Badge variant={contractor.isActive ? 'default' : 'destructive'}>
            {contractor.isActive ? 'Active' : 'Inactive'}
          </Badge>
        )
      case 'airwallexSyncStatus':
        const status = contractor.airwallexSyncStatus || 'NONE'
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
        return contractor.airwallexLastSyncAt 
          ? new Date(contractor.airwallexLastSyncAt).toLocaleDateString()
          : '-'
      case 'createdAt':
      case 'updatedAt':
        return new Date(contractor[fieldKey]).toLocaleDateString()
      default:
        const value = contractor[fieldKey as keyof Contractor]
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

  // Render contractor row
  const renderContractorRow = (contractor: Contractor) => {
    const isExpanded = expandedRows.has(contractor.id)
    const isEditing = editingContractor === contractor.id

    return (
      <div key={contractor.id} className="border-b">
        {/* Main row */}
        <div className="grid grid-cols-[40px_1fr] gap-2 p-4 hover:bg-gray-50">
          {/* Expand button */}
          <button
            onClick={() => toggleRowExpansion(contractor.id)}
            className="flex items-center justify-center w-8 h-8 rounded hover:bg-gray-200"
          >
            <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          </button>
          
          {/* Data columns */}
          <div className="grid gap-2" style={{ gridTemplateColumns: visibleFields.map(f => `${ALL_FIELDS[f]?.width || 120}px`).join(' ') }}>
            {visibleFields.map(fieldKey => (
              <div key={fieldKey} className="text-sm truncate">
                {formatFieldValue(contractor, fieldKey)}
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
                  <h3 className="text-lg font-semibold">Contractor Information</h3>
                  {!isEditing && (
                    <>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => startEditing(contractor)}
                      >
                        Edit
                      </Button>
                      <Link href={`/entities/contractors/${contractor.id}`}>
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
                  <div className="space-y-6">
                    {/* Personal Information */}
                    <div>
                      <h4 className="flex items-center gap-2 text-md font-semibold mb-3 text-blue-700">
                        <Users className="w-4 h-4" />
                        Personal Information
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">First Name *</label>
                          <input
                            type="text"
                            value={editFormData.firstName || ''}
                            onChange={(e) => setEditFormData({...editFormData, firstName: e.target.value})}
                            className="w-full px-3 py-2 border rounded-md text-sm"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Last Name *</label>
                          <input
                            type="text"
                            value={editFormData.lastName || ''}
                            onChange={(e) => setEditFormData({...editFormData, lastName: e.target.value})}
                            className="w-full px-3 py-2 border rounded-md text-sm"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Email *</label>
                          <input
                            type="email"
                            value={editFormData.email || ''}
                            onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                            className="w-full px-3 py-2 border rounded-md text-sm"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Phone</label>
                          <input
                            type="tel"
                            value={editFormData.phone || ''}
                            onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                            className="w-full px-3 py-2 border rounded-md text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Birth Date</label>
                          <input
                            type="date"
                            value={editFormData.birthDate || ''}
                            onChange={(e) => setEditFormData({...editFormData, birthDate: e.target.value})}
                            className="w-full px-3 py-2 border rounded-md text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Birth Place</label>
                          <input
                            type="text"
                            value={editFormData.birthPlace || ''}
                            onChange={(e) => setEditFormData({...editFormData, birthPlace: e.target.value})}
                            className="w-full px-3 py-2 border rounded-md text-sm"
                          />
                        </div>
                      </div>
                      <div className="mt-4">
                        <label className="block text-sm font-medium mb-1">Position</label>
                        <textarea
                          value={editFormData.position || ''}
                          onChange={(e) => setEditFormData({...editFormData, position: e.target.value})}
                          className="w-full px-3 py-2 border rounded-md text-sm"
                          rows={2}
                          placeholder="Job title, role, or position"
                        />
                      </div>
                    </div>

                    {/* Address Information */}
                    <div>
                      <h4 className="flex items-center gap-2 text-md font-semibold mb-3 text-green-700">
                        <MapPin className="w-4 h-4" />
                        Address Information
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Address</label>
                          <input
                            type="text"
                            value={editFormData.address || ''}
                            onChange={(e) => setEditFormData({...editFormData, address: e.target.value})}
                            className="w-full px-3 py-2 border rounded-md text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">City</label>
                          <input
                            type="text"
                            value={editFormData.city || ''}
                            onChange={(e) => setEditFormData({...editFormData, city: e.target.value})}
                            className="w-full px-3 py-2 border rounded-md text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">ZIP Code</label>
                          <input
                            type="text"
                            value={editFormData.postalCode || ''}
                            onChange={(e) => setEditFormData({...editFormData, postalCode: e.target.value})}
                            className="w-full px-3 py-2 border rounded-md text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Country</label>
                          <input
                            type="text"
                            value={editFormData.country || ''}
                            onChange={(e) => setEditFormData({...editFormData, country: e.target.value})}
                            className="w-full px-3 py-2 border rounded-md text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Company Information */}
                    <div>
                      <h4 className="flex items-center gap-2 text-md font-semibold mb-3 text-purple-700">
                        <Building className="w-4 h-4" />
                        Company Information
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Company</label>
                          <input
                            type="text"
                            value={editFormData.company || ''}
                            onChange={(e) => setEditFormData({...editFormData, company: e.target.value})}
                            className="w-full px-3 py-2 border rounded-md text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">VAT Number</label>
                          <input
                            type="text"
                            value={editFormData.vatNumber || ''}
                            onChange={(e) => setEditFormData({...editFormData, vatNumber: e.target.value})}
                            className="w-full px-3 py-2 border rounded-md text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Banking Information */}
                    <div>
                      <h4 className="flex items-center gap-2 text-md font-semibold mb-3 text-orange-700">
                        <CreditCard className="w-4 h-4" />
                        Banking Information
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Account Name</label>
                          <input
                            type="text"
                            value={editFormData.bankAccountName || ''}
                            onChange={(e) => setEditFormData({...editFormData, bankAccountName: e.target.value})}
                            className="w-full px-3 py-2 border rounded-md text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Account Number</label>
                          <input
                            type="text"
                            value={editFormData.bankAccountNumber || ''}
                            onChange={(e) => setEditFormData({...editFormData, bankAccountNumber: e.target.value})}
                            className="w-full px-3 py-2 border rounded-md text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Currency</label>
                          <input
                            type="text"
                            value={editFormData.bankAccountCurrency || ''}
                            onChange={(e) => setEditFormData({...editFormData, bankAccountCurrency: e.target.value})}
                            className="w-full px-3 py-2 border rounded-md text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Bank Name</label>
                          <input
                            type="text"
                            value={editFormData.bankName || ''}
                            onChange={(e) => setEditFormData({...editFormData, bankName: e.target.value})}
                            className="w-full px-3 py-2 border rounded-md text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">SWIFT/BIC</label>
                          <input
                            type="text"
                            value={editFormData.swiftCode || ''}
                            onChange={(e) => setEditFormData({...editFormData, swiftCode: e.target.value})}
                            className="w-full px-3 py-2 border rounded-md text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">IBAN</label>
                          <input
                            type="text"
                            value={editFormData.iban || ''}
                            onChange={(e) => setEditFormData({...editFormData, iban: e.target.value})}
                            className="w-full px-3 py-2 border rounded-md text-sm"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2 pt-4 border-t">
                      <Button 
                        size="sm" 
                        onClick={() => handleSaveContractor(contractor.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Save className="w-4 h-4 mr-1" />
                        Save All Changes
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setEditingContractor(null)}
                      >
                        Cancel
                      </Button>
                      {contractor.airwallexBeneficiaryId && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {/* TODO: Implement individual sync */}}
                          className="text-orange-600 hover:text-orange-700"
                        >
                          <RefreshCw className="w-4 h-4 mr-1" />
                          Sync with Airwallex
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleDeleteContractor(contractor.id)}
                        className="text-red-600 hover:text-red-700 ml-auto"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Personal Information Section */}
                    <div>
                      <h4 className="flex items-center gap-2 text-md font-semibold mb-3 text-blue-700">
                        <Users className="w-4 h-4" />
                        Personal Information
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div><strong>First Name:</strong> {contractor.firstName}</div>
                        <div><strong>Last Name:</strong> {contractor.lastName}</div>
                        <div><strong>Email:</strong> {contractor.email}</div>
                        <div><strong>Phone:</strong> {contractor.phone || '-'}</div>
                        <div><strong>Birth Date:</strong> {contractor.birthDate || '-'}</div>
                        <div><strong>Birth Place:</strong> {contractor.birthPlace || '-'}</div>
                        <div><strong>Position:</strong> {contractor.position || '-'}</div>
                        <div><strong>Status:</strong> {contractor.isActive ? 'Active' : 'Inactive'}</div>
                      </div>
                    </div>

                    {/* Address Information Section */}
                    <div>
                      <h4 className="flex items-center gap-2 text-md font-semibold mb-3 text-green-700">
                        <MapPin className="w-4 h-4" />
                        Address Information
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div><strong>Address:</strong> {contractor.address || '-'}</div>
                        <div><strong>City:</strong> {contractor.city || '-'}</div>
                        <div><strong>ZIP Code:</strong> {contractor.postalCode || '-'}</div>
                        <div><strong>Country:</strong> {contractor.country || '-'}</div>
                      </div>
                    </div>

                    {/* Company Information Section */}
                    <div>
                      <h4 className="flex items-center gap-2 text-md font-semibold mb-3 text-purple-700">
                        <Building className="w-4 h-4" />
                        Company Information
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div><strong>Company:</strong> {contractor.company || '-'}</div>
                        <div><strong>VAT Number:</strong> {contractor.vatNumber || '-'}</div>
                      </div>
                    </div>

                    {/* Banking Information Section */}
                    <div>
                      <h4 className="flex items-center gap-2 text-md font-semibold mb-3 text-orange-700">
                        <CreditCard className="w-4 h-4" />
                        Banking Information
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div><strong>Account Name:</strong> {contractor.bankAccountName || '-'}</div>
                        <div><strong>Account Number:</strong> {contractor.bankAccountNumber || '-'}</div>
                        <div><strong>Currency:</strong> {contractor.bankAccountCurrency || '-'}</div>
                        <div><strong>Bank Name:</strong> {contractor.bankName || '-'}</div>
                        <div><strong>SWIFT/BIC:</strong> {contractor.swiftCode || '-'}</div>
                        <div><strong>IBAN:</strong> {contractor.iban || '-'}</div>
                      </div>
                    </div>

                    {/* System Information Section */}
                    <div>
                      <h4 className="flex items-center gap-2 text-md font-semibold mb-3 text-gray-700">
                        <Database className="w-4 h-4" />
                        System Information
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div><strong>Created:</strong> {new Date(contractor.createdAt).toLocaleString()}</div>
                        <div><strong>Last Update:</strong> {new Date(contractor.updatedAt).toLocaleString()}</div>
                      </div>
                    </div>
                    
                    {/* Document Management */}
                    <DocumentManager 
                      entityId={contractor.id}
                      entityType="contractor"
                    />
                  </div>
                )}
              </div>

              {/* Side-by-Side Comparison */}
              <div>
                <ContractorComparison 
                  contractorId={contractor.id}
                />
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
          <h1 className="text-2xl font-bold text-gray-900">Contractors</h1>
          <p className="text-gray-600">Manage contractor information and Airwallex integration</p>
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

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('contractors')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'contractors'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Database className="w-4 h-4 mr-2 inline" />
            AkemisFlow Contractors
          </button>
          <button
            onClick={() => setActiveTab('airwallex')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'airwallex'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <ExternalLink className="w-4 h-4 mr-2 inline" />
            All Airwallex Contacts
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'contractors' && (
        <>
          {/* Stats Cards */}
          {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Contractors</p>
                  <p className="text-2xl font-bold">{stats.totalContractors}</p>
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
                  <p className="text-2xl font-bold">{stats.airwallexLinkedContractors}</p>
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
                  <p className="text-2xl font-bold text-green-600">{stats.syncedContractors}</p>
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
                <p className="text-gray-500">Loading contractors...</p>
              </div>
            ) : sortedContractors.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg text-gray-500 mb-2">No contractors found</p>
                <p className="text-gray-400">Start by syncing with Airwallex or adding contractors manually</p>
              </div>
            ) : (
              sortedContractors.map(renderContractorRow)
            )}
          </div>
        </div>
      </Card>
        </>
      )}

      {/* Airwallex Tab Content */}
      {activeTab === 'airwallex' && (
        <AirwallexContractorList />
      )}
    </div>
  )
}