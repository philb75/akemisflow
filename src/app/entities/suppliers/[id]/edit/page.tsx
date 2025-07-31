"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { SupplierForm } from '@/components/supplier-form'
import { SupplierData } from '@/types/supplier'

interface SupplierEditPageProps {
  params: {
    id: string
  }
}

export default function SupplierEditPage({ params }: SupplierEditPageProps) {
  const router = useRouter()
  const [supplier, setSupplier] = useState<SupplierData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSupplier()
  }, [params.id])

  const fetchSupplier = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/suppliers/${params.id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch supplier')
      }
      const supplierData = await response.json()
      setSupplier(supplierData)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (data: Partial<SupplierData>) => {
    try {
      const response = await fetch(`/api/suppliers/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save supplier')
      }

      const updatedSupplier = await response.json()
      setSupplier(updatedSupplier)
      
      // Optionally redirect back to view mode
      router.push(`/entities/suppliers/${params.id}`)
    } catch (err: any) {
      throw new Error(err.message)
    }
  }

  const handleSyncAirwallex = async (supplierId: string, options = {}) => {
    try {
      const response = await fetch(`/api/suppliers/${supplierId}/sync-airwallex`, {
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
      
      // Refresh supplier data
      await fetchSupplier()
      
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
          <p>Loading supplier...</p>
        </div>
      </div>
    )
  }

  if (error || !supplier) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error || 'Supplier not found'}</p>
          <Link href="/entities/suppliers">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Suppliers
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Link href={`/entities/suppliers/${params.id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Supplier Details
          </Button>
        </Link>
      </div>

      <SupplierForm
        supplier={supplier}
        onSave={handleSave}
        onSyncAirwallex={handleSyncAirwallex}
        isLoading={loading}
      />
    </div>
  )
}