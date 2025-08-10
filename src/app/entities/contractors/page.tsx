"use client"

import React, { useEffect, useState, useCallback, useRef } from 'react'
import { getCountryName } from '@/lib/country-utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
  Plus,
  CreditCard,
  Save,
  Database,
  ExternalLink,
  ArrowRight,
  ArrowLeft,
  Check,
  Star,
  Search,
  Loader2,
  Edit,
  Briefcase,
  UserCheck,
  User,
  Clock,
  MessageSquare
} from 'lucide-react'
import Link from 'next/link'
import { SupplierComparison } from '@/components/supplier-comparison'
import { DocumentManager } from '@/components/document-manager'

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
  bankStatementUrl?: string
  bankStatementName?: string
  bankStatementType?: string
  bankStatementSize?: number
  contractUrl?: string
  contractName?: string
  contractType?: string
  contractSize?: number
  
  status: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface AirwallexContact {
  id: string
  beneficiaryId: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  company?: string
  address?: string
  city?: string
  state?: string
  postalCode?: string
  countryCode?: string
  bankAccountName?: string
  bankAccountNumber?: string
  bankName?: string
  iban?: string
  swiftCode?: string
  currency?: string
  entityType?: string
  status: string
  paymentMethods?: string
  lastFetchedAt: string
  createdAt?: string
  linkedContractorId?: string
  rawData?: any
}

interface CombinedContact {
  id: string
  name: string
  accountName: string
  email: string
  phone?: string
  company?: string
  country?: string
  countryCode?: string
  hasContractor: boolean
  hasAirwallex: boolean
  contractor?: Contractor
  airwallex?: AirwallexContact
  airwallexContactId?: string
  createdAt?: string
  updatedAt?: string
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
  accountName: { key: 'accountName', label: 'Account Name', category: 'Core', width: 200 },
  email: { key: 'email', label: 'Email', category: 'Core', width: 200 },
  phone: { key: 'phone', label: 'Phone', category: 'Core', width: 140 },
  company: { key: 'company', label: 'Company', category: 'Core', width: 160 },
  country: { key: 'country', label: 'Country', category: 'Core', width: 140 },
  
  // Status fields
  indicators: { key: 'indicators', label: 'Status', category: 'Status', width: 180 },
  
  // Action fields
  actions: { key: 'actions', label: 'Actions', category: 'Actions', width: 120 },
  
  // Bank fields
  bankAccountCurrency: { key: 'bankAccountCurrency', label: 'Currency', category: 'Banking', width: 80 },
  swiftCode: { key: 'swiftCode', label: 'SWIFT', category: 'Banking', width: 100 },
  
  // Date fields
  createdAt: { key: 'createdAt', label: 'Created', category: 'Dates', width: 120 },
  updatedAt: { key: 'updatedAt', label: 'Updated', category: 'Dates', width: 120 },
  lastSynced: { key: 'lastSynced', label: 'Last Synced', category: 'Dates', width: 120 }
}

// Default visible fields
const DEFAULT_VISIBLE_FIELDS = ['accountName', 'email', 'company', 'country', 'bankAccountCurrency', 'indicators', 'actions']

type SortField = 'accountName' | 'email' | 'company' | 'country'
type SortDirection = 'asc' | 'desc'

interface DocumentLine {
  id: string
  category: string
  document?: {
    url?: string
    name?: string
    type?: string
    size?: number
  }
}

// Document Category Component
interface DocumentCategoryProps {
  title: string
  category: string
  document: {
    url?: string
    name?: string
    type?: string
    size?: number
  }
  onUpload: (file: File) => void
  onView: (url: string) => void
  onDelete: () => void
  isUploading?: boolean
}

const DocumentCategory: React.FC<DocumentCategoryProps> = ({ 
  title, 
  category, 
  document, 
  onUpload, 
  onView, 
  onDelete,
  isUploading = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      onUpload(file)
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'identity': return 'bg-blue-100 text-blue-800'
      case 'banking': return 'bg-green-100 text-green-800'
      case 'legal': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="border border-gray-200 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{title}</span>
        <Badge variant="outline" className={`text-xs ${getCategoryColor(category)}`}>
          {category}
        </Badge>
      </div>
      
      {document.url ? (
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-600 flex-1 min-w-0">
            <div className="truncate">{document.name}</div>
            <div>{document.type} • {document.size ? `${Math.round(document.size / 1024)}KB` : 'Unknown size'}</div>
          </div>
          <div className="flex space-x-1 ml-2">
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-6 px-2"
              onClick={() => onView(document.url!)}
              title="View document"
            >
              <Eye className="w-3 h-3" />
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-6 px-2 text-red-600"
              onClick={onDelete}
              title="Delete document"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      ) : (
        <>
          <Button 
            size="sm" 
            variant="outline" 
            className="w-full h-8 text-xs"
            onClick={handleUploadClick}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-3 h-3 mr-1" />
                Upload {title}
              </>
            )}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            onChange={handleFileChange}
          />
        </>
      )}
    </div>
  )
}

