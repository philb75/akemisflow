"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ContractorForm } from '@/components/contractor-form'
import { ContractorData } from '@/types/contractor'

interface ContractorEditPageProps {
  params: Promise<{
    id: string
  }>
}

export default function ContractorEditPage({ params }: ContractorEditPageProps) {
  const router = useRouter()
  const [contractor, setContractor] = useState<ContractorData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [contractorId, setContractorId] = useState<string | null>(null)

  useEffect(() => {
    const resolveParamsAndFetch = async () => {
      const resolvedParams = await params
      setContractorId(resolvedParams.id)
      fetchContractor(resolvedParams.id)
    }
    resolveParamsAndFetch()
  }, [])

  const fetchContractor = async (id: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/contractors/${id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch contractor')
      }
      const contractorData = await response.json()
      setContractor(contractorData)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (data: Partial<ContractorData>) => {
    if (!contractorId) return
    try {
      const response = await fetch(`/api/contractors/${contractorId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save contractor')
      }

      const updatedContractor = await response.json()
      setContractor(updatedContractor)
      
      // Optionally redirect back to view mode
      router.push(`/entities/contractors/${contractorId}`)
    } catch (err: any) {
      throw new Error(err.message)
    }
  }

  const handleSyncAirwallex = async (contractorId: string, options = {}) => {
    try {
      const response = await fetch(`/api/contractors/${contractorId}/sync-airwallex`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to sync with Airwallex')
      }

      const result = await response.json()
      
      // Refresh contractor data
      await fetchContractor()
      
      return result
    } catch (err: any) {
      throw new Error(err.message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading contractor...</p>
        </div>
      </div>
    )
  }

  if (error || !contractor) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error || 'Contractor not found'}</p>
          <Link href="/entities/contractors">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Contractors
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Link href={`/entities/contractors/${contractorId || ''}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Contractor Details
          </Button>
        </Link>
      </div>

      <ContractorForm
        contractor={contractor}
        onSave={handleSave}
        onSyncAirwallex={handleSyncAirwallex}
        isLoading={loading}
      />
    </div>
  )
}