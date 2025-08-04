"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, ArrowRight, RefreshCw, Link, Unlink, User, Mail, Phone, MapPin, Building2, CreditCard, Calendar, Globe, FileText, ExternalLink, Users } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { DocumentManager } from '@/components/document-manager'

interface ContractorData {
  id?: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  company?: string
  address?: string
  city?: string
  country?: string
  postalCode?: string
  addressState?: string
  addressCountryCode?: string
  bankAccountName?: string
  bankAccountNumber?: string
  bankName?: string
  iban?: string
  swiftCode?: string
  birthDate?: string
  birthPlace?: string
  position?: string
  nationality?: string
  airwallexContactId?: string
  status?: string
  createdAt?: string
  updatedAt?: string
}

interface AirwallexContractorData {
  id?: string
  beneficiaryId?: string
  beneficiary_id?: string
  firstName?: string
  first_name?: string
  lastName?: string
  last_name?: string
  email: string
  phone?: string
  company?: string
  address?: string
  city?: string
  countryCode?: string
  country_code?: string
  postalCode?: string
  postal_code?: string
  state?: string
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
  status?: string
  paymentMethods?: string
  payment_methods?: string
  lastFetchedAt?: string
  last_fetched_at?: string
  linkedContractorId?: string
  linked_contractor_id?: string
  syncError?: string
  sync_error?: string
}

interface ContractorComparisonProps {
  contractorId: string
}