export default function ContractorsPage() {
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [airwallexContacts, setAirwallexContacts] = useState<AirwallexContact[]>([])
  const [combinedContacts, setCombinedContacts] = useState<CombinedContact[]>([])
  const [stats, setStats] = useState<ContractorStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [sortField, setSortField] = useState<SortField>('accountName')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [visibleFields, setVisibleFields] = useState<string[]>(DEFAULT_VISIBLE_FIELDS)
  const [showFieldSelector, setShowFieldSelector] = useState(false)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [syncingContacts, setSyncingContacts] = useState<Set<string>>(new Set())
  const [uploadingDocuments, setUploadingDocuments] = useState<Set<string>>(new Set())
  const [fileInputRefs, setFileInputRefs] = useState<Map<string, HTMLInputElement>>(new Map())
  const [editingContractors, setEditingContractors] = useState<Set<string>>(new Set())
  const [editingData, setEditingData] = useState<{ [key: string]: Partial<Contractor> }>({})
  const [documentLines, setDocumentLines] = useState<{ [contractorId: string]: DocumentLine[] }>({})

  // Fetch contractors from API
  const fetchContractors = useCallback(async () => {
    try {
      const response = await fetch('/api/contractors', { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setContractors(data || [])
      } else {
        console.error('Failed to fetch contractors:', response.status, response.statusText)
        setContractors([]) // Set empty array as fallback
      }
    } catch (error) {
      console.error('Error fetching contractors:', error)
      setContractors([]) // Set empty array as fallback
    }
  }, [])

  // Fetch Airwallex contacts
  const fetchAirwallexContacts = useCallback(async () => {
    try {
      const response = await fetch('/api/airwallex-contractors?limit=1000', { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setAirwallexContacts(data.data || [])
      } else {
        console.error('Failed to fetch Airwallex contacts:', response.status, response.statusText)
        setAirwallexContacts([]) // Set empty array as fallback
      }
    } catch (error) {
      console.error('Error fetching Airwallex contacts:', error)
      setAirwallexContacts([]) // Set empty array as fallback
    }
  }, [])

  // Fetch sync stats
  const fetchSyncStats = useCallback(async () => {
    try {
      const response = await fetch('/api/contractors/sync-airwallex', { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setStats(data.data?.database_summary || {})
      } else {
        console.error('Failed to fetch sync stats:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error fetching sync stats:', error)
      // Set default stats to prevent UI issues
      setStats({
        totalContractors: 0,
        airwallexLinkedContractors: 0,
        syncedContractors: 0,
        pendingSync: 0,
        syncErrors: 0
      })
    }
  }, [])

  // Combine contractors and Airwallex contacts
  const combineContacts = useCallback(() => {
    const contactMap = new Map<string, CombinedContact>()

    // Add contractors to the map
    contractors.forEach(contractor => {
      const key = contractor.airwallexContactId || contractor.email
      const contact: CombinedContact = {
        id: contractor.id,
        name: `${contractor.firstName} ${contractor.lastName}`, // Keep for backwards compatibility
        accountName: contractor.bankAccountName || `${contractor.firstName} ${contractor.lastName}`,
        email: contractor.email,
        phone: contractor.phone,
        company: contractor.company,
        country: getCountryName(contractor.addressCountryCode || contractor.country),
        countryCode: contractor.addressCountryCode,
        hasContractor: true,
        hasAirwallex: false,
        contractor,
        airwallexContactId: contractor.airwallexContactId,
        createdAt: contractor.createdAt,
        updatedAt: contractor.updatedAt
      }
      contactMap.set(key, contact)
    })

    // Add or merge Airwallex contacts
    airwallexContacts.forEach(airwallex => {
      const key = airwallex.beneficiaryId || airwallex.email
      const existing = contactMap.get(key)
      
      if (existing) {
        // Merge with existing contractor
        existing.hasAirwallex = true
        existing.airwallex = airwallex
        // If no account name from AkemisFlow, use Airwallex account name
        if (!existing.accountName || existing.accountName === existing.name) {
          existing.accountName = airwallex.bankAccountName || existing.name
        }
        // Use better country info if available
        if (airwallex.countryCode && !existing.countryCode) {
          existing.country = getCountryName(airwallex.countryCode)
          existing.countryCode = airwallex.countryCode
        }
      } else {
        // Create new contact for Airwallex-only entry
        const contact: CombinedContact = {
          id: airwallex.id,
          name: `${airwallex.firstName} ${airwallex.lastName}`,
          accountName: airwallex.bankAccountName || `${airwallex.firstName} ${airwallex.lastName}`,
          email: airwallex.email,
          phone: airwallex.phone,
          company: airwallex.company,
          country: getCountryName(airwallex.countryCode),
          countryCode: airwallex.countryCode,
          hasContractor: false,
          hasAirwallex: true,
          airwallex,
          airwallexContactId: airwallex.beneficiaryId,
          createdAt: airwallex.createdAt,
          updatedAt: airwallex.lastFetchedAt
        }
        contactMap.set(key, contact)
      }
    })

    setCombinedContacts(Array.from(contactMap.values()))
  }, [contractors, airwallexContacts])

  // Load data on component mount
  useEffect(() => {
    console.log('🔄 useEffect triggered - Starting data load...')
    
    const loadData = async () => {
      console.log('📱 loadData function called')
      setLoading(true)
      
      try {
        console.log('📡 Making API calls...')
        const results = await Promise.allSettled([
          fetchContractors(),
          fetchAirwallexContacts(),
          fetchSyncStats()
        ])
        
        console.log('📊 API results:', results.map(r => r.status))
        
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            const apiNames = ['fetchContractors', 'fetchAirwallexContacts', 'fetchSyncStats']
            console.error(`${apiNames[index]} failed:`, result.reason)
          }
        })
        
        console.log('✅ All API calls completed')
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        console.log('🏁 Setting loading to false')
        setLoading(false)
      }
    }
    
    loadData()
  }, [fetchContractors, fetchAirwallexContacts, fetchSyncStats])

  // Combine contacts when data changes
  useEffect(() => {
    combineContacts()
  }, [combineContacts])

  // Sync contacts with Airwallex (delete and re-import)
  const handleSyncWithAirwallex = async () => {
    try {
      setSyncing(true)
      
      // First, delete all existing Airwallex contractors
      const deleteResponse = await fetch('/api/airwallex-contractors/sync', {
        method: 'DELETE',
        credentials: 'include'
      })
      
      if (!deleteResponse.ok) {
        const deleteError = await deleteResponse.json()
        throw new Error(deleteError.message || 'Failed to delete existing Airwallex contractors')
      }
      
      const deleteResult = await deleteResponse.json()
      console.log(`Deleted ${deleteResult.data.deletedCount} existing contractors`)
      
      // Then re-import fresh data
      const syncResponse = await fetch('/api/airwallex-contractors/sync', {
        method: 'POST',
        credentials: 'include'
      })
      
      if (syncResponse.ok) {
        const result = await syncResponse.json()
        console.log('Sync result:', result)
        
        // Refresh all data
        await Promise.all([
          fetchContractors(),
          fetchAirwallexContacts(),
          fetchSyncStats()
        ])
        
        const syncData = result.data
        const newAirwallexCount = syncData?.sync_results?.new_airwallex_contractors || 0
        const updatedAirwallexCount = syncData?.sync_results?.updated_airwallex_contractors || 0
        const newAkemisCount = syncData?.sync_results?.new_akemis_contractors || 0
        const existingAkemisCount = syncData?.sync_results?.existing_akemis_contractors || 0
        const errorCount = syncData?.sync_results?.errors || 0
        
        alert(`Sync completed! 
          Deleted: ${deleteResult.data.deletedCount}
          New Airwallex contacts: ${newAirwallexCount}
          Updated Airwallex contacts: ${updatedAirwallexCount}
          New AkemisFlow contractors: ${newAkemisCount}
          Existing AkemisFlow contractors: ${existingAkemisCount}
          Errors: ${errorCount}`)
      } else {
        const error = await syncResponse.json()
        if (syncResponse.status === 503 && error.error?.includes('environment variables')) {
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

  // Filter and sort contacts
  const filteredAndSortedContacts = React.useMemo(() => {
    let filtered = combinedContacts
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = combinedContacts.filter(contact => {
        // Search in account name, name, email, and company
        const searchableText = [
          contact.accountName,
          contact.name,
          contact.email,
          contact.company,
          contact.contractor?.firstName,
          contact.contractor?.lastName,
          contact.airwallex?.firstName,
          contact.airwallex?.lastName
        ].filter(Boolean).join(' ').toLowerCase()
        
        return searchableText.includes(query)
      })
    }
    
    // Apply sorting
    return filtered.sort((a, b) => {
      let aValue: any = a[sortField] || ''
      let bValue: any = b[sortField] || ''
      
      const comparison = aValue.toString().localeCompare(bValue.toString(), undefined, { numeric: true })
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [combinedContacts, sortField, sortDirection, searchQuery])

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

  // Sync individual contact: AW -> AK (Airwallex to AkemisFlow)
  const handleSyncAirwallexToAkemis = async (contact: CombinedContact) => {
    if (!contact.hasAirwallex || !contact.airwallex) {
      alert('No Airwallex data available to sync')
      return
    }

    const contactId = contact.id
    setSyncingContacts(prev => new Set(prev).add(contactId))

    try {
      if (contact.hasContractor) {
        // Update existing AkemisFlow contractor
        const response = await fetch(`/api/contractors/${contact.contractor!.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            firstName: contact.airwallex.firstName,
            lastName: contact.airwallex.lastName,
            email: contact.airwallex.email,
            phone: contact.airwallex.phone,
            company: contact.airwallex.company,
            bankAccountName: contact.airwallex.bankAccountName,
            bankAccountNumber: contact.airwallex.bankAccountNumber,
            bankName: contact.airwallex.bankName,
            bankAccountCurrency: contact.airwallex.currency,
            swiftCode: contact.airwallex.swiftCode,
            iban: contact.airwallex.iban,
            address: contact.airwallex.address,
            city: contact.airwallex.city,
            addressState: contact.airwallex.state,
            postalCode: contact.airwallex.postalCode,
            addressCountryCode: contact.airwallex.countryCode,
            airwallexContactId: contact.airwallex.beneficiaryId
          })
        })

        if (!response.ok) {
          throw new Error('Failed to update AkemisFlow contractor')
        }
        alert('✅ AkemisFlow contractor updated from Airwallex data')
      } else {
        // Create new AkemisFlow contractor
        const response = await fetch('/api/contractors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            firstName: contact.airwallex.firstName,
            lastName: contact.airwallex.lastName,
            email: contact.airwallex.email,
            phone: contact.airwallex.phone,
            company: contact.airwallex.company,
            bankAccountName: contact.airwallex.bankAccountName,
            bankAccountNumber: contact.airwallex.bankAccountNumber,
            bankName: contact.airwallex.bankName,
            bankAccountCurrency: contact.airwallex.currency,
            swiftCode: contact.airwallex.swiftCode,
            iban: contact.airwallex.iban,
            address: contact.airwallex.address,
            city: contact.airwallex.city,
            addressState: contact.airwallex.state,
            postalCode: contact.airwallex.postalCode,
            addressCountryCode: contact.airwallex.countryCode,
            airwallexContactId: contact.airwallex.beneficiaryId,
            status: 'active',
            isActive: true
          })
        })

        if (!response.ok) {
          throw new Error('Failed to create AkemisFlow contractor')
        }
        alert('✅ New AkemisFlow contractor created from Airwallex data')
      }

      // Refresh data
      await Promise.all([fetchContractors(), fetchAirwallexContacts()])
    } catch (error) {
      console.error('Sync error:', error)
      alert('❌ Sync failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setSyncingContacts(prev => {
        const newSet = new Set(prev)
        newSet.delete(contactId)
        return newSet
      })
    }
  }

  // Sync individual contact: AK -> AW (AkemisFlow to Airwallex)
  const handleSyncAkemisToAirwallex = async (contact: CombinedContact) => {
    if (!contact.hasContractor || !contact.contractor) {
      alert('No AkemisFlow data available to sync')
      return
    }

    const contactId = contact.id
    setSyncingContacts(prev => new Set(prev).add(contactId))

    try {
      // This would require Airwallex API integration
      // For now, we'll show a placeholder message
      alert('🚧 Airwallex API integration needed for creating/updating contacts in Airwallex')
      
      // Future implementation would look like:
      /*
      const response = await fetch('/api/airwallex-contractors/create-or-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: contact.contractor.firstName,
          lastName: contact.contractor.lastName,
          email: contact.contractor.email,
          phone: contact.contractor.phone,
          company: contact.contractor.company,
          bankAccountName: contact.contractor.bankAccountName,
          bankAccountNumber: contact.contractor.bankAccountNumber,
          bankName: contact.contractor.bankName,
          currency: contact.contractor.bankAccountCurrency,
          swiftCode: contact.contractor.swiftCode,
          iban: contact.contractor.iban,
          // ... other fields
        })
      })
      */

    } catch (error) {
      console.error('Sync error:', error)
      alert('❌ Sync failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setSyncingContacts(prev => {
        const newSet = new Set(prev)
        newSet.delete(contactId)
        return newSet
      })
    }
  }

  // Handle deletion of AkemisFlow contractor
  const handleDeleteAkemisContractor = async (contractorId: string) => {
    if (!confirm('Are you sure you want to delete this contractor from AkemisFlow? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/contractors/${contractorId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete contractor')
      }

      // Refresh the contractor list
      await fetchContractors()
      await fetchCombinedData()
      
      alert('✅ Contractor deleted successfully')
    } catch (error) {
      console.error('Delete error:', error)
      alert('❌ Delete failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  // Handle deletion of Airwallex contact
  const handleDeleteAirwallexContact = async (airwallexId: string) => {
    if (!confirm('⚠️ WARNING: This will delete the Airwallex contact from your local database.\n\nAre you sure you want to continue?')) {
      return
    }

    try {
      const response = await fetch(`/api/airwallex-contractors/${airwallexId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete Airwallex contact')
      }

      // Refresh the lists
      await fetchAirwallexContacts()
      await fetchCombinedData()
      
      alert('✅ Airwallex contact deleted successfully')
    } catch (error) {
      console.error('Delete error:', error)
      alert('❌ Delete failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  // Toggle row expansion
  const toggleRowExpansion = (contactId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(contactId)) {
      newExpanded.delete(contactId)
    } else {
      newExpanded.add(contactId)
    }
    setExpandedRows(newExpanded)
  }

  // Edit mode functions
  const toggleEditMode = (contractorId: string, contractor: Contractor) => {
    const newEditing = new Set(editingContractors)
    if (newEditing.has(contractorId)) {
      // Exit edit mode without saving
      newEditing.delete(contractorId)
      setEditingData(prev => {
        const newData = { ...prev }
        delete newData[contractorId]
        return newData
      })
      // Clean up document lines
      setDocumentLines(prev => {
        const newData = { ...prev }
        delete newData[contractorId]
        return newData
      })
    } else {
      // Enter edit mode
      newEditing.add(contractorId)
      setEditingData(prev => ({
        ...prev,
        [contractorId]: { ...contractor }
      }))
      
      // Initialize document lines with existing contractor data
      const initialDocumentLines: DocumentLine[] = []
      
      // Add existing documents from contractor
      if (contractor.proofOfAddressUrl) {
        initialDocumentLines.push({
          id: 'proof-of-address',
          category: 'Address',
          document: {
            url: contractor.proofOfAddressUrl,
            name: contractor.proofOfAddressName || 'Proof of Address',
            type: contractor.proofOfAddressType || 'application/pdf',
            size: contractor.proofOfAddressSize || 0
          }
        })
      }
      
      if (contractor.idDocumentUrl) {
        initialDocumentLines.push({
          id: 'id-document',
          category: 'Identity',
          document: {
            url: contractor.idDocumentUrl,
            name: contractor.idDocumentName || 'ID Document',
            type: contractor.idDocumentType || 'application/pdf',
            size: contractor.idDocumentSize || 0
          }
        })
      }
      
      // Add one empty line if no documents exist, or if in edit mode
      if (initialDocumentLines.length === 0) {
        initialDocumentLines.push({
          id: `empty-${Date.now()}`,
          category: 'Identity'
        })
      }
      
      setDocumentLines(prev => ({
        ...prev,
        [contractorId]: initialDocumentLines
      }))
    }
    setEditingContractors(newEditing)
  }

  const updateEditingData = (contractorId: string, field: string, value: string) => {
    setEditingData(prev => ({
      ...prev,
      [contractorId]: {
        ...prev[contractorId],
        [field]: value
      }
    }))
  }

  const saveContractorData = async (contractorId: string) => {
    try {
      const rawData = editingData[contractorId]
      if (!rawData) return

      // Get the original contractor data to preserve required fields
      const contact = filteredAndSortedContacts.find(c => c.contractor?.id === contractorId)
      const originalContractor = contact?.contractor
      if (!originalContractor) return

      // Prepare data with required fields preserved - ensure they always have valid values
      const dataToSave: Partial<Contractor> = {}
      
      // Always include required fields - use new values or fallback to original
      dataToSave.firstName = originalContractor.firstName
      dataToSave.lastName = originalContractor.lastName  
      dataToSave.email = originalContractor.email
      
      // Override with new values only if they are valid (not empty, not placeholders)
      if (rawData.firstName && rawData.firstName.trim() !== '' && 
          !rawData.firstName.toLowerCase().includes('first name') &&
          !rawData.firstName.toLowerCase().includes('placeholder')) {
        dataToSave.firstName = rawData.firstName.trim()
      }
      
      if (rawData.lastName && rawData.lastName.trim() !== '' && 
          !rawData.lastName.toLowerCase().includes('last name') &&
          !rawData.lastName.toLowerCase().includes('placeholder')) {
        dataToSave.lastName = rawData.lastName.trim()
      }
      
      if (rawData.email && rawData.email.trim() !== '' && 
          !rawData.email.toLowerCase().includes('email') &&
          !rawData.email.toLowerCase().includes('placeholder') &&
          rawData.email.includes('@')) {
        dataToSave.email = rawData.email.trim()
      }
      
      // Add other fields only if they have valid values
      Object.entries(rawData).forEach(([key, value]) => {
        if (key !== 'firstName' && key !== 'lastName' && key !== 'email' && 
            value && 
            value !== '' && 
            !value.toString().toLowerCase().includes('placeholder') &&
            !value.toString().toLowerCase().includes('first name') &&
            !value.toString().toLowerCase().includes('last name') &&
            !value.toString().toLowerCase().includes('email') &&
            !value.toString().toLowerCase().includes('phone') &&
            !value.toString().toLowerCase().includes('company') &&
            !value.toString().toLowerCase().includes('swift') &&
            !value.toString().toLowerCase().includes('iban') &&
            !value.toString().toLowerCase().includes('currency') &&
            !value.toString().toLowerCase().includes('bank name') &&
            !value.toString().toLowerCase().includes('account number')
        ) {
          (dataToSave as any)[key] = value
        }
      })

      const response = await fetch(`/api/contractors/${contractorId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(dataToSave)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save contractor')
      }

      // Exit edit mode
      const newEditing = new Set(editingContractors)
      newEditing.delete(contractorId)
      setEditingContractors(newEditing)
      
      // Clear editing data
      setEditingData(prev => {
        const newData = { ...prev }
        delete newData[contractorId]
        return newData
      })

      // Refresh data
      await fetchContractors()
      
      console.log('✅ Contractor saved successfully!')
      
    } catch (error) {
      console.error('Save error:', error)
      console.error(`❌ Failed to save contractor: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Document management handlers
  const handleDocumentUpload = async (contractorId: string, documentType: string, file: File) => {
    const uploadKey = `${contractorId}-${documentType}`
    
    try {
      console.log(`Uploading ${documentType} for contractor ${contractorId}:`, file.name)
      
      // Set loading state
      setUploadingDocuments(prev => new Set(prev).add(uploadKey))
      
      // Create FormData for file upload
      const formData = new FormData()
      formData.append('file', file)
      formData.append('documentType', documentType)
      
      // Upload document with detailed logging
      console.log(`📤 Uploading document: ${file.name} (${file.type}, ${file.size} bytes) to contractor ${contractorId} as type "${documentType}"`)
      
      const response = await fetch(`/api/contractors/${contractorId}/documents`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      })
      
      console.log(`📊 API Response Status: ${response.status} ${response.statusText}`)
      console.log(`📊 API Response Headers:`, Object.fromEntries(response.headers.entries()))
      
      if (!response.ok) {
        let errorDetails
        try {
          errorDetails = await response.json()
        } catch (parseError) {
          console.error('❌ Failed to parse error response as JSON:', parseError)
          const textResponse = await response.text()
          console.error('❌ Raw error response:', textResponse)
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        console.error('❌ API Error Response:', errorDetails)
        throw new Error(errorDetails.error || `HTTP ${response.status}: Failed to upload document`)
      }
      
      const result = await response.json()
      console.log('✅ Document uploaded successfully:', result)
      
      // Update the document line with the uploaded file info
      // Find the line that matches the document type being uploaded
      const updatedLines = documentLines[contractorId]?.map(line => {
        // Match by category name
        if (line.category.toLowerCase() === documentType.toLowerCase()) {
          return {
            ...line,
            document: {
              url: result.url || result.documentUrl || result.fileUrl,
              name: file.name,
              type: file.type,
              size: file.size
            }
          }
        }
        return line
      }) || []
      
      setDocumentLines(prev => ({
        ...prev,
        [contractorId]: updatedLines
      }))
      
      // Refresh contractor data to show updated document
      await fetchContractors()
      
      // Log success (no popup notification)
      console.log(`✅ ${file.name} uploaded successfully!`)
      
    } catch (error) {
      console.error('Document upload error:', error)
      // Log error without popup notification
      console.error(`❌ Failed to upload document: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      // Clear loading state
      setUploadingDocuments(prev => {
        const newSet = new Set(prev)
        newSet.delete(uploadKey)
        return newSet
      })
    }
  }

  // File input handling
  const handleFileInputChange = async (event: React.ChangeEvent<HTMLInputElement>, contractorId: string, lineId: string) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Get the document line to find the category
    const lines = documentLines[contractorId] || []
    const line = lines.find(l => l.id === lineId)
    if (!line) return

    // Immediately update the UI to show the file name while uploading
    const updatedLines = lines.map(l => 
      l.id === lineId 
        ? {
            ...l,
            document: {
              url: '',
              name: file.name,
              type: file.type,
              size: file.size
            }
          }
        : l
    )
    
    setDocumentLines(prev => ({
      ...prev,
      [contractorId]: updatedLines
    }))

    // Upload the document
    await handleDocumentUpload(contractorId, line.category.toLowerCase(), file)
    
    // Clear the input
    event.target.value = ''
  }

  const triggerFileUpload = (contractorId: string, lineId: string) => {
    const inputId = `file-input-${contractorId}-${lineId}`
    const input = document.getElementById(inputId) as HTMLInputElement
    if (input) {
      input.click()
    }
  }

  const handleDocumentView = (url: string) => {
    if (url) {
      window.open(url, '_blank')
    }
  }

  const handleDocumentDelete = async (contractorId: string, documentType: string) => {
    try {
      if (confirm('Are you sure you want to delete this document?')) {
        console.log(`Deleting ${documentType} for contractor ${contractorId}`)
        // TODO: Implement actual document deletion
        alert(`Document deletion would proceed for ${documentType}`)
      }
    } catch (error) {
      console.error('Document deletion error:', error)
      alert('Failed to delete document')
    }
  }

  // Document line management functions
  const getDocumentLines = (contractorId: string): DocumentLine[] => {
    const lines = documentLines[contractorId]
    
    // If in edit mode, return the state lines (which are initialized when entering edit mode)
    if (editingContractors.has(contractorId)) {
      return lines || []
    }
    
    // In read mode, build lines from contractor data
    const contact = filteredAndSortedContacts.find(c => c.contractor.id === contractorId)
    if (!contact) return []
    
    const contractor = contact.contractor
    const readModeLines: DocumentLine[] = []
    
    // Add existing documents
    if (contractor.proofOfAddressUrl) {
      readModeLines.push({
        id: 'proofOfAddress',
        category: 'Address',
        document: {
          url: contractor.proofOfAddressUrl,
          name: contractor.proofOfAddressName,
          type: contractor.proofOfAddressType,
          size: contractor.proofOfAddressSize
        }
      })
    }
    
    if (contractor.idDocumentUrl) {
      readModeLines.push({
        id: 'idDocument',
        category: 'Identity',
        document: {
          url: contractor.idDocumentUrl,
          name: contractor.idDocumentName,
          type: contractor.idDocumentType,
          size: contractor.idDocumentSize
        }
      })
    }
    
    // In read mode, if no documents exist, show one blank line
    if (readModeLines.length === 0) {
      readModeLines.push({
        id: 'read-mode-blank',
        category: 'Documents'
      })
    }
    
    return readModeLines
  }

  const addDocumentLine = (contractorId: string) => {
    setDocumentLines(prev => ({
      ...prev,
      [contractorId]: [
        ...(prev[contractorId] || []),
        {
          id: `new-${Date.now()}`,
          category: 'Identity'
        }
      ]
    }))
  }

  const removeDocumentLine = (contractorId: string, lineId: string) => {
    setDocumentLines(prev => ({
      ...prev,
      [contractorId]: (prev[contractorId] || []).filter(line => line.id !== lineId)
    }))
  }

  const updateDocumentLineCategory = (contractorId: string, lineId: string, category: string) => {
    setDocumentLines(prev => ({
      ...prev,
      [contractorId]: (prev[contractorId] || []).map(line => 
        line.id === lineId ? { ...line, category } : line
      )
    }))
  }

  // Format field value for display
  const formatFieldValue = (contact: CombinedContact, fieldKey: string) => {
    switch (fieldKey) {
      case 'accountName':
        return contact.accountName
      case 'email':
        return contact.email
      case 'phone':
        return contact.phone || '-'
      case 'company':
        return contact.company || '-'
      case 'country':
        return contact.country || '-'
      case 'indicators':
        const isContactSyncing = syncingContacts.has(contact.id)
        return (
          <div className="flex items-center space-x-1">
            {contact.hasContractor && (
              <Badge variant="default" className="bg-blue-100 text-blue-800 text-xs">
                <Database className="w-3 h-3 mr-1" />
                AK
              </Badge>
            )}
            
            {/* Sync Buttons */}
            <div className="flex items-center space-x-1">
              {/* AW -> AK Button */}
              {contact.hasAirwallex && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 hover:bg-blue-100"
                  onClick={() => handleSyncAirwallexToAkemis(contact)}
                  disabled={isContactSyncing}
                  title={contact.hasContractor ? "Update AkemisFlow from Airwallex" : "Create AkemisFlow from Airwallex"}
                >
                  {isContactSyncing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowLeft className="w-4 h-4 text-blue-600" />
                  )}
                </Button>
              )}
              
              {/* AK -> AW Button */}
              {contact.hasContractor && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 hover:bg-orange-100"
                  onClick={() => handleSyncAkemisToAirwallex(contact)}
                  disabled={isContactSyncing}
                  title={contact.hasAirwallex ? "Update Airwallex from AkemisFlow" : "Create Airwallex from AkemisFlow"}
                >
                  {isContactSyncing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4 text-orange-600" />
                  )}
                </Button>
              )}
            </div>

            {contact.hasAirwallex && (
              <Badge variant="outline" className="bg-orange-100 text-orange-800 text-xs">
                <ExternalLink className="w-3 h-3 mr-1" />
                AW
              </Badge>
            )}
          </div>
        )
      case 'actions':
        return (
          <div className="flex items-center space-x-1">
            {/* View Details Button */}
            {contact.hasContractor && (
              <Link href={`/entities/contractors/${contact.contractor.id}`}>
                <Button size="sm" variant="outline" className="h-8 px-3">
                  <Eye className="w-4 h-4 mr-1" />
                  View
                </Button>
              </Link>
            )}
            
            {/* Delete Akemis Contractor Button */}
            {contact.hasContractor && (
              <Button 
                size="sm" 
                variant="outline" 
                className="h-8 w-8 p-0 hover:bg-red-50"
                onClick={() => handleDeleteAkemisContractor(contact.contractor.id)}
                title="Delete from AkemisFlow"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </Button>
            )}
            
            {/* Delete Airwallex Contact Button */}
            {contact.hasAirwallex && (
              <Button 
                size="sm" 
                variant="outline" 
                className="h-8 w-8 p-0 hover:bg-orange-50"
                onClick={() => handleDeleteAirwallexContact(contact.airwallex.id)}
                title="Delete from Airwallex"
              >
                <X className="w-4 h-4 text-orange-600" />
              </Button>
            )}
          </div>
        )
      case 'bankAccountCurrency':
        return contact.contractor?.bankAccountCurrency || contact.airwallex?.currency || '-'
      case 'swiftCode':
        return contact.contractor?.swiftCode || contact.airwallex?.swiftCode || '-'
      case 'createdAt':
        if (contact.createdAt) {
          return new Date(contact.createdAt).toLocaleDateString()
        }
        return '-'
      case 'updatedAt':
        if (contact.updatedAt) {
          return new Date(contact.updatedAt).toLocaleDateString()
        }
        return '-'
      case 'lastSynced':
        if (contact.airwallex?.lastFetchedAt) {
          return new Date(contact.airwallex.lastFetchedAt).toLocaleDateString()
        }
        return '-'
      default:
        return '-'
    }
  }

  // Render table header
  const renderTableHeader = () => (
    <div className="grid grid-cols-[30px_1fr] gap-2 p-2 bg-gray-50 border-b font-medium text-sm">
      <div></div> {/* Expand button column */}
      <div className="grid gap-2" style={{ gridTemplateColumns: visibleFields.map(f => `${ALL_FIELDS[f]?.width || 120}px`).join(' ') }}>
        {visibleFields.map(fieldKey => {
          const field = ALL_FIELDS[fieldKey]
          if (!field) return null
          
          const isSortable = ['accountName', 'email', 'company', 'country'].includes(fieldKey)
          
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

  // Render contact row
  const renderContactRow = (contact: CombinedContact, index: number) => {
    const isExpanded = expandedRows.has(contact.id)
    const isEven = index % 2 === 0

    return (
      <div key={contact.id} className="border-b">
        {/* Main row */}
        <div className={`grid grid-cols-[30px_1fr] gap-2 p-2 hover:bg-blue-50 ${isEven ? 'bg-gray-50' : 'bg-white'}`}>
          {/* Expand button */}
          <button
            onClick={() => toggleRowExpansion(contact.id)}
            className="flex items-center justify-center w-6 h-6 rounded hover:bg-gray-200"
          >
            <ChevronRight className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          </button>
          
          {/* Data columns */}
          <div className="grid gap-2" style={{ gridTemplateColumns: visibleFields.map(f => `${ALL_FIELDS[f]?.width || 120}px`).join(' ') }}>
            {visibleFields.map(fieldKey => (
              <div key={fieldKey} className="text-sm truncate">
                {formatFieldValue(contact, fieldKey)}
              </div>
            ))}
          </div>
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div className="p-6 bg-gray-50 border-t overflow-hidden">
            {/* Column Headers */}
            <div className="flex items-center justify-between mb-6">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="w-32"></th>
                    <th className="text-left px-4">
                      <div className="flex items-center space-x-2">
                        <Database className="w-5 h-5 text-blue-600" />
                        <h3 className="text-lg font-semibold">AkemisFlow Contractor</h3>
                      </div>
                    </th>
                    {contact.hasAirwallex && (
                      <th className="text-left px-4">
                        <div className="flex items-center space-x-2">
                          <ExternalLink className="w-5 h-5 text-orange-600" />
                          <h3 className="text-lg font-semibold text-orange-600">Airwallex Contact</h3>
                        </div>
                      </th>
                    )}
                  </tr>
                </thead>
              </table>
              {contact.hasContractor && contact.contractor && (
                <Button
                  size="sm"
                  variant={editingContractors.has(contact.contractor.id) ? "default" : "outline"}
                  onClick={() => {
                    if (editingContractors.has(contact.contractor.id)) {
                      saveContractorData(contact.contractor.id)
                    } else {
                      toggleEditMode(contact.contractor.id, contact.contractor)
                    }
                  }}
                >
                  {editingContractors.has(contact.contractor.id) ? (
                    <>
                      <Save className="w-4 h-4 mr-1" />
                      Save
                    </>
                  ) : (
                    <>
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Table format layout */}
            <div className="w-full space-y-6">
              {/* Comments Section */}
              {contact.hasContractor && contact.contractor && (
                <div>
                  <div className="flex items-center gap-2 mb-3 border-b pb-2">
                    <MessageSquare className="w-4 h-4 text-blue-700" />
                    <h4 className="text-md font-semibold text-blue-700">Comments</h4>
                  </div>
                  
                  <table className="w-full text-sm">
                    <tbody>
                      <tr>
                        <td className="py-1 px-4">
                          {editingContractors.has(contact.contractor.id) ? (
                            <textarea
                              className="w-full text-xs p-2 border rounded resize-y min-h-[24px] max-h-[120px]"
                              value={editingData[contact.contractor.id]?.comments || ''}
                              onChange={(e) => updateEditingData(contact.contractor.id, 'comments', e.target.value)}
                              placeholder="Add comments about this contractor..."
                              style={{
                                height: 'auto',
                                minHeight: '24px'
                              }}
                              onInput={(e) => {
                                const target = e.target as HTMLTextAreaElement;
                                target.style.height = 'auto';
                                target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                              }}
                            />
                          ) : (
                            <div className="whitespace-pre-wrap text-sm">
                              {contact.contractor.comments || '-'}
                            </div>
                          )}
                        </td>
                        {contact.hasAirwallex && (
                          <td className="py-1 px-4">
                            <span className="text-gray-400">-</span>
                          </td>
                        )}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Personal Information Section */}
              <div>
                <div className="flex items-center gap-2 mb-3 border-b pb-2">
                  <Users className="w-4 h-4 text-blue-700" />
                  <h4 className="text-md font-semibold text-blue-700">Personal Information</h4>
                </div>
                
                <table className="w-full text-sm">
                  <tbody>
                    {/* Account Name */}
                    <tr>
                      <td className="py-1 font-semibold text-gray-600 w-32">Account Name:</td>
                      <td className="py-1 px-4">
                        {contact.hasContractor && contact.contractor ? (
                          editingContractors.has(contact.contractor.id) ? (
                            <Input
                              size="sm"
                              value={editingData[contact.contractor.id]?.bankAccountName || ''}
                              onChange={(e) => updateEditingData(contact.contractor.id, 'bankAccountName', e.target.value)}
                              className="h-6 text-xs"
                              placeholder="Bank account name"
                            />
                          ) : (
                            <span>{contact.contractor.bankAccountName || `${contact.contractor.firstName} ${contact.contractor.lastName}`}</span>
                          )
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-1 px-4">
                        {contact.hasAirwallex && contact.airwallex ? (
                          <span>{contact.airwallex.bankAccountName || '-'}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                    
                    {/* First Name */}
                    <tr>
                      <td className="py-1 font-semibold text-gray-600 w-32">First Name:</td>
                      <td className="py-1 px-4">
                        {contact.hasContractor && contact.contractor ? (
                          editingContractors.has(contact.contractor.id) ? (
                            <Input
                              size="sm"
                              value={editingData[contact.contractor.id]?.firstName || ''}
                              onChange={(e) => updateEditingData(contact.contractor.id, 'firstName', e.target.value)}
                              className="h-6 text-xs"
                              placeholder="First name"
                            />
                          ) : (
                            <span>{contact.contractor.firstName}</span>
                          )
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-1 px-4">
                        {contact.hasAirwallex && contact.airwallex ? (
                          <span>{contact.airwallex.firstName}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                    
                    {/* Last Name */}
                    <tr>
                      <td className="py-1 font-semibold text-gray-600 w-32">Last Name:</td>
                      <td className="py-1 px-4">
                        {contact.hasContractor && contact.contractor ? (
                          editingContractors.has(contact.contractor.id) ? (
                            <Input
                              size="sm"
                              value={editingData[contact.contractor.id]?.lastName || ''}
                              onChange={(e) => updateEditingData(contact.contractor.id, 'lastName', e.target.value)}
                              className="h-6 text-xs"
                              placeholder="Last name"
                            />
                          ) : (
                            <span>{contact.contractor.lastName}</span>
                          )
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-1 px-4">
                        {contact.hasAirwallex && contact.airwallex ? (
                          <span>{contact.airwallex.lastName}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                    
                    {/* Email */}
                    <tr>
                      <td className="py-1 font-semibold text-gray-600 w-32">Email:</td>
                      <td className="py-1 px-4">
                        {contact.hasContractor && contact.contractor ? (
                          editingContractors.has(contact.contractor.id) ? (
                            <Input
                              size="sm"
                              type="email"
                              value={editingData[contact.contractor.id]?.email || ''}
                              onChange={(e) => updateEditingData(contact.contractor.id, 'email', e.target.value)}
                              className="h-6 text-xs"
                              placeholder="Email address"
                            />
                          ) : (
                            <span>{contact.contractor.email}</span>
                          )
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-1 px-4">
                        {contact.hasAirwallex && contact.airwallex ? (
                          <span>{contact.airwallex.email}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                    
                    {/* Phone */}
                    <tr>
                      <td className="py-1 font-semibold text-gray-600 w-32">Phone:</td>
                      <td className="py-1 px-4">
                        {contact.hasContractor && contact.contractor ? (
                          editingContractors.has(contact.contractor.id) ? (
                            <Input
                              size="sm"
                              value={editingData[contact.contractor.id]?.phone || ''}
                              onChange={(e) => updateEditingData(contact.contractor.id, 'phone', e.target.value)}
                              className="h-6 text-xs"
                              placeholder="Phone number"
                            />
                          ) : (
                            <span>{contact.contractor.phone || '-'}</span>
                          )
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-1 px-4">
                        {contact.hasAirwallex && contact.airwallex ? (
                          <span>{contact.airwallex.phone || '-'}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                    
                    {/* Company */}
                    <tr>
                      <td className="py-1 font-semibold text-gray-600 w-32">Company:</td>
                      <td className="py-1 px-4">
                        {contact.hasContractor && contact.contractor ? (
                          editingContractors.has(contact.contractor.id) ? (
                            <Input
                              size="sm"
                              value={editingData[contact.contractor.id]?.company || ''}
                              onChange={(e) => updateEditingData(contact.contractor.id, 'company', e.target.value)}
                              className="h-6 text-xs"
                              placeholder="Company name"
                            />
                          ) : (
                            <span>{contact.contractor.company || '-'}</span>
                          )
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-1 px-4">
                        {contact.hasAirwallex && contact.airwallex ? (
                          <span>{contact.airwallex.company || '-'}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                    
                    {/* VAT Number */}
                    <tr>
                      <td className="py-1 font-semibold text-gray-600 w-32">VAT Number:</td>
                      <td className="py-1 px-4">
                        {contact.hasContractor && contact.contractor ? (
                          editingContractors.has(contact.contractor.id) ? (
                            <Input
                              size="sm"
                              value={editingData[contact.contractor.id]?.vatNumber || ''}
                              onChange={(e) => updateEditingData(contact.contractor.id, 'vatNumber', e.target.value)}
                              className="h-6 text-xs"
                              placeholder="VAT number"
                            />
                          ) : (
                            <span>{contact.contractor.vatNumber || '-'}</span>
                          )
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-1 px-4">
                        <span className="text-gray-400">-</span>
                      </td>
                    </tr>
                    
                    {/* Birth Date */}
                    <tr>
                      <td className="py-1 font-semibold text-gray-600 w-32">Birth Date:</td>
                      <td className="py-1 px-4">
                        {contact.hasContractor && contact.contractor ? (
                          editingContractors.has(contact.contractor.id) ? (
                            <Input
                              size="sm"
                              type="date"
                              value={editingData[contact.contractor.id]?.birthDate ? new Date(editingData[contact.contractor.id].birthDate!).toISOString().split('T')[0] : ''}
                              onChange={(e) => updateEditingData(contact.contractor.id, 'birthDate', e.target.value ? new Date(e.target.value) : null)}
                              className="h-6 text-xs"
                            />
                          ) : (
                            <span>{contact.contractor.birthDate ? new Date(contact.contractor.birthDate).toLocaleDateString() : '-'}</span>
                          )
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-1 px-4">
                        <span className="text-gray-400">-</span>
                      </td>
                    </tr>
                    
                    {/* Birth Place */}
                    <tr>
                      <td className="py-1 font-semibold text-gray-600 w-32">Birth Place:</td>
                      <td className="py-1 px-4">
                        {contact.hasContractor && contact.contractor ? (
                          editingContractors.has(contact.contractor.id) ? (
                            <Input
                              size="sm"
                              value={editingData[contact.contractor.id]?.birthPlace || ''}
                              onChange={(e) => updateEditingData(contact.contractor.id, 'birthPlace', e.target.value)}
                              className="h-6 text-xs"
                              placeholder="Birth place"
                            />
                          ) : (
                            <span>{contact.contractor.birthPlace || '-'}</span>
                          )
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-1 px-4">
                        <span className="text-gray-400">-</span>
                      </td>
                    </tr>
                    
                    {/* Position */}
                    <tr>
                      <td className="py-1 font-semibold text-gray-600 w-32">Position:</td>
                      <td className="py-1 px-4">
                        {contact.hasContractor && contact.contractor ? (
                          editingContractors.has(contact.contractor.id) ? (
                            <Input
                              size="sm"
                              value={editingData[contact.contractor.id]?.position || ''}
                              onChange={(e) => updateEditingData(contact.contractor.id, 'position', e.target.value)}
                              className="h-6 text-xs"
                              placeholder="Position/Job title"
                            />
                          ) : (
                            <span>{contact.contractor.position || '-'}</span>
                          )
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-1 px-4">
                        <span className="text-gray-400">-</span>
                      </td>
                    </tr>
                    
                    {/* Nationality */}
                    <tr>
                      <td className="py-1 font-semibold text-gray-600 w-32">Nationality:</td>
                      <td className="py-1 px-4">
                        {contact.hasContractor && contact.contractor ? (
                          editingContractors.has(contact.contractor.id) ? (
                            <Input
                              size="sm"
                              value={editingData[contact.contractor.id]?.nationality || ''}
                              onChange={(e) => updateEditingData(contact.contractor.id, 'nationality', e.target.value)}
                              className="h-6 text-xs"
                              placeholder="Nationality"
                            />
                          ) : (
                            <span>{contact.contractor.nationality || '-'}</span>
                          )
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-1 px-4">
                        {contact.hasAirwallex && contact.airwallex ? (
                          <span>{contact.airwallex.personalNationality || '-'}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Address Information Section */}
              <div>
                <div className="flex items-center gap-2 mb-3 border-b pb-2">
                  <MapPin className="w-4 h-4 text-purple-700" />
                  <h4 className="text-md font-semibold text-purple-700">Address Information</h4>
                </div>
                
                <table className="w-full text-sm">
                  <tbody>
                    {/* Address */}
                    <tr>
                      <td className="py-1 font-semibold text-gray-600 w-32">Address:</td>
                      <td className="py-1 px-4">
                        {contact.hasContractor && contact.contractor ? (
                          editingContractors.has(contact.contractor.id) ? (
                            <Input
                              size="sm"
                              value={editingData[contact.contractor.id]?.address || ''}
                              onChange={(e) => updateEditingData(contact.contractor.id, 'address', e.target.value)}
                              className="h-6 text-xs"
                              placeholder="Full address"
                            />
                          ) : (
                            <span>{contact.contractor.address || '-'}</span>
                          )
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-1 px-4">
                        {contact.hasAirwallex && contact.airwallex ? (
                          <span>{contact.airwallex.address || '-'}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                    
                    {/* City */}
                    <tr>
                      <td className="py-1 font-semibold text-gray-600 w-32">City:</td>
                      <td className="py-1 px-4">
                        {contact.hasContractor && contact.contractor ? (
                          editingContractors.has(contact.contractor.id) ? (
                            <Input
                              size="sm"
                              value={editingData[contact.contractor.id]?.city || ''}
                              onChange={(e) => updateEditingData(contact.contractor.id, 'city', e.target.value)}
                              className="h-6 text-xs"
                              placeholder="City"
                            />
                          ) : (
                            <span>{contact.contractor.city || '-'}</span>
                          )
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-1 px-4">
                        {contact.hasAirwallex && contact.airwallex ? (
                          <span>{contact.airwallex.city || '-'}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                    
                    {/* Postal Code */}
                    <tr>
                      <td className="py-1 font-semibold text-gray-600 w-32">Postal Code:</td>
                      <td className="py-1 px-4">
                        {contact.hasContractor && contact.contractor ? (
                          editingContractors.has(contact.contractor.id) ? (
                            <Input
                              size="sm"
                              value={editingData[contact.contractor.id]?.postalCode || ''}
                              onChange={(e) => updateEditingData(contact.contractor.id, 'postalCode', e.target.value)}
                              className="h-6 text-xs"
                              placeholder="Postal code"
                            />
                          ) : (
                            <span>{contact.contractor.postalCode || '-'}</span>
                          )
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-1 px-4">
                        {contact.hasAirwallex && contact.airwallex ? (
                          <span>{contact.airwallex.postalCode || '-'}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                    
                    {/* Country */}
                    <tr>
                      <td className="py-1 font-semibold text-gray-600 w-32">Country:</td>
                      <td className="py-1 px-4">
                        {contact.hasContractor && contact.contractor ? (
                          editingContractors.has(contact.contractor.id) ? (
                            <Input
                              size="sm"
                              value={editingData[contact.contractor.id]?.country || ''}
                              onChange={(e) => updateEditingData(contact.contractor.id, 'country', e.target.value)}
                              className="h-6 text-xs"
                              placeholder="Country"
                            />
                          ) : (
                            <span>{contact.contractor.country || '-'}</span>
                          )
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-1 px-4">
                        {contact.hasAirwallex && contact.airwallex ? (
                          <span>{contact.airwallex.countryCode || '-'}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                    
                    {/* State */}
                    <tr>
                      <td className="py-1 font-semibold text-gray-600 w-32">State/Province:</td>
                      <td className="py-1 px-4">
                        {contact.hasContractor && contact.contractor ? (
                          editingContractors.has(contact.contractor.id) ? (
                            <Input
                              size="sm"
                              value={editingData[contact.contractor.id]?.addressState || ''}
                              onChange={(e) => updateEditingData(contact.contractor.id, 'addressState', e.target.value)}
                              className="h-6 text-xs"
                              placeholder="State/Province"
                            />
                          ) : (
                            <span>{contact.contractor.addressState || '-'}</span>
                          )
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-1 px-4">
                        {contact.hasAirwallex && contact.airwallex ? (
                          <span>{contact.airwallex.state || '-'}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Banking Information Section */}
              <div>
                <div className="flex items-center gap-2 mb-3 border-b pb-2">
                  <CreditCard className="w-4 h-4 text-orange-700" />
                  <h4 className="text-md font-semibold text-orange-700">Banking Information</h4>
                </div>
                
                <table className="w-full text-sm">
                  <tbody>
                    {/* Account Number */}
                    <tr>
                      <td className="py-1 font-semibold text-gray-600 w-32">Account Number:</td>
                      <td className="py-1 px-4">
                        {contact.hasContractor && contact.contractor ? (
                          editingContractors.has(contact.contractor.id) ? (
                            <Input
                              size="sm"
                              value={editingData[contact.contractor.id]?.bankAccountNumber || ''}
                              onChange={(e) => updateEditingData(contact.contractor.id, 'bankAccountNumber', e.target.value)}
                              className="h-6 text-xs"
                              placeholder="Bank account number"
                            />
                          ) : (
                            <span>{contact.contractor.bankAccountNumber || '-'}</span>
                          )
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-1 px-4">
                        {contact.hasAirwallex && contact.airwallex ? (
                          <span>{contact.airwallex.bankAccountNumber || '-'}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                    
                    {/* Currency */}
                    <tr>
                      <td className="py-1 font-semibold text-gray-600 w-32">Currency:</td>
                      <td className="py-1 px-4">
                        {contact.hasContractor && contact.contractor ? (
                          editingContractors.has(contact.contractor.id) ? (
                            <Input
                              size="sm"
                              value={editingData[contact.contractor.id]?.bankAccountCurrency || ''}
                              onChange={(e) => updateEditingData(contact.contractor.id, 'bankAccountCurrency', e.target.value)}
                              className="h-6 text-xs"
                              placeholder="Currency (e.g., EUR, USD)"
                            />
                          ) : (
                            <span>{contact.contractor.bankAccountCurrency || '-'}</span>
                          )
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-1 px-4">
                        {contact.hasAirwallex && contact.airwallex ? (
                          <span>{contact.airwallex.currency || '-'}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                    
                    {/* Bank Name */}
                    <tr>
                      <td className="py-1 font-semibold text-gray-600 w-32">Bank Name:</td>
                      <td className="py-1 px-4">
                        {contact.hasContractor && contact.contractor ? (
                          editingContractors.has(contact.contractor.id) ? (
                            <Input
                              size="sm"
                              value={editingData[contact.contractor.id]?.bankName || ''}
                              onChange={(e) => updateEditingData(contact.contractor.id, 'bankName', e.target.value)}
                              className="h-6 text-xs"
                              placeholder="Bank name"
                            />
                          ) : (
                            <span>{contact.contractor.bankName || '-'}</span>
                          )
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-1 px-4">
                        {contact.hasAirwallex && contact.airwallex ? (
                          <span>{contact.airwallex.bankName || '-'}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                    
                    {/* SWIFT/BIC */}
                    <tr>
                      <td className="py-1 font-semibold text-gray-600 w-32">SWIFT/BIC:</td>
                      <td className="py-1 px-4">
                        {contact.hasContractor && contact.contractor ? (
                          editingContractors.has(contact.contractor.id) ? (
                            <Input
                              size="sm"
                              value={editingData[contact.contractor.id]?.swiftCode || ''}
                              onChange={(e) => updateEditingData(contact.contractor.id, 'swiftCode', e.target.value)}
                              className="h-6 text-xs"
                              placeholder="SWIFT/BIC code"
                            />
                          ) : (
                            <span>{contact.contractor.swiftCode || '-'}</span>
                          )
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-1 px-4">
                        {contact.hasAirwallex && contact.airwallex ? (
                          <span>{contact.airwallex.swiftCode || '-'}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                    
                    {/* IBAN */}
                    <tr>
                      <td className="py-1 font-semibold text-gray-600 w-32">IBAN:</td>
                      <td className="py-1 px-4">
                        {contact.hasContractor && contact.contractor ? (
                          editingContractors.has(contact.contractor.id) ? (
                            <Input
                              size="sm"
                              value={editingData[contact.contractor.id]?.iban || ''}
                              onChange={(e) => updateEditingData(contact.contractor.id, 'iban', e.target.value)}
                              className="h-6 text-xs"
                              placeholder="IBAN"
                            />
                          ) : (
                            <span>{contact.contractor.iban || '-'}</span>
                          )
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-1 px-4">
                        {contact.hasAirwallex && contact.airwallex ? (
                          <span>{contact.airwallex.iban || '-'}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                    
                    {/* Bank Country Code */}
                    <tr>
                      <td className="py-1 font-semibold text-gray-600 w-32">Bank Country:</td>
                      <td className="py-1 px-4">
                        {contact.hasContractor && contact.contractor ? (
                          editingContractors.has(contact.contractor.id) ? (
                            <Input
                              size="sm"
                              value={editingData[contact.contractor.id]?.bankCountryCode || ''}
                              onChange={(e) => updateEditingData(contact.contractor.id, 'bankCountryCode', e.target.value)}
                              className="h-6 text-xs"
                              placeholder="Bank country code"
                            />
                          ) : (
                            <span>{contact.contractor.bankCountryCode || '-'}</span>
                          )
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-1 px-4">
                        {contact.hasAirwallex && contact.airwallex ? (
                          <span>{contact.airwallex.bankCountryCode || '-'}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Airwallex Specific Information */}
              {contact.hasAirwallex && contact.airwallex && (
                <div>
                  <div className="flex items-center gap-2 mb-3 border-b pb-2">
                    <ExternalLink className="w-4 h-4 text-orange-700" />
                    <h4 className="text-md font-semibold text-orange-700">Airwallex Specific</h4>
                  </div>
                  
                  <table className="w-full text-sm">
                    <tbody>
                      {/* Beneficiary ID */}
                      <tr>
                        <td className="py-1 font-semibold text-gray-600 w-32">Beneficiary ID:</td>
                        <td className="py-1 px-4">-</td>
                        <td className="py-1 px-4">
                          <span className="font-mono text-xs">{contact.airwallex.beneficiaryId}</span>
                        </td>
                      </tr>
                      
                      {/* Entity Type */}
                      <tr>
                        <td className="py-1 font-semibold text-gray-600 w-32">Entity Type:</td>
                        <td className="py-1 px-4">-</td>
                        <td className="py-1 px-4">
                          <span>{contact.airwallex.entityType || '-'}</span>
                        </td>
                      </tr>
                      
                      {/* Status */}
                      <tr>
                        <td className="py-1 font-semibold text-gray-600 w-32">Status:</td>
                        <td className="py-1 px-4">-</td>
                        <td className="py-1 px-4">
                          <Badge variant={contact.airwallex.status === 'ACTIVE' ? 'default' : 'secondary'}>
                            {contact.airwallex.status}
                          </Badge>
                        </td>
                      </tr>
                      
                      {/* Payment Methods */}
                      <tr>
                        <td className="py-1 font-semibold text-gray-600 w-32">Payment Methods:</td>
                        <td className="py-1 px-4">-</td>
                        <td className="py-1 px-4">
                          <span className="text-xs">{contact.airwallex.paymentMethods || '-'}</span>
                        </td>
                      </tr>
                      
                      {/* Capabilities */}
                      <tr>
                        <td className="py-1 font-semibold text-gray-600 w-32">Capabilities:</td>
                        <td className="py-1 px-4">-</td>
                        <td className="py-1 px-4">
                          <span className="text-xs">{contact.airwallex.capabilities || '-'}</span>
                        </td>
                      </tr>
                      
                      {/* Local Clearing System */}
                      <tr>
                        <td className="py-1 font-semibold text-gray-600 w-32">Local Clearing:</td>
                        <td className="py-1 px-4">-</td>
                        <td className="py-1 px-4">
                          <span>{contact.airwallex.localClearingSystem || '-'}</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Business Registration (for company entities) */}
              {contact.hasAirwallex && contact.airwallex?.entityType === 'COMPANY' && (
                <div>
                  <div className="flex items-center gap-2 mb-3 border-b pb-2">
                    <Briefcase className="w-4 h-4 text-indigo-700" />
                    <h4 className="text-md font-semibold text-indigo-700">Business Registration</h4>
                  </div>
                  
                  <table className="w-full text-sm">
                    <tbody>
                      {/* Business Registration Number */}
                      <tr>
                        <td className="py-1 font-semibold text-gray-600 w-32">Registration Number:</td>
                        <td className="py-1 px-4">-</td>
                        <td className="py-1 px-4">
                          <span>{contact.airwallex.businessRegistrationNumber || '-'}</span>
                        </td>
                      </tr>
                      
                      {/* Business Registration Type */}
                      <tr>
                        <td className="py-1 font-semibold text-gray-600 w-32">Registration Type:</td>
                        <td className="py-1 px-4">-</td>
                        <td className="py-1 px-4">
                          <span>{contact.airwallex.businessRegistrationType || '-'}</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Legal Representative (for company entities) */}
              {contact.hasAirwallex && contact.airwallex?.entityType === 'COMPANY' && (contact.airwallex.legalRepFirstName || contact.airwallex.legalRepLastName) && (
                <div>
                  <div className="flex items-center gap-2 mb-3 border-b pb-2">
                    <UserCheck className="w-4 h-4 text-red-700" />
                    <h4 className="text-md font-semibold text-red-700">Legal Representative</h4>
                  </div>
                  
                  <table className="w-full text-sm">
                    <tbody>
                      {/* Legal Rep Name */}
                      <tr>
                        <td className="py-1 font-semibold text-gray-600 w-32">Name:</td>
                        <td className="py-1 px-4">-</td>
                        <td className="py-1 px-4">
                          <span>{`${contact.airwallex.legalRepFirstName || ''} ${contact.airwallex.legalRepLastName || ''}`.trim()}</span>
                        </td>
                      </tr>
                      
                      {/* Legal Rep Email */}
                      <tr>
                        <td className="py-1 font-semibold text-gray-600 w-32">Email:</td>
                        <td className="py-1 px-4">-</td>
                        <td className="py-1 px-4">
                          <span>{contact.airwallex.legalRepEmail || '-'}</span>
                        </td>
                      </tr>
                      
                      {/* Legal Rep Mobile */}
                      <tr>
                        <td className="py-1 font-semibold text-gray-600 w-32">Mobile:</td>
                        <td className="py-1 px-4">-</td>
                        <td className="py-1 px-4">
                          <span>{contact.airwallex.legalRepMobileNumber || '-'}</span>
                        </td>
                      </tr>
                      
                      {/* Legal Rep Address */}
                      <tr>
                        <td className="py-1 font-semibold text-gray-600 w-32">Address:</td>
                        <td className="py-1 px-4">-</td>
                        <td className="py-1 px-4">
                          <span className="text-xs">
                            {[
                              contact.airwallex.legalRepAddress,
                              contact.airwallex.legalRepCity,
                              contact.airwallex.legalRepState,
                              contact.airwallex.legalRepPostalCode,
                              contact.airwallex.legalRepCountryCode
                            ].filter(Boolean).join(', ') || '-'}
                          </span>
                        </td>
                      </tr>
                      
                      {/* Legal Rep Nationality */}
                      <tr>
                        <td className="py-1 font-semibold text-gray-600 w-32">Nationality:</td>
                        <td className="py-1 px-4">-</td>
                        <td className="py-1 px-4">
                          <span>{contact.airwallex.legalRepNationality || '-'}</span>
                        </td>
                      </tr>
                      
                      {/* Legal Rep Occupation */}
                      <tr>
                        <td className="py-1 font-semibold text-gray-600 w-32">Occupation:</td>
                        <td className="py-1 px-4">-</td>
                        <td className="py-1 px-4">
                          <span>{contact.airwallex.legalRepOccupation || '-'}</span>
                        </td>
                      </tr>
                      
                      {/* Legal Rep ID Type */}
                      <tr>
                        <td className="py-1 font-semibold text-gray-600 w-32">ID Type:</td>
                        <td className="py-1 px-4">-</td>
                        <td className="py-1 px-4">
                          <span>{contact.airwallex.legalRepIdType || '-'}</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Personal Details (for individual entities) */}
              {contact.hasAirwallex && contact.airwallex?.entityType === 'INDIVIDUAL' && (
                <div>
                  <div className="flex items-center gap-2 mb-3 border-b pb-2">
                    <User className="w-4 h-4 text-teal-700" />
                    <h4 className="text-md font-semibold text-teal-700">Personal Details</h4>
                  </div>
                  
                  <table className="w-full text-sm">
                    <tbody>
                      {/* Personal Email */}
                      <tr>
                        <td className="py-1 font-semibold text-gray-600 w-32">Personal Email:</td>
                        <td className="py-1 px-4">-</td>
                        <td className="py-1 px-4">
                          <span>{contact.airwallex.personalEmail || '-'}</span>
                        </td>
                      </tr>
                      
                      {/* Personal ID Number */}
                      <tr>
                        <td className="py-1 font-semibold text-gray-600 w-32">ID Number:</td>
                        <td className="py-1 px-4">-</td>
                        <td className="py-1 px-4">
                          <span>{contact.airwallex.personalIdNumber || '-'}</span>
                        </td>
                      </tr>
                      
                      {/* Personal Occupation */}
                      <tr>
                        <td className="py-1 font-semibold text-gray-600 w-32">Occupation:</td>
                        <td className="py-1 px-4">-</td>
                        <td className="py-1 px-4">
                          <span>{contact.airwallex.personalOccupation || '-'}</span>
                        </td>
                      </tr>
                      
                      {/* Chinese Names */}
                      {(contact.airwallex.personalFirstNameChinese || contact.airwallex.personalLastNameChinese) && (
                        <tr>
                          <td className="py-1 font-semibold text-gray-600 w-32">Chinese Name:</td>
                          <td className="py-1 px-4">-</td>
                          <td className="py-1 px-4">
                            <span>{`${contact.airwallex.personalFirstNameChinese || ''} ${contact.airwallex.personalLastNameChinese || ''}`.trim()}</span>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Metadata Section */}
              <div>
                <div className="flex items-center gap-2 mb-3 border-b pb-2">
                  <Clock className="w-4 h-4 text-gray-700" />
                  <h4 className="text-md font-semibold text-gray-700">Metadata</h4>
                </div>
                
                <table className="w-full text-sm">
                  <tbody>
                    {/* Status */}
                    <tr>
                      <td className="py-1 font-semibold text-gray-600 w-32">Status:</td>
                      <td className="py-1 px-4">
                        {contact.hasContractor && contact.contractor ? (
                          <Badge variant={contact.contractor.status === 'ACTIVE' ? 'default' : 'secondary'}>
                            {contact.contractor.status}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-1 px-4">
                        {contact.hasAirwallex && contact.airwallex ? (
                          <Badge variant={contact.airwallex.status === 'ACTIVE' ? 'default' : 'secondary'}>
                            {contact.airwallex.status}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                    
                    {/* Active Status */}
                    <tr>
                      <td className="py-1 font-semibold text-gray-600 w-32">Is Active:</td>
                      <td className="py-1 px-4">
                        {contact.hasContractor && contact.contractor ? (
                          <Badge variant={contact.contractor.isActive ? 'default' : 'secondary'}>
                            {contact.contractor.isActive ? 'Yes' : 'No'}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-1 px-4">-</td>
                    </tr>
                    
                    {/* Preferred Currency */}
                    <tr>
                      <td className="py-1 font-semibold text-gray-600 w-32">Preferred Currency:</td>
                      <td className="py-1 px-4">
                        {contact.hasContractor && contact.contractor ? (
                          editingContractors.has(contact.contractor.id) ? (
                            <Input
                              size="sm"
                              value={editingData[contact.contractor.id]?.preferredCurrency || ''}
                              onChange={(e) => updateEditingData(contact.contractor.id, 'preferredCurrency', e.target.value)}
                              className="h-6 text-xs"
                              placeholder="EUR, USD, etc."
                            />
                          ) : (
                            <span>{contact.contractor.preferredCurrency || '-'}</span>
                          )
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-1 px-4">-</td>
                    </tr>
                    
                    {/* Created At */}
                    <tr>
                      <td className="py-1 font-semibold text-gray-600 w-32">Created:</td>
                      <td className="py-1 px-4">
                        {contact.hasContractor && contact.contractor ? (
                          <span className="text-xs">{new Date(contact.contractor.createdAt).toLocaleDateString()}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-1 px-4">
                        {contact.hasAirwallex && contact.airwallex ? (
                          <span className="text-xs">{new Date(contact.airwallex.createdAt).toLocaleDateString()}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                    
                    {/* Last Updated */}
                    <tr>
                      <td className="py-1 font-semibold text-gray-600 w-32">Updated:</td>
                      <td className="py-1 px-4">
                        {contact.hasContractor && contact.contractor ? (
                          <span className="text-xs">{new Date(contact.contractor.updatedAt).toLocaleDateString()}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-1 px-4">
                        {contact.hasAirwallex && contact.airwallex ? (
                          <span className="text-xs">{new Date(contact.airwallex.updatedAt).toLocaleDateString()}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                    
                    {/* Last Synced */}
                    <tr>
                      <td className="py-1 font-semibold text-gray-600 w-32">Last Synced:</td>
                      <td className="py-1 px-4">-</td>
                      <td className="py-1 px-4">
                        {contact.hasAirwallex && contact.airwallex ? (
                          <span className="text-xs">{contact.airwallex.lastFetchedAt ? new Date(contact.airwallex.lastFetchedAt).toLocaleDateString() : '-'}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Contract Information Section */}
              {contact.hasContractor && contact.contractor && (
                <div>
                  <div className="flex items-center gap-2 mb-3 border-b pb-2">
                    <Briefcase className="w-4 h-4 text-indigo-700" />
                    <h4 className="text-md font-semibold text-indigo-700">Contract Information</h4>
                  </div>
                  
                  <table className="w-full text-sm">
                    <tbody>
                      {/* Job Description */}
                      <tr>
                        <td className="py-1 font-semibold text-gray-600 w-32">Job Description:</td>
                        <td className="py-1 px-4">
                          {editingContractors.has(contact.contractor.id) ? (
                            <textarea
                              className="w-full h-16 text-xs p-2 border rounded"
                              value={editingData[contact.contractor.id]?.jobDescription || ''}
                              onChange={(e) => updateEditingData(contact.contractor.id, 'jobDescription', e.target.value)}
                              placeholder="Detailed job description..."
                            />
                          ) : (
                            <span>{contact.contractor.jobDescription || '-'}</span>
                          )}
                        </td>
                        <td className="py-1 px-4">
                          <span className="text-gray-400">-</span>
                        </td>
                      </tr>
                      
                      {/* Rate */}
                      <tr>
                        <td className="py-1 font-semibold text-gray-600 w-32">Rate:</td>
                        <td className="py-1 px-4">
                          {editingContractors.has(contact.contractor.id) ? (
                            <div className="flex gap-2">
                              <Input
                                size="sm"
                                type="number"
                                step="0.01"
                                value={editingData[contact.contractor.id]?.rate || ''}
                                onChange={(e) => updateEditingData(contact.contractor.id, 'rate', parseFloat(e.target.value) || 0)}
                                className="h-6 text-xs w-20"
                                placeholder="0.00"
                              />
                              <select
                                className="h-6 text-xs border rounded px-1"
                                value={editingData[contact.contractor.id]?.rateCurrency || 'EUR'}
                                onChange={(e) => updateEditingData(contact.contractor.id, 'rateCurrency', e.target.value)}
                              >
                                <option value="EUR">EUR</option>
                                <option value="USD">USD</option>
                                <option value="GBP">GBP</option>
                              </select>
                              <select
                                className="h-6 text-xs border rounded px-1"
                                value={editingData[contact.contractor.id]?.rateFrequency || 'HOURLY'}
                                onChange={(e) => updateEditingData(contact.contractor.id, 'rateFrequency', e.target.value)}
                              >
                                <option value="HOURLY">Hourly</option>
                                <option value="DAILY">Daily</option>
                              </select>
                            </div>
                          ) : (
                            <span>
                              {contact.contractor.rate 
                                ? `${contact.contractor.rate} ${contact.contractor.rateCurrency || 'EUR'} / ${(contact.contractor.rateFrequency || 'HOURLY').toLowerCase()}`
                                : '-'
                              }
                            </span>
                          )}
                        </td>
                        <td className="py-1 px-4">
                          <span className="text-gray-400">-</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Documents Section */}
              {contact.hasContractor && contact.contractor && (
                <div>
                  <div className="flex items-center gap-2 mb-3 border-b pb-2">
                    <Building className="w-4 h-4 text-green-700" />
                    <h4 className="text-md font-semibold text-green-700">Documents</h4>
                  </div>
                  
                  <table className="w-full text-sm">
                    <tbody>
                      {getDocumentLines(contact.contractor.id).map((line, index) => (
                        <tr key={line.id}>
                          <td className="py-1 font-semibold text-gray-600 w-32">
                            {editingContractors.has(contact.contractor.id) ? (
                              <select 
                                className="w-28 h-6 text-xs border border-gray-300 rounded px-2"
                                value={line.category}
                                onChange={(e) => updateDocumentLineCategory(contact.contractor.id, line.id, e.target.value)}
                              >
                                <option value="Identity">Identity</option>
                                <option value="Banking">Banking</option>
                                <option value="Legal">Legal</option>
                                <option value="Address">Address</option>
                                <option value="Tax">Tax</option>
                                <option value="Other">Other</option>
                              </select>
                            ) : (
                              <span>{line.category}:</span>
                            )}
                          </td>
                          <td className="py-1 px-4">
                            <div className="flex items-center gap-1">
                              {line.document ? (
                                <>
                                  <span className="text-xs truncate max-w-[120px]">
                                    {line.document.name}
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0"
                                    onClick={() => handleDocumentView(line.document?.url)}
                                    title="Download"
                                  >
                                    <Download className="w-3 h-3" />
                                  </Button>
                                  {editingContractors.has(contact.contractor.id) && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 w-6 p-0 text-red-600 hover:text-red-800"
                                      onClick={() => removeDocumentLine(contact.contractor.id, line.id)}
                                      title="Delete"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  )}
                                </>
                              ) : (
                                <>
                                  <div className="flex-1">
                                    {!editingContractors.has(contact.contractor.id) ? (
                                      <span className="text-gray-400 text-xs">-</span>
                                    ) : (
                                      <span className="text-gray-400 text-xs">No document</span>
                                    )}
                                  </div>
                                  {editingContractors.has(contact.contractor.id) && (
                                    <div className="flex items-center gap-1">
                                      <input
                                        id={`file-input-${contact.contractor.id}-${line.id}`}
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                        style={{ display: 'none' }}
                                        onChange={(e) => handleFileInputChange(e, contact.contractor.id, line.id)}
                                      />
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 w-6 p-0 border border-gray-300"
                                        onClick={() => triggerFileUpload(contact.contractor.id, line.id)}
                                        disabled={uploadingDocuments.has(`${contact.contractor.id}-${line.category.toLowerCase()}`)}
                                        title="Upload Document"
                                      >
                                        {uploadingDocuments.has(`${contact.contractor.id}-${line.category.toLowerCase()}`) ? (
                                          <RefreshCw className="w-3 h-3 animate-spin" />
                                        ) : (
                                          <Upload className="w-3 h-3" />
                                        )}
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 w-6 p-0 text-red-600 hover:text-red-800 border border-gray-300"
                                        onClick={() => removeDocumentLine(contact.contractor.id, line.id)}
                                        title="Delete Line"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                          <td className="py-1 px-4">
                            <span className="text-gray-400 text-xs">Not available in Airwallex</span>
                          </td>
                        </tr>
                      ))}
                      {editingContractors.has(contact.contractor.id) && (
                        <tr>
                          <td className="py-1" colSpan={3}>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-xs text-blue-600 hover:text-blue-800"
                              onClick={() => addDocumentLine(contact.contractor.id)}
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Add Document Line
                            </Button>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pl-6 pt-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contractors</h1>
        </div>
        <div className="flex space-x-2 pr-2">
          <Button
            onClick={() => setShowFieldSelector(!showFieldSelector)}
            variant="outline"
          >
            <Eye className="w-4 h-4 mr-2" />
            Customize Fields
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Akemis Contractors</p>
                <p className="text-2xl font-bold">{contractors.length}</p>
              </div>
              <Database className="w-8 h-8 text-blue-600" />
            </div>
            <div className="mt-3 pt-3 border-t flex items-center space-x-2">
              <Link href="/entities/contractors/new">
                <Button size="sm" variant="default" className="h-7">
                  <Plus className="w-3 h-3 mr-1" />
                  Add New
                </Button>
              </Link>
              {contractors.length > 0 && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-7 text-red-600 hover:bg-red-50"
                  onClick={() => {
                    alert('Bulk delete functionality can be implemented here')
                  }}
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Bulk Delete
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Airwallex Contacts</p>
                <p className="text-2xl font-bold">{airwallexContacts.length}</p>
              </div>
              <ExternalLink className="w-8 h-8 text-orange-600" />
            </div>
            <div className="mt-3 pt-3 border-t flex items-center space-x-2">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-orange-600 hover:bg-orange-50"
                onClick={handleSyncWithAirwallex}
                disabled={syncing}
              >
                {syncing ? (
                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3 mr-1" />
                )}
                Sync
              </Button>
              {airwallexContacts.length > 0 && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-7 text-orange-600 hover:bg-orange-50"
                  onClick={() => {
                    alert('Bulk delete Airwallex contacts functionality can be implemented here')
                  }}
                >
                  <X className="w-3 h-3 mr-1" />
                  Clear All
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

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
              {Object.entries(ALL_FIELDS).map(([key, field]) => (
                <div key={key} className="space-y-2">
                  <h3 className="font-medium text-sm text-gray-700">{field.category}</h3>
                  <div className="space-y-1">
                    {Object.entries(ALL_FIELDS)
                      .filter(([_, f]) => f.category === field.category)
                      .map(([fieldKey, fieldConfig]) => (
                        <label key={fieldKey} className="flex items-center space-x-2 text-sm">
                          <input
                            type="checkbox"
                            checked={visibleFields.includes(fieldKey)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setVisibleFields([...visibleFields, fieldKey])
                              } else {
                                setVisibleFields(visibleFields.filter(f => f !== fieldKey))
                              }
                            }}
                            className="rounded border-gray-300"
                          />
                          <span>{fieldConfig.label}</span>
                        </label>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Box */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search contacts by name, email, or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {searchQuery && (
            <div className="mt-2 text-sm text-gray-500">
              {filteredAndSortedContacts.length} of {combinedContacts.length} contacts match "{searchQuery}"
            </div>
          )}
        </CardContent>
      </Card>

      {/* Combined Data Table */}
      <Card>
        <div className="overflow-hidden">
          {renderTableHeader()}
          
          <div className="max-h-[600px] overflow-y-auto">
            {loading ? (
              <div className="p-12 text-center">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
                <p className="text-gray-500">Loading contacts...</p>
              </div>
            ) : filteredAndSortedContacts.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg text-gray-500 mb-2">No contacts found</p>
                <p className="text-gray-400">Start by syncing with Airwallex or adding contractors manually</p>
              </div>
            ) : (
              filteredAndSortedContacts.map((contact, index) => renderContactRow(contact, index))
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}

