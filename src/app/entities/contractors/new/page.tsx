"use client"

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Upload, FileText, X, Eye, Trash2, Plus } from 'lucide-react'
import Link from 'next/link'

interface DocumentLine {
  id: string
  category: string
  file?: File
  document?: {
    url?: string
    name?: string
    type?: string
    size?: number
  }
}

export default function NewContractorPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [documentLines, setDocumentLines] = useState<DocumentLine[]>([])
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    vatNumber: '',
    address: '',
    city: '',
    postalCode: '',
    country: '',
    bankAccountName: '',
    bankAccountNumber: '',
    bankName: '',
    bankCountryCode: '',
    bankAccountCurrency: '',
    iban: '',
    swiftCode: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.firstName || !formData.lastName || !formData.email) {
      alert('Please fill in required fields: First Name, Last Name, and Email')
      return
    }

    setLoading(true)

    try {
      // First create the contractor
      const response = await fetch('/api/contractors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create contractor')
      }

      const contractor = await response.json()
      
      // Then upload documents if any
      const docsWithFiles = documentLines.filter(line => line.file)
      if (docsWithFiles.length > 0) {
        for (const doc of docsWithFiles) {
          if (!doc.file) continue
          
          const formData = new FormData()
          formData.append('file', doc.file)
          formData.append('contractorId', contractor.id)
          formData.append('documentType', doc.category)
          
          try {
            await fetch(`/api/contractors/${contractor.id}/documents`, {
              method: 'POST',
              credentials: 'include',
              body: formData
            })
          } catch (uploadError) {
            console.error('Document upload failed:', uploadError)
            // Continue with other documents even if one fails
          }
        }
      }
      
      alert('✅ Contractor created successfully!')
      router.push('/entities/contractors')
    } catch (error) {
      console.error('Create error:', error)
      alert('❌ Failed to create contractor: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const addDocumentLine = () => {
    setDocumentLines(prev => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        category: 'Identity'
      }
    ])
  }

  const removeDocumentLine = (lineId: string) => {
    setDocumentLines(prev => prev.filter(line => line.id !== lineId))
    // Clean up the file input ref
    delete fileInputRefs.current[lineId]
  }

  const updateDocumentLineCategory = (lineId: string, category: string) => {
    setDocumentLines(prev => prev.map(line => 
      line.id === lineId ? { ...line, category } : line
    ))
  }

  const handleFileSelect = (lineId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setDocumentLines(prev => prev.map(line => 
      line.id === lineId 
        ? { 
            ...line, 
            file,
            document: {
              name: file.name,
              type: file.type,
              size: file.size
            }
          } 
        : line
    ))
  }

  const triggerFileUpload = (lineId: string) => {
    fileInputRefs.current[lineId]?.click()
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Link href="/entities/contractors">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Contractors
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add New Contractor</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* Company Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Company Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <Label htmlFor="vatNumber">VAT Number</Label>
                  <Input
                    id="vatNumber"
                    name="vatNumber"
                    value={formData.vatNumber}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Address</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="address">Street Address</Label>
                  <Input
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <Label htmlFor="postalCode">Postal Code</Label>
                  <Input
                    id="postalCode"
                    name="postalCode"
                    value={formData.postalCode}
                    onChange={handleChange}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* Banking Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Banking Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bankAccountName">Account Name</Label>
                  <Input
                    id="bankAccountName"
                    name="bankAccountName"
                    value={formData.bankAccountName}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <Label htmlFor="bankAccountNumber">Account Number</Label>
                  <Input
                    id="bankAccountNumber"
                    name="bankAccountNumber"
                    value={formData.bankAccountNumber}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <Label htmlFor="bankName">Bank Name</Label>
                  <Input
                    id="bankName"
                    name="bankName"
                    value={formData.bankName}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <Label htmlFor="bankCountryCode">Bank Country Code</Label>
                  <Input
                    id="bankCountryCode"
                    name="bankCountryCode"
                    value={formData.bankCountryCode}
                    onChange={handleChange}
                    maxLength={2}
                    placeholder="e.g., US"
                  />
                </div>
                <div>
                  <Label htmlFor="bankAccountCurrency">Currency</Label>
                  <Input
                    id="bankAccountCurrency"
                    name="bankAccountCurrency"
                    value={formData.bankAccountCurrency}
                    onChange={handleChange}
                    maxLength={3}
                    placeholder="e.g., USD"
                  />
                </div>
                <div>
                  <Label htmlFor="iban">IBAN</Label>
                  <Input
                    id="iban"
                    name="iban"
                    value={formData.iban}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <Label htmlFor="swiftCode">SWIFT/BIC Code</Label>
                  <Input
                    id="swiftCode"
                    name="swiftCode"
                    value={formData.swiftCode}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* Document Upload Section */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Documents</h3>
              
              {/* Document Lines Table */}
              {documentLines.length > 0 && (
                <table className="w-full text-sm mb-4">
                  <tbody>
                    {documentLines.map((line) => (
                      <tr key={line.id}>
                        <td className="py-2 font-semibold text-gray-600 w-40">
                          <select
                            value={line.category}
                            onChange={(e) => updateDocumentLineCategory(line.id, e.target.value)}
                            className="w-full px-2 py-1 border rounded text-sm"
                          >
                            <option value="Identity">Identity</option>
                            <option value="Banking">Banking</option>
                            <option value="Legal">Legal</option>
                            <option value="Address">Address</option>
                            <option value="Tax">Tax</option>
                            <option value="Other">Other</option>
                          </select>
                        </td>
                        <td className="py-2 px-4">
                          <input
                            ref={(ref) => {
                              if (ref) fileInputRefs.current[line.id] = ref
                            }}
                            type="file"
                            onChange={(e) => handleFileSelect(line.id, e)}
                            className="hidden"
                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                          />
                          {line.document ? (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <FileText className="w-4 h-4 text-gray-500" />
                                <span className="text-sm">{line.document.name}</span>
                                <span className="text-xs text-gray-500">
                                  ({formatFileSize(line.document.size || 0)})
                                </span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0"
                                  onClick={() => removeDocumentLine(line.id)}
                                >
                                  <Trash2 className="w-3 h-3 text-red-600" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-400">No file selected</span>
                              <div className="flex items-center space-x-1">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-2"
                                  onClick={() => triggerFileUpload(line.id)}
                                >
                                  <Upload className="w-3 h-3 mr-1" />
                                  Upload
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0"
                                  onClick={() => removeDocumentLine(line.id)}
                                >
                                  <Trash2 className="w-3 h-3 text-red-600" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Add Document Button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addDocumentLine}
                className="w-full sm:w-auto"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Document
              </Button>

              {/* Empty State */}
              {documentLines.length === 0 && (
                <div className="text-center py-8 mt-4 border-2 border-dashed rounded-lg">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No documents added yet</p>
                  <p className="text-xs text-gray-400 mt-1">Click "Add Document" to upload ID documents, proof of address, or other files</p>
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-4">
              <Link href="/entities/contractors">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Contractor'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}