export function ContractorComparison({ contractorId }: ContractorComparisonProps) {
  const [contractorData, setContractorData] = useState<ContractorData | null>(null)
  const [airwallexData, setAirwallexData] = useState<AirwallexContractorData | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncingToAirwallex, setSyncingToAirwallex] = useState(false)
  const [syncingFromAirwallex, setSyncingFromAirwallex] = useState(false)
  const [showDifferencesOnly, setShowDifferencesOnly] = useState(false)

  // Helper function to get values that support both camelCase and snake_case
  const getAirwallexValue = (camelCase: string, snakeCase: string, data: AirwallexContractorData | null) => {
    if (!data) return null
    return (data as any)[camelCase] || (data as any)[snakeCase] || null
  }

  useEffect(() => {
    fetchData()
  }, [contractorId])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch AkemisFlow contractor data
      const contractorResponse = await fetch(`/api/contractors/${contractorId}`, { credentials: 'include' })
      if (contractorResponse.ok) {
        const contractor = await contractorResponse.json()
        setContractorData(contractor)
      }

      // Fetch Airwallex contractor data
      const airwallexResponse = await fetch(`/api/contractors/${contractorId}/airwallex`, { credentials: 'include' })
      if (airwallexResponse.ok) {
        const airwallexResult = await airwallexResponse.json()
        setAirwallexData(airwallexResult.airwallexData)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast({
        title: "Error",
        description: "Failed to fetch contractor data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const syncToAirwallex = async () => {
    setSyncingToAirwallex(true)
    try {
      const response = await fetch(`/api/contractors/${contractorId}/sync-to-airwallex`, {
        method: 'POST',
        credentials: 'include'
      })

      const result = await response.json()
      console.log('Sync to Airwallex result:', result)

      if (response.ok) {
        toast({
          title: "Sync Successful", 
          description: result.message || "Successfully synced data to Airwallex"
        })
        await fetchData() // Refresh data
      } else {
        throw new Error(result.error || result.details || 'Sync failed')
      }
    } catch (error: any) {
      console.error('Sync to Airwallex error:', error)
      toast({
        title: "Sync Failed",
        description: error.message || "An unknown error occurred",
        variant: "destructive"
      })
    } finally {
      setSyncingToAirwallex(false)
    }
  }

  const syncFromAirwallex = async () => {
    setSyncingFromAirwallex(true)
    try {
      const response = await fetch(`/api/contractors/${contractorId}/sync-from-airwallex`, {
        method: 'POST',
        credentials: 'include'
      })

      const result = await response.json()
      console.log('Sync from Airwallex result:', result)

      if (response.ok) {
        toast({
          title: "Sync Successful",
          description: result.message || "Successfully synced data from Airwallex"
        })
        await fetchData() // Refresh data
      } else {
        throw new Error(result.error || result.details || 'Sync failed')
      }
    } catch (error: any) {
      console.error('Sync from Airwallex error:', error)
      toast({
        title: "Sync Failed",
        description: error.message || "An unknown error occurred",
        variant: "destructive"
      })
    } finally {
      setSyncingFromAirwallex(false)
    }
  }

  const linkContractors = async () => {
    if (!airwallexData?.beneficiaryId) return
    
    try {
      const response = await fetch(`/api/contractors/${contractorId}/link-airwallex/${airwallexData.beneficiaryId}`, {
        method: 'POST',
        credentials: 'include'
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "Link Successful",
          description: result.message
        })
        await fetchData() // Refresh data
      } else {
        throw new Error(result.error || 'Linking failed')
      }
    } catch (error: any) {
      toast({
        title: "Link Failed",
        description: error.message,
        variant: "destructive"
      })
    }
  }

  const unlinkContractors = async () => {
    if (!airwallexData?.beneficiaryId) return
    
    try {
      const response = await fetch(`/api/contractors/${contractorId}/link-airwallex/${airwallexData.beneficiaryId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "Unlink Successful",
          description: result.message
        })
        await fetchData() // Refresh data
      } else {
        throw new Error(result.error || 'Unlinking failed')
      }
    } catch (error: any) {
      toast({
        title: "Unlink Failed",
        description: error.message,
        variant: "destructive"
      })
    }
  }

  const isLinked = (airwallexData?.linkedContractorId === contractorId) || (airwallexData?.linked_contractor_id === contractorId)
  const hasAirwallexData = !!airwallexData

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const ComparisonField = ({ 
    label, 
    icon: Icon, 
    akemisValue, 
    airwallexValue, 
    category = "info" 
  }: { 
    label: string
    icon: any
    akemisValue?: string | null
    airwallexValue?: string | null
    category?: "info" | "address" | "banking" | "personal"
  }) => {
    const isDifferent = akemisValue !== airwallexValue
    const isEmpty = !akemisValue && !airwallexValue
    
    if (showDifferencesOnly && !isDifferent) return null
    if (isEmpty && showDifferencesOnly) return null

    const categoryColors = {
      info: "bg-blue-50 border-blue-200",
      address: "bg-green-50 border-green-200", 
      banking: "bg-purple-50 border-purple-200",
      personal: "bg-orange-50 border-orange-200"
    }

    return (
      <div className={`p-3 rounded-lg border ${categoryColors[category]} ${isDifferent ? 'ring-2 ring-yellow-400' : ''}`}>
        <div className="flex items-center gap-2 mb-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">{label}</span>
          {isDifferent && <Badge variant="outline" className="text-xs">Different</Badge>}
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs text-muted-foreground mb-1">AkemisFlow</div>
            <div className="font-mono bg-white p-2 rounded border min-h-[32px] flex items-center">
              {akemisValue || <span className="text-muted-foreground italic">Empty</span>}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Airwallex</div>
            <div className="font-mono bg-white p-2 rounded border min-h-[32px] flex items-center">
              {airwallexValue || <span className="text-muted-foreground italic">Empty</span>}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with sync controls */}
      <div className="flex items-center space-x-2 mb-4">
        <ExternalLink className="w-5 h-5 text-orange-600" />
        <h3 className="text-lg font-semibold">Airwallex Data</h3>
        {hasAirwallexData ? (
          <Badge variant="outline" className="bg-blue-50 text-blue-700">
            {airwallexData?.status || 'SYNCED'}
          </Badge>
        ) : (
          <Badge variant="secondary">NONE</Badge>
        )}
        
        {/* Sync Controls */}
        {hasAirwallexData && (
          <div className="flex gap-2 ml-auto">
            <Button
              onClick={syncFromAirwallex}
              disabled={syncingFromAirwallex || !isLinked}
              variant="outline"
              size="sm"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {syncingFromAirwallex ? 'Syncing...' : 'Update AkemisFlow'}
            </Button>
            
            <Button
              onClick={syncToAirwallex}
              disabled={syncingToAirwallex || !isLinked}
              variant="outline"
              size="sm"
            >
              {syncingToAirwallex ? 'Syncing...' : 'Update Airwallex'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Sync Error */}
      {airwallexData?.syncError && (
        <Alert variant="destructive">
          <AlertDescription>
            <strong>Sync Error:</strong> {airwallexData.syncError}
          </AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </div>
      ) : hasAirwallexData && airwallexData ? (
        <div className="space-y-6">
          {/* Personal Information */}
          <div>
            <h4 className="flex items-center gap-2 text-md font-semibold mb-3 text-orange-700">
              <Users className="w-4 h-4" />
              Personal Information
            </h4>
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>First Name:</strong> {getAirwallexValue('firstName', 'first_name', airwallexData) || '-'}
                </div>
                <div>
                  <strong>Last Name:</strong> {getAirwallexValue('lastName', 'last_name', airwallexData) || '-'}
                </div>
              </div>
              <div>
                <strong>Email:</strong> {airwallexData?.email || '-'}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Phone:</strong> {airwallexData?.phone || '-'}
                </div>
                <div>
                  <strong>Company:</strong> {airwallexData?.company || '-'}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Entity Type:</strong> {getAirwallexValue('entityType', 'entity_type', airwallexData) || '-'}
                </div>
                <div>
                  <strong>Status:</strong> {airwallexData?.status || 'Active'}
                </div>
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div>
            <h4 className="flex items-center gap-2 text-md font-semibold mb-3 text-orange-700">
              <MapPin className="w-4 h-4" />
              Address Information
            </h4>
            <div className="space-y-2 text-sm">
              <div>
                <strong>Address:</strong> {airwallexData?.address || '-'}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>City:</strong> {airwallexData?.city || '-'}
                </div>
                <div>
                  <strong>State:</strong> {airwallexData?.state || '-'}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>ZIP Code:</strong> {getAirwallexValue('postalCode', 'postal_code', airwallexData) || '-'}
                </div>
                <div>
                  <strong>Country:</strong> {getAirwallexValue('countryCode', 'country_code', airwallexData) || '-'}
                </div>
              </div>
            </div>
          </div>

          {/* Banking Information */}
          <div>
            <h4 className="flex items-center gap-2 text-md font-semibold mb-3 text-orange-700">
              <CreditCard className="w-4 h-4" />
              Company Information
            </h4>
            <div className="space-y-2 text-sm">
              <div>
                <strong>Bank Account Name:</strong> {getAirwallexValue('bankAccountName', 'bank_account_name', airwallexData) || '-'}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Account Number:</strong> {getAirwallexValue('bankAccountNumber', 'bank_account_number', airwallexData) || '-'}
                </div>
                <div>
                  <strong>Bank Name:</strong> {getAirwallexValue('bankName', 'bank_name', airwallexData) || '-'}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>SWIFT/BIC:</strong> {getAirwallexValue('swiftCode', 'swift_code', airwallexData) || '-'}
                </div>
                <div>
                  <strong>IBAN:</strong> {airwallexData?.iban || '-'}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Currency:</strong> {airwallexData?.currency || '-'}
                </div>
                <div>
                  <strong>Beneficiary ID:</strong> 
                  <span className="font-mono text-xs ml-1">{getAirwallexValue('beneficiaryId', 'beneficiary_id', airwallexData) || '-'}</span>
                </div>
              </div>
              <div>
                <strong>Last Synced:</strong> {getAirwallexValue('lastFetchedAt', 'last_fetched_at', airwallexData)
                  ? new Date(getAirwallexValue('lastFetchedAt', 'last_fetched_at', airwallexData)!).toLocaleString()
                  : '-'
                }
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2 text-sm text-gray-500">
          <div>
            <strong>First Name:</strong> -
          </div>
          <div>
            <strong>Last Name:</strong> -
          </div>
          <div>
            <strong>Email:</strong> -
          </div>
          <div>
            <strong>Phone:</strong> -
          </div>
          <div>
            <strong>Birth Date:</strong> -
          </div>
          <div>
            <strong>Birth Place:</strong> -
          </div>
          <div>
            <strong>Position:</strong> -
          </div>
          <div>
            <strong>Status:</strong> No Airwallex data
          </div>
        </div>
      )}
    </div>
  )
}