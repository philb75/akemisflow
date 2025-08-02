"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { FileText, Download, Upload, Trash2, Plus, Eye } from 'lucide-react'

interface Document {
  id: string
  fileName: string
  originalName: string
  fileType: string
  fileSize: number
  documentType: string
  description?: string
  publicUrl?: string
  uploadedAt: string
  isVerified: boolean
}

interface DocumentManagerProps {
  entityId: string
  entityType: 'supplier' | 'contact' | 'invoice'
  className?: string
}

const DOCUMENT_TYPES = [
  { value: 'ID', label: 'ID Document' },
  { value: 'PROOF_OF_ADDRESS', label: 'Proof of Address' },
  { value: 'BANK', label: 'Others' }
] as const

export function DocumentManager({ entityId, entityType, className }: DocumentManagerProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null)
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    fetchDocuments()
  }, [entityId, entityType])

  const fetchDocuments = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/documents?entityId=${entityId}&entityType=${entityType}`)
      if (response.ok) {
        const data = await response.json()
        setDocuments(data.documents || [])
      }
    } catch (error) {
      console.error('Error fetching documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    setSelectedFiles(files)
    setShowUploadForm(true)
  }

  const handleUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0 || !selectedDocumentType) return

    setUploading(true)
    try {
      for (const file of selectedFiles) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('entityId', entityId)
        formData.append('entityType', entityType)
        formData.append('documentType', selectedDocumentType)
        if (description) {
          formData.append('description', description)
        }
        
        const response = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData
        })

        if (response.ok) {
          console.log('Document uploaded successfully')
        } else {
          const errorData = await response.json()
          console.error('Upload failed:', errorData)
        }
      }
      
      await fetchDocuments() // Refresh the list
      setShowUploadForm(false)
      setSelectedFiles(null)
      setSelectedDocumentType('')
      setDescription('')
    } catch (error) {
      console.error('Error uploading files:', error)
    } finally {
      setUploading(false)
    }
  }

  const handleDownload = async (document: Document) => {
    try {
      const response = await fetch(`/api/documents/${document.id}/download`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = document.originalName
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Error downloading document:', error)
    }
  }

  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchDocuments() // Refresh the list
      }
    } catch (error) {
      console.error('Error deleting document:', error)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getDocumentTypeColor = (type: string) => {
    const colors = {
      ID: 'bg-blue-100 text-blue-800',
      PROOF_OF_ADDRESS: 'bg-green-100 text-green-800',
      BANK: 'bg-purple-100 text-purple-800'
    }
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getDocumentTypeLabel = (type: string) => {
    const labels = {
      ID: 'ID Document',
      PROOF_OF_ADDRESS: 'Proof of Address',
      BANK: 'Others'
    }
    return labels[type as keyof typeof labels] || type
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documents
          </CardTitle>
          <div className="flex items-center gap-2">
            <input
              type="file"
              id={`file-upload-${entityId}`}
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => document.getElementById(`file-upload-${entityId}`)?.click()}
              disabled={uploading}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Files
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Upload Form */}
        {showUploadForm && selectedFiles && (
          <div className="mb-6 p-4 border rounded-lg bg-gray-50">
            <h4 className="font-medium mb-3">Upload Documents</h4>
            
            <div className="space-y-4">
              <div>
                <Label>Selected Files:</Label>
                <div className="mt-2 space-y-1">
                  {Array.from(selectedFiles).map((file, index) => (
                    <div key={index} className="text-sm text-gray-600">
                      📄 {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <Label htmlFor="document-type">Document Type *</Label>
                <Select value={selectedDocumentType} onValueChange={setSelectedDocumentType}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a description..."
                  className="mt-1"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowUploadForm(false)
                    setSelectedFiles(null)
                    setSelectedDocumentType('')
                    setDescription('')
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpload}
                  disabled={!selectedDocumentType || uploading}
                >
                  {uploading ? (
                    <>
                      <Upload className="w-4 h-4 mr-1 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    'Upload'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
        {documents.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm mb-2">No documents uploaded</p>
            <p className="text-xs text-gray-400">
              Click "Add Files" to upload documents
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center gap-3 flex-1">
                  <FileText className="w-5 h-5 text-gray-400" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium truncate">
                        {doc.originalName}
                      </p>
                      <Badge className={getDocumentTypeColor(doc.documentType)}>
                        {getDocumentTypeLabel(doc.documentType)}
                      </Badge>
                      {doc.isVerified && (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Verified
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>{formatFileSize(doc.fileSize)}</span>
                      <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                      {doc.description && (
                        <span className="truncate">{doc.description}</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 ml-3">
                  {doc.publicUrl && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => window.open(doc.publicUrl, '_blank')}
                      title="View"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDownload(doc)}
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(doc.id)}
                    title="Delete"
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}